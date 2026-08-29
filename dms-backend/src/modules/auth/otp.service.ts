import crypto from 'crypto';
import { authConfig, env } from '../../config';
import { AppError } from '../../shared/errors';
import { Otp, OtpPurpose, hashOtpCode, verifyOtpCode } from './otp.model';

/** Minimal shape of a fetch() Response (avoids global Response type conflicts). */
type HttpResponse = { ok: boolean; status: number; text(): Promise<string> };

class OtpService {
  /**
   * Generate and send an OTP to the given phone number.
   *
   * Steps:
   * 1. Check rate limit (max N OTPs per phone per hour)
   * 2. Invalidate any existing OTPs for this phone+purpose
   * 3. Generate a 6-digit code
   * 4. Store hashed code with TTL
   * 5. Dispatch via SMS provider
   *
   * Returns the OTP code ONLY in development/test for convenience.
   * In production, returns null — the code is sent via SMS only.
   */
  async sendOtp(
    phone: string,
    purpose: OtpPurpose
  ): Promise<{ message: string; otp?: string }> {
    // ── Rate limit check ──
    await this.enforceRateLimit(phone);

    // ── Invalidate previous OTPs for this phone+purpose ──
    await Otp.deleteMany({ phone, purpose });

    // ── Generate code ──
    const code = this.generateCode();
    const codeHash = await hashOtpCode(code);

    // ── Store with TTL ──
    const expiresAt = new Date(
      Date.now() + authConfig.otp.expiryMinutes * 60 * 1000
    );

    await Otp.create({
      phone,
      codeHash,
      purpose,
      attempts: 0,
      expiresAt,
    });

    // ── Send SMS ──
    await this.dispatchSms(phone, code);

    // In dev/test, return the OTP for easy testing
    const result: { message: string; otp?: string } = {
      message: `OTP sent to ${this.maskPhone(phone)}`,
    };

    if (env.NODE_ENV !== 'production') {
      result.otp = code;
    }

    return result;
  }

  /**
   * Verify an OTP code against the stored hash.
   *
   * Steps:
   * 1. Find the OTP record
   * 2. Check attempt count
   * 3. Compare the code
   * 4. Delete the OTP record on success (single-use)
   */
  async verifyOtp(phone: string, code: string, purpose: OtpPurpose): Promise<boolean> {
    const otpRecord = await Otp.findOne({ phone, purpose });

    if (!otpRecord) {
      throw new AppError(
        'No OTP found for this phone number. Please request a new one.',
        400,
        'OTP_NOT_FOUND'
      );
    }

    // ── Check expiry (belt-and-suspenders — TTL index handles cleanup) ──
    if (otpRecord.expiresAt < new Date()) {
      await Otp.deleteOne({ _id: otpRecord._id });
      throw new AppError('OTP has expired. Please request a new one.', 400, 'OTP_EXPIRED');
    }

    // ── Check attempt limit ──
    if (otpRecord.attempts >= authConfig.otp.maxVerificationAttempts) {
      await Otp.deleteOne({ _id: otpRecord._id });
      throw new AppError(
        'Maximum verification attempts exceeded. Please request a new OTP.',
        429,
        'OTP_MAX_ATTEMPTS'
      );
    }

    // ── Increment attempts ──
    otpRecord.attempts += 1;
    await otpRecord.save();

    // ── Verify code ──
    const isValid = await verifyOtpCode(code, otpRecord.codeHash);

    if (!isValid) {
      const remaining = authConfig.otp.maxVerificationAttempts - otpRecord.attempts;
      throw new AppError(
        `Invalid OTP. ${remaining} attempt(s) remaining.`,
        400,
        'OTP_INVALID'
      );
    }

    // ── Success: delete the consumed OTP ──
    await Otp.deleteOne({ _id: otpRecord._id });

    return true;
  }

  // ──────────────────────────────────────────
  // Private helpers
  // ──────────────────────────────────────────

  /**
   * Enforce per-phone rate limiting on OTP requests.
   * Maximum N OTPs per phone per hour (configurable).
   */
  private async enforceRateLimit(phone: string): Promise<void> {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    const recentCount = await Otp.countDocuments({
      phone,
      createdAt: { $gte: oneHourAgo },
    });

    if (recentCount >= authConfig.otp.maxRequestsPerHour) {
      throw new AppError(
        'Too many OTP requests. Please try again in an hour.',
        429,
        'OTP_RATE_LIMIT'
      );
    }
  }

  /**
   * Generate a cryptographically random 6-digit OTP code.
   */
  private generateCode(): string {
    const length = authConfig.otp.length;
    // Generate a number between 0 and 999999, then pad with leading zeros
    const max = Math.pow(10, length);
    const randomNum = crypto.randomInt(0, max);
    return randomNum.toString().padStart(length, '0');
  }

  /**
   * Dispatch the OTP via the configured SMS provider.
   *
   * In production, this calls the real SMS API.
   * In development/test, it logs to console (mock mode).
   */
  private async dispatchSms(phone: string, code: string): Promise<void> {
    const provider = env.SMS_PROVIDER;

    if (provider === 'mock') {
      console.log(`📱 [MOCK SMS] OTP for ${phone}: ${code}`);
      return;
    }

    if (provider === 'termii') {
      await this.sendViaTermii(phone, code);
      return;
    }

    // Add more providers here as needed
    console.warn(`⚠️  Unknown SMS provider: ${provider}. OTP not sent.`);
  }

  /**
   * Send SMS via Termii API.
   * Reference: https://developer.termii.com/docs/messaging
   */
  private async sendViaTermii(phone: string, code: string): Promise<void> {
    const apiKey = env.SMS_API_KEY;
    const senderId = env.SMS_SENDER_ID;

    if (!apiKey) {
      throw new AppError('SMS service not configured', 500, 'SMS_CONFIG_ERROR', false);
    }

    try {
      const response = (await fetch('https://api.ng.termii.com/api/sms/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: phone,
          from: senderId,
          sms: `Your Team Barnabas verification code is: ${code}. Valid for ${authConfig.otp.expiryMinutes} minutes.`,
          type: 'plain',
          channel: env.SMS_CHANNEL,
          api_key: apiKey,
        }),
      })) as unknown as HttpResponse;

      if (!response.ok) {
        const errorBody = await response.text();
        console.error('Termii SMS error:', errorBody);
        throw new Error(`Termii API returned ${response.status}`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown SMS error';
      console.error('SMS dispatch failed:', message);
      // Don't throw to the user — OTP is still stored and valid.
      // Log for monitoring, but let the flow continue.
      // In a production system, this would trigger an alert.
    }
  }

  /**
   * Mask phone number for display (e.g., +234801****5678).
   */
  private maskPhone(phone: string): string {
    if (phone.length <= 7) return phone;
    const prefix = phone.slice(0, phone.length - 7);
    const suffix = phone.slice(-4);
    return `${prefix}****${suffix}`;
  }
}

export const otpService = new OtpService();
