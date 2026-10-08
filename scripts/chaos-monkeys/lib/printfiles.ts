/**
 * The archive: a private repository (lucasdickey/a-ok-print-files), cloned to ~/.a-ok-chaos/print-files, holding
 * everything the tool makes that isn't on the public site, so it can be pulled on any machine:
 *
 *   concepts/<run>/   every draft as a near-lossless WebP, its brief, the judge's score, and the owner's verdict
 *   merch/<run>-<n>/  for anything printed: the Printful print files and art at full size, the original draft PNG,
 *                     the model photos, PRINTFUL.md, and, once sold, product-<garment>.json (Printful variant ids)
 *   TASTE.md          the owner's rules
 *
 * It is a projection of ~/.a-ok-chaos: each sync rebuilds the folders it touches from local state, so a failed push
 * loses nothing, and the next sync (or `chaos archive`) catches up. The shop repository is public, so none of this can
 * live there.
 */
import fs from "node:fs";
import path from "node:path";
import { MERCH_DIR, RUNS_DIR, STATE_DIR, TASTE_FILE, log, pngInfo, run, runOrThrow, type Run } from "./config.ts";
import { BLANKS, SHOP_COLORS, merchDir, printfulNotes, type CatalogNode, type Merch, type MerchProduct } from "./merch.ts";
import { ensureIdentity } from "./publish.ts";
import { openRenderer } from "./renderer.ts";

export const PRINT_FILES_REPO = process.env.CHAOS_PRINT_FILES_REPO ?? "https://github.com/lucasdickey/a-ok-print-files.git";
export const PRINT_FILES_DIR = path.join(STATE_DIR, "print-files");

const git = (...args: string[]) => runOrThrow("git", ["-C", PRINT_FILES_DIR, ...args], { timeoutMs: 10 * 60_000 });

const slug = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);

/** Clones the archive if needed and puts it on the remote's main, discarding nothing that isn't rebuilt anyway. */
async function syncArchive(): Promise<void> {
  if (!fs.existsSync(path.join(PRINT_FILES_DIR, ".git"))) {
    log(`cloning the archive into ${PRINT_FILES_DIR}…`);
    await runOrThrow("git", ["clone", "--quiet", PRINT_FILES_REPO, PRINT_FILES_DIR], { timeoutMs: 30 * 60_000 });
  }
  await ensureIdentity(PRINT_FILES_DIR);
  // A brand-new repository has no main yet.
  if ((await run("git", ["-C", PRINT_FILES_DIR, "ls-remote", "--heads", "origin", "main"])).stdout.trim()) {
    await git("fetch", "--quiet", "origin", "main");
    await git("checkout", "--quiet", "-B", "main", "origin/main");
    await git("clean", "--quiet", "-fd");
  } else {
    await git("checkout", "--quiet", "-B", "main");
  }
}

export type ArchiveWork = {
  /** Runs whose concepts to (re)write. */
  runs?: Run[];
  /** Printed drafts to (re)write, with the shop's catalog entries for any that sold. */
  merch?: Merch[];
  nodeFor?: (handle: string) => CatalogNode | undefined;
  message: string;
};

/**
 * Writes the given runs and merch into the archive, refreshes TASTE.md and the index, commits, and pushes. Retries
 * once if another machine pushed first. Returns the commit, or null when nothing changed.
 */
export async function syncToArchive(work: ArchiveWork): Promise<string | null> {
  for (let attempt = 1; ; attempt++) {
    await syncArchive();
    if (work.runs?.length) await writeConcepts(work.runs);
    for (const merch of work.merch ?? []) writeMerch(merch, work.nodeFor ?? (() => undefined));
    if (fs.existsSync(TASTE_FILE)) fs.copyFileSync(TASTE_FILE, path.join(PRINT_FILES_DIR, "TASTE.md"));
    writeIndex();
    await git("add", "-A");
    if (!(await run("git", ["-C", PRINT_FILES_DIR, "status", "--porcelain"])).stdout.trim()) return null;
    await git("commit", "--quiet", "-m", work.message);
    const pushed = await run("git", ["-C", PRINT_FILES_DIR, "push", "--quiet", "origin", "HEAD:refs/heads/main"], { timeoutMs: 30 * 60_000 });
    if (pushed.code === 0) {
      const sha = (await git("rev-parse", "HEAD")).trim();
      log(`archive: ${work.message} (${sha.slice(0, 8)})`);
      return sha;
    }
    if (attempt >= 2) throw new Error(`archive push failed: ${(pushed.stderr || pushed.stdout).trim().split("\n").slice(-3).join(" ")}`);
  }
}

