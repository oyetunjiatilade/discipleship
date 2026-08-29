/**
 * Discipleship stages — ordered by typical lifecycle progression.
 * This enum is the SINGLE SOURCE OF TRUTH for all stage references.
 */
export enum DiscipleshipStage {
  NEW_CONVERT = 'NEW_CONVERT',
  HOLY_SPIRIT_FILLED = 'HOLY_SPIRIT_FILLED',
  IN_CLASS = 'IN_CLASS',
  CLASS_COMPLETED = 'CLASS_COMPLETED',
  BAPTIZED = 'BAPTIZED',
  MEMBER_TRANSFERRED = 'MEMBER_TRANSFERRED',
}

/**
 * Human-readable labels for display on frontend.
 */
export const STAGE_LABELS: Record<DiscipleshipStage, string> = {
  [DiscipleshipStage.NEW_CONVERT]: 'New Convert',
  [DiscipleshipStage.HOLY_SPIRIT_FILLED]: 'Holy Spirit Filled',
  [DiscipleshipStage.IN_CLASS]: 'In Class',
  [DiscipleshipStage.CLASS_COMPLETED]: 'Class Completed',
  [DiscipleshipStage.BAPTIZED]: 'Baptized',
  [DiscipleshipStage.MEMBER_TRANSFERRED]: 'Member Transferred',
};

/**
 * Ordered array for stage progression display (visual stepper).
 */
export const STAGE_ORDER: DiscipleshipStage[] = [
  DiscipleshipStage.NEW_CONVERT,
  DiscipleshipStage.IN_CLASS,
  DiscipleshipStage.CLASS_COMPLETED,
  DiscipleshipStage.BAPTIZED,
  DiscipleshipStage.MEMBER_TRANSFERRED,
];

/**
 * All valid stage values as a string array (for Zod validation).
 */
export const STAGE_VALUES = Object.values(DiscipleshipStage) as [string, ...string[]];
