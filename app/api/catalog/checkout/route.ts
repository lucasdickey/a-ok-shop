import { NextRequest, NextResponse } from "next/server";
import { getStripeClient } from "@/app/lib/stripe-client";
import { createStoreCheckoutSession, parseCartItems } from "@/app/lib/store-checkout";

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

    const result = await createStoreCheckoutSession(stripe, items, { baseUrl: getBaseUrl(request) });
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
