/**
 * Redis helpers: run a step once per key, and simple rate limits.
 */

import Redis from 'ioredis';

// Create Redis client instance
// With lazyConnect: true, Redis will automatically connect on first command
const redis = new Redis(process.env.REDIS_URL || '', {
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  lazyConnect: true,
});

const ONCE_PENDING_TTL = 300; // seconds a step may run before another attempt can claim it
const ONCE_DONE_TTL = 60 * 60 * 24 * 90; // remember completed steps for 90 days

/**
 * Run `fn` at most once per key (e.g. one owner alert per Stripe order), so
 * Stripe webhook retries and duplicate deliveries don't repeat side effects.
 * A failed run releases its claim so the next retry can try again.
 * Without REDIS_URL, `fn` runs every time.
 */
export async function runOnce(key: string, fn: () => Promise<void>): Promise<void> {
  if (!process.env.REDIS_URL) {
    await fn();
    return;
  }

  const onceKey = `once:${key}`;
  const claimed = await redis.set(onceKey, 'pending', 'EX', ONCE_PENDING_TTL, 'NX');
  if (!claimed) {
    if ((await redis.get(onceKey)) === 'done') return;
    throw new Error(`Step already in progress: ${key}`);
  }

  try {
    await fn();
  } catch (error) {
    await redis.del(onceKey);
    throw error;
  }
  await redis.set(onceKey, 'done', 'EX', ONCE_DONE_TTL);
}

const localCounts = new Map<string, { count: number; resetAt: number }>();

/**
 * Count one use of `key` and report whether it is still within `limit` per
 * `windowSeconds`. Uses Redis when REDIS_URL is set; otherwise falls back to a
 * per-server in-memory count, which is weaker but still bounded.
 */
export async function takeRateLimit(
  key: string,
  limit: number,
  windowSeconds: number
): Promise<boolean> {
  const rateKey = `rate:${key}`;
  if (process.env.REDIS_URL) {
    try {
      const count = await redis.incr(rateKey);
      if (count === 1) await redis.expire(rateKey, windowSeconds);
      return count <= limit;
    } catch (error) {
      // A Redis hiccup shouldn't cost a player their reward; fall back to the local count.
      console.error('Rate limit: Redis unavailable, using local count', error);
    }
  }

  const now = Date.now();
  if (localCounts.size > 10_000) {
    // Drop expired windows so the map stays bounded on long-lived servers.
    localCounts.forEach((value, mapKey) => {
      if (value.resetAt <= now) localCounts.delete(mapKey);
    });
  }
  const entry = localCounts.get(rateKey);
  if (!entry || entry.resetAt <= now) {
    localCounts.set(rateKey, { count: 1, resetAt: now + windowSeconds * 1000 });
    return true;
  }
  entry.count += 1;
  return entry.count <= limit;
}
