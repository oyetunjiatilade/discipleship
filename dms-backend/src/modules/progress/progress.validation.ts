import { z } from 'zod';

/**
 * Reusable MongoDB ObjectId validator.
 */
const objectIdSchema = z
  .string()
  .regex(/^[a-fA-F0-9]{24}$/, 'Invalid ID format');

// ──────────────────────────────────────────
// Start / Complete a lesson (convert)
// ──────────────────────────────────────────
export const lessonIdParamSchema = {
  params: z.object({
    lessonId: objectIdSchema,
  }),
};

// ──────────────────────────────────────────
// Admin: view progress for a specific convert
// ──────────────────────────────────────────
export const convertIdParamSchema = {
  params: z.object({
    convertId: objectIdSchema,
  }),
};
