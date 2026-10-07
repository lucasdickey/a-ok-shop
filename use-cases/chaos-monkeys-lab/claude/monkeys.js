'use strict';
/* Chaos Monkeys — the code-drawn route. Every monkey is drawn from the brand kit in canvas code. */

const N = 1254;
const C = { red: '#C8161D', ink: '#0B0B0C', cream: '#F1E8D6', bone: '#E2D2B2', tan: '#C88A55', tan2: '#955F36', dark: '#7D1510' };
const cv = document.getElementById('c'), g = cv.getContext('2d');
const mk = (w = N, h = N) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
const load = src => new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = src; });
function rng(seed) { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const A = {};

/* ---------------------------------------------------------------- shared print finishing */
function paper(ctx, base = C.cream, seed = 1) {
  ctx.fillStyle = base; ctx.fillRect(0, 0, N, N);
  const r = rng(seed); ctx.save(); ctx.globalAlpha = .05;
  for (let i = 0; i < 2200; i++) { ctx.fillStyle = r() < .5 ? '#6b5a3c' : '#ffffff'; ctx.fillRect(r() * N, r() * N, 1 + r() * 2, 1 + r() * 6); }
  ctx.restore();
}
function inkWear(ctx, seed = 2, amount = 1) {   // specks where the ink did not take
  const r = rng(seed); ctx.save();
  for (let i = 0; i < 1600 * amount; i++) { ctx.globalAlpha = .25 + r() * .5; ctx.fillStyle = C.cream; const s = .6 + r() * 1.8; ctx.fillRect(r() * N, r() * N, s, s); }
  ctx.restore();
}
function grain(ctx, seed = 3, alpha = .06) {
  const c = mk(256, 256), x = c.getContext('2d'), im = x.createImageData(256, 256), r = rng(seed);
  for (let i = 0; i < im.data.length; i += 4) { const v = 128 + (r() + r() - 1) * 110; im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = 255; }
  x.putImageData(im, 0, 0);
  ctx.save(); ctx.globalCompositeOperation = 'overlay'; ctx.globalAlpha = alpha;
  for (let y = 0; y < N; y += 256) for (let xx = 0; xx < N; xx += 256) ctx.drawImage(c, xx, y);
  ctx.restore();
}
function halftoneRect(ctx, x0, y0, w, h, col, step, rad, alpha = 1) {
  ctx.save(); ctx.fillStyle = col; ctx.globalAlpha = alpha;
  for (let y = y0; y < y0 + h; y += step) for (let x = x0 + ((y / step) % 2 ? step / 2 : 0); x < x0 + w; x += step) { ctx.beginPath(); ctx.arc(x, y, rad, 0, 7); ctx.fill(); }
  ctx.restore();
}
function poster(ctx, str, x, y, size, { fill = C.cream, stroke = C.ink, shadow = C.ink, sw = 10, off = 10, font = 'ArialBlack', align = 'left' } = {}) {
  ctx.save(); ctx.font = `${size}px ${font}`; ctx.textAlign = align; ctx.textBaseline = 'alphabetic'; ctx.lineJoin = 'round';
  if (shadow) { ctx.fillStyle = shadow; ctx.strokeStyle = shadow; ctx.lineWidth = sw; ctx.strokeText(str, x + off, y + off); ctx.fillText(str, x + off, y + off); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = sw; ctx.strokeText(str, x, y); }
  ctx.fillStyle = fill; ctx.fillText(str, x, y); ctx.restore();
}

/* Screen-print the Blender figurine: map every pixel to a few flat inks with ordered-dither shading. */
function screenPrint(img, { minAlpha = 200 } = {}) {
  const t = mk(img.width, img.height), x = t.getContext('2d'); x.drawImage(img, 0, 0);
  const d = x.getImageData(0, 0, t.width, t.height), p = d.data;
  let x0 = t.width, y0 = t.height, x1 = 0, y1 = 0;
  const bayer = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  const hex = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const P = { ink: hex(C.ink), red: hex(C.red), dark: hex(C.dark), tan: hex(C.tan), tan2: hex(C.tan2), cream: hex(C.cream), bone: hex(C.bone) };
  for (let yy = 0; yy < t.height; yy++) for (let xx = 0; xx < t.width; xx++) {
    const i = (yy * t.width + xx) * 4;
    if (p[i + 3] < minAlpha) { p[i + 3] = 0; continue; }
    const r = p[i], gg = p[i + 1], b = p[i + 2], L = .299 * r + .587 * gg + .114 * b, mx = Math.max(r, gg, b), mn = Math.min(r, gg, b);
    const th = (bayer[((yy >> 1) % 4) * 4 + ((xx >> 1) % 4)] + .5) / 16;
    let col;
    if (r > 95 && r > gg * 1.8 && r > b * 1.6) col = (L - 45) / 40 > th ? P.red : P.dark;
    else if (r > 110 && gg > 60 && r > gg * 1.12 && b < gg && (mx - mn) > 40) col = (L - 95) / 60 > th ? P.tan : P.tan2;
    else if (L > 150 && (mx - mn) < 60) col = (L - 150) / 60 > th ? P.cream : P.bone;
    else if (L < 70) col = P.ink;
    else col = (L - 70) / 90 > th ? P.bone : P.ink;
    p[i] = col[0]; p[i + 1] = col[1]; p[i + 2] = col[2]; p[i + 3] = 255;
    x0 = Math.min(x0, xx); x1 = Math.max(x1, xx); y0 = Math.min(y0, yy); y1 = Math.max(y1, yy);
  }
  x.putImageData(d, 0, 0);
  const pad = 14, out = mk(x1 - x0 + pad * 2, y1 - y0 + pad * 2), o = out.getContext('2d');
  // thick ink outline, the way a screen printer would key the figure
  const sil = mk(out.width, out.height), s = sil.getContext('2d');
  s.drawImage(t, x0, y0, x1 - x0, y1 - y0, pad, pad, x1 - x0, y1 - y0); s.globalCompositeOperation = 'source-in'; s.fillStyle = C.ink; s.fillRect(0, 0, out.width, out.height);
  for (let a = 0; a < 16; a++) o.drawImage(sil, Math.cos(a / 16 * 6.283) * 7, Math.sin(a / 16 * 6.283) * 7);
  o.drawImage(t, x0, y0, x1 - x0, y1 - y0, pad, pad, x1 - x0, y1 - y0);
  return out;
}

/* ================================================================ 0413 — poster */
async function m0413() {
  paper(g, C.cream, 13);
  // sunburst
  const sx = 400, sy = 640;
  g.save(); g.fillStyle = C.red;
  for (let k = 0; k < 30; k += 2) { const a0 = k / 30 * Math.PI * 2, a1 = (k + 1) / 30 * Math.PI * 2; g.beginPath(); g.moveTo(sx, sy); g.lineTo(sx + Math.cos(a0) * 2000, sy + Math.sin(a0) * 2000); g.lineTo(sx + Math.cos(a1) * 2000, sy + Math.sin(a1) * 2000); g.closePath(); g.fill(); }
  g.restore();
  halftoneRect(g, 0, 0, N, N, C.dark, 14, 2.4, .35);
  g.fillStyle = C.cream; g.beginPath(); g.arc(sx, sy, 150, 0, 7); g.fill();
  g.strokeStyle = C.ink; g.lineWidth = 8; g.stroke();
  // skyline
  const r = rng(5); g.fillStyle = C.ink;
  for (let x = -10; x < 700; x += 44 + r() * 30) { const h = 180 + r() * 260, w = 40 + r() * 50; g.fillRect(x, 1010 - h, w, h); g.fillStyle = C.cream; for (let wy = 1010 - h + 16; wy < 990; wy += 26) for (let wx = x + 8; wx < x + w - 10; wx += 16) if (r() < .5) g.fillRect(wx, wy, 6, 10); g.fillStyle = C.ink; }
  // the chat window on the facade
  const wx = 700, wy = 150, ww = 500, wh = 950;
  g.fillStyle = C.ink; g.fillRect(wx - 26, 0, ww + 60, N);
  g.fillStyle = C.bone; g.fillRect(wx, wy, ww, wh);
  halftoneRect(g, wx, wy + 60, ww, wh - 60, '#5a5047', 10, 3.1, .9);                  // the grime
  g.save(); g.beginPath(); g.moveTo(wx, wy + 260); g.lineTo(wx + ww, wy + 110); g.lineTo(wx + ww, wy + 500); g.lineTo(wx, wy + 650); g.closePath(); g.clip();
  g.fillStyle = '#FBF6EA'; g.fillRect(wx, wy, ww, wh); g.restore();                       // the freshly washed swath
  g.fillStyle = C.red; g.fillRect(wx, wy, ww, 60);
  for (const k of [0, 1, 2]) { g.fillStyle = C.cream; g.beginPath(); g.arc(wx + 36 + k * 34, wy + 30, 10, 0, 7); g.fill(); }
  const bubble = (x, y, w, h, fillc, bars) => { g.fillStyle = fillc; g.strokeStyle = C.ink; g.lineWidth = 7; g.beginPath(); g.roundRect(x, y, w, h, 26); g.fill(); g.stroke(); g.fillStyle = fillc === C.red ? C.cream : '#8a8176'; for (let b = 0; b < bars; b++) g.fillRect(x + 30, y + 30 + b * 30, w - 90 - b * 50, 12); };
  bubble(wx + 40, wy + 120, 330, 110, '#FBF6EA', 2); bubble(wx + 140, wy + 270, 320, 110, C.red, 2); bubble(wx + 40, wy + 420, 300, 140, '#FBF6EA', 3); bubble(wx + 150, wy + 600, 300, 90, C.red, 1);
  g.fillStyle = '#FBF6EA'; g.strokeStyle = C.ink; g.lineWidth = 7; g.beginPath(); g.roundRect(wx + 30, wy + 820, ww - 60, 90, 20); g.fill(); g.stroke();
  g.fillStyle = C.ink; g.fillRect(wx + 60, wy + 845, 7, 40);
  g.fillStyle = C.red; g.beginPath(); g.arc(wx + ww - 80, wy + 865, 30, 0, 7); g.fill();
  g.strokeStyle = C.cream; g.lineWidth = 8; g.beginPath(); g.moveTo(wx + ww - 94, wy + 850); g.lineTo(wx + ww - 64, wy + 865); g.lineTo(wx + ww - 94, wy + 880); g.stroke();
  g.strokeStyle = C.ink; g.lineWidth = 12; g.strokeRect(wx, wy, ww, wh);
  for (const [x, y, s] of [[wx + 420, wy + 190, 26], [wx + 60, wy + 330, 18], [wx + 300, wy + 470, 22]]) { g.fillStyle = C.cream; g.beginPath(); for (let k = 0; k < 8; k++) { const a = k / 8 * 6.283, rr = k % 2 ? s * .28 : s; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } g.fill(); }
  // ropes and platform
  g.strokeStyle = C.ink; g.lineWidth = 7;
  for (const x of [90, 610]) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 900); g.stroke(); }
  const fig = screenPrint(A.figure);
  const fh = 700, fw = fig.width * fh / fig.height;
  g.drawImage(fig, 360 - fw / 2, 1000 - fh, fw, fh);
  g.fillStyle = C.red; g.fillRect(50, 950, 600, 70); g.strokeStyle = C.ink; g.lineWidth = 9; g.strokeRect(50, 950, 600, 70);
  for (let x = 50; x <= 650; x += 75) { g.fillStyle = C.ink; g.fillRect(x - 4, 890, 8, 130); }
  g.fillRect(40, 884, 620, 12);
  halftoneRect(g, 54, 954, 592, 62, C.dark, 9, 2.2, .7);
  // squeegee on a pole, working the clean swath
  g.save(); g.translate(700, 420); g.rotate(-.55);
  g.fillStyle = C.ink; g.fillRect(-4, 0, 16, 470);
  g.fillStyle = C.red; g.strokeStyle = C.ink; g.lineWidth = 6; g.beginPath(); g.roundRect(-70, -26, 156, 32, 8); g.fill(); g.stroke();
  g.fillStyle = C.ink; g.fillRect(-78, -38, 172, 14); g.restore();
  // type
  for (const [w, y] of [['CONTEXT', 170], ['WINDOW', 300], ['WASHER', 430]]) poster(g, w, 54, y, 128, { off: 11 });
  g.fillStyle = C.ink; g.fillRect(0, 1120, N, 134);
  poster(g, 'CLEAN CONTEXT. CLEAR CONSCIENCE.', N / 2, 1210, 54, { shadow: null, stroke: null, align: 'center' });
  inkWear(g, 19); grain(g, 20, .07);
}

