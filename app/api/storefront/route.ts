import { NextResponse } from "next/server";
import { getAllProducts, getProductsByCategory } from "@/app/lib/catalog";
import { getChaosMonkeys } from "@/app/lib/chaos-monkeys";
import { CLOTHING_SIZES, isClothing } from "@/app/lib/sizes";

// What the storefront shows, for the in-page agent tools (components/WebMcpTools.tsx).
// Built from the same catalog as the shop pages, so it never lists agent-only items.
export const dynamic = "force-static";

const CATEGORIES = [
  { id: "t-shirts", label: "Tees" },
  { id: "hoodies", label: "Hoodies" },
  { id: "hats", label: "Hats" },
] as const;

export async function GET() {
  const categoryOf = new Map<string, string>();
  for (const category of CATEGORIES) {
    for (const product of getProductsByCategory(category.id)) {
      if (!categoryOf.has(product.id)) categoryOf.set(product.id, category.label);
    }
  }

  const products = getAllProducts().map((product) => {
    const variants = product.variants.edges.map(({ node }) => {
      const option = (name: string) =>
        node.selectedOptions?.find((o) => o.name.toLowerCase() === name)?.value;
      return { id: node.id, color: option("color"), size: option("size"), available: node.availableForSale };
    });
    const colorOption = product.options?.find((o) => o.name.toLowerCase() === "color")?.values ?? [];
    const sellableColors = colorOption.filter((color) => variants.some((v) => v.color === color && v.available));
    const images = product.images.edges.map(({ node }) => node);
    return {
      handle: product.handle,
      title: product.title,
      url: `/products/${product.handle}`,
      category: categoryOf.get(product.id) ?? product.productType,
      price: Number(product.priceRange.minVariantPrice.amount),
      currency: product.priceRange.minVariantPrice.currencyCode,
      description: product.description.slice(0, 400),
      image: images[0]?.url ?? null,
      colors: sellableColors.map((name) => ({
        name,
        swatch: product.swatches?.[name] ?? null,
        image: images.find((image) => image.color === name)?.url ?? null,
      })),
      sizes: isClothing(product.productType, product.tags) ? [...CLOTHING_SIZES] : [],
      variants,
    };
  });

  const chaosMonkeys = getChaosMonkeys().map((monkey) => ({
    id: monkey.id,
    title: monkey.title,
    slogan: monkey.slogan,
    joke: monkey.joke,
    date: monkey.date,
    image: monkey.image,
    url: `/chaos-monkeys#n${monkey.id}`,
  }));

  return NextResponse.json({ products, chaosMonkeys });
}
