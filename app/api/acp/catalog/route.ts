import { NextResponse } from "next/server";
import { getAllProducts } from "@/app/lib/catalog";

function mapProduct(product: ReturnType<typeof getAllProducts>[number]) {
  const variants = product.variants.edges.map((edge) => ({
    id: edge.node.id,
    title: edge.node.title,
    available: edge.node.availableForSale,
    price: {
      amount: parseFloat(edge.node.price.amount),
      currencyCode: "USD" as const,
    },
    options: (edge.node.selectedOptions || []).map((option) => ({
      name: option.name,
      value: option.value,
    })),
  }));

  const options = (product.options || []).map((option) => ({
    name: option.name,
    values: option.values,
  }));

  return {
    id: product.id,
    handle: product.handle,
    title: product.title,
    description: product.description,
    descriptionHtml: product.descriptionHtml,
    createdAt: product.createdAt,
    price: {
      amount: parseFloat(product.priceRange.minVariantPrice.amount),
      currencyCode: "USD" as const,
    },
    images: product.images.edges.map((edge) => ({
      url: edge.node.url,
      altText: edge.node.altText,
    })),
    tags: product.tags,
    productType: product.productType,
    variants,
    options,
  };
}

export async function GET() {
  const products = getAllProducts().map(mapProduct);
  return NextResponse.json({
    protocol: "acp-draft-2024-12",
    catalog: {
      currencyCode: "USD" as const,
      products,
    },
  });
}
