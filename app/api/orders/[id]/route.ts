import { NextRequest, NextResponse } from 'next/server';
import { getOrderById, getOrderByNumber, updateOrderStatus } from '@/app/lib/database';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    
    let order;
    
    // Check if ID is numeric (database ID) or string (order number)
    if (/^\d+$/.test(id)) {
      order = await getOrderById(parseInt(id));
    } else {
      order = await getOrderByNumber(id);
    }
    
    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ order });
    
  } catch (error) {
    console.error('Error fetching order:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch order',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    
    const { status, stripePaymentIntentId, stripeChargeId } = body;
    
    if (!status) {
      return NextResponse.json(
        { error: 'Status is required' },
        { status: 400 }
      );
    }
    
    // Validate status
    const validStatuses = ['pending', 'processing', 'completed', 'failed', 'refunded'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
        { status: 400 }
      );
    }
    
    let orderId: number;
    if (/^\d+$/.test(id)) {
      orderId = parseInt(id);
    } else {
      // Look up order by number to get ID
      const order = await getOrderByNumber(id);
      if (!order) {
        return NextResponse.json(
          { error: 'Order not found' },
          { status: 404 }
        );
      }
      orderId = order.id;
    }
    
    const updatedOrder = await updateOrderStatus(
      orderId,
      status,
      stripePaymentIntentId,
      stripeChargeId
    );
    
    console.log(`Order ${id} status updated to: ${status}`);
    
    return NextResponse.json({
      order: updatedOrder,
      message: 'Order status updated successfully'
    });
    
  } catch (error) {
    console.error('Error updating order:', error);
    return NextResponse.json(
      { 
        error: 'Failed to update order',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}