/** Paths, shared types, and small process helpers for the Chaos Monkeys tool. */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";

export const TOOL_DIR = path.resolve(import.meta.dirname, "..");
/** Everything local to this Mac: the publish clone, drafts, fonts, and logs. */
export const STATE_DIR = process.env.CHAOS_STATE ?? path.join(os.homedir(), ".a-ok-chaos");
export const SITE_DIR = path.join(STATE_DIR, "site");
export const RUNS_DIR = path.join(STATE_DIR, "runs");
export const FONTS_DIR = path.join(STATE_DIR, "fonts");
export const LOGS_DIR = path.join(STATE_DIR, "logs");
export const PAUSE_FILE = path.join(STATE_DIR, "PAUSE");

/** Site paths, relative to a checkout of the repository. */
export const MANIFEST_PATH = "app/data/chaos-monkeys.json";
export const IMAGE_DIR = "public/chaos-monkeys";
export const REFERENCE_IMAGES = [
  "public/images/a-ok-suprised.jpg",
  "public/images/products/hallucination-club-inference-error-edition-3.png",
];

export const IMAGE_SIZE = 1200;
export const MODELS = {
  claude: process.env.CHAOS_CLAUDE_MODEL ?? "opus",
  astra: process.env.CHAOS_ASTRA_MODEL ?? "gpt-6-astra",
};

export type Engine = "hybrid" | "astra" | "code";
export type Template = "specimen" | "form";
export type Colorway = "cream" | "red" | "ink";
export type FormBlock = { heading: string; rows: Array<{ label: string; value: string }> };

export type Brief = {
  title: string;
  slogan: string;
  /** One sentence explaining the joke, shown in the archive. */
  joke: string;
  alt: string;
  /** hybrid: Astra draws a transparent cutout that a template composes. astra: Astra draws the finished poster. */
  engine: "hybrid" | "astra";
  template: Template | null;
  colorway: Colorway;
  /** hybrid: what the ape is doing, drawn alone. astra: the whole poster scene. */
  art: string;
  form: FormBlock | null;
  /** Series numbers of published monkeys this one riffs on. */
  parents: string[];
  /** Set by the tool (not the model) when the brief riffs on the day's Zingers story. */
  inspiration: Inspiration | null;
};

export type Inspiration = { label: string; url: string };

/** The day's AI/tech story, as Zingers (zingers.dev) settled it. */
export type Topic = { date: string; headline: string; summary: string; angle: string; url: string };

export type Judgment = {
  draft: number;
  textSeen: string[];
  textOk: boolean;
  onModel: boolean;
  rulesOk: boolean;
  jokeLands: boolean;
  score: number;
  note: string;
};

export type Draft = {
  n: number;
  brief: Brief;
  /** The engine that actually drew it; "code" when Astra was unavailable and the badge stood in. */
  engine: Engine;
  /** Paths relative to the run directory. */
  image: string | null;
  cutout: string | null;
  error: string | null;
  seconds: number;
  judgment: Judgment | null;
};

export type Run = {
  date: string;
  createdAt: string;
  /** The Zingers story behind the topical draft, if there was one. */
  topic?: Topic | null;
  drafts: Draft[];
  shipped: Array<{ draft: number; id: string; sha: string | null }>;
};

/** Mirrors ChaosMonkey in app/lib/chaos-monkeys.ts; the site build validates every entry. */
export type ManifestEntry = {
  id: string;
  date: string;
  title: string;
  slogan: string;
  joke: string;
  alt: string;
  image: string;
  width: number;
  height: number;
  engine: Engine;
  credit: string;
  parents: string[];
  inspiration?: Inspiration;
};

export function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

let logFile: string | null = null;
export function setLogFile(file: string | null): void {
  logFile = file;
}
export function log(...parts: unknown[]): void {
  const line = `${new Date().toTimeString().slice(0, 8)} ${parts.map(String).join(" ")}`;
  console.log(line);
  if (logFile) fs.appendFileSync(logFile, line + "\n");
}

export type RunResult = { code: number; stdout: string; stderr: string };

/** Runs a command without a shell, optionally piping `input` to stdin, and kills it after `timeoutMs`. */
export function run(
  command: string,
  args: string[],
  options: { cwd?: string; input?: string; timeoutMs?: number; env?: NodeJS.ProcessEnv; echo?: boolean } = {},
): Promise<RunResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd: options.cwd, env: options.env ?? process.env, stdio: ["pipe", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    let timedOut = false;
    const timer = options.timeoutMs
      ? setTimeout(() => {
          timedOut = true;
          child.kill("SIGKILL");
        }, options.timeoutMs)
      : null;
    child.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk;
      if (options.echo) process.stdout.write(chunk);
    });
    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk;
      if (options.echo) process.stderr.write(chunk);
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (timer) clearTimeout(timer);
      if (timedOut) reject(new Error(`${command} timed out after ${Math.round((options.timeoutMs ?? 0) / 1000)}s`));
      else resolve({ code: code ?? 1, stdout, stderr });
    });
    child.stdin.end(options.input ?? "");
  });
}

/** Like `run`, but throws with the tail of stderr when the command fails. */
export async function runOrThrow(command: string, args: string[], options: Parameters<typeof run>[2] = {}): Promise<string> {
  const result = await run(command, args, options);
  if (result.code !== 0) {
    const detail = (result.stderr || result.stdout).trim().split("\n").slice(-12).join("\n");
    throw new Error(`${command} ${args.slice(0, 3).join(" ")} failed (exit ${result.code})\n${detail}`);
  }
  return result.stdout;
}

/** A macOS notification; failures are ignored. */
export async function notify(message: string): Promise<void> {
  const script = `display notification ${JSON.stringify(message)} with title "Chaos Monkeys"`;
  await run("osascript", ["-e", script]).catch(() => undefined);
}

/** Runs `worker` over `items` with at most `limit` in flight. */
export async function pool<T>(items: T[], limit: number, worker: (item: T) => Promise<void>): Promise<void> {
  const queue = [...items];
  const runners = Array.from({ length: Math.min(limit, queue.length) }, async () => {
    for (let item = queue.shift(); item !== undefined; item = queue.shift()) await worker(item);
  });
  await Promise.all(runners);
}

/** Reads the sections of BRAND.md, keyed by their `##` heading. */
export function readBrand(): Record<"character" | "style" | "palette" | "voice" | "rules", string> {
  const text = fs.readFileSync(path.join(TOOL_DIR, "BRAND.md"), "utf8");
  const sections: Record<string, string> = {};
  for (const block of text.split(/^## /m).slice(1)) {
    const [heading, ...body] = block.split("\n");
    sections[heading.trim().toLowerCase()] = body.join("\n").trim();
  }
  for (const key of ["character", "style", "palette", "voice", "rules"]) {
    if (!sections[key]) throw new Error(`BRAND.md is missing the "## ${key}" section`);
  }
  return sections as Record<"character" | "style" | "palette" | "voice" | "rules", string>;
}

/** Width, height, and whether a PNG has an alpha channel, read from its header. */
export function pngInfo(file: string): { width: number; height: number; alpha: boolean } | null {
  const fd = fs.openSync(file, "r");
  try {
    const header = Buffer.alloc(33);
    fs.readSync(fd, header, 0, 33, 0);
    if (header.toString("latin1", 1, 4) !== "PNG") return null;
    const colorType = header[25];
    return { width: header.readUInt32BE(16), height: header.readUInt32BE(20), alpha: colorType === 4 || colorType === 6 };
  } finally {
    fs.closeSync(fd);
  }
}
