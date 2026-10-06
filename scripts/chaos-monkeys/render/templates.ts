/*
 * House templates for the Chaos Monkeys, drawn on a canvas in headless Chrome.
 * Served to the page with its types stripped (see lib/renderer.ts), so it uses erasable TypeScript only.
 *
 *   specimen: the title in giant condensed type behind the ape, the slogan in a bar along the bottom.
 *             (Most styles are drawn whole by Astra; see STYLES.md. These two templates are the house styles.)
 *   form:     the ape as a die-cut sticker on an official form, the title as a rubber stamp.
 *   image:    re-encodes a finished poster at the publishing size.
 *   sheet:    the contact sheet a person picks from.
 *   keyed:    a draft with its flat background removed and trimmed to the art: the print artwork.
 *   printfile: that artwork on a transparent 300 DPI canvas the size of Printful's print area.
 *   cover:    a photo cropped to fill a frame, for the shop's product images.
 */

type Colorway = "cream" | "red" | "ink";
type FormBlock = { heading: string; rows: Array<{ label: string; value: string }> };
type Format = "png" | "webp";
type ArtSpec = {
  kind: "specimen" | "form";
  size: number;
  format: Format;
  quality?: number;
  title: string;
  slogan: string;
  /** "DRAFT 3" while drafting, "Nº 0001" when published. */
  label: string;
  date: string;
  colorway: Colorway;
  form: FormBlock | null;
  /** URL of the transparent cutout, or of the round badge when Astra was unavailable. */
  art: string;
  artIsBadge: boolean;
};
type ImageSpec = { kind: "image"; size: number; format: Format; quality?: number; image: string };
type SheetItem = {
  n: number;
  image: string | null;
  title: string;
  engine: string;
  score: number | null;
  note: string;
  flags: string[];
  topical: boolean;
};
/** `heading` and `hint` replace the drafts sheet's title and instructions, e.g. for a merch sheet. */
type SheetSpec = { kind: "sheet"; date: string; topic: string | null; items: SheetItem[]; heading?: string; hint?: string };
type KeyedSpec = { kind: "keyed"; image: string };
/** All sizes in pixels at 300 DPI: the canvas is the print area, the art is `artWidth` wide, `top` below its top edge. */
type PrintFileSpec = { kind: "printfile"; image: string; width: number; height: number; artWidth: number; top: number };
type CoverSpec = { kind: "cover"; image: string; width: number; height: number; format: Format; quality?: number; focusY?: number };
type Spec = ArtSpec | ImageSpec | SheetSpec | KeyedSpec | PrintFileSpec | CoverSpec;

const C = {
  red: "#C8161D",
  ink: "#0B0B0C",
  inkSoft: "#141315",
  cream: "#F1E8D6",
  paper: "#F4EDDD",
  dark: "#7D1510",
  grey: "#6E6458",
  pencil: "#3C3A38",
  blue: "#223A78",
};

/* ------------------------------------------------------------------ helpers */

function makeCanvas(width: number, height: number = width): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = width;
  c.height = height;
  return c;
}

function context(c: HTMLCanvasElement): CanvasRenderingContext2D {
  const ctx = c.getContext("2d");
  if (!ctx) throw new Error("no 2d context");
  return ctx;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`could not load ${src}`));
    img.src = src;
  });
}

function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}

function paperTexture(ctx: CanvasRenderingContext2D, size: number, base: string, seed: number): void {
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, size, size);
  const r = rng(seed);
  ctx.save();
  ctx.globalAlpha = 0.05;
  for (let i = 0; i < 2000; i++) {
    ctx.fillStyle = r() < 0.5 ? "#6b5a3c" : "#ffffff";
    ctx.fillRect(r() * size, r() * size, 1 + r() * 2, 1 + r() * 6);
  }
  ctx.restore();
}

