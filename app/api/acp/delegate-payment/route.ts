import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

import { getCorsHeaders } from "@/app/lib/cors";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

const stripe = stripeSecretKey
  ? new Stripe(stripeSecretKey, {
      apiVersion: "2023-10-16",
    })
  : null;

type DelegatePaymentRequest = {
  amount: number;
  currency?: string;
  payment_method?: string;
  customer?: string;
  customer_email?: string;
  metadata?: Record<string, string>;
  confirm?: boolean;
  description?: string;
  setup_future_usage?: "off_session" | "on_session";
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

function parseRequest(payload: unknown): DelegatePaymentRequest {
  if (!payload || typeof payload !== "object") {
    throw new Error("Request body must be a JSON object");
  }

  const data = payload as Partial<DelegatePaymentRequest> & {
    paymentMethodId?: string;
    customerId?: string;
    customerEmail?: string;
    setupFutureUsage?: "off_session" | "on_session";
  };

  if (typeof data.amount !== "number") {
    throw new Error("`amount` must be provided as a number in the smallest currency unit");
  }

  if (!Number.isInteger(data.amount) || data.amount <= 0) {
    throw new Error("`amount` must be a positive integer representing the smallest currency unit");
  }

  const paymentMethod = data.payment_method ?? data.paymentMethodId;

  if (data.confirm && !paymentMethod) {
    throw new Error("`payment_method` is required when `confirm` is true");
  }

  const metadata = normaliseMetadata(data.metadata);

  return {
    amount: data.amount,
    currency: data.currency ?? "usd",
    payment_method: paymentMethod,
    customer: data.customer ?? data.customerId,
    customer_email: data.customer_email ?? data.customerEmail,
    metadata,
    confirm: Boolean(data.confirm),
    description: data.description,
    setup_future_usage: data.setup_future_usage ?? data.setupFutureUsage,
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

  let payload: DelegatePaymentRequest;

  try {
    const body = await request.json();
    payload = parseRequest(body);
  } catch (error) {
    console.error("Invalid ACP delegate payment payload", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invalid JSON payload" },
      { status: 400 }
    );
  }

  try {
    const idempotencyKey = request.headers.get("idempotency-key") || undefined;

    const paymentIntent = await stripe.paymentIntents.create(
      {
        amount: payload.amount,
        currency: payload.currency?.toLowerCase(),
        customer: payload.customer,
        payment_method: payload.payment_method,
        confirm: Boolean(payload.confirm && payload.payment_method),
        automatic_payment_methods:
          payload.payment_method || payload.confirm
            ? undefined
            : { enabled: true },
        receipt_email: payload.customer_email,
        description: payload.description,
        setup_future_usage: payload.setup_future_usage,
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
        payment_intent: {
          id: paymentIntent.id,
          client_secret: paymentIntent.client_secret,
          status: paymentIntent.status,
          next_action: paymentIntent.next_action ?? undefined,
        },
      },
      {
        headers: getCorsHeaders(origin),
      }
    );
  } catch (error) {
    // Log error type and message without sensitive details
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error creating ACP delegate payment:", errorMessage);

    return NextResponse.json(
      { error: "Failed to create payment intent" },
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
