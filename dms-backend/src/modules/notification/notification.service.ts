import { Types } from 'mongoose';
import {
  Notification,
  NotificationType,
  NotificationView,
  toNotificationView,
} from './notification.model';
import { User } from '../user/user.model';
import { NotificationOutbox } from './outbox.model';
import { emitToUser } from '../../realtime/socket';
import { Role } from '../../shared/constants/roles';
import { DiscipleshipStage, STAGE_LABELS } from '../../shared/constants/stages';
import { NotFoundError, AppError } from '../../shared/errors';
import { parsePagination, buildPaginationMeta } from '../../shared/utils/pagination';
import { PaginationMeta } from '../../shared/types/express.d';
import { branchFilter, assertBranchAccess } from '../../shared/access/branch-scope';

type Requester = { userId: string; role: string; branchId: string | null };

/**
 * Default notification TTL — 90 days.
 * After this, MongoDB's TTL index automatically deletes the document.
 */
const DEFAULT_TTL_DAYS = 90;

function ttlDate(days: number = DEFAULT_TTL_DAYS): Date {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
}

class NotificationService {
  // ════════════════════════════════════════════
  //  CORE — Create & Read
  // ════════════════════════════════════════════

  /**
   * Create a notification.
   *
   * Low-level method — prefer the typed trigger methods below
   * for cross-module integration.
   */
  async create(input: {
    recipientId: string;
    type: NotificationType;
    title: string;
    message: string;
    metadata?: Record<string, unknown>;
    expiresAt?: Date;
  }): Promise<NotificationView> {
    const notification = await Notification.create({
      recipientId: new Types.ObjectId(input.recipientId),
      type: input.type,
      title: input.title,
      message: input.message,
      metadata: input.metadata || null,
      expiresAt: input.expiresAt || ttlDate(),
    });

    const view = toNotificationView(notification);
    // Push to the recipient in real time (best-effort).
    emitToUser(input.recipientId, 'notification', view);
    return view;
  }

  /**
   * Get a user's notifications (paginated, newest first).
   *
   * Supports optional filter by type and read status.
   */
  async getNotifications(
    userId: string,
    options: {
      page?: string | number;
      limit?: string | number;
      type?: NotificationType;
      isRead?: boolean;
    } = {}
  ): Promise<{ notifications: NotificationView[]; meta: PaginationMeta }> {
    const { skip, limit, page } = parsePagination({
      page: options.page,
      limit: options.limit,
    });

    const filter: Record<string, unknown> = {
      recipientId: new Types.ObjectId(userId),
    };

    if (options.type) filter.type = options.type;
    if (options.isRead !== undefined) filter.isRead = options.isRead;

    const [notifications, total] = await Promise.all([
      Notification.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Notification.countDocuments(filter),
    ]);

    return {
      notifications: notifications.map(toNotificationView),
      meta: buildPaginationMeta(page, limit, total),
    };
  }

  /**
   * Get unread notification count for a user.
   * Fast indexed query — suitable for polling or badge display.
   */
  async getUnreadCount(userId: string): Promise<number> {
    return Notification.countDocuments({
      recipientId: new Types.ObjectId(userId),
      isRead: false,
    });
  }

  /**
   * Mark a single notification as read.
   */
  async markAsRead(userId: string, notificationId: string): Promise<NotificationView> {
    if (!Types.ObjectId.isValid(notificationId)) {
      throw new AppError('Invalid notification ID', 400, 'INVALID_ID');
    }

    const notification = await Notification.findOneAndUpdate(
      {
        _id: new Types.ObjectId(notificationId),
        recipientId: new Types.ObjectId(userId),
      },
      {
        isRead: true,
        readAt: new Date(),
      },
      { new: true }
    );

    if (!notification) {
      throw new NotFoundError('Notification', notificationId);
    }

    return toNotificationView(notification);
  }

  /**
   * Mark ALL unread notifications as read for a user.
   * Returns the count of notifications marked.
   */
  async markAllAsRead(userId: string): Promise<number> {
    const result = await Notification.updateMany(
      {
        recipientId: new Types.ObjectId(userId),
        isRead: false,
      },
      {
        isRead: true,
        readAt: new Date(),
      }
    );

    return result.modifiedCount;
  }

  /**
   * Delete a single notification (user can dismiss).
   */
  async deleteNotification(userId: string, notificationId: string): Promise<void> {
    if (!Types.ObjectId.isValid(notificationId)) {
      throw new AppError('Invalid notification ID', 400, 'INVALID_ID');
    }

    const result = await Notification.deleteOne({
      _id: new Types.ObjectId(notificationId),
      recipientId: new Types.ObjectId(userId),
    });

    if (result.deletedCount === 0) {
      throw new NotFoundError('Notification', notificationId);
    }
  }

