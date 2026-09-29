'use strict';
/* A-OK — Infinite Apes. Core: timing grid, palette, math, assets, HUD and finishing passes.
   Every frame is a pure function of its frame number, so any frame renders in isolation. */

const W = 1920, H = 1080, FPS = 30, BEAT = 14, BAR = 56, TOTAL = 450;
const Q = new URLSearchParams(location.search).get('q') || 'preview';   // which 3D render set

const C = {
  red: '#C8161D', redHot: '#FF2B2B', ox: '#7D1510', ink: '#0B0B0C', ink2: '#161516',
  cream: '#F1E8D6', bone: '#E3D5BA', tan: '#C88A55', white: '#FFFFFF', grey: '#8B857B',
};
const SECTIONS = [
  [0, '01', 'NOISE'], [112, '02', 'SIGNAL'], [168, '03', 'MODEL'], [224, '04', 'INFINITE'],
  [280, '05', 'WEAR'], [336, '06', 'PLAY'], [392, '07', 'A-OK'],
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
  outBack: (t, s = 1.9) => 1 + (s + 1) * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2),
};
const ease = (name, a, b, f) => E[name](inv(a, b, f));

function h32(x) {
  x |= 0; x = Math.imul(x ^ (x >>> 16), 0x7feb352d); x = Math.imul(x ^ (x >>> 15), 0x846ca68b);
  return (x ^ (x >>> 16)) >>> 0;
}
const rnd = (a, b = 0, c = 0) => h32(a * 73856093 ^ h32(b * 19349663 ^ h32(c * 83492791 + 1))) / 4294967296;
function rng(seed) { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const beatOf = f => f / BEAT;

/* ------------------------------------------------------------------ canvases */
const view = document.getElementById('c'); const out = view.getContext('2d');
function makeCanvas(w = W, h = H) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
const frameBuf = makeCanvas(), scratch = makeCanvas(), scratch2 = makeCanvas(), accum = makeCanvas();
const g2 = c => c.getContext('2d');

function reset(ctx) { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.filter = 'none'; ctx.shadowBlur = 0; ctx.shadowColor = 'transparent'; }
function fill(ctx, col) { ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = col; ctx.fillRect(0, 0, W, H); ctx.restore(); }

/* Letter-spaced text (canvas letterSpacing when available, manual fallback otherwise). */
function text(ctx, str, x, y, { font, color = C.cream, align = 'left', base = 'alphabetic', track = 0, alpha = 1 } = {}) {
  ctx.save(); ctx.font = font; ctx.fillStyle = color; ctx.globalAlpha *= alpha; ctx.textBaseline = base;
  if ('letterSpacing' in ctx) {
    ctx.letterSpacing = track + 'px'; ctx.textAlign = 'left';
    const w = ctx.measureText(str).width - track;
    const x0 = align === 'left' ? x : align === 'right' ? x - w : x - w / 2;
    ctx.fillText(str, x0, y);
  } else { ctx.textAlign = align; ctx.fillText(str, x, y); }
  ctx.restore();
}
function measure(ctx, str, font, track = 0) { ctx.save(); ctx.font = font; if ('letterSpacing' in ctx) ctx.letterSpacing = track + 'px'; const w = ctx.measureText(str).width - track; ctx.restore(); return w; }

/* Scramble-in text: characters resolve left to right from noise. */
const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&@$*+=/<>';
function scramble(str, p, seed = 1, frame = 0) {
  let s = '';
  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    const t = clamp(p * 1.6 - i / str.length * .6);
    if (ch === ' ' || t >= 1) s += ch;
    else if (t <= 0) s += p > 0 ? ' ' : ' ';
    else s += GLYPHS[(h32(seed * 31 + i * 7 + Math.floor(frame)) % GLYPHS.length)];
  }
  return s;
}
const pad = (n, w) => String(Math.floor(n)).padStart(w, '0');
const commas = n => Math.floor(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
function timecode(f) { const s = Math.floor(f / FPS); return `00:00:${pad(s, 2)}:${pad(f % FPS, 2)}`; }

/* ------------------------------------------------------------------ assets */
const IMG = {}; let POSTERS = []; let TRACK = {}; let MASK = null;
function loadImage(src) { return new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('load ' + src)); i.src = src; }); }
const renderCache = new Map();
async function renderImg(variant, f) {
  const src = `../renders/${Q}/${variant}_${pad(f, 4)}.png`;
  if (renderCache.has(src)) return renderCache.get(src);
  const p = loadImage(src); renderCache.set(src, p);
  if (renderCache.size > 40) renderCache.delete(renderCache.keys().next().value);
  return p;
}
async function loadAssets() {
  const fonts = ['400 100px Bebas', '500 20px Grotesk', '700 20px Grotesk', '400 20px Mono', '500 20px Mono', '700 20px Mono', '900 20px Mono', '100px ArialBlack', '40px DIN'];
  await Promise.all(fonts.map(f => document.fonts.load(f)));
  const list = { badge: 'assets/badge.png', badge8: 'assets/badge8.png', mask: `../renders/${Q}/mask_0112.png` };
  for (const [k, v] of Object.entries(list)) IMG[k] = await loadImage(v);
  POSTERS = await (await fetch('assets/posters.json')).json();
  await Promise.all(POSTERS.map(async p => { p.img = await loadImage('assets/' + p.file); }));
  for (const shot of ['II', 'III']) TRACK[shot] = (await (await fetch(`../renders/track_${shot}.json`)).json()).frames;
  const prods = await (await fetch('assets/products.json')).json();
  await Promise.all(prods.map(async p => { p.img = await loadImage('assets/' + p.file); }));
  IMG.products = prods;
  const svg = await (await fetch('assets/wordmark.svg')).text();
  IMG.wordmark = [...svg.matchAll(/d="([^"]+)"/g)].map(m => new Path2D(m[1]));
  buildMask();
}
function track(shot, f, key) { const row = TRACK[shot][f] || TRACK[shot][String(f)]; return row ? row[key] : null; }

