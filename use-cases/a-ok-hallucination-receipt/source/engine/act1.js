'use strict';
/* A-OK — Hallucination Receipt. Act one: 01 THE THEOREM, 02 GOOD TASTE, 03 THE CLUB. */

/* ================================================================== 01 THE THEOREM (f0–191)
   One printer prints the E/ACC Infinite Ape Theorem. Its output accelerates, the camera pulls
   back to a wall of receipts (one per ape), everything freezes, one receipt turns yellow, and
   the camera dives into its line: GOOD TASTE. BAD MODELS. */

const ROLL = { lineH: 56, pitch: 1080, paperW: 640, pad: 36 };
const OUTPUTS = [
  ['SHAKESPEARE, COMPLETE WORKS', '✓'], ['HAMLET: THE RAP MUSICAL', '×47'], ['CITATIONS (IMAGINARY)', '✓'], ['KNOWLEDGE CUTOFF', 'UNSURE'],
  ['SONNET ABOUT BLOCKCHAIN', '✓'], ['DOI 10.404/NOT-FOUND', '✓'], ['“TO YEET OR NOT TO YEET”', '✓'], ['THE BARD IN A HOODIE', '✓'],
  ['MACBETH, BUT A STARTUP', '✓'], ['A RECIPE THAT RHYMES', '✓'], ['A SEVENTH FINGER', '✓'], ['LIKE AND SUBSCRIBE', '✓'],
  ['404, BEAUTIFULLY TYPESET', '✓'], ['ROMEO + JULIET (NFA)', '✓'], ['YOUR ESSAY, BUT SURE', '✓'], ['A CHART WITH NO Y-AXIS', '✓'],
  ['EVERY SEQUEL, AT ONCE', '✓'], ['AN APOLOGY, SINCERE-ISH', '✓'], ['EVERY POSSIBLE T-SHIRT', '✓'], ['THIS EXACT SENTENCE', '✓'],
  ['A HAIKU ABOUT GPUS', '✓'], ['TERMS OF SERVICE', 'UNREAD'], ['MEANING OF LIFE (BETA)', '✓'], ['A CAT, BUT WRONG', '✓'],
  ['PROOF THAT 2+2=5', '✓'], ['THE WORD “DELVE”', '×10^6'], ['JUST ONE MORE PROMPT', '✓'], ['CONFIDENCE', 'HIGH'],
  ['ACCURACY', 'DEBATABLE'], ['A FOURTH WALL, BROKEN', '✓'], ['VIBES', '∞'], ['REALITY CHECK', 'SKIPPED'],
];
const M28 = F.mono(28, 700);

/* Line drawing shared by the live receipts and the pre-drawn rolls (so both look identical). */
function rollLine(ctx, L, x, y, w) {
  const base = y + L.h * .7;
  if (L.t === 'leader') {
    if (L.r === '✓') { leader(ctx, L.l, '  ', x, base, w, { font: M28 }); check(ctx, x + w - 12, base - 10, 26, C.ink, 4.5); }
    else leader(ctx, L.l, L.r, x, base, w, { font: M28 });
  } else if (L.t === 'rule') dashed(ctx, x, x + w, y + L.h / 2, { lw: 2.5 });
  else if (L.t === 'head') { text(ctx, 'A–OK', x + w / 2, y + L.h * .62, { font: F.logo(64), align: 'center', track: -64 * .09 }); }
  else if (L.t === 'order') text(ctx, L.s, x + w / 2, base, { font: F.mono(20, 500), align: 'center', track: 1.2 });
  else if (L.t === 'barcode') barcode(ctx, x, y + 8, w, L.h - 16, L.seed);
  else if (L.t === 'text') text(ctx, L.s, L.align === 'center' ? x + w / 2 : x, base, { font: L.font || M28, align: L.align || 'left', color: L.color || C.ink });
}
/* An endless roll: one ape's receipts, order after order. */
function rollLines(seed, n) {
  const r = rng(seed), lines = []; let k = 0;
  while (lines.length < n) {
    lines.push({ t: 'head', h: 96 }, { t: 'order', s: `APE #${pad(r() * 9999999, 7)} · ORDER #∞`, h: 40 }, { t: 'rule', h: 30 });
    const items = 6 + Math.floor(r() * 14);
    for (let i = 0; i < items; i++) { const o = OUTPUTS[Math.floor(r() * OUTPUTS.length)]; lines.push({ t: 'leader', l: o[0], r: o[1], h: ROLL.lineH }); }
    lines.push({ t: 'rule', h: 30 }, { t: 'leader', l: 'TOTAL', r: '∞', h: ROLL.lineH }, { t: 'barcode', seed: seed * 100 + k++, h: 70 }, { t: 'rule', h: 60 });
  }
  let y = 0; for (const L of lines) { L.y = y; y += L.h; }
  return { lines, height: y };
}
/* Pre-draw a list of lines at half, quarter, eighth and sixteenth scale (mip levels). */
function bakeRoll(roll) {
  const base = makeCanvas(ROLL.paperW / 2, roll.height / 2), b = g2(base);
  b.fillStyle = C.slip; b.fillRect(0, 0, base.width, base.height); b.scale(.5, .5);
  for (const L of roll.lines) rollLine(b, L, ROLL.pad, L.y, ROLL.paperW - ROLL.pad * 2);
  const levels = [{ div: 2, c: base }];
  for (const div of [4, 8, 16, 32]) {
    const prev = levels[levels.length - 1].c, c = makeCanvas(ROLL.paperW / div, roll.height / div), x = g2(c);
    x.imageSmoothingQuality = 'high'; x.drawImage(prev, 0, 0, c.width, c.height); levels.push({ div, c });
  }
  roll.levels = levels;
  return roll;
}

