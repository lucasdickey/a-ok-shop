import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripeClient } from "@/app/lib/stripe-client";
import { runOnce } from "@/app/lib/kv";
import { parseItemList } from "@/app/lib/acp/items";
import { sendOrderCreated } from "@/app/lib/acp/order-events";
import { getProductByHandle, isSameId } from "@/app/lib/catalog";
import type { MPPItem } from "@/app/types/mpp";

// Support multiple webhook secrets (for different Stripe destinations)
function getWebhookSecrets() {
  return [
    process.env.STRIPE_WEBHOOK_SECRET_1, // Primary webhook secret
    process.env.STRIPE_WEBHOOK_SECRET_2, // Secondary webhook secret
    process.env.STRIPE_WEBHOOK_SECRET,   // Legacy fallback
  ].filter(Boolean) as string[];
}

export async function POST(request: NextRequest) {
  const stripeClient = getStripeClient();
  if (!stripeClient) {
    return NextResponse.json(
      { error: "Stripe not configured" },
      { status: 500 }
    );
  }

  const body = await request.text();
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event | null = null;
  for (const secret of getWebhookSecrets()) {
    try {
      event = stripeClient.webhooks.constructEvent(body, signature, secret);
      break;
    } catch {
      // Try the next secret
    }
  }

  if (!event) {
    console.error("Webhook signature verification failed with all secrets");
    return NextResponse.json(
      { error: "Invalid signature" },
      { status: 400 }
    );
  }

  console.log("Received Stripe webhook:", event.type, event.id);

  try {
    switch (event.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded": {
        const session = event.data.object as Stripe.Checkout.Session;
        // Delayed payment methods complete as "unpaid"; they are fulfilled
        // when checkout.session.async_payment_succeeded arrives.
        if (session.payment_status !== "unpaid") {
          await handlePaidCheckoutSession(stripeClient, session.id);
        }
        break;
      }

      case "checkout.session.async_payment_failed": {
        const session = event.data.object as Stripe.Checkout.Session;
        console.warn("Delayed payment failed for checkout session:", session.id);
        break;
      }

      case "payment_intent.succeeded": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        // Handle MPP agent payments
        if (paymentIntent.metadata?.source === "mpp-agent") {
          await handleMPPPaymentSucceeded(stripeClient, paymentIntent);
        } else if (paymentIntent.metadata?.source === "acp") {
          // ACP agent checkout (app/lib/acp/payment.ts)
          const order = toACPOrder(paymentIntent);
          await runOnce(`order-alert:${order.sessionId}`, () => sendOwnerOrderAlert(order));
          // Then tell the agent platform, when one is configured (ACP_WEBHOOK_URL).
          await runOnce(`acp-order-event:${order.sessionId}`, () => sendOrderCreated(paymentIntent));
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }
  } catch (error) {
    // A non-2xx response makes Stripe retry the event (for up to 3 days),
    // so a transient email or API failure never silently drops an order.
    console.error(`Webhook handler failed for ${event.type} ${event.id}:`, error);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }

  return NextResponse.json({ received: true });
}

type OrderItem = {
  name: string;
  quantity: number;
  size: string;
  color: string;
  variantId: string;
  sku: string;
  amountTotal: number;
};

type Order = {
  sessionId: string;
  paymentIntentId: string | null;
  source: string;
  createdAt: Date;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  shippingName: string;
  shippingAddress: Stripe.Address | null;
  items: OrderItem[];
  amountSubtotal: number;
  amountShipping: number;
  amountTax: number;
  amountTotal: number;
  livemode: boolean;
};

async function handlePaidCheckoutSession(stripeClient: Stripe, sessionId: string) {
  // Re-fetch so we read the current state with product metadata (size/color/variant).
  const session = await stripeClient.checkout.sessions.retrieve(sessionId, {
    expand: ["line_items.data.price.product", "payment_intent.latest_charge"],
  });

  if (session.payment_status === "unpaid") return;

  const order = toOrder(session);
  console.log(
    `Paid order ${order.sessionId} (${order.source}): ${order.items.length} line item(s), ${formatAmount(order.amountTotal)}`
  );

  // Receipt first so a misconfigured owner alert never blocks the customer's email.
  await runOnce(`order-receipt:${order.sessionId}`, () =>
    ensureCustomerReceipt(stripeClient, session)
  );
  await runOnce(`order-alert:${order.sessionId}`, () => sendOwnerOrderAlert(order));
}

