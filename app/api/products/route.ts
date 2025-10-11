import { NextRequest, NextResponse } from 'next/server';
import { getCatalogProducts } from '@/app/lib/database';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    
    console.log('Fetching products via API route...');
    
    // Get all products from database
    const products = await getCatalogProducts();
    
    // Filter by category if provided
    let filteredProducts = products;
    if (category) {
      filteredProducts = products.filter((product: any) => {
        const normalizedTags = product.tags?.map((tag: string) => tag.toLowerCase()) || [];
        const normalizedProductType = (product.productType || '').toLowerCase();
        const normalizedCategory = category.toLowerCase();
        
        // Check if any tag or product type matches the category
        if (normalizedCategory === 'hats') {
          return (
            normalizedTags.some((tag: string) => tag.includes('hat') || tag.includes('cap')) ||
            normalizedProductType.includes('hat') ||
            normalizedProductType.includes('cap')
          );
        } else if (normalizedCategory === 't-shirts') {
          return (
            normalizedTags.some((tag: string) => tag.includes('shirt')) ||
            normalizedProductType.includes('t-shirt')
          );
        } else if (normalizedCategory === 'hoodies') {
          return (
            normalizedTags.some((tag: string) => tag.includes('hoodie')) ||
            normalizedProductType.includes('hoodie')
          );
        } else {
          return (
            normalizedTags.some((tag: string) => tag.includes(normalizedCategory)) ||
            normalizedProductType.includes(normalizedCategory)
          );
        }
      });
    }
    
    console.log(`Returning ${filteredProducts.length} products ${category ? `for category '${category}'` : 'total'}`);
    
    return NextResponse.json({
      products: filteredProducts,
      count: filteredProducts.length
    });
    
  } catch (error) {
    console.error('Error fetching products:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch products',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}