import { timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { getChaosMonkeys } from "@/app/lib/chaos-monkeys";
import { getRequests } from "@/app/lib/print-requests";

// Owner-only: every Chaos Monkey ranked by "Print this" requests, including counts under 5.
// Open /api/print-requests/top?token=<PRINT_REQUESTS_ADMIN_TOKEN>. Without the token set, it doesn't exist.
export const dynamic = "force-dynamic";

function tokenMatches(given: string | null): boolean {
  const expected = process.env.PRINT_REQUESTS_ADMIN_TOKEN;
  if (!expected || !given) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function GET(request: NextRequest) {
  if (!tokenMatches(request.nextUrl.searchParams.get("token") ?? request.headers.get("x-admin-token"))) {
    return new NextResponse("Not found", { status: 404 });
  }

  const monkeys = getChaosMonkeys();
  const { counts } = await getRequests(monkeys.map((monkey) => monkey.id), null);
  const ranked = monkeys
    .map((monkey) => ({ id: monkey.id, title: monkey.title, date: monkey.date, requests: counts[monkey.id] ?? 0 }))
    .sort((a, b) => b.requests - a.requests || b.id.localeCompare(a.id));

  const response = NextResponse.json({ ranked });
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("X-Robots-Tag", "noindex");
  return response;
}