  // ════════════════════════════════════════════
  //  ADMIN — Broadcast & Send
  // ════════════════════════════════════════════

  /**
   * Admin sends a notification to a specific convert.
   */
  async sendToConvert(
    requester: Requester,
    convertId: string,
    title: string,
    message: string
  ): Promise<NotificationView> {
    // Verify convert exists and belongs to the requester's branch
    const convert = await User.findOne({
      _id: new Types.ObjectId(convertId),
      role: Role.CONVERT,
      isActive: true,
    });

    if (!convert) {
      throw new NotFoundError('Convert', convertId);
    }
    assertBranchAccess(requester, convert.branchId?.toString());

    return this.create({
      recipientId: convertId,
      type: 'admin_message',
      title,
      message,
      metadata: { sentBy: requester.userId },
    });
  }

  /**
   * Admin broadcasts a notification to all active converts in their branch
   * (or every branch, for a super_admin).
   *
   * Optionally filter by stage.
   * Returns the count of notifications created.
   */
  async broadcast(
    requester: Requester,
    title: string,
    message: string,
    stage?: DiscipleshipStage
  ): Promise<number> {
    const filter: Record<string, unknown> = {
      role: Role.CONVERT,
      isActive: true,
      ...branchFilter(requester),
    };

    if (stage) filter.currentStage = stage;

    const converts = await User.find(filter).select('_id');

    if (converts.length === 0) return 0;

    const docs = converts.map((c) => ({
      recipientId: c._id,
      type: 'admin_message' as NotificationType,
      title,
      message,
      metadata: { sentBy: requester.userId, broadcast: true },
      expiresAt: ttlDate(),
    }));

    await Notification.insertMany(docs);

    return converts.length;
  }

  // ════════════════════════════════════════════
  //  TRIGGERS — Fire-and-forget integration
  //
  //  These methods are called by other services.
  //  They NEVER throw — failures are logged silently
  //  so the calling operation always succeeds.
  // ════════════════════════════════════════════

  /**
   * Notify a convert that their discipleship stage changed.
   */
  async notifyStageTransition(
    userId: string,
    fromStage: DiscipleshipStage,
    toStage: DiscipleshipStage,
    trigger: 'auto' | 'admin_manual'
  ): Promise<void> {
    try {
      const toLabel = STAGE_LABELS[toStage] || toStage;
      const isAuto = trigger === 'auto';

      await this.safeCreate({
        recipientId: userId,
        type: 'stage_transition',
        title: `Stage Update: ${toLabel}`,
        message: isAuto
          ? `Congratulations! You've progressed to the "${toLabel}" stage.`
          : `An admin has updated your stage to "${toLabel}".`,
        metadata: { fromStage, toStage, trigger },
      });
    } catch (err) {
      console.error('[Notification] Failed to notify stage transition:', err);
    }
  }

  /**
   * Notify a convert that they completed a lesson.
   */
  async notifyLessonCompleted(
    userId: string,
    lessonTitle: string,
    lessonId: string,
    completedCount: number,
    totalLessons: number
  ): Promise<void> {
    try {
      await this.safeCreate({
        recipientId: userId,
        type: 'lesson_completed',
        title: 'Lesson Completed!',
        message: `You've completed "${lessonTitle}". Progress: ${completedCount}/${totalLessons} lessons done.`,
        metadata: { lessonId, completedCount, totalLessons },
      });
    } catch (err) {
      console.error('[Notification] Failed to notify lesson completion:', err);
    }
  }

  /**
   * Notify a convert that they completed the entire course.
   */
  async notifyCourseCompleted(
    userId: string,
    totalLessons: number
  ): Promise<void> {
    try {
      await this.safeCreate({
        recipientId: userId,
        type: 'course_completed',
        title: 'Believers Class Completed!',
        message: `Congratulations! You've completed all ${totalLessons} lessons in the Believers Class. Your dedication to discipleship is commendable!`,
        metadata: { totalLessons, completedAt: new Date().toISOString() },
        expiresAt: ttlDate(180), // Keep course completion longer
      });
    } catch (err) {
      console.error('[Notification] Failed to notify course completion:', err);
    }
  }

