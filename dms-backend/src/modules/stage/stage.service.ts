import { Types } from 'mongoose';
import { User } from '../user/user.model';
import { DiscipleshipStage, STAGE_LABELS } from '../../shared/constants/stages';
import { StageTransition } from './stage-transition.model';
import { findTransitionRule, getValidTransitionsFrom } from './stage.transitions';
import { notificationService } from '../notification/notification.service';
import {
  TransitionRequest,
  TransitionResult,
  StageHistoryEntry,
  TransitionTrigger,
} from './stage.types';
import {
  NotFoundError,
  StageTransitionError,
  AppError,
} from '../../shared/errors';

/**
 * Stage Service — THE centralized state machine.
 *
 * ALL stage transitions in the system MUST go through this service.
 * No other module is allowed to directly modify `user.currentStage`.
 *
 * Responsibilities:
 * 1. Validate transition against the transition map
 * 2. Verify trigger type matches (auto vs admin)
 * 3. Update the user document
 * 4. Write immutable audit log
 * 5. Return the result for upstream callers
 */
class StageService {
  /**
   * Execute a stage transition.
   *
   * This is the SINGLE ENTRY POINT for all stage changes.
   * Both auto-transitions (from progress module) and manual
   * transitions (from admin module) come through here.
   *
   * @throws StageTransitionError if the transition is invalid
   * @throws NotFoundError if the user doesn't exist
   */
  async transition(request: TransitionRequest): Promise<TransitionResult> {
    const { userId, targetStage, trigger, triggeredBy, reason, metadata } = request;

    // ── 1. Find the user ──
    const user = await User.findById(userId);
    if (!user || !user.isActive) {
      throw new NotFoundError('User', userId);
    }

    const currentStage = user.currentStage as DiscipleshipStage | null;

    // ── 2. Handle initial stage assignment (edge case) ──
    if (!currentStage) {
      throw new AppError(
        'User has no current stage. This should not happen — contact support.',
        500,
        'MISSING_STAGE',
        false
      );
    }

    // ── 3. Validate the transition exists in the map ──
    const rule = findTransitionRule(currentStage, targetStage);

    if (!rule) {
      throw new StageTransitionError(
        currentStage,
        targetStage,
        `No valid transition exists from ${STAGE_LABELS[currentStage]} to ${STAGE_LABELS[targetStage]}`
      );
    }

    // ── 4. Validate trigger type matches the rule ──
    if (rule.trigger !== trigger) {
      const triggerLabel = trigger === 'auto' ? 'automatically' : 'manually by admin';
      const requiredLabel = rule.trigger === 'auto' ? 'automatic' : 'admin manual';
      throw new StageTransitionError(
        currentStage,
        targetStage,
        `This transition cannot be performed ${triggerLabel}. It requires ${requiredLabel} trigger.`
      );
    }

    // ── 5. Validate admin trigger has a triggeredBy ──
    if (trigger === 'admin_manual' && !triggeredBy) {
      throw new AppError(
        'Admin manual transitions require a triggeredBy userId',
        400,
        'MISSING_TRIGGERED_BY'
      );
    }

    // ── 6. Update the user's stage ──
    const now = new Date();
    user.currentStage = targetStage;
    user.stageUpdatedAt = now;
    await user.save();

    // ── 7. Write audit log ──
    await StageTransition.create({
      userId: new Types.ObjectId(userId),
      fromStage: currentStage,
      toStage: targetStage,
      trigger,
      triggeredBy: triggeredBy ? new Types.ObjectId(triggeredBy) : null,
      reason: reason || null,
      metadata: metadata || null,
      transitionedAt: now,
    });

    // ── 8. Notify convert (fire-and-forget) ──
    notificationService.notifyStageTransition(userId, currentStage, targetStage, trigger);

    return {
      userId,
      fromStage: currentStage,
      toStage: targetStage,
      trigger,
      transitionedAt: now,
    };
  }

  /**
   * Attempt an auto-transition. If the transition is invalid, silently skip.
   *
   * Used by the progress module where the caller doesn't know
   * whether the transition SHOULD happen — it just says "try this."
   *
   * Returns the result if the transition occurred, or null if it was skipped.
   */
  async tryAutoTransition(
    userId: string,
    targetStage: DiscipleshipStage,
    metadata?: Record<string, unknown>
  ): Promise<TransitionResult | null> {
    try {
      return await this.transition({
        userId,
        targetStage,
        trigger: 'auto',
        metadata,
      });
    } catch (error) {
      // Expected: transition might be invalid (e.g., user already past this stage)
      if (error instanceof StageTransitionError) {
        return null;
      }
      // Unexpected errors should still propagate
      throw error;
    }
  }

