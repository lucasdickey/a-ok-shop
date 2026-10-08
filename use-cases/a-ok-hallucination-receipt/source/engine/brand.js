'use strict';
/* A-OK — Hallucination Receipt. The Club Receipt kit: inked boxes with hard offset shadows,
   torn receipt slips, dotted leaders, barcodes, the ✳, the APES ON KEYS stamp, the ticker,
   product cards, and a thermal printer that prints a receipt one dot row at a time. */

const LW = 3;        // ink line weight at 1080p (the site's 2px border, scaled for video)
const SH = 12;       // hard shadow offset (the site's shadow-hard-lg)

/* Run fn with the context rotated/scaled about (cx, cy). */
function about(ctx, cx, cy, rot, scale, fn) {
  ctx.save(); ctx.translate(cx, cy); ctx.rotate(rot); ctx.scale(scale, scale); ctx.translate(-cx, -cy); fn(); ctx.restore();
}

function box(ctx, x, y, w, h, { fill = C.paper, border = LW, shadow = SH, shadowCol = C.ink, radius = 0, alpha = 1 } = {}) {
  ctx.save(); ctx.globalAlpha *= alpha;
  const path = () => { ctx.beginPath(); radius ? ctx.roundRect(x, y, w, h, radius) : ctx.rect(x, y, w, h); };
  if (shadow) { ctx.save(); ctx.translate(shadow, shadow); path(); ctx.fillStyle = shadowCol; ctx.fill(); ctx.restore(); }
  path(); if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (border) { ctx.lineWidth = border; ctx.strokeStyle = C.ink; ctx.save(); path(); ctx.clip(); ctx.lineWidth = border * 2; ctx.stroke(); ctx.restore(); }
  ctx.restore();
}

/* A slip with zigzag (torn) edges. Teeth are 24×12 at 1080p, fitted to a whole number across. */
function slipPath(ctx, x, y, w, h, { top = false, bottom = true, tooth = 24, depth = 12 } = {}) {
  const n = Math.max(1, Math.round(w / tooth)), tw = w / n;
  ctx.beginPath();
  if (top) { ctx.moveTo(x, y + depth); for (let i = 0; i < n; i++) { ctx.lineTo(x + (i + .5) * tw, y); ctx.lineTo(x + (i + 1) * tw, y + depth); } }
  else { ctx.moveTo(x, y); ctx.lineTo(x + w, y); }
  if (bottom) { ctx.lineTo(x + w, y + h - depth); for (let i = n - 1; i >= 0; i--) { ctx.lineTo(x + (i + .5) * tw, y + h); ctx.lineTo(x + i * tw, y + h - depth); } }
  else { ctx.lineTo(x + w, y + h); ctx.lineTo(x, y + h); }
  ctx.closePath();
}
function slip(ctx, x, y, w, h, { fill = C.slip, shadow = SH, top = false, bottom = true, border = LW, alpha = 1 } = {}) {
  ctx.save(); ctx.globalAlpha *= alpha;
  if (shadow) { ctx.save(); ctx.translate(shadow, shadow); slipPath(ctx, x, y, w, h, { top, bottom }); ctx.fillStyle = C.ink; ctx.fill(); ctx.restore(); }
  slipPath(ctx, x, y, w, h, { top, bottom }); ctx.fillStyle = fill; ctx.fill();
  if (border) { ctx.lineWidth = border; ctx.strokeStyle = C.ink; ctx.lineJoin = 'miter'; ctx.stroke(); }
  ctx.restore();
}

