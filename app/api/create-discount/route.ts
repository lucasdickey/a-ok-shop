import { NextResponse } from 'next/server';
import { createOneOffDiscount } from '@/app/lib/shopifyAdmin';

export async function POST() {
  try {
    const code = await createOneOffDiscount();
    return NextResponse.json({ code });
  } catch (err) {
    console.error('Discount creation failed', err);
    return NextResponse.json(
      { error: 'Failed to create discount' },
      { status: 500 }
    );
  }
}
