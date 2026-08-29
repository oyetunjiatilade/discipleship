// Shapes for mentor/care features — mirror backend responses.
import type { DiscipleshipStage } from '@/constants/enums';
import type { ReflectionWithLesson } from '@/types/engagement';

export type FlockStatus = 'new' | 'active' | 'stuck' | 'dark' | 'done';

export interface FlockMember {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  currentStage: DiscipleshipStage;
  stageLabel: string;
  isHolySpiritFilled: boolean;
  percentComplete: number;
  completedLessons: number;
  totalLessons: number;
  lastActivityAt: string | null;
  daysSinceActive: number | null;
  status: FlockStatus;
}

export interface FollowUpRow {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  currentStage: DiscipleshipStage;
  stageLabel: string;
  mentorId: string | null;
  mentorName: string | null;
  completedLessons: number;
  lastActivityAt: string | null;
  daysInactive: number | null;
  reason: string;
}

export interface MentorSummary {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone: string;
  flockCount: number;
}

export interface AvailableTransition {
  toStage: DiscipleshipStage;
  toLabel: string;
  trigger: 'auto' | 'admin_manual';
  description: string;
}

export interface StageHistoryEntry {
  id: string;
  fromStage: string | null;
  toStage: string;
  trigger: 'auto' | 'admin_manual';
  reason: string | null;
  transitionedAt: string;
}

export interface ConvertStageInfo {
  current: {
    currentStage: DiscipleshipStage;
    stageLabel: string;
    stageUpdatedAt: string;
    isHolySpiritFilled: boolean;
  };
  availableTransitions: AvailableTransition[];
  history: StageHistoryEntry[];
}

export interface MentorNote {
  id: string;
  text: string;
  mentorId: string;
  createdAt: string;
}

export interface MentorConvertDetail {
  convert: {
    id: string;
    firstName: string;
    lastName: string;
    phone: string;
    currentStage: DiscipleshipStage;
    stageLabel: string;
    isHolySpiritFilled: boolean;
    department: string | null;
    departmentStatus: string | null;
    cohortName: string | null;
    lastLoginAt: string | null;
  };
  progress: {
    percentComplete: number;
    completedLessons: number;
    totalLessons: number;
    lastActivityAt: string | null;
  };
  reflections: ReflectionWithLesson[];
  stageHistory: StageHistoryEntry[];
  notes: MentorNote[];
}
