import { NextRequest } from "next/server";

import { AcpError, handleAcp } from "@/app/lib/acp/protocol";
import { loadSession, renderSession, saveSession } from "@/app/lib/acp/sessions";

type Params = { params: { id: string } };

// ACP: cancel an open checkout session (POST /checkout_sessions/{id}/cancel).
export async function POST(request: NextRequest, { params }: Params) {
  return handleAcp(request, async ({ identity }) => {
    const session = await loadSession(params.id, identity);
    if (session.state !== "open") {
      // The spec answers 405 for a session that is already completed or canceled.
      throw new AcpError(405, "invalid_request", "invalid_state", `This checkout session is already ${session.state}`);
    }
    session.state = "canceled";
    session.updatedAt = new Date().toISOString();
    await saveSession(session);
    return { status: 200, body: renderSession(session) };
  });
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
