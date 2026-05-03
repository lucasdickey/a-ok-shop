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
 * Verify a Stripe Link payment using the clientSecret from the Authorization header
 */
export async function verifyStripePayment(
  clientSecret: string,
  expectedAmount: number
): Promise<PaymentVerificationResult> {
  try {
    const stripe = await getStripeClient();
    if (!stripe) {
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

    // Extract payment intent ID from client secret
    const paymentIntentId = clientSecret.split('_secret_')[0];

    // Retrieve the payment intent
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    // Verify the payment was successful
    if (paymentIntent.status !== 'succeeded') {
      return {
        verified: false,
        paymentId: paymentIntentId,
        amount: 0,
        currency: 'usd',
        method: 'stripe-link',
        timestamp: Date.now(),
        error: `Payment not succeeded. Status: ${paymentIntent.status}`,
      };
    }

    // Verify the amount matches (within 1 cent tolerance for rounding)
    const amountDifference = Math.abs(paymentIntent.amount - expectedAmount);
    if (amountDifference > 1) {
      return {
        verified: false,
        paymentId: paymentIntentId,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        method: 'stripe-link',
        timestamp: Date.now(),
        error: `Amount mismatch. Expected ${expectedAmount}, got ${paymentIntent.amount}`,
      };
    }

    return {
      verified: true,
      paymentId: paymentIntentId,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      method: 'stripe-link',
      timestamp: paymentIntent.created * 1000,
    };
  } catch (error) {
    console.error('Error verifying Stripe payment:', error);
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
 */
export function parsePaymentAuthorization(authHeader: string): {
  method: 'stripe-link' | 'tempo' | 'unknown';
  payload: string;
} {
  if (!authHeader || !authHeader.startsWith('Payment ')) {
    return { method: 'unknown', payload: '' };
  }

  const payload = authHeader.substring(8);

  // Determine payment method based on payload format
  if (payload.startsWith('pi_')) {
    // Stripe payment intent
    return { method: 'stripe-link', payload };
  } else if (payload.length === 88 || payload.length === 44) {
    // Solana transaction hash (base58)
    return { method: 'tempo', payload };
  }

  return { method: 'unknown', payload };
}
