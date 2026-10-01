/**
 * Claude's jobs: write the day's briefs and judge the finished drafts.
 *
 * Every call is a headless `claude -p` on the Claude login already on this Mac (no API key). `--restricted` removes
 * the tools that run code, ignores settings and hooks, and confines file reads to the run directory.
 */
import {
  GARMENTS,
  GARMENT_COLORS,
  MODELS,
  PLACEMENTS,
  log,
  readBrand,
  readStyles,
  run,
  type Brief,
  type Draft,
  type Judgment,
  type Style,
  type Template,
  type Topic,
} from "./config.ts";

type ClaudeJson = { is_error?: boolean; result?: string; structured_output?: unknown };

async function askClaude(prompt: string, schema: object, cwd: string, effort: "medium" | "high"): Promise<unknown> {
  const args = [
    "-p",
    "--restricted",
    "--strict-mcp-config",
    "--permission-prompts",
    "none",
    "--no-session-persistence",
    "--output-format",
    "json",
    "--json-schema",
    JSON.stringify(schema),
    "--model",
    MODELS.claude,
    "--effort",
    effort,
  ];
  const { code, stdout, stderr } = await run("claude", args, { cwd, input: prompt, timeoutMs: 10 * 60_000 });
  if (code !== 0) throw new Error(`claude exited ${code}: ${(stderr || stdout).slice(-500)}`);
  const parsed = JSON.parse(stdout) as ClaudeJson;
  if (parsed.is_error || parsed.structured_output === undefined) {
    throw new Error(`claude returned no structured output: ${String(parsed.result).slice(0, 500)}`);
  }
  return parsed.structured_output;
}

const TEXT = { type: "string" } as const;

function briefsSchema(styleIds: string[]) {
  return {
    type: "object",
    properties: {
      briefs: {
        type: "array",
        items: {
          type: "object",
          properties: {
            style: { enum: styleIds },
            title: TEXT,
            printText: { type: "array", items: TEXT },
            slogan: TEXT,
            productCopy: TEXT,
            marketingCopy: TEXT,
            joke: TEXT,
            alt: TEXT,
            garment: { enum: [...GARMENTS] },
            garmentColor: { enum: [...GARMENT_COLORS] },
            placement: { enum: [...PLACEMENTS] },
            colorway: { enum: ["cream", "red", "ink"] },
            art: TEXT,
            form: {
              anyOf: [
                { type: "null" },
                {
                  type: "object",
                  properties: {
                    heading: TEXT,
                    rows: {
                      type: "array",
                      items: { type: "object", properties: { label: TEXT, value: TEXT }, required: ["label", "value"] },
                    },
                  },
                  required: ["heading", "rows"],
                },
              ],
            },
            parents: { type: "array", items: TEXT },
          },
          required: [
            "style",
            "title",
            "printText",
            "slogan",
            "productCopy",
            "marketingCopy",
            "joke",
            "alt",
            "garment",
            "garmentColor",
            "placement",
            "colorway",
            "art",
            "form",
            "parents",
          ],
        },
      },
    },
    required: ["briefs"],
  };
}

/** A draft's assigned style; the topical slot (style null) lets Claude choose. */
type Slot = { style: Style | null; topical: boolean };

/** Kept and rejected counts per style, from every run's feedback. A shipped draft counts as kept. */
export type StyleScores = Map<string, { keep: number; reject: number }>;

/**
 * Picks `count` different styles at random, weighted by STYLES.md and by feedback: each keep raises a style's odds
 * and each reject lowers them, so the mix drifts toward what the person picks without ever losing a style entirely.
 * With a Zingers topic, the first slot is topical and Claude chooses its style.
 */
export function draftSlots(count: number, topical: boolean, styles: Style[], scores: StyleScores): Slot[] {
  const weightOf = (style: Style) => {
    const score = scores.get(style.id) ?? { keep: 0, reject: 0 };
    return style.weight * ((1 + score.keep) / (1 + score.reject));
  };
  const picked: Style[] = [];
  let pool = styles.filter((style) => style.weight > 0);
  const wanted = topical ? count - 1 : count;
  while (picked.length < wanted && styles.length) {
    if (!pool.length) pool = styles.filter((style) => style.weight > 0);
    const total = pool.reduce((sum, style) => sum + weightOf(style), 0);
    let roll = Math.random() * total;
    const index = Math.max(0, pool.findIndex((style) => (roll -= weightOf(style)) <= 0));
    picked.push(pool[index]);
    pool = pool.filter((_, i) => i !== index);
  }
  return [...(topical ? [{ style: null, topical: true }] : []), ...picked.map((style) => ({ style, topical: false }))];
}

