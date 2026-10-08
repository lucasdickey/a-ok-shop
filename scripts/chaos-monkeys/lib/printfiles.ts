/**
 * The print-files archive: a private repository, cloned to ~/.a-ok-chaos/print-files, holding what Printful needs for
 * every product on the shop. The shop repository is public, so print-ready files can't live there. One folder per
 * product handle: the print files at full size, the art, the original draft, PRINTFUL.md, and product.json. `chaos
 * sell` adds each product it sells; `chaos archive` fills in products sold before the archive existed.
 */
import fs from "node:fs";
import path from "node:path";
import { RUNS_DIR, STATE_DIR, log, run, runOrThrow } from "./config.ts";
import { BLANKS, merchDir, type CatalogNode, type Merch, type MerchProduct } from "./merch.ts";
import { ensureIdentity } from "./publish.ts";

export const PRINT_FILES_REPO = process.env.CHAOS_PRINT_FILES_REPO ?? "https://github.com/lucasdickey/a-ok-print-files.git";
export const PRINT_FILES_DIR = path.join(STATE_DIR, "print-files");

const git = (...args: string[]) => runOrThrow("git", ["-C", PRINT_FILES_DIR, ...args], { timeoutMs: 10 * 60_000 });

/** Clones the archive if needed and brings it up to date with its remote. */
async function syncArchive(): Promise<void> {
  if (!fs.existsSync(path.join(PRINT_FILES_DIR, ".git"))) {
    log(`cloning the print-files archive into ${PRINT_FILES_DIR}…`);
    await runOrThrow("git", ["clone", "--quiet", PRINT_FILES_REPO, PRINT_FILES_DIR], { timeoutMs: 30 * 60_000 });
  }
  await ensureIdentity(PRINT_FILES_DIR);
  // A brand-new repository has no main yet.
  if ((await run("git", ["-C", PRINT_FILES_DIR, "ls-remote", "--heads", "origin", "main"])).stdout.trim()) {
    await git("fetch", "--quiet", "origin", "main");
    await git("checkout", "--quiet", "-B", "main", "origin/main");
  } else {
    await git("checkout", "--quiet", "-B", "main");
  }
}

export type ArchiveEntry = { merch: Merch; product: MerchProduct; node: CatalogNode };

function copyIfPresent(from: string, to: string): boolean {
  if (!fs.existsSync(from)) return false;
  fs.copyFileSync(from, to);
  return true;
}

/** Writes each product's folder and the index, commits, and pushes. Returns the commit, or null if nothing changed. */
export async function archiveProducts(entries: ArchiveEntry[]): Promise<string | null> {
  if (!entries.length) return null;
  await syncArchive();
  for (const { merch, product, node } of entries) {
    const source = merchDir(merch.id);
    const target = path.join(PRINT_FILES_DIR, node.handle);
    fs.rmSync(target, { recursive: true, force: true });
    fs.mkdirSync(target, { recursive: true });
    const files: string[] = [];
    for (const name of [product.printFile, product.printFileLight, merch.art, merch.artLight, "source.png", "PRINTFUL.md"]) {
      if (name && copyIfPresent(path.join(source, name), path.join(target, name))) files.push(name);
    }
    const run = JSON.parse(fs.readFileSync(path.join(RUNS_DIR, merch.run, "run.json"), "utf8")) as { drafts: Array<{ n: number; image: string | null }> };
    const draft = run.drafts.find((d) => d.n === merch.n)?.image;
    if (draft && copyIfPresent(path.join(RUNS_DIR, merch.run, draft), path.join(target, "draft.png"))) files.push("draft.png");
    const blank = BLANKS[product.garment];
    const colors = node.options.find((o) => o.name === "Color")?.values ?? [];
    const lightInk = new Set(product.lightInk ?? []);
    fs.writeFileSync(
      path.join(target, "product.json"),
      `${JSON.stringify(
        {
          handle: node.handle,
          title: node.title,
          url: `https://a-ok.ai/products/${node.handle}`,
          source: { run: merch.run, draft: merch.n },
          blank: { name: blank.name, printful: blank.printful },
          print: { placement: "front, centred, 1 in below the top of the print area", inches: product.inches, dpi: product.dpi },
          colors: colors.map((color) => ({
            color,
            printfulColor: blank.colors[color as keyof typeof blank.colors],
            printFile: lightInk.has(color as never) && product.printFileLight ? product.printFileLight : product.printFile,
          })),
          // SKU → Printful variant id, per colour and size.
          variants: Object.fromEntries(node.variants.edges.map((e) => [e.node.title, e.node.sku.replace(/^printful-/, "") || null])),
          stripeProductId: node.stripeProductId ?? null,
          files,
        },
        null,
        2,
      )}\n`,
    );
  }
  writeIndex();
  await git("add", "-A");
  if (!(await run("git", ["-C", PRINT_FILES_DIR, "status", "--porcelain"])).stdout.trim()) return null;
  await git("commit", "--quiet", "-m", `Add print files for ${entries.map((e) => e.node.title).join(", ")}`);
  await git("push", "--quiet", "origin", "HEAD:refs/heads/main");
  const sha = (await git("rev-parse", "HEAD")).trim();
  log(`print files pushed to ${PRINT_FILES_REPO.replace(/\.git$/, "")} (${sha.slice(0, 8)})`);
  return sha;
}

/** README.md: every product in the archive, with its colours and print size. */
function writeIndex(): void {
  const products = fs
    .readdirSync(PRINT_FILES_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith(".") && fs.existsSync(path.join(PRINT_FILES_DIR, entry.name, "product.json")))
    .map((entry) => JSON.parse(fs.readFileSync(path.join(PRINT_FILES_DIR, entry.name, "product.json"), "utf8")) as {
      handle: string;
      title: string;
      url: string;
      blank: { name: string };
      print: { inches: number; dpi: number };
      colors: Array<{ color: string }>;
    })
    .sort((a, b) => a.title.localeCompare(b.title));
  const lines = [
    "# A-OK print files",
    "",
    "Print-ready files for every product on the A-OK shop, written by `chaos sell` (scripts/chaos-monkeys in a-ok-shop). Each folder has the Printful print files at full size, the art, the original draft, `PRINTFUL.md` (which file goes with which colour), and `product.json` (Printful variant ids by colour and size).",
    "",
    "| Product | Blank | Print | Colours |",
    "|---|---|---|---|",
    ...products.map((p) => `| [${p.title}](${p.handle}/) ([shop](${p.url})) | ${p.blank.name} | ${p.print.inches} in, ${p.print.dpi} DPI | ${p.colors.map((c) => c.color).join(", ")} |`),
    "",
  ];
  fs.writeFileSync(path.join(PRINT_FILES_DIR, "README.md"), lines.join("\n"));
}
