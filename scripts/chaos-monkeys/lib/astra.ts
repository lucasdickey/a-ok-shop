/**
 * GPT-6-Astra's job: illustrate. Each image is one `codex exec` on the ChatGPT login already on this Mac, using
 * Codex's built-in image tool (which needs no API key). The sandbox confines writes to the job directory.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { MODELS, pngInfo, readBrand, readStyles, run, type Brief } from "./config.ts";

/** Codex reported a usage or rate limit; the rest of the day's Astra jobs are skipped. */
export class AstraUnavailable extends Error {}

const LIMIT_PATTERN = /usage limit|rate limit|quota|too many requests|\b429\b|plan limit/i;

/** CHAOS_CODEX_TRACE=1 keeps each Codex session and saves what it sent the image tool to the job's image-calls.json. */
const TRACE = Boolean(process.env.CHAOS_CODEX_TRACE);

const TOOL_RULES = `Use your built-in image generation tool. Never use the CLI fallback, scripts/image_gen.py, or any API key. If the built-in tool is unavailable, stop and say so.`;

/**
 * The face, fixed in code and appended to every brief's art after it is clipped, so a brief stays about the idea and
 * the face can't be cut off. Batches whose briefs restated it drew the badge; batches that left it to a paragraph of
 * its own drifted (kid-cartoon, sideways pupils, a small mouth).
 */
const FACE = `FACE, which the owner checks first and rejects any drift from: his face matches the attached round badge exactly, whatever the style or pose. His head faces the viewer straight on, even when his body turns, and is big enough in the frame for every feature to read. Black fur frames a pale tan face and muzzle. Two wide round eyes show white all the way around small black pupils that look straight out, under high arched brows with surprised creases above them. A broad flat nose with two round nostrils. His mouth is dropped open in a big round stunned O with the tongue showing. He looks calm and stunned: no smile, grin, teeth, snarl, furrowed brows, sideways or googly eyes, glasses, or visible ears. He wears the red-and-white A-OK cap and red over-ear headphones. The style changes the linework and rendering around his face, never its construction, proportions, or colours: no cute or kid-cartoon proportions, no realistic chimp anatomy, and no stencil bridges or cuts across the eyes.`;

const REFERENCES = `References: the attached round badge is his exact face, cap and headphones; the line-art, illustrated and 3D references show that same face in other styles and give his body and hoodie lettering. Take only the character from them, never their compositions or poster style.`;

function cutoutSpec(brief: Brief): string {
  const brand = readBrand();
  return `Create ONE new square image of the A-OK ape: ${brief.art} ${FACE}
${REFERENCES}
Character: ${brand.character}
Style: ${brand.style}
Palette: ${brand.palette}
Composition: the whole ape and his props sit inside the frame with a small margin and fill most of it. No floor, no scenery, no frame, no drop shadow.
Background: genuinely TRANSPARENT, with a real alpha channel.
Text: only the cap lettering "A-OK", and "APES ON KEYS" if the hoodie front is visible. No other words, numbers, or logos.
Rules:
${brand.rules}`;
}

function printSpec(brief: Brief): string {
  const brand = readBrand();
  const style = readStyles().find((s) => s.id === brief.style);
  const words = brief.printText.length
    ? `Print these words, each spelled exactly and nothing else: ${brief.printText.map((line) => `"${line}"`).join(", ")}.`
    : "No words in the print at all.";
  return `Create ONE square image, at least 1024x1024: the flat print artwork for a ${brief.garmentColor} ${brief.garment} (${brief.placement} print), ${
    brief.placement === "all-over"
      ? `filling the whole square edge to edge as a swatch of the printed fabric`
      : `centred on a plain flat ${brief.garmentColor} background that stands in for the fabric, with generous margins`
  }. No garment, mockup, model, hanger, or photograph: just the artwork as it would be screen-printed.
Style: ${style ? `${style.name}. ${style.description}` : `${brief.style}.`} Commit to it fully.
The graphic: ${brief.art} ${FACE}
Text: ${words} The cap reads "A-OK". If the ape wears the hoodie and its front is visible, it reads "APES ON KEYS". No other letters, numbers, or logos.
${REFERENCES}
Character: ${brand.character}
House look: ${brand.style}
Palette for the inks: ${brand.palette}
It must read from across a room and as a 300 px thumbnail.
Rules:
${brand.rules}`;
}

/**
 * Codex writes its own prompt for the image tool, and its imagegen skill tells it to restructure what it is given. In
 * 2026-10-18-apparel it boiled a 5,400-character prompt down to 2,300, cutting the face to a line ("black pupils", not
 * white all around them) and adding a "dynamic pose", and it refined some images by passing back the result alone,
 * without the badge. So the spec goes to the tool whole, with every reference, on every call.
 */
