'use strict';
/* A-OK — Hallucination Receipt. Act three: 08 THE MODELS, 09 THE BEST MODELS, 10 THE TOTAL, 11 KEEP THE RECEIPT. */

/* ================================================================== 08 THE MODELS (f640–703)
   WE MAY NOT LOOK LIKE MODELS: the All Angles turnaround, shot like a lookbook, one flash per beat. */
function studio(ctx) {
  fill(ctx, C.paper);
  const g = ctx.createRadialGradient(1380, 430, 40, 1380, 430, 1000);
  g.addColorStop(0, 'rgba(255,255,250,0.85)'); g.addColorStop(1, 'rgba(255,255,250,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  const fl = ctx.createLinearGradient(0, 860, 0, H); fl.addColorStop(0, 'rgba(34,34,30,0)'); fl.addColorStop(1, 'rgba(34,34,30,0.10)');
  ctx.fillStyle = fl; ctx.fillRect(0, 860, W, H - 860);
}
function cornerTicks(ctx, x0, y0, x1, y1, len = 26, color = C.ink, alpha = .7) {
  ctx.save(); ctx.strokeStyle = color; ctx.globalAlpha *= alpha; ctx.lineWidth = 2.5; ctx.beginPath();
  for (const [x, y, dx, dy] of [[x0, y0, 1, 1], [x1, y0, -1, 1], [x0, y1, 1, -1], [x1, y1, -1, -1]]) { ctx.moveTo(x, y + dy * len); ctx.lineTo(x, y); ctx.lineTo(x + dx * len, y); }
  ctx.stroke(); ctx.restore();
}
function pose(ctx, k, cx, bottom, h) {
  const v = IMG.views[k], s = h / v.height, w = v.width * s;
  ctx.save(); ctx.fillStyle = 'rgba(34,34,30,0.16)'; ctx.beginPath(); ctx.ellipse(cx, bottom - 8, w * .42, 22, 0, 0, 7); ctx.fill(); ctx.restore();
  ctx.drawImage(v, cx - w / 2, bottom - h, w, h);
}
function actModels(ctx, f) {
  studio(ctx);
  const d = f - 640, beat = Math.min(3, Math.floor(d / 16)), bd = d - beat * 16;
  heading(ctx, [{ s: 'WE MAY NOT', p: E.outCubic(inv(0, 4, d)) }, { s: 'LOOK LIKE', p: E.outCubic(inv(16, 20, d)) },
    { s: 'MODELS', period: true, p: E.outCubic(inv(32, 36, d)), pulse: 1 + .4 * Math.exp(-Math.max(0, d - 48) / 3) * (d >= 48 ? 1 : 0) }], 104, 380, 178, { lh: .86 });
  micro(ctx, 'LOOKBOOK / FW26 / NO RETOUCHING. NO IDEA.', 110, 760, { size: 18, alpha: E.outCubic(inv(4, 10, d)) });
  if (beat < 3) {
    const push = lerp(1.07, 1, E.outCubic(inv(0, 7, bd)));
    about(ctx, 1400, 900, 0, push, () => pose(ctx, beat, 1400, 930, 780));
    cornerTicks(ctx, 1030, 150, 1780, 950);
    micro(ctx, `A–OK 400 · FRAME 0${beat + 1}A ▸`, 1046, 196, { size: 18, color: C.red, weight: 800 });
    micro(ctx, ['FRONT', 'SIDE', 'BACK'][beat], 1764, 196, { size: 18, align: 'right', weight: 800 });
  } else {
    // the contact sheet: three frames on a strip, one circled in grease pencil
    const e = E.outCubic(inv(0, 6, bd));
    const sx = 990, sy = 220, sw = 880, sh = 470;
    ctx.save(); ctx.translate((1 - e) * 200, 0); ctx.globalAlpha = e;
    ctx.fillStyle = C.ink; ctx.save(); ctx.translate(10, 10); ctx.fillStyle = 'rgba(34,34,30,0.35)'; ctx.fillRect(sx, sy, sw, sh); ctx.restore();
    ctx.fillStyle = C.inkDeep; ctx.fillRect(sx, sy, sw, sh);
    ctx.fillStyle = C.paper; for (let x = sx + 18; x < sx + sw - 20; x += 40) { ctx.fillRect(x, sy + 12, 20, 14); ctx.fillRect(x, sy + sh - 26, 20, 14); }
    for (let k = 0; k < 3; k++) {
      const fx = sx + 26 + k * 282, fy = sy + 44, fw = 262, fh = sh - 88;
      ctx.fillStyle = C.paper; ctx.fillRect(fx, fy, fw, fh);
      const v = IMG.views[k], s = (fh - 20) / v.height; ctx.drawImage(v, fx + fw / 2 - v.width * s / 2, fy + 10, v.width * s, v.height * s);
      text(ctx, `0${k + 1}A`, fx + 6, fy - 12, { font: F.mono(14, 700), color: C.yellow });
    }
    ctx.restore();
    // grease pencil
    const gp = E.inOutCubic(inv(3, 11, bd));
    if (gp > 0) {
      ctx.save(); ctx.strokeStyle = C.red; ctx.lineWidth = 8; ctx.lineCap = 'round'; ctx.beginPath();
      const cx = sx + 26 + 131, cy = sy + sh / 2, rx = 164, ry = 248;
      for (let i = 0; i <= 80 * gp; i++) { const a = -2.2 + i / 80 * Math.PI * 2.15, wob = 1 + .03 * Math.sin(i * .7); const x = cx + Math.cos(a) * rx * wob, y = cy + Math.sin(a) * ry * wob; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
      ctx.stroke(); ctx.restore();
      if (gp > .7) text(ctx, '✓ SELECT', sx + 300, sy - 20, { font: F.italic(54, 900), color: C.red });
    }
    const mc = E.outBack(inv(6, 12, bd), 1.6);
    if (mc > 0) about(ctx, 1500, 860, .03, mc, () => {
      slip(ctx, 1180, 730, 620, 230, { shadow: 10 });
      micro(ctx, 'MODEL CARD', 1206, 770, { size: 17, weight: 800 });
      leader(ctx, 'MODEL', 'THE OPERATOR', 1206, 818, 568, { font: F.mono(24, 700) });
      leader(ctx, 'ANGLES', 'ALL', 1206, 862, 568, { font: F.mono(24, 700) });
      leader(ctx, 'CERTAINTY', 'NO ADDITIONAL', 1206, 906, 568, { font: F.mono(24, 700), valueColor: C.red });
    });
  }
}

/* ================================================================== 09 THE BEST MODELS (f704–767) */
let TILES = [];
function buildTiles() {
  const pool = [];
  LINEUP.forEach(p => pool.push({ img: p.image, crop: p.crop }));
  IMG.monkeys.forEach(m => pool.push({ img: m }));
  IMG.art.forEach(a => pool.push({ img: a }));
  pool.push({ img: IMG.transformer, crop: [0, .05, 1, .75] }, { img: IMG.hc2026art, crop: [0, 0, 1, .6] });
  const r = rng(31); for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
  const cols = 8, rows = 5, tw = W / cols, th = H / rows;
  TILES = [];
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
    const t = pool[(j * cols + i) % pool.length];
    const cx = (i + .5) * tw, cy = (j + .5) * th, dist = Math.hypot((cx - W / 2) / W, (cy - H / 2) / H);
    TILES.push({ ...t, cx, cy, tw, th, dist, rot: (rnd(i, j, 3) - .5) * .09, drop: rnd(i, j, 4), spin: (rnd(i, j, 5) - .5) });
  }
}
const SLAMS2 = [[704, 'BUT WE MAKE', C.ink, C.paper, null], [712, 'THE BEST', C.ink, C.yellow, null], [720, 'MODELS.', C.ink, C.red, C.paper]];
function actBest(ctx, f) {
  if (f < 728) { let cur = SLAMS2[0]; for (const sl of SLAMS2) if (f >= sl[0]) cur = sl; return slamWord(ctx, f, cur); }
  const d = f - 728;
  if (f >= 756) totalBase(ctx); else fill(ctx, C.ink);
  for (const t of TILES) {
    const appear = d - t.dist * 30, a = E.outBack(inv(0, 5, appear), 1.6);
    if (a <= 0) continue;
    const fallT = f - (756 + t.drop * 5), dy = fallT > 0 ? 9 * fallT * fallT : 0, rot = t.rot + (fallT > 0 ? fallT * t.spin * .06 : 0);
    if (dy > H + 300) continue;
    ctx.save(); ctx.translate(t.cx, t.cy + dy); ctx.rotate(rot); ctx.scale(a, 1);
    const w = t.tw - 16, h = t.th - 16;
    ctx.fillStyle = C.ink; ctx.fillRect(-w / 2 + 6, -h / 2 + 6, w, h);
    ctx.fillStyle = C.paper; ctx.fillRect(-w / 2, -h / 2, w, h);
    ctx.save(); ctx.beginPath(); ctx.rect(-w / 2 + 8, -h / 2 + 8, w - 16, h - 16); ctx.clip(); cover(ctx, t.img, -w / 2 + 8, -h / 2 + 8, w - 16, h - 16, t.crop || [0, 0, 1, 1]); ctx.restore();
    ctx.lineWidth = 2.5; ctx.strokeStyle = C.ink; ctx.strokeRect(-w / 2, -h / 2, w, h);
    ctx.restore();
  }
  // the statement, in a yellow box over the wall
  const b = E.outBack(inv(-3, 4, d), 1.8), fallB = f - 761, dyB = fallB > 0 ? 10 * fallB * fallB : 0;
  if (b > 0 && dyB < H) about(ctx, W / 2, H / 2 + dyB, -.025 + (fallB > 0 ? fallB * .02 : 0), b, () => {
    box(ctx, W / 2 - 470, H / 2 - 230, 940, 460, { fill: C.yellow, shadow: 16 });
    micro(ctx, `MODEL LINEUP · FW26 · ${CATALOG.length} PIECES · ${MONKEYS.length + 1} MONKEYS`, W / 2 - 424, H / 2 - 170, { size: 18, weight: 700 });
    heading(ctx, [{ s: 'WE MAKE THE' }, { s: 'BEST MODELS', period: true, color: C.red, periodColor: C.red }], W / 2 - 430, H / 2 - 20, 150, { lh: .86 });
  });
}

/* ================================================================== 10 THE TOTAL (f768–831)
   The Hallucination Club receipt, printed for real. */
let TOTAL_RECEIPT = null;
const TR = { w: 900, head: H - 150 };
function buildTotal() {
  const M34 = F.mono(34, 700);
  const L = [
    { t: 'text', s: 'THE APES ON KEYS COLLECTIVE', font: F.mono(22, 700), h: 50, at: -99 },
    { t: 'fn', h: 128, at: 768, dur: 6, draw: (c, x, y, w) => { const sz = Math.min(140, 140 * w / measure(c, 'HALLUCINATION CLUB', F.display(140), -2)); text(c, 'HALLUCINATION CLUB', x - 2, y + 112, { font: F.display(sz), track: -2 * sz / 140 }); } },
    { t: 'rule', h: 30, at: 774, dur: 2 },
    { t: 'leader', l: 'IDEAS', r: 'INFINITE', font: M34, h: 58, at: 776 },
    { t: 'leader', l: 'PROMPTS', r: 'JUST ONE MORE', font: M34, h: 58, at: 784 },
    { t: 'leader', l: 'AGENTS', r: 'A-OK', font: M34, h: 58, at: 792 },
    { t: 'leader', l: 'TOOLS', r: 'A-OK', font: M34, h: 58, at: 796 },
    { t: 'leader', l: 'CONTEXT', r: 'SOMETIMES', font: M34, h: 58, at: 800 },
    { t: 'leader', l: 'REALITY CHECKS', r: 'OPTIONAL', font: M34, h: 58, at: 808 },
    { t: 'rule', h: 30, at: 814, dur: 2 },
    { t: 'fn', h: 92, at: 816, dur: 4, draw: (c, x, y, w) => {
      const fnt = F.mono(38, 800);
      text(c, 'TOTAL:', x, y + 64, { font: fnt }); text(c, 'STILL HALLUCINATING', x + w * .53, y + 64, { font: fnt, align: 'center' }); text(c, 'A-OK', x + w, y + 64, { font: fnt, align: 'right' });
    } },
    { t: 'barcode', h: 120, at: 822, dur: 3, wf: .7, seed: 26 },
    { t: 'fn', h: 56, at: 825, dur: 3, draw: (c, x, y, w) => {
      const fnt = F.mono(21, 700);
      text(c, 'EST. 2026', x, y + 36, { font: fnt }); c.fillStyle = C.ink; c.fillRect(x + 150, y + 10, 3, 34);
      text(c, 'GOOD IDEAS. QUESTIONABLE SOURCES.', x + 176, y + 36, { font: fnt }); c.fillRect(x + w - 70, y + 10, 3, 34);
    } },
  ];
  TOTAL_RECEIPT = new Receipt(TR.w, L, { pad: 44 });
}
function totalBase(ctx) {
  fill(ctx, C.blue);
  printerBody(ctx, W / 2, TR.head, 1020);
}
function drawTotalReceipt(ctx, f, { lift = 0, rot = 0 } = {}) {
  const x = W / 2 - TR.w / 2;
  ctx.save(); ctx.translate(W / 2, TR.head); ctx.rotate(-.02 + rot); ctx.translate(-W / 2, -TR.head + lift);
  const y0 = TOTAL_RECEIPT.draw(ctx, x, TR.head, f, { tornTop: true });
  // the club receipt oval, stamped beside the barcode
  const bc = TOTAL_RECEIPT.lines.find(L => L.t === 'barcode');
  const sp = inv(828, 831, f);
  if (sp > 0 && y0 + bc.y < TR.head) about(ctx, x + TR.w * .84, y0 + bc.y + bc.h / 2, -.22, 1 + .7 * Math.pow(1 - E.outCubic(sp), 2), () => {
    const cx = x + TR.w * .84, cy = y0 + bc.y + bc.h / 2;
    ctx.save(); ctx.globalAlpha = Math.min(1, sp * 3); ctx.strokeStyle = C.red; ctx.lineWidth = 5; ctx.beginPath(); ctx.ellipse(cx, cy, 108, 52, 0, 0, 7); ctx.stroke();
    text(ctx, 'CLUB', cx, cy - 6, { font: F.italic(40, 900), color: C.red, align: 'center' });
    text(ctx, 'RECEIPT', cx, cy + 32, { font: F.italic(40, 900), color: C.red, align: 'center' });
    ctx.restore();
  });
  ctx.restore();
}
function actTotal(ctx, f) {
  // start close on the print head and pull out as the receipt grows
  const s = lerp(1.65, 1, E.inOutCubic(inv(768, 826, f)));
  ctx.save(); ctx.translate(W / 2, TR.head); ctx.scale(s, s); ctx.translate(-W / 2, -TR.head);
  actTotalScene(ctx, f);
  ctx.restore();
}
function actTotalScene(ctx, f) {
  totalBase(ctx);
  micro(ctx, 'THE HALLUCINATION CLUB / OPEN TO ALL', 128, 150, { size: 17, color: C.paper });
  ctx.fillStyle = C.red; ctx.beginPath(); ctx.arc(110, 144, 7, 0, 7); ctx.fill();
  asterisk(ctx, 250, 420, 220, f * .03, C.yellow, .08);
  asterisk(ctx, W - 250, 700, 160, -f * .04, C.paper, .08);
  drawTotalReceipt(ctx, f);
  printerBody(ctx, W / 2, TR.head, 1020);
}

/* ================================================================== 11 KEEP THE RECEIPT (f832–959) */
const END_TICKER = ['NERD STREETWEAR (FOR REAL)', 'A-OK.AI', 'PRINTED ON DEMAND · XS–2XL', 'KEEP THE INTERESTING MISTAKES'];
function actEnd(ctx, f) {
  // the receipt tears off and flies; the yellow footer rises with a torn edge
  const tear = inv(832, 846, f);
  if (tear < 1) {
    totalBase(ctx);
    const e = E.inQuad(tear);
    drawTotalReceipt(ctx, 831, { lift: -e * 1500, rot: e * .25 });
    printerBody(ctx, W / 2, TR.head, 1020);
  }
  const rise = E.outCubic(inv(834, 847, f)), edge = lerp(H + 30, -40, rise);
  if (rise <= 0) return;
  ctx.save();
  slipPath(ctx, -20, edge, W + 40, H + 200, { top: true, bottom: false, tooth: 48, depth: 22 });
  ctx.fillStyle = C.ink; ctx.save(); ctx.translate(0, -8); ctx.fill(); ctx.restore();
  slipPath(ctx, -20, edge, W + 40, H + 200, { top: true, bottom: false, tooth: 48, depth: 22 }); ctx.fillStyle = C.yellow; ctx.fill(); ctx.clip();
  ctx.translate(0, edge + 40);
  endCard(ctx, f);
  ctx.restore();
}
function endCard(ctx, f) {
  const d = f - 846;
  micro(ctx, '*** KEEP THIS RECEIPT. ***', 96, 112, { size: 18, weight: 700 });
  micro(ctx, 'NERD STREETWEAR (FOR REAL) · EST. 2026', W - 96, 112, { size: 18, weight: 700, align: 'right' });
  dashed(ctx, 96, W - 96, 140, { lw: 2.5 });
  // the footer logotype
  if (d >= 2) about(ctx, 96, 520, 0, lerp(1.22, 1, E.outCubic(inv(2, 6, d))), () => text(ctx, 'A–OK', 80, 540, { font: F.logo(430), track: -430 * .09 }));
  const lines = ['APES ON KEYS.', 'HUMANS IN CLOTHES.', 'THANKS FOR BEING WEIRD.'];
  lines.forEach((l, i) => { const t = d - 6 - i * 4; if (t < 0) return; text(ctx, l.slice(0, Math.ceil(l.length * clamp(t / 4))), 1130, 340 + i * 52, { font: F.mono(34, 700) }); });
  // QR (a real code for https://a-ok.ai, public/images/a-ok-qr.svg)
  const qr = E.outBack(inv(10, 16, d), 1.8);
  if (qr > 0) about(ctx, 1730, 330, .05, qr, () => {
    box(ctx, 1630, 230, 200, 200, { fill: C.slip, shadow: 7 });
    ctx.imageSmoothingEnabled = false; ctx.drawImage(IMG.qr, 1642, 242, 176, 176); ctx.imageSmoothingEnabled = true;
    micro(ctx, 'SCAN ME. A-OK.AI', 1730, 462, { size: 16, align: 'center', weight: 700 });
  });
  const rl = E.inOutCubic(inv(12, 20, d));
  if (rl > 0) dashed(ctx, 96, 96 + (W - 192) * rl, 610, { lw: 2.5 });
  heading(ctx, [{ s: 'GOOD TASTE. ', p: E.outCubic(inv(18, 22, d)) }], 90, 760, 132, {});
  const gw = measure(ctx, 'GOOD TASTE. ', F.display(132), -132 * .02);
  heading(ctx, [{ s: 'BAD MODELS', period: true, color: C.red, periodColor: C.red, p: E.outCubic(inv(22, 26, d)), pulse: 1 + .5 * Math.exp(-Math.max(0, f - 896) / 3) * (f >= 896 ? 1 : 0) }], 90 + gw, 760, 132, {});
  const bt = E.outBack(inv(28, 34, d), 1.6);
  if (bt > 0) about(ctx, 470, 852, 0, bt, () => button(ctx, 96, 806, 760, 90, 'Shop the collection at a-ok.ai', { size: 34 }));
  // ✳ and the stamp, on the last downbeat
  asterisk(ctx, 1500, 270, 140, f * .035, C.red, .09);
  const sp = inv(896, 900, f);
  if (sp > 0) about(ctx, 1560, 790, 0, 1 + .8 * Math.pow(1 - E.outCubic(sp), 2), () => stamp(ctx, 1560, 790, 150, .2, { alpha: Math.min(1, sp * 3) }));
  ticker(ctx, H - 40 - 126, 62, END_TICKER, f * 5.5);
}

/* ================================================================== dispatch for scenes 04–11 */
function actRest(ctx, f) {
  if (f < 384) actBench(ctx, f);
  else if (f < 512) actCheckout(ctx, f);
  else if (f < 576) actGame(ctx, f);
  else if (f < 640) actAgents(ctx, f);
  else if (f < 704) actModels(ctx, f);
  else if (f < 768) actBest(ctx, f);
  else if (f < 832) actTotal(ctx, f);
  else actEnd(ctx, f);
}
function buildRest() { buildLane(); buildMaze(); buildTiles(); buildTotal(); }
