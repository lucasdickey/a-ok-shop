/**
 * Checkout Sessions - Complete with Payment
 *
 * POST /api/checkouts/:id/complete - Process SharedPaymentToken and complete checkout
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCheckoutSession, updateCheckoutSession } from '@/app/lib/kv';
import { emitWebhook } from '@/app/lib/webhook-signing';
import { getStripeClient } from '@/app/lib/stripe-client';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(
  req: NextRequest,
  context: RouteContext
) {
  try {
    const stripe = getStripeClient();
    if (!stripe) {
      return NextResponse.json(
        { error: { type: 'invalid_request', code: 'internal_error', message: 'Stripe not configured' } },
        { status: 500 }
      );
    }

    const { id } = await context.params;
    const body = await req.json();

    const session = await getCheckoutSession(id);

    if (!session) {
      return NextResponse.json(
        { error: { type: 'invalid_request', code: 'not_found', message: 'Session not found' } },
        { status: 404 }
      );
    }

    // Validate session is ready for payment
    if (session.status !== 'ready_for_payment') {
      return NextResponse.json(
        { error: { type: 'invalid_request', code: 'invalid_status', message: 'Session not ready for payment' } },
        { status: 400 }
      );
    }

    // Validate payment_data
    if (!body.payment_data?.token) {
      return NextResponse.json(
        { error: { type: 'invalid_request', code: 'missing_payment', message: 'SharedPaymentToken required' } },
        { status: 400 }
      );
    }

    // Get total amount
    const totalAmount = session.totals.find(t => t.type === 'total')?.amount;
    if (!totalAmount) {
      return NextResponse.json(
        { error: { type: 'invalid_request', code: 'invalid_total', message: 'Invalid total amount' } },
        { status: 400 }
      );
    }

    // Update session to in_progress
    await updateCheckoutSession(id, { status: 'in_progress' });

    try {
      // TODO: Exchange OpenAI SharedPaymentToken for Stripe payment method
      // The shared_payment_granted_token from body.payment_data.token needs to be
      // converted to a Stripe payment method before creating the PaymentIntent

      // Process payment with Stripe
      const paymentIntent = await stripe.paymentIntents.create({
        amount: totalAmount,
        currency: session.currency,
        // payment_method: stripePaymentMethodId, // TODO: Convert SPT to Stripe PM
        metadata: {
          checkout_session_id: session.id,
          protocol: 'acp-draft-2024-12',
          source: 'acp-api',
          endpoint: 'complete-checkout',
          origin: req.headers.get('origin') || 'unknown',
          shared_payment_token: body.payment_data.token, // Store SPT for reference
        },
      });

      // Check payment status
      if (paymentIntent.status === 'succeeded') {
        // TODO: Create Shopify order
        // TODO: Trigger fulfillment workflow

        // Update session to completed
        const completedSession = await updateCheckoutSession(id, {
          status: 'completed',
          payment_intent_id: paymentIntent.id,
          completed_at: Date.now(),
        });

        // Emit webhook to OpenAI
        await emitWebhook('checkout.completed', {
          session_id: session.id,
          payment_intent_id: paymentIntent.id,
        });

        return NextResponse.json({
          status: 'completed',
          order_id: `order_${session.id}`, // TODO: Use real Shopify order ID
          payment_intent_id: paymentIntent.id,
        });
      } else if (paymentIntent.status === 'requires_action') {
        // Payment requires additional action
        return NextResponse.json({
          status: 'requires_action',
          client_secret: paymentIntent.client_secret,
        });
      } else {
        // Payment failed
        await updateCheckoutSession(id, { status: 'ready_for_payment' });

        return NextResponse.json(
          { error: { type: 'payment_error', message: 'Payment failed' } },
          { status: 400 }
        );
      }
    } catch (stripeError: any) {
      console.error('Stripe payment error:', stripeError);

      // Revert session status
      await updateCheckoutSession(id, { status: 'ready_for_payment' });

      return NextResponse.json(
        { error: { type: 'payment_error', message: stripeError.message || 'Payment processing failed' } },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Checkout completion error:', error);
    return NextResponse.json(
      { error: { type: 'invalid_request', message: 'Failed to complete checkout' } },
      { status: 400 }
    );
  }
}

export const runtime = 'nodejs';
