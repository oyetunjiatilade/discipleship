// ──────────────────────────────────────────────
// Enums — EXACT copies of backend values.
//
// Source: src/shared/constants/stages.ts
// Source: src/shared/constants/roles.ts
// Source: src/modules/notification/notification.model.ts
//
// DO NOT change casing, spelling, or order.
// ──────────────────────────────────────────────

export enum DiscipleshipStage {
  NEW_CONVERT = 'NEW_CONVERT',
  HOLY_SPIRIT_FILLED = 'HOLY_SPIRIT_FILLED',
  IN_CLASS = 'IN_CLASS',
  CLASS_COMPLETED = 'CLASS_COMPLETED',
  BAPTIZED = 'BAPTIZED',
  MEMBER_TRANSFERRED = 'MEMBER_TRANSFERRED',
}

export const STAGE_LABELS: Record<DiscipleshipStage, string> = {
  [DiscipleshipStage.NEW_CONVERT]: 'New Convert',
  [DiscipleshipStage.HOLY_SPIRIT_FILLED]: 'Holy Spirit Filled',
  [DiscipleshipStage.IN_CLASS]: 'In Class',
  [DiscipleshipStage.CLASS_COMPLETED]: 'Class Completed',
  [DiscipleshipStage.BAPTIZED]: 'Baptized',
  [DiscipleshipStage.MEMBER_TRANSFERRED]: 'Member Transferred',
};

/** Visual stepper order (excludes HOLY_SPIRIT_FILLED branch). */
export const STAGE_ORDER: DiscipleshipStage[] = [
  DiscipleshipStage.NEW_CONVERT,
  DiscipleshipStage.IN_CLASS,
  DiscipleshipStage.CLASS_COMPLETED,
  DiscipleshipStage.BAPTIZED,
  DiscipleshipStage.MEMBER_TRANSFERRED,
];

export type Role = 'convert' | 'admin' | 'mentor' | 'super_admin';

export type NotificationType =
  | 'stage_transition'
  | 'lesson_completed'
  | 'course_completed'
  | 'quiz_passed'
  | 'quiz_failed'
  | 'welcome'
  | 'admin_message'
  | 'system';
