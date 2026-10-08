import { NextRequest } from "next/server";

import { completeSession } from "@/app/lib/acp/payment";
import { handleAcp } from "@/app/lib/acp/protocol";

type Params = { params: { id: string } };

// ACP: pay with the buyer's Stripe shared payment token and place the order
// (POST /checkout_sessions/{id}/complete).
export async function POST(request: NextRequest, { params }: Params) {
  return handleAcp(request, ({ identity, body }) => completeSession(params.id, identity, body));
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
