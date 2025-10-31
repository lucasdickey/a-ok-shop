import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

import { createCheckoutLineItems } from "@/app/lib/catalog";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

const stripe = stripeSecretKey
  ? new Stripe(stripeSecretKey, {
      apiVersion: "2025-09-30.clover",
    })
  : null;

type CheckoutItem = {
  variantId: string;
  quantity: number;
};

type CheckoutRequest = {
  cart: {
    items: CheckoutItem[];
  };
  successUrl?: string;
  cancelUrl?: string;
  metadata?: Record<string, string>;
  customer?: {
    email?: string;
  };
  locale?: string;
  shippingAddressCollection?: string[];
};

function resolveBaseUrl(request: NextRequest) {
  const host = request.headers.get("host") || "localhost:3000";
  const protocol = host.includes("localhost") ? "http" : "https";
  return (
    process.env.SITE_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : `${protocol}://${host}`)
  );
}

export async function POST(request: NextRequest) {
  if (!stripe) {
    console.error("STRIPE_SECRET_KEY is not configured");
    return NextResponse.json(
      { error: "Stripe is not configured" },
      { status: 500 }
    );
  }

  let payload: CheckoutRequest;

  try {
    payload = await request.json();
  } catch (error) {
    console.error("Invalid JSON payload", error);
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const items = payload?.cart?.items || [];

  if (!items.length) {
    return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
  }

  try {
    const lineItems = createCheckoutLineItems(items) as Stripe.Checkout.SessionCreateParams.LineItem[];
    const baseUrl = resolveBaseUrl(request);

    const successUrl = payload.successUrl || `${baseUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = payload.cancelUrl || `${baseUrl}/products`;

    const shippingCountries = payload.shippingAddressCollection || ["US", "CA"];

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      automatic_tax: { enabled: true },
      allow_promotion_codes: true,
      line_items: lineItems,
      success_url: successUrl,
      cancel_url: cancelUrl,
      locale: payload.locale,
      customer_email: payload.customer?.email,
      shipping_address_collection: {
        allowed_countries: shippingCountries,
      },
      metadata: {
        protocol: "acp-draft-2024-12",
        ...payload.metadata,
      },
    });

    return NextResponse.json({
      id: session.id,
      url: session.url,
      expiresAt: session.expires_at,
      status: session.status,
    });
  } catch (error) {
    console.error("Error creating ACP checkout session", error);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}

export function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