/* ================================================================ 0414 — pixel */
const FONT = {
  A: '.###.|#...#|#...#|#####|#...#|#...#|#...#', B: '####.|#...#|#...#|####.|#...#|#...#|####.', C: '.###.|#...#|#....|#....|#....|#...#|.###.', D: '####.|#...#|#...#|#...#|#...#|#...#|####.',
  E: '#####|#....|#....|####.|#....|#....|#####', F: '#####|#....|#....|####.|#....|#....|#....', G: '.###.|#...#|#....|#.###|#...#|#...#|.###.', H: '#...#|#...#|#...#|#####|#...#|#...#|#...#',
  I: '.###.|..#..|..#..|..#..|..#..|..#..|.###.', J: '..###|...#.|...#.|...#.|#..#.|#..#.|.##..', K: '#...#|#..#.|#.#..|##...|#.#..|#..#.|#...#', L: '#....|#....|#....|#....|#....|#....|#####',
  M: '#...#|##.##|#.#.#|#.#.#|#...#|#...#|#...#', N: '#...#|##..#|#.#.#|#..##|#...#|#...#|#...#', O: '.###.|#...#|#...#|#...#|#...#|#...#|.###.', P: '####.|#...#|#...#|####.|#....|#....|#....',
  Q: '.###.|#...#|#...#|#...#|#.#.#|#..#.|.##.#', R: '####.|#...#|#...#|####.|#.#..|#..#.|#...#', S: '.####|#....|#....|.###.|....#|....#|####.', T: '#####|..#..|..#..|..#..|..#..|..#..|..#..',
  U: '#...#|#...#|#...#|#...#|#...#|#...#|.###.', V: '#...#|#...#|#...#|#...#|#...#|.#.#.|..#..', W: '#...#|#...#|#...#|#.#.#|#.#.#|##.##|#...#', X: '#...#|#...#|.#.#.|..#..|.#.#.|#...#|#...#',
  Y: '#...#|#...#|.#.#.|..#..|..#..|..#..|..#..', Z: '#####|....#|...#.|..#..|.#...|#....|#####',
  0: '.###.|#...#|#..##|#.#.#|##..#|#...#|.###.', 1: '..#..|.##..|..#..|..#..|..#..|..#..|.###.', 2: '.###.|#...#|....#|...#.|..#..|.#...|#####', 3: '####.|....#|....#|.###.|....#|....#|####.',
  4: '...#.|..##.|.#.#.|#..#.|#####|...#.|...#.', 5: '#####|#....|####.|....#|....#|#...#|.###.', 6: '.###.|#....|#....|####.|#...#|#...#|.###.', 7: '#####|....#|...#.|..#..|.#...|.#...|.#...',
  8: '.###.|#...#|#...#|.###.|#...#|#...#|.###.', 9: '.###.|#...#|#...#|.####|....#|....#|.###.',
  '.': '.....|.....|.....|.....|.....|.##..|.##..', ':': '.....|.##..|.##..|.....|.##..|.##..|.....', '-': '.....|.....|.....|.###.|.....|.....|.....',
  '!': '..#..|..#..|..#..|..#..|..#..|.....|..#..', '#': '.#.#.|#####|.#.#.|.#.#.|.#.#.|#####|.#.#.', ' ': '.....|.....|.....|.....|.....|.....|.....',
};
const PX = 11, GRID = 114;
function dot(x, y, col) { g.fillStyle = col; g.fillRect(x * PX, y * PX, PX, PX); }
function ptext(str, x, y, col, scale = 1, shadow = null) {
  const w = str.length * 6 * scale - scale;
  const x0 = x === 'center' ? Math.round((GRID - w) / 2) : x;
  for (const [k, ch] of [...str].entries()) {
    const rows = (FONT[ch] || FONT[' ']).split('|');
    rows.forEach((row, j) => [...row].forEach((b, i) => {
      if (b !== '#') return;
      for (let a = 0; a < scale; a++) for (let c = 0; c < scale; c++) {
        const px = x0 + k * 6 * scale + i * scale + a, py = y + j * scale + c;
        if (shadow) dot(px + 1, py + 1, shadow);
        dot(px, py, col);
      }
    }));
  }
  return x0;
}
const APE = [
  '....RRRRRR....',
  '...RWWWWWWR...',
  '...RWKWWKWR...',
  '..RRRRRRRRRRR.',
  '.RKKKKKKKKKKR.',
  'RRKKTTTTTTKKRR',
  'RRKTWKTTWKTKRR',
  'RRKTTTTTTTTKRR',
  '.RKTTTKKTTTKR.',
  '..KTTKDDKTTK..',
  '..KTTKDDKTTK..',
  '..KTTTKKTTTK..',
  '...KTTTTTTK...',
  '..RRRRRRRRRR..',
  '.RRRWWRRWWRRR.',
  '.RRRRRRRRRRRR.',
  '..KKKK..KKKK..',
  '..WWRR..RRWW..',
];
const SP = { R: C.red, W: C.cream, K: C.ink, T: C.tan, D: C.dark };
function ape(x, y) { APE.forEach((row, j) => [...row].forEach((ch, i) => { if (SP[ch]) dot(x + i, y + j, SP[ch]); })); }
async function m0414() {
  g.fillStyle = '#060607'; g.fillRect(0, 0, N, N);
  for (let i = 0; i < GRID; i++) { dot(i, 0, C.red); dot(i, 1, C.red); dot(i, GRID - 1, C.red); dot(i, GRID - 2, C.red); dot(0, i, C.red); dot(1, i, C.red); dot(GRID - 1, i, C.red); dot(GRID - 2, i, C.red); }
  const r = rng(414); for (let i = 0; i < 40; i++) dot(3 + Math.floor(r() * 108), 3 + Math.floor(r() * 34), '#3a3533');
  ptext('RATE-', 'center', 5, C.cream, 2, C.red);
  ptext('LIMITED', 'center', 21, C.cream, 2, C.red);
  for (let i = 8; i < 106; i++) for (let j = 38; j < 48; j++) dot(i, j, C.red);
  ptext('NOW SERVING: 001', 'center', 40, C.cream);
  // the counter, then a queue that goes all the way back
  for (let i = 100; i < 111; i++) for (let j = 66; j < 84; j++) dot(i, j, j === 66 ? C.cream : C.dark);
  const xs = [84, 68, 52, 36, 20, 4];
  xs.forEach(x => ape(x, 64));
  for (let i = 2; i < 112; i++) dot(i, 82, C.cream);
  // ticket callout for the ape at the back
  for (let i = 3; i < 32; i++) for (let j = 51; j < 61; j++) dot(i, j, (i === 3 || i === 31 || j === 51 || j === 60) ? C.red : C.cream);
  dot(9, 61, C.cream); dot(10, 61, C.cream); dot(10, 62, C.cream);
  ptext('#429', 5, 53, C.ink);
  ptext('PLEASE HOLD.', 'center', 86, C.cream);
  ptext('YOUR APE IS', 'center', 94, C.cream);
  ptext('IMPORTANT TO US.', 'center', 102, C.red);
  g.save(); g.globalAlpha = .16; g.fillStyle = '#000'; for (let y = 0; y < N; y += 4) g.fillRect(0, y, N, 2); g.restore();
  const v = g.createRadialGradient(N / 2, N / 2, N * .35, N / 2, N / 2, N * .75); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.35)'); g.fillStyle = v; g.fillRect(0, 0, N, N);
}

