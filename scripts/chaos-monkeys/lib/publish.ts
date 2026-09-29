/**
 * Publishing: a dedicated clone of the shop in ~/.a-ok-chaos/site, never your working checkout. It lives outside
 * ~/Documents because macOS keeps background jobs out of that folder. Shipping writes the images and the manifest
 * there, runs lint and build like any other change, then commits and pushes; Vercel deploys from the branch.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { IMAGE_DIR, LOGS_DIR, MANIFEST_PATH, SITE_DIR, TOOL_DIR, log, run, runOrThrow, type ManifestEntry } from "./config.ts";

/** The repository this copy of the tool runs from (your checkout, or the publish clone under launchd). */
export async function repoRoot(): Promise<string> {
  const common = (await runOrThrow("git", ["-C", TOOL_DIR, "rev-parse", "--path-format=absolute", "--git-common-dir"])).trim();
  return path.dirname(common);
}

const git = (...args: string[]) => runOrThrow("git", ["-C", SITE_DIR, ...args]);

/** Creates the publish clone if needed and moves it to origin/<branch>, refusing to discard any work. */
export async function syncSite(branch: string): Promise<void> {
  if (!fs.existsSync(path.join(SITE_DIR, ".git"))) {
    const origin = (await runOrThrow("git", ["-C", TOOL_DIR, "remote", "get-url", "origin"])).trim();
    fs.mkdirSync(path.dirname(SITE_DIR), { recursive: true });
    log(`cloning the shop into ${SITE_DIR} (once; history blobs are fetched on demand)…`);
    await runOrThrow("git", ["clone", "--quiet", "--filter=blob:none", "--branch", branch, origin, SITE_DIR], { timeoutMs: 30 * 60_000 });
    await git("checkout", "--quiet", "--detach");
    return;
  }
  await git("fetch", "--quiet", "origin", branch);
  const dirty = (await git("status", "--porcelain")).trim();
  if (dirty) throw new Error(`the publish clone has uncommitted changes:\n${dirty}\nInspect ${SITE_DIR} before shipping.`);
  const unpushed = (await git("log", "--oneline", `origin/${branch}..HEAD`)).trim();
  if (unpushed && (await git("branch", "-r", "--contains", "HEAD")).trim() === "") {
    throw new Error(`the publish clone has commits that were never pushed:\n${unpushed}`);
  }
  await git("checkout", "--quiet", "--detach", `origin/${branch}`);
}

/** Published monkeys on a branch, read from git without touching any working tree. Empty before the site supports them. */
export async function publishedOn(branch: string): Promise<ManifestEntry[]> {
  const repo = await repoRoot();
  await run("git", ["-C", repo, "fetch", "--quiet", "origin", branch]);
  const shown = await run("git", ["-C", repo, "show", `origin/${branch}:${MANIFEST_PATH}`]);
  return shown.code === 0 ? (JSON.parse(shown.stdout) as ManifestEntry[]) : [];
}

export function readManifest(): ManifestEntry[] {
  const file = path.join(SITE_DIR, MANIFEST_PATH);
  if (!fs.existsSync(file)) {
    throw new Error(`${MANIFEST_PATH} is not on this branch yet: merge the Chaos Monkeys pull request first, or ship with --branch`);
  }
  return JSON.parse(fs.readFileSync(file, "utf8")) as ManifestEntry[];
}

export function writeManifest(entries: ManifestEntry[]): void {
  const sorted = [...entries].sort((a, b) => a.id.localeCompare(b.id));
  fs.writeFileSync(path.join(SITE_DIR, MANIFEST_PATH), `${JSON.stringify(sorted, null, 2)}\n`);
}

export function imagePath(id: string): { file: string; url: string; relative: string } {
  const relative = `${IMAGE_DIR}/${id}.webp`;
  return { file: path.join(SITE_DIR, relative), url: `/chaos-monkeys/${id}.webp`, relative };
}