let ROLLS = [], HERO = null, SIGNAL = null;
function buildTheorem() {
  ROLLS = [0, 1, 2, 3, 4, 5].map(k => bakeRoll(rollLines(900 + k * 17, 420)));
  // The hero receipt, scheduled to the beat. Paper coordinate 0 is the top of this order.
  const L = [
    { t: 'head', h: 150, at: -99 }, { t: 'order', s: 'APES ON KEYS · HUMANS IN CLOTHES', h: 44, at: -99 }, { t: 'order', s: 'ORDER #∞ · REGISTER 01', h: 40, at: -99 }, { t: 'rule', h: 36, at: -99 },
    { t: 'text', s: 'THE E/ACC INFINITE APE THEOREM', h: 60, at: 2, dur: 6 }, { t: 'rule', h: 30, at: 9, dur: 3 },
    { t: 'leader', l: 'APES', r: '∞', h: 60, at: 16 }, { t: 'leader', l: 'KEYS', r: '∞', h: 60, at: 32 },
    { t: 'leader', l: 'COMPUTE', r: '∞', h: 60, at: 48 }, { t: 'leader', l: 'TIME', r: '∞', h: 60, at: 56 },
    { t: 'rule', h: 30, at: 61, dur: 2 }, { t: 'text', s: 'OUTPUT:', h: 60, at: 64 },
  ];
  L[0].t = 'head'; L[0].big = true;
  for (let i = 0; i < 4; i++) L.push({ t: 'leader', l: OUTPUTS[i][0], r: OUTPUTS[i][1], h: ROLL.lineH, at: 68 + i * 8 });
  // then the output runs away: each line arrives a little sooner than the last
  const r = rng(5); let t = 100, dt = 3.4, i = 4;
  while (t < 160) { L.push({ t: 'leader', l: OUTPUTS[i % OUTPUTS.length][0], r: OUTPUTS[i % OUTPUTS.length][1], h: ROLL.lineH, at: t, dur: Math.max(.05, dt) }); i += 1 + Math.floor(r() * 3); t += dt; dt = Math.max(.045, dt * .88); }
  HERO = new Receipt(ROLL.paperW, L, { pad: ROLL.pad });
  HERO.baked = bakeRoll({ lines: HERO.lines, height: HERO.height });
}
function heroLine(ctx, L, x, y, w) {
  if (L.t === 'head' && L.big) { text(ctx, 'A–OK', x + w / 2, y + 118, { font: F.logo(132), align: 'center', track: -132 * .09 }); return; }
  rollLine(ctx, L, x, y, w);
}

