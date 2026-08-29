import { z } from 'zod';

/**
 * Reusable MongoDB ObjectId validator.
 */
const objectIdSchema = z
  .string()
  .regex(/^[a-fA-F0-9]{24}$/, 'Invalid ID format');

/**
 * Single option in a multiple-choice question.
 */
const optionSchema = z.object({
  label: z
    .string()
    .trim()
    .min(1, 'Option label is required')
    .max(5, 'Option label must be at most 5 characters'),
  text: z
    .string()
    .trim()
    .min(1, 'Option text is required')
    .max(1000, 'Option text must be at most 1000 characters'),
});

/**
 * Single question input.
 */
const questionInputSchema = z.object({
  questionText: z
    .string()
    .trim()
    .min(5, 'Question text must be at least 5 characters')
    .max(2000, 'Question text must be at most 2000 characters'),
  options: z
    .array(optionSchema)
    .min(2, 'Each question must have at least 2 options')
    .max(6, 'Each question must have at most 6 options'),
  correctLabel: z
    .string()
    .trim()
    .min(1, 'Correct label is required')
    .max(5, 'Correct label must be at most 5 characters'),
  sortOrder: z
    .number()
    .int('Sort order must be a whole number')
    .min(1, 'Sort order must be at least 1'),
});

// ──────────────────────────────────────────
// Param schemas
// ──────────────────────────────────────────

export const quizIdParamSchema = {
  params: z.object({
    quizId: objectIdSchema,
  }),
};

export const lessonIdParamSchema = {
  params: z.object({
    lessonId: objectIdSchema,
  }),
};

export const attemptIdParamSchema = {
  params: z.object({
    attemptId: objectIdSchema,
  }),
};

// ──────────────────────────────────────────
// Create Quiz (admin)
// ──────────────────────────────────────────

export const createQuizSchema = {
  body: z.object({
    lessonId: objectIdSchema,
    title: z
      .string()
      .trim()
      .min(2, 'Title must be at least 2 characters')
      .max(300, 'Title must be at most 300 characters'),
    description: z
      .string()
      .trim()
      .max(2000, 'Description must be at most 2000 characters')
      .optional(),
    questions: z
      .array(questionInputSchema)
      .min(1, 'Quiz must have at least 1 question')
      .max(50, 'Quiz must have at most 50 questions'),
    passingScore: z
      .number()
      .min(1, 'Passing score must be at least 1')
      .max(100, 'Passing score must be at most 100')
      .optional(),
    maxAttempts: z
      .number()
      .int()
      .min(0, 'Max attempts must be 0 (unlimited) or higher')
      .max(100, 'Max attempts must be at most 100')
      .optional(),
  }),
};

// ──────────────────────────────────────────
// Update Quiz (admin)
// ──────────────────────────────────────────

export const updateQuizSchema = {
  params: z.object({
    quizId: objectIdSchema,
  }),
  body: z
    .object({
      title: z
        .string()
        .trim()
        .min(2, 'Title must be at least 2 characters')
        .max(300)
        .optional(),
      description: z
        .string()
        .trim()
        .max(2000)
        .optional(),
      questions: z
        .array(questionInputSchema)
        .min(1)
        .max(50)
        .optional(),
      passingScore: z
        .number()
        .min(1)
        .max(100)
        .optional(),
      maxAttempts: z
        .number()
        .int()
        .min(0)
        .max(100)
        .optional(),
      isActive: z.boolean().optional(),
    })
    .refine(
      (data) => Object.values(data).some((v) => v !== undefined),
      { message: 'At least one field must be provided for update' }
    ),
};

// ──────────────────────────────────────────
// Submit Quiz Answers (convert)
// ──────────────────────────────────────────

export const submitQuizSchema = {
  params: z.object({
    lessonId: objectIdSchema,
  }),
  body: z.object({
    answers: z
      .array(
        z.object({
          questionId: objectIdSchema,
          selectedLabel: z
            .string()
            .trim()
            .min(1, 'Selected label is required')
            .max(5, 'Selected label must be at most 5 characters'),
        })
      )
      .min(1, 'At least one answer must be submitted'),
  }),
};
