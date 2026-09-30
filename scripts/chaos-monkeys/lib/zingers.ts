/**
 * The day's AI/tech story from Zingers (zingers.dev), a sister project whose public JSON API is open to any origin.
 * One draft a day riffs on it. Any failure returns null, and the day simply has no topical draft.
 */
import { log, type Topic } from "./config.ts";

const ZINGERS = process.env.CHAOS_ZINGERS_URL ?? "https://zingers.dev";

type ZingersDay = {
  date: string;
  status: string;
  topic: { headline?: string; summary?: string; angle?: string } | null;
};

/** The newest completed Zingers story from `date` or the day before, or null. */
export async function fetchTopic(date: string): Promise<Topic | null> {
  try {
    const response = await fetch(`${ZINGERS}/api/zingers?limit=3`, { signal: AbortSignal.timeout(20_000) });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const { days } = (await response.json()) as { days: ZingersDay[] };
    const yesterday = new Date(Date.parse(`${date}T12:00:00Z`) - 86_400_000).toISOString().slice(0, 10);
    const day = days.find(
      (d) => d.status === "complete" && (d.date === date || d.date === yesterday) && d.topic?.headline && d.topic.summary,
    );
    if (!day?.topic) {
      log("zingers: no story from today or yesterday yet");
      return null;
    }
    return {
      date: day.date,
      headline: String(day.topic.headline).slice(0, 300),
      summary: String(day.topic.summary).slice(0, 1200),
      angle: String(day.topic.angle ?? "").slice(0, 800),
      url: `${ZINGERS}/zingers/${day.date}`,
    };
  } catch (error) {
    log(`zingers: unavailable (${(error as Error).message}); no topical draft today`);
    return null;
  }
}
