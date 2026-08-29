import jwt, { SignOptions } from 'jsonwebtoken';
import crypto from 'crypto';
import { authConfig } from '../../config';
import { AuthPayload, UserRole } from '../../shared/types/express.d';
import { RefreshToken } from './refresh-token.model';
import { UnauthorizedError } from '../../shared/errors';

/**
 * Token pair returned after successful authentication.
 */
export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
}

class TokenService {
  // ──────────────────────────────────────────
  // Access Token
  // ──────────────────────────────────────────

  /**
   * Issue a new access token containing the user's identity, role, and branch.
   */
  generateAccessToken(userId: string, role: UserRole, branchId: string | null): string {
    const payload: AuthPayload = { userId, role, branchId };
    const options: SignOptions = {
      expiresIn: authConfig.jwt.accessExpiry as jwt.SignOptions['expiresIn'],
      issuer: 'dms-api',
      subject: userId,
    };

    return jwt.sign(payload, authConfig.jwt.accessSecret, options);
  }

  /**
   * Verify and decode an access token.
   * Throws UnauthorizedError on invalid/expired tokens.
   */
  verifyAccessToken(token: string): AuthPayload {
    try {
      return jwt.verify(token, authConfig.jwt.accessSecret, {
        issuer: 'dms-api',
      }) as AuthPayload;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new UnauthorizedError('Access token has expired');
      }
      throw new UnauthorizedError('Invalid access token');
    }
  }

  // ──────────────────────────────────────────
  // Refresh Token
  // ──────────────────────────────────────────

  /**
   * Generate a cryptographically random refresh token,
   * store its hash in the database, and return the raw token to the client.
   */
  async generateRefreshToken(userId: string, deviceInfo?: string): Promise<string> {
    // Generate a random token string
    const rawToken = crypto.randomBytes(40).toString('hex');
    const tokenHash = this.hashToken(rawToken);

    // Calculate expiry from config string (e.g., "7d" → 7 days from now)
    const expiresAt = this.calculateExpiry(authConfig.jwt.refreshExpiry);

    await RefreshToken.create({
      userId,
      tokenHash,
      deviceInfo: deviceInfo || null,
      expiresAt,
    });

    return rawToken;
  }

  /**
   * Validate a refresh token and return the associated userId.
   * Implements single-use rotation: the consumed token is revoked.
   */
  async verifyRefreshToken(rawToken: string): Promise<{ userId: string }> {
    const tokenHash = this.hashToken(rawToken);

    const record = await RefreshToken.findOne({
      tokenHash,
      isRevoked: false,
    });

    if (!record) {
      throw new UnauthorizedError('Invalid or expired refresh token');
    }

    if (record.expiresAt < new Date()) {
      // Clean up expired record
      await RefreshToken.deleteOne({ _id: record._id });
      throw new UnauthorizedError('Refresh token has expired');
    }

    // Revoke the consumed token (single-use rotation)
    record.isRevoked = true;
    await record.save();

    return { userId: record.userId.toString() };
  }

  /**
   * Revoke a specific refresh token (logout from one device).
   */
  async revokeRefreshToken(rawToken: string): Promise<void> {
    const tokenHash = this.hashToken(rawToken);
    await RefreshToken.updateOne({ tokenHash }, { isRevoked: true });
  }

  /**
   * Revoke ALL refresh tokens for a user (logout from all devices).
   */
  async revokeAllUserTokens(userId: string): Promise<void> {
    await RefreshToken.updateMany(
      { userId, isRevoked: false },
      { isRevoked: true }
    );
  }

  // ──────────────────────────────────────────
  // Token Pair (convenience)
  // ──────────────────────────────────────────

  /**
   * Issue a complete token pair (access + refresh).
   * Called after successful login or token refresh.
   */
  async issueTokenPair(
    userId: string,
    role: UserRole,
    branchId: string | null,
    deviceInfo?: string
  ): Promise<TokenPair> {
    const accessToken = this.generateAccessToken(userId, role, branchId);
    const refreshToken = await this.generateRefreshToken(userId, deviceInfo);

    return {
      accessToken,
      refreshToken,
      expiresIn: authConfig.jwt.accessExpiry,
    };
  }

  // ──────────────────────────────────────────
  // Private helpers
  // ──────────────────────────────────────────

  /**
   * Hash a token using SHA-256 for storage.
   * We never store raw refresh tokens — only their hashes.
   */
  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Parse a duration string (e.g., "7d", "24h", "30m") into a future Date.
   */
  private calculateExpiry(duration: string): Date {
    const match = duration.match(/^(\d+)([dhms])$/);
    if (!match) {
      // Default to 7 days if format is unrecognized
      return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    }

    const value = parseInt(match[1], 10);
    const unit = match[2];

    const multipliers: Record<string, number> = {
      d: 24 * 60 * 60 * 1000,
      h: 60 * 60 * 1000,
      m: 60 * 1000,
      s: 1000,
    };

    return new Date(Date.now() + value * multipliers[unit]);
  }
}

export const tokenService = new TokenService();