/* Camera: scene point `focus` sits at the screen centre, scaled by s. */
function camTheorem(f) {
  const HEAD_Y = H - 190;
  if (f < 96) { const s = lerp(1.32, 1.4, f / 96); return { s, fx: 0, fy: -(HEAD_Y - H / 2) / s }; }
  const sWide = .021, headWide = H - 70;
  if (f < 166) {
    const u = E.inOutCubic(inv(96, 150, f)) * .97 + .03 * inv(150, 166, f);
    const s = Math.exp(lerp(Math.log(1.4), Math.log(sWide * 1.04), E.inOutCubic(inv(96, 150, f)))) * lerp(1, .96, inv(150, 166, f));
    const hy = lerp(HEAD_Y, headWide, u);
    return { s, fx: 0, fy: -(hy - H / 2) / s };
  }
  // the dive: from the wide view into the signal line on column 3
  const s0 = sWide * 1.04 * .96, fy0 = -(headWide - H / 2) / s0;
  const e = E.inQuart(inv(166, 186, f)), e2 = E.inOutCubic(inv(166, 184, f));
  const s = Math.exp(lerp(Math.log(s0), Math.log(3.3), e)) * (1 + Math.max(0, f - 186) * .006);
  const T = SIGNAL_AT;                                  // the signal line, in scene coordinates
  const P0 = { x: (T.x - 0) * s0 + W / 2, y: (T.y - fy0) * s0 + H / 2 };
  const P = { x: lerp(P0.x, W / 2, e2), y: lerp(P0.y, H / 2, e2) };
  return { s, fx: T.x - (P.x - W / 2) / s, fy: T.y - (P.y - H / 2) / s };
}
const SIGNAL_COL = 3;
const SIGNAL_AT = { x: SIGNAL_COL * ROLL.pitch, y: -29400 };
const FREEZE = 160;

function colFeed(i, f) {
  // Every other ape prints at its own pace; all of them stop dead at the freeze.
  const ff = Math.min(f, FREEZE), g = ff < 90 ? 0 : Math.pow((ff - 90) / 70, 2.2) * 30000;
  const grown = g * (.35 + rnd(i, 4) * 1.1) + ff * 40;
  // How much paper is out: some apes have been typing for ages, some just started.
  const start = Math.abs(i) <= 1 ? 9000 : i === SIGNAL_COL ? 26000 : Math.pow(rnd(i, 5), 1.8) * 34000;
  return { feed: rnd(i, 3) * 90000 + grown, len: start + grown };
}