function toOrder(session: Stripe.Checkout.Session): Order {
  const shipping = session.collected_information?.shipping_details ?? null;
  const paymentIntent = session.payment_intent;

  const items: OrderItem[] = (session.line_items?.data ?? []).map((lineItem) => {
    const product = lineItem.price?.product;
    const metadata =
      product && typeof product !== "string" && !product.deleted
        ? product.metadata
        : {};
    return {
      name: lineItem.description ?? "Item",
      quantity: lineItem.quantity ?? 1,
      size: metadata.size ?? "",
      color: metadata.color ?? "",
      variantId: metadata.variantId ?? "",
      sku: metadata.sku ?? "",
      amountTotal: lineItem.amount_total,
    };
  });

  return {
    sessionId: session.id,
    paymentIntentId:
      typeof paymentIntent === "string" ? paymentIntent : paymentIntent?.id ?? null,
    source: session.metadata?.source ?? "unknown",
    createdAt: new Date(session.created * 1000),
    customerName: session.customer_details?.name ?? "",
    customerEmail: session.customer_details?.email ?? "",
    customerPhone: session.customer_details?.phone ?? "",
    shippingName: shipping?.name ?? "",
    shippingAddress: shipping?.address ?? null,
    items,
    amountSubtotal: session.amount_subtotal ?? 0,
    amountShipping: session.total_details?.amount_shipping ?? 0,
    amountTax: session.total_details?.amount_tax ?? 0,
    amountTotal: session.amount_total ?? 0,
    livemode: session.livemode,
  };
}

/**
 * Make sure the customer gets Stripe's payment receipt. If the Dashboard's
 * "Successful payments" customer email is on, Stripe has already set
 * receipt_email on the charge and we leave it alone to avoid a duplicate.
 */
async function ensureCustomerReceipt(stripeClient: Stripe, session: Stripe.Checkout.Session) {
  const email = session.customer_details?.email;
  const paymentIntent = session.payment_intent;
  if (!email || !paymentIntent || typeof paymentIntent === "string") return;

  const charge = paymentIntent.latest_charge;
  if (charge && typeof charge !== "string" && charge.receipt_email) return;

  await stripeClient.paymentIntents.update(paymentIntent.id, {
    receipt_email: email,
  });
  console.log(`Stripe receipt requested for checkout session ${session.id}`);
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatAddressLines(name: string, address: Stripe.Address | null): string[] {
  if (!address) return ["(no shipping address collected)"];
  return [
    name,
    address.line1,
    address.line2,
    [address.city, address.state, address.postal_code].filter(Boolean).join(", "),
    address.country,
  ].filter((line): line is string => Boolean(line));
}

function formatItemLine(item: OrderItem) {
  const details = [
    item.size && `Size: ${item.size}`,
    item.color && `Color: ${item.color}`,
    item.sku && `SKU: ${item.sku}`,
    item.variantId && `Variant: ${item.variantId}`,
  ].filter(Boolean);
  return `${item.quantity} × ${item.name}${details.length ? ` (${details.join(", ")})` : ""} — ${formatAmount(item.amountTotal)}`;
}

function paymentDashboardUrl(order: Order) {
  if (!order.paymentIntentId) return "";
  const mode = order.livemode ? "" : "test/";
  return `https://dashboard.stripe.com/${mode}payments/${order.paymentIntentId}`;
}

/**
 * Email the store owner everything needed to place the print-on-demand /
 * drop-ship order with the vendor. Throws on failure so Stripe retries.
 */
async function sendOwnerOrderAlert(order: Order) {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.ORDER_NOTIFICATION_EMAIL;
  if (!apiKey || !to) {
    throw new Error(
      "Owner order alert not sent: RESEND_API_KEY and ORDER_NOTIFICATION_EMAIL must be set"
    );
  }

  const testPrefix = order.livemode ? "" : "[TEST] ";
  const subject = `${testPrefix}New A-OK order to fulfill: ${formatAmount(order.amountTotal)} — ${order.shippingName || order.customerName || order.customerEmail}`;
  const addressLines = formatAddressLines(order.shippingName, order.shippingAddress);
  const itemLines = order.items.map(formatItemLine);
  const dashboardUrl = paymentDashboardUrl(order);

  const totals = [
    `Subtotal: ${formatAmount(order.amountSubtotal)}`,
    `Shipping: ${formatAmount(order.amountShipping)}`,
    `Tax: ${formatAmount(order.amountTax)}`,
    `Total paid: ${formatAmount(order.amountTotal)}`,
  ];

  const text = [
    `New paid order — place it with the vendor.`,
    "",
    `Placed: ${order.createdAt.toISOString()}`,
    `Checkout session: ${order.sessionId}`,
    dashboardUrl && `Stripe payment: ${dashboardUrl}`,
    "",
    "SHIP TO",
    ...addressLines,
    order.customerPhone && `Phone: ${order.customerPhone}`,
    `Email: ${order.customerEmail}`,
    "",
    "ITEMS",
    ...itemLines.map((line) => `- ${line}`),
    "",
    ...totals,
  ]
    .filter((line) => line !== "")
    .join("\n");

  const html = `
    <div style="font-family: Arial, sans-serif; color: #111; line-height: 1.5;">
      <h1 style="font-size: 20px;">New paid order — place it with the vendor</h1>
      <p>Placed: ${escapeHtml(order.createdAt.toISOString())}<br/>
      Checkout session: ${escapeHtml(order.sessionId)}<br/>
      ${dashboardUrl ? `<a href="${escapeHtml(dashboardUrl)}">View payment in Stripe</a>` : ""}</p>
      <h2 style="font-size: 16px;">Ship to</h2>
      <p>${addressLines.map(escapeHtml).join("<br/>")}<br/>
      ${order.customerPhone ? `Phone: ${escapeHtml(order.customerPhone)}<br/>` : ""}
      Email: ${escapeHtml(order.customerEmail)}</p>
      <h2 style="font-size: 16px;">Items</h2>
      <ul>${itemLines.map((line) => `<li>${escapeHtml(line)}</li>`).join("")}</ul>
      <p>${totals.map(escapeHtml).join("<br/>")}</p>
    </div>
  `;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      // Resend dedupes retries of the same alert within 24 hours.
      "Idempotency-Key": `order-alert-${order.sessionId}`,
    },
    body: JSON.stringify({
      from: process.env.ORDER_EMAIL_FROM || "A-OK <orders@a-ok.ai>",
      to: to.split(",").map((address) => address.trim()).filter(Boolean),
      reply_to: order.customerEmail || undefined,
      subject,
      html,
      text,
    }),
  });

  if (!response.ok) {
    throw new Error(`Resend owner alert failed: ${response.status} ${await response.text()}`);
  }
  console.log(`Owner order alert sent for checkout session ${order.sessionId}`);
}