const clip = (value: string, max: number): string => value.replace(/\s+/g, " ").trim().slice(0, max);
const oneOf = <T extends string>(value: unknown, allowed: readonly T[], fallback: T): T =>
  allowed.includes(value as T) ? (value as T) : fallback;

/** Enforces the slot, the length limits, and known parents, so templates never receive surprises. */
function normalizeBrief(raw: Brief, slot: Slot, styles: Style[], publishedIds: Set<string>, topic: Topic | null): Brief {
  // The topical slot keeps Claude's choice of style; every other slot is fixed.
  const style = slot.style ?? styles.find((s) => s.id === raw.style) ?? styles.find((s) => s.id === "specimen") ?? styles[0];
  const template: Template | null = style.engine === "hybrid" ? style.template : null;
  const form =
    template === "form" && raw.form && raw.form.rows.length > 0
      ? {
          heading: clip(raw.form.heading, 36).toUpperCase(),
          rows: raw.form.rows.slice(0, 6).map((row) => ({
            label: clip(row.label, 18).toUpperCase(),
            value: clip(row.value, 24).toUpperCase(),
          })),
        }
      : null;
  if (template === "form" && !form) throw new Error(`"${raw.title}" is a form draft without form rows`);
  const title = clip(raw.title, 22).toUpperCase();
  const slogan = clip(raw.slogan, 48).toUpperCase();
  // House templates always print the title and slogan; Astra prints only what the brief lists, within the style's budget.
  const printText =
    style.engine === "hybrid"
      ? [title, slogan]
      : (raw.printText ?? [])
          .map((line) => clip(line, 32))
          .filter(Boolean)
          .slice(0, style.text);
  return {
    title,
    slogan,
    joke: clip(raw.joke, 260),
    alt: clip(raw.alt, 260),
    engine: style.engine,
    template,
    colorway: oneOf(raw.colorway, ["cream", "red", "ink"] as const, "cream"),
    style: style.id,
    garment: oneOf(raw.garment, GARMENTS, "tee"),
    garmentColor: oneOf(raw.garmentColor, GARMENT_COLORS, "black"),
    placement: oneOf(raw.placement, PLACEMENTS, "front"),
    printText,
    productCopy: clip(raw.productCopy ?? "", 500),
    marketingCopy: clip(raw.marketingCopy ?? "", 220),
    art: clip(raw.art, 1000),
    form,
    parents: raw.parents.filter((id) => publishedIds.has(id)).slice(0, 2),
    inspiration: slot.topical && topic ? { label: `Zingers, ${topic.date}`, url: topic.url } : null,
  };
}

/** One line of past feedback, as the brief writer sees it. */
export type FeedbackLine = { verdict: "keep" | "reject" | "shipped"; style: string; title: string; printText: string[]; note: string };

function feedbackBlock(lines: FeedbackLine[], notes: string[]): string {
  if (!lines.length && !notes.length) return "";
  const show = (verdict: FeedbackLine["verdict"]) =>
    lines
      .filter((line) => line.verdict === verdict)
      .map((line) => `- [${line.style}] ${line.title}${line.printText.length ? ` (prints: ${line.printText.join(" / ")})` : ""}${line.note ? ` — "${line.note}"` : ""}`)
      .join("\n") || "(none)";
  return `FEEDBACK FROM THE PERSON WHO PICKS (most recent first; this is the strongest signal you have, so follow it):
${notes.length ? `On whole batches:\n${notes.map((note) => `- "${note}"`).join("\n")}\n` : ""}Shipped:
${show("shipped")}
Kept:
${show("keep")}
Rejected:
${show("reject")}

`;
}

