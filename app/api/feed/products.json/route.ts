/**
 * OpenAI Product Feed Endpoint
 *
 * GET /api/feed/products.json
 *
 * Returns OpenAI-compliant product feed for ChatGPT discovery
 */

import { NextResponse } from 'next/server';
import { generateProductFeed } from '@/app/lib/product-feed';

export async function GET() {
  try {
    // TODO: Generate product feed from Shopify
    const feed = await generateProductFeed();

    return NextResponse.json(feed, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300', // 5 minute cache
      }
    });
  } catch (error) {
    console.error('Product feed error:', error);
    return NextResponse.json(
      { error: 'Failed to generate product feed' },
      { status: 500 }
    );
  }
}

export const runtime = 'nodejs';