function grain(ctx: CanvasRenderingContext2D, size: number, seed: number, alpha: number): void {
  const tile = makeCanvas(256);
  const t = context(tile);
  const data = t.createImageData(256, 256);
  const r = rng(seed);
  for (let i = 0; i < data.data.length; i += 4) {
    const v = 128 + (r() + r() - 1) * 110;
    data.data[i] = data.data[i + 1] = data.data[i + 2] = v;
    data.data[i + 3] = 255;
  }
  t.putImageData(data, 0, 0);
  ctx.save();
  ctx.globalCompositeOperation = "overlay";
  ctx.globalAlpha = alpha;
  for (let y = 0; y < size; y += 256) for (let x = 0; x < size; x += 256) ctx.drawImage(tile, x, y);
  ctx.restore();
}

/** Specks where the ink did not take, like a real screen print. */
function inkWear(ctx: CanvasRenderingContext2D, size: number, seed: number, amount: number): void {
  const r = rng(seed);
  ctx.save();
  for (let i = 0; i < 1400 * amount; i++) {
    ctx.globalAlpha = 0.2 + r() * 0.45;
    ctx.fillStyle = C.cream;
    const s = 0.6 + r() * 1.6;
    ctx.fillRect(r() * size, r() * size, s, s);
  }
  ctx.restore();
}

function halftone(ctx: CanvasRenderingContext2D, x0: number, y0: number, w: number, h: number, color: string, step: number, radius: number, alpha: number): void {
  ctx.save();
  ctx.fillStyle = color;
  ctx.globalAlpha = alpha;
  for (let y = y0; y < y0 + h; y += step) {
    const offset = Math.round((y - y0) / step) % 2 ? step / 2 : 0;
    for (let x = x0 + offset; x < x0 + w; x += step) {
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

/** The largest size, up to `max`, at which `text` fits in `width`. */
function fitSize(ctx: CanvasRenderingContext2D, text: string, font: (size: number) => string, width: number, max: number): number {
  ctx.font = font(100);
  const measured = ctx.measureText(text).width;
  return Math.min(max, (100 * width) / Math.max(1, measured));
}

/** One line for short titles, two balanced lines for longer ones. */
function splitTitle(title: string): string[] {
  const words = title.split(" ");
  if (title.length <= 11 || words.length < 2) return [title];
  let best: string[] = [title];
  let bestDiff = Infinity;
  for (let i = 1; i < words.length; i++) {
    const a = words.slice(0, i).join(" ");
    const b = words.slice(i).join(" ");
    const diff = Math.abs(a.length - b.length);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = [a, b];
    }
  }
  return best;
}

function wrap(ctx: CanvasRenderingContext2D, text: string, width: number, maxLines: number): string[] {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/)) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width > width && line) {
      lines.push(line);
      line = word;
    } else line = next;
  }
  if (line) lines.push(line);
  if (lines.length > maxLines) {
    lines.length = maxLines;
    lines[maxLines - 1] = `${lines[maxLines - 1].replace(/\s+\S*$/, "")}…`;
  }
  return lines;
}

/** Snaps the image model's near-opaque alpha to solid, drops stray haze, and trims to the figure. */
function prepareArt(img: HTMLImageElement | HTMLCanvasElement): HTMLCanvasElement {
  const c = img instanceof HTMLImageElement ? makeCanvas(img.naturalWidth, img.naturalHeight) : makeCanvas(img.width, img.height);
  const ctx = context(c);
  ctx.drawImage(img, 0, 0);
  const data = ctx.getImageData(0, 0, c.width, c.height);
  const p = data.data;
  let x0 = c.width;
  let y0 = c.height;
  let x1 = 0;
  let y1 = 0;
  for (let i = 0; i < p.length; i += 4) {
    const a = p[i + 3];
    p[i + 3] = a >= 245 ? 255 : a < 8 ? 0 : a;
    if (p[i + 3] > 24) {
      const x = (i / 4) % c.width;
      const y = Math.floor(i / 4 / c.width);
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
  }
  ctx.putImageData(data, 0, 0);
  if (x1 <= x0 || y1 <= y0) return c;
  const out = makeCanvas(x1 - x0 + 1, y1 - y0 + 1);
  context(out).drawImage(c, x0, y0, out.width, out.height, 0, 0, out.width, out.height);
  return out;
}

/** The round A-OK badge, cut out of its square photo. Used when Astra is unavailable. */
function badgeArt(img: HTMLImageElement): HTMLCanvasElement {
  const size = Math.min(img.naturalWidth, img.naturalHeight);
  const c = makeCanvas(size);
  const ctx = context(c);
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2 - 2, 0, Math.PI * 2);
  ctx.clip();
  ctx.drawImage(img, (img.naturalWidth - size) / 2, (img.naturalHeight - size) / 2, size, size, 0, 0, size, size);
  return c;
}

