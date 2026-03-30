import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getAllProducts } from "@/app/lib/catalog";
import { getCorsHeaders } from "@/app/lib/cors";

// Shared memory cache for the prototype
import { paymentCache } from "./cache";

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2026-03-04.preview" as any,
    })
  : null;

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  try {
    const body = await request.json();
    const { variantId, quantity = 1 } = body;

    // Check for authorization header (retrying the request after payment)
    const authHeader = request.headers.get("authorization");
    if (authHeader && authHeader.startsWith("MPP ")) {
      const credential = authHeader.substring(4);
      // In a real implementation, we would verify the credential with Stripe or the blockchain
      // For this prototype, we'll check our mock cache
      const paymentInfo = paymentCache.get(credential);

      if (paymentInfo && paymentInfo.status === "paid") {
        const products = getAllProducts();
        const product = products.find((p) =>
          p.variants.edges.some((v) => v.node.id === paymentInfo.variantId)
        );
        const variant = product?.variants.edges.find(
          (v) => v.node.id === paymentInfo.variantId
        )?.node;

        const amount = paymentInfo.amount;
        const currency = paymentInfo.currency;

        return NextResponse.json(
          {
            success: true,
            message: "Payment verified via MPP",
            order: {
              id: `mpp_order_${Math.random().toString(36).substr(2, 9)}`,
              item: `${product?.title || "Product"} - ${variant?.title || "Variant"}`,
              quantity: paymentInfo.quantity,
              total: `${(amount / 100).toFixed(2)} ${currency.toUpperCase()}`,
            },
            receipt: `rcpt_${Math.random().toString(36).substr(2, 12)}`,
          },
          { headers: corsHeaders }
        );
      }
    }

    // Normal flow continues...
    if (!variantId) {
      return NextResponse.json(
        { error: "Missing variantId" },
        { status: 400, headers: corsHeaders }
      );
    }

    const products = getAllProducts();
    const product = products.find((p) =>
      p.variants.edges.some((v) => v.node.id === variantId)
    );

    if (!product) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404, headers: corsHeaders }
      );
    }

    const variant = product.variants.edges.find(
      (v) => v.node.id === variantId
    )?.node;

    if (!variant) {
      return NextResponse.json(
        { error: "Variant not found" },
        { status: 404, headers: corsHeaders }
      );
    }

    const amount = Math.round(parseFloat(variant.price.amount) * quantity * 100);
    const currency = variant.price.currencyCode.toLowerCase();

    // Generate a mock challengeId for this prototype
    const challengeId = `chal_${Math.random().toString(36).substr(2, 12)}`;

    // Store the intent in our mock cache
    paymentCache.set(challengeId, {
      status: "pending",
      amount,
      currency,
      variantId,
      quantity,
    });

    // Return 402 Payment Required
    return NextResponse.json(
      {
        type: "https://paymentauth.org/problems/payment-required",
        title: "Payment Required",
        status: 402,
        detail: `Payment of ${(amount / 100).toFixed(2)} ${currency.toUpperCase()} is required for ${product.title}.`,
        challengeId: challengeId,
        methods: [
          {
            type: "stripe-mpp",
            currency: currency,
            amount: amount,
            recipient: "0x20c000000000000000000000b9537d11c60e8b50", // Example Tempo USDC address
            network: "tempo",
          },
          {
            type: "x402",
            scheme: "exact",
            price: `$${(amount / 100).toFixed(2)}`,
            network: "eip155:8453", // Base Mainnet
            payTo: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", // Example Base USDC address
          }
        ],
      },
      {
        status: 402,
        headers: {
          ...corsHeaders,
          "WWW-Authenticate": `MPP challengeId="${challengeId}"`,
        },
      }
    );
  } catch (error) {
    console.error("MPP Buy Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function GET(request: NextRequest) {
  const origin = request.headers.get("origin");
  return NextResponse.json(
    { message: "MPP Buy endpoint. Use POST to initiate a purchase." },
    { headers: getCorsHeaders(origin) }
  );
}

export function OPTIONS(request: NextRequest) {
  const origin = request.headers.get("origin");
  return new NextResponse(null, {
    status: 204,
    headers: getCorsHeaders(origin),
  });
}
