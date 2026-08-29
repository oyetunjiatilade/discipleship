import mongoose, { Schema, Document, Types } from 'mongoose';

/**
 * Lesson document interface.
 *
 * Each lesson belongs to a course and has an explicit sort order.
 * Content (video + PDF) is hosted on Cloudinary — we store both
 * the URL (for serving) and the publicId (for management/deletion).
 */
export interface ILesson extends Document {
  _id: Types.ObjectId;
  courseId: Types.ObjectId;
  title: string;
  description: string;
  sortOrder: number;

  // Cloudinary video
  videoUrl: string;
  videoPublicId: string;

  // Cloudinary PDF notes
  notesUrl: string;
  notesPublicId: string;

  // Metadata
  hasQuiz: boolean; // denormalized flag — set by quiz module
  estimatedMinutes: number | null;
  memoryVerse: string | null; // admin-authored verse to memorize
  actionStep: string | null;  // admin-authored 'do this' application step
  transcript: string | null;  // admin-authored text version (low-data reading)
  notesMarkdown: string | null; // admin-authored inline notes (rendered as HTML, no PDF)
  isPublished: boolean; // admin can hide draft lessons from converts
  isDeleted: boolean; // soft delete flag

  createdAt: Date;
  updatedAt: Date;
}

/**
 * Safe lesson object for convert-facing API responses.
 * Strips admin-only fields like publicIds and isDeleted.
 */
export interface LessonPublicView {
  id: string;
  courseId: string;
  title: string;
  description: string;
  sortOrder: number;
  videoUrl: string;
  notesUrl: string;
  hasQuiz: boolean;
  estimatedMinutes: number | null;
  memoryVerse: string | null;
  actionStep: string | null;
  transcript: string | null;
  notesMarkdown: string | null;
}

/**
 * Full lesson object for admin API responses.
 */
export interface LessonAdminView {
  id: string;
  courseId: string;
  title: string;
  description: string;
  sortOrder: number;
  videoUrl: string;
  videoPublicId: string;
  notesUrl: string;
  notesPublicId: string;
  hasQuiz: boolean;
  estimatedMinutes: number | null;
  memoryVerse: string | null;
  actionStep: string | null;
  transcript: string | null;
  notesMarkdown: string | null;
  isPublished: boolean;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const lessonSchema = new Schema<ILesson>(
  {
    courseId: {
      type: Schema.Types.ObjectId,
      ref: 'Course',
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 300,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 5000,
    },
    sortOrder: {
      type: Number,
      required: true,
      min: 1,
    },

    // ── Cloudinary video ──
    videoUrl: {
      type: String,
      required: true,
      trim: true,
    },
    videoPublicId: {
      type: String,
      required: true,
      trim: true,
    },

    // ── Cloudinary PDF notes ──
    notesUrl: {
      type: String,
      required: true,
      trim: true,
    },
    notesPublicId: {
      type: String,
      required: true,
      trim: true,
    },

    // ── Metadata ──
    hasQuiz: {
      type: Boolean,
      default: false,
    },
    estimatedMinutes: {
      type: Number,
      default: null,
      min: 1,
    },
    memoryVerse: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: null,
    },
    actionStep: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: null,
    },
    transcript: {
      type: String,
      trim: true,
      maxlength: 50000,
      default: null,
    },
    notesMarkdown: {
      type: String,
      trim: true,
      maxlength: 50000,
      default: null,
    },
    isPublished: {
      type: Boolean,
      default: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret: Record<string, unknown>) {
        delete ret.__v;
        return ret;
      },
    },
  }
);

// ─────────────────────────────────────────────
// Indexes
// ─────────────────────────────────────────────

// Primary query: lessons for a course, ordered, excluding deleted
// Used by both admin (all) and convert (published only) endpoints
lessonSchema.index({ courseId: 1, sortOrder: 1 });

// Enforce unique sort order per course among non-deleted lessons
lessonSchema.index(
  { courseId: 1, sortOrder: 1 },
  {
    unique: true,
    partialFilterExpression: { isDeleted: false },
    name: 'unique_sort_order_per_course',
  }
);

// ─────────────────────────────────────────────
// Static helpers for response transformation
// ─────────────────────────────────────────────

/**
 * Transform a lesson document into the convert-safe public view.
 */
export function toLessonPublicView(lesson: ILesson): LessonPublicView {
  return {
    id: lesson._id.toString(),
    courseId: lesson.courseId.toString(),
    title: lesson.title,
    description: lesson.description,
    sortOrder: lesson.sortOrder,
    videoUrl: lesson.videoUrl,
    notesUrl: lesson.notesUrl,
    hasQuiz: lesson.hasQuiz,
    estimatedMinutes: lesson.estimatedMinutes,
    memoryVerse: lesson.memoryVerse ?? null,
    actionStep: lesson.actionStep ?? null,
    transcript: lesson.transcript ?? null,
    notesMarkdown: lesson.notesMarkdown ?? null,
  };
}

/**
 * Transform a lesson document into the full admin view.
 */
export function toLessonAdminView(lesson: ILesson): LessonAdminView {
  return {
    id: lesson._id.toString(),
    courseId: lesson.courseId.toString(),
    title: lesson.title,
    description: lesson.description,
    sortOrder: lesson.sortOrder,
    videoUrl: lesson.videoUrl,
    videoPublicId: lesson.videoPublicId,
    notesUrl: lesson.notesUrl,
    notesPublicId: lesson.notesPublicId,
    hasQuiz: lesson.hasQuiz,
    estimatedMinutes: lesson.estimatedMinutes,
    memoryVerse: lesson.memoryVerse ?? null,
    actionStep: lesson.actionStep ?? null,
    transcript: lesson.transcript ?? null,
    notesMarkdown: lesson.notesMarkdown ?? null,
    isPublished: lesson.isPublished,
    isDeleted: lesson.isDeleted,
    createdAt: lesson.createdAt,
    updatedAt: lesson.updatedAt,
  };
}

export const Lesson = mongoose.model<ILesson>('Lesson', lessonSchema);
