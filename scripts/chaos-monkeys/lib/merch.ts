/**
 * Merch: a kept draft becomes a tee, a hoodie, or both. Print files follow Printful's DTG guidelines (PNG, sRGB, a
 * transparent background, a 300 DPI canvas the size of the print area, and at least 150 DPI of real detail at print
 * size); mockups put each colour on a model; products go to Stripe and to the site's catalog.
 */
import fs from "node:fs";
import path from "node:path";
import { MERCH_DIR } from "./config.ts";

export type GarmentKind = "tee" | "hoodie";
export const GARMENT_KINDS: GarmentKind[] = ["tee", "hoodie"];

/** The shop's names for the seven colours every design comes in. */
export const SHOP_COLORS = ["Red", "Yellow", "Blue", "Green", "Black", "White", "Navy"] as const;
export type ShopColor = (typeof SHOP_COLORS)[number];

/** Same list as app/lib/sizes.ts: the product page offers these for every tee and hoodie. */
export const SIZES = ["XS", "S", "M", "L", "XL", "2XL"];

export const PRINT_DPI = 300;
/** Printful's floor for DTG: below this the print looks soft. */
export const MIN_DPI = 150;

export type Blank = {
  kind: GarmentKind;
  /** The Printful product and its exact name, for ordering. */
  printful: number;
  name: string;
  productType: "T-Shirts" | "Hoodies";
  price: number;
  /** Printful's front print area in inches; the print file is this size at 300 DPI. */
  area: { width: number; height: number };
  /** The widest the art should print, in inches, when its resolution allows. */
  maxWidth: number;
  /** Shop colour → Printful colour name on this blank. */
  colors: Record<ShopColor, string>;
};

export const BLANKS: Record<GarmentKind, Blank> = {
  tee: {
    kind: "tee",
    printful: 71,
    name: "Bella + Canvas 3001 Unisex Staple T-Shirt",
    productType: "T-Shirts",
    price: 30,
    area: { width: 15, height: 18 },
    maxWidth: 11,
    colors: { Red: "Red", Yellow: "Yellow", Blue: "True Royal", Green: "Kelly", Black: "Black", White: "White", Navy: "Navy" },
  },
  hoodie: {
    kind: "hoodie",
    printful: 146,
    name: "Gildan 18500 Unisex Heavy Blend Hoodie",
    productType: "Hoodies",
    price: 60,
    // The pouch pocket caps the height.
    area: { width: 13, height: 13 },
    maxWidth: 10,
    colors: { Red: "Red", Yellow: "Gold", Blue: "Royal", Green: "Irish Green", Black: "Black", White: "White", Navy: "Navy" },
  },
};

/**
 * All-over prints: Printful's direct-to-fabric garments, printed edge to edge on every panel, in one colourway (the
 * pattern). The print file is a seamless tile that Printful's design maker repeats across the panels, plus the same
 * tile pre-repeated into a large fabric swatch for placing panel by panel.
 */
export type AllOverBlank = { kind: GarmentKind; printful: number; name: string; productType: "T-Shirts" | "Hoodies"; price: number; panels: string[] };

export const ALL_OVER_BLANKS: Record<GarmentKind, AllOverBlank> = {
  tee: { kind: "tee", printful: 1414, name: "All-Over Print Men's Cotton Crew Neck T-Shirt", productType: "T-Shirts", price: 45, panels: ["front", "back", "left sleeve", "right sleeve"] },
  hoodie: {
    kind: "hoodie",
    printful: 1419,
    name: "All-Over Print Unisex Cotton Hoodie",
    productType: "Hoodies",
    price: 90,
    panels: ["front", "back", "left sleeve", "right sleeve", "hood", "pocket"],
  },
};

/** The single colour option an all-over product has. */
export const ALL_OVER_COLOR = "All-over";

/** The repeat: an 18-inch tile of 4 × 4 cells at Printful's 150 DPI for direct-to-fabric, and a 36 × 40 in swatch. */
export const TILE = { inches: 18, cells: 4, dpi: 150, fabric: { width: 36, height: 40 } };