/* ------------------------------------------------------------------ concepts */

async function writeConcepts(runs: Run[]): Promise<void> {
  const renderer = await openRenderer({ runs: RUNS_DIR });
  try {
    for (const record of runs) {
      const id = record.id ?? record.date;
      const dir = path.join(PRINT_FILES_DIR, "concepts", id);
      fs.rmSync(dir, { recursive: true, force: true });
      fs.mkdirSync(dir, { recursive: true });
      const shipped = new Map(record.shipped.map((s) => [s.draft, s.id]));
      const drafts = [];
      for (const d of record.drafts) {
        let file: string | null = null;
        const source = d.image ? path.join(RUNS_DIR, id, d.image) : null;
        const info = source && fs.existsSync(source) ? pngInfo(source) : null;
        if (info && !d.error) {
          file = `${id}-${String(d.n).padStart(2, "0")}-${slug(d.brief.title)}.webp`;
          fs.writeFileSync(path.join(dir, file), await renderer.render({ kind: "image", size: info.width, format: "webp", quality: 0.95, image: `/runs/${id}/${d.image}` }));
        }
        drafts.push({
          n: d.n,
          file,
          title: d.brief.title,
          style: d.brief.style,
          engine: d.engine,
          garment: `${d.brief.garmentColor} ${d.brief.garment}, ${d.brief.placement}`,
          printText: d.brief.printText,
          slogan: d.brief.slogan,
          joke: d.brief.joke,
          productCopy: d.brief.productCopy,
          marketingCopy: d.brief.marketingCopy,
          art: d.brief.art,
          judgment: d.judgment,
          feedback: d.feedback ?? null,
          shipped: shipped.get(d.n) ?? null,
          error: d.error,
        });
      }
      const sheet = path.join(RUNS_DIR, id, "sheet.png");
      const sheetInfo = fs.existsSync(sheet) ? pngInfo(sheet) : null;
      if (sheetInfo) {
        fs.writeFileSync(
          path.join(dir, `${id}-sheet.webp`),
          await renderer.render({ kind: "cover", image: `/runs/${id}/sheet.png`, width: sheetInfo.width, height: sheetInfo.height, format: "webp", quality: 0.85 }),
        );
      }
      const data = { run: id, date: record.date, topic: record.topic?.headline ?? null, note: record.feedbackNote ?? null, drafts };
      fs.writeFileSync(path.join(dir, `${id}-concepts.json`), `${JSON.stringify(data, null, 2)}\n`);
      fs.writeFileSync(path.join(dir, "README.md"), conceptsReadme(data));
    }
  } finally {
    await renderer.close();
  }
}

type ConceptData = {
  run: string;
  note: string | null;
  drafts: Array<{
    n: number;
    file: string | null;
    title: string;
    style: string;
    garment: string;
    slogan: string;
    judgment: { score: number; note: string } | null;
    feedback: { verdict: string | null; note: string; print?: { tee: boolean; hoodie: boolean } } | null;
    shipped: string | null;
  }>;
};

