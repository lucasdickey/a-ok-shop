'use strict';
/* A-OK — Hallucination Receipt. Core: timing grid, palette, math, canvases, assets and finishing.
   Every frame is a pure function of its frame number, so any frame renders in isolation. */

const W = 1920, H = 1080;
const FPS = 30, BEAT = 16, BAR = 64, TOTAL = 960;          // 112.5 BPM: every 16th note lands on a frame
const fb = (bar, beat = 0, six = 0) => (bar - 1) * BAR + beat * BEAT + six * 4;   // bars are 1-indexed

// Club Receipt (tailwind.config.js).
const C = {
  blue: '#3155D9', blueDark: '#193897', yellow: '#F4EB4A', gold: '#F8BD2B', sky: '#C8D6EC',
  paper: '#F7F3DF', slip: '#FFFBED', ink: '#22221E', inkLight: '#4A4A42', inkDeep: '#11110F',
  red: '#C52224', redLight: '#E0474A', redDark: '#9A1A1C', grass: '#2E9E4F', white: '#FFFFFF',
};

const SECTIONS = [
  [0, '01', 'THE THEOREM'], [192, '02', 'GOOD TASTE'], [256, '03', 'THE CLUB'], [320, '04', 'NEW MODELS'],
  [384, '05', 'CHECKOUT'], [512, '06', 'TOUCH GRASS'], [576, '07', 'AGENTS WELCOME'], [640, '08', 'THE MODELS'],
  [704, '09', 'THE BEST MODELS'], [768, '10', 'THE TOTAL'], [832, '11', 'KEEP THE RECEIPT'],
];

/* ------------------------------------------------------------------ math */
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const lerp = (a, b, t) => a + (b - a) * t;
const inv = (a, b, x) => clamp((x - a) / (b - a));
const E = {
  lin: t => t,
  inQuad: t => t * t, outQuad: t => 1 - (1 - t) * (1 - t),
  inCubic: t => t * t * t, outCubic: t => 1 - Math.pow(1 - t, 3),
  inOutCubic: t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
  outQuart: t => 1 - Math.pow(1 - t, 4), inQuart: t => t * t * t * t,
  inOutQuart: t => t < .5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2,
  outExpo: t => t >= 1 ? 1 : 1 - Math.pow(2, -10 * t),
  inExpo: t => t <= 0 ? 0 : Math.pow(2, 10 * t - 10),
  inOutExpo: t => t <= 0 ? 0 : t >= 1 ? 1 : t < .5 ? Math.pow(2, 20 * t - 10) / 2 : (2 - Math.pow(2, -20 * t + 10)) / 2,
  outBack: (t, s = 1.7) => 1 + (s + 1) * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2),
  // A springy settle (overshoots, then rings out), like the site's ✳ hover.
  spring: (t, k = 2.6, d = 6) => t >= 1 ? 1 : 1 - Math.exp(-d * t) * Math.cos(k * Math.PI * t),
};
const ease = (name, a, b, f) => E[name](inv(a, b, f));