export type AllOverPhoto = { view: "front" | "back"; image: string | null; web: string | null; score: number | null; note: string };

export type AllOverProduct = {
  garment: GarmentKind;
  /** The seamless tile and the pre-repeated swatch, relative to the merch folder. */
  tile: string;
  fabric: string;
  /** The pattern's ground colour, for the swatch. */
  ground: string;
  photos: AllOverPhoto[];
  copy: ProductCopy | null;
  sold: { handle: string; stripeProductId: string | null; sha: string | null; at: string } | null;
};

/** Printful variant ids for an all-over blank, by size (it comes in one base colour). */
export async function printfulAllOver(blank: AllOverBlank): Promise<(size: string) => number | null> {
  const response = await fetch(`https://api.printful.com/products/${blank.printful}`, { signal: AbortSignal.timeout(30_000) });
  if (!response.ok) throw new Error(`Printful catalog: HTTP ${response.status}`);
  const { result } = (await response.json()) as { result: { variants: Array<{ id: number; size: string }> } };
  return (size) => result.variants.find((v) => v.size === size)?.id ?? null;
}

/** A different model for each colour, so a product's photos don't look like one shoot repeated. */
export const MODELS: Record<ShopColor, string> = {
  Red: "a woman in her late twenties with short natural curls",
  Yellow: "a man in his thirties with a close-cropped beard and glasses",
  Blue: "a woman in her forties with straight shoulder-length dark hair",
  Green: "a man in his twenties with a shaved head",
  Black: "a woman in her thirties with long braids",
  White: "a man in his fifties with grey hair and light stubble",
  Navy: "a person in their twenties with a short bleached crop",
};

/**
 * Whether a colour prints the light-ink art instead of the original, given the share of each version's inked area
 * that would be hard to see on that fabric (under 3:1 contrast, measured by the renderer). Light ink wins only by
 * a clear margin, so a colour where both read keeps the original.
 */
export function prefersLightInk(weakOriginal: number, weakLight: number): boolean {
  return weakLight < weakOriginal - 0.03;
}

/**
 * Whether a fabric is close enough to a house poster's ground to stand in for it. Removing the ground also removes
 * anything drawn in the same colour (the ink poster's ground is the ape's black fur), so such a print only comes out
 * right on fabric of about that colour.
 */
export function matchesGround(swatch: string, ground: string): boolean {
  return [1, 3, 5].every((i) => Math.abs(parseInt(swatch.slice(i, i + 2), 16) - parseInt(ground.slice(i, i + 2), 16)) <= 48);
}

/** A colour where more of the print than this would be hard to see, whichever version it uses, isn't offered. */
export const MAX_HARD_TO_SEE = 0.45;

/** How wide the art prints and at what resolution: as wide as the blank allows without dropping below 150 DPI. */
export function printSize(blank: Blank, artPixels: number): { inches: number; dpi: number } {
  const inches = Math.floor(Math.min(blank.maxWidth, artPixels / MIN_DPI) * 10) / 10;
  return { inches, dpi: Math.round(artPixels / inches) };
}

/** Swatch colours and variant ids for a blank, from Printful's public catalog API. */
export async function printfulCatalog(blank: Blank): Promise<{ swatch: Record<ShopColor, string>; variant: (color: ShopColor, size: string) => number | null }> {
  const response = await fetch(`https://api.printful.com/products/${blank.printful}`, { signal: AbortSignal.timeout(30_000) });
  if (!response.ok) throw new Error(`Printful catalog: HTTP ${response.status}`);
  const { result } = (await response.json()) as { result: { variants: Array<{ id: number; color: string; color_code: string; size: string }> } };
  const swatch = {} as Record<ShopColor, string>;
  for (const color of SHOP_COLORS) {
    const match = result.variants.find((v) => v.color === blank.colors[color]);
    if (!match) throw new Error(`Printful no longer offers ${blank.colors[color]} for ${blank.name}`);
    swatch[color] = match.color_code.toLowerCase();
  }
  return {
    swatch,
    variant: (color, size) => result.variants.find((v) => v.color === blank.colors[color] && v.size === size)?.id ?? null,
  };
}

