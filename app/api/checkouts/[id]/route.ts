/**
 * Checkout Sessions - Retrieve & Update
 *
 * GET /api/checkouts/:id - Retrieve checkout session
 * PUT /api/checkouts/:id - Update checkout session
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCheckoutSession, updateCheckoutSession } from '@/app/lib/kv';
import { calculateShipping } from '@/app/lib/shipping-calculator';
import { calculateTax } from '@/app/lib/tax-calculator';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(
  req: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;
    const session = await getCheckoutSession(id);

    if (!session) {
      return NextResponse.json(
        { error: { type: 'invalid_request', code: 'not_found', message: 'Session not found' } },
        { status: 404 }
      );
    }

    return NextResponse.json(session);
  } catch (error) {
    console.error('Checkout retrieval error:', error);
    return NextResponse.json(
      { error: { type: 'invalid_request', message: 'Failed to retrieve checkout session' } },
      { status: 400 }
    );
  }
}

export async function PUT(
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

    // Check if session can be updated
    if (session.status === 'completed' || session.status === 'canceled') {
      return NextResponse.json(
        { error: { type: 'invalid_request', code: 'session_closed', message: 'Cannot update completed or canceled session' } },
        { status: 400 }
      );
    }

    // TODO: Validate update payload
    // Update session fields
    const updates: any = {};

    if (body.items) {
      updates.items = body.items;
      // TODO: Recalculate line_items from Shopify
    }

    if (body.fulfillment_address) {
      updates.fulfillment_address = body.fulfillment_address;

      // Recalculate shipping options
      updates.fulfillment_options = await calculateShipping(body.fulfillment_address);
    }

    if (body.selected_fulfillment_option_id) {
      updates.selected_fulfillment_option_id = body.selected_fulfillment_option_id;
    }

    // Recalculate tax if address or items changed
    if (body.fulfillment_address || body.items) {
      // TODO: Calculate tax based on new values
      const taxAmount = await calculateTax(
        session.line_items,
        body.fulfillment_address || session.fulfillment_address
      );

      // TODO: Recalculate all totals
    }

    // Update session in KV
    const updatedSession = await updateCheckoutSession(id, updates);

    return NextResponse.json(updatedSession);
  } catch (error) {
    console.error('Checkout update error:', error);
    return NextResponse.json(
      { error: { type: 'invalid_request', message: 'Failed to update checkout session' } },
      { status: 400 }
    );
  }
}

export const runtime = 'nodejs';
