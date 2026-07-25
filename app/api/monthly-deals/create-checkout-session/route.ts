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
      source: "monthly-deals",
      baseUrl: resolveBaseUrl(request),
      successPath: "/monthly-deals/success",
      cancelPath: "/monthly-deals",
      metadata: {
        month: new Date().toISOString().slice(0, 7),
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    if (error instanceof CartValidationError) {
      console.warn("Rejected monthly deals checkout:", error.message);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    console.error("Error creating checkout session:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
