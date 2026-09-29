'use strict';
/* A-OK — Infinite Apes. The seven sections of the film. */

/* ================================================================== 01 NOISE — infinite apes typing */
const TY = { fs: 20, cw: 12, ch: 24, cols: 0, rows: 0, ox: 0, oy: 0 };
let TAU, CHR, RED, INSIDE, LOCK, APES = [], KEYLOG = [], KEYDENSITY = new Float32Array(TOTAL);
const MASH = 'asdfjkl;ghqwertyuiopzxcvbnm,./ASDFJKLQWERTYUIOPZXCVBNM1234567890!@#$%^&*()-=_+[]{}:<>?';
const NEAR = ['A-0K', 'A-PK', 'S-OK', 'A-OJ', 'A_OK', 'A=OK', '@-OK', 'A-OL', 'Q-OK', 'A-KO', 'AOK', 'A-O', 'a-ok', 'A-0k', 'OK-A'];
const HERO = { r: 0, c: 0 };
const zoomS = f => lerp(5.2, 1, E.inOutCubic(inv(0, 58, f)));
const cellX = c => TY.ox + c * TY.cw, cellY = r => TY.oy + r * TY.ch;
const HERO_TEXT = 'jfk A-0K ;q4 A-PK s-ok A=OK @-OL 7A-O', HERO_V = .3, HERO_LEN = HERO_TEXT.length;
/* One camera for spawning and drawing: centred on the hero's line, easing out to the whole field. */
function camAt(f) {
  const hk = clamp(f * HERO_V, 0, HERO_LEN), e = E.inOutCubic(inv(0, 58, f));
  const midX = cellX(HERO.c) + (hk + 1) * TY.cw / 2, hy = cellY(HERO.r) + TY.ch / 2;
  return [lerp(midX, W / 2, e), lerp(hy, H / 2, e)];
}

function setupTyping() {
  const x = g2(scratch); x.font = '500 20px Mono'; TY.cw = x.measureText('M').width;
  TY.cols = Math.ceil(W / TY.cw) + 1; TY.rows = Math.ceil(H / TY.ch) + 1;
  TY.ox = (W - TY.cols * TY.cw) / 2; TY.oy = (H - TY.rows * TY.ch) / 2;
  const N = TY.cols * TY.rows;
  TAU = new Float32Array(N).fill(1e9); CHR = new Uint8Array(N); RED = new Uint8Array(N);
  INSIDE = new Uint8Array(N); LOCK = new Float32Array(N).fill(1e9);
  HERO.r = Math.floor(TY.rows / 2) + 3; HERO.c = Math.floor(TY.cols * .38);
  const R = rng(20260927);
  const glyph = s => { let i = MASH.indexOf(s); if (i < 0) { i = MASH.length + '-0_=@AOKQPSJLkoa'.indexOf(s); } return i; };
  const ALPH = MASH + '-0_=@AOKQPSJLkoa';
  TY.alph = ALPH;
  // Each ape types a run of keyboard mash, sometimes a near-miss of A-OK, rarely the real thing.
  function typeRun(ape) {
    const seq = []; let k = 0;
    while (seq.length < ape.len) {
      const roll = R();
      if (roll < .12) { const w = NEAR[Math.floor(R() * NEAR.length)]; for (const ch of w) seq.push([ch, 0]); seq.push([' ', 0]); }
      else if (roll < .132) { for (const ch of 'A-OK') seq.push([ch, 1]); seq.push([' ', 0]); }
      else { const n = 2 + Math.floor(R() * 7); for (let i = 0; i < n; i++) seq.push([MASH[Math.floor(R() * MASH.length)], 0]); if (R() < .6) seq.push([' ', 0]); }
      if (++k > 99) break;
    }
    return seq.slice(0, ape.len);
  }
  const visRect = f => { const s = zoomS(f), [cx, cy] = camAt(f); return { x0: cx - W / 2 / s, x1: cx + W / 2 / s, y0: cy - H / 2 / s, y1: cy + H / 2 / s }; };
  APES = [{ r: HERO.r, c0: HERO.c, t0: 0, v: HERO_V, len: HERO_LEN, hero: true }];
  for (let f = 4; f < 92; f += .25) {
    const target = f < 56 ? Math.pow(2, f / 6.2) : Math.min(2600, Math.pow(2, 56 / 6.2) * Math.pow(2, (f - 56) / 5));
    while (APES.length < target) {
      const v = visRect(f);
      const c0 = Math.floor((lerp(v.x0, v.x1, R()) - TY.ox) / TY.cw) - 4, r = Math.floor((lerp(v.y0, v.y1, R()) - TY.oy) / TY.ch);
      if (r < 0 || r >= TY.rows) continue;
      APES.push({ r, c0: Math.max(0, c0), t0: f + R() * .25, v: lerp(.35, 2.6, inv(0, 80, f)) * (.55 + R() * .9), len: 6 + Math.floor(R() * 46) });
    }
  }
  for (const ape of APES) {
    ape.seq = typeRun(ape);
    if (ape.hero) ape.seq = [...HERO_TEXT].map(ch => [ch, 0]);
    for (let k = 0; k < ape.seq.length; k++) {
      const c = ape.c0 + k; if (c >= TY.cols) break;
      const t = ape.t0 + k / ape.v, i = ape.r * TY.cols + c;
      if (ape.seq[k][0] === ' ') continue;
      if (t < TAU[i]) { TAU[i] = t; CHR[i] = Math.max(0, ALPH.indexOf(ape.seq[k][0])); RED[i] = ape.seq[k][1]; }
    }
  }
  // The signal: cells under Blender's cap-text mask lock into A-OK, sweeping left to right.
  const { x0, x1 } = MASK.box;
  for (let r = 0; r < TY.rows; r++) for (let c = 0; c < TY.cols; c++) {
    const i = r * TY.cols + c, cx = cellX(c) + TY.cw / 2, cy = cellY(r) + TY.ch / 2;
    const m = (MASK.at(cx, cy) + MASK.at(cx - TY.cw * .3, cy) + MASK.at(cx + TY.cw * .3, cy) + MASK.at(cx, cy - TY.ch * .3) + MASK.at(cx, cy + TY.ch * .3)) / 5;
    if (m > .5) {
      INSIDE[i] = 1;
      const u = (cx - x0) / (x1 - x0);
      LOCK[i] = 59 + Math.floor((u * .62 + rnd(c, r, 5) * .38) * 36 / 3.5) * 3.5;
      TAU[i] = Math.min(TAU[i], LOCK[i] - 3 - rnd(c, r, 9) * 10);
    }
  }
  // Keystrokes for the sound design: every hero key, the first colony keys, then density.
  for (let k = 0; k < APES[0].seq.length; k++) KEYLOG.push({ t: APES[0].t0 + k / APES[0].v, hero: 1, pan: 0 });
  for (let a = 1; a < Math.min(APES.length, 60); a++) {
    const ape = APES[a];
    for (let k = 0; k < ape.seq.length; k += 1) { const t = ape.t0 + k / ape.v; if (t < 60) KEYLOG.push({ t, hero: 0, pan: (ape.c0 / TY.cols) * 2 - 1 }); }
  }
  for (let i = 0; i < TAU.length; i++) if (TAU[i] < TOTAL) KEYDENSITY[Math.floor(TAU[i])] += 1;
}

