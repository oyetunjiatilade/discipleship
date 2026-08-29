import mongoose, { Schema, Document, Types } from 'mongoose';
import bcrypt from 'bcryptjs';

/**
 * OTP purpose discriminator.
 */
export type OtpPurpose = 'registration' | 'login';

/**
 * OTP document interface.
 */
export interface IOtp extends Document {
  _id: Types.ObjectId;
  phone: string;
  codeHash: string;
  purpose: OtpPurpose;
  attempts: number;
  expiresAt: Date;
  createdAt: Date;
}

const otpSchema = new Schema<IOtp>(
  {
    phone: {
      type: String,
      required: true,
      index: true,
    },
    codeHash: {
      type: String,
      required: true,
    },
    purpose: {
      type: String,
      enum: ['registration', 'login'],
      required: true,
    },
    attempts: {
      type: Number,
      default: 0,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// TTL index — MongoDB automatically deletes documents after expiry
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Compound index for lookups
otpSchema.index({ phone: 1, purpose: 1 });

/**
 * Hash the OTP code before saving.
 * We use a low salt round (6) since OTPs are short-lived and 6-digit.
 */
export async function hashOtpCode(code: string): Promise<string> {
  return bcrypt.hash(code, 6);
}

/**
 * Compare a candidate code against the stored hash.
 */
export async function verifyOtpCode(candidate: string, hash: string): Promise<boolean> {
  return bcrypt.compare(candidate, hash);
}

export const Otp = mongoose.model<IOtp>('Otp', otpSchema);