function drawPrompt(subject: string, spec: string, refs: string[]): string {
  return `You are illustrating ${subject} for A-OK, an AI-culture streetwear label.

${TOOL_RULES}

Call the image tool with:
- prompt: everything between the lines BEGIN SPEC and END SPEC below, copied word for word. It is already the finished image prompt: do not summarise, shorten, restructure, reorder, or add to it, and keep its FACE description whole.
- referenced images: ${refs.join(", ")}, all of them, in this order. The first is the round badge, the ape's exact face.
Keep the image as drawn. If it is unusable (a misspelled word, the ape cut off), call the tool again with the same prompt and the same references. Never edit or refine a result by passing it back to the tool without the references: the face drifts.

BEGIN SPEC
${spec}
END SPEC

Save the final image in the current directory as out.png (copy it from where the image tool saved it). Then reply with the saved path and pixel size.`;
}

/** One photo of a model wearing the print, for the shop. `art` is the keyed print artwork (transparent PNG). */
function mockupPrompt(job: MockupJob): string {
  return `You are photographing one product photo for A-OK, an AI-culture streetwear label.

The attached image is the exact artwork printed on the garment. It is not a style reference: it is the print itself.

${TOOL_RULES}

Create ONE photorealistic ecommerce photograph, portrait, 1024x1536.
Model: ${job.model}. An invented adult, not a real or famous person. Standing square to the camera, relaxed and calm, framed from mid-thigh up so the whole front of the garment is in view, against a seamless light grey studio backdrop with soft, even light.
Garment: a plain ${job.color} ${job.garment} (colour ${job.hex}), a ${job.blank}.${job.garment === "hoodie" ? " Hood down, drawstrings visible, kangaroo pocket below the print." : ""}
Print: the attached artwork, screen-printed centred on the ${job.garment === "hoodie" ? "chest, above the pocket" : "chest"}, about ${job.inches} inches wide, its top about 3 inches below the collar. Reproduce it exactly: the same drawing, the same ape face (round eyes, tan face, small round O mouth), the same colours, and every word spelled the same. Do not redraw, simplify, restyle, recolour, crop, or enlarge it. Transparent parts of the artwork show the fabric. The print lies on the fabric and follows its folds gently, like a real screen print.
No other text, logos, tags, props, or watermarks.

Save the final image in the current directory as out.png (copy it from where the image tool saved it). Then reply with the saved path and pixel size.`;
}

/** The same artwork re-inked for dark garments: black ink becomes bone cream, and the ape gets a light outline. */
function lightInkPrompt(): string {
  return `You are re-inking one finished print for A-OK, an AI-culture streetwear label, the way a screen printer prepares a design for dark shirts (black, navy, royal blue).

The attached image is the artwork as printed on light shirts. Keep its pixel size.

${TOOL_RULES}

Create ONE image of the same artwork, the same size and composition, on a genuinely TRANSPARENT background with a real alpha channel.
- Everything printed in black or near-black ink becomes bone cream (#F1E8D6): lettering, outlines, linework, shapes, shading, and halftone. The one exception is the ape himself.
- The ape keeps his black fur, warm tan face and muzzle, wide round eyes, small round O mouth, red-and-white A-OK cap, red headphones, and hoodie exactly as drawn. Add a thin, even bone-cream outline around his silhouette so his black fur reads against a dark shirt.
- Everything else stays identical: the same drawing, composition and proportions, the same red and cream inks, and every word spelled the same. Do not redraw, restyle, simplify, crop, or add anything.

Save the final image in the current directory as out.png (copy it from where the image tool saved it). Then reply with the saved path and pixel size.`;
}

/** Re-inks `art` for dark garments in `jobDir` and returns the path of out.png (transparent). */
export async function lightInk(art: string, jobDir: string): Promise<string> {
  // The re-ink keeps the art's own size, which can be under the usual 1000-pixel floor.
  return generate(lightInkPrompt(), jobDir, [art], { alpha: true, minSize: 400 });
}

/** One photo of a model wearing an all-over print of `tile`. */
function allOverPrompt(job: AllOverJob): string {
  return `You are photographing one product photo for A-OK, an AI-culture streetwear label.

The attached image is one repeat of an all-over print: the exact pattern printed on the garment. It is not a style reference: it is the fabric itself.

${TOOL_RULES}

Create ONE photorealistic ecommerce photograph, portrait, 1024x1536.
Model: ${job.model}. An invented adult, not a real or famous person. ${job.view === "front" ? "Standing square to the camera, relaxed and calm" : "Standing with their back to the camera, head turned slightly, relaxed"}, framed from mid-thigh up so the whole ${job.view} of the garment is in view, against a seamless light grey studio backdrop with soft, even light.
Garment: an all-over-print ${job.garment}, a ${job.blank}. The attached pattern covers the entire garment edge to edge (${job.panels.join(", ")}), cut and sewn so it continues across the seams, repeating about every 18 inches, so the front shows a little more than one repeat across the chest.${job.garment === "hoodie" ? " Hood down, drawstrings visible." : ""}
Reproduce the pattern exactly: the same motifs, the ape's face unchanged (round eyes, tan face, small round O mouth, A-OK cap, red headphones), the same colours, and every word spelled the same. Do not redraw, restyle, recolour, or enlarge the motifs. No other text, logos, tags, props, or watermarks.

Save the final image in the current directory as out.png (copy it from where the image tool saved it). Then reply with the saved path and pixel size.`;
}

