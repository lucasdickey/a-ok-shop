/**
 * Redis Client for Checkout Session Storage
 *
 * Stores checkout sessions with 24-hour TTL for OpenAI ACP integration
 */

import Redis from 'ioredis';

// Create Redis client instance
// With lazyConnect: true, Redis will automatically connect on first command
const redis = new Redis(process.env.REDIS_URL || '', {
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  lazyConnect: true,
});

export interface CheckoutSession {
  id: string;
  status: 'not_ready_for_payment' | 'ready_for_payment' | 'in_progress' | 'completed' | 'canceled';
  currency: string;
  items: Array<{
    id: string;
    quantity: number;
  }>;
  fulfillment_address?: Address;
  fulfillment_option_id?: string;
  buyer?: Buyer;
  line_items: LineItem[];
  fulfillment_options: FulfillmentOption[];
  totals: Total[];
  created_at: number;
  updated_at: number;
  expires_at: number;
  cancellation_reason?: string;
  canceled_at?: number;
  payment_intent_id?: string;
  completed_at?: number;
}

export interface Address {
  name: string;
  line_one: string;
  line_two?: string;
  city: string;
  state: string;
  country: string;
  postal_code: string;
  phone_number?: string;
}

export interface Buyer {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone_number?: string;
}

export interface LineItem {
  id: string;
  product_id?: string;
  title?: string;
  subtitle?: string;
  item?: {
    id: string;
    title: string;
    image_url?: string;
  };
  quantity: number;
  base_amount: number;
  discount?: number;
  discount_amount?: number;
  subtotal: number;
  tax: number;
  total: number;
  currency?: string;
  image_url?: string;
}

export interface FulfillmentOption {
  type: 'shipping' | 'digital';
  id: string;
  title: string;
  subtitle?: string;
  carrier_info?: {
    name: string;
    tracking_available: boolean;
  };
  earliest_delivery_time?: string;
  latest_delivery_time?: string;
  subtotal: number;
  tax: number;
  total: number;
}

export interface Total {
  type: 'items_base_amount' | 'items_discount' | 'subtotal' | 'discount' | 'fulfillment' | 'tax' | 'fee' | 'total' | 'merchandise' | 'shipping';
  display_text?: string;
  label?: string;
  amount: number;
}

const SESSION_TTL = 86400; // 24 hours in seconds

/**
 * Store a checkout session in Redis
 */
export async function setCheckoutSession(id: string, session: CheckoutSession): Promise<void> {
  const key = `checkout:${id}`;
  await redis.set(key, JSON.stringify(session), 'EX', SESSION_TTL);
}

/**
 * Retrieve a checkout session from Redis
 */
export async function getCheckoutSession(id: string): Promise<CheckoutSession | null> {
  const key = `checkout:${id}`;
  const data = await redis.get(key);

  if (!data) {
    return null;
  }

  try {
    return JSON.parse(data) as CheckoutSession;
  } catch (error) {
    console.error('Failed to parse checkout session:', error);
    return null;
  }
}

/**
 * Delete a checkout session from Redis
 */
export async function deleteCheckoutSession(id: string): Promise<void> {
  const key = `checkout:${id}`;
  await redis.del(key);
}

/**
 * Update an existing checkout session
 */
export async function updateCheckoutSession(
  id: string,
  updates: Partial<CheckoutSession>
): Promise<CheckoutSession | null> {
  const session = await getCheckoutSession(id);

  if (!session) {
    return null;
  }

  const updated: CheckoutSession = {
    ...session,
    ...updates,
    updated_at: Date.now()
  };

  await setCheckoutSession(id, updated);
  return updated;
}

/**
 * Check if a session exists and is not expired
 */
export async function sessionExists(id: string): Promise<boolean> {
  const session = await getCheckoutSession(id);
  return session !== null && session.expires_at > Date.now();
}

/**
 * Generate a unique checkout session ID
 */
export function generateSessionId(): string {
  return `cs_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
}

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
    const count = await redis.incr(rateKey);
    if (count === 1) await redis.expire(rateKey, windowSeconds);
    return count <= limit;
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
