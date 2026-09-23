// Kept separate from catalog.ts so client components can use it without bundling the catalog.

/** Every tee and hoodie is printed on demand, so any of these sizes can be ordered. */
export const CLOTHING_SIZES: readonly string[] = ["XS", "S", "M", "L", "XL", "2XL"];

/** Tees and hoodies (including sweatshirts filed under either type) take a size. */
export function isClothing(productType: string, tags: readonly string[] = []): boolean {
  return [productType, ...tags].some((value) => {
    const text = value.toLowerCase();
    return text.includes("t-shirt") || text.includes("tshirt") || text.includes("hoodie");
  });
}
