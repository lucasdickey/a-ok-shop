/**
 * Shared Stripe Checkout Session creation for the storefront.
 *
 * Both the main catalog and monthly deals funnel through here so that pricing,
 * shipping and metadata rules stay in one place. Prices are always resolved
 * from the bundled catalog — never from the request body.
 */

import type Stripe from "stripe";
import { resolveCart, type ResolvedCart } from "./catalog";
import { resolveMonthlyDealCart } from "./monthly-deal";

// Orders at or above this subtotal ship free.
export const FREE_SHIPPING_THRESHOLD_CENTS = 5000;
export const FLAT_SHIPPING_RATE_CENTS = 999;

export type CheckoutSource = "a-ok-shop-catalog" | "monthly-deals";

export type CreateCheckoutSessionOptions = {
  stripe: Stripe;
  rawItems: unknown;
  source: CheckoutSource;
  baseUrl: string;
  successPath: string;
  cancelPath: string;
  metadata?: Record<string, string>;
};

function toLineItem(
  item: ResolvedCart["items"][number]
): Stripe.Checkout.SessionCreateParams.LineItem {
  // Prefer the synced Stripe price so the amount is enforced by Stripe itself.
  if (item.stripePriceId) {
    return { price: item.stripePriceId, quantity: item.quantity };
  }

  return {
    price_data: {
      currency: "usd",
      product_data: {
        name: item.title,
        images: item.imageUrl ? [item.imageUrl] : [],
        metadata: {
          size: item.size || "",
          color: item.color || "",
          variantId: item.variantId,
        },
      },
      unit_amount: item.unitAmount,
    },
    quantity: item.quantity,
  };
}

function shippingOptions(
  subtotal: number
): Stripe.Checkout.SessionCreateParams.ShippingOption[] {
  const amount =
    subtotal >= FREE_SHIPPING_THRESHOLD_CENTS ? 0 : FLAT_SHIPPING_RATE_CENTS;

  return [
    {
      shipping_rate_data: {
        type: "fixed_amount",
        display_name: amount === 0 ? "Free shipping" : "Standard shipping",
        fixed_amount: { amount, currency: "usd" },
        delivery_estimate: {
          minimum: { unit: "business_day", value: 3 },
          maximum: { unit: "business_day", value: 5 },
        },
      },
    },
  ];
}

// Stripe rejects metadata values over 500 characters.
function buildCartMetadata(cart: ResolvedCart): Record<string, string> {
  const summary = cart.items
    .map((item) => `${item.variantId}x${item.quantity}`)
    .join(",");

  return {
    itemCount: String(
      cart.items.reduce((count, item) => count + item.quantity, 0)
    ),
    ...(summary.length <= 500 ? { cart: summary } : {}),
  };
}

export async function createStorefrontCheckoutSession({
  stripe,
  rawItems,
  source,
  baseUrl,
  successPath,
  cancelPath,
  metadata = {},
}: CreateCheckoutSessionOptions): Promise<Stripe.Checkout.Session> {
  const cart =
    source === "monthly-deals"
      ? resolveMonthlyDealCart(rawItems)
      : resolveCart(rawItems);

  // Stripe Tax only works once tax registrations exist in the Dashboard.
  const automaticTaxEnabled = process.env.STRIPE_AUTOMATIC_TAX_ENABLED === "true";

  const sessionMetadata: Record<string, string> = {
    source,
    ...buildCartMetadata(cart),
    ...metadata,
  };

  return stripe.checkout.sessions.create({
    line_items: cart.items.map(toLineItem),
    mode: "payment",
    success_url: `${baseUrl}${successPath}?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${baseUrl}${cancelPath}`,
    shipping_address_collection: {
      allowed_countries: ["US", "CA"],
    },
    shipping_options: shippingOptions(cart.subtotal),
    customer_creation: "always",
    metadata: sessionMetadata,
    // Mirror onto the PaymentIntent so charge-level events carry order context.
    payment_intent_data: {
      metadata: sessionMetadata,
      description: `A-OK Shop order (${source})`,
    },
    ...(automaticTaxEnabled && {
      automatic_tax: { enabled: true },
    }),
    custom_text: {
      submit: {
        message:
          "Items ship within 3-5 business days after payment confirmation.",
      },
    },
  });
}

// Resolve the public origin used for Stripe redirect URLs.
export function resolveBaseUrl(request: Request): string {
  const host = request.headers.get("host") || "localhost:3000";
  const protocol = host.startsWith("localhost") ? "http" : "https";

  return (
    process.env.SITE_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : `${protocol}://${host}`)
  );
}
