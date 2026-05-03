import { getAllProducts } from '@/app/lib/catalog';
import { MPPCatalogResponse, MPPProduct } from '@/app/types/mpp';
import { NextRequest, NextResponse } from 'next/server';

/**
 * MPP Catalog Endpoint
 *
 * Exposes the a-ok.shop product catalog in a machine-readable format for agents.
 * Supports catalog discovery without payment requirements.
 *
 * GET /api/mpp/catalog
 *
 * Returns:
 * {
 *   products: [{
 *     id: string
 *     handle: string
 *     title: string
 *     description: string
 *     priceRange: { minVariantPrice: string, maxVariantPrice: string }
 *     variants: [{
 *       id: string
 *       title: string
 *       price: string
 *       stripePriceId?: string
 *       options: { name: string, value: string }[]
 *     }]
 *     images: [{ url: string, altText: string }]
 *   }]
 * }
 */

export async function GET(request: NextRequest) {
  try {
    const products = getAllProducts();

    // Transform products into MPP-compatible format
    const mppProducts: MPPProduct[] = products.map((product) => ({
      id: product.id,
      handle: product.handle,
      title: product.title,
      description: product.description,
      descriptionHtml: product.descriptionHtml,
      productType: product.productType,
      tags: product.tags || [],
      priceRange: {
        minVariantPrice: product.priceRange.minVariantPrice,
        maxVariantPrice: product.priceRange.minVariantPrice, // Use min since max is not available in SimpleProduct
      },
      variants: (product.variants?.edges || []).map((edge: any) => {
        const variant = edge.node;
        return {
          id: variant.id,
          title: variant.title,
          price: variant.price.amount,
          compareAtPrice: variant.compareAtPrice?.amount,
          stripePriceId: variant.stripePriceId,
          available: variant.availableForSale !== false,
          options: variant.selectedOptions || [],
        };
      }),
      images: (product.images?.edges || []).map((edge: any) => ({
        url: edge.node.url,
        altText: edge.node.altText,
      })),
      options: product.options || [],
    }));

    const response: MPPCatalogResponse = {
      products: mppProducts,
      total: mppProducts.length,
    };

    return NextResponse.json(response, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error) {
    console.error('Error fetching MPP catalog:', error);
    return NextResponse.json(
      { error: 'Failed to fetch catalog' },
      { status: 500 }
    );
  }
}
