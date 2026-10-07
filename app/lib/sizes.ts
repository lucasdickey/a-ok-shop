// Kept separate from catalog.ts so client components can use it without bundling the catalog.

/** Default sizes for clothing printed on demand. Individual blanks can restrict this list. */
export const CLOTHING_SIZES: readonly string[] = ["XS", "S", "M", "L", "XL", "2XL"];

/** Tees, hoodies and crewneck sweatshirts take a size. */
export function isClothing(productType: string, tags: readonly string[] = []): boolean {
  return [productType, ...tags].some((value) => {
    const text = value.toLowerCase();
    return text.includes("t-shirt") || text.includes("tshirt") || text.includes("hoodie") || text.includes("sweatshirt");
  });
}

/** Use a blank's supported sizes when specified, keeping the existing default otherwise. */
export function getClothingSizes(product: { supportedSizes?: readonly string[] }): readonly string[] {
  return product.supportedSizes ?? CLOTHING_SIZES;
}
