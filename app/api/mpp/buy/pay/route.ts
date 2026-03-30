import { NextRequest, NextResponse } from "next/server";
import { getCorsHeaders } from "@/app/lib/cors";

// Shared memory cache for the prototype
// Fix: Import from parent directory
import { paymentCache } from "../cache";

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  try {
    const { challengeId } = await request.json();

    if (!challengeId) {
      return NextResponse.json(
        { error: "Missing challengeId" },
        { status: 400, headers: corsHeaders }
      );
    }

    const paymentInfo = paymentCache.get(challengeId);
    if (!paymentInfo) {
      return NextResponse.json(
        { error: "Challenge not found" },
        { status: 404, headers: corsHeaders }
      );
    }

    // Simulate payment completion
    paymentCache.set(challengeId, {
      ...paymentInfo,
      status: "paid",
    });

    return NextResponse.json(
      { success: true, message: "Payment simulated successfully for prototype." },
      { headers: corsHeaders }
    );
  } catch (error) {
    return NextResponse.json(
      { error: "Invalid request" },
      { status: 400, headers: corsHeaders }
    );
  }
}

export function OPTIONS(request: NextRequest) {
  const origin = request.headers.get("origin");
  return new NextResponse(null, {
    status: 204,
    headers: getCorsHeaders(origin),
  });
}
