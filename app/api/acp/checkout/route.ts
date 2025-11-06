import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

import { createCheckoutLineItems } from "@/app/lib/catalog";
import { getCorsHeaders } from "@/app/lib/cors";

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
  success_url?: string;
  cancel_url?: string;
  metadata?: Record<string, string>;
  customer?: {
    email?: string;
  };
  locale?: string;
  shipping_address_collection?: string[];
};

function normaliseMetadata(value: unknown) {
  if (!value) {
    return undefined;
  }

  if (typeof value !== "object" || Array.isArray(value)) {
    throw new Error("`metadata` must be an object with string values");
  }

  const metadata: Record<string, string> = {};
  for (const [key, raw] of Object.entries(value)) {
    if (typeof raw === "undefined" || raw === null) {
      continue;
    }

    metadata[key] = String(raw);
  }

  return metadata;
}

function resolveBaseUrl(request: NextRequest) {
  const forwardedProto = request.headers.get("x-forwarded-proto");
  const host = request.headers.get("host") || "localhost:3000";
  const protocol =
    forwardedProto || (host.includes("localhost") ? "http" : "https");

  return (
    process.env.SITE_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : `${protocol}://${host}`)
  );
}

function parseRequest(payload: unknown): CheckoutRequest {
  if (!payload || typeof payload !== "object") {
    throw new Error("Request body must be a JSON object");
  }

  const data = payload as Partial<CheckoutRequest> & {
    successUrl?: string;
    cancelUrl?: string;
    shippingAddressCollection?: string[];
  };

  if (!data.cart || !Array.isArray(data.cart.items)) {
    throw new Error("`cart.items` is required and must be an array");
  }

  const normalisedItems = data.cart.items.map((item) => {
    if (!item || typeof item !== "object") {
      throw new Error("Each cart item must be an object");
    }

    if (!item.variantId || typeof item.variantId !== "string") {
      throw new Error("Each cart item requires a `variantId`");
    }

    if (
      typeof item.quantity !== "number" ||
      !Number.isInteger(item.quantity) ||
      item.quantity <= 0
    ) {
      throw new Error("Each cart item requires a positive integer quantity");
    }

    return {
      variantId: item.variantId,
      quantity: item.quantity,
    };
  });

  if (normalisedItems.length === 0) {
    throw new Error("Cart must contain at least one item");
  }

  return {
    cart: { items: normalisedItems },
    success_url: data.success_url ?? data.successUrl,
    cancel_url: data.cancel_url ?? data.cancelUrl,
    metadata: normaliseMetadata(data.metadata),
    customer: data.customer,
    locale: data.locale,
    shipping_address_collection:
      data.shipping_address_collection ?? data.shippingAddressCollection,
  };
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
    const body = await request.json();
    payload = parseRequest(body);
  } catch (error) {
    console.error("Invalid ACP checkout payload", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invalid JSON payload" },
      { status: 400 }
    );
  }

  let lineItems: Stripe.Checkout.SessionCreateParams.LineItem[];

  try {
    lineItems = createCheckoutLineItems(
      payload.cart.items
    ) as Stripe.Checkout.SessionCreateParams.LineItem[];
  } catch (error) {
    console.error("Invalid line items for ACP checkout", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invalid cart items" },
      { status: 400 }
    );
  }

  try {
    const baseUrl = resolveBaseUrl(request);

    const successUrl =
      payload.success_url ||
      `${baseUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = payload.cancel_url || `${baseUrl}/products`;

    const shippingCountries =
      payload.shipping_address_collection &&
      payload.shipping_address_collection.length > 0
        ? payload.shipping_address_collection
        : ["US", "CA"];

    const idempotencyKey = request.headers.get("idempotency-key") || undefined;

    const session = await stripe.checkout.sessions.create(
      {
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
          ...payload.metadata,
          protocol: "acp-draft-2024-12",
        },
      },
      idempotencyKey ? { idempotencyKey } : undefined
    );

    const origin = request.headers.get("origin");

    return NextResponse.json(
      {
        protocol: "acp-draft-2024-12",
        checkout_session: {
          id: session.id,
          status: session.status,
          url: session.url,
          expires_at: session.expires_at,
        },
      },
      {
        headers: getCorsHeaders(origin),
      }
    );
  } catch (error) {
    // Log error type and message without sensitive details
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error creating ACP checkout session:", errorMessage);

    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}

export function OPTIONS(request: NextRequest) {
  const origin = request.headers.get("origin");

  return new NextResponse(null, {
    status: 204,
    headers: getCorsHeaders(origin),
  });
}

export const runtime = "nodejs";