/* The site's vector ✳ (components/Asterisk.tsx): spokes reach 8.5 of a 12-unit radius. */
function asterisk(ctx, cx, cy, size, rot = 0, color = C.red, weight = .12) {
  ctx.save(); ctx.translate(cx, cy); ctx.rotate(rot); ctx.strokeStyle = color; ctx.lineWidth = size * weight; ctx.lineCap = 'butt';
  const r = size * 8.5 / 24; ctx.beginPath();
  for (let k = 0; k < 4; k++) { const a = k * Math.PI / 4; ctx.moveTo(-Math.cos(a) * r, -Math.sin(a) * r); ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
  ctx.stroke(); ctx.restore();
}
function check(ctx, cx, cy, s, color = C.ink, lw = s * .16) {
  ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.lineCap = 'square'; ctx.lineJoin = 'miter'; ctx.beginPath();
  ctx.moveTo(cx - s * .42, cy + s * .02); ctx.lineTo(cx - s * .12, cy + s * .32); ctx.lineTo(cx + s * .45, cy - s * .32); ctx.stroke(); ctx.restore();
}

/* The red APES ON KEYS badge from the homepage hero. */
function stamp(ctx, cx, cy, r, rot = .21, { lines = ['APES', 'ON KEYS'], sub = 'EVERYONE’S A MEMBER.', fill = C.red, color = C.paper, alpha = 1 } = {}) {
  ctx.save(); ctx.globalAlpha *= alpha; ctx.translate(cx, cy); ctx.rotate(rot);
  ctx.fillStyle = C.ink; ctx.beginPath(); ctx.arc(r * .06, r * .06, r, 0, 7); ctx.fill();
  ctx.fillStyle = fill; ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.fill();
  ctx.lineWidth = LW; ctx.strokeStyle = C.ink; ctx.stroke();
  const fs = r * .34, lh = fs * .9, y0 = -(lines.length - 1) * lh / 2 - r * .1;
  lines.forEach((l, i) => text(ctx, l, 0, y0 + i * lh, { font: F.display(fs, 800), color, align: 'center', base: 'middle' }));
  if (sub) text(ctx, sub, 0, y0 + lines.length * lh - lh * .05, { font: F.mono(r * .085, 500), color, align: 'center', base: 'middle', track: r * .01 });
  ctx.restore();
}

/* Deterministic barcode: bar and gap widths from a seed. */
function barcode(ctx, x, y, w, h, seed = 7, color = C.ink) {
  const r = rng(seed); const bars = []; let total = 0;
  while (total < w) { const b = 1 + Math.floor(r() * 4), g = 1 + Math.floor(r() * 3); bars.push([b, g]); total += b + g; }
  const s = w / total; let px = x; ctx.fillStyle = color;
  for (const [b, g] of bars) { ctx.fillRect(px, y, b * s, h); px += (b + g) * s; }
}

/* A mono line with a dotted leader between label and value (the receipt's line items). */
function leader(ctx, label, value, x, y, w, { font = F.mono(28, 700), color = C.ink, dot = '.', valueColor = color, alpha = 1 } = {}) {
  ctx.save(); ctx.font = font; ctx.letterSpacing = '0px';
  const lw = ctx.measureText(label).width, vw = ctx.measureText(value).width, dw = ctx.measureText(dot + ' ').width;
  text(ctx, label, x, y, { font, color, alpha });
  text(ctx, value, x + w, y, { font, color: valueColor, align: 'right', alpha });
  const n = Math.max(0, Math.floor((w - lw - vw - dw * 1.2) / dw));
  text(ctx, (' ' + dot).repeat(n), x + lw + dw * .3, y, { font, color, alpha: alpha * .9 });
  ctx.restore();
}
function dashed(ctx, x0, x1, y, { color = C.ink, lw = 2, dash = [10, 7], alpha = 1 } = {}) {
  ctx.save(); ctx.globalAlpha *= alpha; ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.setLineDash(dash); ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y); ctx.stroke(); ctx.restore();
}
function micro(ctx, str, x, y, { color = C.ink, size = 16, align = 'left', alpha = 1, weight = 500 } = {}) {
  return text(ctx, str.toUpperCase(), x, y, { font: F.mono(size, weight), color, align, track: size * .06, alpha });
}

/* Stacked display lines (Barlow Condensed, uppercase, tight). Each line may carry its own color,
   reveal progress (0–1, a hard mask from the baseline up) and a trailing red period. */
function heading(ctx, lines, x, y, size, { lh = .86, color = C.ink, align = 'left', track = -.02, weight = 900 } = {}) {
  let yy = y;
  for (const L of lines) {
    const o = typeof L === 'string' ? { s: L } : L;
    if (o.show === false || o.p === 0) { yy += size * lh; continue; }
    const font = F.display(size, o.weight || weight), col = o.color || color;
    ctx.save();
    if (o.p !== undefined && o.p < 1) { ctx.beginPath(); ctx.rect(-1e4, yy - size * (.78 + .1) * o.p + size * .12 * (1 - o.p), 2e4, size * 1.2); ctx.clip(); }
    const wMain = text(ctx, o.s, x, yy, { font, color: col, align, track: size * track });
    if (o.period) {
      const px = align === 'left' ? x + wMain : align === 'right' ? x : x + wMain / 2;
      const pw = measure(ctx, '.', font);
      const pulse = o.pulse || 1;
      ctx.save(); ctx.translate(px + pw * .5, yy - size * .08); ctx.scale(pulse, pulse);
      text(ctx, '.', -pw * .5, size * .08, { font, color: o.periodColor || C.red });
      ctx.restore();
    }
    ctx.restore();
    yy += size * lh;
  }
  return yy;
}

