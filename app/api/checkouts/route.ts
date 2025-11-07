/**
 * Checkout Sessions - Create
 *
 * POST /api/checkouts - Create new checkout session
 */

import { NextRequest, NextResponse } from 'next/server';
import { createCheckoutSession } from '@/app/lib/checkout-sessions';
import { setCheckoutSession } from '@/app/lib/kv';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // TODO: Validate request body
    // TODO: Create session with all calculations
    const session = await createCheckoutSession(body);

    // Store in KV
    await setCheckoutSession(session.id, session);

    return NextResponse.json(session, { status: 201 });
  } catch (error) {
    console.error('Checkout creation error:', error);
    return NextResponse.json(
      { error: { type: 'invalid_request', message: 'Failed to create checkout session' } },
      { status: 400 }
    );
  }
}

export const runtime = 'nodejs';
