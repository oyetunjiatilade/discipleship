import { z } from 'zod';
import { STAGE_ORDER, DiscipleshipStage } from '@/constants/enums';

// ──────────────────────────────────────────────
// SHARED VALIDATORS — exact copy of backend
// ──────────────────────────────────────────────

/** Nigerian phone: local (080...), international (+234...), or bare digits. */
export const phoneSchema = z
  .string()
  .trim()
  .min(10, 'Phone number must be at least 10 digits')
  .max(15, 'Phone number must be at most 15 digits')
  .regex(/^[+\d][\d\s-]{8,14}$/, 'Invalid phone number format');

/** OTP code — exactly 6 digits. */
export const otpCodeSchema = z
  .string()
  .trim()
  .length(6, 'OTP must be exactly 6 digits')
  .regex(/^\d{6}$/, 'OTP must contain only digits');

// ──────────────────────────────────────────────
// AUTH FORMS
// ──────────────────────────────────────────────

/** POST /v1/auth/register */
export const registerSchema = z.object({
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
  branchId: z.string().min(1, 'Please select your branch'),
  gender: z.enum(['male', 'female']).optional(),
  invitedBy: z
    .string()
    .trim()
    .max(200, 'Must be at most 200 characters')
    .optional()
    .or(z.literal('')),
  department: z.string().trim().max(100).optional(),
  departmentStatus: z.enum(['member', 'interested']).optional(),
});

export type RegisterFormData = z.infer<typeof registerSchema>;

/** POST /v1/auth/verify-otp | POST /v1/auth/login/verify */
export const verifyOtpSchema = z.object({
  phone: phoneSchema,
  code: otpCodeSchema,
});

/** POST /v1/auth/login */
export const loginPhoneSchema = z.object({
  phone: phoneSchema,
});

/** POST /v1/auth/admin/login */
export const adminLoginSchema = z.object({
  email: z
    .string()
    .trim()
    .email('Invalid email format')
    .max(255, 'Email must be at most 255 characters'),
  password: z.string().min(1, 'Password is required'),
});

// ──────────────────────────────────────────────
// LESSON FORMS (admin)
// ──────────────────────────────────────────────

const cloudinaryUrlSchema = z
  .string()
  .trim()
  .url('Must be a valid URL')
  .max(1000, 'URL must be at most 1000 characters');

const cloudinaryPublicIdSchema = z
  .string()
  .trim()
  .min(1, 'Public ID is required')
  .max(500, 'Public ID must be at most 500 characters');

/** POST /v1/admin/lessons */
export const createLessonSchema = z.object({
  title: z
    .string()
    .trim()
    .min(2, 'Title must be at least 2 characters')
    .max(300, 'Title must be at most 300 characters'),
  description: z
    .string()
    .trim()
    .min(10, 'Description must be at least 10 characters')
    .max(5000, 'Description must be at most 5000 characters'),
  sortOrder: z
    .number()
    .int('Sort order must be a whole number')
    .min(1, 'Sort order must be at least 1'),
  videoUrl: cloudinaryUrlSchema,
  videoPublicId: cloudinaryPublicIdSchema,
  notesUrl: cloudinaryUrlSchema,
  notesPublicId: cloudinaryPublicIdSchema,
  estimatedMinutes: z
    .number()
    .int()
    .min(1, 'Must be at least 1 minute')
    .max(600, 'Must be at most 600 minutes')
    .optional(),
  isPublished: z.boolean().optional(),
});

// ──────────────────────────────────────────────
// QUIZ SUBMISSION
// ──────────────────────────────────────────────

/** POST /v1/quizzes/lesson/:lessonId/submit */
export const submitQuizSchema = z.object({
  answers: z
    .array(
      z.object({
        questionId: z.string().regex(/^[a-fA-F0-9]{24}$/, 'Invalid ID'),
        selectedLabel: z
          .string()
          .trim()
          .min(1, 'Selection required')
          .max(5, 'Must be at most 5 characters'),
      })
    )
    .min(1, 'At least one answer must be submitted'),
});

// ──────────────────────────────────────────────
// ADMIN NOTIFICATION FORMS
// ──────────────────────────────────────────────

/** POST /v1/admin/notifications/send */
export const sendNotificationSchema = z.object({
  convertId: z.string().regex(/^[a-fA-F0-9]{24}$/, 'Invalid Convert ID format'),
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
});

/** POST /v1/admin/notifications/broadcast */
export const broadcastSchema = z.object({
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
  stage: z.nativeEnum(DiscipleshipStage).optional(),
});