function h32(x) {
  x |= 0; x = Math.imul(x ^ (x >>> 16), 0x7feb352d); x = Math.imul(x ^ (x >>> 15), 0x846ca68b);
  return (x ^ (x >>> 16)) >>> 0;
}
const rnd = (a, b = 0, c = 0) => h32(a * 73856093 ^ h32(b * 19349663 ^ h32(c * 83492791 + 1))) / 4294967296;
function rng(seed) { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

/* ------------------------------------------------------------------ canvases */
const view = document.getElementById('c'); view.width = W; view.height = H; view.style.width = W + 'px'; view.style.height = H + 'px';
const out = view.getContext('2d');
function makeCanvas(w = W, h = H) { const c = document.createElement('canvas'); c.width = Math.ceil(w); c.height = Math.ceil(h); return c; }
const frameBuf = makeCanvas(), scratch = makeCanvas(), scratch2 = makeCanvas(), accum = makeCanvas(), layer = makeCanvas();
const g2 = c => c.getContext('2d');

function reset(ctx) { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.filter = 'none'; ctx.shadowBlur = 0; ctx.shadowColor = 'transparent'; ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high'; ctx.setLineDash([]); ctx.lineJoin = 'miter'; ctx.lineCap = 'butt'; }
function fill(ctx, col) { ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = col; ctx.fillRect(0, 0, W, H); ctx.restore(); }

/* ------------------------------------------------------------------ type */
const F = {
  display: (px, w = 900) => `${w} ${px}px Barlow`,
  italic: (px, w = 900) => `italic ${w} ${px}px Barlow`,
  mono: (px, w = 700) => `${w} ${px}px Mono`,
  grotesk: (px, w = 500) => `${w} ${px}px Grotesk`,
  logo: px => `700 ${px}px Arimo`,
};
/* Letter-spaced text. `track` is in px; `align` measures without the trailing track. */
function text(ctx, str, x, y, { font, color = C.ink, align = 'left', base = 'alphabetic', track = 0, alpha = 1 } = {}) {
  ctx.save(); ctx.font = font; ctx.fillStyle = color; ctx.globalAlpha *= alpha; ctx.textBaseline = base;
  ctx.letterSpacing = track + 'px'; ctx.textAlign = 'left';
  const w = ctx.measureText(str).width - track;
  const x0 = align === 'left' ? x : align === 'right' ? x - w : x - w / 2;
  ctx.fillText(str, x0, y);
  ctx.restore();
  return w;
}
function measure(ctx, str, font, track = 0) { ctx.save(); ctx.font = font; ctx.letterSpacing = track + 'px'; const w = ctx.measureText(str).width - track; ctx.restore(); return w; }

/* Scramble-in: characters resolve left to right out of receipt-printer noise. */
const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&@$*+=/<>';
function scramble(str, p, seed = 1, frame = 0) {
  let s = '';
  for (let i = 0; i < str.length; i++) {
    const ch = str[i], t = clamp(p * 1.6 - i / str.length * .6);
    if (ch === ' ' || t >= 1) s += ch;
    else if (t <= 0) s += ' ';
    else s += GLYPHS[h32(seed * 31 + i * 7 + Math.floor(frame)) % GLYPHS.length];
  }
  return s;
}
const pad = (n, w) => String(Math.floor(n)).padStart(w, '0');
const commas = n => Math.floor(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
function timecode(f) { const s = Math.floor(f / FPS); return `00:00:${pad(s, 2)}:${pad(f % FPS, 2)}`; }

/* ------------------------------------------------------------------ assets
   Everything is read from the storefront itself: photos from public/, names and prices from
   product-catalog.json. The capture server serves the repository root. */
const ROOT = '/';
const IMG = {}; let CATALOG = [];
function loadImage(src) { return new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('load ' + src)); i.src = src; }); }

/* Products the film shows, newest first. `name` is the receipt line; `crop` (0–1 of the photo)
   trims model photos to chin-down so they sit with the garment shots. */
