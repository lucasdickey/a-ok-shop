'use strict';
/* A-OK — Hallucination Receipt. Frame dispatch, the receipt HUD, motion blur and finishing. */

function sectionAt(f) { let s = SECTIONS[0]; for (const x of SECTIONS) if (f >= x[0]) s = x; return s; }

/* The HUD prints the film as a receipt: item number and name, live line items, order total. */
function hudConfig(f) {
  if (f < 192) {
    const { s } = camTheorem(f), cols = Math.max(1, Math.round(W / (ROLL.pitch * s)));
    const apes = f < 100 ? 1 : f >= 150 ? '∞' : commas(Math.pow(cols, 1 + 2.4 * inv(100, 150, f)));
    return { color: C.paper, caption: '∞ APES × ∞ KEYS × ∞ COMPUTE = EVENTUALLY, EVERYTHING',
      data: [['APES', String(apes), apes === '∞'], ['LINES', commas(Math.min(f, FREEZE) * 37 * Math.max(1, Math.pow(cols, 1.6)))], ['CONFIDENCE', 'HIGH']] };
  }
  if (f < 256) return { color: f < 208 || f >= 224 ? C.ink : C.yellow, caption: 'THE HALLUCINATION CLUB / OPEN TO ALL', alpha: f < 224 ? .0 : 1,
    data: [['CONFIDENCE', 'HIGH'], ['ACCURACY', 'DEBATABLE', true]] };
  if (f < 320) return { color: C.paper, caption: 'NO LOGIN. NO SECRET HANDSHAKE. JUST GOOD CLOTHES.', data: [['MEMBERS', 'EVERYONE']] };
  if (f < 384) return { color: C.ink, caption: 'DRIP-BENCH V2 · BENCHMARK DESIGNED, RUN AND GRADED BY A–OK', data: [['EVAL', 'SELF-GRADED', true]] };
  if (f < 512) { const n = typeof scansDone === 'function' ? scansDone(f) : 0;
    return { color: C.paper, caption: 'PRINTED ON DEMAND · TEES, HOODIES + CREWS · XS–2XL',
      data: [['ITEMS', `${pad(n, 2)}/${LINEUP.length}`], ['SUBTOTAL', '$' + subtotal(n)]] }; }
  if (f < 576) { const g = typeof gameAt === 'function' ? gameAt(f) : { credits: 7 };
    return { color: C.paper, caption: 'RUN, HUMAN, RUN! · PLAY IT AT A-OK.AI/GAME', data: [['UBI CREDITS', `${g.credits}/10`, g.credits >= 10], ['LIVES', '3']] }; }
  if (f < 640) return { color: C.ink, caption: 'AGENTS WELCOME · HUMANS STILL PICK THE SIZE', data: [['HTTP', f < 620 ? '402' : '200', f >= 620], ['STATUS', f < 620 ? 'PENDING' : 'PAID']] };
  if (f < 704) return { color: C.ink, caption: 'FIG. 08 · THE OPERATOR · FRONT / SIDE / BACK', data: [['ANGLES', 'ALL'], ['CERTAINTY', 'NO ADDITIONAL']] };
  if (f < 768) return { color: f < 728 ? C.paper : C.paper, caption: `${CATALOG.length} PIECES · ${MONKEYS.length + 1} CHAOS MONKEYS · NO TWO APES ALIKE`, data: [['MODELS', 'THE BEST', true]] };
  if (f < 832) return { color: C.paper, caption: 'GOOD IDEAS. QUESTIONABLE SOURCES.', data: [['TOTAL', 'STILL HALLUCINATING', true]] };
  return { color: C.ink, alpha: 1 - inv(834, 842, f), caption: '', data: [] };
}
function subtotal(n) { let s = 0; for (let i = 0; i < n; i++) s += LINEUP[i].price; return commas(s); }

