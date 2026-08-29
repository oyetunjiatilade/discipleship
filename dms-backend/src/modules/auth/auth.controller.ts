import { Request, Response, CookieOptions } from 'express';
import { authService } from './auth.service';
import { sendSuccess, sendCreated } from '../../shared/utils/response';
import { ForbiddenError, UnauthorizedError } from '../../shared/errors';
import { env } from '../../config';
import { Role } from '../../shared/constants/roles';

/**
 * Auth controller.
 *
 * Thin adapter between HTTP and the service layer. Refresh tokens are
 * delivered as an httpOnly cookie (never in the JSON body) so the SPA
 * cannot expose them to XSS via localStorage. The short-lived access
 * token is still returned in the body for the Authorization header.
 */

const REFRESH_COOKIE = 'refreshToken';
const REFRESH_PATH = '/v1/auth';

function refreshCookieOptions(): CookieOptions {
  const isProd = env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    domain: env.COOKIE_DOMAIN,
    path: REFRESH_PATH,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  };
}

function setRefreshCookie(res: Response, token: string): void {
  res.cookie(REFRESH_COOKIE, token, refreshCookieOptions());
}

function clearRefreshCookie(res: Response): void {
  res.clearCookie(REFRESH_COOKIE, {
    domain: env.COOKIE_DOMAIN,
    path: REFRESH_PATH,
  });
}

/** Strip the refresh token out of a token pair before it goes in the body. */
function bodyTokens(tokens: { accessToken: string; refreshToken: string; expiresIn: string }) {
  const { refreshToken: _omit, ...rest } = tokens;
  return rest;
}

class AuthController {
  // POST /v1/auth/register
  async register(req: Request, res: Response): Promise<void> {
    const { firstName, lastName, phone, branchId, gender, invitedBy, department, departmentStatus } =
      req.body;
    const result = await authService.registerConvert({
      firstName,
      lastName,
      phone,
      branchId,
      gender,
      invitedBy,
      department,
      departmentStatus,
    });
    sendCreated(res, result);
  }

  // POST /v1/auth/verify-otp
  async verifyRegistrationOtp(req: Request, res: Response): Promise<void> {
    const { phone, code } = req.body;
    const deviceInfo = req.headers['user-agent'] || undefined;
    const result = await authService.verifyRegistrationOtp(phone, code, deviceInfo);
    setRefreshCookie(res, result.tokens.refreshToken);
    sendSuccess(res, 200, { user: result.user, tokens: bodyTokens(result.tokens) });
  }

  // POST /v1/auth/login
  async requestLoginOtp(req: Request, res: Response): Promise<void> {
    const { phone } = req.body;
    const result = await authService.requestLoginOtp(phone);
    sendSuccess(res, 200, result);
  }

  // POST /v1/auth/login/verify
  async verifyLoginOtp(req: Request, res: Response): Promise<void> {
    const { phone, code } = req.body;
    const deviceInfo = req.headers['user-agent'] || undefined;
    const result = await authService.verifyLoginOtp(phone, code, deviceInfo);
    setRefreshCookie(res, result.tokens.refreshToken);
    sendSuccess(res, 200, { user: result.user, tokens: bodyTokens(result.tokens) });
  }

  // POST /v1/auth/admin/login
  async adminLogin(req: Request, res: Response): Promise<void> {
    const { email, password } = req.body;
    const deviceInfo = req.headers['user-agent'] || undefined;
    const result = await authService.adminLogin(email, password, deviceInfo);
    setRefreshCookie(res, result.tokens.refreshToken);
    sendSuccess(res, 200, { user: result.user, tokens: bodyTokens(result.tokens) });
  }

  // POST /v1/auth/refresh
  async refresh(req: Request, res: Response): Promise<void> {
    const refreshToken = req.cookies?.[REFRESH_COOKIE] || req.body?.refreshToken;
    if (!refreshToken) {
      throw new UnauthorizedError('Refresh token missing');
    }
    const deviceInfo = req.headers['user-agent'] || undefined;
    const tokens = await authService.refreshTokens(refreshToken, deviceInfo);
    setRefreshCookie(res, tokens.refreshToken);
    sendSuccess(res, 200, { tokens: bodyTokens(tokens) });
  }

  // POST /v1/auth/logout
  async logout(req: Request, res: Response): Promise<void> {
    const refreshToken = req.cookies?.[REFRESH_COOKIE] || req.body?.refreshToken;
    if (refreshToken) {
      await authService.logout(refreshToken);
    }
    clearRefreshCookie(res);
    sendSuccess(res, 200, { message: 'Logged out successfully' });
  }

  // POST /v1/auth/logout-all
  async logoutAll(req: Request, res: Response): Promise<void> {
    const userId = req.user!.userId;
    await authService.logoutAll(userId);
    clearRefreshCookie(res);
    sendSuccess(res, 200, { message: 'Logged out from all devices' });
  }

  // POST /v1/auth/admin/change-password
  async changePassword(req: Request, res: Response): Promise<void> {
    const { currentPassword, newPassword } = req.body;
    await authService.changePassword(req.user!.userId, currentPassword, newPassword);
    clearRefreshCookie(res);
    sendSuccess(res, 200, {
      message: 'Password changed successfully. Please log in again.',
    });
  }

  // POST /v1/auth/admin/create
  // A plain admin may only create a peer admin in their own branch (branchId/role in
  // the body are ignored). A super_admin may target any branch, or omit branchId
  // entirely to mint another super_admin — only super_admin can do that.
  async createAdmin(req: Request, res: Response): Promise<void> {
    const { firstName, lastName, phone, email, password } = req.body;
    const caller = req.user!;

    let role: Role.ADMIN | Role.SUPER_ADMIN = Role.ADMIN;
    let branchId: string | null = caller.branchId;

    if (caller.role === Role.SUPER_ADMIN) {
      if (req.body.role === Role.SUPER_ADMIN) {
        role = Role.SUPER_ADMIN;
        branchId = null;
      } else {
        branchId = req.body.branchId ?? null;
      }
    } else if (req.body.role === Role.SUPER_ADMIN) {
      throw new ForbiddenError('Only a super admin can create another super admin.');
    }

    const admin = await authService.createAdmin({
      firstName,
      lastName,
      phone,
      email,
      password,
      branchId,
      role,
    });
    sendCreated(res, admin);
  }

  // GET /v1/auth/admin/list
  async listAdmins(req: Request, res: Response): Promise<void> {
    const admins = await authService.listAdmins(req.user!);
    sendSuccess(res, 200, { admins });
  }
}

export const authController = new AuthController();