const LINEUP = [
  { handle: 'hallucination-club-2026-edition', img: 'hallucination-club-2026-edition-2.webp', name: 'HALLUCINATION CLUB V1.0', crop: [.16, .02, .84, .98] },
  { handle: 'a-ok-local-minimum-tee', img: 'a-ok-local-minimum-tee-yellow.webp', name: 'LOCAL MINIMUM TEE', crop: [.08, .2, .92, .9] },
  { handle: 'a-ok-insert-token-tee', img: 'a-ok-insert-token-tee-red.webp', name: 'INSERT TOKEN TEE', crop: [.08, .2, .92, .9] },
  { handle: 'a-ok-transformer-unit-exploded-view-tee', img: 'a-ok-transformer-unit-exploded-view-tee-0.webp', name: 'TRANSFORMER UNIT TEE', crop: [.1, .02, .9, .98] },
  { handle: 'a-ok-baby-ape-little-operator', img: 'a-ok-baby-ape-little-operator-0.webp', name: 'LITTLE OPERATOR TEE', crop: [.04, .02, .96, .98] },
  { handle: 'a-ok-all-angles-tee', img: 'a-ok-all-angles-tee-yellow-front.webp', name: 'ALL ANGLES TEE', crop: [.1, .02, .9, .98] },
  { handle: 'a-ok-fuzzy-spectrum-sweatshirt', img: 'a-ok-fuzzy-spectrum-sweatshirt-khaki-front.png', name: 'FUZZY SPECTRUM CREW', crop: [.1, .06, .9, .94] },
  { handle: 'a-ok-blueprint-sweatshirt', img: 'a-ok-blueprint-sweatshirt-team-royal-front.png', name: 'BLUEPRINT CREW', crop: [.1, .06, .9, .94] },
  { handle: 'a-ok-operator-turnaround-hoodie', img: 'a-ok-operator-turnaround-hoodie-khaki-green-front.png', name: 'OPERATOR TURNAROUND HOODIE', crop: [.1, .06, .9, .94] },
  { handle: 'mixture-of-apes-finetuned-personalities-tee', img: 'mixture-of-apes-finetuned-personalities-tee-0.png', name: 'MIXTURE OF APES TEE', crop: [.12, .02, .88, .98] },
  { handle: 'a-ok-march-of-the-agents-tee', img: 'a-ok-march-of-the-agents-tee-0.png', name: 'MARCH OF THE AGENTS TEE', crop: [.12, .02, .88, .98] },
  { handle: 'a-ok-octo-ape', img: 'a-ok-octo-ape-0.png', name: 'MULTI-MODAL OCTO TEE', crop: [.12, .02, .88, .98] },
  { handle: 'a-ok-the-typewriter', img: 'a-ok-the-typewriter-0.png', name: 'HALLUCINATED KEYSTROKES TEE', crop: [.12, .02, .88, .98] },
  { handle: 'a-ok-this-ape-is-not-okay', img: 'a-ok-this-ape-is-not-okay-0.png', name: 'THIS APE IS NOT OKAY TEE', crop: [.12, .02, .88, .98] },
  { handle: '1984-ape', img: '1984-ape-0.png', name: '2034 PROPHECY HOODIE', crop: [.1, .02, .9, .98] },
  { handle: 'ape-ocalypse-drip-dress-for-the-unknown', img: 'ape-ocalypse-drip-dress-for-the-unknown-0.png', name: 'APE-OCALYPSE DRIP HOODIE', crop: [.1, .02, .9, .98] },
  { handle: 'a-ok-recursive-monk-tee', img: 'a-ok-recursive-monk-tee-0.png', name: 'RECURSIVE MONK HOODIE', crop: [.1, .02, .9, .98] },
  { handle: 'a-ok-glitch-art-face-mask-t-shirt', img: 'a-ok-glitch-art-face-mask-t-shirt-0.png', name: 'GLITCHED VECTORS TEE', crop: [.12, .02, .88, .98] },
  { handle: 'a-ok-12mm-monkeys', img: 'a-ok-12mm-monkeys-0.png', name: '12MM MONKEYS TEE', crop: [.12, .02, .88, .98] },
  { handle: 'hallucination-club-inference-error-edition', img: 'hallucination-club-inference-error-edition-0.png', name: 'HALLUCINATION CLUB V0.0', crop: [.12, .02, .88, .98] },
];
const MONKEYS = ['0001', '0002', '0003', '0004', '0005', '0006', '0008', '0009', '0010', '0011', '0012', '0013'];
// Archive art without real people or names (the same four left out of Infinite Apes stay out).
const ART = ['typewriter-A-Ok.png', 'stochastic-ape.png', 'a-ok-keyboard-inspired-by.png', 'hey-young-world.png', 'mixture-of-apes.png',
  'orchestration-agent-ape.png', 'sad-vibe-coder.png', 'vibes-on-vibes-on-vibes.png', 'chilling-dripped-out-typewriter.png',
  'fractal-arrows.png', 'sota-stark-poster.png', 'a-ok-popcorn-poppin.png'];

async function loadAssets() {
  const faces = ['900 100px Barlow', '800 100px Barlow', '700 100px Barlow', '600 100px Barlow', 'italic 900 100px Barlow', 'italic 800 100px Barlow',
    '400 20px Mono', '500 20px Mono', '700 20px Mono', '800 20px Mono', '400 20px Grotesk', '500 20px Grotesk', '700 20px Grotesk', '700 100px Arimo'];
  await Promise.all(faces.map(f => document.fonts.load(f, 'AOK∞→↗×')));
  const cat = await (await fetch(ROOT + 'product-catalog.json')).json();
  CATALOG = cat.products.edges.map(e => e.node);
  const P = ROOT + 'public/images/';
  await Promise.all(LINEUP.map(async p => {
    const node = CATALOG.find(n => n.handle === p.handle);
    if (!node) throw new Error('not in catalog: ' + p.handle);
    p.price = Math.round(parseFloat(node.priceRange.minVariantPrice.amount));
    p.title = node.title;
    p.image = await loadImage(P + 'products/' + p.img);
  }));
  IMG.monkeys = await Promise.all(MONKEYS.map(id => loadImage(ROOT + `public/chaos-monkeys/${id}.webp`)));
  IMG.art = await Promise.all(ART.map(a => loadImage(P + 'hp-art-grid-collection/' + a)));
  const list = {
    turnaround: 'products/a-ok-all-angles-tee-0.webp', transformer: 'products/a-ok-transformer-unit-exploded-view-tee-2.webp',
    hc2026art: 'products/hallucination-club-2026-edition-3.webp', hcNavy: 'products/hallucination-club-2026-edition-2.webp',
    human: 'products/same-vibes-but-more-0.png', oface: 'a-ok-o-face.png', badge8: 'a-ok-8bit-retro.png', qr: 'a-ok-qr.svg',
    baby: 'products/a-ok-baby-ape-little-operator-0.webp',
  };
  await Promise.all(Object.entries(list).map(async ([k, v]) => { IMG[k] = await loadImage(P + v); }));
  // The All Angles art is already cut out; split it into its three views (front, side, back).
  IMG.views = [[34, 515], [515, 873], [891, 1368]].map(([x0, x1]) => {
    const c = makeCanvas(x1 - x0, 830); g2(c).drawImage(IMG.turnaround, x0, 50, x1 - x0, 830, 0, 0, x1 - x0, 830); return c;
  });
  IMG.monkeyById = Object.fromEntries(MONKEYS.map((id, i) => [id, IMG.monkeys[i]]));
}

