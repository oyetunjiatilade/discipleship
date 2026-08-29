import { z } from 'zod';

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ID');

export const createBranchSchema = {
  body: z.object({
    name: z.string().trim().min(2).max(120),
  }),
};

export const updateBranchSchema = {
  params: z.object({ branchId: objectId }),
  body: z
    .object({
      name: z.string().trim().min(2).max(120).optional(),
      isActive: z.boolean().optional(),
    })
    .refine((d) => Object.keys(d).length > 0, { message: 'Provide a field to update.' }),
};
