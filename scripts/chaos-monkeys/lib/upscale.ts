/**
 * Print masters. Astra draws at about 1250 pixels, which only reaches Printful's 150 DPI floor at 8 inches. Real-ESRGAN
 * (realesrgan-ncnn-vulkan with its anime model, which suits flat illustration) enlarges the art four times, keeping
 * the drawing, colours, and transparency, so the print files carry 300 DPI and more of real detail.
 *
 * It is a separate download, kept in ~/.a-ok-chaos/tools/realesrgan (see README.md). Without it, print files are
 * made from the art as drawn, as before.
 */
import fs from "node:fs";
import path from "node:path";
import { STATE_DIR, log, pngInfo, run } from "./config.ts";

export const UPSCALER = process.env.CHAOS_UPSCALER ?? path.join(STATE_DIR, "tools", "realesrgan", "realesrgan-ncnn-vulkan");

let warned = false;

/** Writes `input` enlarged four times to `output` and returns true, or returns false when the upscaler isn't installed. */
export async function upscale(input: string, output: string): Promise<boolean> {
  if (!fs.existsSync(UPSCALER)) {
    if (!warned) log(`no upscaler at ${UPSCALER}; print files use the art as drawn (see README.md to install Real-ESRGAN)`);
    warned = true;
    return false;
  }
  const result = await run(UPSCALER, ["-i", input, "-o", output, "-n", "realesrgan-x4plus-anime", "-s", "4", "-m", path.join(path.dirname(UPSCALER), "models")], {
    cwd: path.dirname(UPSCALER),
    timeoutMs: 10 * 60_000,
  });
  const before = pngInfo(input);
  const after = fs.existsSync(output) ? pngInfo(output) : null;
  if (result.code !== 0 || !before || !after || after.width < before.width * 3.9 || !after.alpha) {
    throw new Error(`upscaling ${path.basename(input)} failed (exit ${result.code}): ${(result.stderr || result.stdout).trim().split("\n").slice(-2).join(" ")}`);
  }
  return true;
}