  /**
   * Notify a convert about their quiz result.
   */
  async notifyQuizResult(
    userId: string,
    lessonTitle: string,
    lessonId: string,
    score: number,
    passed: boolean,
    passingScore: number
  ): Promise<void> {
    try {
      const type: NotificationType = passed ? 'quiz_passed' : 'quiz_failed';

      await this.safeCreate({
        recipientId: userId,
        type,
        title: passed ? 'Quiz Passed!' : 'Quiz Not Passed',
        message: passed
          ? `Great job! You scored ${score}% on the quiz for "${lessonTitle}". You can now complete this lesson.`
          : `You scored ${score}% on the quiz for "${lessonTitle}". You need ${passingScore}% to pass. Keep studying and try again!`,
        metadata: { lessonId, score, passed, passingScore },
      });
    } catch (err) {
      console.error('[Notification] Failed to notify quiz result:', err);
    }
  }

  /**
   * Re-engagement nudge for a convert who has gone quiet.
   * Created by the scheduled re-engagement job.
   */
  async notifyInactivityNudge(
    userId: string,
    firstName: string,
    daysInactive: number
  ): Promise<string> {
    const message = `Hi ${firstName}, we've missed you in the Believers Class! It's been ${daysInactive} days. Your next lesson is waiting whenever you're ready — take one small step today.`;
    try {
      await this.safeCreate({
        recipientId: userId,
        type: 'reminder',
        title: 'We miss you 💛',
        message,
        metadata: { daysInactive, nudgedAt: new Date().toISOString() },
      });
    } catch (err) {
      console.error('[Notification] Failed to send inactivity nudge:', err);
    }
    return message;
  }

  /**
   * Welcome notification for newly registered converts.
   */
  async notifyWelcome(userId: string, firstName: string): Promise<void> {
    try {
      await this.safeCreate({
        recipientId: userId,
        type: 'welcome',
        title: 'Welcome to Team Barnabas!',
        message: `Hello ${firstName}! Welcome to the Believers Class. We're excited to walk with you on this journey of faith. Start your first lesson whenever you're ready!`,
        metadata: { registeredAt: new Date().toISOString() },
      });
    } catch (err) {
      console.error('[Notification] Failed to send welcome notification:', err);
    }
  }

  // ════════════════════════════════════════════
  //  DURABILITY — outbox + retryable delivery
  // ════════════════════════════════════════════

  /**
   * Create a notification, falling back to the outbox if the direct write
   * fails. Used by the fire-and-forget trigger methods so events are never
   * silently lost.
   */
  private async safeCreate(input: {
    recipientId: string;
    type: NotificationType;
    title: string;
    message: string;
    metadata?: Record<string, unknown>;
    expiresAt?: Date;
  }): Promise<void> {
    try {
      await this.create(input);
    } catch (err) {
      console.error('[Notification] direct create failed — enqueuing to outbox:', err);
      try {
        await this.enqueue(input);
      } catch (e) {
        console.error('[Notification] outbox enqueue also failed:', e);
      }
    }
  }

  /** Write a notification event to the outbox for durable, retried delivery. */
  async enqueue(input: {
    recipientId: string;
    type: NotificationType;
    title: string;
    message: string;
    metadata?: Record<string, unknown>;
    expiresAt?: Date;
  }): Promise<void> {
    await NotificationOutbox.create({
      recipientId: new Types.ObjectId(input.recipientId),
      type: input.type,
      title: input.title,
      message: input.message,
      metadata: input.metadata || null,
      expiresAt: input.expiresAt || null,
      status: 'pending',
      attempts: 0,
      nextAttemptAt: new Date(),
    });
  }

  /**
   * Process due outbox entries — turn each into a real notification, with
   * exponential backoff on failure. Called by the scheduler.
   */
  async processOutbox(limit = 50): Promise<{ processed: number; failed: number }> {
    const now = new Date();
    const rows = await NotificationOutbox.find({
      status: 'pending',
      nextAttemptAt: { $lte: now },
    }).limit(limit);

    let processed = 0;
    let failed = 0;

    for (const row of rows) {
      try {
        await this.create({
          recipientId: row.recipientId.toString(),
          type: row.type,
          title: row.title,
          message: row.message,
          metadata: row.metadata || undefined,
          expiresAt: row.expiresAt || undefined,
        });
        row.status = 'done';
        row.processedAt = new Date();
        await row.save();
        processed += 1;
      } catch (err) {
        row.attempts += 1;
        row.lastError = err instanceof Error ? err.message : String(err);
        if (row.attempts >= row.maxAttempts) {
          row.status = 'failed';
          failed += 1;
        } else {
          const backoffMin = Math.min(60, Math.pow(2, row.attempts));
          row.nextAttemptAt = new Date(Date.now() + backoffMin * 60 * 1000);
        }
        await row.save();
      }
    }

    return { processed, failed };
  }
}

export const notificationService = new NotificationService();
