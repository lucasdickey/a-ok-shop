import { getAllProducts, isSameId, type SimpleProduct } from "@/app/lib/catalog";
import { getClothingSizes, isClothing } from "@/app/lib/sizes";
import { getOption, resolveVariant, type ProductVariant } from "@/app/lib/store-checkout";

/*
 * ACP items. An ACP checkout only takes `{ id, quantity }`, so every color and
 * size a shopper can pick gets its own item ID: the variant's number, plus the
 * size for clothing ("8755818758363-L"). Clothing is printed on demand, so every
 * size the garment offers is a separate, always-available item.
 */

export type AcpItem = {
  id: string;
  product: SimpleProduct;
  variant: ProductVariant;
  color?: string;
  size?: string;
  /** Price per unit in cents. */
  unitAmount: number;
  available: boolean;
};

function variantNumber(variantId: string): string {
  return variantId.match(/(\d+)(?!.*\d)/)?.[1] ?? variantId;
}

export function toCents(amount: string): number {
  return Math.round(parseFloat(amount) * 100);
}

function makeItem(product: SimpleProduct, variant: ProductVariant, size?: string): AcpItem {
  return {
    id: size ? `${variantNumber(variant.id)}-${size}` : variantNumber(variant.id),
    product,
    variant,
    color: getOption(variant, "color"),
    size,
    unitAmount: toCents(variant.price.amount),
    available: variant.availableForSale,
  };
}

/** Every item a shopper can buy for this product: one per color, times each size for clothing. */
export function listItems(product: SimpleProduct): AcpItem[] {
  const clothing = isClothing(product.productType, product.tags);
  return product.variants.edges.flatMap(({ node: variant }) => {
    if (!clothing) return [makeItem(product, variant)];
    // Some newer products carry the size in the catalog variant; the rest take any size the blank offers.
    const ownSize = getOption(variant, "size");
    const sizes = ownSize ? [ownSize] : getClothingSizes(product);
    return sizes.map((size) => makeItem(product, variant, size));
  });
}

/**
 * Looks up an ACP item ID. Uses the store checkout's own variant matching, so
 * agents get the same size checks and messages as shoppers on the site.
 * Returns an error for the shopper (e.g. a missing size), or null if the ID is unknown.
 */
export function findItem(itemId: string): AcpItem | { error: string } | null {
  const match = itemId.match(/^(\d+)(?:-([A-Za-z0-9]{1,5}))?$/);
  if (!match) return null;
  const [, number, size] = match;

  const products = getAllProducts();
  const resolved = resolveVariant(products, { variantId: number, quantity: 1, size });
  if (!resolved) {
    // Known but sold out, or not ours at all.
    const product = products.find((p) => p.variants.edges.some((v) => isSameId(v.node.id, number)));
    const variant = product?.variants.edges.find((v) => isSameId(v.node.id, number))?.node;
    return product && variant ? { ...makeItem(product, variant, size), id: itemId, available: false } : null;
  }
  if ("error" in resolved) return resolved;
  if (size && !resolved.size) return { error: `${resolved.product.title} doesn't come in sizes` };

  return { ...makeItem(resolved.product, resolved.variant, resolved.size), id: itemId };
}
