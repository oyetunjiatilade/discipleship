import { Router } from 'express';
import { authController } from './auth.controller';
import { validate } from '../../middleware/validate';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { authLimiter } from '../../middleware/rateLimiter';
import { asyncHandler } from '../../shared/utils/asyncHandler';
import {
  registerConvertSchema,
  verifyOtpSchema,
  requestLoginOtpSchema,
  adminLoginSchema,
  refreshTokenSchema,
  logoutSchema,
  createAdminSchema,
  changePasswordSchema,
} from './auth.validation';

const router = Router();

// ──────────────────────────────────────────
// Public routes (no auth required)
// All auth endpoints have stricter rate limiting
// ──────────────────────────────────────────

/**
 * POST /v1/auth/register
 * Register a new convert → sends OTP to phone
 */
router.post(
  '/register',
  authLimiter,
  validate(registerConvertSchema),
  asyncHandler(authController.register.bind(authController))
);

/**
 * POST /v1/auth/verify-otp
 * Verify registration OTP → returns JWT tokens
 */
router.post(
  '/verify-otp',
  authLimiter,
  validate(verifyOtpSchema),
  asyncHandler(authController.verifyRegistrationOtp.bind(authController))
);

/**
 * POST /v1/auth/login
 * Request login OTP for existing convert
 */
router.post(
  '/login',
  authLimiter,
  validate(requestLoginOtpSchema),
  asyncHandler(authController.requestLoginOtp.bind(authController))
);

/**
 * POST /v1/auth/login/verify
 * Verify login OTP → returns JWT tokens
 */
router.post(
  '/login/verify',
  authLimiter,
  validate(verifyOtpSchema),
  asyncHandler(authController.verifyLoginOtp.bind(authController))
);

/**
 * POST /v1/auth/admin/login
 * Admin login with email + password
 */
router.post(
  '/admin/login',
  authLimiter,
  validate(adminLoginSchema),
  asyncHandler(authController.adminLogin.bind(authController))
);

/**
 * POST /v1/auth/refresh
 * Exchange refresh token for new token pair
 */
router.post(
  '/refresh',
  validate(refreshTokenSchema),
  asyncHandler(authController.refresh.bind(authController))
);

// ──────────────────────────────────────────
// Protected routes (auth required)
// ──────────────────────────────────────────

/**
 * POST /v1/auth/logout
 * Revoke the provided refresh token (current device)
 */
router.post(
  '/logout',
  authenticate,
  validate(logoutSchema),
  asyncHandler(authController.logout.bind(authController))
);

/**
 * POST /v1/auth/logout-all
 * Revoke all refresh tokens (all devices)
 */
router.post(
  '/logout-all',
  authenticate,
  asyncHandler(authController.logoutAll.bind(authController))
);

/**
 * POST /v1/auth/admin/change-password
 * Change own password (authenticated admin). Revokes all sessions.
 */
router.post(
  '/admin/change-password',
  authenticate,
  authorize('admin'),
  validate(changePasswordSchema),
  asyncHandler(authController.changePassword.bind(authController))
);

/**
 * POST /v1/auth/admin/create
 * Create a new admin account (admin-only)
 */
router.post(
  '/admin/create',
  authenticate,
  authorize('admin'),
  validate(createAdminSchema),
  asyncHandler(authController.createAdmin.bind(authController))
);

/**
 * GET /v1/auth/admin/list
 * List admin accounts in the requester's branch (or every branch for super_admin)
 */
router.get(
  '/admin/list',
  authenticate,
  authorize('admin'),
  asyncHandler(authController.listAdmins.bind(authController))
);

export { router as authRoutes };
