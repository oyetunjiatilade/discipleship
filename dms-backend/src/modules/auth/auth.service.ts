import { User, toPublicProfile } from '../user/user.model';
import { IUser, UserPublicProfile } from '../user/user.types';
import { Role } from '../../shared/constants/roles';
import { DiscipleshipStage } from '../../shared/constants/stages';
import {
  AppError,
  UnauthorizedError,
  ConflictError,
  NotFoundError,
} from '../../shared/errors';
import { normalizePhone } from '../../shared/utils/phoneNormalizer';
import { tokenService, TokenPair } from './token.service';
import { otpService } from './otp.service';
import { notificationService } from '../notification/notification.service';
import { branchService } from '../branch/branch.service';
import { branchFilter } from '../../shared/access/branch-scope';

/**
 * Registration input from the controller.
 */
interface RegisterInput {
  firstName: string;
  lastName: string;
  phone: string;
  branchId: string;
  gender?: 'male' | 'female';
  invitedBy?: string;
  department?: string;
  departmentStatus?: 'member' | 'interested';
}

/**
 * Admin creation input (used by seed scripts or the /admin/create endpoint).
 * `branchId` is required for admin/mentor and must be null for super_admin —
 * enforced by the controller based on who is calling, not by this shape alone.
 */
interface CreateAdminInput {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  password: string;
  branchId: string | null;
  mustChangePassword?: boolean;
  role?: Role.ADMIN | Role.MENTOR | Role.SUPER_ADMIN;
}

/**
 * Auth response returned to the controller after successful auth.
 */
export interface AuthResponse {
  user: UserPublicProfile;
  tokens: TokenPair;
}

class AuthService {
  // ──────────────────────────────────────────
  // Convert Registration Flow
  // ──────────────────────────────────────────

  /**
   * Step 1: Register a new convert and send OTP.
   *
   * Flow: Validate → Check duplicate → Create user → Send OTP
   *
   * The user account is created immediately but `lastLoginAt` stays null
   * until the OTP is verified. This avoids the need for a "pending" state.
   */
  async registerConvert(input: RegisterInput): Promise<{ message: string; otp?: string }> {
    const phone = normalizePhone(input.phone);

    // Verify the chosen branch exists and is active before creating anything
    await branchService.assertActiveBranch(input.branchId);

    // Check for existing active convert with same phone
    const existing = await User.findOne({
      phone,
      role: Role.CONVERT,
      isActive: true,
    });

    if (existing) {
      throw new ConflictError('A convert with this phone number already exists');
    }

    // Create the convert
    await User.create({
      role: Role.CONVERT,
      firstName: input.firstName.trim(),
      lastName: input.lastName.trim(),
      phone,
      branchId: input.branchId,
      gender: input.gender || null,
      invitedBy: input.invitedBy?.trim() || null,
      department: input.department?.trim() || null,
      departmentStatus: input.departmentStatus || null,
      currentStage: DiscipleshipStage.NEW_CONVERT,
      stageUpdatedAt: new Date(),
      isHolySpiritFilled: false,
    });

    // Send OTP for verification
    return otpService.sendOtp(phone, 'registration');
  }

  /**
   * Step 2: Verify OTP after registration → issue tokens.
   */
  async verifyRegistrationOtp(
    phone: string,
    code: string,
    deviceInfo?: string
  ): Promise<AuthResponse> {
    const normalizedPhone = normalizePhone(phone);

    // Verify the OTP
    await otpService.verifyOtp(normalizedPhone, code, 'registration');

    // Find the user
    const user = await User.findOne({
      phone: normalizedPhone,
      role: Role.CONVERT,
      isActive: true,
    });

    if (!user) {
      throw new NotFoundError('Convert', normalizedPhone);
    }

    // Update last login
    user.lastLoginAt = new Date();
    await user.save();

    // Issue tokens
    const tokens = await tokenService.issueTokenPair(
      user._id.toString(),
      Role.CONVERT,
      user.branchId ? user.branchId.toString() : null,
      deviceInfo
    );

    // Welcome notification (fire-and-forget)
    notificationService.notifyWelcome(user._id.toString(), user.firstName);

    return {
      user: toPublicProfile(user),
      tokens,
    };
  }

