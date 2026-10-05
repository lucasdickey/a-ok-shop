import { createHmac } from "crypto";
import Redis from "ioredis";

/**
 * "Print this" requests on Chaos Monkeys: how many people want each one made into a tee.
 *
 * Fairness rules, so one person can't inflate a count:
 * - One request per visitor per monkey. A visitor is a random ID in a cookie; asking again
 *   changes nothing, and taking a request back removes it.
 * - At most MAX_PER_ADDRESS active requests per monkey from one internet address, so clearing
 *   cookies or opening a private window doesn't help much. Addresses are stored scrambled.
 * - A daily cap on changes per address (enforced in the API route).
 *
 * Uses Redis when REDIS_URL is set; otherwise keeps counts in memory (local development only).
 */

export const MAX_PER_ADDRESS = 3;
/** Counts below this are not shown to customers. */
export const MIN_PUBLIC_COUNT = 5;

const votersKey = (id: string) => `printreq:voters:${id}`; // visitor ID → scrambled address
const addressesKey = (id: string) => `printreq:addresses:${id}`; // scrambled address → active requests

let redis: Redis | null = null;
function getRedis(): Redis | null {
  if (!process.env.REDIS_URL) return null;
  redis ??= new Redis(process.env.REDIS_URL, { maxRetriesPerRequest: 3, lazyConnect: true });
  return redis;
}

const memory = new Map<string, Map<string, string>>();
const memoryHash = (key: string) => {
  if (!memory.has(key)) memory.set(key, new Map());
  return memory.get(key)!;
};

/** Scrambles an internet address so the raw address is never stored. */
export function scrambleAddress(address: string): string {
  const secret = process.env.PRINT_REQUEST_SECRET || "a-ok-print-requests";
  return createHmac("sha256", secret).update(address).digest("hex").slice(0, 32);
}

export type ChangeResult = { wanted: boolean; count: number } | { error: "address_limit" };

/** Adds or removes one visitor's request for one monkey. */
export async function setRequest(id: string, visitor: string, address: string, want: boolean): Promise<ChangeResult> {
  const client = getRedis();
  if (!client) return setRequestInMemory(id, visitor, address, want);

  const existing = await client.hget(votersKey(id), visitor);
  if (want && existing === null) {
    const fromAddress = Number((await client.hget(addressesKey(id), address)) ?? 0);
    if (fromAddress >= MAX_PER_ADDRESS) return { error: "address_limit" };
    if (await client.hsetnx(votersKey(id), visitor, address)) await client.hincrby(addressesKey(id), address, 1);
  } else if (!want && existing !== null) {
    if (await client.hdel(votersKey(id), visitor)) await client.hincrby(addressesKey(id), existing, -1);
  }
  return { wanted: want, count: await client.hlen(votersKey(id)) };
}

function setRequestInMemory(id: string, visitor: string, address: string, want: boolean): ChangeResult {
  const voters = memoryHash(votersKey(id));
  const addresses = memoryHash(addressesKey(id));
  const existing = voters.get(visitor);
  if (want && existing === undefined) {
    const fromAddress = Number(addresses.get(address) ?? 0);
    if (fromAddress >= MAX_PER_ADDRESS) return { error: "address_limit" };
    voters.set(visitor, address);
    addresses.set(address, String(fromAddress + 1));
  } else if (!want && existing !== undefined) {
    voters.delete(visitor);
    addresses.set(existing, String(Number(addresses.get(existing) ?? 1) - 1));
  }
  return { wanted: want, count: voters.size };
}

/** Every monkey's request count, and which of them this visitor has asked for. */
export async function getRequests(ids: string[], visitor: string | null): Promise<{ counts: Record<string, number>; mine: string[] }> {
  const client = getRedis();
  const counts: Record<string, number> = {};
  const mine: string[] = [];
  if (!client) {
    for (const id of ids) {
      const voters = memoryHash(votersKey(id));
      counts[id] = voters.size;
      if (visitor && voters.has(visitor)) mine.push(id);
    }
    return { counts, mine };
  }

  const pipeline = client.pipeline();
  for (const id of ids) {
    pipeline.hlen(votersKey(id));
    pipeline.hexists(votersKey(id), visitor ?? "-");
  }
  const results = (await pipeline.exec()) ?? [];
  ids.forEach((id, index) => {
    counts[id] = Number(results[index * 2]?.[1] ?? 0);
    if (visitor && Number(results[index * 2 + 1]?.[1] ?? 0) === 1) mine.push(id);
  });
  return { counts, mine };
}

/** Counts customers see: hidden (null) until a monkey reaches MIN_PUBLIC_COUNT. */
export function publicCount(count: number): number | null {
  return count >= MIN_PUBLIC_COUNT ? count : null;
}
