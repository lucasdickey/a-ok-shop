import { NextRequest, NextResponse } from "next/server";
import { getStripeClient } from "@/app/lib/stripe-client";

// Mark as dynamic to prevent static rendering during build
export const dynamic = "force-dynamic";

/**
 * Order summary for the success page.
 *
 * Anyone holding a session id can call this, so it returns only what the
 * confirmation screen needs — never the full Stripe Session, which carries the
 * customer's email, address and payment intent.
 */
export async function GET(request: NextRequest) {
  try {
    const stripeClient = getStripeClient();
    if (!stripeClient) {
      return NextResponse.json(
        { error: "Stripe not configured" },
        { status: 500 }
      );
    }

    const sessionId = request.nextUrl.searchParams.get("session_id");

    if (!sessionId || !sessionId.startsWith("cs_")) {
      return NextResponse.json(
        { error: "A valid session ID is required" },
        { status: 400 }
      );
    }

    const session = await stripeClient.checkout.sessions.retrieve(sessionId, {
      expand: ["line_items"],
    });

    if (session.payment_status === "unpaid") {
      return NextResponse.json({ status: "pending" });
    }

    return NextResponse.json({
      status: "complete",
      orderId: session.id.slice(-12),
      amountTotal: session.amount_total,
      amountSubtotal: session.amount_subtotal,
      amountShipping: session.total_details?.amount_shipping ?? 0,
      amountTax: session.total_details?.amount_tax ?? 0,
      currency: session.currency,
      items: (session.line_items?.data || []).map((lineItem) => ({
        description: lineItem.description,
        quantity: lineItem.quantity,
        amountTotal: lineItem.amount_total,
      })),
    });
  } catch (error) {
    console.error("Error retrieving checkout session:", error);
    return NextResponse.json(
      { error: "Failed to retrieve session" },
      { status: 500 }
    );
  }
}
