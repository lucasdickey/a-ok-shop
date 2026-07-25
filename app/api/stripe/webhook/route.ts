import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripeClient } from "@/app/lib/stripe-client";
import { claimEvent, releaseEvent } from "@/app/lib/webhook-idempotency";
import {
  formatAmount,
  sendOrderNotifications,
  type OrderItem,
  type OrderNotification,
} from "@/app/lib/order-emails";

// The raw request body is required for signature verification, so this route
// must never be statically optimized or cached.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Support multiple webhook secrets (for different Stripe destinations)
function getWebhookSecrets(): string[] {
  return [
    process.env.STRIPE_WEBHOOK_SECRET_1, // Primary webhook secret
    process.env.STRIPE_WEBHOOK_SECRET_2, // Secondary webhook secret
    process.env.STRIPE_WEBHOOK_SECRET, // Legacy fallback
  ].filter(Boolean) as string[];
}

export async function POST(request: NextRequest) {
  const stripeClient = getStripeClient();
  if (!stripeClient) {
    console.error("Stripe webhook received but STRIPE_SECRET_KEY is not set");
    return NextResponse.json({ error: "Stripe not configured" }, { status: 500 });
  }

  const secrets = getWebhookSecrets();
  if (secrets.length === 0) {
    console.error("Stripe webhook received but no signing secret is configured");
    return NextResponse.json({ error: "Stripe not configured" }, { status: 500 });
  }

  const body = await request.text();
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event | null = null;
  let lastError: Error | null = null;

  for (const secret of secrets) {
    try {
      event = stripeClient.webhooks.constructEvent(body, signature, secret);
      break;
    } catch (error) {
      lastError = error as Error;
    }
  }

  if (!event) {
    console.error(
      "Webhook signature verification failed with all secrets:",
      lastError?.message
    );
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  // Stripe guarantees at-least-once delivery; only process each event once.
  const claimed = await claimEvent(event.id);
  if (!claimed) {
    console.log(`Skipping already-processed event ${event.id} (${event.type})`);
    return NextResponse.json({ received: true, duplicate: true });
  }

  console.log(`Processing Stripe webhook ${event.type} (${event.id})`);

  try {
    switch (event.type) {
      // Instant payment methods land here already paid. Delayed methods (bank
      // debits, vouchers) arrive unpaid and are fulfilled on the async event.
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded": {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutSession(stripeClient, session);
        break;
      }

      case "checkout.session.async_payment_failed": {
        const session = event.data.object as Stripe.Checkout.Session;
        console.error(
          `[orders] Delayed payment FAILED for session ${session.id} ` +
            `(${session.customer_details?.email || "no email"}) — do not fulfill`
        );
        break;
      }

      case "payment_intent.succeeded": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        // Checkout orders are fulfilled from the session event above; only
        // machine-initiated (MPP) payments are handled here.
        if (paymentIntent.metadata?.source === "mpp-agent") {
          await handleMPPPaymentSucceeded(stripeClient, paymentIntent);
        }
        break;
      }

      case "payment_intent.payment_failed": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.error(
          `[orders] Payment failed for ${paymentIntent.id}: ` +
            `${paymentIntent.last_payment_error?.message || "unknown reason"}`
        );
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    // Give up the idempotency claim so Stripe's retry gets a fresh attempt.
    await releaseEvent(event.id);

    console.error(
      `[orders] Handler failed for ${event.type} (${event.id}):`,
      error
    );

    // Non-2xx tells Stripe to retry with backoff.
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }
}

function toOrderItems(session: Stripe.Checkout.Session): OrderItem[] {
  return (session.line_items?.data || []).map((lineItem) => {
    const product = lineItem.price?.product;
    const metadata =
      product && typeof product !== "string" && !product.deleted
        ? product.metadata
        : undefined;

    return {
      description: lineItem.description || "A-OK Shop item",
      quantity: lineItem.quantity || 1,
      size: metadata?.size || undefined,
      color: metadata?.color || undefined,
      amountTotal: lineItem.amount_total,
    };
  });
}

