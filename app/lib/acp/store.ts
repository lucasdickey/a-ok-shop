import Redis from "ioredis";

/*
 * Storage for ACP checkout sessions and idempotency records. Redis when
 * REDIS_URL is set. A local dev server without Redis keeps them in memory;
 * production without Redis refuses, since sessions must survive between
 * requests that may reach different servers.
 */

let redis: Redis | null = null;
// On globalThis so the dev server's per-route reloads share one store.
const devGlobal = globalThis as { acpMemoryStore?: Map<string, { value: string; expiresAt: number }> };
const memory = (devGlobal.acpMemoryStore ??= new Map());

function client(): Redis | null {
  if (!redis && process.env.REDIS_URL) {
    redis = new Redis(process.env.REDIS_URL, { maxRetriesPerRequest: 3 });
  }
  return redis;
}

/** False when sessions can't be stored safely (production without Redis). */
export function storeAvailable(): boolean {
  return Boolean(process.env.REDIS_URL) || process.env.NODE_ENV !== "production";
}

function memoryGet(key: string): string | null {
  const entry = memory.get(key);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    memory.delete(key);
    return null;
  }
  return entry.value;
}

export async function getJson<T>(key: string): Promise<T | null> {
  const redisClient = client();
  const raw = redisClient ? await redisClient.get(key) : memoryGet(key);
  return raw ? (JSON.parse(raw) as T) : null;
}

export async function setJson(key: string, value: unknown, ttlSeconds: number): Promise<void> {
  const raw = JSON.stringify(value);
  const redisClient = client();
  if (redisClient) {
    await redisClient.set(key, raw, "EX", ttlSeconds);
    return;
  }
  memory.set(key, { value: raw, expiresAt: Date.now() + ttlSeconds * 1000 });
}

/** Sets the key only if it doesn't exist. Returns false when it already did. */
export async function setJsonIfAbsent(key: string, value: unknown, ttlSeconds: number): Promise<boolean> {
  const raw = JSON.stringify(value);
  const redisClient = client();
  if (redisClient) {
    return (await redisClient.set(key, raw, "EX", ttlSeconds, "NX")) === "OK";
  }
  if (memoryGet(key) !== null) return false;
  memory.set(key, { value: raw, expiresAt: Date.now() + ttlSeconds * 1000 });
  return true;
}

export async function remove(key: string): Promise<void> {
  const redisClient = client();
  if (redisClient) {
    await redisClient.del(key);
    return;
  }
  memory.delete(key);
}
