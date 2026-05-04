import { getProductByHandle } from '@/app/lib/catalog';
import { getStripeClient } from '@/app/lib/stripe-client';
import { createStripePaymentFromSPT, parsePaymentAuthorization } from '@/app/lib/mpp-payment-verifier';
import { saveOrder, MPPOrder } from '@/app/lib/mpp-order-store';
import { MPPOrderConfirmation, MPPPaymentChallenge, MPPPurchaseRequest } from '@/app/types/mpp';
import { NextRequest, NextResponse } from 'next/server';

/**
 * MPP Purchase Endpoint (Machine Payments Protocol)
 *
 * Implements the proper MPP flow per paymentauth.org spec:
 *
 * 1. Client sends POST with items
 * 2. Server validates and returns 402 with WWW-Authenticate header
 * 3. Client obtains SPT (Shared Payment Token) from wallet
 * 4. Client retries with Authorization: Payment header (base64url-encoded SPT)
 * 5. Server creates/confirms PaymentIntent and returns 200 with order
 */

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as MPPPurchaseRequest;
    const { items, agentId = 'unknown-agent', email } = body;

    console.log('[MPP] Purchase request from agent:', agentId, 'items:', items.length);

    // Validate items and calculate total
    let totalAmount = 0;
    const lineItems: Array<{ handle: string; variantId: string; quantity: number; price: number }> = [];

    for (const item of items) {
      const product = getProductByHandle(item.handle);
      if (!product) {
        console.warn('[MPP] Product not found:', item.handle);
        return NextResponse.json({ error: `Product not found: ${item.handle}` }, { status: 404 });
      }

      const variant = product.variants?.edges?.find(
        (edge: any) => edge.node.id === item.variantId
      )?.node;

      if (!variant) {
        console.warn('[MPP] Variant not found:', item.variantId);
        return NextResponse.json({ error: `Variant not found: ${item.variantId}` }, { status: 404 });
      }

      if (!variant.availableForSale) {
        console.warn('[MPP] Variant not available:', item.variantId);
        return NextResponse.json({ error: `Variant not available: ${item.variantId}` }, { status: 400 });
      }

      const price = parseFloat(variant.price.amount);
      const itemTotal = price * item.quantity;
      totalAmount += itemTotal;

      lineItems.push({
        handle: item.handle,
        variantId: item.variantId,
        quantity: item.quantity,
        price,
      });
    }

    // Add shipping
    const shippingCost = totalAmount < 50 ? 9.99 : 0;
    const amountInCents = Math.round((totalAmount + shippingCost) * 100);
    console.log('[MPP] Order totals - items:', totalAmount.toFixed(2), 'shipping:', shippingCost.toFixed(2));

    // Check for Authorization: Payment header (second step of flow)
    const authHeader = request.headers.get('Authorization');
    if (authHeader) {
      console.log('[MPP] Payment authorization header received, processing payment');
      return handlePaymentAuthorization(authHeader, items, lineItems, amountInCents, agentId, email);
    }

    // First step: return 402 Payment Required with payment challenge
    console.log('[MPP] Returning 402 Payment Required challenge');
    return handlePaymentChallenge(items, totalAmount, shippingCost, amountInCents, agentId);
  } catch (error) {
    console.error('[MPP] Error in purchase endpoint:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * Handle initial payment challenge (402 response)
 * Returns proper MPP protocol response with WWW-Authenticate header
 */
async function handlePaymentChallenge(
  items: MPPPurchaseRequest['items'],
  subtotal: number,
  shipping: number,
  amountInCents: number,
  agentId: string
) {
  try {
    const stripe = await getStripeClient();
    if (!stripe) {
      console.error('[MPP] Stripe client not configured');
      return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 });
    }

    const amount = amountInCents;

    // Create a payment reference ID
    const paymentId = `pi_mpp_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    // Get network ID from environment or use default
    const networkId = process.env.STRIPE_NETWORK_ID?.trim() || 'acct_1RUbP1KcMygrnU2D';

    // Prepare request details for base64url encoding
    const requestDetails = {
      id: paymentId,
      amount: amount.toString(),
      currency: 'usd',
      description: `Purchase ${items.length} item(s) from a-ok.shop`,
      items,
      agentId,
      timestamp: Date.now().toString(),
      methodDetails: {
        networkId,
        paymentMethodTypes: ['card'],
      },
    };

    // Encode request details in base64url
    const base64urlRequest = Buffer.from(JSON.stringify(requestDetails)).toString('base64');

    // Create the payment challenge response
    const challenge: MPPPaymentChallenge = {
      id: paymentId,
      request: base64urlRequest,
      amount,
      currency: 'USD',
      description: `Purchase ${items.length} item(s) from a-ok.shop`,
      paymentMethods: {
        stripe: {
          method: 'stripe',
          intent: 'charge',
        },
      },
    };

    console.log('[MPP] Payment challenge created:', paymentId);

    // Return 402 with proper MPP headers
    return NextResponse.json(challenge, {
      status: 402,
      headers: {
        'WWW-Authenticate': `Payment realm="a-ok.shop", id="${paymentId}", method="stripe", intent="charge", request="${base64urlRequest}"`,
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('[MPP] Error creating payment challenge:', error);
    return NextResponse.json({ error: 'Failed to create payment challenge' }, { status: 500 });
  }
}

/**
 * Handle payment authorization with SPT (second step)
 * Creates PaymentIntent, confirms with SPT, and returns order confirmation
 */
async function handlePaymentAuthorization(
  authHeader: string,
  items: MPPPurchaseRequest['items'],
  lineItems: Array<{ handle: string; variantId: string; quantity: number; price: number }>,
  amountInCents: number,
  agentId: string,
  email?: string
): Promise<NextResponse> {
  try {
    // Parse the SPT from base64url-encoded Authorization header
    const { method, spt } = parsePaymentAuthorization(authHeader);

    if (method !== 'stripe-link' || !spt) {
      console.warn('[MPP] Invalid authorization method or missing SPT:', method);
      return NextResponse.json({ error: 'Invalid payment authorization' }, { status: 400 });
    }

    console.log('[MPP] Processing SPT payment for agent:', agentId);

    // Generate order ID upfront
    const orderId = `mpp_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    // Create and confirm PaymentIntent with SPT
    const paymentResult = await createStripePaymentFromSPT(
      spt,
      amountInCents,
      agentId,
      orderId,
      email,
      items
    );

    if (!paymentResult.verified) {
      console.error('[MPP] Payment verification failed:', paymentResult.error);
      return NextResponse.json({ error: paymentResult.error || 'Payment failed' }, { status: 401 });
    }

    console.log('[MPP] Payment verified successfully:', paymentResult.paymentId);

    // Save order record
    const order: MPPOrder = {
      orderId,
      paymentIntentId: paymentResult.paymentId,
      agentId,
      email,
      items,
      amount: amountInCents,
      currency: 'USD',
      paymentMethod: 'stripe-spt',
      status: 'completed',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      metadata: {
        lineItemCount: lineItems.length.toString(),
      },
    };

    await saveOrder(order);
    console.log('[MPP] Order saved:', orderId);

    // Return order confirmation
    const confirmation: MPPOrderConfirmation = {
      orderId,
      status: 'completed',
      amount: amountInCents / 100,
      currency: 'USD',
      paymentMethod: 'stripe-spt',
      paymentId: paymentResult.paymentId,
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
    const errorMsg = error instanceof Error ? error.message : JSON.stringify(error);
    console.error('[MPP] Detailed authorization error:', errorMsg);
    return NextResponse.json({ error: 'Payment processing failed', details: errorMsg }, { status: 500 });
  }
}