async function handleCheckoutSession(
  stripeClient: Stripe,
  session: Stripe.Checkout.Session
) {
  // Expand line items down to the product so size/colour metadata is present,
  // and the charge so the receipt can be triggered.
  const expanded = await stripeClient.checkout.sessions.retrieve(session.id, {
    expand: ["line_items.data.price.product", "payment_intent.latest_charge"],
  });

  // A completed session is not necessarily a paid one.
  if (expanded.payment_status === "unpaid") {
    console.log(
      `Session ${expanded.id} completed but is still unpaid — waiting for ` +
        "checkout.session.async_payment_succeeded before fulfilling"
    );
    return;
  }

  const source = expanded.metadata?.source || "unknown";
  const shipping = expanded.collected_information?.shipping_details;

  const order: OrderNotification = {
    orderId: expanded.id,
    source,
    customerEmail: expanded.customer_details?.email,
    customerName: expanded.customer_details?.name,
    shippingName: shipping?.name,
    shippingAddress: shipping?.address,
    items: toOrderItems(expanded),
    amountTotal: expanded.amount_total,
    amountSubtotal: expanded.amount_subtotal,
    amountTax: expanded.total_details?.amount_tax ?? 0,
    amountShipping: expanded.total_details?.amount_shipping ?? 0,
    currency: expanded.currency,
  };

  console.log(
    `[orders] Paid order ${order.orderId} (${source}) — ` +
      `${formatAmount(order.amountTotal, order.currency || "usd")} — ` +
      `${order.items.length} line item(s) for ${order.customerEmail || "unknown email"}`
  );

  await triggerStripeReceipt(stripeClient, expanded, order.customerEmail);

  // Throws on transient failure so the outer handler returns 500 and Stripe
  // retries — an order must not be silently lost.
  await sendOrderNotifications(order);

  // Fulfillment hand-off (print-on-demand, order database, inventory) belongs
  // here. Until one exists, the operator alert above is the record of record.
}

/**
 * Ask Stripe to email its own branded receipt.
 *
 * Setting receipt_email on an already-succeeded PaymentIntent does nothing;
 * the receipt is generated from the Charge, so the Charge is what we update.
 */
async function triggerStripeReceipt(
  stripeClient: Stripe,
  session: Stripe.Checkout.Session,
  customerEmail?: string | null
) {
  if (!customerEmail || !session.payment_intent) {
    return;
  }

  const paymentIntent = session.payment_intent;
  const charge =
    typeof paymentIntent === "string" ? null : paymentIntent.latest_charge;
  const chargeId = typeof charge === "string" ? charge : charge?.id;

  if (!chargeId) {
    console.warn(
      `[orders] No charge found for session ${session.id}; skipping Stripe receipt`
    );
    return;
  }

  try {
    await stripeClient.charges.update(chargeId, { receipt_email: customerEmail });
    console.log(`[orders] Stripe receipt requested for ${customerEmail}`);
  } catch (error) {
    // A missing receipt is not worth failing (and retrying) the whole event —
    // our own confirmation email is the primary notification.
    console.error("[orders] Failed to trigger Stripe receipt:", error);
  }
}

function parseMPPItems(rawItems?: string): OrderItem[] {
  if (!rawItems) {
    return [];
  }

  try {
    const parsed = JSON.parse(rawItems);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.map((item: any) => ({
      description: item.title || item.handle || item.variantId || "A-OK Shop item",
      quantity: item.quantity || 1,
      size: item.size,
      color: item.color,
      amountTotal:
        typeof item.price === "number" ? Math.round(item.price * 100) : null,
    }));
  } catch (error) {
    console.warn("[MPP] Unable to parse MPP item metadata:", error);
    return [];
  }
}

async function resolveMPPCustomerEmail(
  stripeClient: Stripe,
  paymentIntent: Stripe.PaymentIntent
): Promise<string | undefined> {
  if (paymentIntent.metadata?.customerEmail) {
    return paymentIntent.metadata.customerEmail;
  }

  if (paymentIntent.receipt_email) {
    return paymentIntent.receipt_email;
  }

  const expanded = await stripeClient.paymentIntents.retrieve(paymentIntent.id, {
    expand: ["customer", "latest_charge"],
  });

  if (expanded.receipt_email) {
    return expanded.receipt_email;
  }

  const customer = expanded.customer;
  if (customer && typeof customer !== "string" && !customer.deleted && customer.email) {
    return customer.email;
  }

  const latestCharge = expanded.latest_charge;
  if (latestCharge && typeof latestCharge !== "string") {
    return latestCharge.billing_details?.email || undefined;
  }

  return undefined;
}

/**
 * Handle a successful machine-initiated (MPP agent) payment.
 */
async function handleMPPPaymentSucceeded(
  stripeClient: Stripe,
  paymentIntent: Stripe.PaymentIntent
) {
  const agentId = paymentIntent.metadata?.agentId || "unknown-agent";
  const customerEmail = await resolveMPPCustomerEmail(stripeClient, paymentIntent);

  const order: OrderNotification = {
    orderId: paymentIntent.id,
    source: "mpp-agent",
    customerEmail,
    items: parseMPPItems(paymentIntent.metadata?.items),
    amountTotal: paymentIntent.amount,
    amountSubtotal: paymentIntent.amount,
    amountTax: 0,
    amountShipping: 0,
    currency: paymentIntent.currency,
  };

  console.log(
    `[MPP] Paid order ${order.orderId} from agent ${agentId} — ` +
      `${formatAmount(order.amountTotal, order.currency || "usd")}`
  );

  await sendOrderNotifications(order);
}
