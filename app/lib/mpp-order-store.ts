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

/**
 * Retrieve an MPP order from Redis
 */
export async function getOrder(orderId: string): Promise<MPPOrder | null> {
  const redisClient = getRedisClient();
  if (!redisClient) {
    console.warn('[MPP] Redis not configured, cannot retrieve order:', orderId);
    return null;
  }

  try {
    const key = `mpp:order:${orderId}`;
    const data = await redisClient.get(key);
    if (!data) {
      return null;
    }
    return JSON.parse(data) as MPPOrder;
  } catch (error) {
    console.error('[MPP] Error retrieving order:', error);
    return null;
  }
}

/**
 * Update an MPP order status
 */
export async function updateOrderStatus(
  orderId: string,
  status: MPPOrder['status']
): Promise<void> {
  const redisClient = getRedisClient();
  if (!redisClient) {
    console.warn('[MPP] Redis not configured, cannot update order:', orderId);
    return;
  }

  try {
    const order = await getOrder(orderId);
    if (!order) {
      console.warn('[MPP] Order not found:', orderId);
      return;
    }

    order.status = status;
    order.updatedAt = new Date().toISOString();
    await saveOrder(order);
    console.log('[MPP] Order status updated:', orderId, 'status:', status);
  } catch (error) {
    console.error('[MPP] Error updating order status:', error);
  }
}

/**
 * List all orders for an agent
 */
export async function listOrdersByAgent(agentId: string): Promise<MPPOrder[]> {
  const redisClient = getRedisClient();
  if (!redisClient) {
    console.warn('[MPP] Redis not configured, cannot list orders');
    return [];
  }

  try {
    const keys = await redisClient.keys('mpp:order:*');
    const orders: MPPOrder[] = [];

    for (const key of keys) {
      const data = await redisClient.get(key);
      if (data) {
        const order = JSON.parse(data) as MPPOrder;
        if (order.agentId === agentId) {
          orders.push(order);
        }
      }
    }

    return orders.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  } catch (error) {
    console.error('[MPP] Error listing orders by agent:', error);
    return [];
  }
}