/* ================================================================ 0415 — seal */
function arcText(ctx, str, cx, cy, r, center, font, col, inside = false) {
  ctx.save(); ctx.font = font; ctx.fillStyle = col; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const widths = [...str].map(ch => ctx.measureText(ch).width + 3), total = widths.reduce((a, b) => a + b, 0);
  let a = center - (inside ? -1 : 1) * total / r / 2;
  for (const [k, ch] of [...str].entries()) {
    const da = widths[k] / r, ang = a + (inside ? -1 : 1) * da / 2;
    ctx.save(); ctx.translate(cx + Math.cos(ang) * r, cy + Math.sin(ang) * r); ctx.rotate(ang + (inside ? -Math.PI / 2 : Math.PI / 2)); ctx.fillText(ch, 0, 0); ctx.restore();
    a += (inside ? -1 : 1) * da;
  }
  ctx.restore();
}
function inspectionForm() {
  paper(g, '#F4EDDD', 15);
  g.save(); g.strokeStyle = 'rgba(80,110,160,.18)'; g.lineWidth = 2; for (let y = 250; y < N; y += 52) { g.beginPath(); g.moveTo(70, y); g.lineTo(N - 70, y); g.stroke(); } g.restore();
  g.fillStyle = C.ink; g.font = '700 30px Mono'; g.fillText('FORM A-OK/95', 70, 110);
  g.font = '500 22px Mono'; g.fillText('SPECIMEN INSPECTION REPORT  ·  CHAOS MONKEYS DIVISION', 70, 150);
  g.fillRect(70, 172, N - 140, 4);
  const rows = [['SPECIMEN', 'APE, ONE (1)'], ['HEADPHONES', 'PRESENT'], ['MOUTH', 'O'], ['CAP', 'A-OK'], ['HALLUCINATIONS', 'WITHIN TOLERANCE'], ['CONFIDENCE', '95%']];
  g.font = '500 26px Mono';
  rows.forEach(([k, v], i) => { const y = 240 + i * 52; g.fillStyle = '#3c3a38'; g.fillText(k, 70, y); g.fillText('.'.repeat(Math.max(3, 38 - k.length - v.length)), 70 + g.measureText(k + ' ').width, y); g.fillStyle = C.ink; g.textAlign = 'right'; g.fillText(v, N - 70, y); g.textAlign = 'left'; });
  // the inspector's signature
  g.save(); g.strokeStyle = '#223a78'; g.lineWidth = 4; g.lineCap = 'round'; g.beginPath(); g.moveTo(760, 1140);
  for (let k = 0; k < 9; k++) g.bezierCurveTo(780 + k * 44, 1080 + (k % 2) * 90, 800 + k * 44, 1180 - (k % 3) * 40, 810 + k * 46, 1130);
  g.stroke(); g.restore();
  g.fillStyle = '#3c3a38'; g.font = '500 22px Mono'; g.fillText('INSPECTOR NO. 7  ·  SIGNATURE', 760, 1200);
}
async function m0415() {
  inspectionForm();
  // the stamp, pressed in red ink
  const st = mk(), s = st.getContext('2d'), cx = N / 2 - 40, cy = 700, R = 400;
  s.fillStyle = C.red; s.strokeStyle = C.red;
  s.beginPath(); for (let k = 0; k < 144; k++) { const a = k / 144 * 6.283, rr = k % 2 ? R : R - 22; s.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); } s.closePath(); s.lineWidth = 12; s.stroke();
  s.lineWidth = 12; s.beginPath(); s.arc(cx, cy, R - 44, 0, 7); s.stroke();
  s.lineWidth = 7; s.beginPath(); s.arc(cx, cy, R - 150, 0, 7); s.stroke();
  arcText(s, '★ CERTIFIED A-OK ★', cx, cy, R - 97, -Math.PI / 2, '64px ArialBlack', C.red);
  arcText(s, '95% CONFIDENCE · 100% APE', cx, cy, R - 97, Math.PI / 2, '46px ArialBlack', C.red, true);
  // the ape, reduced to one colour of ink
  const bd = mk(460, 460), b = bd.getContext('2d'); b.drawImage(A.badge, 0, 0, 460, 460);
  const im = b.getImageData(0, 0, 460, 460), p = im.data;
  for (let i = 0; i < p.length; i += 4) { const L = .299 * p[i] + .587 * p[i + 1] + .114 * p[i + 2]; const dx = (i / 4) % 460 - 230, dy = Math.floor(i / 4 / 460) - 230; const on = L < 150 && dx * dx + dy * dy < 215 * 215; p[i] = 200; p[i + 1] = 22; p[i + 2] = 29; p[i + 3] = on ? 255 : 0; }
  b.putImageData(im, 0, 0); s.drawImage(bd, cx - 230, cy - 230);
  // PASS ribbon
  s.save(); s.translate(cx, cy + 150); s.rotate(-.04); s.fillStyle = C.red; s.fillRect(-185, -44, 370, 88);
  s.globalCompositeOperation = 'destination-out'; s.font = '74px ArialBlack'; s.textAlign = 'center'; s.textBaseline = 'middle'; s.fillText('PASS', 0, 4); s.restore();
  // rubber-stamp texture: uneven pressure and missing ink
  const r = rng(99); s.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < 9000; i++) { s.globalAlpha = .15 + r() * .6; const rr = .6 + r() * 3.2; s.beginPath(); s.arc(r() * N, r() * N, rr, 0, 7); s.fill(); }
  s.globalAlpha = .45; const lg = s.createLinearGradient(cx - R, cy - R, cx + R, cy + R); lg.addColorStop(0, 'rgba(0,0,0,0)'); lg.addColorStop(.55, 'rgba(0,0,0,0)'); lg.addColorStop(1, 'rgba(0,0,0,1)'); s.fillStyle = lg; s.fillRect(0, 0, N, N);
  g.save(); g.globalCompositeOperation = 'multiply'; g.translate(cx, cy); g.rotate(-.16); g.translate(-cx, -cy); g.globalAlpha = .92; g.drawImage(st, 0, 0); g.restore();
  grain(g, 21, .06);
}

