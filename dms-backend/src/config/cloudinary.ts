import { env } from './env';

/**
 * Cloudinary configuration.
 * Used when generating signed URLs or managing uploads via the Cloudinary SDK.
 */
export const cloudinaryConfig = {
  cloudName: env.CLOUDINARY_CLOUD_NAME,
  apiKey: env.CLOUDINARY_API_KEY,
  apiSecret: env.CLOUDINARY_API_SECRET,
} as const;
