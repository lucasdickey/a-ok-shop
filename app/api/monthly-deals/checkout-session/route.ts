import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

// Initialize Stripe client lazily to avoid build-time errors
let stripe: Stripe | null = null;
function getStripe() {
  if (!stripe && process.env.STRIPE_SECRET_KEY) {
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2025-09-30.clover" as any,
    });
  }
  return stripe;
}

// Mark as dynamic to prevent static rendering during build
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const stripeClient = getStripe();
    if (!stripeClient) {
      return NextResponse.json(
        { error: "Stripe not configured" },
        { status: 500 }
      );
    }

    const sessionId = request.nextUrl.searchParams.get("session_id");

    // Only accept well-formed Checkout Session IDs.
    if (!sessionId || !sessionId.startsWith("cs_")) {
      return NextResponse.json(
        { error: "Valid session ID is required" },
        { status: 400 }
      );
    }

    const session = await stripeClient.checkout.sessions.retrieve(sessionId, {
      expand: ["line_items", "total_details"],
    });

    // Return only the fields the order-confirmation page needs. The full Stripe
    // session object contains internal identifiers and additional customer PII
    // that should not be exposed to the browser.
    const safeSession = {
      id: session.id,
      payment_status: session.payment_status,
      amount_subtotal: session.amount_subtotal,
      amount_total: session.amount_total,
      currency: session.currency,
      customer_details: session.customer_details
        ? {
            name: session.customer_details.name,
            email: session.customer_details.email,
          }
        : null,
      shipping_details: (session as any).shipping_details
        ? { address: (session as any).shipping_details.address }
        : null,
      total_details: session.total_details
        ? {
            amount_shipping: session.total_details.amount_shipping,
            amount_tax: session.total_details.amount_tax,
          }
        : null,
      line_items: session.line_items
        ? {
            data: session.line_items.data.map((item) => ({
              description: item.description,
              quantity: item.quantity,
              amount_total: item.amount_total,
            })),
          }
        : null,
    };

    return NextResponse.json(safeSession);
  } catch (error) {
    console.error("Error retrieving checkout session:", error);
    return NextResponse.json(
      { error: "Failed to retrieve session" },
      { status: 500 }
    );
  }
}
