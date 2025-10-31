import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

const stripe = stripeSecretKey
  ? new Stripe(stripeSecretKey, {
      apiVersion: "2025-09-30.clover",
    })
  : null;

type DelegatePaymentRequest = {
  amount: number;
  currency?: string;
  paymentMethodId?: string;
  customerId?: string;
  customerEmail?: string;
  metadata?: Record<string, string>;
  confirm?: boolean;
};

function validateRequest(body: DelegatePaymentRequest) {
  if (!body || typeof body.amount !== "number") {
    return "`amount` must be provided as a number of the smallest currency unit.";
  }

  if (!Number.isInteger(body.amount) || body.amount <= 0) {
    return "`amount` must be a positive integer representing the smallest currency unit.";
  }

  if (body.confirm && !body.paymentMethodId) {
    return "`paymentMethodId` is required when `confirm` is true.";
  }

  return null;
}

export async function POST(request: NextRequest) {
  if (!stripe) {
    console.error("STRIPE_SECRET_KEY is not configured");
    return NextResponse.json(
      { error: "Stripe is not configured" },
      { status: 500 }
    );
  }

  let body: DelegatePaymentRequest;

  try {
    body = await request.json();
  } catch (error) {
    console.error("Invalid JSON payload", error);
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const validationError = validateRequest(body);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: body.amount,
      currency: (body.currency || "usd").toLowerCase(),
      customer: body.customerId,
      payment_method: body.paymentMethodId,
      confirm: Boolean(body.confirm && body.paymentMethodId),
      automatic_payment_methods: { enabled: true },
      receipt_email: body.customerEmail,
      metadata: {
        protocol: "acp-draft-2024-12",
        ...body.metadata,
      },
    });

    return NextResponse.json({
      id: paymentIntent.id,
      clientSecret: paymentIntent.client_secret,
      status: paymentIntent.status,
    });
  } catch (error) {
    console.error("Error creating delegate payment", error);
    return NextResponse.json(
      { error: "Failed to create payment intent" },
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