function formatAmount(cents?: number | null) {
  return `$${((cents || 0) / 100).toFixed(2)}`;
}

function formatOrderItems(items: any[] = []) {
  return items.map((item: any) => {
    const metadata = item.price?.product?.metadata || item.metadata || {};
    const description = item.description || item.title || item.handle || item.name || "A-OK item";
    const quantity = item.quantity || 1;
    let itemStr = `${description} x${quantity}`;

    if (metadata.size) itemStr += ` (Size: ${metadata.size})`;
    if (metadata.color) itemStr += ` (Color: ${metadata.color})`;
    if (item.variantId) itemStr += ` (${item.variantId})`;

    return itemStr;
  });
}

function generateOrderEmailText(orderData: any, storeName: string) {
  const lines = [
    `Thanks for your ${storeName} order.`,
    "",
    `Order ID: ${String(orderData.sessionId || orderData.paymentIntentId || "").slice(-12)}`,
    `Order Total: ${formatAmount(orderData.amountTotal)}`,
  ];

  if (orderData.amountTax > 0) {
    lines.push(`Tax: ${formatAmount(orderData.amountTax)}`);
  }

  if (orderData.amountShipping > 0) {
    lines.push(`Shipping: ${formatAmount(orderData.amountShipping)}`);
  }

  const items = formatOrderItems(orderData.items);
  if (items.length > 0) {
    lines.push("", "Items:", ...items.map((item) => `- ${item}`));
  }

  lines.push("", "Your items will ship within 3-5 business days.");

  return lines.join("\n");
}

function generateOrderEmailHTML(orderData: any, storeName: string) {
  const items = formatOrderItems(orderData.items);
  const itemList = items.length > 0
    ? `<ul>${items.map((item) => `<li>${item}</li>`).join("")}</ul>`
    : "";

  return `
    <div style="font-family: Arial, sans-serif; color: #111; line-height: 1.5;">
      <h1 style="font-size: 22px;">Thanks for your ${storeName} order.</h1>
      <p><strong>Order ID:</strong> ${String(orderData.sessionId || orderData.paymentIntentId || "").slice(-12)}</p>
      <p><strong>Order Total:</strong> ${formatAmount(orderData.amountTotal)}</p>
      ${orderData.amountTax > 0 ? `<p><strong>Tax:</strong> ${formatAmount(orderData.amountTax)}</p>` : ""}
      ${orderData.amountShipping > 0 ? `<p><strong>Shipping:</strong> ${formatAmount(orderData.amountShipping)}</p>` : ""}
      ${itemList}
      <p>Your items will ship within 3-5 business days.</p>
    </div>
  `;
}

