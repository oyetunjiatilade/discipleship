import rateLimit from 'express-rate-limit';
import { env } from '../config';
import { sendError } from '../shared/utils/response';

/**
 * General API rate limiter.
 * Applied globally to all routes.
 */
export const generalLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX_REQUESTS,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    sendError(res, 429, 'RATE_LIMIT_EXCEEDED', 'Too many requests. Please try again later.');
  },
});

/**
 * Strict rate limiter for auth endpoints (OTP requests, login attempts).
 * Much tighter: 10 requests per 15-minute window.
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    sendError(res, 429, 'AUTH_RATE_LIMIT', 'Too many authentication attempts. Please wait 15 minutes.');
  },
});