function hud(ctx, f, { color = C.paper, alpha = 1, caption = '', data = [] } = {}) {
  if (alpha <= 0) return;
  ctx.save(); ctx.globalAlpha = alpha;
  const [start, idx, name] = sectionAt(f), age = f - start;
  const L = 64, R = W - 64, T = 58, B = H - 40;
  text(ctx, 'A–OK', L, T, { font: F.logo(30), color, track: -30 * .09 });
  ctx.fillStyle = color; ctx.globalAlpha = alpha * .5; ctx.fillRect(L + 92, T - 24, 2, 26); ctx.globalAlpha = alpha;
  micro(ctx, scramble(`ITEM ${idx}/11 — ${name}`, clamp(age / 9), +idx, f), L + 112, T - 3, { color, size: 15, weight: 700 });
  let x = R;
  for (let i = data.length - 1; i >= 0; i--) {
    const [k, v, hot] = data[i];
    const vw = text(ctx, v, x, T - 3, { font: F.mono(15, 700), color: hot ? (color === C.ink ? C.red : C.yellow) : color, align: 'right', track: .8 });
    const kw = text(ctx, k, x - vw - 12, T - 3, { font: F.mono(12, 500), color, align: 'right', track: 1.6, alpha: .6 });
    x -= vw + 12 + kw + 34;
  }
  dashed(ctx, L, R, T + 20, { color, lw: 1.5, dash: [6, 6], alpha: .35 });
  dashed(ctx, L, R, B - 28, { color, lw: 1.5, dash: [6, 6], alpha: .35 });
  if (caption) micro(ctx, caption, L, B, { color, size: 14, alpha: .85 });
  micro(ctx, `ORDER #∞ · ${timecode(f)} · ${pad(f, 3)}/${TOTAL}`, R, B, { color, size: 14, align: 'right', alpha: .85 });
  ctx.restore();
}

const GLITCH = { 191: .35, 383: .3, 575: .3, 767: .4 };
function finishConfig(f) {
  const o = { grain: .05, paper: .3 };
  if (f < 192) { o.paper = .15; o.vignette = .35; o.grain = .07; }
  if (GLITCH[f]) o.glitch = GLITCH[f];
  return o;
}

async function renderScene(ctx, f) {
  if (f < 192) actTheorem(ctx, f);
  else if (f < 256) actGoodTaste(ctx, f);
  else if (f < 320) { actClub(ctx, f); if (f >= 314) actBench(ctx, 320, H * (1 - E.outCubic(inv(314, 320, f)))); }
  else if (typeof actRest === 'function') actRest(ctx, f);
  else fill(ctx, '#333');
}

// Sub-frame motion blur for fast moves: [from, to, samples, shutter in frames].
const BLUR = [[100, 150, 4, .7], [166, 186, 7, .9], [352, 366, 4, .7], [374, 384, 4, .8], [452, 512, 4, .5], [756, 768, 4, .8], [832, 848, 5, .8]];
window.renderFrame = async function (f) {
  const ctx = g2(frameBuf); reset(ctx); ctx.clearRect(0, 0, W, H);
  const b = BLUR.find(([a, z]) => f >= a && f < z);
  if (b) {
    const [a, z, n, sh] = b, acc = g2(accum); reset(acc);
    for (let k = 0; k < n; k++) {
      const tf = clamp(f + (k / (n - 1) - .5) * sh, a, z - .001);
      reset(ctx); ctx.clearRect(0, 0, W, H); await renderScene(ctx, tf);
      acc.globalAlpha = 1 / (k + 1); acc.drawImage(frameBuf, 0, 0);
    }
    reset(acc); reset(ctx); ctx.drawImage(accum, 0, 0);
  } else await renderScene(ctx, f);
  reset(ctx); hud(ctx, f, hudConfig(f));
  finish(frameBuf, f, finishConfig(f));
  return true;
};

window.READY = false;
(async () => {
  try {
    await loadAssets(); buildTextures(); buildTheorem();
    if (typeof buildRest === 'function') buildRest();
    window.READY = true;
  } catch (e) { window.ERROR = String(e && e.stack || e); }
})();
