// ──────────────────────────────────────────────
// Auth types — exact match of backend interfaces
//
// TokenPair:      src/modules/auth/token.service.ts
// AuthResponse:   src/modules/auth/auth.service.ts
// UserPublicProfile: src/modules/user/user.types.ts
// ──────────────────────────────────────────────

import type { DiscipleshipStage, Role } from '@/constants/enums';

export interface TokenPair {
  accessToken: string;
  // Refresh token now lives in an httpOnly cookie — no longer sent in the body.
  refreshToken?: string;
  expiresIn: string; // backend returns string (e.g. "900")
}

export interface UserPublicProfile {
  id: string;
  role: Role;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  profileImageUrl?: string;
  currentStage?: DiscipleshipStage;
  stageUpdatedAt?: string;
  isHolySpiritFilled?: boolean;
  isActive: boolean;
  mustChangePassword?: boolean;
  branchId?: string | null;
  mentorId?: string | null;
  department?: string | null;
  departmentStatus?: 'member' | 'interested' | null;
  cohortId?: string | null;
  lowDataMode?: boolean;
  createdAt: string;
}

export interface AuthResponse {
  user: UserPublicProfile;
  tokens: TokenPair;
}

// ── Request shapes ──

export interface RegisterConvertPayload {
  firstName: string;
  lastName: string;
  phone: string;
  branchId: string;
  gender?: 'male' | 'female';
  invitedBy?: string;
  department?: string;
  departmentStatus?: 'member' | 'interested';
}

export interface VerifyOtpPayload {
  phone: string;
  code: string;
}

export interface AdminLoginPayload {
  email: string;
  password: string;
}

export interface RefreshTokenPayload {
  refreshToken: string;
}
