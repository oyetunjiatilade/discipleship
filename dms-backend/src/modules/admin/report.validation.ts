import { z } from 'zod';
import { STAGE_VALUES } from '../../shared/constants/stages';

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ID');

/**
 * Shared phone validator (same as auth.validation.ts).
 */
const phoneSchema = z
  .string()
  .trim()
  .min(10, 'Phone number must be at least 10 digits')
  .max(15, 'Phone number must be at most 15 digits')
  .regex(/^[+\d][\d\s-]{8,14}$/, 'Invalid phone number format');

/**
 * Shared filter query schema.
 * Used by both the paginated JSON endpoint and CSV export.
 *
 * All fields are optional query string parameters.
 */
const reportFilterSchema = z.object({
  stage: z
    .enum(STAGE_VALUES as [string, ...string[]])
    .optional(),
  search: z
    .string()
    .trim()
    .max(200, 'Search query must be at most 200 characters')
    .optional(),
  salvationDateFrom: z
    .string()
    .datetime({ offset: true })
    .or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD format'))
    .optional(),
  salvationDateTo: z
    .string()
    .datetime({ offset: true })
    .or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD format'))
    .optional(),
  gender: z
    .enum(['male', 'female'])
    .optional(),
  isHolySpiritFilled: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
  // Only meaningful for a super_admin caller — ignored for a plain admin.
  branchId: objectId.optional(),
});

// ──────────────────────────────────────────
// Paginated Convert Report
// ──────────────────────────────────────────
export const convertReportSchema = {
  query: reportFilterSchema.extend({
    page: z.string().optional(),
    limit: z.string().optional(),
    sort: z.string().optional(),
  }),
};

// ──────────────────────────────────────────
// CSV Export (filters only, no pagination)
// ──────────────────────────────────────────
export const csvExportSchema = {
  query: reportFilterSchema,
};

// ──────────────────────────────────────────
// Admin — Create Convert (bypass OTP)
// ──────────────────────────────────────────
export const adminCreateConvertSchema = {
  body: z.object({
    firstName: z
      .string()
      .trim()
      .min(2, 'First name must be at least 2 characters')
      .max(100, 'First name must be at most 100 characters'),
    lastName: z
      .string()
      .trim()
      .min(2, 'Last name must be at least 2 characters')
      .max(100, 'Last name must be at most 100 characters'),
    phone: phoneSchema,
    gender: z.enum(['male', 'female']).optional(),
    invitedBy: z
      .string()
      .trim()
      .max(200, 'Invited by must be at most 200 characters')
      .optional(),
    // Only meaningful for a super_admin caller — a plain admin's convert is
    // always created in their own branch regardless of this field.
    branchId: objectId.optional(),
  }),
};

// ──────────────────────────────────────────
// Log Contact (phone call with a convert)
// ──────────────────────────────────────────
export const logContactSchema = {
  params: z.object({
    convertId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid convert ID'),
  }),
  body: z.object({
    note: z.string().trim().max(1000).optional(),
  }),
};