function apesAt(f) { let n = 0; for (const a of APES) if (a.t0 <= f) n++; return f < 60 ? n : n * Math.pow(2, (f - 60) / 2.2); }
function keysAt(f) { let s = 0; for (let i = 0; i <= Math.min(f, TOTAL - 1); i++) s += KEYDENSITY[i]; return f < 60 ? s : s * Math.pow(2, (f - 60) / 2.4); }

function actNoise(ctx, f) {
  fill(ctx, C.ink);
  // every hero keystroke nudges the lens, so picture and sound click together
  const since = ((f - APES[0].t0) % (1 / APES[0].v) + 1 / APES[0].v) % (1 / APES[0].v);
  const s = zoomS(f) * (1 + .028 * Math.exp(-since / 1.1) * (1 - inv(20, 44, f)));
  // Camera starts on the hero's cursor and eases out to the full field.
  const [camX, camY] = camAt(f);
  const toS = (x, y) => [(x - camX) * s + W / 2, (y - camY) * s + H / 2];
  const wx0 = camX - W / 2 / s, wx1 = camX + W / 2 / s, wy0 = camY - H / 2 / s, wy1 = camY + H / 2 / s;
  const c0 = Math.max(0, Math.floor((wx0 - TY.ox) / TY.cw) - 1), c1 = Math.min(TY.cols - 1, Math.ceil((wx1 - TY.ox) / TY.cw) + 1);
  const r0 = Math.max(0, Math.floor((wy0 - TY.oy) / TY.ch) - 1), r1 = Math.min(TY.rows - 1, Math.ceil((wy1 - TY.oy) / TY.ch) + 1);
  const outside = 1 - E.inQuad(inv(66, 104, f));
  const solid = inv(106, 111, f);
  const heavy = `900 ${TY.fs * s}px Mono`, med = `500 ${TY.fs * s}px Mono`;
  ctx.save(); ctx.textBaseline = 'middle'; ctx.textAlign = 'center';
  const PH = 'A-OK';
  // pass 1: the colony's text
  ctx.font = med;
  for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) {
    const i = r * TY.cols + c; const tau = TAU[i]; if (tau > f) continue;
    const [x, y] = toS(cellX(c) + TY.cw / 2, cellY(r) + TY.ch / 2);
    if (INSIDE[i] && f >= LOCK[i]) continue;
    const age = f - tau;
    let a, col = C.cream;
    if (age < 1.5) { a = 1; col = C.white; } else a = lerp(.95, .38, clamp((age - 1.5) / 9));
    if (rnd(i, Math.floor(f / 2)) < .012) a = .9;
    if (RED[i]) { col = C.redHot; a = Math.max(a, .9); }
    if (!INSIDE[i]) a *= outside;
    if (a < .02) continue;
    ctx.globalAlpha = a; ctx.fillStyle = col;
    const ch = INSIDE[i] && f > 40 && rnd(i, Math.floor(f)) < .3 ? TY.alph[h32(i + f * 31) % TY.alph.length] : TY.alph[CHR[i]];
    ctx.fillText(ch, x, y);
  }
  // pass 2: locked signal cells
  ctx.font = heavy;
  for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) {
    const i = r * TY.cols + c; if (!INSIDE[i] || f < LOCK[i]) continue;
    const [x, y] = toS(cellX(c) + TY.cw / 2, cellY(r) + TY.ch / 2);
    const age = f - LOCK[i];
    if (solid > 0) { ctx.globalAlpha = solid; ctx.fillStyle = C.cream; ctx.fillRect(x - TY.cw * s / 2 - .6, y - TY.ch * s / 2 - .6, TY.cw * s + 1.2, TY.ch * s + 1.2); }
    ctx.globalAlpha = 1 - solid * .9;
    ctx.fillStyle = age < 2 ? C.redHot : age < 4 ? C.white : C.cream;
    ctx.fillText(PH[(c + r * 2) % 4], x, y);
  }
  // cursors: the hero keeps a glowing block; a third of the colony shows thin carets
  if (f < 102) for (const [a, ape] of APES.entries()) {
    if (f < ape.t0 || (!ape.hero && a % 3)) continue;
    const k = Math.floor((f - ape.t0) * ape.v); if (k >= ape.seq.length) continue;
    const c = ape.c0 + k; if (c < c0 || c > c1 || ape.r < r0 || ape.r > r1) continue;
    const [x, y] = toS(cellX(c), cellY(ape.r));
    ctx.fillStyle = C.redHot;
    if (ape.hero) {
      ctx.globalAlpha = f < 3 ? (Math.floor(f / 2) % 2 ? 0 : 1) : 1;
      ctx.shadowColor = C.redHot; ctx.shadowBlur = 18 * s;
      ctx.fillRect(x, y + TY.ch * s * .08, TY.cw * s, TY.ch * s * .84); ctx.shadowBlur = 0;
    } else {
      ctx.globalAlpha = .9 * outside;
      ctx.fillRect(x, y + TY.ch * s * .12, Math.max(1.5, 2 * s), TY.ch * s * .76);
    }
  }
  ctx.restore();
  // the match lands: a thin red lock frame around the signal
  if (f >= 96) {
    const b = MASK.box, k = E.outExpo(inv(96, 104, f)), pad2 = lerp(80, 26, k);
    cornerTicks(ctx, b.x0 - pad2, b.y0 - pad2, b.x1 + pad2, b.y1 + pad2, 26, C.redHot, k);
    text(ctx, 'MATCH FOUND', b.x0 - pad2, b.y0 - pad2 - 16, { font: '700 13px Mono', color: C.redHot, track: 2.5, alpha: k });
    text(ctx, `P = 1.000000`, b.x1 + pad2, b.y0 - pad2 - 16, { font: '500 13px Mono', color: C.cream, track: 1.5, align: 'right', alpha: k * .8 });
  }
}

