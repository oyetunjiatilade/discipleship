import { authConfig, connectDatabase, disconnectDatabase, registerConnectionEvents } from '../src/config';
import { Otp, OtpPurpose, hashOtpCode } from '../src/modules/auth/otp.model';
import { normalizePhone } from '../src/shared/utils/phoneNormalizer';

/**
 * QA helper: issue a known OTP for a phone number, bypassing the SMS provider.
 *
 * Use this when the SMS/WhatsApp channel is down or unverified (e.g. a pending
 * Termii sender ID) and you need to complete a registration/login flow for
 * testing. It mirrors exactly what `otpService.sendOtp` stores — same hash,
 * same TTL, same purpose — so the normal verify endpoint accepts it.
 *
 * Usage:
 *   npm run qa-issue-otp -- <phone> <registration|login> [code]
 *
 * If [code] is omitted, a fixed "000000" is used for convenience.
 */
async function issueOtp(): Promise<void> {
  const rawPhone = process.argv[2];
  const purpose = process.argv[3] as OtpPurpose;
  const code = process.argv[4] || '000000';

  if (!rawPhone || !['registration', 'login'].includes(purpose)) {
    console.error('Usage: npm run qa-issue-otp -- <phone> <registration|login> [code]');
    process.exit(1);
  }
  if (!/^\d{6}$/.test(code)) {
    console.error('❌ Code must be exactly 6 digits.');
    process.exit(1);
  }

  const phone = normalizePhone(rawPhone);

  registerConnectionEvents();
  await connectDatabase();

  try {
    await Otp.deleteMany({ phone, purpose });

    const codeHash = await hashOtpCode(code);
    const expiresAt = new Date(Date.now() + authConfig.otp.expiryMinutes * 60 * 1000);

    await Otp.create({ phone, codeHash, purpose, attempts: 0, expiresAt });

    console.log(`✅ OTP issued for ${phone} (${purpose}):`);
    console.log(`   Code:    ${code}`);
    console.log(`   Expires: ${expiresAt.toISOString()} (${authConfig.otp.expiryMinutes} min)`);
  } finally {
    await disconnectDatabase();
    process.exit(0);
  }
}

issueOtp().catch((error) => {
  console.error('💀 Failed:', error);
  process.exit(1);
});
