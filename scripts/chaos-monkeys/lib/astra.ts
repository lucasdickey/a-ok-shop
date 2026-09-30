/**
 * GPT-6-Astra's job: illustrate. Each image is one `codex exec` on the ChatGPT login already on this Mac, using
 * Codex's built-in image tool (which needs no API key). The sandbox confines writes to the job directory.
 */
import fs from "node:fs";
import path from "node:path";
import { MODELS, pngInfo, readBrand, run, type Brief } from "./config.ts";

/** Codex reported a usage or rate limit; the rest of the day's Astra jobs are skipped. */
export class AstraUnavailable extends Error {}

const LIMIT_PATTERN = /usage limit|rate limit|quota|too many requests|\b429\b|plan limit/i;

function cutoutPrompt(brief: Brief): string {
  const brand = readBrand();
  return `You are illustrating one character cutout for the A-OK "Chaos Monkeys" series.

The attached images are REFERENCE ONLY for the character's identity (the round badge: face, cap and headphones; the hoodie drawing: body and hoodie lettering). Do not copy their compositions.

Use your built-in image generation tool. Never use the CLI fallback, scripts/image_gen.py, or any API key. If the built-in tool is unavailable, stop and say so.

Create ONE new square image of the A-OK ape: ${brief.art}

Character, matching the references closely: ${brand.character}
Style: ${brand.style}
Palette: ${brand.palette}

Composition: the whole ape and his props sit inside the frame with a small margin and fill most of it. No floor, no scenery, no frame, no drop shadow.
Background: genuinely TRANSPARENT, with a real alpha channel.
Text: only the cap lettering "A-OK", and "APES ON KEYS" if the hoodie front is visible. No other words, numbers, or logos.
Rules:
${brand.rules}

Save the final image in the current directory as out.png (copy it from where the image tool saved it). Then reply with the saved path and pixel size.`;
}

function posterPrompt(brief: Brief): string {
  const brand = readBrand();
  return `You are illustrating one finished poster for the A-OK "Chaos Monkeys" series.

The attached images are REFERENCE ONLY for the character's identity (the round badge: face, cap and headphones; the hoodie drawing: body and hoodie lettering). Do not copy their compositions.

Use your built-in image generation tool. Never use the CLI fallback, scripts/image_gen.py, or any API key. If the built-in tool is unavailable, stop and say so.

Create ONE finished square poster, at least 1024x1024.
Scene: ${brief.art}
Title, large and spelled exactly: "${brief.title}"
Slogan, clear and spelled exactly: "${brief.slogan}"
The cap reads "A-OK". The hoodie, if its front is visible, reads "APES ON KEYS". No other text unless the scene explicitly asks for a short prop label.

Character, matching the references closely: ${brand.character}
Style: ${brand.style}
Palette: ${brand.palette}
Keep all text inside the frame with generous margins; the poster must read as a 300 px thumbnail.
Rules:
${brand.rules}

Save the final image in the current directory as out.png (copy it from where the image tool saved it). Then reply with the saved path and pixel size.`;
}

/** Draws `brief` in `jobDir` and returns the path of out.png. `refs` are absolute paths to reference images. */
export async function illustrate(brief: Brief, jobDir: string, refs: string[], mode: "cutout" | "poster"): Promise<string> {
  fs.mkdirSync(jobDir, { recursive: true });
  const localRefs = refs.map((ref, i) => {
    const target = path.join(jobDir, `ref-${i + 1}${path.extname(ref)}`);
    fs.copyFileSync(ref, target);
    return target;
  });
  const prompt = mode === "cutout" ? cutoutPrompt(brief) : posterPrompt(brief);
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
  if (mode === "cutout" && !info.alpha) throw new Error("cutout has no alpha channel");
  return out;
}
