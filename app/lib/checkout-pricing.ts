import type Stripe from "stripe";
import { getAllProducts, type SimpleProduct } from "./catalog";

/**
 * Shape of the cart items posted by the browser. Every field is treated as
 * untrusted input: only `variantId` and `quantity` are used, and the price is
 * always resolved server-side from the catalog (never taken from the client).
 */
export type IncomingCartItem = {
  variantId?: unknown;
  quantity?: unknown;
};

export type ValidatedCheckout = {
  lineItems: Stripe.Checkout.SessionCreateParams.LineItem[];
  subtotalCents: number;
};

// Guardrails against abusive payloads.
const MAX_LINE_ITEMS = 100;
const MAX_QUANTITY_PER_ITEM = 100;

class CheckoutValidationError extends Error {}

function findVariant(products: SimpleProduct[], variantId: string) {
  for (const product of products) {
    const edge = product.variants.edges.find(
      (variantEdge) => variantEdge.node.id === variantId
    );
    if (edge) {
      return { product, variant: edge.node };
    }
  }
  return null;
}

/**
 * Build Stripe line items and a subtotal from a client cart using only the
 * authoritative catalog. Prices, titles and images always come from the
 * server-side catalog so a tampered client payload cannot change what is
 * charged. Throws {@link CheckoutValidationError} for malformed or unknown
 * items so the caller can return a 400.
 */
export function buildValidatedCheckout(
  items: IncomingCartItem[]
): ValidatedCheckout {
  if (!Array.isArray(items) || items.length === 0) {
    throw new CheckoutValidationError("Cart is empty");
  }
  if (items.length > MAX_LINE_ITEMS) {
    throw new CheckoutValidationError("Too many items in cart");
  }

  // Human storefront only — getAllProducts() excludes agent-only SKUs.
  const products = getAllProducts();
  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];
  let subtotalCents = 0;

  for (const item of items) {
    const variantId =
      typeof item.variantId === "string" ? item.variantId.trim() : "";
    if (!variantId) {
      throw new CheckoutValidationError("Missing variantId");
    }

    const quantity = Number(item.quantity);
    if (
      !Number.isInteger(quantity) ||
      quantity < 1 ||
      quantity > MAX_QUANTITY_PER_ITEM
    ) {
      throw new CheckoutValidationError("Invalid quantity");
    }

    const match = findVariant(products, variantId);
    if (!match) {
      throw new CheckoutValidationError(`Unknown variant: ${variantId}`);
    }

    const { product, variant } = match;
    const unitAmountCents = Math.round(parseFloat(variant.price.amount) * 100);
    if (!Number.isFinite(unitAmountCents) || unitAmountCents < 0) {
      throw new CheckoutValidationError(
        `Invalid catalog price for variant: ${variantId}`
      );
    }

    subtotalCents += unitAmountCents * quantity;

    // Prefer a pre-synced Stripe price ID; otherwise fall back to price_data
    // built from the catalog price.
    if (variant.stripePriceId) {
      lineItems.push({ price: variant.stripePriceId, quantity });
    } else {
      const imageUrl = product.images.edges[0]?.node.url || "";
      const fullImageUrl = imageUrl.startsWith("http")
        ? imageUrl
        : `${process.env.NEXT_PUBLIC_SITE_URL || ""}${imageUrl}`;

      lineItems.push({
        price_data: {
          currency: "usd",
          product_data: {
            name: `${product.title} - ${variant.title}`,
            images: fullImageUrl.startsWith("http") ? [fullImageUrl] : [],
          },
          unit_amount: unitAmountCents,
        },
        quantity,
      });
    }
  }

  return { lineItems, subtotalCents };
}

export { CheckoutValidationError };
