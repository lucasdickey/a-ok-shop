/**
 * Claude's jobs: write the day's briefs and judge the finished drafts.
 *
 * Every call is a headless `claude -p` on the Claude login already on this Mac (no API key). `--restricted` removes
 * the tools that run code, ignores settings and hooks, and confines file reads to the run directory.
 */
import { MODELS, log, readBrand, run, type Brief, type Colorway, type Draft, type Judgment, type Template, type Topic } from "./config.ts";

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

const BRIEFS_SCHEMA = {
  type: "object",
  properties: {
    briefs: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: TEXT,
          slogan: TEXT,
          joke: TEXT,
          alt: TEXT,
          engine: { enum: ["hybrid", "astra"] },
          template: { enum: ["specimen", "form", null] },
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
        required: ["title", "slogan", "joke", "alt", "engine", "template", "colorway", "art", "form", "parents"],
      },
    },
  },
  required: ["briefs"],
};

/** "any" lets Claude choose the engine and template, which the topical slot needs. */
type Slot = { engine: "hybrid" | "astra" | "any"; template: Template | null; topical: boolean };

/**
 * The day's mix: about a third finished Astra posters and the rest hybrids split between the two templates.
 * With a Zingers topic, the first slot is topical and its format is Claude's call.
 */
export function draftSlots(count: number, topical: boolean): Slot[] {
  const rest = topical ? count - 1 : count;
  const astra = Math.max(1, Math.round(rest / 3));
  const hybrid = Math.max(0, rest - astra);
  const forms = Math.floor(hybrid / 2);
  return [
    ...(topical ? [{ engine: "any" as const, template: null, topical: true }] : []),
    ...Array.from({ length: hybrid - forms }, () => ({ engine: "hybrid" as const, template: "specimen" as const, topical: false })),
    ...Array.from({ length: forms }, () => ({ engine: "hybrid" as const, template: "form" as const, topical: false })),
    ...Array.from({ length: astra }, () => ({ engine: "astra" as const, template: null, topical: false })),
  ].slice(0, count);
}

const clip = (value: string, max: number): string => value.replace(/\s+/g, " ").trim().slice(0, max);

/** Enforces the slot, the length limits, and known parents, so templates never receive surprises. */
function normalizeBrief(raw: Brief, slot: Slot, publishedIds: Set<string>, topic: Topic | null): Brief {
  const colorways: Colorway[] = ["cream", "red", "ink"];
  // The topical slot keeps Claude's choice of format; every other slot is fixed.
  const engine = slot.engine === "any" ? (raw.engine === "astra" ? "astra" : "hybrid") : slot.engine;
  const template: Template | null =
    slot.engine === "any" ? (engine === "astra" ? null : raw.template === "form" ? "form" : "specimen") : slot.template;
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
  return {
    title: clip(raw.title, 22).toUpperCase(),
    slogan: clip(raw.slogan, 48).toUpperCase(),
    joke: clip(raw.joke, 260),
    alt: clip(raw.alt, 260),
    engine,
    template,
    colorway: colorways.includes(raw.colorway) ? raw.colorway : "cream",
    art: clip(raw.art, 900),
    form,
    parents: raw.parents.filter((id) => publishedIds.has(id)).slice(0, 2),
    inspiration: slot.topical && topic ? { label: `Zingers, ${topic.date}`, url: topic.url } : null,
  };
}

