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

    if (!sessionId) {
      return NextResponse.json(
        { error: "Session ID is required" },
        { status: 400 }
      );
    }

    const session = await stripeClient.checkout.sessions.retrieve(sessionId, {
      expand: ["line_items", "customer", "total_details"]
    });

    return NextResponse.json(session);
  } catch (error) {
    console.error("Error retrieving checkout session:", error);
    return NextResponse.json(
      { error: "Failed to retrieve session" },
      { status: 500 }
    );
  }
}