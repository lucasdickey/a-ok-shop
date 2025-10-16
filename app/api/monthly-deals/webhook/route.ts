import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-09-30.clover",
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get("stripe-signature");

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, signature!, webhookSecret);
    } catch (err) {
      console.error("Webhook signature verification failed:", err);
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
        await handleCheckoutSessionCompleted(session);
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

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  console.log("Checkout session completed:", session.id);
  
  try {
    // Expand session to get line items and customer details
    const expandedSession = await stripe.checkout.sessions.retrieve(session.id, {
      expand: ["line_items", "customer", "total_details", "shipping_details"]
    });

    // Extract order information
    const orderData = {
      sessionId: session.id,
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
    // - Send order to fulfillment service
    // - Update inventory
    // - Trigger other business processes

  } catch (error) {
    console.error("Error processing completed checkout session:", error);
  }
}

async function sendConfirmationEmail(orderData: any) {
  try {
    // For now, just log the email data
    // In production, you'd integrate with an email service like Amazon SES, SendGrid, etc.
    console.log("=== CONFIRMATION EMAIL ===");
    console.log("To:", orderData.customerEmail);
    console.log("Subject: Your A-OK Monthly Deal Order Confirmation");
    console.log("Order Total:", `$${(orderData.amountTotal / 100).toFixed(2)}`);
    console.log("Items:", orderData.items.map((item: any) => item.description).join(", "));
    
    if (orderData.shippingAddress) {
      console.log("Shipping to:", JSON.stringify(orderData.shippingAddress, null, 2));
    }
    
    console.log("Message: Thank you for your order! Your items will ship within 3-5 business days.");
    console.log("========================");

    // TODO: Implement actual email sending
    // Example with SendGrid, Amazon SES, or similar service
    
  } catch (error) {
    console.error("Error sending confirmation email:", error);
  }
}