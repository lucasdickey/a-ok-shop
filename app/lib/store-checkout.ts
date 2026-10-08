import type Stripe from "stripe";
import { getAllProducts, isSameId, type SimpleProduct } from "@/app/lib/catalog";
import { getClothingSizes, isClothing } from "@/app/lib/sizes";

/*
 * Turns a cart into a Stripe Checkout Session. Shared by the store's own checkout
 * (app/api/catalog/checkout) and the agent checkout (app/api/acp/checkout), so both
 * price items from the catalog, record size and color on the order, and charge the
 * same shipping.
 */

const FREE_SHIPPING_THRESHOLD_CENTS = 5000;
const FLAT_SHIPPING_CENTS = 999;
export const MAX_QUANTITY_PER_ITEM = 20;
/** We only ship to these countries. */
export const SHIPPING_COUNTRIES = ["US", "CA"] as const;

/** Flat-rate shipping, free from $50. */
export function shippingCentsFor(subtotalCents: number): number {
  return subtotalCents < FREE_SHIPPING_THRESHOLD_CENTS ? FLAT_SHIPPING_CENTS : 0;
}

export type CartItemInput = {
  variantId: string;
  quantity: number;
  size?: string;
  color?: string;
};

export type ProductVariant = SimpleProduct["variants"]["edges"][number]["node"];

/** Checks the shape of cart items. Returns null if anything is missing or out of range. */
export function parseCartItems(raw: unknown): CartItemInput[] | null {
  if (!Array.isArray(raw) || raw.length === 0) return null;

  const items: CartItemInput[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") return null;
    const { variantId, quantity, size, color } = entry as Record<string, unknown>;
    if (typeof variantId !== "string" || !variantId) return null;
    if (
      typeof quantity !== "number" ||
      !Number.isInteger(quantity) ||
      quantity < 1 ||
      quantity > MAX_QUANTITY_PER_ITEM
    ) {
      return null;
    }
    items.push({
      variantId,
      quantity,
      size: typeof size === "string" && size ? size : undefined,
      color: typeof color === "string" && color ? color : undefined,
    });
  }
  return items;
}

export function getOption(variant: ProductVariant, name: string): string | undefined {
  return variant.selectedOptions?.find(
    (option) => option.name.toLowerCase() === name
  )?.value;
}

type Resolved = { product: SimpleProduct; variant: ProductVariant; size?: string };

/**
 * Resolve the variant the customer actually picked, by color. Clothing is
 * printed on demand in its supported sizes; the chosen size is validated
 * against the garment blank and recorded on the order.
 */
export function resolveVariant(
  products: SimpleProduct[],
  item: CartItemInput
): Resolved | { error: string } | null {
  const product = products.find((p) =>
    p.variants.edges.some((v) => isSameId(v.node.id, item.variantId))
  );
  if (!product) return null;

  let size: string | undefined;
  if (isClothing(product.productType, product.tags)) {
    // Only accept known sizes: this value ends up in Stripe metadata and the owner's email.
    if (!item.size) return { error: `Choose a size for ${product.title}` };
    if (!getClothingSizes(product).includes(item.size)) {
      return { error: `${item.size.slice(0, 10)} is no longer offered for ${product.title}` };
    }
    size = item.size;
  }

  const allVariants = product.variants.edges.map((v) => v.node);
  // A sold-out variant is never swapped for another one, unless the shopper's color
  // points elsewhere (the id is then only a stale pointer from the product page).
  const requested = allVariants.find((v) => isSameId(v.id, item.variantId));
  if (
    requested &&
    !requested.availableForSale &&
    (!item.color || getOption(requested, "color") === item.color)
  ) {
    return null;
  }

  const variants = allVariants.filter((v) => v.availableForSale);
  const matchColor = variants.some((v) => getOption(v, "color"));
  // With no color given (agents may send only a variant ID), keep the requested variant's color.
  const color = item.color || (requested && getOption(requested, "color"));
  const matchesColor = (variant: ProductVariant) =>
    !matchColor || !color || getOption(variant, "color") === color;

  // Prefer a variant whose size also matches (some products carry sizes in the catalog),
  // so variantId and sku agree with the size recorded on the order.
  const variant =
    (size && variants.find((v) => matchesColor(v) && getOption(v, "size") === size)) ||
    variants.find((v) => isSameId(v.id, item.variantId) && matchesColor(v)) ||
    variants.find(matchesColor);

  return variant ? { product, variant, size } : null;
}

