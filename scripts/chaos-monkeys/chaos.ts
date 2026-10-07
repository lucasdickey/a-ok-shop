/**
 * A-OK Chaos Monkeys: the daily drop, made on this Mac with the Claude and ChatGPT logins it already has.
 * No API keys, no CI. See README.md.
 *
 *   chaos draft [--count 6] [--date RUN] [--force] [--zingers]  brief, illustrate, compose, judge, contact sheet (~10 min)
 *   chaos status [--date RUN]                                the latest drafts, their scores, and what shipped
 *   chaos judge [--date RUN]                                 re-score a run's drafts and rebuild its contact sheet
 *   chaos review [--date RUN] --out DIR                      export a run for the feedback page (index.html, drafts.json, img/)
 *   chaos feedback FILE.json [--date RUN]                    import keep/reject verdicts and notes; future briefs learn from them
 *   chaos print [3 5:tee 6:hoodie] [--date RUN] [--force]    print files, model mockups, and copy for drafts ticked Print
 *   chaos sell RUN-N … [--dry-run] [--no-stripe] [--no-push] [--force]  put printed drafts on Stripe and the shop
 *   chaos ship 1 3 5 [--date RUN] [--branch main] [--no-push]  publish drafts: lint, build, commit, push
 *   chaos unpublish 0007 [--branch main] [--no-push]         take a published monkey down
 *   chaos pause | resume                                     stop or restart the daily job
 *   chaos install | uninstall                                the daily job (9:07 and at login) and the /chaos-monkeys skill
 *
 * RUN is a date (2026-10-01), or a date with a label for an extra batch that leaves the daily run alone
 * (2026-10-01-apparel). Without --date, commands use the latest run. --zingers adds a draft that riffs on the day's
 * Zingers story; it is off by default.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  IMAGE_SIZE,
  CATALOG_PATH,
  IMAGE_DIR,
  LOGS_DIR,
  MANIFEST_PATH,
  MERCH_DIR,
  PAUSE_FILE,
  PRODUCT_IMAGE_DIR,
  REFERENCE_IMAGES,
  RUNS_DIR,
  SITE_DIR,
  STATE_DIR,
  TOOL_DIR,
  log,
  notify,
  pngInfo,
  pool,
  run,
  runOrThrow,
  setLogFile,
  today,
  readStyles,
  type Brief,
  type Draft,
  type Engine,
  type Feedback,
  type ManifestEntry,
  type Run,
} from "./lib/config.ts";
import { judgeDrafts, judgeLightInk, judgeMockups, writeBriefs, writeProductCopy, type FeedbackLine, type StyleScores } from "./lib/claude.ts";
import { AstraUnavailable, illustrate, lightInk, mockup } from "./lib/astra.ts";
import {
  BLANKS,
  GARMENT_KINDS,
  MODELS,
  PRINT_DPI,
  SHOP_COLORS,
  addToStripe,
  catalogNode,
  idAllocator,
  loadMerch,
  merchDir,
  MAX_HARD_TO_SEE,
  prefersLightInk,
  printSize,
  printfulCatalog,
  saveMerch,
  type Catalog,
  type CatalogNode,
  type GarmentKind,
  type Merch,
  type MerchProduct,
  type Mockup,
  type ShopColor,
} from "./lib/merch.ts";
import { ensureFonts, openRenderer, type Renderer } from "./lib/renderer.ts";
import { fetchTopic } from "./lib/zingers.ts";
import {
  commitAndPush,
  discardChanges,
  imagePath,
  publishedOn,
  readManifest,
  syncSite,
  verifySite,
  waitForDeploy,
  writeManifest,
} from "./lib/publish.ts";

/** The checkout this copy of the tool lives in; reference art is read from its public/ folder. */
const CHECKOUT = path.resolve(TOOL_DIR, "..", "..");
const BADGE = "images/a-ok-suprised.jpg";
const LAUNCHD_LABEL = "shop.a-ok.chaos-monkeys";
const PLIST = path.join(os.homedir(), "Library", "LaunchAgents", `${LAUNCHD_LABEL}.plist`);
const SKILL_TARGET = path.join(os.homedir(), ".claude", "skills", "chaos-monkeys", "SKILL.md");

const CREDITS: Record<Engine, string> = {
  hybrid: "Illustrated by GPT-6-Astra, art-directed by Claude",
  astra: "Illustrated by GPT-6-Astra from a brief by Claude",
  code: "Composed in code by Claude around the A-OK badge",
};

/* ------------------------------------------------------------------ small helpers */

type Options = { positional: string[]; flags: Map<string, string | true> };

function parseArgs(argv: string[]): Options {
  const positional: string[] = [];
  const flags = new Map<string, string | true>();
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg.startsWith("--")) positional.push(arg);
    else if (argv[i + 1] !== undefined && !argv[i + 1].startsWith("--") && ["--count", "--date", "--branch", "--out"].includes(arg)) flags.set(arg, argv[++i]);
    else flags.set(arg, true);
  }
  return { positional, flags };
}

const flag = (options: Options, name: string): string | undefined => {
  const value = options.flags.get(name);
  return typeof value === "string" ? value : undefined;
};

/** "2026-09-29" → "SEP 29, 2026" */
function dateLabel(date: string): string {
  return new Date(`${date}T12:00:00Z`)
    .toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })
    .toUpperCase();
}

const RUN_ID = /^(\d{4}-\d{2}-\d{2})(?:-[a-z0-9][a-z0-9-]{0,40})?$/;

/** A run's folder: its date, or its date and a label (2026-10-01-apparel). */
function runDirFor(id: string): string {
  if (!RUN_ID.test(id)) throw new Error(`not a run: ${id} (expected YYYY-MM-DD or YYYY-MM-DD-label)`);
  return path.join(RUNS_DIR, id);
}

function dateOf(id: string): string {
  const match = id.match(RUN_ID);
  if (!match) throw new Error(`not a run: ${id}`);
  return match[1];
}

/** Fills in what runs from before the apparel briefs did not record. */
function upgradeBrief(brief: Brief): void {
  const old = brief as Partial<Brief>;
  old.style ??= brief.template ?? "poster";
  old.garment ??= "tee";
  old.garmentColor ??= "bone";
  old.placement ??= "front";
  old.printText ??= [brief.title, brief.slogan];
  old.productCopy ??= "";
  old.marketingCopy ??= "";
}

function loadRun(id: string): Run {
  const file = path.join(runDirFor(id), "run.json");
  if (!fs.existsSync(file)) throw new Error(`no drafts for ${id}; run: chaos draft`);
  const record = JSON.parse(fs.readFileSync(file, "utf8")) as Run;
  record.id = id;
  for (const d of record.drafts) upgradeBrief(d.brief);
  return record;
}

function saveRun(record: Run): void {
  fs.writeFileSync(path.join(runDirFor(record.id ?? record.date), "run.json"), `${JSON.stringify(record, null, 2)}\n`);
}

function runDates(): string[] {
  if (!fs.existsSync(RUNS_DIR)) return [];
  return fs
    .readdirSync(RUNS_DIR)
    .filter((name) => fs.existsSync(path.join(RUNS_DIR, name, "run.json")))
    .sort();
}

function latestRunId(): string {
  const dates = runDates();
  if (!dates.length) throw new Error("no drafts yet; run: chaos draft");
  return dates[dates.length - 1];
}