export async function writeBriefs(options: {
  count: number;
  cwd: string;
  published: Array<{ id: string; title: string; slogan: string }>;
  recentlyDrafted: string[];
  topic: Topic | null;
}): Promise<Brief[]> {
  const brand = readBrand();
  const slots = draftSlots(options.count, options.topic !== null);
  const slotLines = slots.map((slot, i) =>
    slot.topical
      ? `- Draft ${i + 1}: TOPICAL (see TODAY'S STORY). Choose the engine and template that suit the joke best.`
      : `- Draft ${i + 1}: engine "${slot.engine}"${slot.template ? `, template "${slot.template}"` : ", template null"}`,
  );
  const topicBlock = options.topic
    ? `TODAY'S STORY (from Zingers, our daily AI-news comic)
Headline: ${options.topic.headline}
What happened: ${options.topic.summary}
Why it is funny: ${options.topic.angle}

The topical draft turns this story into an A-OK monkey. Keep every rule: no company, product, model, or person names anywhere in the brief, and no politics. Translate the story into the general idea behind it, so it lands for someone who missed the news, while people who saw the story recognise it.

`
    : "";
  const published = options.published.length
    ? options.published.map((m) => `Nº ${m.id} ${m.title}: ${m.slogan}`).join("\n")
    : "(nothing yet: these are the first)";
  const recent = options.recentlyDrafted.length ? options.recentlyDrafted.join("\n") : "(none)";

  const prompt = `You are the creative director of A-OK, an AI-culture streetwear label. Every day you brief a new set of "Chaos Monkeys": square poster artworks starring the A-OK ape, published on the A-OK site.

Two engines make them:
- "hybrid": GPT-6-Astra draws ONLY the ape and his props, as a transparent cutout, from your "art" description. A house template then sets your words:
  - template "specimen": the title in giant condensed type behind the ape, the slogan in a bar along the bottom. Colorways: cream, red, ink.
  - template "form": the ape as a die-cut sticker on an official-looking form (you write a heading and 3–6 label/value rows that extend the joke), the title as a red rubber stamp, the slogan as the footer.
- "astra": GPT-6-Astra paints the entire poster from your "art" description, including the title and slogan lettering. Use it when the joke needs a setting.

BRAND GUIDE
Character: ${brand.character}
Style: ${brand.style}
Palette: ${brand.palette}
Voice:
${brand.voice}
Rules:
${brand.rules}

ALREADY PUBLISHED (never repeat these jokes; you may riff on one and list its number in "parents"):
${published}

DRAFTED RECENTLY BUT NOT PUBLISHED (do not repeat):
${recent}

${topicBlock}Write exactly ${slots.length} new briefs, in this order:
${slotLines.join("\n")}
Every draft must use a different AI or computing term and a different visual gag. Vary the specimen colorways.

Fields:
- title: 1–3 words, UPPERCASE, at most 22 characters.
- slogan: UPPERCASE, at most 45 characters, two or three beats.
- joke: one plain sentence explaining the gag, for the archive page.
- alt: one sentence describing the finished image for screen readers: the ape, what he is doing, and the title.
- art: for hybrid, describe only the ape's pose, expression, and props, with no background and no text beyond the cap and hoodie, specific enough that the pose alone suggests the title. For astra, describe the whole scene, the composition, and where the title and slogan sit.
- colorway: cream, red, or ink (use "cream" for astra drafts).
- form: for template "form", a heading (an official-sounding form name, at most 36 characters) and 3–6 rows (labels at most 18 characters, values at most 24). Otherwise null.
- parents: [] unless the draft deliberately riffs on a published monkey.`;

  const output = (await askClaude(prompt, BRIEFS_SCHEMA, options.cwd, "high")) as { briefs: Brief[] };
  const publishedIds = new Set(options.published.map((m) => m.id));
  const briefs: Brief[] = [];
  output.briefs.slice(0, slots.length).forEach((raw, i) => {
    try {
      briefs.push(normalizeBrief(raw, slots[i], publishedIds, options.topic));
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
  const text = [brief.title, brief.slogan, "A-OK"];
  if (brief.template === "specimen") text.push(label, `CHAOS MONKEYS · ${dateLabel}`, "APES ON KEYS");
  if (brief.template === "form" && brief.form) {
    text.push(`FORM A-OK/${label.replace(/^\D+/, "")}`, brief.form.heading, "INSPECTOR NO. 7 · SIGNATURE");
    for (const row of brief.form.rows) text.push(row.label, row.value);
  }
  return text;
}

export async function judgeDrafts(runDir: string, drafts: Draft[], dateLabel: string): Promise<Judgment[]> {
  const brand = readBrand();
  const lines = drafts.map((draft) => {
    const expected = expectedText(draft, `DRAFT ${draft.n}`, dateLabel).map((t) => JSON.stringify(t)).join(", ");
    return `Draft ${draft.n}: ${draft.image}
  Engine: ${draft.engine}${draft.brief.template ? `, template ${draft.brief.template}` : ""}
  Joke: ${draft.brief.joke}
  Expected text: ${expected}. "APES ON KEYS" on the hoodie is also fine. Nothing else should be legible, except incidental marks such as a signature scribble.`;
  });

  const prompt = `You check A-OK's Chaos Monkeys before a person picks which to publish. Open each image below with the Read tool (paths are relative to the current directory) and judge it strictly against its brief.

Character: ${brand.character}
Rules:
${brand.rules}

For each draft report:
- textSeen: every piece of text you can read in the image, exactly as written.
- textOk: true only if each expected string is spelled exactly and there is no garbled, misspelled, or extra wording.
- onModel: the ape matches the character (round O mouth, A-OK cap, red headphones).
- rulesOk: no rule is broken.
- jokeLands: the picture and the words make the joke clear at thumbnail size.
- score: 1–10 overall; 7 or more means ready to publish.
- note: at most 140 characters, the single most important problem or strength.

${lines.join("\n\n")}`;

  const output = (await askClaude(prompt, JUDGE_SCHEMA, runDir, "medium")) as { results: Judgment[] };
  return output.results.map((result) => ({ ...result, note: clip(result.note, 160) }));
}
