import { NextRequest, NextResponse } from "next/server";
import { getStripeClient } from "@/app/lib/stripe-client";
import { CartValidationError } from "@/app/lib/catalog";
import {
  createStorefrontCheckoutSession,
  resolveBaseUrl,
} from "@/app/lib/stripe-checkout";

export async function POST(request: NextRequest) {
  const stripe = getStripeClient();
  if (!stripe) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 500 });
  }

  let items: unknown;
  try {
    ({ items } = await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  try {
    // Prices come from the catalog, not the request body.
    const session = await createStorefrontCheckoutSession({
      stripe,
      rawItems: items,
      source: "a-ok-shop-catalog",
      baseUrl: resolveBaseUrl(request),
      successPath: "/checkout/success",
      cancelPath: "/products",
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    // Cart validation problems are the caller's fault and are safe to surface.
    if (error instanceof CartValidationError) {
      console.warn("Rejected catalog checkout:", error.message);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    console.error("Error creating checkout session:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
