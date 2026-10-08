'use strict';
/* A-OK — Hallucination Receipt. Act two: 04 NEW MODELS, 05 CHECKOUT, 06 TOUCH GRASS, 07 AGENTS WELCOME. */

/* ================================================================== 04 NEW MODELS (f320–383)
   The site's paper sheet slides up, a model launch gets announced, and the launch chart's
   A–OK bar goes off the chart. Then the red bar floods the frame. */
const SHEET = { x: 40, y: 34 };
function sheet(ctx, dy = 0) {
  ctx.fillStyle = C.blueDark; ctx.fillRect(SHEET.x + 14, SHEET.y + 14 + dy, W - SHEET.x * 2, H);
  ctx.fillStyle = C.paper; ctx.fillRect(SHEET.x, SHEET.y + dy, W - SHEET.x * 2, H);
  ctx.lineWidth = LW; ctx.strokeStyle = C.ink; ctx.strokeRect(SHEET.x, SHEET.y + dy, W - SHEET.x * 2, H + 40);
}
const BENCH = [
  { label: ['LAST YEAR’S', 'CONFERENCE TEE'], v: 31.4 },
  { label: ['PLAIN BLACK', 'HOODIE'], v: 48.2 },
  { label: ['YOUR CURRENT', 'OUTFIT'], v: 22.7 },
  { label: ['A–OK', 'FW26'], v: Infinity },
];
function actBench(ctx, f, dy = 0) {
  if (dy === 0) fill(ctx, C.blue);
  ctx.save(); ctx.translate(0, dy); sheet(ctx, 0); ctx.translate(0, -dy);
  ctx.translate(0, dy);
  const d = f - 320;
  if (d < 16) {
    // the launch announcement
    micro(ctx, '004 / RELEASE NOTES · FW26', 110, 150, { size: 17 });
    const lines = [{ s: 'INTRODUCING', p: E.outCubic(inv(-4, 1, d)) }, { s: 'OUR NEWEST', p: E.outCubic(inv(0, 4, d)) }, { s: 'MODELS', period: true, p: E.outCubic(inv(4, 8, d)) }];
    heading(ctx, lines, 104, 360, 220, { lh: .84 });
    const pill = E.outBack(inv(6, 11, d), 2);
    if (pill > 0) about(ctx, 1560, 330, -.06, pill, () => {
      box(ctx, 1400, 250, 320, 160, { fill: C.ink, shadowCol: C.red, shadow: 10 });
      text(ctx, 'V1.0', 1560, 372, { font: F.display(130), color: C.yellow, align: 'center' });
    });
    const notes = ['+ NEW: LOCAL MINIMUM, INSERT TOKEN,', '  TRANSFORMER UNIT, LITTLE OPERATOR', '+ IMPROVED: FIT. NOW XS–2XL', '+ FIXED: NOTHING. IT WAS A–OK.', '− REMOVED: CERTAINTY'];
    notes.forEach((n, i) => { if (d >= 8 + i * 1.5) text(ctx, n, 1250, 520 + i * 52, { font: F.mono(26, 700), color: i === 4 ? C.red : C.ink }); });
  } else {
    benchChart(ctx, f);
  }
  ctx.restore();
  // the red bar floods the frame on the way out
  const flood = E.inCubic(inv(374, 383.5, f));
  if (flood > 0) {
    const cx = BAR_X(3) + 130, w = lerp(260, W * 2.2, flood);
    ctx.fillStyle = C.red; ctx.fillRect(cx - w / 2, 0, w, H);
    ctx.fillStyle = C.ink; ctx.fillRect(cx - w / 2 - LW, 0, LW, H); ctx.fillRect(cx + w / 2, 0, LW, H);
  }
}
const PLOT = { x0: 230, x1: 1700, top: 330, base: 880 };
const BAR_X = i => 330 + i * 350;
function benchChart(ctx, f) {
  const d = f - 336;
  micro(ctx, '004 / RELEASE NOTES · FW26', 110, 150, { size: 17 });
  text(ctx, 'DRIP-BENCH V2', 104, 250, { font: F.display(110), track: -2 });
  micro(ctx, 'HIGHER IS BETTER · PASS@1 · N=1 (US)', 760, 236, { size: 18 });
  // axis and gridlines
  const yOf = v => PLOT.base - (PLOT.base - PLOT.top) * v / 100;
  for (const v of [0, 25, 50, 75, 100]) {
    dashed(ctx, PLOT.x0, PLOT.x1, yOf(v), { lw: v === 0 ? 0 : 1.5, dash: [8, 8], alpha: .45 });
    micro(ctx, String(v), PLOT.x0 - 20, yOf(v) + 6, { size: 16, align: 'right', alpha: .7 });
  }
  ctx.fillStyle = C.ink; ctx.fillRect(PLOT.x0, PLOT.base - 2, PLOT.x1 - PLOT.x0, 4);
  // competitors grow on sixteenths, A–OK grows and keeps going
  BENCH.forEach((b, i) => {
    const x = BAR_X(i), w = 260, label = (l, k) => micro(ctx, l, x + w / 2, PLOT.base + 44 + k * 26, { size: 18, align: 'center', weight: i === 3 ? 800 : 500, color: i === 3 ? C.red : C.ink });
    b.label.forEach(label);
    let v;
    if (i < 3) v = b.v * E.outBack(inv(i * 4, i * 4 + 6, d), 1.4);
    else { const g = inv(16, 28, d); v = g <= 0 ? 0 : 100 * Math.pow(g, 2.4) * (1 + Math.pow(g, 6) * 6) ; }
    if (v <= 0) return;
    const top = yOf(v), h = PLOT.base - top;
    ctx.fillStyle = C.ink; ctx.fillRect(x + 10, top + 10, w, h);
    ctx.fillStyle = i === 3 ? C.red : C.sky; ctx.fillRect(x, top, w, h);
    ctx.lineWidth = LW; ctx.strokeStyle = C.ink; ctx.strokeRect(x, top, w, h);
    if (i < 3) text(ctx, b.v.toFixed(1), x + w / 2, top - 22, { font: F.display(64, 800), align: 'center' });
    else {
      // the value rides the bar until it leaves the frame, then pins to the top edge
      const shown = v < 99.9 ? v.toFixed(1) : '∞';
      const ly = Math.max(150, top - 24);
      if (top > 160) text(ctx, shown, x + w / 2, ly, { font: F.display(72), align: 'center', color: C.red });
      else { text(ctx, '∞', x + w / 2, 196, { font: F.display(96), align: 'center', color: C.paper }); text(ctx, '↑', x + w / 2, 260, { font: F.grotesk(48, 700), align: 'center', color: C.paper }); }
    }
  });
  // the verdict
  const st = E.outBack(inv(32, 37, d), 2.2);
  if (st > 0) about(ctx, 760, 520, -.05, lerp(1.6, 1, st), () => {
    box(ctx, 380, 410, 760, 230, { fill: C.yellow, shadow: 12 });
    micro(ctx, 'TOTAL PERSONALITY:', 420, 470, { size: 22, weight: 700 });
    heading(ctx, [{ s: 'OFF THE CHARTS', period: true }], 414, 600, 120, {});
  });
  micro(ctx, '* BENCHMARK DESIGNED, RUN AND GRADED BY A–OK. RESULTS NOT INDEPENDENTLY VERIFIED.', PLOT.x0, PLOT.base + 120, { size: 15, alpha: .8 });
}

