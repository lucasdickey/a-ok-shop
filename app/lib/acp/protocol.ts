import { createHash, timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";

import { takeRateLimit } from "@/app/lib/kv";
import { getJson, remove, setJson, setJsonIfAbsent, storeAvailable } from "@/app/lib/acp/store";

/*
 * The request rules every ACP checkout endpoint shares (spec 2026-04-17):
 * API-Version, bearer key, flat errors, and Idempotency-Key on every POST so
 * an agent's retry returns the first answer instead of acting twice.
 */

export const ACP_VERSION = "2026-04-17";
export const SUPPORTED_VERSIONS = [ACP_VERSION];

const REQUESTS_PER_MINUTE = 120;
const IDEMPOTENCY_TTL_SECONDS = 60 * 60 * 24; // the spec asks for at least 24 hours
const IN_FLIGHT_TTL_SECONDS = 60;

type ErrorType = "invalid_request" | "processing_error" | "service_unavailable";

export class AcpError extends Error {
  constructor(
    readonly status: number,
    readonly type: ErrorType,
    readonly code: string,
    message: string,
    readonly param?: string,
    readonly extra: Record<string, unknown> = {},
    readonly headers: Record<string, string> = {}
  ) {
    super(message);
  }

  toResult(): AcpResult {
    return {
      status: this.status,
      body: {
        type: this.type,
        code: this.code,
        message: this.message,
        ...(this.param ? { param: this.param } : {}),
        ...this.extra,
      },
      headers: this.headers,
    };
  }
}

/** A 400 for a bad request field. `param` is a JSONPath into the request, e.g. "$.line_items[0].id". */
export function invalid(code: string, message: string, param?: string): AcpError {
  return new AcpError(400, "invalid_request", code, message, param);
}

export type AcpResult = { status: number; body: unknown; headers?: Record<string, string> };

export type AcpContext = {
  /** Who is calling: one per API key, or "public" when no keys are configured. */
  identity: string;
  /** The parsed JSON body of a POST; {} for GET. */
  body: Record<string, unknown>;
};

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

/** Same JSON regardless of key order, so equivalent retries match (spec §6.2). */
function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value as Record<string, unknown>)
        .sort()
        .map((key) => [key, canonical((value as Record<string, unknown>)[key])])
    );
  }
  return value;
}

function configuredKeys(): string[] {
  return (process.env.ACP_API_KEYS || "")
    .split(",")
    .map((key) => key.trim())
    .filter(Boolean);
}

/** Checks the bearer key when keys are configured. Without keys, ACP is open to any agent (rate-limited). */
function authenticate(request: NextRequest): string {
  const keys = configuredKeys();
  if (keys.length === 0) return "public";

  const token = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim() ?? "";
  const tokenHash = Buffer.from(sha256(token), "hex");
  const match = keys.some((key) => timingSafeEqual(Buffer.from(sha256(key), "hex"), tokenHash));
  if (!token || !match) {
    throw new AcpError(401, "invalid_request", "unauthorized", "A valid Authorization: Bearer key is required");
  }
  return `key_${sha256(token).slice(0, 16)}`;
}

function checkVersion(request: NextRequest) {
  const version = request.headers.get("api-version")?.trim();
  if (!version) {
    throw new AcpError(400, "invalid_request", "missing_api_version", "The API-Version header is required", undefined, {
      supported_versions: SUPPORTED_VERSIONS,
    });
  }
  if (!SUPPORTED_VERSIONS.includes(version)) {
    throw new AcpError(400, "invalid_request", "unsupported_api_version", `API version '${version.slice(0, 20)}' is not supported`, undefined, {
      supported_versions: SUPPORTED_VERSIONS,
    });
  }
}

async function checkRateLimit(request: NextRequest, identity: string) {
  const caller =
    identity === "public"
      ? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.ip || "unknown"
      : identity;
  if (!(await takeRateLimit(`acp:${caller}`, REQUESTS_PER_MINUTE, 60))) {
    throw new AcpError(429, "invalid_request", "rate_limited", "Too many requests; try again in a minute", undefined, {}, {
      "Retry-After": "60",
    });
  }
}