/* ================================================================== 02 SIGNAL — the cap becomes the figure */
const WORDS = [[126, 'APES', 'solid', C.ink], [140, 'ON', 'outline', C.red], [154, 'KEYS', 'solid', C.red]];
const wordsC = makeCanvas();
async function actSignal(ctx, f) {
  const img = await renderImg('paint', f);
  fill(ctx, C.cream);
  // soft floor falloff so the figure sits in space
  const gr = ctx.createRadialGradient(W / 2, H * .9, 50, W / 2, H * .9, W * .7);
  gr.addColorStop(0, 'rgba(255,250,240,.55)'); gr.addColorStop(1, 'rgba(210,196,170,.0)');
  ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H);
  let bump = 1;
  for (const [t] of WORDS) { const d = f - t; if (d >= 0 && d < 12) bump += .022 * Math.exp(-d / 2.6); }
  const active = WORDS.filter(w => f >= w[0]).pop();
  if (active) {
    const [t, word, style, col] = active, d = f - t;
    const w = g2(wordsC); reset(w); w.clearRect(0, 0, W, H);
    const k = E.outExpo(clamp(d / 7));
    let size = 1180; w.font = `400 ${size}px Bebas`;
    const mw = w.measureText(word).width; if (mw > W * .97) { size *= W * .97 / mw; w.font = `400 ${size}px Bebas`; }
    const sc = lerp(1.22, 1, k) + d * .0022;
    w.translate(W / 2, H * .55); w.scale(sc, sc); w.translate(0, lerp(60, 0, k));
    w.textAlign = 'center'; w.textBaseline = 'middle';
    if (style === 'outline') { w.lineWidth = 12; w.strokeStyle = col; w.lineJoin = 'miter'; w.strokeText(word, 0, size * .04); }
    else { w.fillStyle = col; w.fillText(word, 0, size * .04); }
    reset(w);
    // the figure throws a shadow onto the letters, as if they were a wall behind it
    w.globalCompositeOperation = 'source-atop'; w.globalAlpha = .38; w.filter = 'brightness(0) blur(16px)';
    w.drawImage(img, 54, 22, W, H); reset(w);
    ctx.globalAlpha = clamp((d + 1) / 1.6); ctx.drawImage(wordsC, 0, 0); ctx.globalAlpha = 1;
  }
  ctx.save(); ctx.translate(W / 2, H * .62); ctx.scale(bump, bump); ctx.translate(-W / 2, -H * .62);
  ctx.drawImage(img, 0, 0, W, H); ctx.restore();
}