function actTheorem(ctx, f) {
  fill(ctx, C.inkDeep);
  const { s, fx, fy } = camTheorem(f);
  const X = x => (x - fx) * s + W / 2, Y = y => (y - fy) * s + H / 2;
  // soft pool of light around the hero printer
  const gl = ctx.createRadialGradient(X(0), Y(-300), 10, X(0), Y(-300), 1400 * Math.max(s, .3));
  gl.addColorStop(0, 'rgba(255,240,200,0.10)'); gl.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = gl; ctx.fillRect(0, 0, W, H);

  const i0 = Math.floor((fx - W / 2 / s) / ROLL.pitch) - 1, i1 = Math.ceil((fx + W / 2 / s) / ROLL.pitch) + 1;
  const screenTop = fy - H / 2 / s;                      // scene y at the top of the screen
  const frozen = f >= FREEZE, yell = inv(FREEZE, FREEZE + 6, f), dim = inv(FREEZE + 1, FREEZE + 8, f);
  for (let i = i0; i <= i1; i++) {
    const cx = i * ROLL.pitch, x0 = cx - ROLL.paperW / 2;
    const sx = X(x0), sw = ROLL.paperW * s, head = Y(0);
    if (sx > W || sx + sw < 0) continue;
    // paper roll
    if (i === 0) drawHero(ctx, f, sx, head, s, screenTop);
    else { const c = colFeed(i, f); drawRoll(ctx, ROLLS[((i % 6) + 6) % 6], c.feed, sx, head, s, screenTop, c.len); }
    if (i === SIGNAL_COL && yell > 0) {
      // the one receipt with good taste turns yellow, from the head up
      ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = C.yellow;
      const ptop = Math.max(0, head - colFeed(i, f).len * s), top = lerp(head, ptop, E.outCubic(yell)); ctx.fillRect(sx, top, sw, head - top); ctx.restore();
      if (s > .3 || yell < 1) signalLine(ctx, X, Y, s, f);
    }
    if (frozen && i !== SIGNAL_COL && dim > 0) { const ptop = i === 0 ? 0 : Math.max(0, head - colFeed(i, f).len * s); ctx.fillStyle = `rgba(17,17,15,${.62 * dim})`; ctx.fillRect(sx - 2, ptop - 14 * s, sw + 4, head - ptop + 14 * s); }
  }
  if (frozen && s <= .3) signalLine(ctx, X, Y, s, f);
  // printers
  const pTop = Y(0);
  if (pTop < H) {
    if (s < .12) {
      ctx.fillStyle = '#2B2A26'; ctx.fillRect(0, pTop, W, H - pTop);
      ctx.fillStyle = '#0A0A09'; ctx.fillRect(0, pTop, W, Math.max(1, 10 * s));
      for (let i = i0; i <= i1; i++) { const lx = X(i * ROLL.pitch + 290), on = frozen ? (i === SIGNAL_COL ? 1 : .25) : .5 + .5 * (h32(i * 31 + (f >> 2)) % 2); ctx.fillStyle = i === SIGNAL_COL && frozen ? C.yellow : `rgba(224,71,74,${on})`; ctx.fillRect(lx - 1, Y(70) - 1, Math.max(2, 18 * s), Math.max(2, 18 * s)); }
    } else for (let i = i0; i <= i1; i++) printer(ctx, X(i * ROLL.pitch), pTop, s, f, i);
  }
}
function printer(ctx, cx, top, s, f, i) {
  const w = 760 * s, h = 300 * s;
  ctx.save();
  ctx.fillStyle = '#2B2A26'; ctx.beginPath(); ctx.roundRect(cx - w / 2, top, w, h, 18 * s); ctx.fill();
  ctx.fillStyle = '#3A3934'; ctx.fillRect(cx - w / 2 + 10 * s, top + 4 * s, w - 20 * s, 3 * s);
  ctx.fillStyle = '#0A0A09'; ctx.fillRect(cx - 350 * s, top, 700 * s, 12 * s);
  const busy = f < FREEZE && (h32(i * 7 + f) % 3 > 0 || i === 0);
  ctx.fillStyle = busy ? C.redLight : '#5a2020'; ctx.beginPath(); ctx.arc(cx + 300 * s, top + 70 * s, 9 * s, 0, 7); ctx.fill();
  if (s > .5) text(ctx, 'A–OK THERMAL · 80MM', cx - 330 * s, top + 78 * s, { font: F.mono(20 * s, 500), color: C.paper, alpha: .45, track: 2 * s });
  ctx.restore();
}
/* Draw one roll whose print head sits at screen y `head`, `feed` paper px already printed. */
function drawRoll(ctx, roll, feed, sx, head, s, screenTop, len = 1e9) {
  const sw = ROLL.paperW * s, ptop = Math.max(0, head - len * s), visH = head - ptop;   // paper from the head up to its torn top
  if (visH <= 0) return;
  ctx.save(); ctx.beginPath(); ctx.rect(sx - 4, ptop, sw + 8, head - ptop); ctx.clip();
  if (s >= .5) {
    // live text: lines in view, wrapping around the roll
    ctx.save(); ctx.beginPath(); ctx.rect(sx, ptop, sw, head - ptop); ctx.clip();
    ctx.fillStyle = C.slip; ctx.fillRect(sx, ptop, sw, head - ptop);
    ctx.translate(sx, head); ctx.scale(s, s);
    const span = (head - ptop) / s, start = feed - span;          // paper coordinates in view: [start, feed]
    const Hh = roll.height; const k0 = Math.floor(start / Hh), k1 = Math.floor(feed / Hh);
    for (let k = k0; k <= k1; k++) for (const L of roll.lines) {
      const py = k * Hh + L.y; if (py + L.h < start || py > feed) continue;
      rollLine(ctx, L, ROLL.pad, py - feed, ROLL.paperW - ROLL.pad * 2);
    }
    ctx.restore();
  } else {
    const lv = roll.levels.find(l => 1 / l.div <= s * 1.01) || roll.levels[roll.levels.length - 1];
    const c = lv.c, k = 1 / lv.div;                       // texture px per scene px
    let srcBottom = ((feed * k) % c.height + c.height) % c.height, dstBottom = head;
    let remaining = visH;
    while (remaining > 0) {
      const takeSrc = Math.min(srcBottom, remaining / s * k);
      if (takeSrc <= 0) { srcBottom = c.height; continue; }
      const dh = takeSrc / k * s;
      ctx.drawImage(c, 0, srcBottom - takeSrc, c.width, takeSrc, sx, dstBottom - dh, sw, dh);
      dstBottom -= dh; remaining -= dh; srcBottom -= takeSrc;
      if (srcBottom <= .001) srcBottom = c.height;
    }
  }
  ctx.restore();
  if (s > .06) { ctx.fillStyle = C.ink; ctx.fillRect(sx - 1.5, ptop, 3 * Math.min(1, s * 2), head - ptop); ctx.fillRect(sx + sw - 1.5, ptop, 3 * Math.min(1, s * 2), head - ptop); }
  // the torn top of the receipt
  if (ptop > 0) {
    if (s > .15) { slipPath(ctx, sx, ptop - 12 * s, sw, 40 * s, { top: true, bottom: false, tooth: 24 * s, depth: 12 * s }); ctx.fillStyle = C.slip; ctx.fill(); ctx.strokeStyle = C.ink; ctx.lineWidth = 3 * s; ctx.stroke(); }
    else { ctx.fillStyle = C.slip; ctx.fillRect(sx, ptop - 1, sw, 2); }
  }
}
function drawHero(ctx, f, sx, head, s, screenTop) {
  const feed = HERO.feed(f), sw = ROLL.paperW * s, top0 = head - feed * s;   // screen y of the order's top
  // the previous orders on the roll, above a blank lead-in
  const lead = 520 * s;
  if (top0 - lead > 0) drawRoll(ctx, ROLLS[0], 0, sx, top0 - lead, s, screenTop);
  ctx.fillStyle = C.slip; ctx.fillRect(sx, Math.max(0, top0 - lead), sw, head - Math.max(0, top0 - lead));
  if (s >= .5) {
    ctx.save(); ctx.beginPath(); ctx.rect(sx, 0, sw, head); ctx.clip();
    ctx.translate(sx, top0); ctx.scale(s, s);
    const vis0 = (0 - top0) / s;
    for (const L of HERO.lines) { if (L.y + L.h < vis0 || L.y > feed) continue; heroLine(ctx, L, ROLL.pad, L.y, ROLL.paperW - ROLL.pad * 2); }
    ctx.restore();
  } else {
    const lv = HERO.baked.levels.find(l => 1 / l.div <= s * 1.01) || HERO.baked.levels[HERO.baked.levels.length - 1];
    const k = 1 / lv.div, srcH = Math.min(lv.c.height, feed * k);
    if (srcH > 0) ctx.drawImage(lv.c, 0, 0, lv.c.width, srcH, sx, top0, sw, srcH / k * s);
  }
  if (s > .06) { ctx.fillStyle = C.ink; const lw = 3 * Math.min(1, s * 2); ctx.fillRect(sx - lw / 2, 0, lw, head); ctx.fillRect(sx + sw - lw / 2, 0, lw, head); }
}
/* The signal: GOOD TASTE. BAD MODELS., found once among infinite receipts. */
function signalLine(ctx, X, Y, s, f) {
  const T = SIGNAL_AT, x0 = T.x - ROLL.paperW / 2, y0 = T.y - 34, h = 68;
  const a = inv(FREEZE + 4, FREEZE + 9, f);
  if (a <= 0) return;
  ctx.save();
  // a marker that reads even when the receipt is a few pixels wide
  if (s < .2) {
    const r = lerp(26, 4, inv(.02, .2, s)) * E.outBack(a);
    ctx.fillStyle = C.yellow; ctx.strokeStyle = C.ink; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(X(T.x), Y(T.y), r, 0, 7); ctx.fill(); ctx.stroke();
    asterisk(ctx, X(T.x), Y(T.y), r * 1.6, f * .05, C.red, .14);
  }
  ctx.fillStyle = C.gold; ctx.fillRect(X(x0), Y(y0), ROLL.paperW * s, h * s);
  ctx.translate(X(x0), Y(y0)); ctx.scale(s, s);
  text(ctx, 'GOOD TASTE. BAD MODELS.', ROLL.paperW / 2, 47, { font: F.mono(31, 800), align: 'center', color: C.ink });
  ctx.restore();
}