/** Installs dependencies in the publish clone when its lockfile changes. */
async function ensureDependencies(): Promise<void> {
  const lock = fs.readFileSync(path.join(SITE_DIR, "package-lock.json"));
  const digest = crypto.createHash("sha256").update(lock).digest("hex");
  const stamp = path.join(SITE_DIR, "node_modules", ".chaos-lock-sha256");
  if (fs.existsSync(stamp) && fs.readFileSync(stamp, "utf8") === digest) return;
  log("installing dependencies in the publish clone (npm ci)…");
  await runOrThrow("npm", ["ci", "--no-audit", "--no-fund"], { cwd: SITE_DIR, timeoutMs: 15 * 60_000 });
  fs.writeFileSync(stamp, digest);
}

/** Lint and build, as the repository requires before every commit. Build logs go to logs/. */
export async function verifySite(): Promise<void> {
  await ensureDependencies();
  fs.mkdirSync(LOGS_DIR, { recursive: true });
  for (const script of ["lint", "build"]) {
    log(`npm run ${script}…`);
    const result = await run("npm", ["run", script], { cwd: SITE_DIR, timeoutMs: 20 * 60_000 });
    fs.writeFileSync(path.join(LOGS_DIR, `last-${script}.log`), result.stdout + result.stderr);
    if (result.code !== 0) throw new Error(`npm run ${script} failed; see ${path.join(LOGS_DIR, `last-${script}.log`)}`);
  }
}

/** Puts the clone back on its commit, removing anything shipping added. */
export async function discardChanges(): Promise<void> {
  await git("checkout", "--quiet", "--", ".");
  await git("clean", "--quiet", "-fd", "--", IMAGE_DIR);
}

/** Commits exactly `paths` (restoring anything the build regenerated) and pushes to `branch`. Returns the new commit. */
export async function commitAndPush(paths: string[], message: string, branch: string, push: boolean): Promise<string> {
  // Tracked files the build rewrote (untracked ones are never added, so they can stay).
  const changed = (await git("status", "--porcelain"))
    .split("\n")
    .filter((line) => line && !line.startsWith("??"))
    .map((line) => line.slice(3));
  const stray = changed.filter((file) => !paths.includes(file) && !file.startsWith(`${IMAGE_DIR}/`));
  if (stray.length) {
    log(`restoring files the build touched: ${stray.join(", ")}`);
    await run("git", ["-C", SITE_DIR, "checkout", "--quiet", "--", ...stray]);
  }
  await git("add", "--", ...paths);
  await git("commit", "--quiet", "-m", message);
  const sha = (await git("rev-parse", "HEAD")).trim();
  if (push) {
    await git("push", "--quiet", "origin", `HEAD:refs/heads/${branch}`);
    log(`pushed ${sha.slice(0, 8)} to ${branch}`);
  } else {
    log(`committed ${sha.slice(0, 8)} without pushing (--no-push)`);
  }
  return sha;
}

/** Waits for Vercel's commit status (via the GitHub CLI) and returns the deployment URL, or null if it can't tell. */
export async function waitForDeploy(sha: string, timeoutMs = 10 * 60_000): Promise<string | null> {
  const remote = (await git("remote", "get-url", "origin")).trim();
  const slug = remote.match(/github\.com[:/](.+?)(?:\.git)?$/)?.[1];
  if (!slug) return null;
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const result = await run("gh", ["api", `repos/${slug}/commits/${sha}/status`, "--jq", '.statuses[] | select(.context=="Vercel") | "\\(.state) \\(.target_url)"']);
    if (result.code !== 0) return null;
    const [state, url] = result.stdout.trim().split(" ");
    if (state === "success") return url ?? "";
    if (state === "failure" || state === "error") throw new Error(`Vercel reported ${state}: ${url}`);
    await new Promise((resolve) => setTimeout(resolve, 15_000));
  }
  return null;
}