/* ================================================================== 03 MODEL — mesh → sculpt → paint */
const SCAN_A = [171, 186, 690, 1270], SCAN_B = [184, 199, 680, 1290];
function scanPos(f, a, b, x0, x1) { const t = inv(a, b, f); return f < a ? -40 : lerp(x0, x1, t - Math.sin(t * Math.PI * 2) / (Math.PI * 2) * .55); }
function drawTechGrid(ctx, f, alpha = 1) {
  ctx.save(); ctx.globalAlpha = alpha;
  for (let x = 0; x <= W; x += 60) { ctx.fillStyle = x % 240 === 0 ? 'rgba(241,232,214,.075)' : 'rgba(241,232,214,.035)'; ctx.fillRect(x, 0, 1, H); }
  for (let y = 0; y <= H; y += 60) { ctx.fillStyle = y % 240 === 0 ? 'rgba(241,232,214,.075)' : 'rgba(241,232,214,.035)'; ctx.fillRect(0, y, W, 1); }
  ctx.restore();
}
function callout(ctx, f, t0, t1, pt, label, sub, dir = 1, rise = -90) {
  if (!pt || f < t0 || f > t1 || pt[2] <= 0) return;
  const k = E.outExpo(inv(t0, t0 + 6, f)) * (1 - E.inQuad(inv(t1 - 4, t1, f)));
  if (k <= 0) return;
  const [x, y] = pt, ex = x + dir * 70, ey = y + rise, lx = ex + dir * 150;
  ctx.save(); ctx.globalAlpha = k; ctx.strokeStyle = C.cream; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(x, y, 7 * k, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = C.redHot; ctx.beginPath(); ctx.arc(x, y, 2.5, 0, Math.PI * 2); ctx.fill();
  const p = E.outCubic(inv(t0 + 1, t0 + 8, f));
  ctx.beginPath(); ctx.moveTo(x + dir * 7, y - 5); const mx = lerp(x, ex, p), my = lerp(y, ey, p); ctx.lineTo(mx, my);
  if (p >= 1) ctx.lineTo(lerp(ex, lx, E.outCubic(inv(t0 + 8, t0 + 12, f))), ey);
  ctx.stroke();
  const tx = dir > 0 ? ex + 8 : ex - 8, al = dir > 0 ? 'left' : 'right';
  text(ctx, scramble(label, inv(t0 + 5, t0 + 13, f), label.length, f), tx, ey - 12, { font: '700 17px Mono', color: C.cream, track: 2.4, align: al });
  text(ctx, scramble(sub, inv(t0 + 7, t0 + 15, f), sub.length + 3, f), tx, ey + 22, { font: '500 13px Mono', color: C.redHot, track: 1.4, align: al });
  ctx.restore();
}
async function actModel(ctx, f) {
  const [paint, clay, wire] = await Promise.all([renderImg('paint', f), renderImg('clay', f), renderImg('wire', f)]);
  fill(ctx, C.ink); drawTechGrid(ctx, f);
  const sA = f > SCAN_A[1] ? W + 40 : scanPos(f, ...SCAN_A), sB = f > SCAN_B[1] ? W + 40 : scanPos(f, ...SCAN_B);
  ctx.drawImage(wire, 0, 0, W, H);
  for (const [img, sx] of [[clay, sA], [paint, sB]]) {
    if (sx <= 0) continue;
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, clamp(sx, 0, W), H); ctx.clip(); ctx.fillStyle = C.ink;
    ctx.globalCompositeOperation = 'source-over'; ctx.drawImage(img, 0, 0, W, H); ctx.restore();
  }
  // scanner heads
  for (const [sx, name, [a, b]] of [[sA, 'SCULPT', SCAN_A], [sB, 'PAINT', SCAN_B]]) {
    if (f < a || f > b) continue;
    const gl = ctx.createLinearGradient(sx - 150, 0, sx, 0);
    gl.addColorStop(0, 'rgba(255,43,43,0)'); gl.addColorStop(1, 'rgba(255,43,43,.15)');
    ctx.fillStyle = gl; ctx.fillRect(sx - 150, 0, 150, H);
    ctx.save(); ctx.shadowColor = C.redHot; ctx.shadowBlur = 30; ctx.fillStyle = '#FFD9D9'; ctx.fillRect(sx - 1.5, 0, 3, H); ctx.restore();
    text(ctx, `▸ ${name}`, sx + 12, H * .5 - 8, { font: '700 13px Mono', color: C.redHot, track: 2 });
    text(ctx, `X ${pad(Math.max(0, sx), 4)}`, sx + 12, H * .5 + 14, { font: '500 12px Mono', color: C.cream, track: 1.2, alpha: .7 });
  }
  // stage chips
  const stage = f < SCAN_A[0] + 7 ? 0 : f < SCAN_B[0] + 7 ? 1 : 2;
  let x = 96;
  for (const [i, s] of ['01 MESH', '02 SCULPT', '03 PAINT'].entries()) {
    const w = measure(ctx, s, '700 12px Mono', 2) + 24, on = i === stage;
    ctx.fillStyle = on ? C.redHot : 'rgba(241,232,214,.08)'; ctx.fillRect(x, 108, w, 26);
    text(ctx, s, x + 12, 126, { font: '700 12px Mono', color: on ? C.white : C.cream, track: 2, alpha: on ? 1 : .6 });
    x += w + 8;
  }
  // dimension line while the whole figure is in frame
  const top = track('III', f, 'head_top'), feet = track('III', f, 'feet');
  const dk = (1 - inv(188, 196, f)) * E.outExpo(inv(169, 178, f));
  if (top && feet && dk > 0) {
    const dx = Math.min(top[0], feet[0]) - 230;
    ctx.save(); ctx.globalAlpha = dk; ctx.strokeStyle = C.cream; ctx.lineWidth = 1.2; ctx.beginPath();
    ctx.moveTo(dx, top[1]); ctx.lineTo(dx, feet[1]); ctx.moveTo(dx - 10, top[1]); ctx.lineTo(dx + 10, top[1]); ctx.moveTo(dx - 10, feet[1]); ctx.lineTo(dx + 10, feet[1]); ctx.stroke();
    ctx.translate(dx - 16, (top[1] + feet[1]) / 2); ctx.rotate(-Math.PI / 2);
    text(ctx, '100 MM · 4.0 IN', 0, 0, { font: '700 13px Mono', color: C.cream, track: 2.2, align: 'center' });
    ctx.restore();
  }
  callout(ctx, f, 176, 196, track('III', f, 'cup_r'), 'CANS', 'RED · BLACK · WHITE', 1, -110);
  callout(ctx, f, 186, 206, track('III', f, 'chest'), 'HOODIE', 'VERMILION 0.40/0.003/0.009', -1, 120);
  callout(ctx, f, 196, 212, track('III', f, 'eye_l'), 'IRIS', 'PROCEDURAL · 71 FIBERS', 1, -120);
  callout(ctx, f, 199, 213, track('III', f, 'cap_text'), 'CAP INK', 'ARIAL BLACK · CONFORMAL', -1, -70);
  // the dive: the O-mouth swallows the frame
  const m = track('III', f, 'mouth');
  if (m && f >= 218) {
    const lens = track('III', f, '_lens'), focal = lens / 36 * W;
    const r0 = 1.7 * focal / Math.max(1, m[2]);
    const r = lerp(r0, 1400, E.inQuart(inv(218, 223, f)));
    ctx.save(); ctx.fillStyle = '#060404'; ctx.shadowColor = '#060404'; ctx.shadowBlur = 60;
    ctx.beginPath(); ctx.ellipse(m[0], m[1] + r * .05, r * .95, r * 1.1, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  }
}

/* ================================================================== 04 INFINITE — the archive */
const P02_MOUTH = [448, 532];
const GAP = .045;   // the keyboard ape's O-mouth, in its 1024px artwork
function posterCell(i, j, f) {
  if (i === 0 && j === 0 && f < 256) return POSTERS[2];
  const phase = Math.floor((f - 238) / 7 + rnd(i, j, 3) * 3);
  const k = Math.floor(rnd(i, j, phase) * POSTERS.length);
  return POSTERS[k];
}
function drawPosterSquare(ctx, p, x, y, s) {
  const im = p.img, side = Math.min(im.width, im.height);
  ctx.drawImage(im, (im.width - side) / 2, (im.height - side) / 2, side, side, x, y, s, s);
}
function actInfinite(ctx, f) {
  fill(ctx, C.ink);
  const P = POSTERS[2];
  if (f < 238) {
    // Pull out of the poster ape's mouth.
    const e = E.outQuart(inv(224, 238, f));
    const S = Math.exp(lerp(Math.log(30), Math.log(1080 / 1024), e));
    const ax = lerp(P02_MOUTH[0], 512, e), ay = lerp(P02_MOUTH[1], 512, e);
    ctx.save(); ctx.translate(W / 2, H / 2); ctx.scale(S, S); ctx.translate(-ax, -ay);
    ctx.drawImage(P.img, 0, 0, 1024, 1024);
    // neighbours start arriving before the pull-back ends
    const nb = inv(232, 238, f);
    if (nb > 0) for (const [i, j] of [[-1, 0], [1, 0], [-2, 0], [2, 0]]) { ctx.globalAlpha = nb; drawPosterSquare(ctx, posterCell(i, j, 238), i * 1024 * (1 + GAP), 0, 1024); }
    ctx.restore(); return;
  }
  // The archive: one ape becomes infinite apes.
  const e = inv(238, 280, f);
  const zoom = Math.exp(lerp(Math.log(1080 * (1 + GAP)), Math.log(96), E.inOutCubic(e)));   // cell pitch in px
  const gap = zoom - zoom / (1 + GAP);
  const n = Math.ceil(W / zoom / 2) + 2, m = Math.ceil(H / zoom / 2) + 2;
  for (let j = -m; j <= m; j++) for (let i = -n; i <= n; i++) {
    const x = W / 2 + i * zoom - (zoom - gap) / 2, y = H / 2 + j * zoom - (zoom - gap) / 2;
    if (x > W || y > H || x + zoom < 0 || y + zoom < 0) continue;
    const early = j === 0 && Math.abs(i) <= 2;
    const pop = early ? 1 : E.outBack(clamp((f - 236 - (Math.abs(i) + Math.abs(j)) * .7) / 5));
    const s = (zoom - gap) * clamp(pop, 0, 1.1);
    drawPosterSquare(ctx, posterCell(i, j, f), x + (zoom - gap - s) / 2, y + (zoom - gap - s) / 2, s);
  }
  // Knockout words: the archive shows through the letters.
  for (const [t, word, col] of [[252, 'INFINITE', C.red], [266, 'APES', C.ink]]) {
    const d = f - t; if (d < 0 || d >= 11) continue;
    const w = g2(scratch2); reset(w); w.clearRect(0, 0, W, H);
    w.fillStyle = col; w.fillRect(0, 0, W, H);
    let size = 900; w.font = `400 ${size}px Bebas`; const mw = w.measureText(word).width; if (mw > W * .94) size *= W * .94 / mw;
    w.font = `400 ${size}px Bebas`; w.textAlign = 'center'; w.textBaseline = 'middle';
    const k = E.outExpo(clamp(d / 6)), sc = lerp(1.35, 1, k) + d * .006;
    w.translate(W / 2, H / 2 + size * .04); w.scale(sc, sc);
    w.globalCompositeOperation = 'destination-out'; w.fillText(word, 0, 0); reset(w);
    ctx.drawImage(scratch2, 0, 0);
  }
}

/* ================================================================== 05 WEAR — the catalog */
const CATALOG_START = 280, ITEM = 7;
function actWear(ctx, f) {
  fill(ctx, C.ink);
  const prods = IMG.products, n = prods.length;
  const idx = clamp(Math.floor((f - CATALOG_START) / ITEM), 0, n - 1);
  const intro = E.outExpo(inv(279, 283, f));
  text(ctx, 'NERD STREETWEAR', 96, 190, { font: '400 44px Bebas', color: C.cream, track: 2, alpha: intro });
  text(ctx, '(FOR REAL)', 96 + measure(ctx, 'NERD STREETWEAR', '400 44px Bebas', 2) + 14, 190, { font: '400 44px Bebas', color: C.redHot, track: 2, alpha: intro });
  text(ctx, `${pad(idx + 1, 2)} / ${pad(n, 2)}`, 1000, 190, { font: '500 14px Mono', color: C.cream, align: 'right', track: 2, alpha: intro * .7 });
  const y0 = 262, lh = 88;
  // highlight bar glides between rows
  const prevIdx = Math.max(0, idx - 1), since = f - (CATALOG_START + idx * ITEM);
  const barY = y0 + lh * lerp(prevIdx, idx, E.outExpo(clamp(since / 4))) - 4;
  ctx.fillStyle = C.red; ctx.fillRect(84, barY, lerp(0, 940, intro), lh - 10);
  for (let i = 0; i < n; i++) {
    const p = prods[i], y = y0 + i * lh, rowIn = E.outExpo(inv(279 + i * .5, 284 + i * .5, f));
    const on = i === idx;
    ctx.save(); ctx.beginPath(); ctx.rect(84, y - 6, 960, lh); ctx.clip();
    const dy = lerp(lh, 0, rowIn);
    text(ctx, pad(i + 1, 2), 104, y + 52 + dy, { font: '500 15px Mono', color: C.cream, track: 1, alpha: on ? 1 : .45 });
    text(ctx, p.name, 150, y + 66 + dy, { font: '400 72px Bebas', color: C.cream, track: 1.5, alpha: on ? 1 : .32 });
    text(ctx, `${p.kind} · ${p.price}`, 1004, y + 52 + dy, { font: '500 14px Mono', color: C.cream, align: 'right', track: 1.5, alpha: on ? 1 : .35 });
    ctx.restore();
  }
  // product card
  const cx = 1140, cy = 150, cw = 640, chh = 800;
  const flip = E.outExpo(clamp(since / 4));
  const p = prods[idx];
  ctx.save(); ctx.beginPath(); ctx.rect(cx, cy, cw, chh); ctx.clip();
  ctx.fillStyle = '#1b1a1a'; ctx.fillRect(cx, cy, cw, chh);
  const sc = lerp(1.12, 1, flip);
  ctx.translate(cx + cw / 2, cy + chh / 2); ctx.scale(sc, sc); ctx.translate(-(cx + cw / 2), -(cy + chh / 2));
  ctx.globalAlpha = intro; ctx.drawImage(p.img, cx, cy, cw, chh);
  ctx.restore();
  // wipe: a red panel sweeps across as the card changes
  if (since < 4 && f > CATALOG_START + 1) { const wx = lerp(cx, cx + cw, E.inOutCubic(since / 4)); ctx.fillStyle = C.red; ctx.fillRect(wx - 60, cy, 60, chh); }
  // price sticker + sizes
  const st = E.outBack(clamp(since / 5));
  ctx.save(); ctx.translate(cx + cw - 70, cy + 70); ctx.rotate(-.18); ctx.scale(st, st);
  ctx.fillStyle = C.redHot; ctx.beginPath(); ctx.arc(0, 0, 58, 0, Math.PI * 2); ctx.fill();
  text(ctx, p.price, 0, 17, { font: '400 50px Bebas', color: C.white, align: 'center' });
  ctx.restore();
  let sx = cx;
  for (const s of ['XS', 'S', 'M', 'L', 'XL', '2XL']) {
    const w = measure(ctx, s, '700 13px Mono', 1) + 22;
    ctx.strokeStyle = 'rgba(241,232,214,.5)'; ctx.lineWidth = 1; ctx.strokeRect(sx + .5, cy + chh + 18.5, w, 28);
    text(ctx, s, sx + 11, cy + chh + 37, { font: '700 13px Mono', color: C.cream, track: 1, alpha: .85 });
    sx += w + 6;
  }
}

/* ================================================================== 06 PLAY — 8-bit, three UBI credits */
const PX = 16, BX0 = (W - 64 * PX) / 2, BY0 = (H - 64 * PX) / 2;
let BADGE8 = null;
const wearFreeze = makeCanvas(), smallC = makeCanvas(W / 2, H / 2);
let wearFrozen = false;
function readBadge8() {
  const c = makeCanvas(64, 64), x = g2(c); x.drawImage(IMG.badge8, 0, 0);
  const d = x.getImageData(0, 0, 64, 64).data; BADGE8 = [];
  for (let i = 0; i < 64 * 64; i++) BADGE8.push(`rgb(${d[i * 4]},${d[i * 4 + 1]},${d[i * 4 + 2]})`);
}
const PXBG = 'rgb(236,214,170)', GROUT = 'rgb(214,188,140)';
function pixelText(ctx, str, x, y, scale, color, align = 'left') {
  const c = makeCanvas(str.length * 8 + 4, 12), t = g2(c);
  t.font = '700 10px Mono'; t.textBaseline = 'top'; t.fillStyle = '#000'; t.fillText(str, 1, 1);
  const w = Math.ceil(t.measureText(str).width) + 2, d = t.getImageData(0, 0, c.width, 12).data;
  const x0 = align === 'center' ? x - w * scale / 2 : align === 'right' ? x - w * scale : x;
  ctx.fillStyle = color;
  for (let j = 0; j < 12; j++) for (let i = 0; i < c.width; i++) if (d[(j * c.width + i) * 4 + 3] > 110) ctx.fillRect(x0 + i * scale, y + j * scale, scale - .5, scale - .5);
}
function actPlay(ctx, f) {
  if (!wearFrozen) { actWear(g2(wearFreeze), 335); wearFrozen = true; }
  // 1) the catalog crumbles into pixels on sixteenth notes
  const steps = [336, 339.5, 343, 346.5];
  let block = 1; for (const [i, t] of steps.entries()) if (f >= t) block = [2, 4, 8, 16][i];
  const sw = Math.ceil(W / block), shh = Math.ceil(H / block);
  const sm = g2(smallC); reset(sm); sm.imageSmoothingEnabled = true; sm.drawImage(wearFreeze, 0, 0, sw, shh);
  fill(ctx, PXBG);
  const cols = Math.ceil(W / PX), rows = Math.ceil(H / PX);
  if (block < 16) {
    ctx.imageSmoothingEnabled = false; ctx.drawImage(smallC, 0, 0, sw, shh, 0, 0, sw * block, shh * block); ctx.imageSmoothingEnabled = true;
    return;
  }
  const px = sm.getImageData(0, 0, cols, rows).data;
  // 2) tiles flip like a stadium card stunt, from the centre outwards, into the 8-bit badge
  const cxT = W / 2, cyT = H / 2, maxD = Math.hypot(W / 2, H / 2);
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
    const x = i * PX, y = j * PX;
    const bi = Math.floor((x - BX0) / PX), bj = Math.floor((y - BY0) / PX);
    const target = (bi >= 0 && bi < 64 && bj >= 0 && bj < 64) ? BADGE8[bj * 64 + bi] : PXBG;
    const d = Math.hypot(x + PX / 2 - cxT, y + PX / 2 - cyT) / maxD;
    const t0 = 350 + d * 24 + rnd(i, j, 77) * 6;
    const p = clamp((f - t0) / 3);
    const src = `rgb(${px[(j * cols + i) * 4]},${px[(j * cols + i) * 4 + 1]},${px[(j * cols + i) * 4 + 2]})`;
    const col = p < .5 ? src : target;
    const sy = Math.abs(Math.cos(p * Math.PI));
    ctx.fillStyle = col; ctx.fillRect(x, y + PX * (1 - sy) / 2, PX - 1, Math.max(1, PX * sy - 1));
  }
  // 3) the game's own HUD: UBI CREDITS n/3, square coins with a hole, as in /game
  const CREDIT = [350, 364, 378];
  const got = CREDIT.filter(t => f >= t + 8).length;
  if (f >= 349) {
    pixelText(ctx, `UBI CREDITS: ${got}/3`, 96, 100, 4, C.ink);
    pixelText(ctx, 'LIVES: 3', W - 96, 100, 4, C.ink, 'right');
  }
  const coin = (x, y, s, col) => { ctx.fillStyle = col; ctx.fillRect(x - s / 2, y - s / 2, s, s); ctx.fillStyle = PXBG; ctx.fillRect(x - s / 8, y - s / 8, s / 4, s / 4); };
  const slots = [0, 1, 2].map(k => [96 + 560 + k * 64, 128]);
  for (const [k, [sx, sy]] of slots.entries()) coin(sx, sy, 40, f >= CREDIT[k] + 8 ? C.redHot : 'rgba(11,11,12,.18)');
  // each credit pops on the beat beside the badge, then flies into its slot
  const spawn = [[300, 700], [1620, 640], [1500, 300]];
  for (const [k, t] of CREDIT.entries()) {
    const d = f - t; if (d < 0 || d >= 8) continue;
    const pop = E.outBack(clamp(d / 3)), fly = E.inCubic(inv(3, 8, d));
    const [x0, y0] = spawn[k], [x1, y1] = slots[k];
    const x = lerp(x0, x1, fly), y = lerp(y0, y1, fly) - Math.sin(fly * Math.PI) * 140;
    coin(x, y, lerp(96 * pop, 40, fly), C.redHot);
    ctx.globalAlpha = 1 - fly; pixelText(ctx, '+1', x0, y0 - 110, 6, C.redHot, 'center'); ctx.globalAlpha = 1;
  }
  if (f >= 386) { const blink = Math.floor((f - 386) / 2) % 2 === 0; if (blink) pixelText(ctx, 'YOU WIN!', W / 2, 1004, 5, C.redHot, 'center'); }
}