/* Draw an image to cover a box (like object-fit: cover), with an optional source crop (0–1). */
function cover(ctx, img, x, y, w, h, crop = [0, 0, 1, 1], focus = [.5, .5]) {
  const iw = img.width || img.naturalWidth, ih = img.height || img.naturalHeight;
  let sx = crop[0] * iw, sy = crop[1] * ih, sw = (crop[2] - crop[0]) * iw, sh = (crop[3] - crop[1]) * ih;
  const r = w / h;
  if (sw / sh > r) { const nw = sh * r; sx += (sw - nw) * focus[0]; sw = nw; } else { const nh = sw / r; sy += (sh - nh) * focus[1]; sh = nh; }
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}
function contain(ctx, img, x, y, w, h) {
  const iw = img.width || img.naturalWidth, ih = img.height || img.naturalHeight, s = Math.min(w / iw, h / ih);
  ctx.drawImage(img, x + (w - iw * s) / 2, y + (h - ih * s) / 2, iw * s, ih * s);
}

/* ------------------------------------------------------------------ impacts: shake, flash, aberration */
const HITS = [
  // frame, shake px, flash, aberration, flash color
  [192, 30, 0, 9], [200, 10, 0, 3], [208, 16, 0, 5], [216, 12, 0, 4], [240, 14, 0, 4],
  [256, 10, 0, 3], [320, 8, 0, 2], [364, 22, 0, 8], [368, 10, 0, 3],
  [384, 10, 0, 3], [512, 10, 0, 3], [560, 8, .25, 3, C.gold], [576, 10, 0, 3],
  [640, 6, .85, 0, C.white], [656, 6, .85, 0, C.white], [672, 6, .85, 0, C.white], [688, 8, .7, 0, C.white],
  [704, 32, 0, 8], [712, 12, 0, 4], [720, 16, 0, 6],
  [768, 10, 0, 3], [828, 14, 0, 4], [832, 18, 0, 6], [848, 24, 0, 6], [896, 14, 0, 4],
];
function impact(f) {
  let sx = 0, sy = 0, flash = 0, ab = 0, flashCol = C.white;
  for (const [t, s, fl, a, col] of HITS) {
    const d = f - t; if (d < 0 || d > 14) continue;
    const env = Math.exp(-d / 2.6);
    sx += s * env * Math.sin(d * 2.9 + t); sy += s * .7 * env * Math.cos(d * 3.7 + t * .3);
    if (fl) { const fe = Math.exp(-d / 1.3) * fl; if (fe > flash) { flash = fe; flashCol = col || flashCol; } }
    ab += a * Math.exp(-d / 2);
  }
  return { sx, sy, flash, ab, flashCol };
}

