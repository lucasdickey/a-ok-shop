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
      expand: ["line_items", "customer", "total_details", "shipping_details"]
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

    // Send confirmation email
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

async function sendConfirmationEmail(orderData: any) {
  try {
    // Determine the store name based on source
    const storeName = orderData.source === "monthly-deals"
      ? "A-OK Monthly Deal"
      : "A-OK Shop";

    // For now, just log the email data
    // In production, you'd integrate with an email service like Amazon SES, SendGrid, Resend, etc.
    console.log("=== CONFIRMATION EMAIL ===");
    console.log("To:", orderData.customerEmail);
    console.log("Subject:", `Your ${storeName} Order Confirmation`);
    console.log("Order ID:", orderData.sessionId.slice(-12));
    console.log("Order Total:", `$${(orderData.amountTotal / 100).toFixed(2)}`);

    if (orderData.amountTax > 0) {
      console.log("Tax:", `$${(orderData.amountTax / 100).toFixed(2)}`);
    }

    if (orderData.amountShipping > 0) {
      console.log("Shipping:", `$${(orderData.amountShipping / 100).toFixed(2)}`);
    }

    console.log("Items:", orderData.items.map((item: any) => {
      const metadata = item.price?.product?.metadata || {};
      let itemStr = `${item.description} x${item.quantity}`;
      if (metadata.size) itemStr += ` (Size: ${metadata.size})`;
      if (metadata.color) itemStr += ` (Color: ${metadata.color})`;
      return itemStr;
    }).join(", "));

    if (orderData.shippingAddress) {
      console.log("Shipping to:", JSON.stringify(orderData.shippingAddress, null, 2));
    }

    console.log("Message: Thank you for your order! Your items will ship within 3-5 business days.");
    console.log("========================");

    // TODO: Implement actual email sending
    // Example with Resend (recommended for Next.js):
    /*
    const { Resend } = require('resend');
    const resend = new Resend(process.env.RESEND_API_KEY);

    await resend.emails.send({
      from: 'orders@yourdomain.com',
      to: orderData.customerEmail,
      subject: `Your ${storeName} Order Confirmation`,
      html: generateOrderEmailHTML(orderData)
    });
    */

  } catch (error) {
    console.error("Error sending confirmation email:", error);
  }
}