  /**
   * Get the current stage for a user.
   */
  async getCurrentStage(userId: string): Promise<{
    currentStage: DiscipleshipStage;
    stageLabel: string;
    stageUpdatedAt: Date;
    isHolySpiritFilled: boolean;
  }> {
    const user = await User.findById(userId);
    if (!user || !user.isActive) {
      throw new NotFoundError('User', userId);
    }

    const stage = user.currentStage as DiscipleshipStage;

    return {
      currentStage: stage,
      stageLabel: STAGE_LABELS[stage] || stage,
      stageUpdatedAt: user.stageUpdatedAt!,
      isHolySpiritFilled: user.isHolySpiritFilled ?? false,
    };
  }

  /**
   * Get full stage transition history for a user.
   */
  async getStageHistory(userId: string): Promise<StageHistoryEntry[]> {
    const transitions = await StageTransition.find({
      userId: new Types.ObjectId(userId),
    }).sort({ transitionedAt: -1 });

    return transitions.map((t) => ({
      id: t._id.toString(),
      fromStage: t.fromStage,
      toStage: t.toStage,
      trigger: t.trigger as TransitionTrigger,
      triggeredBy: t.triggeredBy ? t.triggeredBy.toString() : null,
      reason: t.reason,
      transitionedAt: t.transitionedAt,
    }));
  }

  /**
   * Get valid next transitions from the user's current stage.
   * Used by admin UI to show available actions.
   */
  async getAvailableTransitions(userId: string): Promise<{
    currentStage: DiscipleshipStage;
    availableTransitions: Array<{
      toStage: DiscipleshipStage;
      toLabel: string;
      trigger: TransitionTrigger;
      description: string;
    }>;
  }> {
    const user = await User.findById(userId);
    if (!user || !user.isActive) {
      throw new NotFoundError('User', userId);
    }

    const currentStage = user.currentStage as DiscipleshipStage;
    const rules = getValidTransitionsFrom(currentStage);

    return {
      currentStage,
      availableTransitions: rules.map((rule) => ({
        toStage: rule.to,
        toLabel: STAGE_LABELS[rule.to],
        trigger: rule.trigger,
        description: rule.description,
      })),
    };
  }

  /**
   * Toggle the Holy Spirit Filled flag.
   *
   * This is independent of the stage flow — it's a parallel attribute
   * that can be set at ANY point in the discipleship journey.
   *
   * If the user is still at NEW_CONVERT, also transitions them to HOLY_SPIRIT_FILLED stage.
   */
  async setHolySpiritFilled(
    userId: string,
    filled: boolean,
    adminId: string
  ): Promise<{ isHolySpiritFilled: boolean; stageChanged: boolean }> {
    const user = await User.findById(userId);
    if (!user || !user.isActive) {
      throw new NotFoundError('User', userId);
    }

    const now = new Date();
    user.isHolySpiritFilled = filled;

    if (filled) {
      user.holySpiritFilledAt = now;
      user.holySpiritConfirmedBy = new Types.ObjectId(adminId);
    } else {
      user.holySpiritFilledAt = undefined;
      user.holySpiritConfirmedBy = undefined;
    }

    await user.save();

    // If still NEW_CONVERT and being filled, also transition stage
    let stageChanged = false;
    if (filled && user.currentStage === DiscipleshipStage.NEW_CONVERT) {
      const result = await this.tryAutoTransition(userId, DiscipleshipStage.HOLY_SPIRIT_FILLED);
      // This is admin-triggered, so use the formal transition
      if (!result) {
        // tryAutoTransition failed (maybe rule mismatch), use direct transition
        await this.transition({
          userId,
          targetStage: DiscipleshipStage.HOLY_SPIRIT_FILLED,
          trigger: 'admin_manual',
          triggeredBy: adminId,
          reason: 'Holy Spirit confirmation',
        });
      }
      stageChanged = true;
    }

    return { isHolySpiritFilled: filled, stageChanged };
  }
}

export const stageService = new StageService();
