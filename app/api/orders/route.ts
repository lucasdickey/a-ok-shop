import { NextRequest, NextResponse } from 'next/server';
import { createOrder } from '@/app/lib/database';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const {
      email,
      items,
      subtotal,
      tax = 0,
      shipping = 0,
      discountCode,
      discountAmount = 0,
      shippingAddress,
      billingAddress,
      customerNote
    } = body;
    
    // Validate required fields
    if (!email || !items || items.length === 0 || subtotal === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: email, items, and subtotal are required' },
        { status: 400 }
      );
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }
    
    // Validate items structure
    const validItems = items.every((item: any) => 
      item.productId && 
      item.variantId && 
      item.quantity > 0 && 
      item.price >= 0 && 
      item.title
    );
    
    if (!validItems) {
      return NextResponse.json(
        { error: 'Invalid items structure' },
        { status: 400 }
      );
    }
    
    console.log(`Creating order for ${email} with ${items.length} items`);
    
    const order = await createOrder({
      email,
      items,
      subtotal,
      tax,
      shipping,
      discountCode,
      discountAmount,
      shippingAddress,
      billingAddress,
      customerNote,
    });
    
    console.log(`Order created: ${order.orderNumber}`);
    
    return NextResponse.json({
      order,
      message: 'Order created successfully'
    });
    
  } catch (error) {
    console.error('Error creating order:', error);
    return NextResponse.json(
      { 
        error: 'Failed to create order',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}