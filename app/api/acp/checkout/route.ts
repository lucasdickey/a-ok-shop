import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";

import { getCorsHeaders } from "@/app/lib/cors";
import { createStoreCheckoutSession, parseCartItems, type CartItemInput } from "@/app/lib/store-checkout";
import { getStripeClient } from "@/app/lib/stripe-client";

// Agent checkout (ACP): the same Stripe checkout as the store's cart, so agent orders
// are priced from the catalog, carry size and color, and pay the same shipping.

type CheckoutRequest = {
  items: CartItemInput[];
  success_url?: string;
  cancel_url?: string;
  metadata?: Record<string, string>;
  customer_email?: string;
  locale?: Stripe.Checkout.SessionCreateParams.Locale;
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

/** Return addresses must be full web addresses; anything else is ignored. */
function webAddress(value: unknown) {
  return typeof value === "string" && /^https?:\/\//.test(value) ? value : undefined;
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

  const data = payload as Record<string, unknown> & {
    cart?: { items?: unknown };
    customer?: { email?: unknown };
  };

  const items = parseCartItems(data.cart?.items);
  if (!items) {
    throw new Error(
      "`cart.items` must be a non-empty array of { variantId, quantity (1-20), size, color }; tees and hoodies need a size"
    );
  }

  const email = data.customer?.email;
  return {
    items,
    success_url: webAddress(data.success_url ?? data.successUrl),
    cancel_url: webAddress(data.cancel_url ?? data.cancelUrl),
    metadata: normaliseMetadata(data.metadata),
    customer_email: typeof email === "string" && email ? email : undefined,
    locale: typeof data.locale === "string" ? (data.locale as CheckoutRequest["locale"]) : undefined,
  };
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  const headers = getCorsHeaders(origin);

  const stripe = getStripeClient();
  if (!stripe) {
    console.error("STRIPE_SECRET_KEY is not configured");
    return NextResponse.json(
      { error: "Stripe is not configured" },
      { status: 500, headers }
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
      { status: 400, headers }
    );
  }

  try {
    const result = await createStoreCheckoutSession(stripe, payload.items, {
      baseUrl: resolveBaseUrl(request),
      successUrl: payload.success_url,
      cancelUrl: payload.cancel_url,
      customerEmail: payload.customer_email,
      locale: payload.locale,
      metadata: {
        ...payload.metadata,
        protocol: "acp-draft-2024-12",
        source: "acp-api",
        endpoint: "checkout",
        origin: origin || "unknown",
      },
      idempotencyKey: request.headers.get("idempotency-key") || undefined,
    });

    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 400, headers });
    }

    const { session } = result;
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
      { headers }
    );
  } catch (error) {
    // Log error type and message without sensitive details
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error creating ACP checkout session:", errorMessage);

    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500, headers }
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
