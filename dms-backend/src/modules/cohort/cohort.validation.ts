import { z } from 'zod';

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ID');

export const createCohortSchema = {
  body: z.object({
    name: z.string().trim().min(2).max(120),
    description: z.string().trim().max(1000).optional(),
    // Only meaningful for a super_admin caller — ignored otherwise.
    branchId: objectId.optional(),
  }),
};

export const updateCohortSchema = {
  params: z.object({ cohortId: objectId }),
  body: z
    .object({
      name: z.string().trim().min(2).max(120).optional(),
      description: z.string().trim().max(1000).optional(),
      isActive: z.boolean().optional(),
    })
    .refine((d) => Object.keys(d).length > 0, { message: 'Provide a field to update.' }),
};

export const assignCohortSchema = {
  params: z.object({ convertId: objectId }),
  body: z.object({ cohortId: objectId }),
};

export const createPostSchema = {
  body: z.object({
    type: z.enum(['prayer', 'praise', 'message']).optional(),
    text: z.string().trim().min(1).max(2000),
  }),
};

export const postIdParamSchema = {
  params: z.object({ postId: objectId }),
};
