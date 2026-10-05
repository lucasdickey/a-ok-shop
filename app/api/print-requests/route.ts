import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { getChaosMonkeys } from "@/app/lib/chaos-monkeys";
import { takeRateLimit } from "@/app/lib/kv";
import { getRequests, publicCount, scrambleAddress, setRequest } from "@/app/lib/print-requests";

// "Print this" requests on Chaos Monkeys. See app/lib/print-requests.ts for the fairness rules.
const VISITOR_COOKIE = "aok_visitor";
const CHANGES_PER_ADDRESS_PER_DAY = 60;
const DAY_SECONDS = 24 * 60 * 60;

export const dynamic = "force-dynamic";

const monkeyIds = () => getChaosMonkeys().map((monkey) => monkey.id);

function visitorFrom(request: NextRequest): string | null {
  const value = request.cookies.get(VISITOR_COOKIE)?.value;
  return value && /^[0-9a-f-]{36}$/.test(value) ? value : null;
}

function addressFrom(request: NextRequest): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
}

// The in-memory fallback is only for local development: on the live site it would lose
// requests whenever the server restarts, so without Redis the feature stays off.
const unavailable = () => process.env.NODE_ENV === "production" && !process.env.REDIS_URL;

function noStore(body: unknown, init?: ResponseInit) {
  const response = NextResponse.json(body, init);
  response.headers.set("Cache-Control", "no-store");
  return response;
}

/** Counts customers may see (hidden under 5) and which monkeys this visitor asked for. */
export async function GET(request: NextRequest) {
  if (unavailable()) return noStore({ error: "unavailable" }, { status: 503 });
  try {
    const { counts, mine } = await getRequests(monkeyIds(), visitorFrom(request));
    const shown = Object.fromEntries(Object.entries(counts).map(([id, count]) => [id, publicCount(count)]));
    return noStore({ counts: shown, mine });
  } catch (error) {
    console.error("Print requests: could not read counts", error);
    return noStore({ error: "unavailable" }, { status: 503 });
  }
}

/** Adds or removes this visitor's request: { id: "0005", want: true }. */
export async function POST(request: NextRequest) {
  if (unavailable()) return noStore({ error: "unavailable" }, { status: 503 });
  const body = (await request.json().catch(() => null)) as { id?: unknown; want?: unknown } | null;
  const id = typeof body?.id === "string" ? body.id : "";
  if (!monkeyIds().includes(id) || typeof body?.want !== "boolean") {
    return noStore({ error: "invalid_request" }, { status: 400 });
  }

  const address = scrambleAddress(addressFrom(request));
  if (!(await takeRateLimit(`printreq:${address}`, CHANGES_PER_ADDRESS_PER_DAY, DAY_SECONDS))) {
    return noStore({ error: "too_many_changes" }, { status: 429 });
  }

  const visitor = visitorFrom(request) ?? randomUUID();
  try {
    const result = await setRequest(id, visitor, address, body.want);
    const response =
      "error" in result
        ? noStore(result, { status: 429 })
        : noStore({ id, wanted: result.wanted, count: publicCount(result.count) });
    response.cookies.set(VISITOR_COOKIE, visitor, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
    return response;
  } catch (error) {
    console.error("Print requests: could not save", error);
    return noStore({ error: "unavailable" }, { status: 503 });
  }
}
