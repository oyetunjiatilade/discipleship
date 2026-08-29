import { z } from 'zod';

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ID');

export const createSessionSchema = {
  body: z.object({
    title: z.string().trim().min(2).max(200),
    description: z.string().trim().max(2000).optional(),
    scheduledAt: z.coerce.date(),
    durationMinutes: z.number().int().min(5).max(600).optional(),
    meetingUrl: z.string().trim().url().max(1000),
    cohortId: objectId.nullable().optional(),
    // Only meaningful for a super_admin caller — ignored otherwise.
    branchId: objectId.optional(),
  }),
};

export const updateSessionSchema = {
  params: z.object({ sessionId: objectId }),
  body: z
    .object({
      title: z.string().trim().min(2).max(200).optional(),
      description: z.string().trim().max(2000).optional(),
      scheduledAt: z.coerce.date().optional(),
      durationMinutes: z.number().int().min(5).max(600).optional(),
      meetingUrl: z.string().trim().url().max(1000).optional(),
      cohortId: objectId.nullable().optional(),
    })
    .refine((d) => Object.keys(d).length > 0, { message: 'Provide a field to update.' }),
};

export const sessionIdParamSchema = { params: z.object({ sessionId: objectId }) };

export const markAttendanceSchema = {
  params: z.object({ sessionId: objectId }),
  body: z.object({ userId: objectId, attended: z.boolean() }),
};

export const rsvpSchema = {
  params: z.object({ sessionId: objectId }),
  body: z.object({ rsvp: z.enum(['going', 'not_going']) }),
};
