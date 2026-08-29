import { z } from 'zod';

/**
 * Reusable Cloudinary URL validator.
 */
const cloudinaryUrlSchema = z
  .string()
  .trim()
  .url('Must be a valid URL')
  .max(1000, 'URL must be at most 1000 characters');

/**
 * Reusable Cloudinary publicId validator.
 */
const cloudinaryPublicIdSchema = z
  .string()
  .trim()
  .min(1, 'Public ID is required')
  .max(500, 'Public ID must be at most 500 characters');

/**
 * Reusable MongoDB ObjectId param validator.
 */
const objectIdParamSchema = z
  .string()
  .regex(/^[a-fA-F0-9]{24}$/, 'Invalid ID format');

// ──────────────────────────────────────────
// Update Course
// ──────────────────────────────────────────
export const createCourseSchema = {
  body: z.object({
    title: z.string().trim().min(2).max(200),
    description: z.string().trim().min(10).max(2000),
  }),
};

export const courseIdParamSchema = {
  params: z.object({ courseId: objectIdParamSchema }),
};

export const updateCourseByIdSchema = {
  params: z.object({ courseId: objectIdParamSchema }),
  body: z
    .object({
      title: z.string().trim().min(2).max(200).optional(),
      description: z.string().trim().min(10).max(2000).optional(),
      isActive: z.boolean().optional(),
    })
    .refine((d) => Object.keys(d).length > 0, { message: 'Provide a field to update.' }),
};

export const updateCourseSchema = {
  body: z
    .object({
      title: z
        .string()
        .trim()
        .min(2, 'Title must be at least 2 characters')
        .max(200, 'Title must be at most 200 characters')
        .optional(),
      description: z
        .string()
        .trim()
        .min(10, 'Description must be at least 10 characters')
        .max(2000, 'Description must be at most 2000 characters')
        .optional(),
    })
    .refine((data) => data.title || data.description, {
      message: 'At least one field (title or description) must be provided',
    }),
};

// ──────────────────────────────────────────
// Create Lesson
// ──────────────────────────────────────────
export const createLessonSchema = {
  body: z.object({
    courseId: objectIdParamSchema.optional(),
    title: z
      .string()
      .trim()
      .min(2, 'Title must be at least 2 characters')
      .max(300, 'Title must be at most 300 characters'),
    description: z
      .string()
      .trim()
      .min(10, 'Description must be at least 10 characters')
      .max(5000, 'Description must be at most 5000 characters'),
    sortOrder: z
      .number()
      .int('Sort order must be a whole number')
      .min(1, 'Sort order must be at least 1'),
    videoUrl: cloudinaryUrlSchema,
    videoPublicId: cloudinaryPublicIdSchema,
    notesUrl: cloudinaryUrlSchema,
    notesPublicId: cloudinaryPublicIdSchema,
    estimatedMinutes: z
      .number()
      .int()
      .min(1, 'Estimated minutes must be at least 1')
      .max(600, 'Estimated minutes must be at most 600')
      .optional(),
    memoryVerse: z.string().trim().max(1000).nullable().optional(),
    actionStep: z.string().trim().max(1000).nullable().optional(),
    transcript: z.string().trim().max(50000).nullable().optional(),
    notesMarkdown: z.string().trim().max(50000).nullable().optional(),
    isPublished: z.boolean().optional(),
  }),
};

// ──────────────────────────────────────────
// Update Lesson
// ──────────────────────────────────────────
export const updateLessonSchema = {
  params: z.object({
    lessonId: objectIdParamSchema,
  }),
  body: z
    .object({
      title: z
        .string()
        .trim()
        .min(2, 'Title must be at least 2 characters')
        .max(300, 'Title must be at most 300 characters')
        .optional(),
      description: z
        .string()
        .trim()
        .min(10, 'Description must be at least 10 characters')
        .max(5000, 'Description must be at most 5000 characters')
        .optional(),
      videoUrl: cloudinaryUrlSchema.optional(),
      videoPublicId: cloudinaryPublicIdSchema.optional(),
      notesUrl: cloudinaryUrlSchema.optional(),
      notesPublicId: cloudinaryPublicIdSchema.optional(),
      estimatedMinutes: z
        .number()
        .int()
        .min(1)
        .max(600)
        .nullable()
        .optional(),
      memoryVerse: z.string().trim().max(1000).nullable().optional(),
      actionStep: z.string().trim().max(1000).nullable().optional(),
      transcript: z.string().trim().max(50000).nullable().optional(),
      notesMarkdown: z.string().trim().max(50000).nullable().optional(),
      isPublished: z.boolean().optional(),
    })
    .refine(
      (data) => Object.values(data).some((v) => v !== undefined),
      { message: 'At least one field must be provided for update' }
    ),
};

// ──────────────────────────────────────────
// Delete Lesson (param only)
// ──────────────────────────────────────────
export const lessonIdParamSchema = {
  params: z.object({
    lessonId: objectIdParamSchema,
  }),
};

// ──────────────────────────────────────────
// Reorder Lessons
// ──────────────────────────────────────────
export const reorderLessonsSchema = {
  body: z.object({
    courseId: objectIdParamSchema.optional(),
    lessons: z
      .array(
        z.object({
          lessonId: objectIdParamSchema,
          sortOrder: z
            .number()
            .int('Sort order must be a whole number')
            .min(1, 'Sort order must be at least 1'),
        })
      )
      .min(1, 'At least one lesson must be provided')
      .max(100, 'Cannot reorder more than 100 lessons at once'),
  }),
};