/* The cap text mask (rendered by Blender at the match-cut frame) becomes the ASCII target. */
function buildMask() {
  const c = makeCanvas(); const x = g2(c); x.drawImage(IMG.mask, 0, 0, W, H);
  const d = x.getImageData(0, 0, W, H).data;
  MASK = { at: (px, py) => { px = Math.round(px); py = Math.round(py); if (px < 0 || py < 0 || px >= W || py >= H) return 0; return 1 - d[(py * W + px) * 4] / 255; } };
  let x0 = W, x1 = 0, y0 = H, y1 = 0;
  for (let y = 0; y < H; y += 2) for (let xx = 0; xx < W; xx += 2) if (d[(y * W + xx) * 4] < 128) { x0 = Math.min(x0, xx); x1 = Math.max(x1, xx); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  MASK.box = { x0, x1, y0, y1 };
}

/* ------------------------------------------------------------------ impacts: shake, flash, aberration */
const HITS = [
  // frame, shake px, flash, aberration, color
  [112, 26, .3, 14, '#FFFFFF'], [126, 16, 0, 7], [140, 12, 0, 5], [154, 16, 0, 7], [168, 10, .12, 9, '#FF2B2B'],
  [224, 14, 0, 6], [252, 14, 0, 8], [266, 14, 0, 8], [280, 10, 0, 6],
  [336, 8, 0, 6], [350, 5, 0, 3], [364, 5, 0, 3], [378, 7, 0, 4], [392, 30, .45, 16, '#FFFFFF'],
];
function impact(f) {
  let sx = 0, sy = 0, flash = 0, ab = 0, flashCol = '#FFFFFF';
  for (const [t, s, fl, a, col] of HITS) {
    const d = f - t; if (d < 0 || d > 16) continue;
    const env = Math.exp(-d / 3.2);
    sx += s * env * Math.sin(d * 2.9 + t) ; sy += s * .7 * env * Math.cos(d * 3.7 + t * .3);
    if (fl) { const fe = Math.exp(-d / 1.6) * fl; if (fe > flash) { flash = fe; flashCol = col || flashCol; } }
    ab += a * Math.exp(-d / 2.4);
  }
  return { sx, sy, flash, ab, flashCol };
}

/* ------------------------------------------------------------------ HUD: one frame that runs the whole film */
function sectionAt(f) { let s = SECTIONS[0]; for (const x of SECTIONS) if (f >= x[0]) s = x; return s; }
function hud(ctx, f, { color = C.cream, dim = .55, alpha = 1, caption = '', data = [] } = {}) {
  if (alpha <= 0) return;
  ctx.save(); ctx.globalAlpha = alpha;
  const [start, idx, name] = sectionAt(f);
  const age = f - start;
  const L = 64, R = W - 64, T = 58, B = H - 44;
  // brand + section
  text(ctx, 'A-OK', L, T, { font: '400 34px Bebas', color, track: 1 });
  ctx.fillStyle = color; ctx.globalAlpha = alpha * .5; ctx.fillRect(L + 72, T - 25, 1, 26); ctx.globalAlpha = alpha;
  const label = `${idx} — ${name}`;
  text(ctx, scramble(label, clamp(age / 9), +idx, f), L + 90, T - 3, { font: '600 14px Grotesk', color, track: 3.4 });
  // right: live data
  let x = R;
  for (let i = data.length - 1; i >= 0; i--) {
    const [k, v, hot] = data[i];
    const vw = measure(ctx, v, '500 14px Mono', 1);
    text(ctx, v, x, T - 3, { font: '500 14px Mono', color: hot ? C.redHot : color, align: 'right', track: 1 });
    text(ctx, k, x - vw - 12, T - 3, { font: '600 11px Grotesk', color, align: 'right', track: 2.6, alpha: dim });
    x -= vw + 12 + measure(ctx, k, '600 11px Grotesk', 2.6) + 34;
  }
  // rules
  ctx.globalAlpha = alpha * .22; ctx.fillStyle = color;
  ctx.fillRect(L, T + 18, R - L, 1); ctx.fillRect(L, B - 30, R - L, 1);
  ctx.globalAlpha = alpha;
  // bottom: caption + timecode
  if (caption) text(ctx, caption, L, B, { font: '500 13px Mono', color, track: 1.2, alpha: .85 });
  text(ctx, `${timecode(f)}  ·  ${pad(f, 3)}/${TOTAL}`, R, B, { font: '500 13px Mono', color, align: 'right', track: 1.2, alpha: .85 });
  ctx.restore();
}

/* Corner registration ticks used on technical frames. */
function cornerTicks(ctx, x0, y0, x1, y1, len = 18, color = C.cream, alpha = .6) {
  ctx.save(); ctx.strokeStyle = color; ctx.globalAlpha = alpha; ctx.lineWidth = 1.5; ctx.beginPath();
  for (const [x, y, dx, dy] of [[x0, y0, 1, 1], [x1, y0, -1, 1], [x0, y1, 1, -1], [x1, y1, -1, -1]]) {
    ctx.moveTo(x, y + dy * len); ctx.lineTo(x, y); ctx.lineTo(x + dx * len, y);
  }
  ctx.stroke(); ctx.restore();
}

/* ------------------------------------------------------------------ finishing */
const GRAIN = [];
function buildGrain() {
  for (let k = 0; k < 6; k++) {
    const c = makeCanvas(512, 512), x = g2(c), im = x.createImageData(512, 512), r = rng(k * 977 + 13);
    for (let i = 0; i < im.data.length; i += 4) { const v = 128 + (r() + r() + r() - 1.5) * 120; im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = 255; }
    x.putImageData(im, 0, 0); GRAIN.push(c);
  }
}
function finish(src, f, opts = {}) {
  const { sx, sy, flash, ab, flashCol } = impact(f);
  reset(out); out.fillStyle = '#000'; out.fillRect(0, 0, W, H);
  const zoom = 1 + Math.min(.06, (Math.abs(sx) + Math.abs(sy)) * .0022);
  const T = [zoom, 0, 0, zoom, W / 2 * (1 - zoom) + sx, H / 2 * (1 - zoom) + sy];
  const aberr = ab + (opts.aberration || 0);
  if (aberr > .6) {
    // Rebuild the frame from its R, G and B channels, with red and blue pulled apart.
    const s = g2(scratch);
    for (const [col, dx, sc] of [['#FF0000', aberr, 1 + aberr * .0012], ['#00FF00', 0, 1], ['#0000FF', -aberr, 1 - aberr * .0012]]) {
      reset(s); s.drawImage(src, 0, 0); s.globalCompositeOperation = 'multiply'; s.fillStyle = col; s.fillRect(0, 0, W, H);
      out.setTransform(T[0] * sc, 0, 0, T[3] * sc, W / 2 * (1 - T[0] * sc) + sx + dx, H / 2 * (1 - T[3] * sc) + sy);
      out.globalCompositeOperation = 'lighter'; out.drawImage(scratch, 0, 0);
    }
    out.globalCompositeOperation = 'source-over';
  } else { out.setTransform(...T); out.drawImage(src, 0, 0); }
  reset(out);
  if (flash > .01) { out.globalAlpha = Math.min(1, flash); out.fillStyle = flashCol; out.fillRect(0, 0, W, H); out.globalAlpha = 1; }
  // vignette
  const v = out.createRadialGradient(W / 2, H / 2, H * .45, W / 2, H / 2, H * 1.05);
  v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, `rgba(0,0,0,${opts.vignette ?? .32})`);
  out.fillStyle = v; out.fillRect(0, 0, W, H);
  // film grain
  out.globalCompositeOperation = 'overlay'; out.globalAlpha = opts.grain ?? .085;
  const gk = GRAIN[f % GRAIN.length], ox = (h32(f * 7) % 512), oy = (h32(f * 13) % 512);
  for (let y = -oy; y < H; y += 512) for (let x = -ox; x < W; x += 512) out.drawImage(gk, x, y);
  reset(out);
  // cut glitch: horizontal slices jump sideways for a frame or two
  if (opts.glitch > 0) {
    const g = g2(scratch2); reset(g); g.drawImage(view, 0, 0);
    for (let k = 0; k < 16; k++) {
      const y = Math.floor(rnd(f, k, 1) * H), h = 6 + Math.floor(rnd(f, k, 2) * 84);
      const dx = (rnd(f, k, 3) - .5) * 2 * opts.glitch * 180;
      out.drawImage(scratch2, 0, y, W, h, dx, y, W, h);
      if (rnd(f, k, 4) < .25) { out.globalCompositeOperation = 'difference'; out.fillStyle = C.redHot; out.globalAlpha = .5; out.fillRect(0, y, W, Math.min(h, 10)); reset(out); }
    }
  }
  // photographic negative (one frame before the match cut)
  if (opts.invert) { const g = g2(scratch2); reset(g); g.drawImage(view, 0, 0); out.filter = 'invert(1)'; out.drawImage(scratch2, 0, 0); reset(out); }
}