/* ------------------------------------------------------------------ the merch folder */

export type ProductCopy = {
  title: string;
  handle: string;
  description: string;
  descriptionHtml: string;
  tags: string[];
  seo: { title: string; description: string };
};

export type Mockup = {
  color: ShopColor;
  /** The artwork it was photographed with: art.png, or art-light.png on dark garments. */
  art?: string;
  /** Paths relative to the merch folder: Astra's photo, and the WebP the site serves. */
  image: string | null;
  web: string | null;
  /** The judge's check that the print survived: the art, the face, the colours, the words. */
  score: number | null;
  note: string;
};

export type MerchProduct = {
  garment: GarmentKind;
  /** For light garments; `printFileLight` (light ink) is for the colours in `lightInk`. */
  printFile: string;
  printFileLight?: string | null;
  lightInk?: ShopColor[];
  /** The colours this product comes in: every shop colour the print reads on. */
  colors?: ShopColor[];
  inches: number;
  dpi: number;
  /** Whether the print files were made from art enlarged by Real-ESRGAN (lib/upscale.ts). */
  upscaled?: boolean;
  mockups: Mockup[];
  copy: ProductCopy | null;
  sold: { handle: string; stripeProductId: string | null; sha: string | null; at: string } | null;
};

/** One draft on its way to the shop: ~/.a-ok-chaos/merch/<run>-<n>/merch.json. */
export type Merch = {
  id: string;
  run: string;
  n: number;
  title: string;
  art: string;
  artWidth: number;
  /** The art re-inked for dark garments, and the check that it is still the same art. */
  artLight?: string | null;
  artLightCheck?: { score: number; note: string } | null;
  products: MerchProduct[];
  /** All-over versions, for drafts whose placement is all-over. */
  allOver?: AllOverProduct[];
};

export const merchDir = (id: string): string => path.join(MERCH_DIR, id);

export function loadMerch(id: string): Merch {
  const file = path.join(merchDir(id), "merch.json");
  if (!fs.existsSync(file)) throw new Error(`no merch for ${id}; run: chaos print`);
  return JSON.parse(fs.readFileSync(file, "utf8")) as Merch;
}

export function saveMerch(merch: Merch): void {
  fs.mkdirSync(merchDir(merch.id), { recursive: true });
  fs.writeFileSync(path.join(merchDir(merch.id), "merch.json"), `${JSON.stringify(merch, null, 2)}\n`);
}

/** How to order it from Printful by hand: the blank, the print size, and which print file goes with which colours. */
export function printfulNotes(merch: Merch, name: (file: string) => string = (file) => file): string {
  const lines = [`# ${merch.title}: Printful`, "", `From Chaos Monkeys ${merch.run}, draft ${merch.n}.`, ""];
  for (const p of merch.allOver ?? []) {
    const blank = ALL_OVER_BLANKS[p.garment];
    lines.push(
      `## ${p.copy?.title ?? `All-over ${p.garment}`}`,
      "",
      `- Blank: ${blank.name} (Printful product ${blank.printful}), one colourway.`,
      `- Print: all-over, on every panel (${blank.panels.join(", ")}). In Printful's design maker, upload \`${name(p.tile)}\` (a seamless ${TILE.inches} in repeat at ${TILE.dpi} DPI) and repeat it as a pattern across each panel at ${TILE.inches} in per repeat. Or place \`${name(p.fabric)}\` (${TILE.fabric.width} × ${TILE.fabric.height} in at ${TILE.dpi} DPI, already repeated) on each panel.`,
      "- Each catalog variant's SKU is `printful-<variant id>`.",
      "",
    );
  }
  for (const p of merch.products) {
    const blank = BLANKS[p.garment];
    const dark = new Set(p.lightInk ?? []);
    const offered = p.colors ?? [...SHOP_COLORS];
    lines.push(`## ${p.copy?.title ?? p.garment}`, "", `- Blank: ${blank.name} (Printful product ${blank.printful})`, "- Front print, centred, 1 in below the top of the print area.", `- Print: ${p.inches} in wide, ${p.dpi} DPI${p.upscaled ? " (art enlarged 4× by Real-ESRGAN)" : " of real detail"}, on a ${blank.area.width} × ${blank.area.height} in file at ${PRINT_DPI} DPI`);
    const original = offered.filter((c) => !dark.has(c));
    if (original.length) lines.push(`- \`${name(p.printFile)}\`: ${original.map((c) => `${c} (${blank.colors[c]})`).join(", ")}`);
    const light = offered.filter((c) => dark.has(c));
    if (p.printFileLight && light.length) lines.push(`- \`${name(p.printFileLight)}\` (light ink): ${light.map((c) => `${c} (${blank.colors[c]})`).join(", ")}`);
    lines.push("- Each catalog variant's SKU is `printful-<variant id>`; the Stripe price for it names its print file.", "");
  }
  return lines.join("\n");
}