/** Titles drafted in the last two weeks but never shipped, so Claude does not pitch them again. */
function recentlyDrafted(id: string): string[] {
  const cutoff = Date.parse(`${dateOf(id)}T00:00:00Z`) - 14 * 86_400_000;
  return runDates()
    .filter((d) => d !== id && Date.parse(`${dateOf(d)}T00:00:00Z`) >= cutoff)
    .flatMap((d) => {
      const record = loadRun(d);
      const shipped = new Set(record.shipped.map((s) => s.draft));
      return record.drafts.filter((draft) => !shipped.has(draft.n)).map((draft) => `${draft.brief.title}: ${draft.brief.slogan}`);
    });
}

/**
 * Everything the person who picks has said, newest first: shipped drafts, keep/reject verdicts with notes, and notes
 * on whole batches. Feeds the next briefs (the last 45 days) and the style weights (all time).
 */
function pastFeedback(): { lines: FeedbackLine[]; notes: string[]; scores: StyleScores } {
  const lines: FeedbackLine[] = [];
  const notes: string[] = [];
  const scores: StyleScores = new Map();
  const cutoff = Date.now() - 45 * 86_400_000;
  for (const id of runDates().reverse()) {
    const record = loadRun(id);
    const recent = Date.parse(`${record.date}T12:00:00Z`) >= cutoff;
    if (recent && record.feedbackNote) notes.push(record.feedbackNote);
    const shipped = new Set(record.shipped.map((s) => s.draft));
    for (const d of record.drafts) {
      const verdict = shipped.has(d.n) ? "shipped" : d.feedback?.verdict;
      if (!verdict && !d.feedback?.note) continue;
      const score = scores.get(d.brief.style) ?? { keep: 0, reject: 0 };
      if (verdict === "shipped" || verdict === "keep") score.keep++;
      if (verdict === "reject") score.reject++;
      scores.set(d.brief.style, score);
      if (recent && verdict) {
        lines.push({ verdict, style: d.brief.style, title: d.brief.title, printText: d.brief.printText, note: d.feedback?.note ?? "" });
      }
    }
  }
  return { lines: lines.slice(0, 60), notes: notes.slice(0, 8), scores };
}

/** Holds a lock so the 9:07 run and a login run never overlap. */
function acquireLock(): () => void {
  const file = path.join(STATE_DIR, "draft.lock");
  fs.mkdirSync(STATE_DIR, { recursive: true });
  try {
    fs.writeFileSync(file, String(process.pid), { flag: "wx" });
  } catch {
    const pid = Number(fs.readFileSync(file, "utf8"));
    let alive = false;
    try {
      process.kill(pid, 0);
      alive = true;
    } catch {
      alive = false;
    }
    if (alive) throw new Error(`another draft is already running (pid ${pid})`);
    fs.writeFileSync(file, String(process.pid));
  }
  return () => fs.rmSync(file, { force: true });
}

async function preflight(): Promise<void> {
  const codex = await run("codex", ["login", "status"]).catch(() => null);
  if (!codex || !/chatgpt/i.test(codex.stdout + codex.stderr)) throw new Error("Codex is not logged in with ChatGPT; run: codex login");
  const claude = await run("claude", ["--version"]).catch(() => null);
  if (!claude || claude.code !== 0) throw new Error("Claude Code is not on PATH");
}

/** What a draft becomes on the page: a house template (hybrid or badge fallback) or Astra's own poster. */
function compositionSpec(draft: Draft, label: string, date: string, format: "png" | "webp"): object {
  if (draft.engine === "astra") return { kind: "image", size: IMAGE_SIZE, format, quality: 0.88, image: `/run/${draft.image}` };
  const { brief } = draft;
  const badge = draft.engine === "code";
  return {
    kind: brief.template ?? "specimen",
    size: IMAGE_SIZE,
    format,
    quality: 0.88,
    title: brief.title,
    slogan: brief.slogan,
    label,
    date: dateLabel(date),
    colorway: brief.colorway,
    form: brief.form,
    art: badge ? `/site/${BADGE}` : `/run/${draft.cutout}`,
    artIsBadge: badge,
  };
}

/** Scores a run's drafts with Claude and renders its contact sheet. */
async function judgeAndSheet(record: Run, runDir: string, renderer: Renderer): Promise<void> {
  const date = record.date;
  const styleNames = new Map(readStyles().map((style) => [style.id, style.name]));
  const ready = record.drafts.filter((d) => d.image && !d.error);
  if (ready.length) {
    log(`judging ${ready.length} drafts…`);
    try {
      // The judge can only read files in the run directory, so the badge goes there.
      const reference = "reference-ape.jpg";
      fs.copyFileSync(path.join(CHECKOUT, REFERENCE_IMAGES[0]), path.join(runDir, reference));
      const results = await judgeDrafts(runDir, ready, dateLabel(date), reference);
      for (const result of results) {
        const d = record.drafts.find((x) => x.n === result.draft);
        if (d) d.judgment = result;
      }
    } catch (error) {
      log(`judging failed, drafts stay unscored: ${(error as Error).message.split("\n")[0]}`);
    }
  }
  const sheet = await renderer.render({
    kind: "sheet",
    date: record.id && record.id !== date ? `${dateLabel(date)} · ${record.id.slice(11).toUpperCase()}` : dateLabel(date),
    topic: record.topic?.headline ?? null,
    items: record.drafts.map((d) => ({
      n: d.n,
      image: d.image && !d.error ? `/run/${d.image}` : null,
      title: d.brief.title,
      engine: (styleNames.get(d.brief.style) ?? d.brief.style).toLowerCase(),
      score: d.judgment?.score ?? null,
      note: d.error ?? d.judgment?.note ?? "",
      flags: d.judgment
        ? [!d.judgment.textOk && "TEXT", !d.judgment.onModel && "OFF-MODEL", !d.judgment.rulesOk && "RULES", !d.judgment.jokeLands && "JOKE?"].filter(
            (x): x is string => Boolean(x),
          )
        : [],
      topical: d.brief.inspiration !== null,
    })),
  });
  fs.writeFileSync(path.join(runDir, "sheet.png"), sheet);
}

/* ------------------------------------------------------------------ draft */

