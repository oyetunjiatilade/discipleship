import { z } from 'zod';

/**
 * Validation for PATCH /v1/me.
 * All fields optional — a partial update. At least one must be present.
 */
export const updateProfileSchema = {
  body: z
    .object({
      firstName: z.string().trim().min(2).max(100).optional(),
      lastName: z.string().trim().min(2).max(100).optional(),
      dateOfBirth: z.coerce.date().optional(),
      gender: z.enum(['male', 'female']).optional(),
      address: z.string().trim().max(500).optional(),
      profileImageUrl: z.string().url().optional(),
      department: z.string().trim().max(100).nullable().optional(),
      departmentStatus: z.enum(['member', 'interested']).nullable().optional(),
      lowDataMode: z.boolean().optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: 'Provide at least one field to update.',
    }),
};
