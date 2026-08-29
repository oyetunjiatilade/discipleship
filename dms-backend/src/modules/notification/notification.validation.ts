import { z } from 'zod';
import { NOTIFICATION_TYPES } from './notification.model';
import { STAGE_VALUES } from '../../shared/constants/stages';

const objectIdSchema = z
  .string()
  .regex(/^[a-fA-F0-9]{24}$/, 'Invalid ID format');

// ──────────────────────────────────────────
// Convert — List notifications (query params)
// ──────────────────────────────────────────
export const listNotificationsSchema = {
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
    type: z
      .enum(NOTIFICATION_TYPES as [string, ...string[]])
      .optional(),
    isRead: z
      .enum(['true', 'false'])
      .transform((v) => v === 'true')
      .optional(),
  }),
};

// ──────────────────────────────────────────
// Convert — Mark single notification read
// ──────────────────────────────────────────
export const notificationIdParamSchema = {
  params: z.object({
    notificationId: objectIdSchema,
  }),
};

// ──────────────────────────────────────────
// Admin — Send to a specific convert
// ──────────────────────────────────────────
export const sendNotificationSchema = {
  body: z.object({
    convertId: objectIdSchema,
    title: z
      .string()
      .trim()
      .min(2, 'Title must be at least 2 characters')
      .max(300, 'Title must be at most 300 characters'),
    message: z
      .string()
      .trim()
      .min(2, 'Message must be at least 2 characters')
      .max(2000, 'Message must be at most 2000 characters'),
  }),
};

// ──────────────────────────────────────────
// Admin — Broadcast to all converts (or by stage)
// ──────────────────────────────────────────
export const broadcastSchema = {
  body: z.object({
    title: z
      .string()
      .trim()
      .min(2, 'Title must be at least 2 characters')
      .max(300, 'Title must be at most 300 characters'),
    message: z
      .string()
      .trim()
      .min(2, 'Message must be at least 2 characters')
      .max(2000, 'Message must be at most 2000 characters'),
    stage: z
      .enum(STAGE_VALUES as [string, ...string[]])
      .optional(),
  }),
};