async function draft(options: Options): Promise<void> {
  const id = flag(options, "--date") ?? today();
  const date = dateOf(id);
  const count = Math.max(2, Math.min(24, Number(flag(options, "--count") ?? 6) || 6));
  const force = options.flags.has("--force");
  const runDir = runDirFor(id);
  if (fs.existsSync(PAUSE_FILE) && !force) return log("paused; run `chaos resume` to restart the daily drafts");
  if (fs.existsSync(path.join(runDir, "run.json")) && !force) return log(`drafts for ${id} already exist: ${path.join(runDir, "sheet.png")}`);

  const release = acquireLock();
  fs.mkdirSync(runDir, { recursive: true });
  setLogFile(path.join(runDir, "log.txt"));
  try {
    await preflight();
    const published = await publishedOn("main");
    const topic = options.flags.has("--zingers") ? await fetchTopic(date) : null;
    const feedback = pastFeedback();
    log(`briefing ${count} drafts for ${id}${topic ? `; topical story: ${topic.headline}` : ""}${feedback.lines.length ? `; learning from ${feedback.lines.length} past verdicts` : ""}`);
    const briefs = await writeBriefs({
      count,
      cwd: runDir,
      published: published.map(({ id, title, slogan }) => ({ id, title, slogan })).slice(-80),
      recentlyDrafted: recentlyDrafted(id),
      topic,
      feedback: feedback.lines,
      feedbackNotes: feedback.notes,
      styleScores: feedback.scores,
    });
    const record: Run = {
      id,
      date,
      createdAt: new Date().toISOString(),
      topic,
      drafts: briefs.map((brief, i) => ({ n: i + 1, brief, engine: brief.engine, image: null, cutout: null, error: null, seconds: 0, judgment: null })),
      shipped: [],
    };
    saveRun(record);

    // Astra illustrates, three at a time. A usage limit stops the rest; those drafts fall back to the badge.
    const refs = REFERENCE_IMAGES.map((ref) => path.join(CHECKOUT, ref));
    let astraDown = false;
    for (const dir of ["drafts", "cutouts"]) fs.mkdirSync(path.join(runDir, dir), { recursive: true });
    await pool(record.drafts, 3, async (d) => {
      const started = Date.now();
      if (astraDown) {
        d.engine = "code";
      } else {
        try {
          const mode = d.brief.engine === "hybrid" ? "cutout" : "print";
          const out = await illustrate(d.brief, path.join(runDir, "jobs", String(d.n)), refs, mode);
          const target = mode === "cutout" ? `cutouts/${d.n}.png` : `drafts/${d.n}.png`;
          fs.copyFileSync(out, path.join(runDir, target));
          if (mode === "cutout") d.cutout = target;
          else d.image = target;
        } catch (error) {
          if (error instanceof AstraUnavailable) {
            astraDown = true;
            d.engine = "code";
          } else d.error = (error as Error).message.split("\n")[0].slice(0, 200);
        }
      }
      d.seconds = Math.round((Date.now() - started) / 1000);
      log(`draft ${d.n} ${d.brief.title}: ${d.error ? `failed (${d.error})` : d.engine === "code" ? "badge fallback" : `illustrated in ${d.seconds}s`}`);
      saveRun(record);
    });
    if (astraDown) log("Astra hit a usage limit; the remaining drafts use the A-OK badge");

    const renderer = await openRenderer({ run: runDir, site: path.join(CHECKOUT, "public") });
    try {
      for (const d of record.drafts) {
        if (d.error || d.engine === "astra") continue;
        const png = await renderer.render(compositionSpec(d, `DRAFT ${d.n}`, date, "png"));
        d.image = `drafts/${d.n}.png`;
        fs.writeFileSync(path.join(runDir, d.image), png);
      }
      await judgeAndSheet(record, runDir, renderer);
    } finally {
      await renderer.close();
    }
    saveRun(record);

    const ok = record.drafts.filter((d) => d.image && !d.error);
    const best = [...ok].sort((a, b) => (b.judgment?.score ?? 0) - (a.judgment?.score ?? 0))[0];
    log(`contact sheet: ${path.join(runDir, "sheet.png")}`);
    await notify(`${ok.length} drafts ready${best ? `; top pick: ${best.brief.title} (${best.judgment?.score ?? "?"}/10)` : ""}. Run /chaos-monkeys to choose.`);
  } catch (error) {
    log(`draft failed: ${(error as Error).message}`);
    await notify(`Draft failed: ${(error as Error).message.split("\n")[0].slice(0, 120)}`);
    throw error;
  } finally {
    release();
    setLogFile(null);
  }
}

/** Re-scores a day's drafts and rebuilds its sheet, e.g. after editing BRAND.md or the checker. */
async function judge(options: Options): Promise<void> {
  const id = flag(options, "--date") ?? latestRunId();
  const record = loadRun(id);
  const runDir = runDirFor(id);
  if (record.topic === undefined) record.topic = await fetchTopic(record.date);
  const renderer = await openRenderer({ run: runDir, site: path.join(CHECKOUT, "public") });
  try {
    await judgeAndSheet(record, runDir, renderer);
  } finally {
    await renderer.close();
  }
  saveRun(record);
  log(`contact sheet: ${path.join(runDir, "sheet.png")}`);
}

/* ------------------------------------------------------------------ status */

async function status(options: Options): Promise<void> {
  const paused = fs.existsSync(PAUSE_FILE);
  const loaded = (await run("launchctl", ["print", `gui/${os.userInfo().uid}/${LAUNCHD_LABEL}`])).code === 0;
  console.log(`daily job: ${loaded ? "installed" : "not installed"}${paused ? ", PAUSED" : ""}`);
  const dates = runDates();
  if (!dates.length) return console.log("no drafts yet");
  const id = flag(options, "--date") ?? dates[dates.length - 1];
  const record = loadRun(id);
  const shipped = new Map(record.shipped.map((s) => [s.draft, s.id]));
  console.log(`drafts for ${id}: ${path.join(runDirFor(id), "sheet.png")}`);
  for (const d of record.drafts) {
    const score = d.judgment ? `${d.judgment.score}/10` : "--";
    const printOn = GARMENT_KINDS.filter((kind) => d.feedback?.print?.[kind]);
    const verdict = d.feedback?.verdict || printOn.length ? `[${[d.feedback?.verdict, printOn.length ? `print ${printOn.join("+")}` : ""].filter(Boolean).join(", ")}] ` : "";
    const state = shipped.has(d.n) ? `shipped as Nº ${shipped.get(d.n)}` : d.error ? `failed: ${d.error}` : `${verdict}${d.judgment?.note ?? ""}`;
    const tags = [d.brief.style, d.engine === "code" ? "badge" : "", d.brief.inspiration ? "zingers" : ""].filter(Boolean).join(", ");
    console.log(`  ${String(d.n).padStart(2)}. ${d.brief.title.padEnd(24)} ${score.padStart(5)}  ${tags.padEnd(24)} ${state}`);
  }
}

/* ------------------------------------------------------------------ ship and unpublish */

