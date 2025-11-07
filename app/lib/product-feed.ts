/**
 * Product Feed Generator for OpenAI Commerce
 *
 * Transforms local JSON catalog into OpenAI Product Feed Spec compliant format
 * See: https://developers.openai.com/commerce/specs/feed
 */

import { getAllProducts } from './catalog';

export interface ProductFeedItem {
  // Required: Basic Product Data
  id: string;
  title: string;
  description: string;
  link: string;
  image_link: string;

  // Required: Pricing
  price: string;
  availability: 'in_stock' | 'out_of_stock' | 'preorder';

  // Required: Merchant Info
  brand: string;
  seller_name: string;
  seller_url: string;
  seller_privacy_policy: string;
  seller_tos: string;

  // Required: Returns
  return_policy: string;
  return_window: number;

  // Required: Control Flags
  enable_search: boolean;
  enable_checkout: boolean;

  // Optional
  additional_image_link?: string;
  item_group_id?: string;
  color?: string;
  size?: string;
  popularity_score?: number;
  product_review_count?: number;
  product_review_rating?: number;
}

/**
 * Generate OpenAI-compliant product feed from local JSON catalog
 */
export async function generateProductFeed(): Promise<ProductFeedItem[]> {
  const products = getAllProducts();
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.a-ok.shop';

  const feed: ProductFeedItem[] = [];

  for (const product of products) {
    // Get the first variant for pricing
    const firstVariant = product.variants.edges[0]?.node;
    if (!firstVariant) continue;

    const price = parseFloat(firstVariant.price.amount);

    // Get product image URL
    const imageUrl = product.images.edges[0]?.node.url || '';
    const fullImageUrl = imageUrl.startsWith('http')
      ? imageUrl
      : `${baseUrl}${imageUrl}`;

    // Get additional images
    const additionalImages = product.images.edges
      .slice(1, 10) // Max 10 additional images
      .map((edge) => {
        const url = edge.node.url;
        return url.startsWith('http') ? url : `${baseUrl}${url}`;
      })
      .join(',');

    feed.push({
      id: product.handle, // Use handle as the product ID for the feed
      title: product.title,
      description: stripHtml(product.descriptionHtml || product.description || ''),
      link: `${baseUrl}/products/${product.handle}`,
      image_link: fullImageUrl,
      additional_image_link: additionalImages || undefined,
      price: `${price.toFixed(2)} USD`,
      availability: product.availableForSale ? 'in_stock' : 'out_of_stock',
      brand: 'A-OK Shop',
      seller_name: 'A-OK Shop',
      seller_url: baseUrl,
      seller_privacy_policy: `${baseUrl}/privacy`,
      seller_tos: `${baseUrl}/terms`,
      return_policy: `${baseUrl}/returns`,
      return_window: 0, // All sales final due to just-in-time manufacturing
      enable_search: true,
      enable_checkout: true,
      item_group_id: product.id, // Use Shopify product ID as group ID
    });
  }

  return feed;
}

/**
 * Strip HTML tags from product description
 */
function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').trim();
}

/**
 * Validate product feed item against OpenAI schema
 */
export function validateFeedItem(item: ProductFeedItem): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Required fields validation
  if (!item.id) errors.push('Missing required field: id');
  if (!item.title || item.title.length > 150) errors.push('Invalid title (max 150 chars)');
  if (!item.description || item.description.length > 5000) errors.push('Invalid description (max 5000 chars)');
  if (!item.link) errors.push('Missing required field: link');
  if (!item.image_link) errors.push('Missing required field: image_link');
  if (!item.price) errors.push('Missing required field: price');
  if (!['in_stock', 'out_of_stock', 'preorder'].includes(item.availability)) {
    errors.push('Invalid availability value');
  }

  // Merchant info validation
  if (!item.brand) errors.push('Missing required field: brand');
  if (!item.seller_name || item.seller_name.length > 70) errors.push('Invalid seller_name (max 70 chars)');
  if (!item.seller_url) errors.push('Missing required field: seller_url');
  if (!item.seller_privacy_policy) errors.push('Missing required field: seller_privacy_policy');
  if (!item.seller_tos) errors.push('Missing required field: seller_tos');

  // Return policy validation
  if (!item.return_policy) errors.push('Missing required field: return_policy');
  if (typeof item.return_window !== 'number' || item.return_window < 0) {
    errors.push('Invalid return_window (must be non-negative number)');
  }

  // Control flags validation
  if (typeof item.enable_search !== 'boolean') errors.push('Invalid enable_search (must be boolean)');
  if (typeof item.enable_checkout !== 'boolean') errors.push('Invalid enable_checkout (must be boolean)');

  return {
    valid: errors.length === 0,
    errors
  };
}