export async function writeBriefs(options: {
  count: number;
  cwd: string;
  published: Array<{ id: string; title: string; slogan: string }>;
  recentlyDrafted: string[];
  topic: Topic | null;
  feedback: FeedbackLine[];
  feedbackNotes: string[];
  styleScores: StyleScores;
}): Promise<Brief[]> {
  const brand = readBrand();
  const styles = readStyles();
  const slots = draftSlots(options.count, options.topic !== null, styles, options.styleScores);
  const styleLine = (style: Style) =>
    `"${style.id}" (${style.name}): ${style.description} ${style.engine === "hybrid" ? "Prints the title and slogan." : style.text === 0 ? "Print text: none." : `Print text: at most ${style.text} short string${style.text > 1 ? "s" : ""}.`}`;
  const slotLines = slots.map((slot, i) =>
    slot.style
      ? `- Draft ${i + 1}: style ${styleLine(slot.style)}`
      : `- Draft ${i + 1}: TOPICAL (see TODAY'S STORY). Choose whichever style from the library below suits the joke best.`,
  );
  const topicBlock = options.topic
    ? `TODAY'S STORY (from Zingers, our daily AI-news comic)
Headline: ${options.topic.headline}
What happened: ${options.topic.summary}
Why it is funny: ${options.topic.angle}

The topical draft turns this story into an A-OK graphic. Keep every rule: no company, product, model, or person names anywhere in the brief, and no politics. Translate the story into the general idea behind it, so it lands for someone who missed the news, while people who saw the story recognise it.

STYLE LIBRARY (for the topical draft)
${styles.map((style) => `- ${styleLine(style)}`).join("\n")}

`
    : "";
  const published = options.published.length
    ? options.published.map((m) => `Nº ${m.id} ${m.title}: ${m.slogan}`).join("\n")
    : "(nothing yet: these are the first)";
  const recent = options.recentlyDrafted.length ? options.recentlyDrafted.join("\n") : "(none)";

  const prompt = `You are the creative director of A-OK, an AI-culture streetwear label. Every day you brief a new set of "Chaos Monkeys": tee and hoodie graphics starring the A-OK ape. They are published on the A-OK site and are the source of the next shirts, so think like a streetwear designer, not a poster designer: one strong graphic idea per shirt, few words on the fabric, and the rest of the bit in the product and marketing copy.

Each draft has an assigned style. Most are drawn whole by GPT-6-Astra from your "art" description, as flat artwork on a swatch of the garment colour. Two are house templates ("specimen" and "form"): Astra draws only the ape as a cutout from your "art" description, and the template sets the title and slogan (and, for "form", your form rows) in type.

BRAND GUIDE
Character: ${brand.character}
Style: ${brand.style}
Palette: ${brand.palette}
Voice:
${brand.voice}
Rules:
${brand.rules}

${feedbackBlock(options.feedback, options.feedbackNotes)}ALREADY PUBLISHED (never repeat these jokes; you may riff on one and list its number in "parents"):
${published}

DRAFTED RECENTLY BUT NOT PUBLISHED (do not repeat):
${recent}

${topicBlock}Write exactly ${slots.length} new briefs, in this order:
${slotLines.join("\n")}
Every draft must use a different AI or computing idea and a different visual gag. Commit to each style: the varsity one should look like it came off a letterman jacket, the woodcut one like an almanac page. Homage the format, never another brand's name, logo, or pattern. Vary garments, garment colours, and placements across the set.

Fields:
- style: the draft's assigned style id (for the topical draft, your choice).
- title: the design's name, 1–3 words, UPPERCASE, at most 22 characters. It is what the archive and the product page call the design; it only appears on the shirt if it is also in printText.
- printText: every string that appears in the print, spelled exactly as it should be printed, within the style's budget (beyond the cap's "A-OK" and the hoodie's "APES ON KEYS", which are always allowed). Often just the title, sometimes nothing. Each at most 32 characters. Ignored for "specimen" and "form", which print the title and slogan.
- slogan: UPPERCASE, at most 45 characters, two or three beats. The line that sells the design; printed only if it is also in printText.
- productCopy: 2–3 sentences for the product page, in the brand voice. Carry the joke the shirt doesn't spell out, and say what the shirt is (garment, colour, where the print sits). At most 450 characters.
- marketingCopy: one launch line for social or email, at most 200 characters. No hashtags.
- joke: one plain sentence explaining the gag, for the archive page.
- alt: one sentence describing the finished graphic for screen readers: the ape, what he is doing, the style, and any printed words.
- garment, garmentColor, placement: the shirt this is for. Choose what suits the style (a chest hit goes on the left chest, a pattern is all-over, a tour tee is front or back). The ink colours stay in the brand palette.
- art: for Astra styles, describe the whole graphic: composition, how the style shows up, the ape's pose and props, and where each printText string sits. For "specimen" and "form", describe only the ape's pose, expression, and props, with no background and no text beyond the cap and hoodie.
- colorway: for "specimen", cream, red, or ink. Otherwise "cream".
- form: for "form", a heading (an official-sounding form name, at most 36 characters) and 3–6 rows (labels at most 18 characters, values at most 24). Otherwise null.
- parents: [] unless the draft deliberately riffs on a published monkey.`;

  const output = (await askClaude(prompt, briefsSchema(styles.map((style) => style.id)), options.cwd, "high")) as { briefs: Brief[] };
  const publishedIds = new Set(options.published.map((m) => m.id));
  const briefs: Brief[] = [];
  output.briefs.slice(0, slots.length).forEach((raw, i) => {
    try {
      briefs.push(normalizeBrief(raw, slots[i], styles, publishedIds, options.topic));
    } catch (error) {
      log(`skipping brief ${i + 1}: ${(error as Error).message}`);
    }
  });
  if (briefs.length === 0) throw new Error("Claude returned no usable briefs");
  return briefs;
}

