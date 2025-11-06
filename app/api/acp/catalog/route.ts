import { NextRequest, NextResponse } from "next/server";

import { getAllProducts } from "@/app/lib/catalog";
import { getCorsHeaders } from "@/app/lib/cors";

type CatalogProduct = ReturnType<typeof getAllProducts>[number];

type VariantNode = CatalogProduct["variants"]["edges"][number]["node"];

function normaliseImageUrl(url: string | null | undefined) {
  if (!url) {
    return null;
  }

  if (url.startsWith("http")) {
    return url;
  }

  const baseUrl =
    process.env.SITE_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    "http://localhost:3000";

  return `${baseUrl}${url}`;
}

function mapVariant(product: CatalogProduct, variant: VariantNode) {
  const attributes = (variant.selectedOptions || []).reduce<
    Record<string, string>
  >((acc, option) => {
    if (option?.name && option?.value) {
      acc[option.name] = option.value;
    }
    return acc;
  }, {});

  return {
    id: variant.id,
    title: variant.title,
    sku: variant.sku ?? undefined,
    availableForSale: Boolean(variant.availableForSale),
    pricing: {
      currency: product.priceRange.minVariantPrice.currencyCode,
      amount: parseFloat(variant.price.amount),
      compareAtAmount: variant.compareAtPrice
        ? parseFloat(variant.compareAtPrice.amount)
        : undefined,
    },
    attributes,
  };
}

function mapProduct(product: CatalogProduct) {
  const options = (product.options || []).map((option) => ({
    name: option.name,
    values: option.values,
  }));

  const variants = product.variants.edges.map((edge) =>
    mapVariant(product, edge.node)
  );

  const media = product.images.edges
    .map((edge) => {
      const url = normaliseImageUrl(edge.node.url);
      if (!url) {
        return null;
      }

      return {
        id: edge.node.id,
        type: "image" as const,
        url,
        altText: edge.node.altText ?? undefined,
      };
    })
    .filter((value): value is NonNullable<typeof value> => Boolean(value));

  return {
    id: product.id,
    handle: product.handle,
    title: product.title,
    description: product.description,
    descriptionHtml: product.descriptionHtml || undefined,
    productType: product.productType || undefined,
    tags: product.tags,
    options,
    variants,
    media,
    defaultPrice: {
      currency: product.priceRange.minVariantPrice.currencyCode,
      amount: parseFloat(product.priceRange.minVariantPrice.amount),
    },
    createdAt: product.createdAt,
    updatedAt: product.updatedAt ?? product.createdAt,
  };
}

type CatalogResponse = {
  protocol: string;
  merchant: {
    id: string;
    name: string;
    currency: string;
  };
  catalog: {
    products: Array<ReturnType<typeof mapProduct>>;
  };
};

export async function GET(request: NextRequest) {
  const products = getAllProducts();

  const response: CatalogResponse = {
    protocol: "acp-draft-2024-12",
    merchant: {
      id: process.env.NEXT_PUBLIC_SHOP_NAME || "a-ok-shop",
      name: process.env.NEXT_PUBLIC_SHOP_NAME || "A-OK Shop",
      currency:
        products[0]?.priceRange.minVariantPrice.currencyCode || "USD",
    },
    catalog: {
      products: products.map(mapProduct),
    },
  };

  const origin = request.headers.get("origin");

  return NextResponse.json(response, {
    headers: getCorsHeaders(origin),
  });
}

export function OPTIONS(request: NextRequest) {
  const origin = request.headers.get("origin");

  return new NextResponse(null, {
    status: 204,
    headers: getCorsHeaders(origin),
  });
}

export const runtime = "nodejs";
