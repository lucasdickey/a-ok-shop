/**
 * OpenAI Webhooks - Receive Events
 *
 * POST /api/webhooks/openai - Receive webhook events from OpenAI
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifySignature } from '@/app/lib/webhook-signing';

export async function POST(req: NextRequest) {
  try {
    // Get signature and timestamp from headers
    const signature = req.headers.get('x-signature');
    const timestampHeader = req.headers.get('x-timestamp');

    if (!signature || !timestampHeader) {
      return NextResponse.json(
        { error: 'Missing signature or timestamp' },
        { status: 401 }
      );
    }

    const timestamp = parseInt(timestampHeader, 10);

    // Verify timestamp is recent (within 5 minutes)
    const now = Date.now();
    const FIVE_MINUTES = 5 * 60 * 1000;

    if (Math.abs(now - timestamp) > FIVE_MINUTES) {
      return NextResponse.json(
        { error: 'Timestamp too old or too far in future' },
        { status: 401 }
      );
    }

    // Get raw body for signature verification
    const payload = await req.text();

    // Verify signature
    const webhookSecret = process.env.WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.error('WEBHOOK_SECRET not configured');
      return NextResponse.json(
        { error: 'Server misconfigured' },
        { status: 500 }
      );
    }

    const isValid = verifySignature(payload, signature, timestamp, webhookSecret);

    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    // Parse webhook event
    const event = JSON.parse(payload);

    // Process webhook based on event type
    switch (event.event) {
      case 'session.created':
        // TODO: Handle session created event
        console.log('Session created:', event.data);
        break;

      case 'session.updated':
        // TODO: Handle session updated event
        console.log('Session updated:', event.data);
        break;

      case 'payment.attempted':
        // TODO: Handle payment attempt event
        console.log('Payment attempted:', event.data);
        break;

      case 'payment.succeeded':
        // TODO: Handle payment success event
        console.log('Payment succeeded:', event.data);
        break;

      case 'payment.failed':
        // TODO: Handle payment failure event
        console.log('Payment failed:', event.data);
        break;

      default:
        console.log('Unknown event type:', event.event);
    }

    // Return success response
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook processing error:', error);
    return NextResponse.json(
      { error: 'Failed to process webhook' },
      { status: 400 }
    );
  }
}

export const runtime = 'nodejs';