const JUDGE_SCHEMA = {
  type: "object",
  properties: {
    results: {
      type: "array",
      items: {
        type: "object",
        properties: {
          draft: { type: "integer" },
          textSeen: { type: "array", items: TEXT },
          textOk: { type: "boolean" },
          onModel: { type: "boolean" },
          rulesOk: { type: "boolean" },
          jokeLands: { type: "boolean" },
          score: { type: "integer", minimum: 1, maximum: 10 },
          note: TEXT,
        },
        required: ["draft", "textSeen", "textOk", "onModel", "rulesOk", "jokeLands", "score", "note"],
      },
    },
  },
  required: ["results"],
};

/** The text a draft should contain: the brief's words plus the house template's labels. */
export function expectedText(draft: Draft, label: string, dateLabel: string): string[] {
  const { brief } = draft;
  const text = [...brief.printText, "A-OK"];
  if (brief.template === "specimen") text.push(label, `CHAOS MONKEYS · ${dateLabel}`, "APES ON KEYS");
  if (brief.template === "form" && brief.form) {
    text.push(`FORM A-OK/${label.replace(/^\D+/, "")}`, brief.form.heading, "INSPECTOR NO. 7 · SIGNATURE");
    for (const row of brief.form.rows) text.push(row.label, row.value);
  }
  return text;
}

export async function judgeDrafts(runDir: string, drafts: Draft[], dateLabel: string): Promise<Judgment[]> {
  const brand = readBrand();
  const styles = readStyles();
  const lines = drafts.map((draft) => {
    const expected = expectedText(draft, `DRAFT ${draft.n}`, dateLabel).map((t) => JSON.stringify(t)).join(", ");
    const style = styles.find((s) => s.id === draft.brief.style);
    return `Draft ${draft.n}: ${draft.image}
  Style: ${style ? `${style.name}: ${style.description}` : draft.brief.style}
  For: ${draft.brief.garmentColor} ${draft.brief.garment}, ${draft.brief.placement}
  Joke: ${draft.brief.joke}
  Expected text: ${expected}. "APES ON KEYS" on the hoodie is also fine. Nothing else should be legible, except incidental marks such as a signature scribble or numbered callouts.`;
  });

  const prompt = `You check A-OK's Chaos Monkeys, tee and hoodie graphics, before a person picks which to publish. Open each image below with the Read tool (paths are relative to the current directory) and judge it strictly against its brief.

Character: ${brand.character}
Rules:
${brand.rules}

For each draft report:
- textSeen: every piece of text you can read in the image, exactly as written.
- textOk: true only if each expected string is spelled exactly and there is no garbled, misspelled, or extra wording.
- onModel: the ape is recognisably the character (round O mouth, A-OK cap, red headphones), drawn in the style's idiom.
- rulesOk: no rule is broken.
- jokeLands: the graphic makes its idea clear at thumbnail size, as a shirt read from across a room, and it commits to its style.
- score: 1–10 overall; 7 or more means ready to publish.
- note: at most 140 characters, the single most important problem or strength.

${lines.join("\n\n")}`;

  const output = (await askClaude(prompt, JUDGE_SCHEMA, runDir, "medium")) as { results: Judgment[] };
  return output.results.map((result) => ({ ...result, note: clip(result.note, 160) }));
}
