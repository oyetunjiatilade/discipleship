/**
 * Normalize a phone number to E.164-ish format for consistent storage.
 *
 * Rules:
 * - Strip all non-digit characters except leading +
 * - If starts with 0 and is 11 digits, assume Nigerian → prefix with +234
 * - If starts with 234, prefix with +
 * - Otherwise, store as-is with + prefix
 *
 * For production at scale, consider using libphonenumber-js.
 */
export function normalizePhone(raw: string): string {
  // Strip everything except digits and leading +
  let cleaned = raw.replace(/[^\d+]/g, '');

  // Nigerian local format: 08012345678 → +2348012345678
  if (cleaned.startsWith('0') && cleaned.length === 11) {
    cleaned = '+234' + cleaned.slice(1);
  }

  // Already has country code without +
  if (cleaned.startsWith('234') && !cleaned.startsWith('+')) {
    cleaned = '+' + cleaned;
  }

  // Ensure + prefix
  if (!cleaned.startsWith('+')) {
    cleaned = '+' + cleaned;
  }

  return cleaned;
}

/**
 * Basic phone validation — ensures minimum viable phone number.
 * Returns true if the number has 10-15 digits (ITU-T E.164 range).
 */
export function isValidPhone(phone: string): boolean {
  const digits = phone.replace(/\D/g, '');
  return digits.length >= 10 && digits.length <= 15;
}