/* ------------------------------------------------------------------ the site's catalog */

type Money = { amount: string; currencyCode: string };
type Edge<T> = { node: T };
export type CatalogVariant = {
  id: string;
  title: string;
  sku: string;
  stripePriceId?: string;
  price: Money;
  compareAtPrice: null;
  availableForSale: boolean;
  selectedOptions: Array<{ name: string; value: string }>;
};
export type CatalogNode = {
  id: string;
  handle: string;
  title: string;
  description: string;
  descriptionHtml: string;
  productType: string;
  vendor: string;
  tags: string[];
  stripeProductId?: string;
  seo: { title: string; description: string };
  swatches: Record<string, string>;
  priceRange: { minVariantPrice: Money; maxVariantPrice: Money };
  compareAtPriceRange: { minVariantPrice: Money; maxVariantPrice: Money };
  images: { edges: Array<Edge<{ id: string; url: string; altText: string; width: number; height: number; color: string }>> };
  variants: { edges: Array<Edge<CatalogVariant>> };
  options: Array<{ id: string; name: string; values: string[] }>;
  collections: { edges: [] };
  onlineStoreUrl: string;
  availableForSale: boolean;
  createdAt: string;
  updatedAt: string;
  publishedAt: string;
};
export type Catalog = { products: { edges: Array<Edge<CatalogNode>> } };

/** Hands out ids that follow the catalog's existing ones, kind by kind (Product, ProductVariant, …). */
export function idAllocator(catalog: Catalog): (kind: string) => string {
  const text = JSON.stringify(catalog);
  const next = new Map<string, number>();
  return (kind) => {
    if (!next.has(kind)) {
      const used = [...text.matchAll(new RegExp(`gid://a-ok/${kind}/(\\d+)`, "g"))].map((m) => Number(m[1]));
      next.set(kind, Math.max(0, ...used) + 1);
    }
    const n = next.get(kind) as number;
    next.set(kind, n + 1);
    return `gid://a-ok/${kind}/${n}`;
  };
}

