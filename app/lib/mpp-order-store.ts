import Redis from 'ioredis';
import { MPPOrder } from '@/app/types/mpp';

/**
 * MPP Order Store
 *
 * Persists MPP orders to Redis for tracking fulfillment
 */

let redis: Redis | null = null;

function getRedisClient(): Redis | null {
  if (!redis && process.env.REDIS_URL) {
    redis = new Redis(process.env.REDIS_URL);
  }
  return redis;
}

// Re-export MPPOrder for convenience
export type { MPPOrder };

/**
 * Save an MPP order to Redis
 */
export async function saveOrder(order: MPPOrder): Promise<void> {
  const redisClient = getRedisClient();
  if (!redisClient) {
    console.warn('[MPP] Redis not configured, order not persisted:', order.orderId);
    return;
  }

  try {
    const key = `mpp:order:${order.orderId}`;
    await redisClient.setex(
      key,
      60 * 60 * 24 * 30, // 30 days TTL
      JSON.stringify(order)
    );
    console.log('[MPP] Order saved:', order.orderId);
  } catch (error) {
    console.error('[MPP] Error saving order:', error);
    throw error;
  }
}
