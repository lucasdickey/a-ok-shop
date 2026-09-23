import { NextResponse } from "next/server";
import { getStripeClient } from "@/app/lib/stripe-client";

// Generate a unique discount code. Letters and digits only: Stripe promotion codes allow nothing else.
function generateDiscountCode() {
  const code = `AOK${Math.random()
    .toString(36)
    .substring(2, 8)
    .toUpperCase()}`;
  return code;
}

// Checkout runs on Stripe (app/api/catalog/checkout/route.ts), so a code the shopper can
// actually redeem has to be a Stripe promotion code: 25% off, single use, 30 days.
async function createStripeDiscount() {
  const stripe = getStripeClient();
  if (!stripe) throw new Error("Stripe not configured");

  const code = generateDiscountCode();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  const coupon = await stripe.coupons.create({
    percent_off: 25,
    duration: "once",
    max_redemptions: 1,
    redeem_by: Math.floor(expiresAt.getTime() / 1000),
    name: "Run, Human, Run! reward",
  });
  const promotionCode = await stripe.promotionCodes.create({
    promotion: { type: "coupon", coupon: coupon.id },
    code,
    max_redemptions: 1,
    expires_at: Math.floor(expiresAt.getTime() / 1000),
  });

  return {
    code,
    id: promotionCode.id,
    percentage: 25,
    expiresAt: expiresAt.toISOString(),
  };
}

// Mock discount code generation for development
function generateMockDiscountCode() {
  const code = `AOK${Math.random()
    .toString(36)
    .substring(2, 8)
    .toUpperCase()}`;
  console.log("Generated mock discount code:", code);
  return code;
}

export async function POST() {
  try {
    if (getStripeClient()) {
      const discount = await createStripeDiscount();
      return NextResponse.json(discount);
    }

    // Stripe isn't configured (local development) - return a mock code
    console.log("Stripe not configured - returning mock discount code");
    const mockCode = generateMockDiscountCode();

    return NextResponse.json({
      code: mockCode,
      percentage: 25,
      expiresAt: new Date(
        Date.now() + 30 * 24 * 60 * 60 * 1000
      ).toISOString(), // 30 days
      note: "Mock discount code - set STRIPE_SECRET_KEY to create real discounts",
    });
  } catch (error) {
    console.error("Error in discount code generation:", error);

    // Fall back to mock code on error
    const fallbackCode = generateMockDiscountCode();

    return NextResponse.json(
      {
        code: fallbackCode,
        percentage: 25,
        expiresAt: new Date(
          Date.now() + 30 * 24 * 60 * 60 * 1000
        ).toISOString(),
        note: "Mock discount code generated due to error",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
