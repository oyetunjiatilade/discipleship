import { z } from 'zod';

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ID');

export const lessonIdParamSchema = {
  params: z.object({ lessonId: objectId }),
};

export const upsertReflectionSchema = {
  params: z.object({ lessonId: objectId }),
  body: z
    .object({
      text: z.string().trim().max(5000).optional(),
      actionStepDone: z.boolean().optional(),
    })
    .refine((d) => d.text !== undefined || d.actionStepDone !== undefined, {
      message: 'Provide text and/or actionStepDone.',
    }),
};

export const convertIdParamSchema = {
  params: z.object({ convertId: objectId }),
};
