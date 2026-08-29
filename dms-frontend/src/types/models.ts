// ──────────────────────────────────────────────
// Domain model types
// Every type mirrors the exact JSON shape returned
// by the backend API. Do NOT invent fields.
// ──────────────────────────────────────────────

import type { DiscipleshipStage, NotificationType } from '@/constants/enums';

// ── Course ──
// Returned raw from Mongoose (has both _id and id virtual)

export interface CourseWithProgress {
  id: string;
  title: string;
  description: string;
  isPrimary: boolean;
  totalLessons: number;
  completedLessons: number;
  percentComplete: number;
  isComplete: boolean;
}

export interface Course {
  _id: string;
  id: string;
  title: string;
  description: string;
  isActive: boolean;
  isPrimary?: boolean;
  totalLessons: number;
  createdAt: string;
  updatedAt: string;
}

// ── Lesson (convert view — LessonPublicView from backend) ──

export interface Lesson {
  id: string;
  courseId: string;
  title: string;
  description: string;
  sortOrder: number;
  videoUrl: string;
  notesUrl: string;
  hasQuiz: boolean;
  estimatedMinutes: number | null;
  memoryVerse?: string | null;
  actionStep?: string | null;
  transcript?: string | null;
  notesMarkdown?: string | null;
}

// ── Lesson (admin view — includes publish/delete flags) ──

export interface AdminLesson extends Lesson {
  videoPublicId: string;
  notesPublicId: string;
  isPublished: boolean;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

// ── Progress ──

export interface LessonProgress {
  lessonId: string;
  status: 'not_started' | 'in_progress' | 'completed';
  startedAt: string | null;
  completedAt: string | null;
  quizAttempts: number;
  bestQuizScore: number | null;
  quizPassed: boolean;
}

export interface ProgressSummary {
  courseId: string;
  totalLessons: number;
  completedLessons: number;
  inProgressLessons: number;
  notStartedLessons: number;
  percentComplete: number;
  isComplete: boolean;
  lastActivityAt: string | null;
}

export interface StartLessonResponse {
  progress: LessonProgress;
  stageChanged: boolean;
}

export interface CompleteLessonResponse {
  progress: LessonProgress;
  allLessonsComplete: boolean;
  stageChanged: boolean;
}

// ── Quiz ──

export interface QuizOption {
  label: string;
  text: string;
}

export interface QuizQuestion {
  id: string;
  questionText: string;
  options: QuizOption[];
  sortOrder: number;
}

export interface Quiz {
  id: string;
  lessonId: string;
  title: string;
  description?: string;
  passingScore: number;
  maxAttempts: number;
  totalQuestions: number;
  questions: QuizQuestion[];
}

export interface AttemptAnswer {
  questionId: string;
  selectedLabel: string;
  correctLabel: string;
  isCorrect: boolean;
}

export interface AttemptResult {
  attemptId: string;
  score: number;
  totalQuestions: number;
  correctAnswers: number;
  passed: boolean;
  passingScore: number;
  attemptNumber: number;
  answers: AttemptAnswer[];
  submittedAt: string;
}

export interface AttemptSummary {
  attemptId: string;
  score: number;
  passed: boolean;
  attemptNumber: number;
  submittedAt: string;
}

export interface SubmitQuizPayload {
  answers: Array<{
    questionId: string;
    selectedLabel: string;
  }>;
}

// ── Notification ──

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  readAt: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

// ── Admin Reports ──

export interface StageSummary {
  stage: DiscipleshipStage;
  label: string;
  count: number;
  percentage: number;
}

export interface DiscipleshipStats {
  counts: {
    total: number;
    contacted: number;
    contactedThisWeek: number;
    attended: number;
    completed: number;
    baptized: number;
    integrated: number;
    outstanding: number;
  };
  rates: {
    classAttendance: number;
    classCompletion: number;
    baptism: number;
    attrition: number;
    overall: number;
  };
}

export interface DashboardStats {
  totalConverts: number;
  stageBreakdown: StageSummary[];
  newThisWeek: number;
  newThisMonth: number;
}

export interface ConvertReportRow {
  id: string;
  fullName: string;
  firstName: string;
  lastName: string;
  phone: string;
  branchId: string | null;
  gender: string | null;
  department?: string | null;
  departmentStatus?: string | null;
  lastContactedAt?: string | null;
  salvationDate: string;
  currentStage: DiscipleshipStage;
  stageLabel: string;
  isHolySpiritFilled: boolean;
  invitedBy: string | null;
  completionPercentage: number;
  completedLessons: number;
  totalLessons: number;
  lastActivityAt: string | null;
}

export interface ConvertReportResponse {
  converts: ConvertReportRow[];
  summary: {
    totalConverts: number;
    stageBreakdown: StageSummary[];
    averageCompletion: number;
  };
}

// ── Branch ──

export interface Branch {
  id: string;
  name: string;
  isActive: boolean;
}

// ── Quiz Admin ──

export interface QuestionAdminView {
  id: string;
  questionText: string;
  options: QuizOption[];
  correctLabel: string;
  sortOrder: number;
}

export interface QuizAdminView {
  id: string;
  lessonId: string;
  courseId: string;
  title: string;
  description: string;
  questions: QuestionAdminView[];
  passingScore: number;
  maxAttempts: number;
  totalQuestions: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
