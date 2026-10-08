import { createHash } from "crypto";
import Stripe from "stripe";

import { AcpError, invalid, type AcpResult } from "@/app/lib/acp/protocol";
import {
  PAYMENT_HANDLER_ID,
  applyCompletion,
  assertOpen,
  loadSession,
  priceSession,
  renderSession,
  saveSession,
  type Pricing,
  type StoredSession,
} from "@/app/lib/acp/sessions";
import { remove, setJsonIfAbsent } from "@/app/lib/acp/store";
import { absoluteUrl } from "@/app/lib/site";
import { getStripeClient } from "@/app/lib/stripe-client";

/*
 * Completing an ACP checkout: the agent sends a Stripe shared payment token
 * (spt_...) that the buyer granted to this shop. It is charged with a
 * PaymentIntent carrying the items and shipping address; the Stripe webhook
 * then sends the owner's order alert, as for store orders.
 */

// Stripe documents shared payment tokens on its preview API version. Override if Stripe moves it.
const SPT_API_VERSION = process.env.STRIPE_SPT_API_VERSION?.trim() || "2026-09-30.preview";
const LOCK_TTL_SECONDS = 120;

type Json = Record<string, unknown>;

function isObject(value: unknown): value is Json {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function readToken(body: Json): string {
  const payment = body.payment_data;
  if (!isObject(payment)) throw invalid("missing", "payment_data is required", "$.payment_data");
  if (payment.handler_id !== undefined && payment.handler_id !== PAYMENT_HANDLER_ID) {
    throw invalid("invalid", `Pay with the '${PAYMENT_HANDLER_ID}' payment handler`, "$.payment_data.handler_id");
  }
  const instrument = isObject(payment.instrument) ? payment.instrument : undefined;
  const credential = instrument && isObject(instrument.credential) ? instrument.credential : undefined;
  if (credential?.type !== undefined && credential.type !== "spt") {
    throw invalid("invalid", "The credential must be a Stripe shared payment token", "$.payment_data.instrument.credential.type");
  }
  // Older agents send the token as payment_data.token.
  const token = credential ? credential.token : payment.token;
  if (typeof token !== "string" || token.length > 255 || !/^spt_[A-Za-z0-9_]+$/.test(token)) {
    throw invalid("invalid", "A Stripe shared payment token (spt_...) is required", "$.payment_data.instrument.credential.token");
  }
  return token;
}

type ChargeOutcome = { paid: true; paymentIntentId: string } | { paid: false; message: string };

function buyerName(session: StoredSession): string {
  const buyer = session.buyer;
  return (
    buyer?.full_name ||
    [buyer?.first_name, buyer?.last_name].filter(Boolean).join(" ") ||
    session.fulfillmentDetails?.name ||
    session.fulfillmentDetails?.address?.name ||
    ""
  );
}

async function charge(stripe: Stripe, session: StoredSession, pricing: Pricing, token: string): Promise<ChargeOutcome> {
  const details = session.fulfillmentDetails ?? {};
  const address = details.address;
  const email = session.buyer?.email || details.email;

  const params = {
    amount: pricing.total,
    currency: "usd",
    confirm: true,
    // The installed stripe types predate shared payment tokens, hence the cast below.
    payment_method_data: { shared_payment_granted_token: token },
    description: `A-OK agent order ${session.id}`,
    receipt_email: email,
    // Stripe's own field, so the address shows on the payment and reaches the owner alert.
    shipping: address && {
      name: address.name,
      phone: details.phone_number,
      address: {
        line1: address.line_one,
        line2: address.line_two,
        city: address.city,
        state: address.state,
        postal_code: address.postal_code,
        country: address.country,
      },
    },
    metadata: {
      source: "acp",
      checkout_session_id: session.id,
      // "itemId*quantity,..." — the item ID carries the color and size. Fits Stripe's 500-character limit at 20 lines.
      items: pricing.lines.map((line) => `${line.item.id}*${line.quantity}`).join(","),
      amount_subtotal: String(pricing.subtotal),
      amount_shipping: String(pricing.shipping),
      customer_email: email ?? "",
      customer_name: buyerName(session).slice(0, 200),
      order_notes: session.orderNotes ?? "",
    },
  };

  try {
    const intent = await stripe.paymentIntents.create(params as unknown as Stripe.PaymentIntentCreateParams, {
      // One payment per session and token: a retry never charges twice, a new token after a decline can.
      idempotencyKey: `acp-${session.id}-${createHash("sha256").update(token).digest("hex").slice(0, 16)}`,
      apiVersion: SPT_API_VERSION,
    });

    if (intent.status === "succeeded" || intent.status === "processing") {
      return { paid: true, paymentIntentId: intent.id };
    }
    if (intent.status === "requires_action") {
      await stripe.paymentIntents.cancel(intent.id, {}, { apiVersion: SPT_API_VERSION }).catch(() => undefined);
      return {
        paid: false,
        message: "This card needs extra verification (3D Secure), which agent checkout doesn't support yet. Please use a different card.",
      };
    }
    return { paid: false, message: "The payment didn't go through. Please try a different payment method." };
  } catch (error) {
    if (error instanceof Stripe.errors.StripeCardError) {
      return { paid: false, message: error.message || "Your card was declined." };
    }
    if (error instanceof Stripe.errors.StripeInvalidRequestError) {
      // E.g. a token that expired, was already used, or is capped below the total.
      console.warn("[ACP] Stripe refused the payment token:", error.message);
      return { paid: false, message: `The payment token was refused: ${error.message}`.slice(0, 300) };
    }
    console.error("[ACP] Stripe error while completing:", error instanceof Error ? error.message : error);
    throw new AcpError(503, "service_unavailable", "payment_unavailable", "The payment service is unavailable; retry with the same Idempotency-Key");
  }
}

/** POST /checkout_sessions/{id}/complete */
export async function completeSession(id: string, owner: string, body: Json): Promise<AcpResult> {
  const token = readToken(body);
  const stripe = getStripeClient();
  if (!stripe) {
    throw new AcpError(503, "service_unavailable", "not_configured", "Payments aren't configured");
  }

  // One completion at a time per session, so two requests can't both charge.
  const lockKey = `acp:lock:${id}`;
  if (!(await setJsonIfAbsent(lockKey, true, LOCK_TTL_SECONDS))) {
    throw new AcpError(409, "invalid_request", "in_progress", "This checkout is already being completed", undefined, {}, {
      "Retry-After": "2",
    });
  }

  try {
    const session = await loadSession(id, owner);
    if (session.state === "completed") return { status: 200, body: renderSession(session) };
    assertOpen(session);
    applyCompletion(session, body);

    const pricing = priceSession(session);
    const blocker = pricing.problems[0];
    if (blocker) throw invalid("not_ready_for_payment", blocker.content, blocker.param);

    const outcome = await charge(stripe, session, pricing, token);
    if (outcome.paid) {
      session.state = "completed";
      session.paymentError = undefined;
      session.order = {
        id: outcome.paymentIntentId,
        paymentIntentId: outcome.paymentIntentId,
        permalinkUrl: absoluteUrl(`/checkout/success?session_id=${session.id}`),
      };
    } else {
      session.paymentError = outcome.message;
    }
    session.updatedAt = new Date().toISOString();
    await saveSession(session);
    return { status: 200, body: renderSession(session) };
  } finally {
    await remove(lockKey);
  }
}
