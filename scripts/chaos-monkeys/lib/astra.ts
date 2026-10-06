/**
 * GPT-6-Astra's job: illustrate. Each image is one `codex exec` on the ChatGPT login already on this Mac, using
 * Codex's built-in image tool (which needs no API key). The sandbox confines writes to the job directory.
 */
import fs from "node:fs";
import path from "node:path";
import { MODELS, pngInfo, readBrand, readStyles, run, type Brief } from "./config.ts";

/** Codex reported a usage or rate limit; the rest of the day's Astra jobs are skipped. */
export class AstraUnavailable extends Error {}

const LIMIT_PATTERN = /usage limit|rate limit|quota|too many requests|\b429\b|plan limit/i;

const TOOL_RULES = `Use your built-in image generation tool. Never use the CLI fallback, scripts/image_gen.py, or any API key. If the built-in tool is unavailable, stop and say so.`;

function cutoutPrompt(brief: Brief): string {
  const brand = readBrand();
  return `You are illustrating one character cutout for the A-OK "Chaos Monkeys" series.

The attached images are REFERENCE ONLY for the character's identity (the round badge: face, cap and headphones; the hoodie drawing: body and hoodie lettering). Do not copy their compositions.

${TOOL_RULES}

Create ONE new square image of the A-OK ape: ${brief.art}

Character, matching the references closely: ${brand.character}
His face is the brand's logo. Draw it exactly as on the round badge reference, whatever the style: the same construction and proportions, wide round eyes with white around the pupils, a warm tan face and muzzle, black fur, and a small round O mouth, under the red-and-white A-OK cap and red headphones. The style changes the linework and rendering around him, never the construction or colours of his face. No angry brows, shouting mouth, tongue, star eyes, or recoloured face.
Style: ${brand.style}
Palette: ${brand.palette}

Composition: the whole ape and his props sit inside the frame with a small margin and fill most of it. No floor, no scenery, no frame, no drop shadow.
Background: genuinely TRANSPARENT, with a real alpha channel.
Text: only the cap lettering "A-OK", and "APES ON KEYS" if the hoodie front is visible. No other words, numbers, or logos.
Rules:
${brand.rules}

Save the final image in the current directory as out.png (copy it from where the image tool saved it). Then reply with the saved path and pixel size.`;
}

function printPrompt(brief: Brief): string {
  const brand = readBrand();
  const style = readStyles().find((s) => s.id === brief.style);
  const words = brief.printText.length
    ? `Print these words, each spelled exactly and nothing else: ${brief.printText.map((line) => `"${line}"`).join(", ")}.`
    : "No words in the print at all.";
  return `You are illustrating one tee or hoodie graphic for A-OK, an AI-culture streetwear label.

The attached images are REFERENCE ONLY for the character's identity (the round badge: face, cap and headphones; the hoodie drawing: body and hoodie lettering). Do not copy their compositions or their poster style.

${TOOL_RULES}

Create ONE square image, at least 1024x1024: the flat print artwork for a ${brief.garmentColor} ${brief.garment} (${brief.placement} print), ${
    brief.placement === "all-over"
      ? `filling the whole square edge to edge as a swatch of the printed fabric`
      : `centred on a plain flat ${brief.garmentColor} background that stands in for the fabric, with generous margins`
  }. No garment, mockup, model, hanger, or photograph: just the artwork as it would be screen-printed.
Style: ${style ? `${style.name}. ${style.description}` : `${brief.style}.`} Commit to it fully.
The graphic: ${brief.art}
Text: ${words} The cap reads "A-OK". If the ape wears the hoodie and its front is visible, it reads "APES ON KEYS". No other letters, numbers, or logos.

Character: ${brand.character}
His face is the brand's logo. Draw it exactly as on the round badge reference, whatever the style: the same construction and proportions, wide round eyes with white around the pupils, a warm tan face and muzzle, black fur, and a small round O mouth, under the red-and-white A-OK cap and red headphones. The style changes the linework and rendering around him, never the construction or colours of his face. No angry brows, shouting mouth, tongue, star eyes, or recoloured face.
House look: ${brand.style}
Palette for the inks: ${brand.palette}
It must read from across a room and as a 300 px thumbnail.
Rules:
${brand.rules}

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

export type MockupJob = { art: string; garment: "tee" | "hoodie"; blank: string; color: string; hex: string; model: string; inches: number };

/** Photographs `job.art` on a model in `jobDir` and returns the path of out.png. */
export async function mockup(job: MockupJob, jobDir: string): Promise<string> {
  return generate(mockupPrompt(job), jobDir, [job.art], { alpha: false });
}

/** Draws `brief` in `jobDir` and returns the path of out.png. `refs` are absolute paths to reference images. */
export async function illustrate(brief: Brief, jobDir: string, refs: string[], mode: "cutout" | "print"): Promise<string> {
  return generate(mode === "cutout" ? cutoutPrompt(brief) : printPrompt(brief), jobDir, refs, { alpha: mode === "cutout" });
}

/** One `codex exec` image job: writes out.png in `jobDir`, or throws (AstraUnavailable on a usage limit). */
async function generate(prompt: string, jobDir: string, refs: string[], options: { alpha: boolean }): Promise<string> {
  fs.mkdirSync(jobDir, { recursive: true });
  const localRefs = refs.map((ref, i) => {
    const target = path.join(jobDir, `ref-${i + 1}${path.extname(ref)}`);
    fs.copyFileSync(ref, target);
    return target;
  });
  fs.writeFileSync(path.join(jobDir, "prompt.txt"), prompt);

  const args = [
    "exec",
    "--skip-git-repo-check",
    "--ephemeral",
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

  const out = path.join(jobDir, "out.png");
  const info = fs.existsSync(out) ? pngInfo(out) : null;
  if (!info) {
    const lastMessage = fs.existsSync(path.join(jobDir, "last.txt")) ? fs.readFileSync(path.join(jobDir, "last.txt"), "utf8") : "";
    const evidence = `${result.stderr}\n${lastMessage}\n${result.stdout.slice(-4000)}`;
    if (LIMIT_PATTERN.test(evidence)) throw new AstraUnavailable(`Codex reported a usage limit (exit ${result.code})`);
    throw new Error(`no out.png (exit ${result.code}): ${lastMessage.slice(0, 300) || result.stderr.slice(-300)}`);
  }
  if (info.width < 1000 || info.height < 1000) throw new Error(`image too small: ${info.width}x${info.height}`);
  if (options.alpha && !info.alpha) throw new Error("cutout has no alpha channel");
  return out;
}