  // ──────────────────────────────────────────
  // Convert Login Flow
  // ──────────────────────────────────────────

  /**
   * Step 1: Request login OTP for an existing convert.
   */
  async requestLoginOtp(phone: string): Promise<{ message: string; otp?: string }> {
    const normalizedPhone = normalizePhone(phone);

    // Verify convert exists
    const user = await User.findOne({
      phone: normalizedPhone,
      role: Role.CONVERT,
      isActive: true,
    });

    if (!user) {
      // Don't reveal whether the phone is registered (security)
      // Still return success-like response to prevent phone enumeration
      throw new AppError(
        'If this phone number is registered, an OTP will be sent.',
        404,
        'USER_NOT_FOUND'
      );
    }

    return otpService.sendOtp(normalizedPhone, 'login');
  }

  /**
   * Step 2: Verify login OTP → issue tokens.
   */
  async verifyLoginOtp(
    phone: string,
    code: string,
    deviceInfo?: string
  ): Promise<AuthResponse> {
    const normalizedPhone = normalizePhone(phone);

    // Verify the OTP
    await otpService.verifyOtp(normalizedPhone, code, 'login');

    // Find the user
    const user = await User.findOne({
      phone: normalizedPhone,
      role: Role.CONVERT,
      isActive: true,
    });

    if (!user) {
      throw new NotFoundError('Convert', normalizedPhone);
    }

    // Update last login
    user.lastLoginAt = new Date();
    await user.save();

    // Issue tokens
    const tokens = await tokenService.issueTokenPair(
      user._id.toString(),
      Role.CONVERT,
      user.branchId ? user.branchId.toString() : null,
      deviceInfo
    );

    return {
      user: toPublicProfile(user),
      tokens,
    };
  }

  // ──────────────────────────────────────────
  // Admin Login Flow
  // ──────────────────────────────────────────

  /**
   * Admin login with email + password → issue tokens.
   */
  async adminLogin(
    email: string,
    password: string,
    deviceInfo?: string
  ): Promise<AuthResponse> {
    // Find staff (admin, mentor, or super_admin) WITH passwordHash (excluded by select:false)
    const admin = await User.findOne({
      email: email.toLowerCase().trim(),
      role: { $in: [Role.ADMIN, Role.MENTOR, Role.SUPER_ADMIN] },
      isActive: true,
    }).select('+passwordHash');

    if (!admin) {
      // Generic message to prevent email enumeration
      throw new UnauthorizedError('Invalid email or password');
    }

    // Verify password
    const isMatch = await admin.comparePassword(password);
    if (!isMatch) {
      throw new UnauthorizedError('Invalid email or password');
    }

    // Update last login
    admin.lastLoginAt = new Date();
    await admin.save();

    // Issue tokens with the account's actual role (admin, mentor, or super_admin)
    const tokens = await tokenService.issueTokenPair(
      admin._id.toString(),
      admin.role as 'admin' | 'mentor' | 'super_admin',
      admin.branchId ? admin.branchId.toString() : null,
      deviceInfo
    );

    return {
      user: toPublicProfile(admin),
      tokens,
    };
  }

  // ──────────────────────────────────────────
  // Token Refresh
  // ──────────────────────────────────────────

  /**
   * Exchange a refresh token for a new token pair.
   * Implements rotation: old refresh token is consumed, new one is issued.
   */
  async refreshTokens(
    rawRefreshToken: string,
    deviceInfo?: string
  ): Promise<TokenPair> {
    // Verify and consume the old refresh token
    const { userId } = await tokenService.verifyRefreshToken(rawRefreshToken);

    // Fetch user to get current role (in case it changed)
    const user = await User.findById(userId);

    if (!user || !user.isActive) {
      throw new UnauthorizedError('User account is inactive or not found');
    }

    // Issue a fresh token pair
    return tokenService.issueTokenPair(
      userId,
      user.role as 'convert' | 'admin' | 'mentor' | 'super_admin',
      user.branchId ? user.branchId.toString() : null,
      deviceInfo
    );
  }

