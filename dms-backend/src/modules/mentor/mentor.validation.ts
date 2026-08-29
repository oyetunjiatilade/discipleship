import { z } from 'zod';

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ID');

export const createMentorSchema = {
  body: z.object({
    firstName: z.string().trim().min(2).max(100),
    lastName: z.string().trim().min(2).max(100),
    phone: z
      .string()
      .trim()
      .min(10)
      .max(15)
      .regex(/^[+\d][\d\s-]{8,14}$/, 'Invalid phone number format'),
    email: z.string().trim().email().max(255),
    password: z
      .string()
      .min(8)
      .max(128)
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        'Password must contain an uppercase letter, a lowercase letter, and a digit'
      ),
    // Only meaningful when the caller is super_admin — ignored otherwise.
    branchId: objectId.optional(),
  }),
};

export const assignConvertSchema = {
  params: z.object({ convertId: objectId }),
  body: z.object({ mentorId: objectId }),
};

export const convertIdOnlySchema = {
  params: z.object({ convertId: objectId }),
};

export const flockQuerySchema = {
  query: z.object({ mentorId: objectId.optional() }),
};

export const convertDetailParamSchema = {
  params: z.object({ convertId: objectId }),
};

export const addNoteSchema = {
  params: z.object({ convertId: objectId }),
  body: z.object({ text: z.string().trim().min(1).max(2000) }),
};

export const noteIdParamSchema = {
  params: z.object({ noteId: objectId }),
};