/* The red ticker band (homepage): mono statements separated by ✳, scrolling by `offset`. */
function ticker(ctx, y, h, items, offset, { bg = C.red, fg = C.paper, size = 22, gap = 64, x0 = 0, x1 = W } = {}) {
  ctx.save(); ctx.beginPath(); ctx.rect(x0, y, x1 - x0, h); ctx.clip();
  ctx.fillStyle = bg; ctx.fillRect(x0, y, x1 - x0, h);
  ctx.fillStyle = C.ink; ctx.fillRect(x0, y, x1 - x0, LW); ctx.fillRect(x0, y + h - LW, x1 - x0, LW);
  const font = F.mono(size, 500), cy = y + h / 2;
  const widths = items.map(s => measure(ctx, s, font, size * .06) + gap * 2);
  const loop = widths.reduce((a, b) => a + b, 0);
  let x = x0 - (((offset % loop) + loop) % loop);
  while (x < x1) {
    for (let i = 0; i < items.length; i++) {
      text(ctx, items[i], x + gap, cy, { font, color: fg, base: 'middle', track: size * .06 });
      asterisk(ctx, x + widths[i], cy, size * 1.5, 0, fg, .1);
      x += widths[i];
    }
  }
  ctx.restore();
}

/* Square inked button with the red hard shadow (.btn-primary). */
function button(ctx, x, y, w, h, label, { bg = C.ink, fg = C.yellow, shadowCol = C.red, size = 26 } = {}) {
  box(ctx, x, y, w, h, { fill: bg, shadow: 8, shadowCol });
  text(ctx, label, x + 26, y + h / 2, { font: F.grotesk(size, 600), color: fg, base: 'middle' });
  text(ctx, '↗', x + w - 26, y + h / 2, { font: F.grotesk(size, 600), color: fg, align: 'right', base: 'middle' });
}

/* The hero arch: a paper frame with a rounded top, holding a photo. */
function arch(ctx, x, y, w, h, img, { crop, focus, inset = 18, shadow = SH } = {}) {
  const r = w / 2;
  const path = (ix) => { ctx.beginPath(); ctx.moveTo(x + ix, y + h); ctx.lineTo(x + ix, y + r); ctx.arc(x + w / 2, y + r, r - ix, Math.PI, 0); ctx.lineTo(x + w - ix, y + h); ctx.closePath(); };
  ctx.save(); ctx.translate(shadow, shadow); path(0); ctx.fillStyle = C.ink; ctx.fill(); ctx.restore();
  path(0); ctx.fillStyle = C.paper; ctx.fill(); ctx.lineWidth = LW; ctx.strokeStyle = C.ink; ctx.stroke();
  ctx.save(); path(inset); ctx.clip(); cover(ctx, img, x + inset, y + inset, w - inset * 2, h - inset, crop, focus); ctx.restore();
}

/* Halftone dots fading in from one edge (the product label's 8-bit halftone). */
function halftone(ctx, x, y, w, h, { color = C.ink, step = 9, max = 2.6, alpha = .14 } = {}) {
  ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip(); ctx.fillStyle = color; ctx.globalAlpha *= alpha;
  for (let yy = y + step / 2; yy < y + h; yy += step) for (let xx = x + step / 2; xx < x + w; xx += step) {
    const t = (xx - x) / w, r = max * Math.pow(t, 1.4); if (r < .3) continue; ctx.fillRect(xx - r, yy - r, r * 2, r * 2);
  }
  ctx.restore();
}

/* A product card in the site's ProductCard style: photo over a slip label with a torn edge. */
const PHOTO_BG = [C.yellow, C.sky, C.gold];
function productCard(ctx, p, x, y, w, h, { index = 0, label = true, glow = 0, bg } = {}) {
  const labelH = label ? Math.round(h * .2) : 0, ph = h - labelH;
  // drop shadow follows the torn edge, like the site's drop-shadow filter
  ctx.save(); ctx.translate(SH * .8, SH * .8); slipPath(ctx, x, y, w, h + 12, { bottom: true }); ctx.fillStyle = C.ink; ctx.fill(); ctx.restore();
  ctx.fillStyle = bg || PHOTO_BG[index % 3]; ctx.fillRect(x, y, w, ph);
  ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, ph); ctx.clip(); cover(ctx, p.image, x, y, w, ph, p.crop); ctx.restore();
  if (glow > 0) { ctx.save(); ctx.globalAlpha = glow * .55; ctx.fillStyle = '#ffffff'; ctx.fillRect(x, y, w, ph); ctx.restore(); }
  if (label) {
    slipPath(ctx, x, y + ph, w, labelH + 12, { bottom: true }); ctx.fillStyle = C.slip; ctx.fill();
    halftone(ctx, x, y + ph, w, labelH, { step: Math.max(6, w / 46) });
    ctx.fillStyle = C.ink; ctx.fillRect(x, y + ph - LW / 2, w, LW);
    const s = Math.max(12, w * .045);
    micro(ctx, p.cat || (/(HOODIE|CREW)/.test(p.name) ? 'HOODIES + CREWS' : 'TEES'), x + w * .06, y + ph + labelH * .36, { color: C.red, size: s * .9 });
    text(ctx, p.name, x + w * .06, y + ph + labelH * .78, { font: F.grotesk(s * 1.25, 700), color: C.ink });
    text(ctx, '$' + p.price, x + w * .94, y + ph + labelH * .78, { font: F.grotesk(s * 1.25, 700), color: C.ink, align: 'right' });
  }
  // ITEM / 01 tag
  const ts = Math.max(11, w * .036), tw = measure(ctx, 'ITEM / 00', F.mono(ts, 700)) + ts * 1.2;
  ctx.fillStyle = C.paper; ctx.fillRect(x + ts, y + ts, tw, ts * 1.9); ctx.lineWidth = 1.5; ctx.strokeStyle = C.ink; ctx.strokeRect(x + ts, y + ts, tw, ts * 1.9);
  text(ctx, 'ITEM / ' + pad(index + 1, 2), x + ts * 1.6, y + ts * 2.32, { font: F.mono(ts, 700), color: C.ink });
  // outline (sides and top; the torn bottom is part of the label)
  ctx.lineWidth = LW; ctx.strokeStyle = C.ink; slipPath(ctx, x, y, w, h + 12, { bottom: label }); ctx.stroke();
}

