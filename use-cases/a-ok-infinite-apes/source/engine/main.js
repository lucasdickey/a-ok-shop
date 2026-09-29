'use strict';
/* A-OK — Infinite Apes. Frame dispatch, per-section HUD data, finishing. */

function hudConfig(f) {
  if (f < 112) return { color: C.cream, caption: 'P(A-OK) → 1  AS  APES → ∞',
    data: [['APES', commas(apesAt(f))], ['KEYSTROKES', commas(keysAt(f))], ['MATCH', f >= 96 ? 'A-OK' : '— — — —', f >= 96]] };
  if (f < 168) return { color: C.ink, caption: 'SIGNAL ACQUIRED  ·  FIG. 01  ·  THE APE ON THE CAP',
    data: [['OBJECT', 'APE_R03'], ['PASS', 'PAINT 02']] };
  if (f < 224) return { color: C.cream, caption: 'ONE ILLUSTRATION → HUNYUAN3D-2 MINI → BLENDER 4.5 CYCLES',
    data: [['VERTS', '556,765'], ['FACES', '1,110,439'], ['SEED', '29'], ['OCTREE', '512']] };
  if (f < 280) {
    const e = inv(238, 280, f), cell = Math.exp(lerp(Math.log(1080 * 1.045), Math.log(96), E.inOutCubic(e)));
    const count = f < 238 ? 1 : Math.pow(Math.ceil(W / cell) | 1, 1) * (Math.ceil(H / cell) | 1);
    return { color: C.cream, caption: 'THE ARCHIVE  ·  27 ORIGINAL WORKS  ·  NO TWO APES ALIKE',
      data: [['APES', f >= 270 ? '∞' : commas(count), f >= 270]] };
  }
  if (f < 336) return { color: C.cream, caption: 'PRINTED ON DEMAND  ·  TEES + HOODIES  ·  XS–2XL',
    data: [['DROP', '08 PIECES'], ['CHECKOUT', 'STRIPE']] };
  if (f < 392) return { color: f < 370 ? C.cream : C.ink, caption: 'COLLECT 3 UBI CREDITS  ·  PLAY IT AT A-OK.SHOP/GAME',
    data: [['GAME', 'CHAOS MONKEY'], ['MODE', '8-BIT']] };
  return { color: C.ink, alpha: 1 - inv(428, 440, f), caption: 'NERD STREETWEAR (FOR REAL)', data: [['EST.', 'APES ON KEYS']] };
}
const GLITCH = { 167: .5, 168: 1, 169: .35, 279: .45, 280: .8, 335: .4, 336: .7 };
function finishConfig(f) {
  const base = finishBase(f);
  if (GLITCH[f]) base.glitch = GLITCH[f];
  if (f === 111) base.invert = true;
  return base;
}
function finishBase(f) {
  if (f < 112) return { grain: .07, vignette: .45 };
  if (f < 168) return { grain: .06, vignette: .16 };
  if (f < 224) return { grain: .07, vignette: .4 };
  if (f < 336) return { grain: .075, vignette: .3 };
  if (f < 392) return { grain: .05, vignette: .12 };
  return { grain: .05, vignette: .12 };
}

async function renderScene(ctx, f) {
  if (f < 112) actNoise(ctx, f);
  else if (f < 168) await actSignal(ctx, f);
  else if (f < 224) await actModel(ctx, f);
  else if (f < 280) actInfinite(ctx, f);
  else if (f < 336) actWear(ctx, f);
  else if (f < 392) actPlay(ctx, f);
  else actEnd(ctx, f);
}

// Sub-frame motion blur for fast 2D moves: [from, to, samples, shutter in frames].
const BLUR = [[224, 238, 7, .8], [252, 258, 4, .6], [266, 272, 4, .6]];
window.renderFrame = async function (f) {
  const ctx = g2(frameBuf); reset(ctx); ctx.clearRect(0, 0, W, H);
  const b = BLUR.find(([a, z]) => f >= a && f < z);
  if (b) {
    const [a, , n, sh] = b, acc = g2(accum); reset(acc);
    for (let k = 0; k < n; k++) {
      const tf = Math.max(a, f + (k / (n - 1) - .5) * sh);
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
    await loadAssets(); buildGrain(); setupTyping(); readBadge8();
    window.READY = true;
  } catch (e) { window.ERROR = String(e && e.stack || e); }
})();