async function sendConfirmationEmail(orderData: any) {
  try {
    if (!orderData.customerEmail) {
      console.warn("Skipping confirmation email because customerEmail is missing");
      return;
    }

    // Determine the store name based on source
    const storeName = orderData.source === "monthly-deals"
      ? "A-OK Monthly Deal"
      : "A-OK";
    const subject = `Your ${storeName} Order Confirmation`;

    console.log("=== CONFIRMATION EMAIL ===");
    console.log("To:", orderData.customerEmail);
    console.log("Subject:", subject);
    console.log("Order ID:", String(orderData.sessionId || orderData.paymentIntentId || "").slice(-12));
    console.log("Order Total:", formatAmount(orderData.amountTotal));

    if (orderData.amountTax > 0) {
      console.log("Tax:", formatAmount(orderData.amountTax));
    }

    if (orderData.amountShipping > 0) {
      console.log("Shipping:", formatAmount(orderData.amountShipping));
    }

    console.log("Items:", formatOrderItems(orderData.items).join(", "));

    if (orderData.shippingAddress) {
      console.log("Shipping to:", JSON.stringify(orderData.shippingAddress, null, 2));
    }

    console.log("Message: Thank you for your order! Your items will ship within 3-5 business days.");
    console.log("========================");

    if (!process.env.RESEND_API_KEY) {
      console.warn("RESEND_API_KEY is not configured; confirmation email was logged but not sent");
      return;
    }

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.ORDER_EMAIL_FROM || "A-OK <orders@a-ok.ai>",
        to: orderData.customerEmail,
        subject,
        html: generateOrderEmailHTML(orderData, storeName),
        text: generateOrderEmailText(orderData, storeName),
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Resend email failed: ${response.status} ${errorBody}`);
    }

  } catch (error) {
    console.error("Error sending confirmation email:", error);
  }
}

function parseMPPItems(rawItems?: string) {
  if (!rawItems) {
    return [];
  }

  try {
    const parsed = JSON.parse(rawItems);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.warn("[MPP] Unable to parse MPP item metadata:", error);
    return [];
  }
}

async function resolveMPPCustomerEmail(stripeClient: Stripe, paymentIntent: Stripe.PaymentIntent) {
  if (paymentIntent.metadata?.customerEmail) {
    return paymentIntent.metadata.customerEmail;
  }

  if (paymentIntent.receipt_email) {
    return paymentIntent.receipt_email;
  }

  const expandedPaymentIntent = await stripeClient.paymentIntents.retrieve(paymentIntent.id, {
    expand: ["customer", "latest_charge"],
  });

  if (expandedPaymentIntent.metadata?.customerEmail) {
    return expandedPaymentIntent.metadata.customerEmail;
  }

  if (expandedPaymentIntent.receipt_email) {
    return expandedPaymentIntent.receipt_email;
  }

  const customer = expandedPaymentIntent.customer;
  if (customer && typeof customer !== "string" && !customer.deleted && customer.email) {
    return customer.email;
  }

  const latestCharge = expandedPaymentIntent.latest_charge;
  if (latestCharge && typeof latestCharge !== "string") {
    return latestCharge.billing_details?.email || undefined;
  }

  return undefined;
}

/**
 * Handle successful MPP agent payment
 * Performs order fulfillment for machine-initiated purchases
 */
async function handleMPPPaymentSucceeded(stripeClient: Stripe, paymentIntent: Stripe.PaymentIntent) {
  try {
    const agentId = paymentIntent.metadata?.agentId || 'unknown-agent';
    const itemCount = paymentIntent.metadata?.itemCount || '0';
    const customerEmail = await resolveMPPCustomerEmail(stripeClient, paymentIntent);

    console.log('[MPP] Processing successful payment:', paymentIntent.id);
    console.log('[MPP] Agent:', agentId, 'Items:', itemCount);

    // Extract order information
    const mppOrderData = {
      paymentIntentId: paymentIntent.id,
      agentId: agentId,
      source: 'mpp-agent',
      customerEmail,
      amount: paymentIntent.amount,
      amountTotal: paymentIntent.amount,
      amountSubtotal: paymentIntent.amount,
      amountTax: 0,
      amountShipping: 0,
      currency: paymentIntent.currency,
      itemCount: parseInt(itemCount),
      items: parseMPPItems(paymentIntent.metadata?.items),
      status: 'fulfilled',
      timestamp: new Date(paymentIntent.created * 1000).toISOString(),
      metadata: paymentIntent.metadata,
    };

    console.log('[MPP] Order data:', JSON.stringify(mppOrderData, null, 2));

    if (mppOrderData.customerEmail) {
      await sendConfirmationEmail(mppOrderData);
    } else {
      console.warn('[MPP] No customer email found for payment:', paymentIntent.id);
    }

    // Here you could:
    // - Save order to database with fulfillment status
    // - Send fulfillment to logistics/print-on-demand service
    // - Update agent with order status
    // - Trigger fulfillment notifications
    // - Store order history for the agent
    // - Mark as fulfilled if fulfillment provider confirms

    console.log('[MPP] Payment fulfillment completed:', paymentIntent.id);

  } catch (error) {
    console.error('[MPP] Error processing successful payment:', error);
  }

  // Outside the try above: a failed alert must fail the webhook so Stripe retries it.
  const customerEmail = await resolveMPPCustomerEmail(stripeClient, paymentIntent);
  const order = toMPPOrder(paymentIntent, customerEmail ?? "");
  await runOnce(`order-alert:${order.sessionId}`, () => sendOwnerOrderAlert(order));
}

/** Shapes an MPP payment like a Checkout order, so the owner alert has the address, sizes and totals. */
function toMPPOrder(paymentIntent: Stripe.PaymentIntent, customerEmail: string): Order {
  const items: OrderItem[] = parseMPPItems(paymentIntent.metadata?.items).map((item: MPPItem) => {
    const product = getProductByHandle(item.handle);
    const variant = product?.variants.edges.find((edge) => isSameId(edge.node.id, item.variantId))?.node;
    const color = variant?.selectedOptions?.find((option) => option.name.toLowerCase() === "color")?.value;
    return {
      name: product?.title ?? item.handle,
      quantity: item.quantity,
      size: item.size ?? "",
      color: color ?? "",
      variantId: item.variantId,
      sku: variant?.sku ?? "",
      amountTotal: Math.round(parseFloat(variant?.price.amount ?? "0") * 100) * item.quantity,
    };
  });
  const amountSubtotal = items.reduce((sum, item) => sum + item.amountTotal, 0);

  return {
    sessionId: paymentIntent.id,
    paymentIntentId: paymentIntent.id,
    source: "mpp-agent",
    createdAt: new Date(paymentIntent.created * 1000),
    customerName: paymentIntent.metadata?.agentId ?? "",
    customerEmail,
    customerPhone: paymentIntent.shipping?.phone ?? "",
    shippingName: paymentIntent.shipping?.name ?? "",
    shippingAddress: paymentIntent.shipping?.address ?? null,
    items,
    amountSubtotal,
    amountShipping: Math.max(paymentIntent.amount - amountSubtotal, 0),
    amountTax: 0,
    amountTotal: paymentIntent.amount,
    livemode: paymentIntent.livemode,
  };
}

/**
 * Shapes an ACP agent payment like a Checkout order, so the owner alert has the
 * address, sizes, colors and totals.
 */
function toACPOrder(paymentIntent: Stripe.PaymentIntent): Order {
  const metadata = paymentIntent.metadata ?? {};
  const items: OrderItem[] = parseItemList(metadata.items).map(({ itemId, quantity, item }) => ({
    name: item?.product.title ?? itemId,
    quantity,
    size: item?.size ?? "",
    color: item?.color ?? "",
    variantId: item?.variant.id ?? itemId,
    sku: item?.variant.sku ?? "",
    amountTotal: (item?.unitAmount ?? 0) * quantity,
  }));
  const itemsTotal = items.reduce((sum, item) => sum + item.amountTotal, 0);
  const amountSubtotal = Number(metadata.amount_subtotal) || itemsTotal;

  return {
    sessionId: metadata.checkout_session_id || paymentIntent.id,
    paymentIntentId: paymentIntent.id,
    source: "acp",
    createdAt: new Date(paymentIntent.created * 1000),
    customerName: metadata.customer_name ?? "",
    customerEmail: metadata.customer_email || paymentIntent.receipt_email || "",
    customerPhone: paymentIntent.shipping?.phone ?? "",
    shippingName: paymentIntent.shipping?.name ?? "",
    shippingAddress: paymentIntent.shipping?.address ?? null,
    items,
    amountSubtotal,
    amountShipping: Number(metadata.amount_shipping) || Math.max(paymentIntent.amount - amountSubtotal, 0),
    amountTax: 0,
    amountTotal: paymentIntent.amount,
    livemode: paymentIntent.livemode,
  };
}