export type AllOverJob = { tile: string; garment: "tee" | "hoodie"; blank: string; panels: string[]; view: "front" | "back"; model: string };

/** Photographs an all-over print of `job.tile` on a model in `jobDir` and returns the path of out.png. */
export async function allOverMockup(job: AllOverJob, jobDir: string): Promise<string> {
  return generate(allOverPrompt(job), jobDir, [job.tile], { alpha: false });
}

export type MockupJob = { art: string; garment: "tee" | "hoodie"; blank: string; color: string; hex: string; model: string; inches: number };

/** Photographs `job.art` on a model in `jobDir` and returns the path of out.png. */
export async function mockup(job: MockupJob, jobDir: string): Promise<string> {
  return generate(mockupPrompt(job), jobDir, [job.art], { alpha: false });
}

/** Draws `brief` in `jobDir` and returns the path of out.png. `refs` are absolute paths to reference images. */
export async function illustrate(brief: Brief, jobDir: string, refs: string[], mode: "cutout" | "print"): Promise<string> {
  const localRefs = refs.map((ref, i) => localRef(jobDir, ref, i));
  const prompt =
    mode === "cutout"
      ? drawPrompt(`one character cutout for the "Chaos Monkeys" series`, cutoutSpec(brief), localRefs)
      : drawPrompt("one tee or hoodie graphic", printSpec(brief), localRefs);
  return generate(prompt, jobDir, refs, { alpha: mode === "cutout" });
}

/** Where `generate` copies reference `i` for the job, so a prompt can name it. */
const localRef = (jobDir: string, ref: string, i: number): string => path.join(jobDir, `ref-${i + 1}${path.extname(ref)}`);

/** One `codex exec` image job: writes out.png in `jobDir`, or throws (AstraUnavailable on a usage limit). */
async function generate(prompt: string, jobDir: string, refs: string[], options: { alpha: boolean; minSize?: number }): Promise<string> {
  fs.mkdirSync(jobDir, { recursive: true });
  const localRefs = refs.map((ref, i) => {
    const target = localRef(jobDir, ref, i);
    fs.copyFileSync(ref, target);
    return target;
  });
  fs.writeFileSync(path.join(jobDir, "prompt.txt"), prompt);

  const args = [
    "exec",
    "--skip-git-repo-check",
    ...(TRACE ? [] : ["--ephemeral"]),
    "--sandbox",
    "workspace-write",
    "--cd",
    jobDir,
    "--model",
    MODELS.astra,
    "-c",
    'model_reasoning_effort="medium"',
    "--json",
    "--output-last-message",
    path.join(jobDir, "last.txt"),
    ...localRefs.flatMap((ref) => ["--image", ref]),
  ];
  const result = await run("codex", args, { cwd: jobDir, input: prompt, timeoutMs: 12 * 60_000 });
  fs.writeFileSync(path.join(jobDir, "events.jsonl"), result.stdout);
  fs.writeFileSync(path.join(jobDir, "stderr.txt"), result.stderr);
  if (TRACE) saveImageCalls(result.stdout, jobDir);

  const out = path.join(jobDir, "out.png");
  const info = fs.existsSync(out) ? pngInfo(out) : null;
  if (!info) {
    const lastMessage = fs.existsSync(path.join(jobDir, "last.txt")) ? fs.readFileSync(path.join(jobDir, "last.txt"), "utf8") : "";
    const evidence = `${result.stderr}\n${lastMessage}\n${result.stdout.slice(-4000)}`;
    if (LIMIT_PATTERN.test(evidence)) throw new AstraUnavailable(`Codex reported a usage limit (exit ${result.code})`);
    throw new Error(`no out.png (exit ${result.code}): ${lastMessage.slice(0, 300) || result.stderr.slice(-300)}`);
  }
  const minSize = options.minSize ?? 1000;
  if (info.width < minSize || info.height < minSize) throw new Error(`image too small: ${info.width}x${info.height}`);
  if (options.alpha && !info.alpha) throw new Error("cutout has no alpha channel");
  return out;
}

/** Copies the image tool's calls (prompt and references) out of the kept Codex session. Never fails the job. */
function saveImageCalls(events: string, jobDir: string): void {
  try {
    const thread = /"thread_id":"([^"]+)"/.exec(events)?.[1];
    const sessions = path.join(process.env.CODEX_HOME ?? path.join(os.homedir(), ".codex"), "sessions");
    const file = thread && fs.readdirSync(sessions, { recursive: true, encoding: "utf8" }).find((name) => name.endsWith(`${thread}.jsonl`));
    if (!file) return;
    const calls = fs
      .readFileSync(path.join(sessions, file), "utf8")
      .split("\n")
      .filter(Boolean)
      .map((line) => JSON.parse(line).payload)
      .filter((payload) => payload?.type === "function_call" && payload.namespace === "image_gen")
      .map((payload) => JSON.parse(payload.arguments));
    fs.writeFileSync(path.join(jobDir, "image-calls.json"), JSON.stringify(calls, null, 2));
  } catch {
    // Tracing is for debugging; a missing or changed session format just means no trace.
  }
}
