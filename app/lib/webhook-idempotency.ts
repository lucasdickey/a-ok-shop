/**
 * Webhook idempotency guard.
 *
 * Stripe delivers each event at least once, and retries any delivery that does
 * not return 2xx. Without a guard, a retry re-sends order emails. When REDIS_URL
 * is configured the marker is shared across serverless instances; otherwise we
 * fall back to a per-instance cache, which still catches the common case of
 * rapid duplicate deliveries hitting the same warm instance.
 */

import Redis from "ioredis";

const PROCESSED_TTL_SECONDS = 60 * 60 * 24; // Stripe retries for up to 3 days
const MEMORY_CACHE_LIMIT = 500;

let redis: Redis | null = null;
let redisUnavailable = false;

function getRedis(): Redis | null {
  if (redisUnavailable || !process.env.REDIS_URL) {
    return null;
  }

  if (!redis) {
    redis = new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: 2,
      enableReadyCheck: true,
      lazyConnect: true,
    });

    // Never let a Redis outage take down webhook processing.
    redis.on("error", (error) => {
      console.error("Idempotency store error:", error.message);
    });
  }

  return redis;
}

// Insertion-ordered set used as a bounded LRU.
const recentEventIds = new Set<string>();

function rememberInMemory(eventId: string): boolean {
  if (recentEventIds.has(eventId)) {
    return false;
  }

  recentEventIds.add(eventId);

  if (recentEventIds.size > MEMORY_CACHE_LIMIT) {
    const oldest = recentEventIds.values().next().value;
    if (oldest !== undefined) {
      recentEventIds.delete(oldest);
    }
  }

  return true;
}

/**
 * Claim an event for processing. Returns true if this caller owns it, and
 * false if it has already been handled.
 */
export async function claimEvent(eventId: string): Promise<boolean> {
  if (!rememberInMemory(eventId)) {
    return false;
  }

  const client = getRedis();
  if (!client) {
    return true;
  }

  try {
    const result = await client.set(
      `stripe:event:${eventId}`,
      "1",
      "EX",
      PROCESSED_TTL_SECONDS,
      "NX"
    );
    return result === "OK";
  } catch (error) {
    redisUnavailable = true;
    console.error(
      "Idempotency store unavailable, falling back to in-memory guard:",
      error
    );
    return true;
  }
}

/**
 * Release a claim so Stripe's retry can be processed. Called when handling
 * fails, so a transient error does not permanently swallow the event.
 */
export async function releaseEvent(eventId: string): Promise<void> {
  recentEventIds.delete(eventId);

  const client = getRedis();
  if (!client) {
    return;
  }

  try {
    await client.del(`stripe:event:${eventId}`);
  } catch (error) {
    console.error("Failed to release idempotency claim:", error);
  }
}
