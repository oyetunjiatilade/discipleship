import { env } from './env';

/**
 * Centralized authentication configuration.
 * All auth-related magic numbers live here — never scattered in business logic.
 */
export const authConfig = {
  jwt: {
    accessSecret: env.JWT_ACCESS_SECRET,
    refreshSecret: env.JWT_REFRESH_SECRET,
    accessExpiry: env.JWT_ACCESS_EXPIRY,
    refreshExpiry: env.JWT_REFRESH_EXPIRY,
  },
  otp: {
    expiryMinutes: env.OTP_EXPIRY_MINUTES,
    length: 6,
    maxVerificationAttempts: 3,
    maxRequestsPerHour: 3,
  },
  password: {
    saltRounds: 12,
    minLength: 8,
  },
} as const;
