import { getStripeClient } from './stripe-client';

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
  items?: Array<{ handle: string; variantId: string; quantity: number }>
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

    // Create PaymentIntent with SPT
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: 'usd',
      payment_method_types: ['card'],
      metadata: {
        source: 'mpp-agent',
        agentId,
        orderId,
        customerEmail: email || '',
        itemCount: items?.length.toString() || '0',
        items: items ? JSON.stringify(items) : '',
      },
      receipt_email: email,
    });

    console.log('[MPP] PaymentIntent created:', paymentIntent.id);

    // Confirm the PaymentIntent with the SPT
    console.log('[MPP] Confirming PaymentIntent with SPT');
    const confirmedIntent = await stripe.paymentIntents.confirm(paymentIntent.id, {
      payment_method: 'card',
      shared_payment_granted_token: spt,
    } as any);

    console.log('[MPP] PaymentIntent confirmed, status:', confirmedIntent.status);

    // Verify the payment succeeded
    if (confirmedIntent.status !== 'succeeded') {
      console.warn('[MPP] Payment not succeeded:', paymentIntent.id, 'status:', confirmedIntent.status);
      return {
        verified: false,
        paymentId: paymentIntent.id,
        amount: 0,
        currency: confirmedIntent.currency,
        method: 'stripe-link',
        timestamp: Date.now(),
        error: `Payment not succeeded. Status: ${confirmedIntent.status}`,
      };
    }

    console.log('[MPP] Stripe payment confirmed successfully:', paymentIntent.id);
    return {
      verified: true,
      paymentId: paymentIntent.id,
      amount: confirmedIntent.amount,
      currency: confirmedIntent.currency,
      method: 'stripe-link',
      timestamp: confirmedIntent.created * 1000,
    };
  } catch (error) {
    console.error('[MPP] Error creating Stripe payment from SPT:', error);
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
 * Verify a Tempo stablecoin payment
 *
 * In production, this would verify the transaction on-chain.
 * For now, it accepts a transaction hash that can be verified via Solana RPC.
 */
export async function verifyTempoPayment(
  transactionHash: string,
  expectedAmount: number,
  expectedRecipient: string
): Promise<PaymentVerificationResult> {
  try {
    // In production, you would:
    // 1. Call a Solana RPC endpoint to verify the transaction
    // 2. Check that the transaction includes a transfer of USDC
    // 3. Verify the recipient address matches
    // 4. Verify the amount matches

    // For now, we'll do basic validation
    if (!transactionHash || transactionHash.length === 0) {
      return {
        verified: false,
        paymentId: transactionHash,
        amount: 0,
        currency: 'USDC',
        method: 'tempo',
        timestamp: Date.now(),
        error: 'Invalid transaction hash',
      };
    }

    // Placeholder: In production, call Solana RPC
    // const rpcUrl = process.env.SOLANA_RPC_URL;
    // const txData = await fetch(rpcUrl, {
    //   method: 'POST',
    //   body: JSON.stringify({
    //     jsonrpc: '2.0',
    //     id: 1,
    //     method: 'getTransaction',
    //     params: [transactionHash, { encoding: 'jsonParsed' }]
    //   })
    // }).then(r => r.json());

    console.log(
      `Tempo payment verification: txHash=${transactionHash}, amount=${expectedAmount}, recipient=${expectedRecipient}`
    );

    return {
      verified: true,
      paymentId: transactionHash,
      amount: expectedAmount,
      currency: 'USDC',
      method: 'tempo',
      timestamp: Date.now(),
    };
  } catch (error) {
    console.error('Error verifying Tempo payment:', error);
    return {
      verified: false,
      paymentId: transactionHash,
      amount: 0,
      currency: 'USDC',
      method: 'tempo',
      timestamp: Date.now(),
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Parse the Authorization: Payment header and extract payment details
 * Format: Authorization: Payment <base64url-encoded-json>
 * Where JSON contains: { "spt": "spt_...", "method": "stripe", ... }
 */
export function parsePaymentAuthorization(authHeader: string): {
  method: 'stripe-link' | 'tempo' | 'unknown';
  spt?: string; // Shared Payment Token for SPT flow
  payload?: string; // Raw payload for fallback
} {
  if (!authHeader || !authHeader.startsWith('Payment ')) {
    return { method: 'unknown' };
  }

  try {
    const base64urlPayload = authHeader.substring(8);

    // Decode base64url to JSON
    const json = JSON.parse(
      Buffer.from(base64urlPayload, 'base64').toString('utf-8')
    );

    // Check for SPT (Shared Payment Token)
    if (json.spt && json.spt.startsWith('spt_')) {
      return { method: 'stripe-link', spt: json.spt };
    }

    // Check for Tempo transaction hash
    if (json.tempo_tx_hash) {
      return { method: 'tempo', payload: json.tempo_tx_hash };
    }

    return { method: 'unknown' };
  } catch (error) {
    console.warn('[MPP] Error parsing Authorization header:', error);
    return { method: 'unknown' };
  }
}
