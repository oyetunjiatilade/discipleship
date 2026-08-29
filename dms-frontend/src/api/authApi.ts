import apiClient from './client';
import type { ApiSuccessResponse } from '@/types/api';
import type {
  AuthResponse,
  RegisterConvertPayload,
  VerifyOtpPayload,
  AdminLoginPayload,
  UserPublicProfile,
} from '@/types/auth';

export interface CreateAdminPayload {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  password: string;
  /** Only meaningful when the caller is super_admin. */
  branchId?: string;
  role?: 'admin' | 'super_admin';
}

/**
 * Auth API — public + authenticated auth endpoints.
 *
 * Routes:
 *   POST /v1/auth/register         → { message, otp? }
 *   POST /v1/auth/verify-otp       → AuthResponse
 *   POST /v1/auth/login             → { message, otp? }
 *   POST /v1/auth/login/verify      → AuthResponse
 *   POST /v1/auth/admin/login       → AuthResponse
 *   POST /v1/auth/refresh           → { tokens: TokenPair }
 *   POST /v1/auth/logout            → { message }
 *   POST /v1/auth/logout-all        → { message }
 */
export const authApi = {
  // ── Convert Registration ──

  /** POST /v1/auth/register — step 1: create user + send OTP */
  register: async (
    payload: RegisterConvertPayload
  ): Promise<{ message: string; otp?: string }> => {
    const { data } = await apiClient.post<
      ApiSuccessResponse<{ message: string; otp?: string }>
    >('/v1/auth/register', payload);
    return data.data;
  },

  /** POST /v1/auth/verify-otp — step 2: verify registration OTP → tokens */
  verifyRegistrationOtp: async (payload: VerifyOtpPayload): Promise<AuthResponse> => {
    const { data } = await apiClient.post<ApiSuccessResponse<AuthResponse>>(
      '/v1/auth/verify-otp',
      payload
    );
    return data.data;
  },

  // ── Convert Login ──

  /** POST /v1/auth/login — request login OTP */
  requestLoginOtp: async (phone: string): Promise<{ message: string; otp?: string }> => {
    const { data } = await apiClient.post<
      ApiSuccessResponse<{ message: string; otp?: string }>
    >('/v1/auth/login', { phone });
    return data.data;
  },

  /** POST /v1/auth/login/verify — verify login OTP → tokens */
  verifyLoginOtp: async (payload: VerifyOtpPayload): Promise<AuthResponse> => {
    const { data } = await apiClient.post<ApiSuccessResponse<AuthResponse>>(
      '/v1/auth/login/verify',
      payload
    );
    return data.data;
  },

  // ── Admin Login ──

  /** POST /v1/auth/admin/login */
  adminLogin: async (payload: AdminLoginPayload): Promise<AuthResponse> => {
    const { data } = await apiClient.post<ApiSuccessResponse<AuthResponse>>(
      '/v1/auth/admin/login',
      payload
    );
    return data.data;
  },

  // ── Logout ──

  /** POST /v1/auth/logout — revoke refresh token (read from httpOnly cookie) */
  logout: async (): Promise<void> => {
    await apiClient.post('/v1/auth/logout');
  },

  /** POST /v1/auth/logout-all — revoke all tokens */
  logoutAll: async (): Promise<void> => {
    await apiClient.post('/v1/auth/logout-all');
  },

  /** POST /v1/auth/admin/change-password — change own password (admin/mentor) */
  changePassword: async (
    currentPassword: string,
    newPassword: string
  ): Promise<{ message: string }> => {
    const { data } = await apiClient.post<ApiSuccessResponse<{ message: string }>>(
      '/v1/auth/admin/change-password',
      { currentPassword, newPassword }
    );
    return data.data;
  },

  // ── Admin Management (super_admin creates branch admins) ──

  /** POST /v1/auth/admin/create */
  createAdmin: async (payload: CreateAdminPayload): Promise<UserPublicProfile> => {
    const { data } = await apiClient.post<ApiSuccessResponse<UserPublicProfile>>(
      '/v1/auth/admin/create',
      payload
    );
    return data.data;
  },

  /** GET /v1/auth/admin/list */
  listAdmins: async (): Promise<UserPublicProfile[]> => {
    const { data } = await apiClient.get<ApiSuccessResponse<{ admins: UserPublicProfile[] }>>(
      '/v1/auth/admin/list'
    );
    return data.data.admins;
  },
};