async function ship(options: Options): Promise<void> {
  const picks = options.positional.map(Number);
  if (!picks.length || picks.some((n) => !Number.isInteger(n) || n < 1)) throw new Error("usage: chaos ship 1 3 5");
  const id = flag(options, "--date") ?? latestRunId();
  const branch = flag(options, "--branch") ?? "main";
  const push = !options.flags.has("--no-push");
  const record = loadRun(id);
  const date = record.date;
  const runDir = runDirFor(id);
  for (const n of picks) {
    const d = record.drafts[n - 1];
    if (!d || !d.image || d.error) throw new Error(`draft ${n} of ${id} has no image to ship`);
    if (record.shipped.some((s) => s.draft === n)) throw new Error(`draft ${n} of ${id} already shipped`);
  }

  await syncSite(branch);
  const manifest = readManifest();
  let next = manifest.reduce((max, entry) => Math.max(max, Number(entry.id)), 0) + 1;
  const added: ManifestEntry[] = [];
  const renderer = await openRenderer({ run: runDir, site: path.join(CHECKOUT, "public") });
  try {
    for (const n of picks) {
      const d = record.drafts[n - 1];
      const number = String(next++).padStart(4, "0");
      const webp = await renderer.render(compositionSpec(d, `Nº ${number}`, date, "webp"));
      const target = imagePath(number);
      fs.mkdirSync(path.dirname(target.file), { recursive: true });
      fs.writeFileSync(target.file, webp);
      added.push({
        id: number,
        date,
        title: d.brief.title,
        slogan: d.brief.slogan,
        joke: d.brief.joke,
        alt: d.brief.alt,
        image: target.url,
        width: IMAGE_SIZE,
        height: IMAGE_SIZE,
        engine: d.engine,
        credit: CREDITS[d.engine],
        parents: d.brief.parents,
        ...(d.brief.inspiration ? { inspiration: d.brief.inspiration } : {}),
        style: d.brief.style,
        ...(d.brief.productCopy && d.brief.marketingCopy ? { copy: { product: d.brief.productCopy, marketing: d.brief.marketingCopy } } : {}),
      });
      log(`Nº ${number} ${d.brief.title} from draft ${n} (${Math.round(webp.length / 1024)} KB)`);
    }
  } finally {
    await renderer.close();
  }

  writeManifest([...manifest, ...added]);
  try {
    await verifySite();
  } catch (error) {
    await discardChanges();
    throw error;
  }
  const range = added.length === 1 ? `Nº ${added[0].id}` : `Nº ${added[0].id}–${added[added.length - 1].id}`;
  const message = [
    `Add Chaos Monkeys ${range}`,
    "",
    ...added.map((a) => `- Nº ${a.id} ${a.title}: ${a.slogan}`),
    "",
    `Picked by hand from the ${id} drafts. Briefs, layout, and checks by Claude; illustration by GPT-6-Astra.`,
  ].join("\n");
  const sha = await commitAndPush([MANIFEST_PATH, ...added.map((a) => imagePath(a.id).relative)], message, branch, push);
  record.shipped.push(...added.map((a, i) => ({ draft: picks[i], id: a.id, sha: push ? sha : null })));
  saveRun(record);

  if (push && branch === "main") {
    log("waiting for Vercel to deploy…");
    const url = await waitForDeploy(sha).catch((error: Error) => {
      log(error.message);
      return null;
    });
    log(url ? `deployed: ${url}` : "could not confirm the deployment; check Vercel");
  }
}

async function unpublish(options: Options): Promise<void> {
  const id = options.positional[0];
  if (!id || !/^\d{4}$/.test(id)) throw new Error("usage: chaos unpublish 0007");
  const branch = flag(options, "--branch") ?? "main";
  await syncSite(branch);
  const manifest = readManifest();
  const entry = manifest.find((m) => m.id === id);
  if (!entry) throw new Error(`Nº ${id} is not published on ${branch}`);
  writeManifest(manifest.filter((m) => m.id !== id));
  fs.rmSync(imagePath(id).file, { force: true });
  try {
    await verifySite();
  } catch (error) {
    await discardChanges();
    throw error;
  }
  await commitAndPush([MANIFEST_PATH, imagePath(id).relative], `Remove Chaos Monkey Nº ${id} ${entry.title}`, branch, !options.flags.has("--no-push"));
}

/* ------------------------------------------------------------------ review and feedback */

/**
 * Exports a run for the feedback page: the page itself, drafts.json, and a WebP of each draft in img/. Publish the
 * folder as an Artifact (index.html with the rest as files); the page stores verdicts in the Artifact's database.
 */
async function review(options: Options): Promise<void> {
  const id = flag(options, "--date") ?? latestRunId();
  const out = flag(options, "--out");
  if (!out) throw new Error("usage: chaos review [--date RUN] --out DIR");
  const record = loadRun(id);
  const runDir = runDirFor(id);
  const styles = new Map(readStyles().map((style) => [style.id, style.name]));
  fs.rmSync(path.join(out, "img"), { recursive: true, force: true });
  fs.mkdirSync(path.join(out, "img"), { recursive: true });
  fs.copyFileSync(path.join(TOOL_DIR, "review", "index.html"), path.join(out, "index.html"));

  const shipped = new Map(record.shipped.map((s) => [s.draft, s.id]));
  const drafts = [];
  const renderer = await openRenderer({ run: runDir, site: path.join(CHECKOUT, "public") });
  try {
    for (const d of record.drafts) {
      if (!d.image || d.error) continue;
      const image = `img/${id}-${d.n}.webp`;
      fs.writeFileSync(path.join(out, image), await renderer.render({ kind: "image", size: 900, format: "webp", quality: 0.84, image: `/run/${d.image}` }));
      const { brief } = d;
      drafts.push({
        n: d.n,
        image,
        title: brief.title,
        style: styles.get(brief.style) ?? brief.style,
        garment: `${brief.garmentColor} ${brief.garment}, ${brief.placement}`,
        printText: brief.printText,
        slogan: brief.slogan,
        productCopy: brief.productCopy,
        marketingCopy: brief.marketingCopy,
        joke: brief.joke,
        topical: brief.inspiration !== null,
        score: d.judgment?.score ?? null,
        judgeNote: d.judgment?.note ?? "",
        shipped: shipped.get(d.n) ?? null,
      });
    }
  } finally {
    await renderer.close();
  }
  const data = { run: id, date: record.date, label: dateLabel(record.date), topic: record.topic?.headline ?? null, drafts };
  fs.writeFileSync(path.join(out, "drafts.json"), `${JSON.stringify(data, null, 2)}\n`);
  log(`review page for ${id}: ${path.join(out, "index.html")} (${drafts.length} drafts)`);
}

type FeedbackFile = {
  run?: string;
  note?: string;
  items?: Array<{ run?: string; n: number; verdict?: string | null; note?: string; print?: { tee?: boolean; hoodie?: boolean } }>;
  notes?: Array<{ run: string; note: string }>;
};

/** Imports verdicts and notes from the feedback page (or a hand-written file) into each run's run.json. */
async function feedback(options: Options): Promise<void> {
  const file = options.positional[0];
  if (!file) throw new Error("usage: chaos feedback FILE.json [--date RUN]");
  const input = JSON.parse(fs.readFileSync(file, "utf8")) as FeedbackFile;
  const fallback = flag(options, "--date") ?? input.run ?? latestRunId();
  const at = new Date().toISOString();
  const records = new Map<string, Run>();
  const recordFor = (id: string) => {
    if (!records.has(id)) records.set(id, loadRun(id));
    return records.get(id) as Run;
  };
  let verdicts = 0;
  for (const item of input.items ?? []) {
    const record = recordFor(item.run ?? fallback);
    const d = record.drafts.find((x) => x.n === Number(item.n));
    if (!d) throw new Error(`run ${record.id} has no draft ${item.n}`);
    const verdict: Feedback["verdict"] = item.verdict === "keep" || item.verdict === "reject" ? item.verdict : null;
    const note = String(item.note ?? "").replace(/\s+/g, " ").trim().slice(0, 500);
    const print = { tee: item.print?.tee === true, hoodie: item.print?.hoodie === true };
    d.feedback = verdict || note || print.tee || print.hoodie ? { verdict, note, at, ...(print.tee || print.hoodie ? { print } : {}) } : null;
    if (verdict) verdicts++;
  }
  const notes = [...(input.notes ?? []), ...(input.note ? [{ run: fallback, note: input.note }] : [])];
  for (const { run: id, note } of notes) {
    const clean = String(note ?? "").replace(/\s+/g, " ").trim().slice(0, 1000);
    if (clean) recordFor(id).feedbackNote = clean;
  }
  for (const record of records.values()) saveRun(record);
  const scores = pastFeedback().scores;
  const ranked = [...scores.entries()].sort((a, b) => b[1].keep - b[1].reject - (a[1].keep - a[1].reject));
  log(`imported ${verdicts} verdicts and ${notes.length} batch notes into ${[...records.keys()].join(", ")}`);
  if (ranked.length) log(`style record (kept/rejected): ${ranked.map(([style, s]) => `${style} ${s.keep}/${s.reject}`).join(", ")}`);
}

