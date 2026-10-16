import { NextRequest, NextResponse } from "next/server";

import { listItems, type AcpItem } from "@/app/lib/acp/items";
import { getAllProducts, type SimpleProduct } from "@/app/lib/catalog";
import { getCorsHeaders } from "@/app/lib/cors";
import { absoluteUrl } from "@/app/lib/site";

/*
 * ACP product feed (2026-04-17 `ProductsResponse`). Every color and size is its
 * own variant, and the variant `id` is the item ID that POST /api/acp/checkout_sessions
 * takes, so an agent can buy exactly the size and color the shopper picked.
 */

const SELLER = {
  name: "A-OK",
  links: [
    { type: "privacy_policy", title: "Privacy Policy", url: absoluteUrl("/privacy") },
    { type: "terms_of_service", title: "Terms", url: absoluteUrl("/terms") },
    { type: "refund_policy", title: "Returns", url: absoluteUrl("/returns") },
  ],
};

function media(product: SimpleProduct, color?: string) {
  const images = product.images.edges.map((edge) => edge.node);
  // Prefer photos of the variant's color; fall back to all photos.
  const matching = color ? images.filter((image) => image.color === color) : [];
  return (matching.length > 0 ? matching : images).map((image) => ({
    type: "image",
    url: absoluteUrl(image.url),
    alt_text: image.altText,
  }));
}

function toVariant(item: AcpItem) {
  const options = [
    ...(item.color ? [{ name: "Color", value: item.color }] : []),
    ...(item.size ? [{ name: "Size", value: item.size }] : []),
  ];
  return {
    id: item.id,
    title: [item.product.title, options.map((option) => option.value).join(" / ")]
      .filter(Boolean)
      .join(" - "),
    url: absoluteUrl(`/products/${item.product.handle}`),
    price: { amount: item.unitAmount, currency: "USD" },
    availability: {
      available: item.available,
      status: item.available ? "in_stock" : "out_of_stock",
    },
    ...(item.product.productType ? { categories: [{ value: item.product.productType }] } : {}),
    variant_options: options,
    media: media(item.product, item.color),
    seller: SELLER,
  };
}

function toProduct(product: SimpleProduct) {
  return {
    id: product.handle,
    title: product.title,
    ...(product.description ? { description: { plain: product.description } } : {}),
    url: absoluteUrl(`/products/${product.handle}`),
    media: media(product),
    variants: listItems(product).map(toVariant),
  };
}

export async function GET(request: NextRequest) {
  const products = getAllProducts()
    .map(toProduct)
    .filter((product) => product.variants.length > 0);

  return NextResponse.json(
    { products },
    {
      headers: {
        ...getCorsHeaders(request.headers.get("origin")),
        "Cache-Control": "public, max-age=300",
      },
    }
  );
}

export function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: getCorsHeaders(request.headers.get("origin")),
  });
}

export const runtime = "nodejs";
