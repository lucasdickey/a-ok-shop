/**
 * Webhook Signing Utilities for OpenAI ACP
 *
 * HMAC-SHA256 signing for webhook payloads
 */

import crypto from 'crypto';

/**
 * Sign a webhook payload with HMAC-SHA256
 */
export function signPayload(payload: string, secret: string, timestamp: number): string {
  const data = `${timestamp}.${payload}`;
  return crypto
    .createHmac('sha256', secret)
    .update(data)
    .digest('hex');
}

/**
 * Verify a webhook signature
 */
export function verifySignature(
  payload: string,
  signature: string,
  timestamp: number,
  secret: string
): boolean {
  const expected = signPayload(payload, secret, timestamp);

  // Use timing-safe comparison to prevent timing attacks
  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expected)
    );
  } catch (error) {
    return false;
  }
}

/**
 * Send webhook event to OpenAI
 *
 * TODO: Implement webhook delivery with retry logic
 */
export async function emitWebhook(event: string, data: any): Promise<void> {
  const webhookUrl = process.env.OPENAI_WEBHOOK_URL;
  const webhookSecret = process.env.WEBHOOK_SECRET;

  if (!webhookUrl || !webhookSecret) {
    console.warn('Webhook URL or secret not configured, skipping webhook');
    return;
  }

  const timestamp = Date.now();
  const payload = JSON.stringify({ event, data, timestamp });
  const signature = signPayload(payload, webhookSecret, timestamp);

  try {
    // TODO: Implement retry logic (exponential backoff)
    // TODO: Add to dead letter queue on failure
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Signature': signature,
        'X-Timestamp': timestamp.toString()
      },
      body: payload
    });

    if (!response.ok) {
      console.error(`Webhook delivery failed: ${response.status}`);
    }
  } catch (error) {
    console.error('Webhook delivery error:', error);
  }
}