/* ------------------------------------------------------------------ the thermal printer
   A receipt is a list of lines laid out top to bottom in paper coordinates. Each line prints
   at frame `at` over `dur` frames: the paper feeds by the line's height, and the line is
   revealed only above the print head, so glyphs appear dot row by dot row. */
class Receipt {
  constructor(w, lines, { pad = 36 } = {}) {
    this.w = w; this.pad = pad; this.lines = lines; let y = 0;
    for (const L of lines) { L.y = y; y += L.h; }
    this.height = y;
  }
  feed(f) { let p = 0; for (const L of this.lines) p += L.h * clamp((f - L.at) / (L.dur || 4)); return p; }
  /* Draw with the print head at screen y `head`; content above `top` (screen) is skipped. */
  draw(ctx, x, head, f, { top = -1e5, paper = C.slip, shadow = SH, feedOverride, tornTop = false } = {}) {
    const feed = feedOverride ?? this.feed(f), y0 = head - feed;     // screen y of paper coordinate 0
    const ptop = Math.max(top, y0 - (tornTop ? 24 : this.pad + 2000));
    ctx.save();
    ctx.beginPath(); ctx.rect(x - 200, -1e5, this.w + 400, head + 1e5); ctx.clip();
    ctx.fillStyle = C.ink; ctx.fillRect(x + shadow, ptop, this.w, head - ptop);
    ctx.fillStyle = paper; ctx.fillRect(x, ptop, this.w, head - ptop);
    ctx.fillStyle = C.ink; ctx.fillRect(x - LW / 2, ptop, LW, head - ptop); ctx.fillRect(x + this.w - LW / 2, ptop, LW, head - ptop);
    if (tornTop && ptop > top) {
      // the receipt's own torn top edge
      ctx.fillStyle = C.ink; slipPath(ctx, x + shadow, ptop - 12, this.w, 30, { top: true, bottom: false }); ctx.fill();
      slipPath(ctx, x, ptop - 12, this.w, 30, { top: true, bottom: false }); ctx.fillStyle = paper; ctx.fill(); ctx.lineWidth = LW; ctx.strokeStyle = C.ink; ctx.stroke();
      ctx.fillStyle = paper; ctx.fillRect(x + LW / 2, ptop + 14, this.w - LW, 8);
    }
    for (const L of this.lines) {
      const sy = y0 + L.y; if (sy + L.h < top || sy > head) continue;
      this.line(ctx, L, x + this.pad, sy, this.w - this.pad * 2, f);
    }
    ctx.restore();
    return y0;
  }
  line(ctx, L, x, y, w, f) {
    const base = y + L.h * .72;
    switch (L.t) {
      case 'text': text(ctx, L.s, L.align === 'center' ? x + w / 2 : L.align === 'right' ? x + w : x, base, { font: L.font || F.mono(28, 700), color: L.color || C.ink, align: L.align || 'left', track: L.track || 0 }); break;
      case 'leader': leader(ctx, L.l, L.r, x, base, w, { font: L.font || F.mono(28, 700), color: L.color || C.ink, valueColor: L.valueColor }); break;
      case 'rule': if (L.style === 'dashed') dashed(ctx, x, x + w, y + L.h / 2, { lw: 2.5 }); else { ctx.fillStyle = C.ink; ctx.fillRect(x, y + L.h / 2 - 2, w, 4); if (L.style === 'double') ctx.fillRect(x, y + L.h / 2 + 6, w, 4); } break;
      case 'barcode': barcode(ctx, x, y + 6, w * (L.wf || 1), L.h - 12, L.seed || 3); break;
      case 'fn': L.draw(ctx, x, y, w, f); break;
    }
  }
}