/* ------------------------------------------------------------------ print and sell */

/** The product photo size, matching the shop's other garment photos (4:5). */
const PHOTO = { width: 1122, height: 1402 };

/** "3" (tee and hoodie), "3:tee" or "3:hoodie" on the command line; otherwise every draft ticked Print. */
function printPicks(options: Options, record: Run): Array<{ d: Draft; garments: GarmentKind[] }> {
  if (!options.positional.length) {
    return record.drafts
      .map((d) => ({ d, garments: GARMENT_KINDS.filter((kind) => d.feedback?.print?.[kind]) }))
      .filter((pick) => pick.garments.length > 0);
  }
  return options.positional.map((arg) => {
    const [n, kind] = arg.split(":");
    const d = record.drafts.find((x) => x.n === Number(n));
    if (!d) throw new Error(`run ${record.id} has no draft ${n}`);
    if (kind && !GARMENT_KINDS.includes(kind as GarmentKind)) throw new Error(`not a garment: ${kind} (tee or hoodie)`);
    return { d, garments: kind ? [kind as GarmentKind] : [...GARMENT_KINDS] };
  });
}

/** How to order it from Printful by hand: the blank, the print size, and which print file goes with which colours. */
function printfulNotes(merch: Merch): string {
  const lines = [`# ${merch.title}: Printful`, "", `From Chaos Monkeys ${merch.run}, draft ${merch.n}. Front print, centred, 1 in below the top of the print area.`, ""];
  for (const p of merch.products) {
    const blank = BLANKS[p.garment];
    const dark = new Set(p.lightInk ?? []);
    const offered = p.colors ?? [...SHOP_COLORS];
    lines.push(`## ${p.copy?.title ?? p.garment}`, "", `- Blank: ${blank.name} (Printful product ${blank.printful})`, `- Print: ${p.inches} in wide, ${p.dpi} DPI of real detail, on a ${blank.area.width} × ${blank.area.height} in file at ${PRINT_DPI} DPI`);
    const original = offered.filter((c) => !dark.has(c));
    if (original.length) lines.push(`- \`${p.printFile}\`: ${original.map((c) => `${c} (${blank.colors[c]})`).join(", ")}`);
    const light = offered.filter((c) => dark.has(c));
    if (p.printFileLight && light.length) lines.push(`- \`${p.printFileLight}\` (light ink): ${light.map((c) => `${c} (${blank.colors[c]})`).join(", ")}`);
    lines.push("- Each catalog variant's SKU is `printful-<variant id>`; the Stripe price for it names its print file.", "");
  }
  return lines.join("\n");
}

/**
 * Turns drafts into products: the print artwork (the draft with its background removed), a Printful print file per
 * garment, a model photo in each of the seven colours (checked against the art, with one retry), and product copy.
 * Everything lands in ~/.a-ok-chaos/merch/<run>-<n>/ with a contact sheet; `chaos sell` publishes it.
 */