/* ================================================================== 05 CHECKOUT (f384–511)
   The catalog rides a conveyor through a red scanner. Every beep prints a line. */
const LANE = { sx: 600, cardW: 420, cardH: 520, top: 196, spacing: 520, rx: 1300, rw: 520, head: 930 };
const SCANS = (() => { const t = []; for (let i = 0; i < 8; i++) t.push(392 + i * 8); for (let i = 0; i < 12; i++) t.push(452 + i * 4); return t; })();
function scansDone(f) { let n = 0; for (const t of SCANS) if (f >= t) n++; return n; }
let LANE_RECEIPT = null;
function buildLane() {
  const M23 = F.mono(23, 700);
  const L = [
    { t: 'fn', h: 120, at: -99, draw: (c, x, y, w) => text(c, 'A–OK', x + w / 2, y + 96, { font: F.logo(100), align: 'center', track: -9 }) },
    { t: 'text', s: 'CHECKOUT · LANE 01 · ORDER #∞', font: F.mono(18, 500), align: 'center', h: 40, at: -99 },
    { t: 'rule', h: 30, at: -99 },
  ];
  SCANS.forEach((t, i) => L.push({ t: 'leader', l: LINEUP[i].name, r: '$' + LINEUP[i].price, font: M23, h: 46, at: t, dur: i < 8 ? 3 : 2 }));
  const total = LINEUP.reduce((a, p) => a + p.price, 0);
  L.push({ t: 'rule', h: 30, at: 498, dur: 2 },
    { t: 'leader', l: `SUBTOTAL (${LINEUP.length})`, r: '$' + commas(total), font: F.mono(26, 800), h: 52, at: 500, dur: 3 },
    { t: 'leader', l: 'TAX', r: 'VIBES', font: M23, h: 46, at: 503, dur: 3 },
    { t: 'leader', l: 'SIZES', r: 'XS–2XL', font: M23, h: 46, at: 506, dur: 3 });
  LANE_RECEIPT = new Receipt(LANE.rw, L, { pad: 28 });
}
function laneIndex(f) {
  // a conveyor that indexes: each card dwells under the scanner, then everything shifts one slot
  if (f < SCANS[0]) return -1 + E.outCubic(inv(384, SCANS[0], f));
  for (let k = 0; k < SCANS.length; k++) {
    const t0 = SCANS[k], t1 = k + 1 < SCANS.length ? SCANS[k + 1] : t0 + 8;
    if (f < t1) { const dwell = (t1 - t0) * .4; return k + E.inOutCubic(inv(t0 + dwell, t1, f)); }
  }
  return SCANS.length - 1 + 1 + E.inCubic(inv(SCANS[SCANS.length - 1] + 8, SCANS[SCANS.length - 1] + 14, f)) * 2;
}
function actCheckout(ctx, f) {
  fill(ctx, C.blue);
  const n = laneIndex(f);
  // belt
  const beltY = LANE.top + LANE.cardH + 40;
  ctx.fillStyle = C.ink; ctx.fillRect(0, beltY, LANE.rx - 30, 44);
  ctx.fillStyle = C.paper; const shift = (n * LANE.spacing) % 80;
  for (let x = -80 + shift; x < LANE.rx - 30; x += 80) ctx.fillRect(x, beltY + 19, 40, 6);
  ctx.fillStyle = C.blueDark; ctx.fillRect(0, beltY + 44, LANE.rx - 30, 10);
  // scanner housing under the belt, with its slit
  const sx = LANE.sx;
  box(ctx, sx - 250, beltY - 6, 500, 70, { fill: C.ink, shadow: 0, border: 0 });
  micro(ctx, 'A–OK CHECKOUT · LANE 01', sx - 230, beltY + 42, { size: 15, color: C.paper, alpha: .8 });
  // cards
  for (let k = 0; k < LINEUP.length; k++) {
    const x = sx + (n - k) * LANE.spacing - LANE.cardW / 2;
    if (x > LANE.rx + 40 || x + LANE.cardW < -40) continue;
    const since = f - SCANS[k], glow = since >= 0 ? Math.exp(-since / 1.5) : 0;
    const bob = Math.sin((n - k) * Math.PI) * 6;
    productCard(ctx, LINEUP[k], x, LANE.top + bob, LANE.cardW, LANE.cardH, { index: k, glow });
  }
  // laser: a vertical beam, plus a sweep down the card at each scan
  const last = scansDone(f) - 1, since = last >= 0 ? f - SCANS[last] : 99;
  const hot = Math.exp(-since / 2);
  ctx.save();
  ctx.shadowColor = 'rgba(255,40,40,0.9)'; ctx.shadowBlur = 18 + 30 * hot;
  ctx.fillStyle = `rgba(255,${60 + 120 * hot},${60 + 100 * hot},${.75 + .25 * hot})`;
  ctx.fillRect(sx - 2, LANE.top - 60, 4, beltY - LANE.top + 60);
  if (since < 3) { const yy = LANE.top + (LANE.cardH * .82) * (since / 3); ctx.fillRect(sx - LANE.cardW / 2 - 20, yy, LANE.cardW + 40, 5); }
  ctx.restore();
  // a price tag pops off each scanned card and flies to the register
  for (let k = 0; k <= last; k++) {
    const t = f - SCANS[k]; if (t < 0 || t > 9) continue;
    const u = E.inOutCubic(t / 9), x0 = sx, y0 = LANE.top - 30, x1 = LANE.rx + LANE.rw / 2, y1 = LANE.head - 40;
    const x = lerp(x0, x1, u), y = lerp(y0, y1, u) - Math.sin(u * Math.PI) * 160;
    ctx.save(); ctx.globalAlpha = 1 - inv(7, 9, t);
    about(ctx, x, y, (u - .5) * .4, 1, () => { box(ctx, x - 58, y - 26, 116, 52, { fill: C.yellow, shadow: 5 }); text(ctx, '+$' + LINEUP[k].price, x, y + 11, { font: F.display(38, 800), align: 'center' }); });
    ctx.restore();
  }
  // the register: a printer at the bottom right, its receipt rising
  LANE_RECEIPT.draw(ctx, LANE.rx, LANE.head, f, { tornTop: true });
  printerBody(ctx, LANE.rx + LANE.rw / 2, LANE.head, 640);
  // the stamp after the last item
  const sp = inv(500, 504, f);
  if (sp > 0) about(ctx, sx, 440, 0, 1 + .7 * Math.pow(1 - E.outCubic(sp), 2), () =>
    stamp(ctx, sx, 440, 190, -.12, { lines: ['PRINTED', 'ON DEMAND'], sub: 'TEES · HOODIES · CREWS · XS–2XL', alpha: Math.min(1, sp * 3) }));
}
function printerBody(ctx, cx, top, w) {
  ctx.fillStyle = C.ink; ctx.beginPath(); ctx.roundRect(cx - w / 2 + 12, top + 12, w, 260, 16); ctx.fill();
  ctx.fillStyle = '#2B2A26'; ctx.beginPath(); ctx.roundRect(cx - w / 2, top, w, 260, 16); ctx.fill();
  ctx.lineWidth = LW; ctx.strokeStyle = C.ink; ctx.stroke();
  ctx.fillStyle = '#0A0A09'; ctx.fillRect(cx - w / 2 + 40, top, w - 80, 12);
  ctx.fillStyle = C.redLight; ctx.beginPath(); ctx.arc(cx + w / 2 - 44, top + 56, 8, 0, 7); ctx.fill();
  micro(ctx, 'A–OK THERMAL · 80MM', cx - w / 2 + 34, top + 64, { size: 16, color: C.paper, alpha: .5 });
}

