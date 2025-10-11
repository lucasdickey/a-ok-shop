import { NextRequest, NextResponse } from 'next/server';
import { getFullProduct } from '@/app/lib/database';

export async function GET(
  request: NextRequest,
  { params }: { params: { handle: string } }
) {
  try {
    const { handle } = params;
    
    console.log(`Fetching product with handle: ${handle}`);
    
    const product = await getFullProduct(handle);
    
    if (!product) {
      console.log(`Product not found: ${handle}`);
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }
    
    console.log(`Product found: ${product.title}`);
    
    return NextResponse.json({ product });
    
  } catch (error) {
    console.error('Error fetching product:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch product',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}