/** The catalog entry for one product: seven colours, the shop's sizes, a model photo per colour. */
export function catalogNode(options: {
  newId: (kind: string) => string;
  blank: { productType: string; price: number };
  copy: ProductCopy;
  images: Array<{ color: string; url: string; width: number; height: number; alt?: string }>;
  swatch: Record<string, string>;
  variant: (color: string, size: string) => number | null;
  now: string;
}): CatalogNode {
  const { blank, copy, now } = options;
  const money = (amount: number): Money => ({ amount: amount.toFixed(1), currencyCode: "USD" });
  const zero = { minVariantPrice: money(0), maxVariantPrice: money(0) };
  const colors = [...new Set(options.images.map((image) => image.color))];
  return {
    id: options.newId("Product"),
    handle: copy.handle,
    title: copy.title,
    description: copy.description,
    descriptionHtml: copy.descriptionHtml,
    productType: blank.productType,
    vendor: "A-OK Shop",
    tags: copy.tags,
    seo: copy.seo,
    swatches: Object.fromEntries(colors.map((color) => [color, options.swatch[color]])),
    priceRange: { minVariantPrice: money(blank.price), maxVariantPrice: money(blank.price) },
    compareAtPriceRange: zero,
    images: {
      edges: options.images.map((image) => ({
        node: {
          id: options.newId("ProductImage"),
          url: image.url,
          altText: image.alt ?? `${image.color} ${copy.title}, worn by a model`,
          width: image.width,
          height: image.height,
          color: image.color,
        },
      })),
    },
    variants: {
      edges: colors.flatMap((color) =>
        SIZES.map((size) => {
          const printful = options.variant(color, size);
          return {
            node: {
              id: options.newId("ProductVariant"),
              title: `${color} / ${size}`,
              // The Printful variant to order; empty where the blank doesn't come in that size.
              sku: printful ? `printful-${printful}` : "",
              price: money(blank.price),
              compareAtPrice: null,
              availableForSale: true,
              selectedOptions: [
                { name: "Color", value: color },
                { name: "Size", value: size },
              ],
            },
          };
        }),
      ),
    },
    options: [
      { id: options.newId("ProductOption"), name: "Color", values: colors },
      { id: options.newId("ProductOption"), name: "Size", values: SIZES },
    ],
    collections: { edges: [] },
    onlineStoreUrl: "",
    availableForSale: true,
    createdAt: now,
    updatedAt: now,
    publishedAt: now,
  };
}

/* ------------------------------------------------------------------ Stripe */

async function stripePost(key: string, endpoint: string, params: Array<[string, string]>, idempotencyKey: string): Promise<{ id: string }> {
  const response = await fetch(`https://api.stripe.com/v1/${endpoint}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/x-www-form-urlencoded",
      // A retried run reuses the same keys, so it never creates a product or price twice.
      "Idempotency-Key": idempotencyKey,
    },
    body: new URLSearchParams(params),
    signal: AbortSignal.timeout(30_000),
  });
  const body = (await response.json()) as { id: string; error?: { message?: string } };
  if (!response.ok) throw new Error(`Stripe ${endpoint}: ${body.error?.message ?? `HTTP ${response.status}`}`);
  return body;
}

/**
 * Creates the Stripe product and one price per variant, the same shape scripts/sync-stripe-products.js makes, and
 * writes their ids into `node`. Checkout prices from the catalog either way; these keep Stripe's catalog complete.
 */
export async function addToStripe(key: string, node: CatalogNode, siteUrl: string, printFileFor: (color: string) => string): Promise<void> {
  const product = await stripePost(
    key,
    "products",
    [
      ["name", node.title],
      ["description", node.description.slice(0, 500)],
      ["images[0]", `${siteUrl}${node.images.edges[0].node.url}`],
      ["metadata[handle]", node.handle],
      ["metadata[productType]", node.productType],
      ["metadata[vendor]", node.vendor],
      ["metadata[sizes]", SIZES.join(",")],
    ],
    `${node.id}-product`,
  );
  node.stripeProductId = product.id;
  for (const { node: variant } of node.variants.edges) {
    const price = await stripePost(
      key,
      "prices",
      [
        ["product", product.id],
        ["unit_amount", String(Math.round(Number(variant.price.amount) * 100))],
        ["currency", "usd"],
        ["metadata[variantId]", variant.id],
        ["metadata[variantTitle]", variant.title],
        ["metadata[sku]", variant.sku],
        ["metadata[options]", JSON.stringify(variant.selectedOptions)],
        // Which print file to send Printful for this colour.
        ["metadata[printFile]", printFileFor(variant.selectedOptions.find((o) => o.name === "Color")?.value ?? "")],
      ],
      `${variant.id}-price`,
    );
    variant.stripePriceId = price.id;
  }
}
