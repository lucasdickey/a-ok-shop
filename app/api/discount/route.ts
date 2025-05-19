import { NextResponse } from 'next/server';
import { getShopifyClient } from '../../lib/shopify';

// Mock discount code generation for development
function generateMockDiscountCode() {
  const code = `AOK-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
  console.log('Generated mock discount code:', code);
  return code;
}

export async function POST() {
  try {
    // In development, return a mock discount code
    if (process.env.NODE_ENV !== 'production') {
      const mockCode = generateMockDiscountCode();
      return NextResponse.json({ code: mockCode });
    }

    // In production, use the Shopify Admin API
    const client = getShopifyClient();
    const code = `AOK-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    
    // Note: The following is a placeholder for actual Admin API implementation
    // You'll need to implement the actual Admin API calls to create price rules and discount codes
    // This requires proper authentication with the Shopify Admin API
    
    console.log('Generated discount code (production):', code);
    
    return NextResponse.json({ 
      code,
      note: 'In production, this would create a real discount code. Currently in development mode.'
    });
    
  } catch (error) {
    console.error('Error in discount code generation:', error);
    
    // In case of error, still return a mock code in development
    if (process.env.NODE_ENV !== 'production') {
      console.log('Falling back to mock discount code due to error');
      return NextResponse.json({ 
        code: `AOK-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
        note: 'Mock code generated due to error'
      });
    }
    
    return NextResponse.json(
      { 
        error: 'Failed to create discount code',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