async function printMerch(options: Options): Promise<void> {
  const id = flag(options, "--date") ?? latestRunId();
  const force = options.flags.has("--force");
  const record = loadRun(id);
  const runDir = runDirFor(id);
  const picks = printPicks(options, record);
  if (!picks.length) throw new Error(`nothing to print in ${id}: tick Print on the review page and import it, or name drafts (chaos print 3 5:tee)`);
  for (const { d } of picks) if (!d.image || d.error) throw new Error(`draft ${d.n} of ${id} has no image`);
  await preflight();
  const kinds = [...new Set(picks.flatMap((pick) => pick.garments))];
  const printful = new Map(await Promise.all(kinds.map(async (kind) => [kind, await printfulCatalog(BLANKS[kind])] as const)));

  // Art, its light-ink version for dark garments, and print files.
  const merches: Merch[] = [];
  let astraDown = false;
  let renderer = await openRenderer({ run: runDir, merch: MERCH_DIR });
  try {
    for (const { d, garments } of picks) {
      const merchId = `${id}-${d.n}`;
      const dir = merchDir(merchId);
      for (const sub of ["mockups", "web", "jobs"]) fs.mkdirSync(path.join(dir, sub), { recursive: true });
      const existing = fs.existsSync(path.join(dir, "merch.json")) && !force ? loadMerch(merchId) : null;
      fs.writeFileSync(path.join(dir, "art.png"), await renderer.render({ kind: "keyed", image: `/run/${d.image}` }));
      const art = pngInfo(path.join(dir, "art.png"));
      if (!art) throw new Error(`could not read ${merchId}/art.png`);
      const merch: Merch = existing ?? { id: merchId, run: id, n: d.n, title: d.brief.title, art: "art.png", artWidth: art.width, products: [] };
      merch.artWidth = art.width;

      // House posters carry their own background, so only art Astra drew whole needs re-inking.
      if (d.engine !== "astra") merch.artLight = null;
      for (let attempt = 1; d.engine === "astra" && !astraDown && attempt <= 2 && !(merch.artLight && (merch.artLightCheck?.score ?? 0) >= 7); attempt++) {
        try {
          const out = await lightInk(path.join(dir, merch.art), path.join(dir, "jobs", `light-ink-${attempt}`));
          fs.copyFileSync(out, path.join(dir, "art-light-raw.png"));
          fs.writeFileSync(path.join(dir, "art-light.png"), await renderer.render({ kind: "keyed", image: `/merch/${merchId}/art-light-raw.png` }));
          merch.artLight = "art-light.png";
          merch.artLightCheck = await judgeLightInk(dir, merch.art, merch.artLight);
          log(`${merchId}: light ink for dark garments, check ${merch.artLightCheck.score}/10: ${merch.artLightCheck.note}`);
        } catch (error) {
          if (error instanceof AstraUnavailable) astraDown = true;
          log(`${merchId}: light ink failed: ${(error as Error).message.split("\n")[0].slice(0, 160)}`);
        }
        saveMerch(merch);
      }
      const light = merch.artLight ? pngInfo(path.join(dir, merch.artLight)) : null;

      for (const garment of garments) {
        const blank = BLANKS[garment];
        const { swatch } = printful.get(garment) as Awaited<ReturnType<typeof printfulCatalog>>;
        // Colour by colour, print whichever version leaves less of the art hard to see on that fabric.
        const colors = SHOP_COLORS.map((color) => swatch[color]);
        const weakOriginal = await renderer.measure({ image: `/merch/${merchId}/${merch.art}`, colors });
        const weakLight = light ? await renderer.measure({ image: `/merch/${merchId}/${merch.artLight}`, colors }) : null;
        const lightColors = weakLight ? SHOP_COLORS.filter((_, i) => prefersLightInk(weakOriginal[i], weakLight[i])) : [];
        const weakChosen = SHOP_COLORS.map((color, i) => (weakLight && lightColors.includes(color) ? weakLight[i] : weakOriginal[i]));
        const offered = SHOP_COLORS.filter((_, i) => weakChosen[i] <= MAX_HARD_TO_SEE);
        const dropped = SHOP_COLORS.filter((color) => !offered.includes(color));
        if (dropped.length) log(`${merchId} ${garment}: not offered in ${dropped.join(", ")}: too much of the print would be hard to see`);
        log(
          `${merchId} ${garment}: share of the print hard to see, original${weakLight ? " / light ink" : ""}: ${SHOP_COLORS.map((color, i) => `${color} ${Math.round(weakOriginal[i] * 100)}%${weakLight ? `/${Math.round(weakLight[i] * 100)}%` : ""}`).join(", ")}`,
        );
        // As wide as the blank and the art's resolution allow, short enough to fit the print area under a 1-inch top
        // margin, and the same size in every colour.
        const arts = lightColors.length && light ? [art, light] : [art];
        const inches = Math.min(...arts.map((a) => Math.min(printSize(blank, a.width).inches, Math.floor(((blank.area.height - 1) * a.width * 10) / a.height) / 10)));
        const dpi = Math.round(Math.min(...arts.map((a) => a.width)) / inches);
        const files: Array<[string, string]> = [[`print-${garment}.png`, merch.art], ...(lightColors.length ? [[`print-${garment}-light-ink.png`, merch.artLight as string] as [string, string]] : [])];
        for (const [file, source] of files) {
          fs.writeFileSync(
            path.join(dir, file),
            await renderer.render({
              kind: "printfile",
              image: `/merch/${merchId}/${source}`,
              width: blank.area.width * PRINT_DPI,
              height: blank.area.height * PRINT_DPI,
              artWidth: Math.round(inches * PRINT_DPI),
              top: PRINT_DPI,
            }),
          );
        }
        log(
          `${merchId} ${garment}: print files ${blank.area.width}×${blank.area.height} in at ${PRINT_DPI} DPI, art ${inches} in wide (${dpi} DPI of real detail)${lightColors.length ? `; light ink on ${lightColors.join(", ")}` : ""}`,
        );
        const kept = merch.products.find((p) => p.garment === garment);
        const product: MerchProduct = kept ?? {
          garment,
          printFile: files[0][0],
          inches,
          dpi,
          mockups: SHOP_COLORS.map((color) => ({ color, image: null, web: null, score: null, note: "" })),
          copy: null,
          sold: null,
        };
        // New colours mean new copy: it lists them.
        if (product.copy && (product.colors ?? SHOP_COLORS).join() !== offered.join()) product.copy = null;
        Object.assign(product, { printFile: files[0][0], printFileLight: files[1]?.[0] ?? null, lightInk: lightColors, colors: offered, inches, dpi });
        if (!kept) merch.products.push(product);
      }
      saveMerch(merch);
      merches.push(merch);
    }
  } finally {
    await renderer.close();
  }

  // Model photos, three at a time; each folder's photos are checked against its art, and failures get one more try.
  type Job = { merch: Merch; product: MerchProduct; mockup: Mockup };
  const artFor = (merch: Merch, product: MerchProduct, color: ShopColor) =>
    merch.artLight && product.lightInk?.includes(color) ? merch.artLight : merch.art;
  const wanted = (job: Job) =>
    !job.product.sold &&
    (job.product.colors ?? SHOP_COLORS).includes(job.mockup.color) &&
    picks.some((p) => `${id}-${p.d.n}` === job.merch.id && p.garments.includes(job.product.garment));
  const all: Job[] = merches.flatMap((merch) => merch.products.flatMap((product) => product.mockups.map((m) => ({ merch, product, mockup: m })))).filter(wanted);
  // A photo taken with the other artwork (say, before light ink existed) is taken again.
  for (const { merch, product, mockup: m } of all) {
    if (m.image && (m.art ?? merch.art) !== artFor(merch, product, m.color)) Object.assign(m, { image: null, web: null, score: null, note: "" });
  }
  for (let attempt = 1; attempt <= 2 && !astraDown; attempt++) {
    const todo = all.filter((job) => !job.mockup.image || (job.mockup.score !== null && job.mockup.score < 7));
    if (!todo.length) break;
    log(`photographing ${todo.length} mockups${attempt > 1 ? " again (they failed the check)" : ""}…`);
    await pool(todo, 3, async (job) => {
      if (astraDown) return;
      const { merch, product, mockup: m } = job;
      const blank = BLANKS[product.garment];
      const dir = merchDir(merch.id);
      try {
        const out = await mockup(
          {
            art: path.join(dir, artFor(merch, product, m.color)),
            garment: product.garment,
            blank: blank.name,
            color: m.color.toLowerCase(),
            hex: (printful.get(product.garment) as Awaited<ReturnType<typeof printfulCatalog>>).swatch[m.color],
            model: MODELS[m.color],
            inches: product.inches,
          },
          path.join(dir, "jobs", `${product.garment}-${m.color}-${attempt}`),
        );
        m.image = `mockups/${product.garment}-${m.color.toLowerCase()}.png`;
        m.art = artFor(merch, product, m.color);
        fs.copyFileSync(out, path.join(dir, m.image));
        m.score = null;
        m.note = "";
        log(`${merch.id} ${product.garment} ${m.color}: photographed`);
      } catch (error) {
        if (error instanceof AstraUnavailable) astraDown = true;
        m.note = `failed: ${(error as Error).message.split("\n")[0].slice(0, 160)}`;
        log(`${merch.id} ${product.garment} ${m.color}: ${m.note}`);
      }
      saveMerch(merch);
    });
    for (const merch of merches) {
      const photos = merch.products.flatMap((p) =>
        p.mockups.filter((m) => m.image && m.score === null).map((m) => ({ file: m.image as string, garment: p.garment, color: m.color, art: m.art ?? merch.art })),
      );
      if (!photos.length) continue;
      try {
        for (const check of await judgeMockups(merchDir(merch.id), photos)) {
          const m = merch.products.flatMap((p) => p.mockups).find((x) => x.image === check.file);
          if (m) {
            m.score = check.printMatches ? check.score : Math.min(check.score, 4);
            m.note = check.note;
          }
        }
      } catch (error) {
        log(`checking ${merch.id} failed, its photos stay unscored: ${(error as Error).message.split("\n")[0]}`);
      }
      saveMerch(merch);
    }
  }
  if (astraDown) log("Astra hit a usage limit; run chaos print again later to finish the missing photos");

  // Shop-sized photos, copy, and a contact sheet per draft.
  const catalog = JSON.parse(fs.readFileSync(path.join(CHECKOUT, CATALOG_PATH), "utf8")) as Catalog;
  const example = catalog.products.edges.map((e) => e.node).find((n) => n.handle === "a-ok-all-angles-tee") ?? catalog.products.edges[0].node;
  const taken = new Set([...catalog.products.edges.map((e) => e.node.handle), ...merches.flatMap((m) => m.products.map((p) => p.copy?.handle ?? ""))]);
  renderer = await openRenderer({ run: runDir, merch: MERCH_DIR });
  try {
    for (const merch of merches) {
      const dir = merchDir(merch.id);
      const d = record.drafts.find((x) => x.n === merch.n) as Draft;
      for (const m of merch.products.flatMap((p) => p.mockups.map((x) => ({ p, x })))) {
        if (!m.x.image || !(m.p.colors ?? SHOP_COLORS).includes(m.x.color)) continue;
        m.x.web = `web/${m.p.garment}-${m.x.color.toLowerCase()}.webp`;
        fs.writeFileSync(path.join(dir, m.x.web), await renderer.render({ kind: "cover", image: `/merch/${merch.id}/${m.x.image}`, ...PHOTO, format: "webp", quality: 0.9, focusY: 0.35 }));
      }
      const needCopy = merch.products.filter((p) => !p.copy && !p.sold);
      if (needCopy.length) {
        const copies = await writeProductCopy(
          dir,
          needCopy.map((p) => ({ key: p.garment, garment: p.garment, blank: BLANKS[p.garment].name, colors: [...(p.colors ?? SHOP_COLORS)], inches: p.inches, lightInk: p.lightInk ?? [], brief: d.brief })),
          { title: example.title, descriptionHtml: example.descriptionHtml, tags: example.tags },
          [...taken],
        );
        for (const copy of copies) {
          const product = needCopy.find((p) => p.garment === copy.key);
          if (!product) continue;
          let handle = copy.handle;
          for (let i = 2; taken.has(handle); i++) handle = `${copy.handle}-${i}`;
          taken.add(handle);
          product.copy = {
            title: copy.title,
            handle,
            description: copy.description,
            descriptionHtml: copy.descriptionHtml,
            tags: copy.tags,
            seo: { title: copy.seoTitle, description: copy.seoDescription },
          };
        }
      }
      saveMerch(merch);
      fs.writeFileSync(path.join(dir, "PRINTFUL.md"), printfulNotes(merch));
      const items = merch.products.flatMap((p) =>
        p.mockups.filter((m) => (p.colors ?? SHOP_COLORS).includes(m.color)).map((m, i) => ({
          n: i + 1,
          image: m.image ? `/merch/${merch.id}/${m.image}` : null,
          title: `${m.color} ${p.garment}`.toUpperCase(),
          engine: p.copy?.title ?? p.garment,
          score: m.score,
          note: m.note,
          flags: m.score !== null && m.score < 7 ? ["PRINT?"] : [],
          topical: false,
        })),
      );
      fs.writeFileSync(path.join(dir, "sheet.png"), await renderer.render({
          kind: "sheet",
          date: merch.title,
          heading: `CHAOS MONKEYS · MERCH · ${merch.title}`,
          hint: `${merch.products.map((p) => `${p.copy?.title ?? p.garment}, ${p.inches} in wide at ${p.dpi} DPI${p.lightInk?.length ? `, light ink on ${p.lightInk.join("/")}` : ""}`).join(" · ")} · sell: chaos sell ${merch.id}`,
          topic: null,
          items,
        }));
      const offeredMockups = (p: MerchProduct) => p.mockups.filter((m) => (p.colors ?? SHOP_COLORS).includes(m.color));
      const ready = merch.products.every((p) => p.copy && offeredMockups(p).every((m) => m.web));
      const weak = merch.products.flatMap((p) => offeredMockups(p).filter((m) => m.score !== null && m.score < 7).map((m) => `${p.garment} ${m.color}`));
      log(`${merch.id}: ${merch.products.map((p) => `${p.copy?.title ?? p.garment} (${p.inches} in, ${p.dpi} DPI)`).join(", ")}`);
      log(`  sheet: ${path.join(dir, "sheet.png")}${weak.length ? `; check: ${weak.join(", ")}` : ""}`);
      log(ready ? `  next: chaos sell ${merch.id}` : "  not ready to sell yet: some photos or copy are missing; run chaos print again");
    }
  } finally {
    await renderer.close();
  }
}