/** A white die-cut border around the figure's silhouette, like a vinyl sticker. */
function dieCut(art: HTMLCanvasElement, border: number): HTMLCanvasElement {
  const pad = border + 4;
  const out = makeCanvas(art.width + pad * 2, art.height + pad * 2);
  const ctx = context(out);
  const silhouette = makeCanvas(out.width, out.height);
  const s = context(silhouette);
  s.drawImage(art, pad, pad);
  s.globalCompositeOperation = "source-in";
  s.fillStyle = "#FFFDF7";
  s.fillRect(0, 0, out.width, out.height);
  for (let k = 0; k < 24; k++) {
    const angle = (k / 24) * Math.PI * 2;
    ctx.drawImage(silhouette, Math.cos(angle) * border, Math.sin(angle) * border);
  }
  ctx.drawImage(silhouette, 0, 0);
  ctx.drawImage(art, pad, pad);
  return out;
}

function encode(c: HTMLCanvasElement, format: Format, quality: number | undefined): string {
  return c.toDataURL(`image/${format}`, quality ?? 0.88);
}

/* ------------------------------------------------------------------ specimen */

async function specimen(spec: ArtSpec): Promise<HTMLCanvasElement> {
  const S = spec.size;
  const k = S / 1200;
  const M = 60 * k;
  const c = makeCanvas(S);
  const ctx = context(c);
  const seed = hash(spec.title);
  const scheme = {
    cream: { bg: C.cream, title: C.red, text: C.ink, bar: C.ink, barText: C.cream, disc: null as string | null },
    red: { bg: C.red, title: C.cream, text: C.cream, bar: C.ink, barText: C.cream, disc: C.cream as string | null },
    ink: { bg: C.inkSoft, title: C.red, text: C.cream, bar: C.red, barText: C.cream, disc: C.cream as string | null },
  }[spec.colorway];

  paperTexture(ctx, S, scheme.bg, seed);
  if (spec.colorway === "red") halftone(ctx, 0, 0, S, S, C.dark, 14 * k, 2.4 * k, 0.35);

  // label rail
  ctx.fillStyle = scheme.text;
  ctx.textBaseline = "alphabetic";
  ctx.font = `700 ${24 * k}px Mono`;
  ctx.fillText(spec.label, M, 80 * k);
  const labelWidth = ctx.measureText(spec.label).width;
  ctx.font = `500 ${20 * k}px Mono`;
  ctx.fillText(`CHAOS MONKEYS · ${spec.date}`, M + labelWidth + 22 * k, 80 * k);
  ctx.textAlign = "right";
  ctx.fillText("APES ON KEYS", S - M, 80 * k);
  ctx.textAlign = "left";
  ctx.fillRect(M, 100 * k, S - 2 * M, 4 * k);

  // title block, sized to leave the ape at least ~half the poster
  const lines = splitTitle(spec.title);
  const bebas = (size: number) => `${size}px Bebas`;
  const heightCap = ((lines.length === 1 ? 0.42 : 0.48) * S - 132 * k) / (0.56 + 0.84 * (lines.length - 1));
  const size = Math.min(heightCap, ...lines.map((line) => fitSize(ctx, line, bebas, S - 96 * k, 540 * k)));
  const baselines = lines.map((_, i) => 132 * k + 0.72 * size + i * 0.84 * size);
  const lastBaseline = baselines[baselines.length - 1];
  ctx.font = bebas(size);
  ctx.textAlign = "center";
  lines.forEach((line, i) => {
    if (spec.colorway === "red") {
      ctx.fillStyle = C.ink;
      ctx.fillText(line, S / 2 + 7 * k, baselines[i] + 7 * k);
    }
    ctx.fillStyle = scheme.title;
    ctx.fillText(line, S / 2, baselines[i]);
  });
  ctx.textAlign = "left";
  if (spec.colorway === "cream") halftone(ctx, 0, 132 * k, S, lastBaseline - 132 * k, C.dark, 12 * k, 2.2 * k, 0.16);

  // the ape, bottom-aligned above the slogan bar, overlapping the bottom of the title
  const barTop = S - 122 * k;
  const img = await loadImage(spec.art);
  const art = spec.artIsBadge ? badgeArt(img) : prepareArt(img);
  // A shallow overlap keeps the depth without hiding letters (the cap would otherwise swallow an I or an L).
  const artTop = lastBaseline - (lines.length === 1 ? 0.06 : 0.09) * size;
  const maxH = barTop - 18 * k - artTop;
  const maxW = S - 2 * M;
  const scale = Math.min(maxH / art.height, maxW / art.width);
  const w = art.width * scale;
  const h = art.height * scale;
  const x = (S - w) / 2;
  const y = barTop - 18 * k - h;

  if (scheme.disc && !spec.artIsBadge) {
    // A disc behind the figure for contrast, kept below the title so it never covers a letter.
    const centerY = y + h * 0.55;
    const radius = Math.min(Math.min(w, h) * 0.47, centerY - lastBaseline - 10 * k);
    ctx.fillStyle = scheme.disc;
    ctx.beginPath();
    ctx.arc(S / 2, centerY, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 8 * k;
    ctx.strokeStyle = C.ink;
    ctx.stroke();
  }
  if (spec.colorway === "cream") {
    // the figure throws a soft shadow onto the lettering behind it
    const shadow = makeCanvas(S);
    const sh = context(shadow);
    sh.filter = `blur(${14 * k}px)`;
    sh.drawImage(art, x + 30 * k, y + 16 * k, w, h);
    sh.filter = "none";
    sh.globalCompositeOperation = "source-in";
    sh.fillStyle = "rgba(60,20,10,.32)";
    sh.fillRect(0, 0, S, S);
    ctx.drawImage(shadow, 0, 0);
  }
  ctx.drawImage(art, x, y, w, h);

  // slogan bar
  ctx.fillStyle = scheme.bar;
  ctx.fillRect(0, barTop, S, S - barTop);
  const sloganSize = fitSize(ctx, spec.slogan, (s) => `${s}px ArialBlack`, S - 2 * M, 50 * k);
  ctx.font = `${sloganSize}px ArialBlack`;
  ctx.fillStyle = scheme.barText;
  ctx.textAlign = "center";
  ctx.fillText(spec.slogan, S / 2, barTop + 61 * k + sloganSize * 0.36);
  ctx.textAlign = "left";

  inkWear(ctx, S, seed + 1, spec.colorway === "cream" ? 0.6 : 0.35);
  grain(ctx, S, seed + 2, 0.06);
  return c;
}

/* ------------------------------------------------------------------ form */

function stamp(title: string, k: number): HTMLCanvasElement {
  const lines = splitTitle(title);
  const width = 470 * k;
  const c = makeCanvas(Math.ceil(width + 60 * k), Math.ceil((lines.length === 1 ? 170 : 250) * k));
  const ctx = context(c);
  const size = Math.min(...lines.map((line) => fitSize(ctx, line, (s) => `${s}px ArialBlack`, width - 60 * k, 92 * k)));
  ctx.strokeStyle = C.red;
  ctx.lineWidth = 11 * k;
  ctx.beginPath();
  ctx.roundRect(15 * k, 15 * k, c.width - 30 * k, c.height - 30 * k, 18 * k);
  ctx.stroke();
  ctx.lineWidth = 4 * k;
  ctx.beginPath();
  ctx.roundRect(33 * k, 33 * k, c.width - 66 * k, c.height - 66 * k, 10 * k);
  ctx.stroke();
  ctx.fillStyle = C.red;
  ctx.font = `${size}px ArialBlack`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const gap = size * 1.02;
  lines.forEach((line, i) => ctx.fillText(line, c.width / 2, c.height / 2 + (i - (lines.length - 1) / 2) * gap + size * 0.04));
  // uneven pressure and missing ink
  const r = rng(hash(title) + 7);
  ctx.globalCompositeOperation = "destination-out";
  for (let i = 0; i < 2600; i++) {
    ctx.globalAlpha = 0.15 + r() * 0.6;
    ctx.beginPath();
    ctx.arc(r() * c.width, r() * c.height, (0.6 + r() * 2.8) * k, 0, Math.PI * 2);
    ctx.fill();
  }
  return c;
}

async function form(spec: ArtSpec): Promise<HTMLCanvasElement> {
  const S = spec.size;
  const k = S / 1200;
  const M = 64 * k;
  const c = makeCanvas(S);
  const ctx = context(c);
  const seed = hash(spec.title);
  paperTexture(ctx, S, C.paper, seed);

  ctx.strokeStyle = "rgba(80,110,160,.16)";
  ctx.lineWidth = 2 * k;
  for (let y = 222 * k; y < S - 130 * k; y += 50 * k) {
    ctx.beginPath();
    ctx.moveTo(M, y);
    ctx.lineTo(S - M, y);
    ctx.stroke();
  }

  const number = spec.label.replace(/^\D+/, "");
  ctx.fillStyle = C.ink;
  ctx.font = `700 ${30 * k}px Mono`;
  ctx.fillText(`FORM A-OK/${number}`, M, 92 * k);
  ctx.font = `500 ${22 * k}px Mono`;
  ctx.fillText(spec.form?.heading ?? "SPECIMEN REPORT", M, 130 * k);
  ctx.fillRect(M, 150 * k, S - 2 * M, 4 * k);

  ctx.font = `500 ${25 * k}px Mono`;
  (spec.form?.rows ?? []).forEach((row, i) => {
    const y = 212 * k + i * 50 * k;
    ctx.fillStyle = C.pencil;
    ctx.fillText(row.label, M, y);
    const labelEnd = M + ctx.measureText(`${row.label} `).width;
    ctx.textAlign = "right";
    ctx.fillStyle = C.ink;
    ctx.fillText(row.value, S - M, y);
    const valueStart = S - M - ctx.measureText(` ${row.value}`).width;
    ctx.textAlign = "left";
    ctx.fillStyle = C.pencil;
    const dot = ctx.measureText(".").width;
    let leader = "";
    while (ctx.measureText(`${leader}.`).width < valueStart - labelEnd - dot) leader += ".";
    ctx.fillText(leader, labelEnd, y);
  });

  // the ape as a die-cut sticker
  const img = await loadImage(spec.art);
  const art = spec.artIsBadge ? badgeArt(img) : prepareArt(img);
  const sticker = spec.artIsBadge ? art : dieCut(art, Math.round(art.width * 0.018) + 6);
  const box = 560 * k;
  const scale = Math.min(box / sticker.width, box / sticker.height);
  ctx.save();
  ctx.translate(360 * k, 790 * k);
  ctx.rotate(-0.07);
  ctx.shadowColor = "rgba(40,25,10,.35)";
  ctx.shadowBlur = 26 * k;
  ctx.shadowOffsetY = 12 * k;
  ctx.drawImage(sticker, (-sticker.width * scale) / 2, (-sticker.height * scale) / 2, sticker.width * scale, sticker.height * scale);
  ctx.restore();

  // the title, stamped in red
  const mark = stamp(spec.title, k);
  ctx.save();
  ctx.globalCompositeOperation = "multiply";
  ctx.globalAlpha = 0.92;
  ctx.translate(868 * k, 700 * k);
  ctx.rotate(-0.12);
  ctx.drawImage(mark, -mark.width / 2, -mark.height / 2);
  ctx.restore();

  // the inspector's signature
  const r = rng(seed + 3);
  ctx.save();
  ctx.strokeStyle = C.blue;
  ctx.lineWidth = 4 * k;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(770 * k, 1010 * k);
  for (let i = 0; i < 8; i++) {
    ctx.bezierCurveTo((785 + i * 44) * k, (960 + r() * 80) * k, (805 + i * 44) * k, (1050 - r() * 60) * k, (815 + i * 44) * k, (1005 + r() * 20) * k);
  }
  ctx.stroke();
  ctx.restore();
  ctx.fillStyle = C.pencil;
  ctx.font = `500 ${18 * k}px Mono`;
  ctx.fillText("INSPECTOR NO. 7 · SIGNATURE", 770 * k, 1072 * k);

  // footer: the slogan
  ctx.fillStyle = C.ink;
  ctx.fillRect(M, S - 112 * k, S - 2 * M, 4 * k);
  const sloganSize = fitSize(ctx, spec.slogan, (s) => `${s}px ArialBlack`, S - 2 * M, 44 * k);
  ctx.font = `${sloganSize}px ArialBlack`;
  ctx.textAlign = "center";
  ctx.fillText(spec.slogan, S / 2, S - 50 * k);
  ctx.textAlign = "left";

  grain(ctx, S, seed + 4, 0.05);
  return c;
}

/* ------------------------------------------------------------------ merch */

/**
 * Removes a flat background: when nearly all of the border is one colour, everything connected to the border in
 * that colour becomes transparent, and the anti-aliased edge is un-blended from it so no halo of the old colour
 * prints. Art without a flat background (a full-bleed poster) keeps it and prints as a rectangle.
 */
async function keyed(spec: KeyedSpec): Promise<HTMLCanvasElement> {
  const img = await loadImage(spec.image);
  const W = img.naturalWidth;
  const H = img.naturalHeight;
  const c = makeCanvas(W, H);
  const ctx = context(c);
  ctx.drawImage(img, 0, 0);
  const data = ctx.getImageData(0, 0, W, H);
  const p = data.data;
  const border: number[] = [];
  for (let x = 0; x < W; x++) border.push(x, (H - 1) * W + x);
  for (let y = 1; y < H - 1; y++) border.push(y * W, y * W + W - 1);
  const opaque = border.filter((i) => p[i * 4 + 3] > 200);
  if (opaque.length > border.length / 2) {
    const median = [0, 1, 2].map((ch) => {
      const values = opaque.map((i) => p[i * 4 + ch]).sort((a, b) => a - b);
      return values[values.length >> 1];
    });
    const tolerance = 30;
    const dist = (i: number) => Math.max(Math.abs(p[i * 4] - median[0]), Math.abs(p[i * 4 + 1] - median[1]), Math.abs(p[i * 4 + 2] - median[2]));
    if (opaque.filter((i) => dist(i) <= tolerance).length >= opaque.length * 0.85) {
      const seen = new Uint8Array(W * H);
      const queue = new Int32Array(W * H);
      let head = 0;
      let tail = 0;
      for (const i of border) {
        if (!seen[i] && dist(i) <= tolerance) {
          seen[i] = 1;
          queue[tail++] = i;
        }
      }
      while (head < tail) {
        const i = queue[head++];
        const x = i % W;
        for (const j of [x > 0 ? i - 1 : -1, x < W - 1 ? i + 1 : -1, i - W, i + W]) {
          if (j >= 0 && j < W * H && !seen[j] && dist(j) <= tolerance) {
            seen[j] = 1;
            queue[tail++] = j;
          }
        }
      }
      for (let i = 0; i < W * H; i++) {
        if (seen[i]) {
          p[i * 4 + 3] = 0;
          continue;
        }
        const x = i % W;
        const touches = (x > 0 && seen[i - 1]) || (x < W - 1 && seen[i + 1]) || (i >= W && seen[i - W]) || (i + W < W * H && seen[i + W]);
        if (!touches) continue;
        // An edge pixel is part background: estimate how much, and recover the ink's own colour.
        const a = Math.min(1, Math.max(0, (dist(i) - tolerance) / (2 * tolerance)));
        if (a === 0) {
          p[i * 4 + 3] = 0;
          continue;
        }
        for (let ch = 0; ch < 3; ch++) p[i * 4 + ch] = Math.min(255, Math.max(0, Math.round(median[ch] + (p[i * 4 + ch] - median[ch]) / a)));
        p[i * 4 + 3] = Math.round(p[i * 4 + 3] * a);
      }
      ctx.putImageData(data, 0, 0);
    }
  }
  return prepareArt(c);
}

async function printfile(spec: PrintFileSpec): Promise<HTMLCanvasElement> {
  const img = await loadImage(spec.image);
  const c = makeCanvas(spec.width, spec.height);
  const ctx = context(c);
  ctx.imageSmoothingQuality = "high";
  let w = spec.artWidth;
  let h = (w * img.naturalHeight) / img.naturalWidth;
  if (h > spec.height - spec.top) {
    w *= (spec.height - spec.top) / h;
    h = spec.height - spec.top;
  }
  ctx.drawImage(img, (spec.width - w) / 2, spec.top, w, h);
  return c;
}

/** Draws `img` to fill the box, cropping the overflow; `focusY` 0 keeps the top, 1 the bottom. */
function drawCover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number, focusY = 0.5): void {
  const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight);
  const sw = w / scale;
  const sh = h / scale;
  ctx.drawImage(img, (img.naturalWidth - sw) / 2, (img.naturalHeight - sh) * focusY, sw, sh, x, y, w, h);
}

