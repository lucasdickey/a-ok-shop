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
