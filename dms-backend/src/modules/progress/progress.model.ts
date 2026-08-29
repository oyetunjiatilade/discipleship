import mongoose, { Schema, Document, Types } from 'mongoose';

/**
 * Lesson progress status.
 */
export type ProgressStatus = 'not_started' | 'in_progress' | 'completed';

/**
 * Progress document interface.
 * One document per convert per lesson.
 */
export interface IProgress extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  lessonId: Types.ObjectId;
  courseId: Types.ObjectId; // denormalized for efficient queries

  status: ProgressStatus;
  startedAt: Date | null;
  completedAt: Date | null;

  // Quiz tracking (updated by quiz module)
  quizAttempts: number;
  bestQuizScore: number | null;  // percentage
  quizPassed: boolean;

  updatedAt: Date;
}

/**
 * Per-lesson progress view for API responses.
 */
export interface LessonProgressView {
  lessonId: string;
  status: ProgressStatus;
  startedAt: Date | null;
  completedAt: Date | null;
  quizAttempts: number;
  bestQuizScore: number | null;
  quizPassed: boolean;
}

/**
 * Overall course progress summary for API responses.
 */
export interface ProgressSummary {
  courseId: string;
  totalLessons: number;
  completedLessons: number;
  inProgressLessons: number;
  notStartedLessons: number;
  percentComplete: number; // 0-100, rounded to 1 decimal
  isComplete: boolean;
  lastActivityAt: Date | null;
}

const progressSchema = new Schema<IProgress>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    lessonId: {
      type: Schema.Types.ObjectId,
      ref: 'Lesson',
      required: true,
    },
    courseId: {
      type: Schema.Types.ObjectId,
      ref: 'Course',
      required: true,
    },

    status: {
      type: String,
      enum: ['not_started', 'in_progress', 'completed'],
      default: 'not_started',
    },
    startedAt: {
      type: Date,
      default: null,
    },
    completedAt: {
      type: Date,
      default: null,
    },

    // Quiz fields (managed by quiz module)
    quizAttempts: {
      type: Number,
      default: 0,
      min: 0,
    },
    bestQuizScore: {
      type: Number,
      default: null,
      min: 0,
      max: 100,
    },
    quizPassed: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: { createdAt: false, updatedAt: true },
    toJSON: {
      transform(_doc, ret: Record<string, unknown>) {
        delete ret.__v;
        return ret;
      },
    },
  }
);

// ── Indexes ──

// Primary lookup: one progress record per user per lesson (enforced unique)
progressSchema.index({ userId: 1, lessonId: 1 }, { unique: true });

// Course-level queries: "all progress for user X in course Y"
progressSchema.index({ userId: 1, courseId: 1, status: 1 });

// Completion timeline: "when did user X last complete something?"
progressSchema.index({ userId: 1, completedAt: -1 });

/**
 * Transform a progress document into the API view.
 */
export function toLessonProgressView(progress: IProgress): LessonProgressView {
  return {
    lessonId: progress.lessonId.toString(),
    status: progress.status,
    startedAt: progress.startedAt,
    completedAt: progress.completedAt,
    quizAttempts: progress.quizAttempts,
    bestQuizScore: progress.bestQuizScore,
    quizPassed: progress.quizPassed,
  };
}

export const Progress = mongoose.model<IProgress>('Progress', progressSchema);
