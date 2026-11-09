import { NextRequest, NextResponse } from "next/server";
import { getStripeClient } from "@/app/lib/stripe-client";
import {
  createStoreCheckoutSession,
  parseCartItems,
  type ServerPricedLine,
} from "@/app/lib/store-checkout";
import {
  MONTHLY_DEAL,
  isMonthlyDealVariant,
  monthlyDealVariantId,
} from "@/app/lib/monthly-deal";

/*
 * Checkout from the monthly deals page. Prices come from the server, never from the
 * browser: the deal hoodie is priced from app/lib/monthly-deal.ts, and anything else in
 * the cart is priced from the catalog, the same way the main store checkout does it.
 */

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

    // Only ids, sizes, colors and quantities are read from the browser. Any title,
    // price or subtotal it sends is ignored.
    const body = await request.json().catch(() => null);
    const items = parseCartItems(body?.items);
    if (!items) {
      return NextResponse.json(
        { error: "Your cart is empty or has an invalid item" },
        { status: 400 }
      );
    }

    const catalogItems = items.filter((item) => !isMonthlyDealVariant(item.variantId));
    const dealLines: ServerPricedLine[] = [];
    const unitAmountCents = Math.round(MONTHLY_DEAL.price * 100);

    for (const item of items) {
      if (!isMonthlyDealVariant(item.variantId)) continue;
      const { size, color } = item;
      if (
        !size ||
        !color ||
        !MONTHLY_DEAL.sizes.includes(size) ||
        !MONTHLY_DEAL.colors.includes(color) ||
        item.variantId !== monthlyDealVariantId(size, color)
      ) {
        return NextResponse.json(
          { error: `${MONTHLY_DEAL.title} isn't available in that size or color` },
          { status: 400 }
        );
      }
      const image = MONTHLY_DEAL.images[0];
      dealLines.push({
        unitAmountCents,
        quantity: item.quantity,
        lineItem: {
          price_data: {
            currency: "usd",
            product_data: {
              name: `${MONTHLY_DEAL.title} - ${color} / ${size}`,
              images: image.startsWith("http") ? [image] : [],
              metadata: { size, color, variantId: item.variantId, sku: "" },
            },
            unit_amount: unitAmountCents,
          },
          quantity: item.quantity,
        },
      });
    }

    const baseUrl = getBaseUrl(request);
    const result = await createStoreCheckoutSession(stripe, catalogItems, {
      baseUrl,
      successUrl: `${baseUrl}/monthly-deals/success?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${baseUrl}/monthly-deals`,
      metadata: { source: "monthly-deals", month: MONTHLY_DEAL.month },
      serverPricedLines: dealLines,
    });
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ url: result.session.url });
  } catch (error) {
    console.error("Error creating checkout session:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