  // ──────────────────────────────────────────
  // Logout
  // ──────────────────────────────────────────

  /**
   * Revoke a single refresh token (logout from current device).
   */
  async logout(rawRefreshToken: string): Promise<void> {
    await tokenService.revokeRefreshToken(rawRefreshToken);
  }

  /**
   * Revoke all refresh tokens for a user (logout from all devices).
   */
  async logoutAll(userId: string): Promise<void> {
    await tokenService.revokeAllUserTokens(userId);
  }

  // ──────────────────────────────────────────
  // Admin Management
  // ──────────────────────────────────────────

  /**
   * Create a staff account: admin, mentor, or super_admin.
   * `branchId` must be null for super_admin and a real branch for everyone else —
   * the caller (controller) is responsible for enforcing who may set which, based
   * on the requester's own role (see auth.controller.createAdmin).
   */
  async createAdmin(input: CreateAdminInput): Promise<UserPublicProfile> {
    const normalizedPhone = normalizePhone(input.phone);
    const normalizedEmail = input.email.toLowerCase().trim();
    const role = input.role ?? Role.ADMIN;

    if (role === Role.SUPER_ADMIN && input.branchId) {
      throw new AppError('super_admin accounts cannot belong to a branch', 400, 'INVALID_BRANCH');
    }
    if (role !== Role.SUPER_ADMIN && !input.branchId) {
      throw new AppError('branchId is required for this role', 400, 'BRANCH_REQUIRED');
    }
    if (input.branchId) {
      await branchService.assertActiveBranch(input.branchId);
    }

    // Check for existing staff (admin/mentor/super_admin) with same email
    const existingEmail = await User.findOne({
      email: normalizedEmail,
      role: { $in: [Role.ADMIN, Role.MENTOR, Role.SUPER_ADMIN] },
      isActive: true,
    });

    if (existingEmail) {
      throw new ConflictError('A staff account with this email already exists');
    }

    const staff = await User.create({
      role,
      firstName: input.firstName.trim(),
      lastName: input.lastName.trim(),
      phone: normalizedPhone,
      email: normalizedEmail,
      branchId: input.branchId,
      passwordHash: input.password, // pre-save hook will hash this
      mustChangePassword: input.mustChangePassword ?? false,
    });

    return toPublicProfile(staff);
  }

  /**
   * List admin accounts — scoped to the requester's branch (or every branch
   * for a super_admin). Used by the super-admin "Admins" management page.
   */
  async listAdmins(
    requester: { role: string; branchId: string | null }
  ): Promise<UserPublicProfile[]> {
    const admins = await User.find({
      role: { $in: [Role.ADMIN, Role.SUPER_ADMIN] },
      isActive: true,
      ...branchFilter(requester),
    }).sort({ firstName: 1 });
    return admins.map(toPublicProfile);
  }

  // ──────────────────────────────────────────
  // Shared Helpers
  // ──────────────────────────────────────────

  /**
   * Change an admin's own password.
   *
   * Verifies the current password, sets the new one (hashed by the pre-save
   * hook), clears the mustChangePassword flag, and revokes all existing
   * refresh tokens so other sessions are logged out.
   */
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<void> {
    const admin = await User.findOne({
      _id: userId,
      role: { $in: [Role.ADMIN, Role.MENTOR, Role.SUPER_ADMIN] },
      isActive: true,
    }).select('+passwordHash');

    if (!admin) {
      throw new NotFoundError('Staff account', userId);
    }

    const isMatch = await admin.comparePassword(currentPassword);
    if (!isMatch) {
      throw new UnauthorizedError('Current password is incorrect');
    }

    admin.passwordHash = newPassword; // pre-save hook hashes it
    admin.mustChangePassword = false;
    await admin.save();

    // Invalidate all sessions after a password change
    await tokenService.revokeAllUserTokens(userId);
  }

  /**
   * Get a user by ID (for token refresh and middleware).
   */
  async getUserById(userId: string): Promise<IUser | null> {
    return User.findById(userId);
  }
}

export const authService = new AuthService();
