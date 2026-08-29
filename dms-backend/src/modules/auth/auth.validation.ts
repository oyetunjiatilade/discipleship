import { z } from 'zod';

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ID');

/**
 * Shared phone validator.
 * Accepts Nigerian local (080...), international (+234...), or bare digits.
 */
const phoneSchema = z
  .string()
  .trim()
  .min(10, 'Phone number must be at least 10 digits')
  .max(15, 'Phone number must be at most 15 digits')
  .regex(/^[+\d][\d\s-]{8,14}$/, 'Invalid phone number format');

/**
 * OTP code validator — exactly 6 digits.
 */
const otpCodeSchema = z
  .string()
  .trim()
  .length(6, 'OTP must be exactly 6 digits')
  .regex(/^\d{6}$/, 'OTP must contain only digits');

// ──────────────────────────────────────────
// Convert Registration
// ──────────────────────────────────────────
export const registerConvertSchema = {
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
    branchId: objectId,
    gender: z.enum(['male', 'female']).optional(),
    invitedBy: z
      .string()
      .trim()
      .max(200, 'Invited by must be at most 200 characters')
      .optional(),
    department: z.string().trim().max(100).optional(),
    departmentStatus: z.enum(['member', 'interested']).optional(),
  }),
};

// ──────────────────────────────────────────
// Verify OTP (shared for registration + login)
// ──────────────────────────────────────────
export const verifyOtpSchema = {
  body: z.object({
    phone: phoneSchema,
    code: otpCodeSchema,
  }),
};

// ──────────────────────────────────────────
// Convert Login (request OTP)
// ──────────────────────────────────────────
export const requestLoginOtpSchema = {
  body: z.object({
    phone: phoneSchema,
  }),
};

// ──────────────────────────────────────────
// Admin Login
// ──────────────────────────────────────────
export const adminLoginSchema = {
  body: z.object({
    email: z
      .string()
      .trim()
      .email('Invalid email format')
      .max(255, 'Email must be at most 255 characters'),
    password: z
      .string()
      .min(1, 'Password is required'),
  }),
};

// ──────────────────────────────────────────
// Token Refresh
// ──────────────────────────────────────────
export const refreshTokenSchema = {
  body: z.object({
    // Optional: normally read from the httpOnly cookie, body is a fallback.
    refreshToken: z.string().min(1).optional(),
  }),
};

// ──────────────────────────────────────────
// Logout
// ──────────────────────────────────────────
export const logoutSchema = {
  body: z.object({
    refreshToken: z.string().min(1).optional(),
  }),
};

// ──────────────────────────────────────────
// Change Password (admin, authenticated)
// ──────────────────────────────────────────
export const changePasswordSchema = {
  body: z.object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .max(128, 'Password must be at most 128 characters')
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        'Password must contain at least one uppercase letter, one lowercase letter, and one digit'
      ),
  }),
};

// ──────────────────────────────────────────
// Create Admin (any admin, for their own branch; super_admin may also
// target another branch and/or mint another super_admin — enforced in
// the controller, since that depends on who's calling, not just shape)
// ──────────────────────────────────────────
export const createAdminSchema = {
  body: z.object({
    firstName: z
      .string()
      .trim()
      .min(2, 'First name must be at least 2 characters')
      .max(100),
    lastName: z
      .string()
      .trim()
      .min(2, 'Last name must be at least 2 characters')
      .max(100),
    phone: phoneSchema,
    email: z
      .string()
      .trim()
      .email('Invalid email format')
      .max(255),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .max(128, 'Password must be at most 128 characters')
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        'Password must contain at least one uppercase letter, one lowercase letter, and one digit'
      ),
    // Only meaningful when the caller is super_admin — ignored otherwise.
    branchId: objectId.optional(),
    role: z.enum(['admin', 'super_admin']).optional(),
  }),
};
