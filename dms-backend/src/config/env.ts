import dotenv from 'dotenv';
import { z } from 'zod';

// Load .env file before validating environment variables
dotenv.config();

/**
 * Environment variable schema.
 * Validates ALL required env vars at startup — fail fast, not at runtime.
 */
const envSchema = z.object({
  // Server
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  API_BASE_URL: z.string().url().default('http://localhost:4000'),

  // Database
  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),

  // JWT
  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 characters'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
  JWT_ACCESS_EXPIRY: z.string().default('15m'),
  JWT_REFRESH_EXPIRY: z.string().default('7d'),

  // OTP / SMS
  SMS_PROVIDER: z.enum(['termii', 'twilio', 'mock']).default('mock'),
  SMS_API_KEY: z.string().default(''),
  SMS_SENDER_ID: z.string().default('TeamBarnabas'),
  // 'generic'/'dnd' = SMS, 'whatsapp' = deliver OTP & nudges over WhatsApp (Termii WhatsApp product)
  SMS_CHANNEL: z.enum(['generic', 'dnd', 'whatsapp']).default('generic'),
  OTP_EXPIRY_MINUTES: z.coerce.number().int().positive().default(5),

  // Scheduler / re-engagement
  ENABLE_SCHEDULER: z
    .enum(['true', 'false'])
    .default('true')
    .transform((v) => v === 'true'),
  REENGAGEMENT_CRON: z.string().default('0 9 * * *'), // daily 09:00
  NUDGE_INACTIVE_DAYS: z.coerce.number().int().positive().default(3),
  NUDGE_COOLDOWN_DAYS: z.coerce.number().int().positive().default(3),

  // Cloudinary
  CLOUDINARY_CLOUD_NAME: z.string().default(''),
  CLOUDINARY_API_KEY: z.string().default(''),
  CLOUDINARY_API_SECRET: z.string().default(''),

  // CORS
  ALLOWED_ORIGINS: z.string().default('http://localhost:3000'),

  // Cookies (refresh token is delivered as an httpOnly cookie)
  COOKIE_DOMAIN: z.string().optional(),

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(900_000),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().positive().default(100),

  // Logging
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
});

export type EnvConfig = z.infer<typeof envSchema>;

/**
 * Parse and validate environment variables.
 * Throws a descriptive error at startup if any variable is invalid or missing.
 */
function validateEnv(): EnvConfig {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const formatted = result.error.issues
      .map((issue) => `  • ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');

    throw new Error(
      `\n❌ Invalid environment configuration:\n${formatted}\n\nFix your .env file and restart.\n`
    );
  }

  return result.data;
}

export const env = validateEnv();