async function readBody(request: NextRequest): Promise<Record<string, unknown>> {
  const text = await request.text();
  if (!text.trim()) return {};
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw invalid("invalid_json", "The request body must be JSON");
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw invalid("invalid_json", "The request body must be a JSON object");
  }
  return parsed as Record<string, unknown>;
}

type IdempotencyRecord =
  | { state: "in_flight"; fingerprint: string }
  | { state: "done"; fingerprint: string; status: number; body: unknown };

async function runIdempotent(
  request: NextRequest,
  identity: string,
  body: Record<string, unknown>,
  run: () => Promise<AcpResult>
): Promise<AcpResult> {
  const key = request.headers.get("idempotency-key")?.trim();
  if (!key) {
    throw invalid("idempotency_key_required", "Idempotency-Key header is required on all POST requests");
  }
  if (key.length > 255) {
    throw invalid("invalid", "Idempotency-Key must be at most 255 characters");
  }

  // Scoped to the caller and the endpoint (spec §6.1).
  const recordKey = `acp:idem:${identity}:${sha256(`${request.nextUrl.pathname}\n${key}`)}`;
  const fingerprint = sha256(JSON.stringify(canonical(body)));

  const claimed = await setJsonIfAbsent(recordKey, { state: "in_flight", fingerprint }, IN_FLIGHT_TTL_SECONDS);
  if (!claimed) {
    const record = await getJson<IdempotencyRecord>(recordKey);
    if (record && record.fingerprint !== fingerprint) {
      throw new AcpError(422, "invalid_request", "idempotency_conflict", "Idempotency-Key has already been used with a different request body");
    }
    if (!record || record.state === "in_flight") {
      throw new AcpError(409, "invalid_request", "idempotency_in_flight", "A request with this Idempotency-Key is currently being processed", undefined, {}, {
        "Retry-After": "1",
      });
    }
    return { status: record.status, body: record.body, headers: { "Idempotent-Replayed": "true" } };
  }

  let result: AcpResult;
  try {
    result = await run();
  } catch (error) {
    if (!(error instanceof AcpError)) {
      await remove(recordKey);
      throw error;
    }
    // A refused request (e.g. a missing size) replays as refused, like any other answer.
    result = error.toResult();
  }
  // Server errors are never replayed: a retry after one runs fresh (spec §6.5).
  if (result.status >= 500) {
    await remove(recordKey);
  } else {
    await setJson(recordKey, { state: "done", fingerprint, status: result.status, body: result.body }, IDEMPOTENCY_TTL_SECONDS);
  }
  return result;
}

/** Runs an ACP endpoint: checks the request, then for POSTs applies idempotency around `handler`. */
export async function handleAcp(
  request: NextRequest,
  handler: (context: AcpContext) => Promise<AcpResult>
): Promise<NextResponse> {
  const echo: Record<string, string> = {};
  const requestId = request.headers.get("request-id");
  if (requestId && requestId.length <= 255) echo["Request-Id"] = requestId;
  const idempotencyKey = request.headers.get("idempotency-key");
  if (request.method === "POST" && idempotencyKey && idempotencyKey.length <= 255) {
    echo["Idempotency-Key"] = idempotencyKey;
  }

  let result: AcpResult;
  try {
    if (!storeAvailable()) {
      throw new AcpError(503, "service_unavailable", "not_configured", "Agent checkout needs REDIS_URL to be configured");
    }
    checkVersion(request);
    const identity = authenticate(request);
    await checkRateLimit(request, identity);

    if (request.method === "POST") {
      const body = await readBody(request);
      result = await runIdempotent(request, identity, body, () => handler({ identity, body }));
    } else {
      result = await handler({ identity, body: {} });
    }
  } catch (error) {
    if (error instanceof AcpError) {
      result = error.toResult();
    } else {
      console.error("[ACP] Unexpected error:", error instanceof Error ? error.message : error);
      result = new AcpError(500, "processing_error", "internal_error", "Something went wrong; please retry").toResult();
    }
  }

  return NextResponse.json(result.body, {
    status: result.status,
    headers: { ...echo, ...result.headers },
  });
}