/* ------------------------------------------------------------------ finishing */
const GRAIN = []; let PAPER = null;
function buildTextures() {
  for (let k = 0; k < 6; k++) {
    const c = makeCanvas(512, 512), x = g2(c), im = x.createImageData(512, 512), r = rng(k * 977 + 13);
    for (let i = 0; i < im.data.length; i += 4) { const v = 128 + (r() + r() + r() - 1.5) * 110; im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = 255; }
    x.putImageData(im, 0, 0); GRAIN.push(c);
  }
  // Paper tooth: soft low-frequency mottling plus fine fibres, multiplied over the frame like ink on stock.
  PAPER = makeCanvas(1024, 1024); const p = g2(PAPER), r = rng(77);
  p.fillStyle = '#fff'; p.fillRect(0, 0, 1024, 1024);
  for (let i = 0; i < 2600; i++) { p.fillStyle = `rgba(90,80,60,${.006 + r() * .01})`; const s = 8 + r() * 60; p.beginPath(); p.ellipse(r() * 1024, r() * 1024, s, s * (.3 + r()), r() * 3, 0, 7); p.fill(); }
  for (let i = 0; i < 5000; i++) { p.strokeStyle = `rgba(70,60,45,${.03 + r() * .05})`; p.lineWidth = .6; const x = r() * 1024, y = r() * 1024, a = r() * 6.3, l = 3 + r() * 10; p.beginPath(); p.moveTo(x, y); p.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); p.stroke(); }
}
function finish(src, f, opts = {}) {
  const { sx, sy, flash, ab, flashCol } = impact(f);
  reset(out); out.fillStyle = C.inkDeep; out.fillRect(0, 0, W, H);
  const zoom = 1 + Math.min(.05, (Math.abs(sx) + Math.abs(sy)) * .0018);
  const T = [zoom, 0, 0, zoom, W / 2 * (1 - zoom) + sx, H / 2 * (1 - zoom) + sy];
  const aberr = ab + (opts.aberration || 0);
  if (aberr > .6) {
    // Misregistered print: the frame rebuilt from its R, G and B plates, nudged apart.
    const s = g2(scratch);
    for (const [col, dx, sc] of [['#FF0000', aberr, 1 + aberr * .001], ['#00FF00', 0, 1], ['#0000FF', -aberr, 1 - aberr * .001]]) {
      reset(s); s.drawImage(src, 0, 0); s.globalCompositeOperation = 'multiply'; s.fillStyle = col; s.fillRect(0, 0, W, H);
      out.setTransform(T[0] * sc, 0, 0, T[3] * sc, W / 2 * (1 - T[0] * sc) + sx + dx, H / 2 * (1 - T[3] * sc) + sy);
      out.globalCompositeOperation = 'lighter'; out.drawImage(scratch, 0, 0);
    }
    out.globalCompositeOperation = 'source-over';
  } else { out.setTransform(...T); out.drawImage(src, 0, 0); }
  reset(out);
  if (flash > .01) { out.globalAlpha = Math.min(1, flash); out.fillStyle = flashCol; out.fillRect(0, 0, W, H); out.globalAlpha = 1; }
  // paper tooth (fixed to the frame, like the stock the whole film is printed on)
  if (opts.paper !== 0) {
    out.globalCompositeOperation = 'multiply'; out.globalAlpha = opts.paper ?? .3;
    for (let y = 0; y < H; y += 1024) for (let x = 0; x < W; x += 1024) out.drawImage(PAPER, x, y);
    reset(out);
  }
  if (opts.vignette) {
    const v = out.createRadialGradient(W / 2, H / 2, Math.min(W, H) * .45, W / 2, H / 2, Math.max(W, H) * .75);
    v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, `rgba(0,0,0,${opts.vignette})`);
    out.fillStyle = v; out.fillRect(0, 0, W, H);
  }
  // grain
  out.globalCompositeOperation = 'overlay'; out.globalAlpha = opts.grain ?? .06;
  const gk = GRAIN[f % GRAIN.length], ox = h32(f * 7) % 512, oy = h32(f * 13) % 512;
  for (let y = -oy; y < H; y += 512) for (let x = -ox; x < W; x += 512) out.drawImage(gk, x, y);
  reset(out);
  if (opts.glitch > 0) {
    const g = g2(scratch2); reset(g); g.drawImage(view, 0, 0);
    for (let k = 0; k < 14; k++) {
      const y = Math.floor(rnd(f, k, 1) * H), h = 6 + Math.floor(rnd(f, k, 2) * 70);
      const dx = (rnd(f, k, 3) - .5) * 2 * opts.glitch * 160;
      out.drawImage(scratch2, 0, y, W, h, dx, y, W, h);
      if (rnd(f, k, 4) < .25) { out.globalCompositeOperation = 'difference'; out.fillStyle = C.red; out.globalAlpha = .45; out.fillRect(0, y, W, Math.min(h, 8)); reset(out); }
    }
  }
}
