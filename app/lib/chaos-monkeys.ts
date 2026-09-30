import manifest from "@/app/data/chaos-monkeys.json";

/**
 * Chaos Monkeys: the daily drop of new A-OK apes.
 *
 * `app/data/chaos-monkeys.json` is written by the local publishing tool in
 * `scripts/chaos-monkeys` (see its README). Entries are validated here at build
 * time, so a malformed manifest fails the build instead of reaching the site.
 */

export type ChaosMonkeyEngine = "hybrid" | "astra" | "code";

export type ChaosMonkey = {
  /** Four-digit series number, e.g. "0001". */
  id: string;
  /** Publication date, YYYY-MM-DD. */
  date: string;
  title: string;
  slogan: string;
  /** One sentence explaining the joke. */
  joke: string;
  alt: string;
  /** Public path of the image, e.g. /chaos-monkeys/0001.webp */
  image: string;
  width: number;
  height: number;
  /** hybrid: Astra illustrates, Claude composes. astra: Astra's full poster. code: drawn by Claude in code. */
  engine: ChaosMonkeyEngine;
  credit: string;
  /** Series numbers this monkey riffs on. */
  parents: string[];
  /** The story a topical monkey riffs on, e.g. that day's Zingers strip. */
  inspiration?: { label: string; url: string };
};

const ENGINES: readonly ChaosMonkeyEngine[] = ["hybrid", "astra", "code"];

function isText(value: unknown, max: number): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.length <= max;
}

function parseEntry(value: unknown, index: number): ChaosMonkey {
  const fail = (field: string): never => {
    throw new Error(`app/data/chaos-monkeys.json entry ${index}: invalid ${field}`);
  };
  if (typeof value !== "object" || value === null) fail("entry");
  const entry = value as Record<string, unknown>;

  if (typeof entry.id !== "string" || !/^\d{4}$/.test(entry.id)) fail("id");
  if (typeof entry.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(entry.date)) fail("date");
  if (!isText(entry.title, 60)) fail("title");
  if (!isText(entry.slogan, 90)) fail("slogan");
  if (!isText(entry.joke, 280)) fail("joke");
  if (!isText(entry.alt, 280)) fail("alt");
  if (typeof entry.image !== "string" || !/^\/chaos-monkeys\/\d{4}\.webp$/.test(entry.image)) fail("image");
  if (typeof entry.width !== "number" || entry.width <= 0) fail("width");
  if (typeof entry.height !== "number" || entry.height <= 0) fail("height");
  if (!ENGINES.includes(entry.engine as ChaosMonkeyEngine)) fail("engine");
  if (!isText(entry.credit, 120)) fail("credit");
  const parents = entry.parents;
  if (!Array.isArray(parents) || !parents.every((p) => typeof p === "string" && /^\d{4}$/.test(p))) {
    fail("parents");
  }
  if (entry.inspiration !== undefined) {
    const inspiration = entry.inspiration as Record<string, unknown> | null;
    if (!inspiration || !isText(inspiration.label, 80) || typeof inspiration.url !== "string" || !/^https:\/\//.test(inspiration.url)) {
      fail("inspiration");
    }
  }

  return entry as ChaosMonkey;
}

const monkeys: ChaosMonkey[] = (manifest as unknown[])
  .map(parseEntry)
  .sort((a, b) => b.id.localeCompare(a.id));

if (new Set(monkeys.map((monkey) => monkey.id)).size !== monkeys.length) {
  throw new Error("app/data/chaos-monkeys.json: series numbers must be unique");
}

/** Every published Chaos Monkey, newest first. */
export function getChaosMonkeys(): ChaosMonkey[] {
  return monkeys;
}

/** The monkeys published on the most recent drop date, newest first. */
export function getLatestDrop(): ChaosMonkey[] {
  const latest = monkeys[0]?.date;
  return latest ? monkeys.filter((monkey) => monkey.date === latest) : [];
}

/** "2026-09-29" → "Sep 29, 2026", independent of the server's time zone. */
export function formatDropDate(date: string): string {
  return new Date(`${date}T12:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}