/* ================================================================== 07 A-OK — the lockup */
function actEnd(ctx, f) {
  fill(ctx, C.cream);
  const d = f - 392;
  const e = E.outExpo(inv(398, 414, f));
  const D0 = 64 * PX * .97, D1 = 600;
  const Dm = lerp(D0, D1, e), cx = lerp(W / 2, 560, e), cy = lerp(H / 2, H / 2 + 6, e);
  // resolve: pixels shrink back into the vector badge
  const blocks = [16, 8, 4, 2];
  if (d < blocks.length) {
    const b = blocks[d], s = Math.ceil(Dm / b);
    const sm = g2(smallC); reset(sm); sm.clearRect(0, 0, s, s); sm.imageSmoothingEnabled = true; sm.drawImage(IMG.badge, 0, 0, s, s);
    fill(ctx, PXBG);
    ctx.imageSmoothingEnabled = false; ctx.drawImage(smallC, 0, 0, s, s, cx - s * b / 2, cy - s * b / 2, s * b, s * b); ctx.imageSmoothingEnabled = true;
  } else {
    // shockwave ring
    const rk = inv(395, 412, f);
    if (rk < 1) { ctx.save(); ctx.strokeStyle = C.redHot; ctx.globalAlpha = 1 - rk; ctx.lineWidth = lerp(18, 1, rk); ctx.beginPath(); ctx.arc(cx, cy, Dm / 2 + E.outCubic(rk) * 700, 0, Math.PI * 2); ctx.stroke(); ctx.restore(); }
    ctx.save(); ctx.shadowColor = 'rgba(40,20,10,.28)'; ctx.shadowBlur = 50; ctx.shadowOffsetY = 18;
    ctx.drawImage(IMG.badge, cx - Dm / 2, cy - Dm / 2, Dm, Dm); ctx.restore();
  }
  // wordmark lockup
  const tx = 940;
  const wIn = E.outExpo(inv(402, 414, f));
  if (wIn > 0) {
    ctx.save(); ctx.beginPath(); ctx.rect(tx - 10, 250, 1000, 330); ctx.clip();
    text(ctx, 'A-OK', tx, 548 + lerp(330, 0, wIn), { font: '400 380px Bebas', color: C.ink, track: 4 });
    ctx.restore();
  }
  const rl = E.outExpo(inv(408, 420, f));
  ctx.fillStyle = C.red; ctx.fillRect(tx + 6, 596, 820 * rl, 6);
  const tag = inv(410, 422, f);
  if (tag > 0) text(ctx, scramble('APES ON KEYS EVERYWHERE', tag, 7, f), tx + 6, 660, { font: '600 27px Grotesk', color: C.ink, track: 9.5 });
  const url = 'A-OK.SHOP', typed = clamp(Math.floor((f - 420) / 2), 0, url.length);
  if (f >= 420) {
    text(ctx, url.slice(0, typed), tx + 6, 760, { font: '400 76px Bebas', color: C.red, track: 3 });
    const cw2 = measure(ctx, url.slice(0, typed), '400 76px Bebas', 3);
    const on = f < 420 + url.length * 2 || Math.floor((f - 420) / 7) % 2 === 0;
    if (on) { ctx.fillStyle = C.red; ctx.fillRect(tx + 6 + cw2 + 10, 700, 26, 64); }
  }
}
