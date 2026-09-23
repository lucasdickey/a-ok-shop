import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripeClient } from "@/app/lib/stripe-client";
import { getAllProducts, type SimpleProduct } from "@/app/lib/catalog";

const FREE_SHIPPING_THRESHOLD_CENTS = 5000;
const FLAT_SHIPPING_CENTS = 999;
const MAX_QUANTITY_PER_ITEM = 20;

// Sizes the product page offers for print-on-demand clothing whose variants carry no size.
// Kept in sync with app/products/[handle]/page.tsx.
const PRINT_ON_DEMAND_SIZES = ["2XS", "XS", "S", "M", "L", "XL", "2XL", "3XL"];

type CartItemInput = {
  variantId: string;
  quantity: number;
  size?: string;
  color?: string;
};

type ProductVariant = SimpleProduct["variants"]["edges"][number]["node"];

function parseCartItems(raw: unknown): CartItemInput[] | null {
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

function getOption(variant: ProductVariant, name: string): string | undefined {
  return variant.selectedOptions?.find(
    (option) => option.name.toLowerCase() === name
  )?.value;
}

/**
 * Resolve the variant the customer actually picked. The product page can send
 * a variantId that matches the chosen size but not the chosen color, so prefer
 * the variant whose options match the customer's size/color selection.
 *
 * Only options the product's variants actually carry are matched. Most clothing
 * is printed on demand with no size in its variants; for those the chosen size
 * is returned separately so it can be recorded on the order.
 */
function resolveVariant(
  products: SimpleProduct[],
  item: CartItemInput
): { product: SimpleProduct; variant: ProductVariant; size?: string } | null {
  const product = products.find((p) =>
    p.variants.edges.some((v) => v.node.id === item.variantId)
  );
  if (!product) return null;

  const variants = product.variants.edges.map((v) => v.node);
  const variantsHave = (name: string) => variants.some((v) => getOption(v, name));
  const matchSize = variantsHave("size");
  const matchColor = variantsHave("color");

  let printOnDemandSize: string | undefined;
  if (!matchSize && item.size) {
    // Only accept known sizes: this value ends up in Stripe metadata and the owner's email.
    if (!PRINT_ON_DEMAND_SIZES.includes(item.size)) return null;
    printOnDemandSize = item.size;
  }

  const matchesSelection = (variant: ProductVariant) =>
    (!matchSize || !item.size || getOption(variant, "size") === item.size) &&
    (!matchColor || !item.color || getOption(variant, "color") === item.color);

  const variant =
    variants.find((v) => v.id === item.variantId && matchesSelection(v)) ||
    variants.find(matchesSelection);

  return variant ? { product, variant, size: printOnDemandSize } : null;
}

function getBaseUrl(request: NextRequest): string {
  if (process.env.SITE_URL) return process.env.SITE_URL;
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  if (
    process.env.VERCEL_ENV === "production" &&
    process.env.VERCEL_PROJECT_PRODUCTION_URL
  ) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;

  const host = request.headers.get("host") || "localhost:3000";
  const protocol = host.includes("localhost") ? "http" : "https";
  return `${protocol}://${host}`;
}

export async function POST(request: NextRequest) {
  try {
    const stripe = getStripeClient();
    if (!stripe) {
      return NextResponse.json(
        { error: "Stripe not configured" },
        { status: 500 }
      );
    }

    const body = await request.json().catch(() => null);
    const items = parseCartItems(body?.items);

    if (!items) {
      return NextResponse.json(
        { error: "Invalid or empty cart" },
        { status: 400 }
      );
    }

    // Check if Stripe Tax is enabled (requires tax registration in Stripe Dashboard)
    const automaticTaxEnabled = process.env.STRIPE_AUTOMATIC_TAX_ENABLED === 'true';

    // Prices come from the server-side catalog, never from the client cart.
    const products = getAllProducts();
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];
    let subtotalCents = 0;

    for (const item of items) {
      const resolved = resolveVariant(products, item);
      if (!resolved || !resolved.variant.availableForSale) {
        return NextResponse.json(
          { error: "An item in your cart is no longer available" },
          { status: 400 }
        );
      }

      const { product, variant } = resolved;
      const size = getOption(variant, "size") || resolved.size || "";
      const unitAmount = Math.round(parseFloat(variant.price.amount) * 100);
      if (!Number.isFinite(unitAmount) || unitAmount <= 0) {
        return NextResponse.json(
          { error: "An item in your cart has an invalid price" },
          { status: 400 }
        );
      }
      subtotalCents += unitAmount * item.quantity;

      const image = product.images.edges[0]?.node.url;
      lineItems.push({
        price_data: {
          currency: "usd",
          product_data: {
            name: `${product.title} - ${variant.title}${resolved.size ? ` / ${resolved.size}` : ""}`,
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

    const shippingCents =
      subtotalCents < FREE_SHIPPING_THRESHOLD_CENTS ? FLAT_SHIPPING_CENTS : 0;

    const baseUrl = getBaseUrl(request);

    const session = await stripe.checkout.sessions.create({
      line_items: lineItems,
      mode: "payment",
      success_url: `${baseUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/products`,
      shipping_address_collection: {
        allowed_countries: ["US", "CA"],
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
      metadata: {
        source: "a-ok-shop-catalog",
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
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Error creating checkout session:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
