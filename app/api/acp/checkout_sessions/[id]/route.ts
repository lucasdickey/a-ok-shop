import { NextRequest } from "next/server";

import { handleAcp } from "@/app/lib/acp/protocol";
import { loadSession, renderSession, saveSession, updateSession } from "@/app/lib/acp/sessions";

type Params = { params: { id: string } };

// ACP: retrieve a checkout session (GET /checkout_sessions/{id}).
export async function GET(request: NextRequest, { params }: Params) {
  return handleAcp(request, async ({ identity }) => {
    const session = await loadSession(params.id, identity);
    return { status: 200, body: renderSession(session) };
  });
}

// ACP: update items, buyer, address or shipping choice (POST /checkout_sessions/{id}).
export async function POST(request: NextRequest, { params }: Params) {
  return handleAcp(request, async ({ identity, body }) => {
    const session = await loadSession(params.id, identity);
    updateSession(session, body);
    await saveSession(session);
    return { status: 200, body: renderSession(session) };
  });
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