function conceptsReadme(data: ConceptData): string {
  const cell = (text: string) => text.replace(/\|/g, "\\|").replace(/\n/g, " ");
  const rows = data.drafts.map((d) => {
    const verdict = [d.feedback?.verdict, d.shipped ? `shipped Nº ${d.shipped}` : null, d.feedback?.print?.tee ? "print tee" : null, d.feedback?.print?.hoodie ? "print hoodie" : null]
      .filter(Boolean)
      .join(", ");
    const image = d.file ? `<img src="${d.file}" width="220">` : "(no image)";
    return `| ${image} | **${d.n}. ${cell(d.title)}**<br>${cell(d.style)} · ${cell(d.garment)}<br>${cell(d.slogan)}<br>Judge: ${d.judgment ? `${d.judgment.score}/10, ${cell(d.judgment.note)}` : "unscored"}<br>Verdict: ${verdict || "not reviewed"}${d.feedback?.note ? `, "${cell(d.feedback.note)}"` : ""} |`;
  });
  return [
    `# ${data.run}`,
    "",
    data.note ? `Batch note: "${data.note}"\n` : "",
    `Contact sheet: [${data.run}-sheet.webp](${data.run}-sheet.webp). Briefs, scores and verdicts: [${data.run}-concepts.json](${data.run}-concepts.json).`,
    "",
    "| Draft | |",
    "|---|---|",
    ...rows,
    "",
  ].join("\n");
}

/* ------------------------------------------------------------------ merch */

/**
 * File names in the archive start with the design's name, so a file still says what it is once it leaves its folder:
 * a-ok-insert-token-tee-art-light.png, a-ok-insert-token-tee-print-light-ink.png, a-ok-insert-token-tee-black.webp.
 * A design printed on one garment uses that product's handle; one on both uses its own name for the shared art.
 */
function archiveNames(merch: Merch) {
  const only = merch.products.length === 1 ? merch.products[0].copy?.handle : undefined;
  const design = only ?? `a-ok-${slug(merch.title)}`;
  const productName = (p: MerchProduct) => p.copy?.handle ?? `${design}-${p.garment}`;
  const name = (file: string): string => {
    const product = merch.products.find((p) => p.printFile === file || p.printFileLight === file);
    if (product) return `${productName(product)}-${file === product.printFileLight ? "print-light-ink" : "print"}.png`;
    return `${design}-${file}`;
  };
  return { design, productName, name };
}

