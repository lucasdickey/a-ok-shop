/**
 * Checkout Sessions - Cancel
 *
 * POST /api/checkouts/:id/cancel - Cancel checkout session
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCheckoutSession, updateCheckoutSession } from '@/app/lib/kv';
import { emitWebhook } from '@/app/lib/webhook-signing';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(
  req: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;
    const body = await req.json();

    const session = await getCheckoutSession(id);

    if (!session) {
      return NextResponse.json(
        { error: { type: 'invalid_request', code: 'not_found', message: 'Session not found' } },
        { status: 404 }
      );
    }

    // Check if session can be canceled
    if (session.status === 'completed') {
      return NextResponse.json(
        { error: { type: 'invalid_request', code: 'already_completed', message: 'Cannot cancel completed session' } },
        { status: 400 }
      );
    }

    if (session.status === 'canceled') {
      return NextResponse.json(
        { error: { type: 'invalid_request', code: 'already_canceled', message: 'Session already canceled' } },
        { status: 400 }
      );
    }

    // Update session to canceled
    const canceledSession = await updateCheckoutSession(id, {
      status: 'canceled',
      cancellation_reason: body.reason || 'user_canceled',
      canceled_at: Date.now(),
    });

    // Emit webhook to OpenAI
    await emitWebhook('checkout.canceled', {
      session_id: session.id,
      reason: body.reason || 'user_canceled',
    });

    return NextResponse.json({
      status: 'canceled',
      session_id: session.id,
    });
  } catch (error) {
    console.error('Checkout cancellation error:', error);
    return NextResponse.json(
      { error: { type: 'invalid_request', message: 'Failed to cancel checkout session' } },
      { status: 400 }
    );
  }
}

export const runtime = 'nodejs';
