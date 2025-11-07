import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripeClient } from "@/app/lib/stripe-client";

export async function POST(request: NextRequest) {
  try {
    const stripe = getStripeClient();
    if (!stripe) {
      return NextResponse.json(
        { error: "Stripe not configured" },
        { status: 500 }
      );
    }

    const { items, subtotal } = await request.json();

    if (!items || items.length === 0) {
      return NextResponse.json(
        { error: "No items in cart" },
        { status: 400 }
      );
    }

    // Convert cart items to Stripe line items
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = items.map((item: any) => ({
      price_data: {
        currency: "usd",
        product_data: {
          name: item.title,
          images: item.image.startsWith('http') ? [item.image] : [],
          metadata: {
            size: item.size || "",
            color: item.color || "",
            variantId: item.variantId || ""
          }
        },
        unit_amount: Math.round(item.price * 100), // Convert to cents
      },
      quantity: item.quantity,
    }));

    // Add shipping if subtotal is under $50
    if (subtotal < 50) {
      lineItems.push({
        price_data: {
          currency: "usd",
          product_data: {
            name: "Shipping",
          },
          unit_amount: 999, // $9.99 in cents
        },
        quantity: 1,
      });
    }

    // Get the base URL from the request headers or environment variables
    const host = request.headers.get('host') || 'localhost:3000';
    const protocol = host.includes('localhost') ? 'http' : 'https';
    const baseUrl = process.env.SITE_URL ||
                   process.env.NEXT_PUBLIC_SITE_URL ||
                   (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` :
                   `${protocol}://${host}`);

    console.log("Creating checkout session with base URL:", baseUrl);

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: lineItems,
      mode: "payment",
      success_url: `${baseUrl}/monthly-deals/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/monthly-deals`,
      shipping_address_collection: {
        allowed_countries: ["US", "CA"],
      },
      customer_creation: "always",
      metadata: {
        source: "monthly-deals",
        month: "2025-01",
      },
      // Enable tax calculation
      automatic_tax: {
        enabled: true,
      },
      // Custom branding (if configured in Stripe Dashboard)
      custom_text: {
        submit: {
          message: "Items ship within 3-5 business days after payment confirmation."
        }
      }
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Error creating checkout session:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}