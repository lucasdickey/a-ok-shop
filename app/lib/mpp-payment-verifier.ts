import { getStripeClient } from './stripe-client';
import type { MPPItem, MPPShipping } from '@/app/types/mpp';

/**
 * MPP Payment Verifier
 *
 * Handles verification of payments from:
 * - Stripe (Link payment method)
 * - Tempo (Stablecoin - USDC)
 */

export interface PaymentVerificationResult {
  verified: boolean;
  paymentId: string;
  amount: number;
  currency: string;
  method: 'stripe-link' | 'tempo';
  timestamp: number;
  error?: string;
  /** True when Stripe is still working on an earlier request for the same order. */
  inProgress?: boolean;
  /**
   * True when this payment request was already used with different payment details
   * (for example a new token). Stripe refuses it and nothing is charged.
   */
  alreadyUsed?: boolean;
}

/**
 * Create and confirm a Stripe PaymentIntent using a Shared Payment Token (SPT)
 * This is the MPP-compliant flow for Stripe Link AI Wallet
 */
export async function createStripePaymentFromSPT(
  spt: string,
  amount: number,
  agentId: string,
  orderId: string,
  email?: string,
  items?: MPPItem[],
  shipping?: MPPShipping
): Promise<PaymentVerificationResult> {
  try {
    const stripe = await getStripeClient();
    if (!stripe) {
      console.error('[MPP] Stripe client not configured');
      return {
        verified: false,
        paymentId: '',
        amount: 0,
        currency: 'usd',
        method: 'stripe-link',
        timestamp: Date.now(),
        error: 'Stripe client not configured',
      };
    }

    console.log('[MPP] Creating PaymentIntent with SPT for agent:', agentId, 'amount:', amount, 'orderId:', orderId);

    // The caller builds orderId from the payment token and the exact order, so a repeat
    // of the same request uses the same key and Stripe returns the first payment
    // instead of charging again.
    const idempotencyKey = orderId;

    // Single PaymentIntent create call with confirm:true per Stripe MPP spec
    // This atomically creates and confirms the payment in one operation
    // When using shared_payment_granted_token, Stripe handles the payment method selection
    const confirmedIntent = await stripe.paymentIntents.create(
      {
        amount,
        currency: 'usd',
        confirm: true,
        shared_payment_granted_token: spt,
        metadata: {
          source: 'mpp-agent',
          agentId,
          orderId,
          customerEmail: email || '',
          itemCount: items?.length.toString() || '0',
          items: items ? JSON.stringify(items) : '',
        },
        receipt_email: email,
        // Stripe's own field, so the address shows on the payment in the Dashboard
        // and reaches the webhook's owner alert.
        shipping,
      } as any,
      { idempotencyKey } as any
    );

    console.log('[MPP] PaymentIntent created and confirmed, id:', confirmedIntent.id, 'status:', confirmedIntent.status);

    // Verify the payment succeeded
    if (confirmedIntent.status !== 'succeeded') {
      console.warn('[MPP] Payment not succeeded:', confirmedIntent.id, 'status:', confirmedIntent.status);
      return {
        verified: false,
        paymentId: confirmedIntent.id,
        amount: 0,
        currency: confirmedIntent.currency,
        method: 'stripe-link',
        timestamp: Date.now(),
        error: `Payment not succeeded. Status: ${confirmedIntent.status}`,
      };
    }

    console.log('[MPP] Stripe payment completed successfully:', confirmedIntent.id);
    return {
      verified: true,
      paymentId: confirmedIntent.id,
      amount: confirmedIntent.amount,
      currency: confirmedIntent.currency,
      method: 'stripe-link',
      timestamp: confirmedIntent.created * 1000,
    };
  } catch (error) {
    console.error('[MPP] Error creating Stripe payment from SPT:', error);
    const stripeError = error as { type?: string; rawType?: string; code?: string; statusCode?: number } | null;
    if (stripeError?.type === 'StripeIdempotencyError' || stripeError?.rawType === 'idempotency_error') {
      return {
        verified: false,
        paymentId: '',
        amount: 0,
        currency: 'usd',
        method: 'stripe-link',
        timestamp: Date.now(),
        error: 'This payment request was already used. If an earlier try went through, this is its order id; otherwise send the order without payment to get a new payment request.',
        alreadyUsed: true,
      };
    }
    if (stripeError?.code === 'idempotency_key_in_use' || stripeError?.statusCode === 409) {
      return {
        verified: false,
        paymentId: '',
        amount: 0,
        currency: 'usd',
        method: 'stripe-link',
        timestamp: Date.now(),
        error: 'This order is already being charged. Send the same request again in a moment to get the order.',
        inProgress: true,
      };
    }
    return {
      verified: false,
      paymentId: '',
      amount: 0,
      currency: 'usd',
      method: 'stripe-link',
      timestamp: Date.now(),
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Parse the Authorization: Payment header and extract payment details
 * Format: Authorization: Payment <base64url-encoded-json>
 *
 * Per MPP spec, expects credential envelope:
 * {
 *   "challenge": "...",
 *   "payload": {
 *     "spt": "spt_...",  // Stripe SPT
 *     "method": "stripe"
 *   }
 * }
 */
export function parsePaymentAuthorization(authHeader: string): {
  method: 'stripe-link' | 'tempo' | 'unknown';
  spt?: string; // Shared Payment Token for SPT flow
  payload?: string; // Raw payload for fallback
  challengeId?: string; // The id of our 402 payment request, echoed back by the agent
} {
  if (!authHeader || !authHeader.startsWith('Payment ')) {
    return { method: 'unknown' };
  }

  try {
    const base64urlPayload = authHeader.substring(8);

    // Decode base64url to JSON
    // Convert base64url back to base64: replace -_ with +/
    const base64Payload = base64urlPayload.replace(/-/g, '+').replace(/_/g, '/');
    // Add padding if needed
    const padded = base64Payload + '='.repeat((4 - base64Payload.length % 4) % 4);
    const decodedJson = Buffer.from(padded, 'base64').toString('utf-8');
    const credential = JSON.parse(decodedJson);

    const challengeId = readChallengeId(credential?.challenge);

    // Check for proper credential envelope with payload.spt (Stripe SPT)
    if (credential.payload?.spt && credential.payload.spt.startsWith('spt_')) {
      console.log('[MPP] Extracted SPT from credential envelope');
      return { method: 'stripe-link', spt: credential.payload.spt, challengeId };
    }

    // Fallback: check for direct SPT field (for backwards compatibility)
    if (credential.spt && credential.spt.startsWith('spt_')) {
      console.log('[MPP] Extracted SPT from direct field');
      return { method: 'stripe-link', spt: credential.spt, challengeId };
    }

    // Check for Tempo transaction hash
    if (credential.payload?.tempo_tx_hash) {
      return { method: 'tempo', payload: credential.payload.tempo_tx_hash };
    }

    console.warn('[MPP] No recognized payment token in credential envelope');
    return { method: 'unknown' };
  } catch (error) {
    console.warn('[MPP] Error parsing Authorization header:', error);
    return { method: 'unknown' };
  }
}

/**
 * The credential echoes our 402 payment request, either as its id or as the whole
 * request object. Returns the id, or undefined if it isn't there.
 */
function readChallengeId(challenge: unknown): string | undefined {
  const id =
    typeof challenge === 'string'
      ? challenge
      : challenge && typeof challenge === 'object' && typeof (challenge as { id?: unknown }).id === 'string'
        ? (challenge as { id: string }).id
        : undefined;
  return id && id.length <= 200 ? id : undefined;
}
