/**
 * A-OK Chaos Monkeys: the daily drop, made on this Mac with the Claude and ChatGPT logins it already has.
 * No API keys, no CI. See README.md.
 *
 *   chaos draft [--count 6] [--date RUN] [--force]           brief, illustrate, compose, judge, contact sheet (~10 min)
 *   chaos status [--date RUN]                                the latest drafts, their scores, and what shipped
 *   chaos judge [--date RUN]                                 re-score a run's drafts and rebuild its contact sheet
 *   chaos review [--date RUN] --out DIR                      export a run for the feedback page (index.html, drafts.json, img/)
 *   chaos feedback FILE.json [--date RUN]                    import keep/reject verdicts and notes; future briefs learn from them
 *   chaos ship 1 3 5 [--date RUN] [--branch main] [--no-push]  publish drafts: lint, build, commit, push
 *   chaos unpublish 0007 [--branch main] [--no-push]         take a published monkey down
 *   chaos pause | resume                                     stop or restart the daily job
 *   chaos install | uninstall                                the daily job (9:07 and at login) and the /chaos-monkeys skill
 *
 * RUN is a date (2026-10-01), or a date with a label for an extra batch that leaves the daily run alone
 * (2026-10-01-apparel). Without --date, commands use the latest run.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  IMAGE_SIZE,
  LOGS_DIR,
  MANIFEST_PATH,
  PAUSE_FILE,
  REFERENCE_IMAGES,
  RUNS_DIR,
  SITE_DIR,
  STATE_DIR,
  TOOL_DIR,
  log,
  notify,
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
import { judgeDrafts, writeBriefs, type FeedbackLine, type StyleScores } from "./lib/claude.ts";
import { AstraUnavailable, illustrate } from "./lib/astra.ts";
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
      const results = await judgeDrafts(runDir, ready, dateLabel(date));
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
    const topic = await fetchTopic(date);
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
    const verdict = d.feedback?.verdict ? `[${d.feedback.verdict}] ` : "";
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
  items?: Array<{ run?: string; n: number; verdict?: string | null; note?: string }>;
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
    d.feedback = verdict || note ? { verdict, note, at } : null;
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