/* ================================================================== 06 TOUCH GRASS (f512–575)
   Run, Human, Run!, scripted: the last three UBI credits, a Touch Grass pellet, one ape eaten, a win. */
const MAZE = [
  '#########################', '#...........#...........#', '#.###.#####.#.#####.###.#', '#.......................#',
  '#.###.#.#########.#.###.#', '#.....#.....#.....#.....#', '#####.#####.#.#####.#####', '#####.#...........#.#####',
  '#####.#.###.#.###.#.#####', '......#...........#......', '#####.#.###.#.###.#.#####', '#####.#...........#.#####',
  '#####.#.#########.#.#####', '#...........#...........#', '#.###.#####.#.#####.###.#', '#...#...............#...#',
  '#.#.#.#.#########.#.#.#.#', '#.....#...........#.....#', '#########################',
];
const GC = { cell: 36, x: 950, y: 236 };
const PATH = (() => { const p = []; for (let x = 7; x <= 19; x++) p.push([x, 3]); for (let y = 4; y <= 13; y++) p.push([19, y]); for (let x = 18; x >= 9; x--) p.push([x, 13]); return p; })();
const CREDIT_AT = [4, 12, 24], PELLET_AT = 14;
const gp = f => clamp((f - 512) / 2, 0, PATH.length - 1);
function pathPos(p) { const i = Math.floor(p), t = p - i, a = PATH[i], b = PATH[Math.min(i + 1, PATH.length - 1)]; return [lerp(a[0], b[0], t), lerp(a[1], b[1], t)]; }
function gameAt(f) {
  const p = gp(f); let got = 0; for (const c of CREDIT_AT) if (p >= c) got++;
  return { p, credits: 7 + got, power: p >= PELLET_AT, won: p >= CREDIT_AT[2] };
}
let MAZE_C = null;
function buildMaze() {
  const c = GC.cell; MAZE_C = makeCanvas(25 * c, 19 * c); const x = g2(MAZE_C);
  const wall = (i, j) => j >= 0 && j < 19 && i >= 0 && i < 25 && MAZE[j][i] === '#';
  x.fillStyle = C.blue; x.fillRect(0, 0, 25 * c, 19 * c); x.fillStyle = C.yellow; x.strokeStyle = C.ink; x.lineWidth = 2;
  for (let j = 0; j < 19; j++) for (let i = 0; i < 25; i++) {
    if (!wall(i, j)) continue; const l = i * c, t = j * c; x.fillRect(l, t, c, c); x.beginPath();
    if (j > 0 && !wall(i, j - 1)) { x.moveTo(l, t + 1); x.lineTo(l + c, t + 1); }
    if (j < 18 && !wall(i, j + 1)) { x.moveTo(l, t + c - 1); x.lineTo(l + c, t + c - 1); }
    if (i > 0 && !wall(i - 1, j)) { x.moveTo(l + 1, t); x.lineTo(l + 1, t + c); }
    if (i < 24 && !wall(i + 1, j)) { x.moveTo(l + c - 1, t); x.lineTo(l + c - 1, t + c); }
    x.stroke();
  }
}
function gameApe(ctx, cx, cy, scared, dir) {   // the game's square ape (RunHumanRun.tsx drawApes)
  const c = GC.cell, size = c - 8, left = cx - size / 2, top = cy - size / 2;
  ctx.lineWidth = 2; ctx.strokeStyle = C.ink; ctx.fillStyle = scared ? C.paper : C.red;
  for (const ex of [left - 4, left + size - 1]) { ctx.fillRect(ex, top + 6, 5, 8); ctx.strokeRect(ex, top + 6, 5, 8); }
  ctx.fillRect(left, top, size, size); ctx.strokeRect(left, top, size, size);
  ctx.fillStyle = scared ? C.blue : C.paper; ctx.fillRect(left + 5, top + 13, size - 10, 8); ctx.fillRect(left + 4, top + 5, 6, 6); ctx.fillRect(left + size - 10, top + 5, 6, 6);
  ctx.fillStyle = C.ink; const px = Math.max(0, dir[0]) * 2 + (dir[0] === 0 ? 1 : 0), py = Math.max(0, dir[1]) * 2 + (dir[1] === 0 ? 1 : 0);
  ctx.fillRect(left + 5 + px, top + 6 + py, 3, 3); ctx.fillRect(left + size - 9 + px, top + 6 + py, 3, 3);
}
function actGame(ctx, f) {
  fill(ctx, C.blue);
  const d = f - 512, g = gameAt(f), c = GC.cell;
  // headline
  heading(ctx, [{ s: 'TOUCH GRASS', period: true, color: C.paper, periodColor: C.yellow, p: E.outCubic(inv(-4, 2, d)) }, { s: 'OR DODGE', color: C.paper, p: E.outCubic(inv(8, 12, d)) }, { s: 'AGENTS', period: true, color: C.yellow, periodColor: C.yellow, p: E.outCubic(inv(16, 20, d)) }], 104, 360, 146, { lh: .88 });
  if (d >= 22) text(ctx, 'Win the game, get 25% off. The machines can wait.', 108, 700, { font: F.grotesk(30, 500), color: C.paper, alpha: E.outCubic(inv(22, 28, d)) });
  // the board
  const pop = E.spring(inv(0, 12, d));
  const MW = 25 * c, MH = 19 * c;
  about(ctx, GC.x + MW / 2, GC.y + MH / 2, -.02 * (1 - Math.min(1, pop)), lerp(.6, 1, Math.min(1, pop)), () => {
    const bx = GC.x - 18, by = GC.y - 78, bw = 25 * c + 36, bh = 19 * c + 96;
    box(ctx, bx, by, bw, bh, { fill: C.paper, shadow: 14 });
    text(ctx, 'RUN, HUMAN, RUN!', bx + 22, by + 52, { font: F.display(44), track: -.5 });
    micro(ctx, `UBI CREDITS ${g.credits}/10`, bx + bw - 22, by + 46, { size: 20, weight: 800, align: 'right', color: g.credits >= 10 ? C.red : C.ink });
    ctx.drawImage(MAZE_C, GC.x, GC.y);
    const X = i => GC.x + i * c + c / 2, Y = j => GC.y + j * c + c / 2;
    // credits still on the board
    CREDIT_AT.forEach(ci => { if (g.p >= ci) return; const [i, j] = PATH[ci];
      ctx.beginPath(); ctx.arc(X(i), Y(j), 9, 0, 7); ctx.fillStyle = C.gold; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = C.ink; ctx.stroke();
      text(ctx, 'U', X(i), Y(j) + 1, { font: F.mono(11, 800), align: 'center', base: 'middle' }); });
    // Touch Grass pellets
    const pellets = [PATH[PELLET_AT], [1, 15], [23, 15], [1, 1]];
    pellets.forEach(([i, j], k) => { if (k === 0 && g.power) return; const cx = X(i), base = GC.y + j * c + c - 7, sway = Math.sin(f / 4 + k) * 2;
      ctx.fillStyle = C.grass; ctx.strokeStyle = C.ink; ctx.lineWidth = 2; ctx.lineJoin = 'round';
      for (const [o, h] of [[-6, 14], [0, 19], [6, 14]]) { ctx.beginPath(); ctx.moveTo(cx + o - 4, base); ctx.lineTo(cx + o + sway, base - h); ctx.lineTo(cx + o + 4, base); ctx.closePath(); ctx.fill(); ctx.stroke(); } });
    // apes: one comes up the right corridor (and gets eaten), one trails the human, one patrols
    const eatenAt = 545;
    if (f < eatenAt) { const ay = 13 - (f - 512) / 6; gameApe(ctx, X(19), Y(ay), g.power, [0, -1]); }
    else if (f < eatenAt + 8) text(ctx, '+1 APE', X(19), Y(7.5) - (f - eatenAt) * 3, { font: F.display(34, 800), color: C.paper, align: 'center' });
    const trail = g.power ? Math.max(0, gp(540) - 6 - (f - 540) / 3) : Math.max(0, g.p - 6);
    const [tx, ty] = pathPos(trail); gameApe(ctx, X(tx), Y(ty), g.power, g.power ? [-1, 0] : [1, 0]);
    const px = 12 + 5 * Math.sin((f - 512) / 9); gameApe(ctx, X(px), Y(9), g.power, [Math.cos((f - 512) / 9) > 0 ? 1 : -1, 0]);
    // the human
    const [hx, hy] = pathPos(g.p), nx = pathPos(Math.min(PATH.length - 1, g.p + .5)), dir = [Math.sign(nx[0] - hx), Math.sign(nx[1] - hy)];
    const cx = X(hx), cy = Y(hy);
    ctx.beginPath(); ctx.arc(cx, cy, 12, 0, 7); ctx.fillStyle = C.paper; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = C.ink; ctx.stroke();
    ctx.fillStyle = C.ink; ctx.beginPath(); ctx.arc(cx - 4 + dir[0] * 2, cy - 3 + dir[1] * 2, 2, 0, 7); ctx.arc(cx + 4 + dir[0] * 2, cy - 3 + dir[1] * 2, 2, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.arc(cx + dir[0] * 2, cy + 3 + dir[1] * 2, 4, 0, Math.PI); ctx.stroke();
    // coin bursts on each credit
    CREDIT_AT.forEach(ci => { const t = f - (512 + ci * 2); if (t < 0 || t > 10) return; const [i, j] = PATH[ci];
      for (let k = 0; k < 8; k++) { const a = k / 8 * 6.28, r = 6 + t * 5; ctx.fillStyle = C.gold; ctx.globalAlpha = 1 - t / 10; ctx.fillRect(X(i) + Math.cos(a) * r - 3, Y(j) + Math.sin(a) * r - 3, 6, 6); } ctx.globalAlpha = 1; });
    // the win
    if (g.won) {
      const w = E.outBack(inv(560, 565, f), 2);
      about(ctx, GC.x + MW / 2, GC.y + MH / 2 - 40, -.04, w, () => {
        box(ctx, GC.x - 30, GC.y + MH / 2 - 150, MW + 60, 190, { fill: C.red, shadow: 12 });
        text(ctx, 'YOU WIN!', GC.x + MW / 2 + 6, GC.y + MH / 2 + 6, { font: F.display(170), color: C.ink, align: 'center' });
        text(ctx, 'YOU WIN!', GC.x + MW / 2, GC.y + MH / 2, { font: F.display(170), color: C.yellow, align: 'center' });
      });
    }
  });
  // the reward prints out of the board
  const rw = E.outCubic(inv(564, 574, f));
  if (rw > 0) {
    const x = GC.x + 170, y = GC.y + 19 * c + 30 - 60 + rw * 120, w = 560;
    ctx.save(); ctx.beginPath(); ctx.rect(x - 40, GC.y + 19 * c + 20, w + 80, 400); ctx.clip();
    slip(ctx, x, y - 120, w, 150, { shadow: 8 });
    micro(ctx, 'REWARD / ONE USE', x + 22, y - 82, { size: 15 });
    text(ctx, '25% OFF', x + 22, y - 18, { font: F.display(64), color: C.red });
    micro(ctx, 'CODE: AOK············', x + w - 22, y - 30, { size: 17, weight: 800, align: 'right' });
    ctx.restore();
  }
}

/* ================================================================== 07 AGENTS WELCOME (f576–639) */
const TERM = [
  [['$ ', C.yellow], ['agent shop a-ok.ai --taste=good', C.paper]],
  [['> ', C.sky], ['GET /llms.txt ................. ', C.paper], ['200 OK', C.yellow]],
  [['> ', C.sky], ['tool_call add_to_cart(', C.paper], ['"local-minimum-tee"', C.yellow], [')', C.paper]],
  [['> ', C.sky], ['size? ............... ', C.paper], ['ASKING THE HUMAN', C.yellow]],
  [['< ', C.redLight], ['human: ', C.paper], ['"L"', C.yellow]],
  [['> ', C.sky], ['402 PAYMENT REQUIRED .......... ', C.paper], ['PAID', C.yellow]],
  [['✓ ', C.yellow], ['ORDER CONFIRMED. KEEP THE RECEIPT.', C.yellow]],
];
const TERM_AT = [578, 586, 594, 602, 610, 616, 626];
function actAgents(ctx, f) {
  fill(ctx, C.gold);
  const d = f - 576;
  heading(ctx, [{ s: 'AGENTS', p: E.outCubic(inv(-4, 2, d)) }, { s: 'WELCOME', period: true, p: E.outCubic(inv(4, 8, d)) }], 104, 400, 196, { lh: .86 });
  const sub = E.outCubic(inv(10, 16, d));
  if (sub > 0) {
    text(ctx, 'Your agent can shop here.', 108, 640, { font: F.grotesk(34, 500), alpha: sub });
    text(ctx, 'You still pick the size.', 108, 688, { font: F.grotesk(34, 500), alpha: sub });
  }
  // the terminal
  const pop = E.spring(inv(0, 12, d));
  about(ctx, 1380, 540, (1 - Math.min(1, pop)) * .06, lerp(.75, 1, Math.min(1, pop)), () => {
    const x = 990, y = 200, w = 850, h = 660;
    box(ctx, x, y, w, h, { fill: C.inkDeep, shadow: 14 });
    ctx.fillStyle = C.paper; ctx.fillRect(x, y, w, 64); ctx.fillStyle = C.ink; ctx.fillRect(x, y + 62, w, LW);
    ctx.drawImage(IMG.badge8, x + 14, y + 10, 44, 44);
    micro(ctx, 'AGENT@A-OK.AI — ZSH — 80×24', x + 74, y + 41, { size: 17, weight: 700 });
    const fsz = 25, lh = 62;
    TERM.forEach((parts, i) => {
      const t = f - TERM_AT[i]; if (t < 0) return;
      const total = parts.reduce((a, p) => a + p[0].length, 0), shown = Math.floor(total * clamp(t / 6));
      let xx = x + 34, left = shown;
      for (const [s, col] of parts) { if (left <= 0) break; const piece = s.slice(0, left); left -= piece.length; xx += text(ctx, piece, xx, y + 130 + i * lh, { font: F.mono(fsz, 700), color: col }); }
      const typing = shown < total, isLast = i === TERM.length - 1 || f < TERM_AT[i + 1];
      if (isLast && (typing || (f >> 2) % 2 === 0)) { ctx.fillStyle = C.paper; ctx.fillRect(xx + 4, y + 130 + i * lh - fsz * .8, fsz * .55, fsz); }
    });
  });
  // PAID, stamped
  const pd = inv(620, 624, f);
  if (pd > 0) about(ctx, 1690, 860, -.16, 1 + .8 * Math.pow(1 - E.outCubic(pd), 2), () => {
    ctx.save(); ctx.globalAlpha = Math.min(1, pd * 3); ctx.strokeStyle = C.red; ctx.lineWidth = 9;
    ctx.beginPath(); ctx.roundRect(1520, 790, 340, 140, 18); ctx.stroke(); ctx.lineWidth = 3; ctx.beginPath(); ctx.roundRect(1532, 802, 316, 116, 12); ctx.stroke();
    text(ctx, 'PAID', 1690, 900, { font: F.display(120), color: C.red, align: 'center', track: 6 });
    ctx.restore();
  });
}
