import { getOrder } from '@/app/lib/mpp-order-store';
import { NextRequest, NextResponse } from 'next/server';

/**
 * MPP Order Status Endpoint
 *
 * GET /api/mpp/orders/:orderId
 *
 * Lets an agent look up the status of an order it placed via /api/mpp/purchase.
 * Returns 404 if the order is unknown or order persistence (Redis) is not configured.
 */

interface RouteContext {
  params: Promise<{ orderId: string }>;
}

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { orderId } = await context.params;

    const order = await getOrder(orderId);
    if (!order) {
      return NextResponse.json(
        { error: `Order not found: ${orderId}` },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        orderId: order.orderId,
        status: order.status,
        amount: order.amount / 100,
        currency: order.currency,
        paymentMethod: order.paymentMethod,
        paymentId: order.paymentIntentId,
        items: order.items,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
      },
      { status: 200, headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    console.error('[MPP] Error retrieving order:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve order' },
      { status: 500 }
    );
  }
}