/* ================================================================== 02 GOOD TASTE (f192–255) */
const SLAMS = [
  [192, 'GOOD', C.yellow, C.ink, null], [200, 'TASTE.', C.yellow, C.ink, C.red],
  [208, 'BAD', C.red, C.yellow, null], [216, 'MODELS.', C.red, C.yellow, C.ink],
];
function slamWord(ctx, f, [t, word, bg, fg, periodCol]) {
  fill(ctx, bg);
  const d = f - t, s = 1 + .16 * Math.exp(-d * 1.1);
  const body = word.replace('.', ''), hasP = word.endsWith('.');
  const w100 = measure(ctx, word, F.display(100), -2);
  const size = Math.min(W * .86 / w100 * 100, H * .74 / .7);
  ctx.save(); ctx.translate(W / 2, H / 2); ctx.scale(s, s);
  const bw = measure(ctx, body, F.display(size), -size * .02), tw = measure(ctx, word, F.display(size), -size * .02);
  const x = -tw / 2, y = size * .35;
  text(ctx, body, x, y, { font: F.display(size), color: fg, track: -size * .02 });
  if (hasP) text(ctx, '.', x + bw, y, { font: F.display(size), color: periodCol || fg });
  ctx.restore();
}
const HERO_P = () => LINEUP[0];
function actGoodTaste(ctx, f) {
  if (f < 224) { let cur = SLAMS[0]; for (const sl of SLAMS) if (f >= sl[0]) cur = sl; return slamWord(ctx, f, cur); }
  heroComposition(ctx, f, 224);
}
/* The homepage hero, assembled on the beat (also reused, smaller, later). */
function heroComposition(ctx, f, t0) {
  fill(ctx, C.yellow);
  const d = f - t0;
  const enter = E.outCubic(inv(-3, 5, d));          // already up on the beat, settling
  ctx.save(); ctx.translate(0, (1 - enter) * 40);
  micro(ctx, 'THE HALLUCINATION CLUB / OPEN TO ALL', 134, 140, { size: 17 });
  ctx.fillStyle = C.red; ctx.beginPath(); ctx.arc(116, 134, 7, 0, 7); ctx.fill();
  heading(ctx, [{ s: 'GOOD' }, { s: 'TASTE', period: true }, { s: 'BAD', color: C.red }, { s: 'MODELS', color: C.red, period: true, periodColor: C.red, pulse: 1 + .35 * Math.exp(-Math.max(0, d - 16) / 3) * (d >= 16 ? 1 : 0) }], 104, 345, 212, { lh: .845 });
  ctx.restore();
  // orbit line
  const orb = E.inOutCubic(inv(2, 16, d));
  if (orb > 0) { ctx.save(); ctx.translate(1390, 545); ctx.rotate(-35 * Math.PI / 180); ctx.strokeStyle = C.ink; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.ellipse(0, 0, 560, 330, 0, -Math.PI * .5, -Math.PI * .5 + Math.PI * 2 * orb); ctx.stroke(); ctx.restore(); }
  // arch with the newest tee
  const a = E.spring(inv(0, 14, d)), rot = (-4 + (1 - a) * 14) * Math.PI / 180;
  about(ctx, 1385, 520, rot, lerp(.7, 1, Math.min(1, a)), () => {
    ctx.translate((1 - Math.min(1, a)) * 500, 0);
    arch(ctx, 1135, 175, 500, 650, IMG.hcNavy, { crop: [.18, 0, .82, 1], focus: [.5, .2] });
  });
  // ✳
  const st = inv(6, 12, d);
  if (st > 0) asterisk(ctx, 1062, 230, 150 * E.outBack(st), d * .045 + (1 - st) * 2, C.red, .085);
  // the stamp slams on beat four
  const sp = inv(16, 20, d);
  if (sp > 0) about(ctx, 1735, 255, 0, 1 + .6 * Math.pow(1 - E.outCubic(sp), 2), () =>
    stamp(ctx, 1735, 255, 130, (12 + (1 - E.outCubic(sp)) * 20) * Math.PI / 180 + d * .002, { alpha: Math.min(1, sp * 3) }));
  // the ticket
  const tk = E.outBack(inv(20, 28, d), 1.4);
  if (tk > 0) about(ctx, 1380, 860, 3 * Math.PI / 180, 1, () => { ctx.translate(0, (1 - tk) * 300); ticket(ctx, 1090, 745, 580, 232); });
  // ticker sliding in
  const tkr = E.outCubic(inv(26, 32, d));
  if (tkr > 0) ticker(ctx, H - 128 + (1 - tkr) * 120, 62, TICKER, f * 5.5);
}
const TICKER = ['CONFIDENCE: HIGH', 'ACCURACY: DEBATABLE', 'OUTFIT: A–OK', 'KEEP THE INTERESTING MISTAKES'];
function ticket(ctx, x, y, w, h) {
  const p = HERO_P();
  box(ctx, x, y, w, h, { fill: C.paper });
  micro(ctx, 'YOUR NEXT GOOD DECISION', x + 24, y + 40, { size: 15 });
  micro(ctx, `01 / ${pad(LINEUP.length, 2)}`, x + w - 24, y + 40, { size: 15, align: 'right' });
  dashed(ctx, x + 24, x + w - 24, y + 56, { lw: 2 });
  text(ctx, 'HALLUCINATION CLUB', x + 24, y + 108, { font: F.display(46, 800), track: -.5 });
  text(ctx, 'V1.0 — 2026 EDITION', x + 24, y + 152, { font: F.display(46, 800), track: -.5 });
  text(ctx, '$' + p.price, x + w - 24, y + 136, { font: F.grotesk(52, 700), align: 'right' });
  dashed(ctx, x + 24, x + w - 24, y + 176, { lw: 2 });
  micro(ctx, 'CHOOSE YOUR OPTIONS', x + 24, y + 212, { size: 15 });
  text(ctx, '↗', x + w - 24, y + 214, { font: F.grotesk(26, 600), align: 'right' });
}

