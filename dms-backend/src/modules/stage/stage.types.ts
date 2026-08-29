import { DiscipleshipStage } from '../../shared/constants/stages';

/**
 * Who/what initiated the stage transition.
 */
export type TransitionTrigger = 'auto' | 'admin_manual';

/**
 * A single transition rule in the state machine.
 *
 * Each rule defines:
 * - Which stage it transitions FROM and TO
 * - What type of trigger is allowed (auto or admin)
 * - An optional description for documentation / audit logs
 */
export interface TransitionRule {
  from: DiscipleshipStage;
  to: DiscipleshipStage;
  trigger: TransitionTrigger;
  description: string;
}

/**
 * Input to request a stage transition.
 */
export interface TransitionRequest {
  userId: string;
  targetStage: DiscipleshipStage;
  trigger: TransitionTrigger;
  triggeredBy?: string;  // admin userId if manual
  reason?: string;       // optional note for audit log
  metadata?: Record<string, unknown>; // e.g., { lessonsCompleted: 12 }
}

/**
 * Result of a successful stage transition.
 */
export interface TransitionResult {
  userId: string;
  fromStage: DiscipleshipStage | null;
  toStage: DiscipleshipStage;
  trigger: TransitionTrigger;
  transitionedAt: Date;
}

/**
 * Full stage history entry for display.
 */
export interface StageHistoryEntry {
  id: string;
  fromStage: string | null;
  toStage: string;
  trigger: TransitionTrigger;
  triggeredBy: string | null;
  reason: string | null;
  transitionedAt: Date;
}