async function cover(spec: CoverSpec): Promise<HTMLCanvasElement> {
  const img = await loadImage(spec.image);
  const c = makeCanvas(spec.width, spec.height);
  const ctx = context(c);
  ctx.imageSmoothingQuality = "high";
  drawCover(ctx, img, 0, 0, spec.width, spec.height, spec.focusY);
  return c;
}

/* ------------------------------------------------------------------ image and sheet */

async function image(spec: ImageSpec): Promise<HTMLCanvasElement> {
  const img = await loadImage(spec.image);
  const c = makeCanvas(spec.size);
  const ctx = context(c);
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, 0, 0, spec.size, spec.size);
  return c;
}

async function sheet(spec: SheetSpec): Promise<HTMLCanvasElement> {
  const cols = spec.items.length > 9 ? 5 : 3;
  const tile = 540;
  const gap = 30;
  const caption = 160;
  const head = spec.topic ? 190 : 160;
  const rows = Math.ceil(spec.items.length / cols);
  const W = cols * tile + (cols + 1) * gap;
  const H = head + rows * (tile + caption) + gap;
  const c = makeCanvas(W, H);
  const ctx = context(c);
  ctx.fillStyle = C.cream;
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = C.ink;
  ctx.font = "72px Bebas";
  ctx.fillText(spec.heading ?? `CHAOS MONKEYS · DRAFTS · ${spec.date}`, gap, 86);
  ctx.font = "500 22px Mono";
  ctx.fillStyle = C.grey;
  ctx.fillText(spec.hint ?? "Pick two or three to ship (/chaos-monkeys ship 1 3 5), or review the whole set (/chaos-monkeys review)", gap, 126);
  if (spec.topic) {
    ctx.fillStyle = C.red;
    ctx.fillText(`Topical, from Zingers: ${spec.topic}`.slice(0, 120), gap, 160);
  }

  for (const [i, item] of spec.items.entries()) {
    const x = gap + (i % cols) * (tile + gap);
    const y = head + Math.floor(i / cols) * (tile + caption);
    if (item.image) {
      // Product photos are portrait; keep the upper part, where the print is.
      drawCover(ctx, await loadImage(item.image), x, y, tile, tile, 0.3);
    } else {
      ctx.fillStyle = "#D9CDB4";
      ctx.fillRect(x, y, tile, tile);
      ctx.fillStyle = C.red;
      ctx.font = "700 22px Mono";
      wrap(ctx, `FAILED: ${item.note}`, tile - 60, 6).forEach((line, j) => ctx.fillText(line, x + 30, y + 240 + j * 30));
    }
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = 3;
    ctx.strokeRect(x, y, tile, tile);

    // the draft number sits in the caption, so it never covers the art
    ctx.fillStyle = C.red;
    ctx.beginPath();
    ctx.arc(x + 24, y + tile + 30, 24, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = C.cream;
    ctx.font = "30px ArialBlack";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(String(item.n), x + 24, y + tile + 32);
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    if (item.topical) {
      ctx.fillStyle = C.ink;
      ctx.fillRect(x + tile - 150, y + 20, 130, 34);
      ctx.fillStyle = C.cream;
      ctx.font = "700 18px Mono";
      ctx.fillText("ZINGERS", x + tile - 128, y + 43);
    }

    ctx.fillStyle = C.ink;
    ctx.font = "40px Bebas";
    ctx.fillText(item.title, x + 58, y + tile + 44);
    ctx.font = "500 18px Mono";
    ctx.fillStyle = C.grey;
    const score = item.score === null ? "unscored" : `score ${item.score}/10`;
    ctx.fillText(`${item.engine} · ${score}${item.flags.length ? " · " : ""}`, x, y + tile + 72);
    if (item.flags.length) {
      const offset = ctx.measureText(`${item.engine} · ${score} · `).width;
      ctx.fillStyle = C.red;
      ctx.font = "700 18px Mono";
      ctx.fillText(item.flags.join(" "), x + offset, y + tile + 72);
    }
    if (item.image) {
      ctx.fillStyle = C.pencil;
      ctx.font = "19px Arial";
      wrap(ctx, item.note, tile, 2).forEach((line, j) => ctx.fillText(line, x, y + tile + 102 + j * 25));
    }
  }
  return c;
}

/* ------------------------------------------------------------------ entry point */

async function render(spec: Spec): Promise<string> {
  if (spec.kind === "sheet") return encode(await sheet(spec), "png", undefined);
  if (spec.kind === "image") return encode(await image(spec), spec.format, spec.quality);
  if (spec.kind === "keyed") return encode(await keyed(spec), "png", undefined);
  if (spec.kind === "printfile") return encode(await printfile(spec), "png", undefined);
  if (spec.kind === "cover") return encode(await cover(spec), spec.format, spec.quality);
  const c = spec.kind === "form" ? await form(spec) : await specimen(spec);
  return encode(c, spec.format, spec.quality);
}

const page = window as unknown as { render: typeof render; READY: boolean; ERROR: string | null };
page.render = render;
page.READY = false;
page.ERROR = null;
Promise.all(["40px Bebas", "500 20px Mono", "700 20px Mono", "40px ArialBlack"].map((font) => document.fonts.load(font)))
  .then(() => {
    const missing = ["40px Bebas", "500 20px Mono", "40px ArialBlack"].filter((font) => !document.fonts.check(font));
    if (missing.length) throw new Error(`fonts did not load: ${missing.join(", ")}`);
    page.READY = true;
  })
  .catch((error: Error) => {
    page.ERROR = String(error.stack ?? error);
  });