export type CheckoutOptions = {
  baseUrl: string;
  /** Where Stripe sends the shopper afterwards. Default: the shop's own pages. */
  successUrl?: string;
  cancelUrl?: string;
  customerEmail?: string;
  locale?: Stripe.Checkout.SessionCreateParams.Locale;
  /** Extra notes on the order; `source` defaults to "a-ok-shop-catalog". */
  metadata?: Record<string, string>;
  idempotencyKey?: string;
};

/**
 * Prices the cart from the server-side catalog (never from the client) and creates the
 * Stripe Checkout Session. Returns an error message for the shopper if an item can't be sold.
 */
export async function createStoreCheckoutSession(
  stripe: Stripe,
  items: CartItemInput[],
  options: CheckoutOptions
): Promise<{ session: Stripe.Checkout.Session } | { error: string }> {
  // Check if Stripe Tax is enabled (requires tax registration in Stripe Dashboard)
  const automaticTaxEnabled = process.env.STRIPE_AUTOMATIC_TAX_ENABLED === "true";

  const products = getAllProducts();
  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];
  let subtotalCents = 0;

  for (const item of items) {
    const resolved = resolveVariant(products, item);
    if (resolved && "error" in resolved) return { error: resolved.error };
    if (!resolved) return { error: "An item in your cart is no longer available" };

    const { product, variant } = resolved;
    const size = resolved.size || "";
    const unitAmount = Math.round(parseFloat(variant.price.amount) * 100);
    if (!Number.isFinite(unitAmount) || unitAmount <= 0) {
      return { error: "An item in your cart has an invalid price" };
    }
    subtotalCents += unitAmount * item.quantity;

    const image = product.images.edges[0]?.node.url;
    lineItems.push({
      price_data: {
        currency: "usd",
        product_data: {
          name: `${product.title} - ${[getOption(variant, "color") || variant.title, size]
            .filter(Boolean)
            .join(" / ")}`,
          images: image && image.startsWith("http") ? [image] : [],
          metadata: {
            size,
            color: getOption(variant, "color") || "",
            variantId: variant.id,
            sku: variant.sku || "",
          },
        },
        unit_amount: unitAmount,
      },
      quantity: item.quantity,
    });
  }

  const shippingCents = shippingCentsFor(subtotalCents);

  const session = await stripe.checkout.sessions.create(
    {
      line_items: lineItems,
      mode: "payment",
      success_url:
        options.successUrl || `${options.baseUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: options.cancelUrl || `${options.baseUrl}/products`,
      shipping_address_collection: {
        allowed_countries: [...SHIPPING_COUNTRIES],
      },
      shipping_options: [
        {
          shipping_rate_data: {
            type: "fixed_amount",
            display_name: shippingCents > 0 ? "Standard shipping" : "Free shipping",
            fixed_amount: { amount: shippingCents, currency: "usd" },
          },
        },
      ],
      phone_number_collection: { enabled: true },
      // Lets shoppers enter the code they win in Run, Human, Run! (created by /api/discount).
      allow_promotion_codes: true,
      customer_creation: "always",
      customer_email: options.customerEmail,
      locale: options.locale,
      metadata: {
        source: "a-ok-shop-catalog",
        ...options.metadata,
      },
      // Only enable automatic tax if configured in Stripe Dashboard
      ...(automaticTaxEnabled && {
        automatic_tax: {
          enabled: true,
        },
      }),
      // Custom branding
      custom_text: {
        submit: {
          message:
            "Items ship within 3-5 business days after payment confirmation.",
        },
      },
    },
    options.idempotencyKey ? { idempotencyKey: options.idempotencyKey } : undefined
  );

  return { session };
}