async function h0415() {
  inspectionForm();
  const src = A.astra0415, t = mk(src.width, src.height), x = t.getContext('2d'); x.drawImage(src, 0, 0);
  const d = x.getImageData(0, 0, t.width, t.height), p = d.data, cxs = t.width / 2, cys = t.height / 2;
  for (let i = 0; i < p.length; i += 4) {           // drop the black backing outside the seal
    const px = (i / 4) % t.width - cxs, py = Math.floor(i / 4 / t.width) - cys, rr = Math.hypot(px, py) / (t.width / 2);
    const L = .299 * p[i] + .587 * p[i + 1] + .114 * p[i + 2];
    if (rr > .9 && L < 60) p[i + 3] = 0;
  }
  x.putImageData(d, 0, 0);
  const size = 700, cx = 700, cy = 790;
  g.save(); g.translate(cx, cy); g.rotate(-.12);
  g.shadowColor = 'rgba(40,25,10,.35)'; g.shadowBlur = 30; g.shadowOffsetY = 14;
  g.drawImage(t, -size / 2, -size / 2, size, size); g.restore();
  grain(g, 22, .05);
}

/* ================================================================ 0416 — hybrid: Astra draws the ape, Claude sets the poster */
function trimAlpha(img) {
  const t = mk(img.width, img.height), x = t.getContext('2d'); x.drawImage(img, 0, 0);
  const d = x.getImageData(0, 0, t.width, t.height).data; let x0 = t.width, y0 = t.height, x1 = 0, y1 = 0;
  for (let yy = 0; yy < t.height; yy += 2) for (let xx = 0; xx < t.width; xx += 2) if (d[(yy * t.width + xx) * 4 + 3] > 24) { x0 = Math.min(x0, xx); x1 = Math.max(x1, xx); y0 = Math.min(y0, yy); y1 = Math.max(y1, yy); }
  const o = mk(x1 - x0 + 1, y1 - y0 + 1); o.getContext('2d').drawImage(t, x0, y0, o.width, o.height, 0, 0, o.width, o.height); return o;
}
async function h0416() {
  paper(g, C.cream, 16);
  const ape = trimAlpha(A.cutout0416);
  // label rail
  g.fillStyle = C.ink; g.font = '700 26px Mono'; g.fillText('Nº 0416', 64, 92);
  g.font = '500 22px Mono'; g.fillText('CHAOS MONKEYS · SPECIMEN', 200, 92);
  g.textAlign = 'right'; g.fillText('APES ON KEYS', N - 64, 92); g.textAlign = 'left';
  g.fillRect(64, 112, N - 128, 4);
  // the word behind the ape
  const word = 'ZERO-SHOT'; let size = 560; g.font = `${size}px Bebas`;
  const mw = g.measureText(word).width; if (mw > N - 90) { size *= (N - 90) / mw; g.font = `${size}px Bebas`; }
  const base = 468;
  g.textAlign = 'center'; g.fillStyle = C.red; g.fillText(word, N / 2, base); g.textAlign = 'left';
  halftoneRect(g, 0, base - size * .72, N, size * .76, C.dark, 12, 2.2, .18);
  // the ape throws its shadow onto the type, then sits in front of it
  const h = 690, w = ape.width * h / ape.height, ax = N / 2 - w / 2 + 20, ay = 1112 - h;
  const sh = mk(), sx = sh.getContext('2d'); sx.filter = 'blur(14px)'; sx.drawImage(ape, ax + 36, ay + 18, w, h);
  sx.filter = 'none'; sx.globalCompositeOperation = 'source-in'; sx.fillStyle = 'rgba(60,20,10,.34)'; sx.fillRect(0, 0, N, N);
  g.drawImage(sh, 0, 0);
  g.drawImage(ape, ax, ay, w, h);
  // slogan bar
  g.fillStyle = C.ink; g.fillRect(0, 1120, N, 134);
  poster(g, 'NO EXAMPLES. NO PROBLEM. NO IDEA.', N / 2, 1210, 52, { shadow: null, stroke: null, align: 'center' });
  inkWear(g, 23, .6); grain(g, 24, .06);
}
window.renderMonkey = async function (id) {
  g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; g.clearRect(0, 0, N, N);
  await ({ '0413': m0413, '0414': m0414, '0415': m0415, 'h0415': h0415, 'h0416': h0416 })[id]();
  return cv.toDataURL('image/png');
};
window.READY = false;
(async () => {
  try {
    await Promise.all(['64px ArialBlack', '30px Mono', '700 30px Mono', '40px Bebas', '40px DIN'].map(f => document.fonts.load(f)));
    A.figure = await load('assets/figure.png'); A.badge = await load('assets/badge.png'); A.astra0415 = await load('assets/astra-0415.png'); try { A.cutout0416 = await load('assets/astra-0416-cutout.png'); } catch {}
    window.READY = true;
  } catch (e) { window.ERROR = String(e && e.stack || e); }
})();
