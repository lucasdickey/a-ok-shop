import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripeClient } from "@/app/lib/stripe-client";
import {
  buildValidatedCheckout,
  CheckoutValidationError,
} from "@/app/lib/checkout-pricing";

// Free-shipping threshold and flat shipping fee, in cents.
const FREE_SHIPPING_THRESHOLD_CENTS = 5000;
const SHIPPING_FEE_CENTS = 999;

function resolveBaseUrl(request: NextRequest): string {
  const host = request.headers.get("host") || "localhost:3000";
  const protocol = host.includes("localhost") ? "http" : "https";
  return (
    process.env.SITE_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : `${protocol}://${host}`)
  );
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

    // Prices are resolved server-side from the catalog; the client-supplied
    // `price`/`subtotal` fields are intentionally ignored to prevent tampering.
    let lineItems: Stripe.Checkout.SessionCreateParams.LineItem[];
    let subtotalCents: number;
    try {
      ({ lineItems, subtotalCents } = buildValidatedCheckout(body?.items));
    } catch (error) {
      if (error instanceof CheckoutValidationError) {
        return NextResponse.json(
          { error: "Invalid cart contents" },
          { status: 400 }
        );
      }
      throw error;
    }

    const automaticTaxEnabled =
      process.env.STRIPE_AUTOMATIC_TAX_ENABLED === "true";

    // Add shipping if the authoritative subtotal is under the free threshold.
    if (subtotalCents < FREE_SHIPPING_THRESHOLD_CENTS) {
      lineItems.push({
        price_data: {
          currency: "usd",
          product_data: {
            name: "Shipping",
          },
          unit_amount: SHIPPING_FEE_CENTS,
        },
        quantity: 1,
      });
    }

    const baseUrl = resolveBaseUrl(request);

    const session = await stripe.checkout.sessions.create({
      line_items: lineItems,
      mode: "payment",
      success_url: `${baseUrl}/monthly-deals/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/monthly-deals`,
      shipping_address_collection: {
        allowed_countries: ["US", "CA"],
      },
      customer_creation: "always",
      metadata: {
        source: "monthly-deals",
        month: "2025-01",
      },
      // Only enable automatic tax if configured in Stripe Dashboard
      ...(automaticTaxEnabled && {
        automatic_tax: {
          enabled: true,
        },
      }),
      // Custom branding (if configured in Stripe Dashboard)
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