function writeMerch(merch: Merch, nodeFor: (handle: string) => CatalogNode | undefined): void {
  const source = merchDir(merch.id);
  const dir = path.join(PRINT_FILES_DIR, "merch", merch.id);
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(path.join(dir, "mockups"), { recursive: true });
  const { design, productName, name } = archiveNames(merch);
  const copy = (file: string | null | undefined, as = file ? name(file) : file) => {
    if (file && as && fs.existsSync(path.join(source, file))) fs.copyFileSync(path.join(source, file), path.join(dir, as));
  };
  for (const file of [merch.art, merch.artLight, "source.png", "merch.json", "sheet.png"]) copy(file);
  fs.writeFileSync(path.join(dir, `${design}-printful.md`), printfulNotes(merch, name));
  for (const product of merch.products) {
    copy(product.printFile);
    copy(product.printFileLight);
    for (const m of product.mockups) {
      if (m.web && (product.colors ?? SHOP_COLORS).includes(m.color)) copy(m.web, `mockups/${productName(product)}-${m.color.toLowerCase()}.webp`);
    }
    const node = product.sold ? nodeFor(product.sold.handle) : undefined;
    if (!node) continue;
    const blank = BLANKS[product.garment];
    const lightInk = new Set<string>(product.lightInk ?? []);
    fs.writeFileSync(
      path.join(dir, `${productName(product)}-product.json`),
      `${JSON.stringify(
        {
          handle: node.handle,
          title: node.title,
          url: `https://a-ok.ai/products/${node.handle}`,
          blank: { name: blank.name, printful: blank.printful },
          print: { placement: "front, centred, 1 in below the top of the print area", inches: product.inches, dpi: product.dpi },
          colors: (node.options.find((o) => o.name === "Color")?.values ?? []).map((color) => ({
            color,
            printfulColor: blank.colors[color as keyof typeof blank.colors],
            printFile: name(lightInk.has(color) && product.printFileLight ? product.printFileLight : product.printFile),
          })),
          // Colour / size → Printful variant id.
          variants: Object.fromEntries(node.variants.edges.map((e) => [e.node.title, e.node.sku.replace(/^printful-/, "") || null])),
          stripeProductId: node.stripeProductId ?? null,
        },
        null,
        2,
      )}\n`,
    );
  }
  // The original draft, full size.
  const runFile = path.join(RUNS_DIR, merch.run, "run.json");
  if (fs.existsSync(runFile)) {
    const image = (JSON.parse(fs.readFileSync(runFile, "utf8")) as Run).drafts.find((d) => d.n === merch.n)?.image;
    if (image && fs.existsSync(path.join(RUNS_DIR, merch.run, image))) fs.copyFileSync(path.join(RUNS_DIR, merch.run, image), path.join(dir, `${design}-draft.png`));
  }
}

/* ------------------------------------------------------------------ index */

function writeIndex(): void {
  // Products from before the merch layout lived at the top level; merch/ holds them now.
  for (const entry of fs.readdirSync(PRINT_FILES_DIR, { withFileTypes: true })) {
    if (entry.isDirectory() && fs.existsSync(path.join(PRINT_FILES_DIR, entry.name, "product.json"))) fs.rmSync(path.join(PRINT_FILES_DIR, entry.name), { recursive: true, force: true });
  }
  const lines = [
    "# A-OK print files",
    "",
    "Everything the Chaos Monkeys tool (scripts/chaos-monkeys in a-ok-shop) makes that isn't on the public site, written as it goes: every concept, every print file, and the owner's rules ([TASTE.md](TASTE.md)).",
    "",
  ];
  const merchRoot = path.join(PRINT_FILES_DIR, "merch");
  const merchIds = fs.existsSync(merchRoot) ? fs.readdirSync(merchRoot).filter((name) => fs.statSync(path.join(merchRoot, name)).isDirectory()).sort() : [];
  const products = merchIds.flatMap((id) =>
    fs
      .readdirSync(path.join(merchRoot, id))
      .filter((name) => name.endsWith("-product.json"))
      .map((name) => ({
        id,
        ...(JSON.parse(fs.readFileSync(path.join(merchRoot, id, name), "utf8")) as {
          title: string;
          url: string;
          blank: { name: string };
          print: { inches: number; dpi: number };
          colors: Array<{ color: string }>;
        }),
      })),
  );
  lines.push("## On the shop", "", "| Product | Files | Blank | Print | Colours |", "|---|---|---|---|---|");
  for (const p of products) lines.push(`| [${p.title}](${p.url}) | [merch/${p.id}](merch/${p.id}/) | ${p.blank.name} | ${p.print.inches} in, ${p.print.dpi} DPI | ${p.colors.map((c) => c.color).join(", ")} |`);
  const unsold = merchIds.filter((id) => !products.some((p) => p.id === id));
  if (unsold.length) lines.push("", "## Printed, not on the shop yet", "", ...unsold.map((id) => `- [merch/${id}](merch/${id}/)`));
  const conceptRoot = path.join(PRINT_FILES_DIR, "concepts");
  const runs = fs.existsSync(conceptRoot) ? fs.readdirSync(conceptRoot).filter((name) => fs.existsSync(path.join(conceptRoot, name, `${name}-concepts.json`))).sort().reverse() : [];
  lines.push("", "## Concepts", "", "| Run | Drafts | Kept | Rejected | Shipped |", "|---|---|---|---|---|");
  for (const id of runs) {
    const data = JSON.parse(fs.readFileSync(path.join(conceptRoot, id, `${id}-concepts.json`), "utf8")) as ConceptData;
    const count = (verdict: string) => data.drafts.filter((d) => d.feedback?.verdict === verdict).length;
    lines.push(`| [${id}](concepts/${id}/) | ${data.drafts.length} | ${count("keep")} | ${count("reject")} | ${data.drafts.filter((d) => d.shipped).length} |`);
  }
  fs.writeFileSync(path.join(PRINT_FILES_DIR, "README.md"), `${lines.join("\n")}\n`);
}

/** Every merch folder on this Mac, for `chaos archive --all`. */
export function allMerch(): Merch[] {
  if (!fs.existsSync(MERCH_DIR)) return [];
  return fs
    .readdirSync(MERCH_DIR)
    .filter((name) => fs.existsSync(path.join(MERCH_DIR, name, "merch.json")))
    .map((name) => JSON.parse(fs.readFileSync(path.join(MERCH_DIR, name, "merch.json"), "utf8")) as Merch);
}
