/**
 * Monthly Deal product definition.
 *
 * This lives outside the Shopify/Stripe catalog, so it is defined here once and
 * shared by the storefront page and the checkout API. The server prices the
 * deal from this module — the browser never supplies an amount.
 */

import { CartValidationError, type ResolvedCart } from "./catalog";

export const MONTHLY_DEAL = {
  id: "monthly-deal-2025-01",
  title: "A-OK DAY 2 MONKEY HOODIE",
  description:
    "Simplified. Streamlined. Still A Little Scary. A hoodie designed to reflect the clean, evolving interfaces of modern LLMs with a focus on comfort and style. New look. Same depth. Fully backward compatible.",
  price: 50.0,
  originalPrice: 75.0,
  images: [
    "https://cdn.shopify.com/s/files/1/0732/5941/7819/files/a-ok-lids-front-modeled.png?v=1746932606",
    "https://cdn.shopify.com/s/files/1/0732/5941/7819/files/50PulloverHoodie.png?v=1746932606",
    "https://cdn.shopify.com/s/files/1/0732/5941/7819/files/Photo_on_5-6-25_at_10.16_AM.jpg?v=1746932588",
  ],
  sizes: ["2XS", "XS", "S", "M", "L", "XL", "2XL", "3XL"],
  colors: ["Black", "Navy", "Heather Grey"],
  features: [
    "Cozy fleece interior",
    "Simplified A-OK mascot on front",
    "Classic hoodie fit",
    "Designed for prompt engineers & digital therapists",
    "Limited monthly release",
  ],
} as const;

const MAX_QUANTITY_PER_LINE = 20;

// Variant ids are built as `${MONTHLY_DEAL.id}-${size}-${color}`.
export function monthlyDealVariantId(size: string, color: string): string {
  return `${MONTHLY_DEAL.id}-${size}-${color}`;
}

function parseVariantId(variantId: string): { size: string; color: string } {
  const prefix = `${MONTHLY_DEAL.id}-`;
  if (!variantId.startsWith(prefix)) {
    throw new CartValidationError(`Unknown monthly deal variant ${variantId}`);
  }

  const remainder = variantId.slice(prefix.length);
  const separatorIndex = remainder.indexOf("-");
  if (separatorIndex === -1) {
    throw new CartValidationError(`Unknown monthly deal variant ${variantId}`);
  }

  const size = remainder.slice(0, separatorIndex);
  const color = remainder.slice(separatorIndex + 1);

  if (!(MONTHLY_DEAL.sizes as readonly string[]).includes(size)) {
    throw new CartValidationError(`Unavailable size "${size}"`);
  }
  if (!(MONTHLY_DEAL.colors as readonly string[]).includes(color)) {
    throw new CartValidationError(`Unavailable color "${color}"`);
  }

  return { size, color };
}

// Resolve a submitted monthly deal cart against the definition above.
export function resolveMonthlyDealCart(rawItems: unknown): ResolvedCart {
  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    throw new CartValidationError("Cart is empty");
  }

  const unitAmount = Math.round(MONTHLY_DEAL.price * 100);

  const items = rawItems.map((rawItem: { variantId?: unknown; quantity?: unknown }) => {
    const variantId =
      typeof rawItem?.variantId === "string" ? rawItem.variantId.trim() : "";

    if (!variantId) {
      throw new CartValidationError("Cart item is missing a variantId");
    }

    const quantity = Number(rawItem?.quantity);
    if (!Number.isInteger(quantity) || quantity < 1) {
      throw new CartValidationError(`Invalid quantity for variant ${variantId}`);
    }
    if (quantity > MAX_QUANTITY_PER_LINE) {
      throw new CartValidationError(
        `Quantity for variant ${variantId} exceeds the ${MAX_QUANTITY_PER_LINE} item limit`
      );
    }

    const { size, color } = parseVariantId(variantId);

    return {
      variantId,
      quantity,
      title: `${MONTHLY_DEAL.title} - ${size} - ${color}`,
      size,
      color,
      stripePriceId: undefined,
      imageUrl: MONTHLY_DEAL.images[0],
      unitAmount,
    };
  });

  const subtotal = items.reduce(
    (total, item) => total + item.unitAmount * item.quantity,
    0
  );

  return { items, subtotal };
}