/* ================================================================== 03 THE CLUB (f256–319) */
function clubCards() {
  return [
    { img: IMG.monkeyById['0013'], k: 'CHAOS MONKEY Nº 0013 · SELF-GRADED', v: 'WROTE THE ANSWER. GRADED IT. A+.', rot: -3.5, crop: [0, 0, 1, .885] },
    { img: IMG.monkeyById['0002'], k: 'CHAOS MONKEY Nº 0002 · TEMPERATURE 2.0', v: 'MAXIMUM CREATIVITY. MINIMUM SENSE.', rot: 3, crop: [0, 0, 1, .885] },
    { img: IMG.human, k: 'FIELD TEST / OUTSIDE THE SIMULATION', v: 'REAL HUMAN. EXCELLENT TASTE.', rot: -2, crop: [0, .04, 1, .7] },
  ];
}
function polaroid(ctx, c, x, y, w, h) {
  box(ctx, x, y, w, h, { fill: C.paper });
  const ins = 18, ph = h - 118;
  ctx.save(); ctx.beginPath(); ctx.rect(x + ins, y + ins, w - ins * 2, ph - ins); ctx.clip(); cover(ctx, c.img, x + ins, y + ins, w - ins * 2, ph - ins, c.crop || [0, 0, 1, 1], [.5, .3]); ctx.restore();
  ctx.lineWidth = 2; ctx.strokeStyle = C.ink; ctx.strokeRect(x + ins, y + ins, w - ins * 2, ph - ins);
  micro(ctx, c.k, x + ins, y + ph + 38, { size: 15 });
  text(ctx, c.v, x + ins, y + ph + 82, { font: F.display(36, 800), track: -.5 });
}
function actClub(ctx, f) {
  fill(ctx, C.blue);
  const d = f - 256, beat = Math.min(3, Math.floor(d / 16)), bd = d - beat * 16;
  const cards = clubCards();
  // cards: each drops in on its beat and stays, fanned
  for (let i = 0; i <= Math.min(beat, 2); i++) {
    const t = i * 16, a = E.spring(inv(t, t + 10, d)), c = cards[i];
    const fan = E.inOutCubic(inv(48, 56, d));
    const baseX = lerp(1250, 1260, fan) + (i - 1) * lerp(0, 150, fan), rot = (c.rot + (i - 1) * lerp(0, 4, fan)) * Math.PI / 180;
    const fall = (1 - Math.min(1, a)) * -900;
    const sc = lerp(1, .66, fan);
    about(ctx, baseX + 270, 500 + fall, rot + (1 - Math.min(1, a)) * .3, sc, () => polaroid(ctx, c, baseX, 170 + fall, 540, 660));
  }
  // headline per beat
  const X0 = 104;
  if (beat === 0) {
    const ins = E.outBack(inv(7, 11, d), 2.2);           // "IN" is inserted as a tracked change
    heading(ctx, [{ s: 'FOR THE', color: C.paper }, { s: 'CONFIDENTLY', color: C.paper }], X0, 330, 168, { lh: .86 });
    const y3 = 330 + 168 * .86 * 2, size = 168;
    const inW = measure(ctx, 'IN', F.display(size), -size * .02) * ins;
    if (ins > 0) {
      ctx.fillStyle = C.yellow; ctx.fillRect(X0 - 6, y3 - size * .78, inW + 12, size * .9);
      ctx.save(); ctx.beginPath(); ctx.rect(X0, y3 - size, inW, size * 1.2); ctx.clip();
      text(ctx, 'IN', X0, y3, { font: F.display(size), color: C.ink, track: -size * .02 }); ctx.restore();
      // the caret of the edit
      ctx.fillStyle = C.red; ctx.fillRect(X0 + inW + 4, y3 - size * .8, 6, size * .9);
    }
    const cw = text(ctx, 'CORRECT', X0 + inW + (ins > 0 ? 14 : 0), y3, { font: F.display(size), color: C.yellow, track: -size * .02 });
    text(ctx, '.', X0 + inW + (ins > 0 ? 14 : 0) + cw, y3, { font: F.display(size), color: C.yellow });
    micro(ctx, ins > 0 ? '+ SUGGESTED EDIT · ACCEPTED' : 'DRAFT 01', X0, y3 + 70, { size: 17, color: C.paper, alpha: .85 });
  } else if (beat === 1) {
    heading(ctx, [{ s: 'THE', color: C.paper }, { s: 'CREATIVELY', color: C.paper }], X0, 330, 168, { lh: .86 });
    // MISALIGNED., literally: each letter off its baseline and angle
    const y3 = 330 + 168 * .86 * 2, size = 168, word = 'MISALIGNED.';
    let x = X0; const go = E.outBack(inv(1, 9, bd), 2);
    for (let i = 0; i < word.length; i++) {
      const ch = word[i], cw = measure(ctx, ch, F.display(size), 0) - size * .02;
      const dy = (rnd(i, 11) - .5) * 70 * go, rot = (rnd(i, 12) - .5) * .5 * go;
      ctx.save(); ctx.translate(x + cw / 2, y3 - size * .35 + dy); ctx.rotate(rot);
      text(ctx, ch, -cw / 2, size * .35, { font: F.display(size), color: C.yellow }); ctx.restore();
      x += cw;
    }
  } else if (beat === 2) {
    heading(ctx, [{ s: 'THE', color: C.paper }, { s: 'EXTREMELY', color: C.paper }, { s: 'WELL-DRESSED', color: C.yellow, period: true, periodColor: C.yellow }], X0, 330, 168, { lh: .86 });
  } else {
    const e = E.outCubic(inv(-3, 5, bd));
    ctx.save(); ctx.translate(0, (1 - e) * 40);
    micro(ctx, 'THE HALLUCINATION CLUB / OPEN TO ALL', X0 + 22, 268, { size: 17, color: C.paper });
    ctx.fillStyle = C.red; ctx.beginPath(); ctx.arc(X0 + 6, 262, 7, 0, 7); ctx.fill();
    const lines = [['FOR THE CONFIDENTLY ', 'INCORRECT.'], ['THE CREATIVELY ', 'MISALIGNED.'], ['THE EXTREMELY ', 'WELL-DRESSED.']];
    lines.forEach(([a, b], i) => {
      const y = 390 + i * 96, w = text(ctx, a, X0, y, { font: F.display(76, 800), color: C.paper, track: -1.2 });
      text(ctx, b, X0 + w, y, { font: F.display(76, 800), color: C.yellow, track: -1.2 });
    });
    micro(ctx, 'NO LOGIN. NO SECRET HANDSHAKE. JUST GOOD CLOTHES.', X0, 720, { size: 17, color: C.paper, alpha: .9 });
    ctx.restore();
  }
  ticker(ctx, H - 128, 62, TICKER, f * 5.5);
}
