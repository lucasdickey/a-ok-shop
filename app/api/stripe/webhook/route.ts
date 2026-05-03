import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

// Initialize Stripe client lazily to avoid build-time errors
let stripe: Stripe | null = null;
function getStripe() {
  if (!stripe && process.env.STRIPE_SECRET_KEY) {
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2026-04-22.dahlia" as any,
    });
  }
  return stripe;
}

// Support multiple webhook secrets (for different Stripe destinations)
function getWebhookSecrets() {
  return [
    process.env.STRIPE_WEBHOOK_SECRET_1, // Primary webhook secret
    process.env.STRIPE_WEBHOOK_SECRET_2, // Secondary webhook secret
    process.env.STRIPE_WEBHOOK_SECRET,   // Legacy fallback
  ].filter(Boolean) as string[];
}

export async function POST(request: NextRequest) {
  try {
    const stripeClient = getStripe();
    if (!stripeClient) {
      return NextResponse.json(
        { error: "Stripe not configured" },
        { status: 500 }
      );
    }

    const body = await request.text();
    const signature = request.headers.get("stripe-signature");

    let event: Stripe.Event | null = null;
    let lastError: Error | null = null;

    // Try to verify the signature with each available secret
    const secrets = getWebhookSecrets();
    for (const secret of secrets) {
      try {
        event = stripeClient.webhooks.constructEvent(body, signature!, secret);
        console.log(`Webhook verified successfully with secret ending in ...${secret.slice(-4)}`);
        break; // Successfully verified, exit loop
      } catch (err) {
        lastError = err as Error;
        // Continue to next secret
      }
    }

    // If none of the secrets worked, return error
    if (!event) {
      console.error("Webhook signature verification failed with all secrets:", lastError);
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 400 }
      );
    }

    console.log("Received Stripe webhook:", event.type);

    // Handle the event
    switch (event.type) {
      case "checkout.session.completed":
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutSessionCompleted(stripeClient, session);
        break;

      case "payment_intent.succeeded":
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log("Payment succeeded:", paymentIntent.id);

        // Handle MPP agent payments
        if (paymentIntent.metadata?.source === 'mpp-agent') {
          await handleMPPPaymentSucceeded(stripeClient, paymentIntent);
        }
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }
}

async function handleCheckoutSessionCompleted(stripeClient: Stripe, session: Stripe.Checkout.Session) {
  console.log("Checkout session completed:", session.id);

  try {
    // Expand session to get line items and customer details
    const expandedSession = await stripeClient.checkout.sessions.retrieve(session.id, {
      expand: ["line_items", "customer"]
    });

    // Determine the source (catalog or monthly-deals)
    const source = expandedSession.metadata?.source || "unknown";
    console.log("Order source:", source);

    // Extract order information
    const orderData = {
      sessionId: session.id,
      source: source,
      customerEmail: expandedSession.customer_details?.email,
      customerName: expandedSession.customer_details?.name,
      shippingAddress: (expandedSession as any).shipping_details?.address,
      items: expandedSession.line_items?.data || [],
      amountTotal: expandedSession.amount_total,
      amountSubtotal: expandedSession.amount_subtotal,
      amountTax: expandedSession.total_details?.amount_tax || 0,
      amountShipping: expandedSession.total_details?.amount_shipping || 0,
      paymentStatus: expandedSession.payment_status,
      metadata: expandedSession.metadata
    };

    console.log("Order data:", JSON.stringify(orderData, null, 2));

    // Trigger Stripe's built-in receipt email by setting receipt_email on
    // the PaymentIntent. Stripe sends a branded receipt to this address
    // regardless of the Dashboard email-receipts setting.
    if (orderData.customerEmail && expandedSession.payment_intent) {
      const paymentIntentId =
        typeof expandedSession.payment_intent === "string"
          ? expandedSession.payment_intent
          : expandedSession.payment_intent.id;

      try {
        await stripeClient.paymentIntents.update(paymentIntentId, {
          receipt_email: orderData.customerEmail,
        });
        console.log(
          `Stripe receipt email triggered for ${orderData.customerEmail} (PI: ${paymentIntentId})`
        );
      } catch (receiptError) {
        console.error(
          "Failed to trigger Stripe receipt email:",
          receiptError
        );
      }
    }

    // Log order details for observability (actual order-confirmation
    // email with product breakdown can be layered on later if desired).
    if (orderData.customerEmail) {
      await sendConfirmationEmail(orderData);
    }

    // Here you could also:
    // - Save order to database
    // - Send order to fulfillment service (Printful, Shopify, etc.)
    // - Update inventory
    // - Trigger other business processes
    // - Different handling based on source (catalog vs monthly-deals)

  } catch (error) {
    console.error("Error processing completed checkout session:", error);
  }
}

function formatAmount(cents?: number | null) {
  return `$${((cents || 0) / 100).toFixed(2)}`;
}

function formatOrderItems(items: any[] = []) {
  return items.map((item: any) => {
    const metadata = item.price?.product?.metadata || item.metadata || {};
    const description = item.description || item.title || item.handle || item.name || "A-OK Shop item";
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
      : "A-OK Shop";
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
        from: process.env.ORDER_EMAIL_FROM || "A-OK Shop <orders@a-ok.shop>",
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
}
