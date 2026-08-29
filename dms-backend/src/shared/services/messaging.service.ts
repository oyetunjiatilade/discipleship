import { env } from '../../config';

/**
 * Generic outbound messaging service (SMS / WhatsApp via Termii).
 *
 * Separate from the OTP dispatcher so non-OTP messages (re-engagement
 * nudges, mentor pings) can reach converts on the channel they actually
 * use. Best-effort: never throws — messaging failures must not break jobs.
 */
/** Minimal shape of a fetch() Response (avoids global Response type conflicts). */
type HttpResponse = { ok: boolean; status: number; text(): Promise<string> };

class MessagingService {
  /**
   * Send a plain text message to a phone number.
   * Returns true if it was dispatched (or mocked), false on failure.
   */
  async sendMessage(phone: string, text: string): Promise<boolean> {
    const provider = env.SMS_PROVIDER;

    if (provider === 'mock') {
      console.log(`📣 [MOCK ${env.SMS_CHANNEL}] to ${phone}: ${text}`);
      return true;
    }

    if (provider === 'termii') {
      return this.sendViaTermii(phone, text);
    }

    console.warn(`⚠️  Unknown SMS provider: ${provider}. Message not sent.`);
    return false;
  }

  private async sendViaTermii(phone: string, text: string): Promise<boolean> {
    if (!env.SMS_API_KEY) {
      console.error('[Messaging] SMS_API_KEY not configured.');
      return false;
    }
    try {
      const res = (await fetch('https://api.ng.termii.com/api/sms/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: phone,
          from: env.SMS_SENDER_ID,
          sms: text,
          type: 'plain',
          channel: env.SMS_CHANNEL,
          api_key: env.SMS_API_KEY,
        }),
      })) as unknown as HttpResponse;
      if (!res.ok) {
        console.error('[Messaging] Termii error:', await res.text());
        return false;
      }
      return true;
    } catch (err) {
      console.error('[Messaging] dispatch failed:', err);
      return false;
    }
  }
}

export const messagingService = new MessagingService();
