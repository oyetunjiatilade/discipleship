import { DiscipleshipStage } from '../../shared/constants/stages';
import { TransitionRule } from './stage.types';

/**
 * TRANSITION MAP — The single source of truth for all valid stage transitions.
 *
 * Rules:
 * ┌──────────────────────┬───────────────────────┬──────────┬─────────────────────────────────┐
 * │ From                 │ To                    │ Trigger  │ When                            │
 * ├──────────────────────┼───────────────────────┼──────────┼─────────────────────────────────┤
 * │ NEW_CONVERT          │ IN_CLASS              │ auto     │ Convert starts first lesson     │
 * │ NEW_CONVERT          │ HOLY_SPIRIT_FILLED    │ admin    │ Admin confirms before class     │
 * │ HOLY_SPIRIT_FILLED   │ IN_CLASS              │ auto     │ Convert starts first lesson     │
 * │ IN_CLASS             │ CLASS_COMPLETED       │ auto     │ All lessons + quizzes done      │
 * │ CLASS_COMPLETED      │ BAPTIZED              │ admin    │ Admin confirms baptism          │
 * │ BAPTIZED             │ MEMBER_TRANSFERRED    │ admin    │ Admin confirms transfer         │
 * └──────────────────────┴───────────────────────┴──────────┴─────────────────────────────────┘
 *
 * State diagram:
 *
 *   NEW_CONVERT ──auto──→ IN_CLASS ──auto──→ CLASS_COMPLETED ──admin──→ BAPTIZED ──admin──→ MEMBER_TRANSFERRED
 *        │                    ▲
 *        └──admin──→ HOLY_SPIRIT_FILLED ──auto──┘
 *
 *   Parallel flag: isHolySpiritFilled (settable by admin at ANY stage, independent of flow)
 */
export const TRANSITION_RULES: TransitionRule[] = [
  // ── Auto transitions (triggered by system events) ──
  {
    from: DiscipleshipStage.NEW_CONVERT,
    to: DiscipleshipStage.IN_CLASS,
    trigger: 'auto',
    description: 'Convert starts their first lesson',
  },
  {
    from: DiscipleshipStage.HOLY_SPIRIT_FILLED,
    to: DiscipleshipStage.IN_CLASS,
    trigger: 'auto',
    description: 'Holy Spirit filled convert starts their first lesson',
  },
  {
    from: DiscipleshipStage.IN_CLASS,
    to: DiscipleshipStage.CLASS_COMPLETED,
    trigger: 'auto',
    description: 'Convert completes all lessons and passes all quizzes',
  },

  // ── Admin manual transitions ──
  {
    from: DiscipleshipStage.NEW_CONVERT,
    to: DiscipleshipStage.HOLY_SPIRIT_FILLED,
    trigger: 'admin_manual',
    description: 'Admin confirms Holy Spirit filling before class begins',
  },
  {
    from: DiscipleshipStage.CLASS_COMPLETED,
    to: DiscipleshipStage.BAPTIZED,
    trigger: 'admin_manual',
    description: 'Admin confirms water baptism',
  },
  {
    from: DiscipleshipStage.BAPTIZED,
    to: DiscipleshipStage.MEMBER_TRANSFERRED,
    trigger: 'admin_manual',
    description: 'Admin confirms membership transfer',
  },
];

/**
 * Build a lookup key for fast transition validation.
 */
function buildKey(from: DiscipleshipStage, to: DiscipleshipStage): string {
  return `${from}→${to}`;
}

/**
 * Pre-built lookup map for O(1) transition validation.
 */
const TRANSITION_MAP = new Map<string, TransitionRule>(
  TRANSITION_RULES.map((rule) => [buildKey(rule.from, rule.to), rule])
);

/**
 * Check if a transition is valid and return the matching rule.
 * Returns null if the transition is not allowed.
 */
export function findTransitionRule(
  from: DiscipleshipStage,
  to: DiscipleshipStage
): TransitionRule | null {
  return TRANSITION_MAP.get(buildKey(from, to)) || null;
}

/**
 * Get all valid transitions FROM a given stage.
 * Useful for admin UI to show available actions.
 */
export function getValidTransitionsFrom(from: DiscipleshipStage): TransitionRule[] {
  return TRANSITION_RULES.filter((rule) => rule.from === from);
}
