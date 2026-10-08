import { NextRequest } from "next/server";

import { handleAcp } from "@/app/lib/acp/protocol";
import { createSession, renderSession, saveSession } from "@/app/lib/acp/sessions";

// ACP: create a checkout session (POST /checkout_sessions).
export async function POST(request: NextRequest) {
  return handleAcp(request, async ({ identity, body }) => {
    const session = createSession(identity, body);
    await saveSession(session);
    return { status: 201, body: renderSession(session) };
  });
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
