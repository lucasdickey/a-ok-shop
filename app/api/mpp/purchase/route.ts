import { getProductByHandle } from '@/app/lib/catalog';
import { getStripeClient } from '@/app/lib/stripe-client';
import {
  parsePaymentAuthorization,
  verifyStripePayment,
  verifyTempoPayment,
} from '@/app/lib/mpp-payment-verifier';
import {
  MPPOrderConfirmation,
  MPPPaymentChallenge,
  MPPPurchaseRequest,
} from '@/app/types/mpp';
import { createHash } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';

/**
 * MPP Purchase Endpoint
 *
 * Handles agent purchases using the Machine Payments Protocol.
 * Implements the 402 Payment Required flow with support for Link (Stripe) and Tempo stablecoins.
 *
 * Flow:
 * 1. Agent sends purchase request
 * 2. Server responds with 402 Payment Required + payment options
 * 3. Agent completes payment (Link or Tempo)
 * 4. Agent retries request with Authorization: Payment header
 * 5. Server validates payment and fulfills order
 */

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as MPPPurchaseRequest;
    const { items, agentId = 'unknown-agent', email } = body;

    console.log('[MPP] Purchase request from agent:', agentId, 'items:', items.length, 'email:', email);

    // Validate items and calculate total
    let totalAmount = 0;
    const lineItems: Array<{ variantId: string; quantity: number; price: number }> = [];

    for (const item of items) {
      const product = getProductByHandle(item.handle);
      if (!product) {
        console.warn('[MPP] Product not found:', item.handle);
        return NextResponse.json(
          { error: `Product not found: ${item.handle}` },
          { status: 404 }
        );
      }

      // Navigate the nested edges structure for variants
      const variant = product.variants?.edges?.find(
        (edge: any) => edge.node.id === item.variantId
      )?.node;

      if (!variant) {
        return NextResponse.json(
          { error: `Variant not found: ${item.variantId}` },
          { status: 404 }
        );
      }

      if (!variant.availableForSale) {
        return NextResponse.json(
          { error: `Variant not available: ${item.variantId}` },
          { status: 400 }
        );
      }

      const price = parseFloat(variant.price.amount);
      const itemTotal = price * item.quantity;
      totalAmount += itemTotal;

      lineItems.push({
        variantId: item.variantId,
        quantity: item.quantity,
        price,
      });
    }

    // Add shipping
    const shippingCost = totalAmount < 50 ? 9.99 : 0;
    const amountInCents = Math.round((totalAmount + shippingCost) * 100);
    console.log('[MPP] Order totals - items:', totalAmount.toFixed(2), 'shipping:', shippingCost.toFixed(2), 'total:', (totalAmount + shippingCost).toFixed(2));

    // Check for Authorization: Payment header (payment already completed)
    const authHeader = request.headers.get('Authorization');
    if (authHeader) {
      console.log('[MPP] Payment authorization header received, processing payment');
      return handlePaymentAuthorization(
        authHeader,
        items,
        amountInCents,
        email
      );
    }

    // No payment yet - initiate payment challenge
    console.log('[MPP] Initiating payment challenge for agent:', agentId);
    const paymentDetails = await initializePaymentChallenge(
      items,
      totalAmount,
      shippingCost,
      agentId
    );

    // Return 402 Payment Required with payment options
    return NextResponse.json(paymentDetails, {
      status: 402,
      headers: {
        'WWW-Authenticate':
          'Payment realm="a-ok.shop", methods="stripe,tempo", charset="UTF-8"',
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Error in MPP purchase:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function initializePaymentChallenge(
  items: MPPPurchaseRequest['items'],
  subtotal: number,
  shipping: number,
  agentId: string
): Promise<MPPPaymentChallenge> {
  const stripe = await getStripeClient();
  if (!stripe) {
    throw new Error('Stripe client not configured');
  }
  const amount = Math.round((subtotal + shipping) * 100);

  // Generate idempotency key to prevent duplicate charges on retry
  // Hash items + amounts to create a stable key (same request = same key)
  const idempotencyPayload = JSON.stringify({
    agentId,
    items: items.map((i) => ({ handle: i.handle, variantId: i.variantId, quantity: i.quantity })),
    amount,
  });
  const idempotencyKey = createHash('sha256').update(idempotencyPayload).digest('hex');

  // Create Stripe PaymentIntent for Link payment
  console.log('[MPP] Creating PaymentIntent for agent:', agentId, 'amount:', amount, 'idempotencyKey:', idempotencyKey.substring(0, 8) + '...');
  const paymentIntent = await stripe.paymentIntents.create(
    {
      amount,
      currency: 'usd',
      payment_method_types: ['card', 'link'],
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        source: 'mpp-agent',
        agentId,
        itemCount: items.length.toString(),
      },
    },
    {
      // Idempotency key prevents duplicate charges if agent retries
      idempotencyKey,
    }
  );

  console.log('[MPP] PaymentIntent created:', paymentIntent.id);

  return {
    amount,
    currency: 'USD',
    description: `Purchase ${items.length} item(s) from a-ok.shop`,
    paymentMethods: {
      stripe: {
        clientSecret: paymentIntent.client_secret || '',
        publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '',
        method: 'link',
      },
      tempo: {
        amount: (amount / 100).toFixed(2),
        currency: 'USDC',
        recipient: process.env.TEMPO_RECIPIENT_ADDRESS || 'aok-shop.tempo',
      },
    },
  };
}

async function handlePaymentAuthorization(
  authHeader: string,
  items: MPPPurchaseRequest['items'],
  amountInCents: number,
  email?: string
): Promise<NextResponse<MPPOrderConfirmation | { error: string }>> {
  try {
    // Parse the authorization header to determine payment method
    const { method, payload } = parsePaymentAuthorization(authHeader);
    console.log('[MPP] Processing authorization - method:', method);

    let verificationResult;

    if (method === 'stripe-link') {
      // Verify Stripe payment using clientSecret
      console.log('[MPP] Verifying Stripe Link payment');
      verificationResult = await verifyStripePayment(payload, amountInCents);
    } else if (method === 'tempo') {
      // Verify Tempo stablecoin payment using transaction hash
      console.log('[MPP] Verifying Tempo stablecoin payment');
      const tempoRecipient = process.env.TEMPO_RECIPIENT_ADDRESS || 'aok-shop.tempo';
      verificationResult = await verifyTempoPayment(
        payload,
        amountInCents / 100,
        tempoRecipient
      );
    } else {
      console.warn('[MPP] Invalid payment method:', method);
      return NextResponse.json(
        { error: 'Invalid payment method in Authorization header' },
        { status: 400 }
      );
    }

    // Check if payment was verified
    if (!verificationResult.verified) {
      console.error(
        '[MPP] Payment verification failed:',
        verificationResult.error
      );
      return NextResponse.json(
        { error: verificationResult.error || 'Payment verification failed' },
        { status: 401 }
      );
    }

    // Generate order ID
    const orderId = `MPP-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    console.log('[MPP] Order confirmed:', orderId, 'paymentId:', verificationResult.paymentId);

    const confirmation: MPPOrderConfirmation = {
      orderId,
      status: 'completed',
      amount: amountInCents / 100,
      currency: amountInCents < 1000000 ? 'USD' : 'USDC', // If amount > 10k USD, assume stablecoin
      paymentMethod: method,
      paymentId: verificationResult.paymentId,
      items,
      message: 'Order completed successfully',
    };

    return NextResponse.json(confirmation, {
      status: 200,
      headers: {
        'Payment-Receipt': `receipt-${orderId}`,
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('[MPP] Error processing payment authorization:', error);
    return NextResponse.json(
      { error: 'Payment verification failed' },
      { status: 401 }
    );
  }
}