/**
 * Puts printed drafts on the shop: photos into public/images/products, products into product-catalog.json, then a
 * Stripe product with a price per variant, then lint, build, commit, push, and wait for Vercel, like `ship`.
 */
async function sell(options: Options): Promise<void> {
  const ids = options.positional;
  if (!ids.length) throw new Error("usage: chaos sell RUN-N … (from chaos print)");
  const branch = flag(options, "--branch") ?? "main";
  const push = !options.flags.has("--no-push");
  const dryRun = options.flags.has("--dry-run");
  const useStripe = !options.flags.has("--no-stripe") && !dryRun;
  const key = process.env.STRIPE_SECRET_KEY;
  if (useStripe && !key) throw new Error("set STRIPE_SECRET_KEY to the shop's key (its .env.local), or pass --no-stripe");
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://a-ok.ai").replace(/\/+$/, "");

  const merches = ids.map(loadMerch);
  for (const merch of merches) {
    for (const p of merch.products.filter((x) => !x.sold)) {
      if (!p.copy) throw new Error(`${merch.id} ${p.garment} has no copy yet; run chaos print`);
      const offered = p.mockups.filter((m) => (p.colors ?? SHOP_COLORS).includes(m.color));
      const missing = offered.filter((m) => !m.web).map((m) => m.color);
      if (missing.length) throw new Error(`${merch.id} ${p.garment} is missing photos for ${missing.join(", ")}; run chaos print`);
      if (p.lightInk?.length && (merch.artLightCheck?.score ?? 0) < 7 && !options.flags.has("--force")) {
        throw new Error(`${merch.id}: the light-ink art for dark garments failed its check (${merch.artLightCheck?.note ?? "never made"}); rerun chaos print, or pass --force`);
      }
      const weak = offered.filter((m) => (m.score ?? 0) < 7).map((m) => m.color);
      if (weak.length && !options.flags.has("--force")) throw new Error(`${merch.id} ${p.garment}: the check flagged ${weak.join(", ")}; look at the sheet, then pass --force to sell anyway`);
    }
  }

  await syncSite(branch);
  const catalogFile = path.join(SITE_DIR, CATALOG_PATH);
  const catalog = JSON.parse(fs.readFileSync(catalogFile, "utf8")) as Catalog;
  const newId = idAllocator(catalog);
  const now = new Date().toISOString();
  const added: Array<{ merch: Merch; product: MerchProduct; node: CatalogNode }> = [];
  const paths = [CATALOG_PATH];
  for (const merch of merches) {
    for (const product of merch.products.filter((p) => !p.sold)) {
      const blank = BLANKS[product.garment];
      const copy = product.copy as NonNullable<MerchProduct["copy"]>;
      if (catalog.products.edges.some((e) => e.node.handle === copy.handle)) throw new Error(`the shop already has a product called ${copy.handle}`);
      const { swatch, variant } = await printfulCatalog(blank);
      const images = product.mockups.filter((m) => (product.colors ?? SHOP_COLORS).includes(m.color)).map((m) => {
        const relative = `${PRODUCT_IMAGE_DIR}/${copy.handle}-${m.color.toLowerCase()}.webp`;
        fs.mkdirSync(path.dirname(path.join(SITE_DIR, relative)), { recursive: true });
        fs.copyFileSync(path.join(merchDir(merch.id), m.web as string), path.join(SITE_DIR, relative));
        paths.push(relative);
        return { color: m.color, url: `/${relative.replace(/^public\//, "")}`, ...PHOTO };
      });
      const node = catalogNode({ newId, blank, copy, images, swatch, variant, now });
      catalog.products.edges.push({ node });
      added.push({ merch, product, node });
      log(`${node.title} (${node.handle}): ${node.variants.edges.length} variants at $${blank.price}`);
    }
  }
  if (!added.length) return log("nothing left to sell in those folders");
  const writeCatalog = () => fs.writeFileSync(catalogFile, `${JSON.stringify(catalog, null, 2)}\n`);
  writeCatalog();

  try {
    await verifySite();
    if (dryRun) {
      await discardChanges([IMAGE_DIR, PRODUCT_IMAGE_DIR]);
      return log(`dry run: lint and build pass with ${added.length} new products; nothing was sent to Stripe or committed`);
    }
    if (useStripe) {
      for (const { node } of added) {
        const product = added.find((a) => a.node === node)?.product as MerchProduct;
        await addToStripe(key as string, node, siteUrl, (color) => (product.printFileLight && product.lightInk?.includes(color as ShopColor) ? product.printFileLight : product.printFile));
        log(`Stripe: ${node.stripeProductId} with ${node.variants.edges.length} prices`);
      }
      writeCatalog();
    }
  } catch (error) {
    await discardChanges([IMAGE_DIR, PRODUCT_IMAGE_DIR]);
    const created = added.filter((a) => a.node.stripeProductId).map((a) => a.node.stripeProductId);
    throw new Error(`${(error as Error).message}${created.length ? `. Stripe products already created (archive them or rerun; reruns reuse them): ${created.join(", ")}` : ""}`);
  }

  const message = [
    `Add ${added.map((a) => a.node.title).join(", ")}`,
    "",
    ...added.map(({ node, merch, product }) => `- ${node.title}: Chaos Monkeys ${merch.run} draft ${merch.n}, printed ${product.inches} in wide on the ${BLANKS[product.garment].name}, in ${(product.colors ?? SHOP_COLORS).join(", ")}`),
    "",
    "Print files, model photos and copy by `chaos print`; photos by GPT-6-Astra, copy by Claude.",
  ].join("\n");
  const sha = await commitAndPush(paths, message, branch, push);
  for (const { merch, product, node } of added) {
    product.sold = { handle: node.handle, stripeProductId: node.stripeProductId ?? null, sha: push ? sha : null, at: now };
    saveMerch(merch);
  }
  if (push && branch === "main") {
    log("waiting for Vercel to deploy…");
    const url = await waitForDeploy(sha).catch((error: Error) => {
      log(error.message);
      return null;
    });
    log(url ? `deployed: ${url}` : "could not confirm the deployment; check Vercel");
    for (const { node } of added) log(`${siteUrl}/products/${node.handle}`);
  }
}

