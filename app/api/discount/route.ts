import { randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { takeRateLimit } from "@/app/lib/kv";
import { getStripeClient } from "@/app/lib/stripe-client";

// The game win happens in the browser and can't be verified, so real codes are
// limited instead: a few per visitor per day and a store-wide daily cap.
const CODES_PER_IP_PER_DAY = 3;
const CODES_PER_DAY = 200;
const DAY_SECONDS = 24 * 60 * 60;

// One shared coupon; each win gets its own single-use promotion code against it.
const GAME_COUPON_ID = "aok-game-reward-25";

// Letters and digits only: Stripe promotion codes allow nothing else.
function generateDiscountCode() {
  return `AOK${randomBytes(6).toString("hex").toUpperCase()}`;
}

async function getGameCoupon(stripe: Stripe): Promise<Stripe.Coupon> {
  try {
    return await stripe.coupons.retrieve(GAME_COUPON_ID);
  } catch (error) {
    if ((error as { code?: string }).code !== "resource_missing") throw error;
    return stripe.coupons.create({
      id: GAME_COUPON_ID,
      percent_off: 25,
      duration: "once",
      name: "Run, Human, Run! reward",
    });
  }
}

// Checkout runs on Stripe (app/api/catalog/checkout/route.ts), so a code the shopper can
// actually redeem has to be a Stripe promotion code: 25% off, single use, 30 days.
async function createStripeDiscount(stripe: Stripe) {
  const coupon = await getGameCoupon(stripe);
  const code = generateDiscountCode();
  const expiresAt = new Date(Date.now() + 30 * DAY_SECONDS * 1000);

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
  const code = generateDiscountCode();
  console.log("Generated mock discount code:", code);
  return code;
}

// Vercel sets x-real-ip itself, so clients can't choose it. The x-forwarded-for fallback
// is only trustworthy behind a proxy that overwrites that header.
function clientIp(request: NextRequest): string {
  return (
    request.headers.get("x-real-ip")?.trim() ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  );
}

export async function POST(request: NextRequest) {
  try {
    const stripe = getStripeClient();
    if (stripe) {
      const withinLimits =
        (await takeRateLimit(`discount:ip:${clientIp(request)}`, CODES_PER_IP_PER_DAY, DAY_SECONDS)) &&
        (await takeRateLimit("discount:all", CODES_PER_DAY, DAY_SECONDS));
      if (!withinLimits) {
        return NextResponse.json(
          { error: "Too many discount codes today. Try again tomorrow." },
          { status: 429 }
        );
      }

      const discount = await createStripeDiscount(stripe);
      return NextResponse.json(discount);
    }

    // Stripe isn't configured (local development) - return a mock code
    console.log("Stripe not configured - returning mock discount code");
    const mockCode = generateMockDiscountCode();

    return NextResponse.json({
      code: mockCode,
      percentage: 25,
      expiresAt: new Date(Date.now() + 30 * DAY_SECONDS * 1000).toISOString(),
      note: "Mock discount code - set STRIPE_SECRET_KEY to create real discounts",
    });
  } catch (error) {
    // No code on failure: a code-shaped fallback would look redeemable and isn't.
    console.error("Error in discount code generation:", error);
    return NextResponse.json(
      { error: "Couldn't create a discount code. Please try again." },
      { status: 503 }
    );
  }
}