/* ------------------------------------------------------------------ install */

async function install(): Promise<void> {
  for (const dir of [STATE_DIR, path.join(STATE_DIR, "bin"), LOGS_DIR, RUNS_DIR]) fs.mkdirSync(dir, { recursive: true });
  await syncSite("main");
  await ensureFonts();

  const launcher = path.join(STATE_DIR, "bin", "chaos");
  fs.writeFileSync(
    launcher,
    `#!/bin/zsh
# A-OK Chaos Monkeys: runs the tool from the publish clone, synced to origin/main. Written by \`chaos install\`.
export PATH="/opt/homebrew/bin:$HOME/.local/bin:/usr/local/bin:$PATH"
export CHAOS_STATE="${STATE_DIR}"
cd "${SITE_DIR}" || { echo "no publish clone; run chaos install"; exit 1; }
if git fetch --quiet origin main; then
  if [ -z "$(git status --porcelain)" ] && { [ -z "$(git rev-list origin/main..HEAD)" ] || [ -n "$(git branch -r --contains HEAD)" ]; }; then
    git checkout --quiet --detach origin/main
  fi
fi
TOOL="${SITE_DIR}/scripts/chaos-monkeys/chaos.ts"
if [ ! -f "$TOOL" ]; then echo "$(date '+%F %T') chaos-monkeys is not on main yet; nothing to do"; exit 0; fi
exec node --disable-warning=ExperimentalWarning "$TOOL" "$@"
`,
    { mode: 0o755 },
  );

  fs.mkdirSync(path.dirname(PLIST), { recursive: true });
  fs.writeFileSync(
    PLIST,
    `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>${LAUNCHD_LABEL}</string>
  <key>ProgramArguments</key>
  <array>
    <string>/bin/zsh</string>
    <string>${launcher}</string>
    <string>draft</string>
  </array>
  <!-- Daily at 9:07. If the Mac is asleep, launchd runs it on wake; if it was off, RunAtLoad catches up at login.
       The draft command does nothing when today's drafts already exist, so the day never runs twice. -->
  <key>StartCalendarInterval</key>
  <dict>
    <key>Hour</key><integer>9</integer>
    <key>Minute</key><integer>7</integer>
  </dict>
  <key>RunAtLoad</key>
  <true/>
  <key>StandardOutPath</key>
  <string>${path.join(LOGS_DIR, "launchd.out.log")}</string>
  <key>StandardErrorPath</key>
  <string>${path.join(LOGS_DIR, "launchd.err.log")}</string>
  <key>ProcessType</key>
  <string>Background</string>
</dict>
</plist>
`,
  );
  const domain = `gui/${os.userInfo().uid}`;
  await run("launchctl", ["bootout", domain, PLIST]);
  await runOrThrow("launchctl", ["bootstrap", domain, PLIST]);

  fs.mkdirSync(path.dirname(SKILL_TARGET), { recursive: true });
  fs.copyFileSync(path.join(TOOL_DIR, "SKILL.md"), SKILL_TARGET);
  log(`installed: ${PLIST}`);
  log(`launcher: ${launcher}`);
  log(`skill: ${SKILL_TARGET}`);
}

async function uninstall(): Promise<void> {
  await run("launchctl", ["bootout", `gui/${os.userInfo().uid}`, PLIST]);
  fs.rmSync(PLIST, { force: true });
  fs.rmSync(path.dirname(SKILL_TARGET), { recursive: true, force: true });
  log(`removed the daily job and the skill; drafts and the publish clone stay in ${STATE_DIR}`);
}

/* ------------------------------------------------------------------ main */

const [command, ...rest] = process.argv.slice(2);
const options = parseArgs(rest);
const commands: Record<string, () => Promise<void>> = {
  draft: () => draft(options),
  status: () => status(options),
  judge: () => judge(options),
  ship: () => ship(options),
  review: () => review(options),
  print: () => printMerch(options),
  sell: () => sell(options),
  feedback: () => feedback(options),
  unpublish: () => unpublish(options),
  install,
  uninstall,
  pause: async () => {
    fs.mkdirSync(STATE_DIR, { recursive: true });
    fs.writeFileSync(PAUSE_FILE, `${new Date().toISOString()}\n`);
    log("paused: the daily job will skip until `chaos resume`");
  },
  resume: async () => {
    fs.rmSync(PAUSE_FILE, { force: true });
    log("resumed");
  },
};

if (!command || !commands[command]) {
  console.log(fs.readFileSync(import.meta.filename, "utf8").split("*/")[0].replace(/^\/\*\*?/, "").replace(/^ \* ?/gm, ""));
  process.exit(command ? 1 : 0);
}
commands[command]().catch((error: Error) => {
  console.error(`chaos ${command}: ${error.message}`);
  process.exit(1);
});
