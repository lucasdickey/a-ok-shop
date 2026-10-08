'use strict';
/* A-OK — Hallucination Receipt. Score and sound design, synthesized offline and locked to picture.
   One beat = 16 frames = 0.5333 s (112.5 BPM). Fifteen bars = 960 frames = 32.0 s. Key: G minor.
   The receipt printer, the scanner, the register and the camera are part of the rhythm section. */

const SR = 48000, DUR = TOTAL / FPS, SPB = BEAT / FPS, S16 = SPB / 4, SWING = S16 * .2;
const fT = f => f / FPS;
const barT = (bar, step = 0) => fT(fb(bar)) + step * S16 + (Number.isInteger(step) && step % 2 === 1 ? SWING : 0);
const hz = m => 440 * Math.pow(2, (m - 69) / 12);
const N = { G1: 31, A1: 33, Bb1: 34, C2: 36, D2: 38, Eb2: 39, F2: 41, G2: 43, A2: 45, Bb2: 46, C3: 48, D3: 50, Eb3: 51, F3: 53, Fs3: 54, G3: 55, A3: 57, Bb3: 58,
  C4: 60, D4: 62, Eb4: 63, F4: 65, Fs4: 66, G4: 67, A4: 69, Bb4: 70, C5: 72, D5: 74, Eb5: 75, F5: 77, G5: 79, A5: 81, Bb5: 82, C6: 84, D6: 86, F6: 89, G6: 91, Bb6: 94, C7: 96, D7: 98, F7: 101, G7: 103, Bb7: 106 };
// One chord per bar from the drop: i9 – VImaj7 – iv9 – V7#9.
const CHORDS = {
  Gm: { root: N.G1, notes: [N.Bb3, N.D4, N.F4, N.A4] }, Eb: { root: N.Eb2, notes: [N.G3, N.Bb3, N.D4, N.F4] },
  Cm: { root: N.C2, notes: [N.Eb4, N.G3, N.Bb3, N.D4] }, D7: { root: N.D2, notes: [N.Fs3, N.C4, N.F4, N.A3] },
};
const PROG = { 4: 'Gm', 5: 'Eb', 6: 'Cm', 7: 'D7', 8: 'Gm', 9: 'Eb', 10: 'Cm', 11: 'D7', 12: 'Gm', 13: 'Eb', 14: 'Cm', 15: 'Gm' };

window.renderAudio = async function () {
  const ac = new OfflineAudioContext(2, Math.round(SR * DUR), SR);
  const R = rng(1129);

  /* ---------------------------------------------------------------- buses
     A clean float mix with headroom; glue, loudness and limiting are mastered in ffmpeg. */
  const master = ac.createGain(); master.gain.value = .3;
  const outG = ac.createGain(); master.connect(outG); outG.connect(ac.destination);
  outG.gain.setValueAtTime(1, 0); outG.gain.setValueAtTime(1, DUR - .6); outG.gain.linearRampToValueAtTime(0, DUR - .01);
  const tone = ac.createBiquadFilter(); tone.type = 'lowpass'; tone.Q.value = .9; tone.frequency.value = 20000; tone.connect(master);
  const drums = ac.createGain(); drums.connect(tone);
  const music = ac.createGain(); music.connect(tone);
  const sfx = ac.createGain(); sfx.connect(master);
  const verb = ac.createConvolver(); verb.buffer = impulse(2.1); const verbOut = ac.createGain(); verbOut.gain.value = .28;
  const verbHP = ac.createBiquadFilter(); verbHP.type = 'highpass'; verbHP.frequency.value = 400; verb.connect(verbHP); verbHP.connect(verbOut); verbOut.connect(master);
  // the agents scene is heard through the terminal: the band goes dull and small
  tone.frequency.setValueAtTime(20000, fT(575)); tone.frequency.exponentialRampToValueAtTime(900, fT(578));
  tone.frequency.setValueAtTime(900, fT(636)); tone.frequency.exponentialRampToValueAtTime(20000, fT(642));

  /* ---------------------------------------------------------------- sources */
  const NOISE = ac.createBuffer(2, SR * 3, SR);
  for (let c = 0; c < 2; c++) { const d = NOISE.getChannelData(c); for (let i = 0; i < d.length; i++) d[i] = R() * 2 - 1; }
  const SAT = new Float32Array(1024).map((_, i) => Math.tanh((i / 511.5 - 1) * 2.4) / Math.tanh(2.4));
  function impulse(sec) {
    const n = Math.round(SR * sec), b = ac.createBuffer(2, n, SR);
    for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); let lp = 0;
      for (let i = 0; i < n; i++) { const t = i / n; lp += ((R() * 2 - 1) - lp) * (.9 - .75 * t); d[i] = lp * Math.pow(1 - t, 2.8) * (i < 480 ? i / 480 : 1); } }
    return b;
  }
  const noise = (t, dur) => { const s = ac.createBufferSource(); s.buffer = NOISE; s.start(Math.max(0, t), R() * 1.8, dur + .05); return s; };
  const osc = (type, f, t, dur) => { const o = ac.createOscillator(); o.type = type; o.frequency.setValueAtTime(f, Math.max(0, t)); o.start(Math.max(0, t)); o.stop(t + dur + .05); return o; };
  const filt = (type, f, q = .7) => { const b = ac.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = q; return b; };
  const pan = p => { const s = ac.createStereoPanner(); s.pan.value = clamp(p, -1, 1); return s; };
  function env(t, peak, a, d) { const g = ac.createGain(); g.gain.setValueAtTime(.00001, t); g.gain.linearRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(.00001, t + a + d); return g; }
  function chain(...n) { for (let i = 0; i < n.length - 1; i++) n[i].connect(n[i + 1]); return n[n.length - 1]; }
  function send(node, amt) { const g = ac.createGain(); g.gain.value = amt; node.connect(g); g.connect(verb); }

  /* ---------------------------------------------------------------- drums */
  function kick(t, amp = 1) {
    const o = osc('sine', 160, t, .55); o.frequency.exponentialRampToValueAtTime(58, t + .05); o.frequency.exponentialRampToValueAtTime(43, t + .4);
    const sh = ac.createWaveShaper(); sh.curve = SAT; chain(o, sh, env(t, amp, .002, .42), drums);
    chain(noise(t, .02), filt('highpass', 2400), env(t, amp * .32, .0005, .012), drums);
  }
  function boom(t, amp = .6) { const o = osc('sine', 72, t, 1.2); o.frequency.exponentialRampToValueAtTime(30, t + 1); chain(o, env(t, amp * .5, .004, 1.1), drums); }
  function clap(t, amp = .5, rev = .35) {
    for (let k = 0; k < 4; k++) { const tt = t + k * .009, last = k === 3;
      const g = chain(noise(tt, .3), filt('bandpass', 1300, 1.1), env(tt, amp * (last ? 1 : .55), .0008, last ? .17 : .01)); g.connect(drums); if (last) send(g, rev); }
  }
  function snare(t, amp = .4, tn = 200) {
    const g = chain(noise(t, .25), filt('bandpass', 2200, .8), filt('highpass', 700), env(t, amp, .001, .14)); g.connect(drums); send(g, .15);
    const o = osc('triangle', tn, t, .12); o.frequency.exponentialRampToValueAtTime(tn * .78, t + .08); chain(o, env(t, amp * .5, .001, .08), drums);
  }
  function hat(t, amp = .1, open = false, p = .12) { chain(noise(t, open ? .4 : .08), filt('highpass', 7600), filt('bandpass', 10800, .6), env(t, amp, .0008, open ? .24 : .03), pan(p), drums); }
  function rim(t, amp = .14) { chain(osc('square', 1700, t, .03), filt('bandpass', 1900, 3), env(t, amp, .0005, .022), pan(-.2), drums); }
  function crash(t, amp = .32, len = 1.8) { for (const p of [-.5, .5]) { const g = chain(noise(t, len), filt('highpass', 3800), env(t, amp, .002, len), pan(p)); g.connect(drums); send(g, .22); } }
  function shaker(t, amp = .05, p = .3) { chain(noise(t, .06), filt('bandpass', 6000, 1.4), env(t, amp, .006, .04), pan(p), drums); }

  /* ---------------------------------------------------------------- bass and harmony */
  function sub(t, m, dur, amp = .7, from = null) {
    const f = hz(m), o = osc('sine', from ? hz(from) : f * 1.6, t, dur + .3);
    o.frequency.exponentialRampToValueAtTime(f, t + (from ? .1 : .025));
    const g = ac.createGain(); g.gain.setValueAtTime(.00001, t); g.gain.linearRampToValueAtTime(amp * .62, t + .006);
    g.gain.setValueAtTime(amp * .62, t + Math.max(.02, dur - .05)); g.gain.exponentialRampToValueAtTime(.00001, t + dur + .14);
    const sh = ac.createWaveShaper(); sh.curve = SAT; chain(o, sh, g, music);
  }
  function stab(t, ms, amp = .13, dur = .3, cut = 3400) {
    const lp = filt('lowpass', cut, 4); lp.frequency.setValueAtTime(cut, t); lp.frequency.exponentialRampToValueAtTime(380, t + dur);
    const g = chain(lp, env(t, amp, .003, dur)); g.connect(music); send(g, .3);
    for (const m of ms) for (const det of [-10, 0, 10]) { const o = osc('sawtooth', hz(m), t, dur + .1); o.detune.value = det; chain(o, pan(det / 24), lp); }
  }
  function pad(t0, t1, ms, amp, c0, c1, rel = .7) {
    const lp = filt('lowpass', c0, 1.1); lp.frequency.setValueAtTime(c0, t0); lp.frequency.exponentialRampToValueAtTime(c1, t1);
    const g = ac.createGain(); g.gain.setValueAtTime(.00001, t0); g.gain.exponentialRampToValueAtTime(amp, t0 + .05 + (t1 - t0) * .2);
    g.gain.setValueAtTime(amp, t1); g.gain.exponentialRampToValueAtTime(.00001, t1 + rel);
    chain(lp, g, music); send(g, .35);
    for (const m of ms) for (const det of [-13, 5, 16]) { const o = osc('sawtooth', hz(m), t0, t1 - t0 + rel); o.detune.value = det; chain(o, pan(det / 30), lp); }
  }
  function pluck(t, m, amp = .1, dur = .22, p = 0) {
    const lp = filt('lowpass', 4200, 3); lp.frequency.setValueAtTime(4200, t); lp.frequency.exponentialRampToValueAtTime(500, t + dur);
    const g = chain(lp, env(t, amp, .002, dur), pan(p)); g.connect(music); send(g, .25);
    for (const det of [-6, 6]) { const o = osc('sawtooth', hz(m), t, dur + .05); o.detune.value = det; o.connect(lp); }
    chain(osc('square', hz(m - 12), t, dur), filt('lowpass', 1200), env(t, amp * .35, .002, dur * .8), lp);
  }
  function bell(t, m, amp = .09, dur = .9, p = 0, rev = .45) {
    const o = pan(p); o.connect(sfx); send(o, rev);
    for (const [ratio, a, dd] of [[1, 1, 1], [2.76, .36, .45], [5.4, .13, .25], [2, .25, .6]]) chain(osc('sine', hz(m) * ratio, t, dur), env(t, amp * a, .002, dur * dd), o);
  }
  function blip(t, f, amp = .07, dur = .05, type = 'sine', p = 0) { chain(osc(type, f, t, dur), env(t, amp, .001, dur), pan(p), sfx); }
  function sq(t, m, dur, amp = .05, p = 0, type = 'square') {   // chip voice: hard gates
    const o = osc(type, hz(m), t, dur), g = ac.createGain(); amp *= 2.4;
    g.gain.setValueAtTime(0, t); g.gain.setValueAtTime(amp, t + .001); g.gain.setValueAtTime(amp, t + dur * .75); g.gain.linearRampToValueAtTime(0, t + dur);
    chain(o, g, pan(p), sfx);
  }

  /* ---------------------------------------------------------------- foley */
  function printer(t, dur = .13, amp = .16, p = 0) {
    // thermal printer: a stepper-motor whine stepped in pitch, under a buzzy dot-row chatter
    const out = chain(ac.createGain(), pan(p)); out.connect(sfx);
    const base = 780 + R() * 120, o = osc('sawtooth', base, t, dur);
    for (let k = 1; k < 6; k++) o.frequency.setValueAtTime(base * (1 + (k % 2) * .06), t + dur * k / 6);
    chain(o, filt('bandpass', 1500, 4), env(t, amp * .55, .004, dur), out);
    const n = noise(t, dur), am = ac.createGain(); am.gain.value = .5;
    const lfo = osc('square', 165, t, dur), lg = ac.createGain(); lg.gain.value = .5; chain(lfo, lg, am.gain);
    chain(n, filt('bandpass', 3600, 1.4), am, env(t, amp, .003, dur), out);
  }
  function printRoll(t0, t1, amp = .16) {   // the printer running flat out
    const out = sfx, n = noise(t0, t1 - t0), am = ac.createGain(); am.gain.value = .5;
    const lfo = osc('square', 150, t0, t1 - t0); lfo.frequency.exponentialRampToValueAtTime(330, t1); const lg = ac.createGain(); lg.gain.value = .5; chain(lfo, lg, am.gain);
    const bp = filt('bandpass', 2600, 1.2); bp.frequency.setValueAtTime(2600, t0); bp.frequency.exponentialRampToValueAtTime(5200, t1);
    const g = ac.createGain(); g.gain.setValueAtTime(.00001, t0); g.gain.exponentialRampToValueAtTime(amp, t0 + .4); g.gain.setValueAtTime(amp, t1 - .01); g.gain.linearRampToValueAtTime(0, t1);
    chain(n, bp, am, g, out);
    const o = osc('sawtooth', 700, t0, t1 - t0); o.frequency.exponentialRampToValueAtTime(1500, t1);
    const g2 = ac.createGain(); g2.gain.setValueAtTime(.00001, t0); g2.gain.exponentialRampToValueAtTime(amp * .35, t0 + .4); g2.gain.setValueAtTime(amp * .35, t1 - .01); g2.gain.linearRampToValueAtTime(0, t1);
    chain(o, filt('bandpass', 1400, 3), g2, out);
  }
  function key(t, amp = .4, p = 0) {   // mechanical keyboard: clack + thock + bottom-out tick
    const o = pan(p); o.connect(sfx);
    chain(noise(t, .06), filt('bandpass', 2600 + R() * 2200, 2.2), env(t, amp * .9, .0007, .026 + R() * .012), o);
    const th = osc('sine', 150 + R() * 110, t + .003, .09); th.frequency.exponentialRampToValueAtTime(70, t + .06); chain(th, env(t + .003, amp * .5, .001, .05), o);
    chain(noise(t + .011, .02), filt('highpass', 6500), env(t + .011, amp * .3, .0003, .007), o);
  }
  function scanBeep(t, m, amp = .1, p = .1) {
    chain(osc('sine', hz(m), t, .1), env(t, amp, .002, .085), pan(p), sfx);
    chain(osc('square', hz(m), t, .06), filt('lowpass', 5000), env(t, amp * .12, .002, .05), pan(p), sfx);
  }
  function register(t, amp = .22) {   // ka-ching: the drawer and the bell
    chain(noise(t, .15), filt('bandpass', 900, 1.2), env(t, amp * .6, .002, .11), sfx);
    const o = osc('sine', 1200, t, .06); o.frequency.exponentialRampToValueAtTime(400, t + .05); chain(o, env(t, amp * .4, .001, .05), sfx);
    bell(t + .07, N.G6, amp * .45, 1.4, .1, .4); bell(t + .07, N.D7, amp * .3, 1.2, -.1, .4); bell(t + .07, N.Bb6, amp * .22, 1.3, 0, .4);
  }
  function thud(t, amp = .5) {   // rubber stamp
    const o = osc('sine', 120, t, .3); o.frequency.exponentialRampToValueAtTime(48, t + .14); chain(o, env(t, amp, .002, .2), sfx);
    chain(noise(t, .08), filt('lowpass', 2200), env(t, amp * .55, .001, .05), sfx);
  }
  function shutter(t, amp = .3) {   // camera: mirror slap, shutter, flash whine
    chain(noise(t, .03), filt('bandpass', 3200, 1.6), env(t, amp, .0005, .018), sfx);
    chain(noise(t + .045, .05), filt('bandpass', 1800, 1.2), env(t + .045, amp * .8, .0005, .03), sfx);
    const o = osc('sine', 3200, t, .5); o.frequency.exponentialRampToValueAtTime(7600, t + .45); chain(o, env(t, amp * .05, .02, .45), pan(.3), sfx);
    const g = chain(noise(t, .4), filt('highpass', 5000), env(t, amp * .12, .002, .3)); g.connect(sfx); send(g, .5);
  }
  function rip(t, dur = .42, amp = .38) {   // paper tearing: noise chopped into fibres, the tone falling
    const n = noise(t, dur), bp = filt('bandpass', 3000, .9); bp.frequency.setValueAtTime(3000, t); bp.frequency.exponentialRampToValueAtTime(900, t + dur);
    const g = ac.createGain(); g.gain.setValueAtTime(.00001, t);
    for (let k = 0; k < 40; k++) { const tt = t + dur * k / 40; g.gain.setValueAtTime(amp * (.25 + R() * .75) * (1 - k / 48), tt); }
    g.gain.setValueAtTime(.00001, t + dur);
    const o = chain(n, bp, g, pan(0)); o.connect(sfx); send(o, .2);
  }
  function whoosh(t, dur, f0, f1, amp, q = 1.4, p0 = 0, p1 = 0, rev = .2) {
    const bp = filt('bandpass', f0, q); bp.frequency.setValueAtTime(f0, t); bp.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const g = ac.createGain(); g.gain.setValueAtTime(.00001, t); g.gain.exponentialRampToValueAtTime(amp, t + dur * .65); g.gain.exponentialRampToValueAtTime(.00001, t + dur);
    const pn = ac.createStereoPanner(); pn.pan.setValueAtTime(p0, t); pn.pan.linearRampToValueAtTime(p1, t + dur);
    const n = chain(noise(t, dur), bp, g, pn); n.connect(sfx); send(n, rev);
  }
  function riser(t0, t1, amp = .45, f0 = 300, f1 = 9000) {
    const bp = filt('bandpass', f0, 2); bp.frequency.setValueAtTime(f0, t0); bp.frequency.exponentialRampToValueAtTime(f1, t1);
    const g = ac.createGain(); g.gain.setValueAtTime(.002, t0); g.gain.exponentialRampToValueAtTime(amp, t1); g.gain.setValueAtTime(0, t1 + .003);
    const n = chain(noise(t0, t1 - t0), bp, g); n.connect(sfx); send(n, .25);
  }
  function tick(t, amp = .06, f = 2400, p = 0) { chain(noise(t, .02), filt('bandpass', f, 6), env(t, amp, .0005, .012), pan(p), sfx); }

  /* ---------------------------------------------------------------- the groove */
  function groove(bar, { k = 1, c = 1, h = 1, bass = true, chords = true, from = 0, to = 16, fill = false } = {}) {
    const ch = CHORDS[PROG[bar]];
    for (let s = from; s < to; s++) {
      const t = barT(bar, s);
      if (k && [0, 3, 8, 10].includes(s)) kick(t, (s === 3 ? .55 : s === 10 ? .8 : 1) * k);
      if (c && (s === 4 || s === 12)) { clap(t, .48 * c); snare(t, .16 * c); }
      if (h) { hat(t, (s % 2 ? .055 : s % 4 === 0 ? .1 : .075) * h, s === 14, .14); if (s % 2) shaker(t, .03 * h); }
      if (c && s === 7) rim(t, .1 * c);
      if (bass) {
        if (s === 0) sub(t, ch.root, S16 * 2.8, .75);
        if (s === 3) sub(t, ch.root + 12, S16 * 1.6, .55, ch.root);
        if (s === 8) sub(t, ch.root, S16 * 1.8, .7);
        if (s === 10) sub(t, ch.root + (s === 10 ? 7 : 0), S16 * 2.6, .62, ch.root);
        if (s === 14) sub(t, ch.root + 10, S16 * 1.4, .5);
      }
      if (chords && (s === 2 || s === 6 || s === 10 || s === 14)) stab(t, ch.notes, s === 6 ? .1 : .075, .2, 2800);
    }
    if (fill) for (const s of [13, 14, 15]) snare(barT(bar, s), .22 + (s - 13) * .08, 210 + s * 6);
  }
  const MOTIF = [[0, N.D5], [3, N.F5], [6, N.G5], [8, N.Bb5], [10, N.A5], [11, N.G5], [14, N.F5]];
  function motif(bar, amp = .08, shift = 0) { for (const [s, m] of MOTIF) pluck(barT(bar, s), m + shift, amp, .2, .15); }

  /* ================================================================= 01 THE THEOREM: the printer, the apes, the freeze */
  pad(0, fT(160), [N.G2, N.D3, N.Bb3], .05, 180, 2400, .05);
  { const o = osc('sine', hz(N.G1), 0, fT(160)), g = ac.createGain(); g.gain.setValueAtTime(.00001, 0); g.gain.exponentialRampToValueAtTime(.14, 2); g.gain.setValueAtTime(.14, fT(159.5)); g.gain.linearRampToValueAtTime(0, fT(160)); o.frequency.setValueAtTime(hz(N.G1), fT(100)); o.frequency.exponentialRampToValueAtTime(hz(N.G1) * 1.5, fT(160)); chain(o, g, music); }
  // each printed line of the hero receipt; every ∞ rings the register, a step up the scale
  const DINGS = [N.G5, N.Bb5, N.D6, N.F6];
  let di = 0;
  for (const L of HERO.lines) {
    if (L.at < 0 || L.at >= 100) continue;
    printer(fT(L.at), fT(L.dur || 4) + .03, .17, -.05);
    if (L.r === '∞') bell(fT(L.at) + .1, DINGS[di++ % 4], .085, .9, (di - 2) * .2);
    if (L.r === '✓') tick(fT(L.at) + .12, .09, 3000);
  }
  printRoll(fT(100), fT(160), .2);
  // apes on keys: a few keyboards at first, then a roar as the camera finds the rest
  for (let f = 0; f < 160; f += .5) {
    const dens = f < 96 ? .35 : lerp(.4, 3, Math.pow(inv(96, 158, f), 1.5));
    const n = Math.floor(dens) + (R() < dens % 1 ? 1 : 0);
    for (let i = 0; i < n; i++) key(fT(f + R() * .5), (f < 96 ? .06 : .03 + R() * .05) * lerp(.6, 1, inv(96, 150, f)), R() * 1.8 - .9);
  }
  // pulse: a heartbeat from bar two, hats creeping in
  for (const [b, a] of [[4, .3], [6, .34], [8, .4], [10, .46], [12, .5], [14, .56], [16, .6], [17, .5], [18, .64], [19, .55]]) { const t = b * SPB; const o = osc('sine', 120, t, .3); o.frequency.exponentialRampToValueAtTime(45, t + .08); chain(o, filt('lowpass', 400), env(t, a * .8, .003, .22), drums); }
  for (let s = 0; s < 32; s++) if (s % 2 === 0 || s > 16) hat(fT(64) + s * S16, s % 2 ? .03 : .05, false, .2);
  // the build into the freeze: riser and a tightening snare roll
  riser(fT(96), fT(160), .42, 260, 8000);
  { const hits = []; for (let s = 0; s < 8; s += 2) hits.push(s); for (let s = 8; s < 12; s++) hits.push(s); for (let s = 12; s < 16; s += .5) hits.push(s);
    for (const s of hits) if (fT(128) + s * S16 * .5 < fT(160)) snare(fT(128) + s * S16 * .5, .1 + .4 * Math.pow(s / 16, 1.4), 200 + s * 8); }
  // FREEZE: the tape stops
  { const t = fT(160); for (const m of [N.G2, N.D3, N.G3]) { const o = osc('sawtooth', hz(m) * 1.5, t, .4); o.frequency.exponentialRampToValueAtTime(hz(m) * .3, t + .35); chain(o, filt('lowpass', 1800), env(t, .07, .002, .36), music); }
    const o = osc('sine', 90, t, .4); o.frequency.exponentialRampToValueAtTime(30, t + .35); chain(o, env(t, .35, .002, .35), sfx); }
  // the signal: one receipt with good taste
  bell(fT(163), N.G6, .12, 1.6, -.2, .7); bell(fT(163) + .05, N.D7, .1, 1.6, .2, .7); bell(fT(163) + .1, N.Bb6, .08, 1.6, 0, .7);
  for (let k = 0; k < 6; k++) blip(fT(164 + k * 1.2), 3000 + k * 400, .03, .05, 'sine', (k % 2 ? .4 : -.4));
  // the dive
  whoosh(fT(166), fT(20), 200, 7000, .3, 1.2, -.3, .3, .3);
  { const o = osc('sine', 180, fT(166), fT(22)); o.frequency.exponentialRampToValueAtTime(1900, fT(187)); const g = ac.createGain(); g.gain.setValueAtTime(.00001, fT(166)); g.gain.exponentialRampToValueAtTime(.06, fT(186)); g.gain.linearRampToValueAtTime(0, fT(188)); chain(o, g, sfx); }
  { const t0 = fT(172), t1 = fT(191.6), g = ac.createGain(); g.gain.setValueAtTime(.00001, t0); g.gain.exponentialRampToValueAtTime(.4, t1); g.gain.setValueAtTime(0, t1 + .003); chain(noise(t0, t1 - t0), filt('highpass', 2500), g, sfx); }
  for (const s of [0, 4, 8, 10, 12, 13, 14, 15]) snare(fT(176) + s * S16 * .5, .14 + s * .02, 230);

  /* ================================================================= 02 GOOD TASTE: the drop */
  const T4 = barT(4);
  kick(T4, 1.2); boom(T4, .6); crash(T4, .38, 2.2); sub(T4, N.G1, .5, .85);
  stab(T4, [N.G3, N.Bb3, N.D4, N.F4], .2, .45);
  for (const [f, ch, root] of [[200, [N.G3, N.Bb3, N.D4], N.G1], [208, [N.Eb3, N.G3, N.Bb3], N.Eb2], [216, [N.F3, N.A3, N.C4], N.F2]]) { kick(fT(f), 1); clap(fT(f), .35, .3); stab(fT(f), ch, .17, .32); sub(fT(f), root, .26, .75); }
  groove(4, { from: 8 });
  whoosh(fT(222), .3, 600, 4000, .12, 1, .4, -.2);
  thud(fT(240), .45); bell(fT(240) + .02, N.D6, .05, .6, .4);
  whoosh(fT(246), .35, 3000, 500, .1, 1, .6, 0);          // the ticket slides up

  /* ================================================================= 03 THE CLUB */
  groove(5); motif(5, .07);
  for (const [f, p] of [[256, -.3], [272, .3], [288, -.2]]) whoosh(fT(f) - .12, .2, 5000, 900, .12, 1, p, p * .3);   // cards drop
  for (const f of [262, 263.3, 264.6]) key(fT(f), .32, -.1);                                                          // typing the edit
  bell(fT(266), N.Bb6, .07, .8, -.1, .4);
  { const t = fT(273); for (const det of [-60, 0, 60]) { const o = osc('sawtooth', hz(N.Bb4), t, .35); o.detune.value = det; o.frequency.setValueAtTime(hz(N.Bb4), t); o.frequency.linearRampToValueAtTime(hz(N.Bb4) * .94, t + .3); chain(o, filt('lowpass', 2400), env(t, .04, .003, .3), music); } }
  tick(fT(304), .08, 1800); tick(fT(306), .06, 2200);

  /* ================================================================= 04 NEW MODELS: launch, chart, off the chart */
  whoosh(fT(313), .28, 400, 2400, .14, 1, 0, 0);   // the sheet slides up
  groove(6, { to: 12 }); motif(6, .06, -2);
  for (const [f, m] of [[336, N.G5], [340, N.Bb5], [344, N.C6]]) { blip(fT(f), hz(m), .06, .07, 'triangle'); tick(fT(f), .05, 4000); }
  { const t0 = fT(352), t1 = fT(364); for (const det of [-12, 12]) { const o = osc('sawtooth', hz(N.G3), t0, t1 - t0); o.detune.value = det; o.frequency.exponentialRampToValueAtTime(hz(N.G6), t1); chain(o, filt('lowpass', 3500), env(t0, .06, (t1 - t0) * .9, .1), music); } riser(t0, t1, .3, 500, 9000); }
  { const t = fT(364); kick(t, 1.1); boom(t, .55); crash(t, .34, 1.6); sub(t, N.C2, .5, .8); stab(t, [N.C4, N.Eb4, N.G4, N.Bb4], .16, .5); }
  thud(fT(368), .5); stab(fT(368), [N.D4, N.F4, N.A4], .1, .25);
  for (const s of [12, 13, 14, 15]) hat(barT(6, s), .07);
  whoosh(fT(373), fT(11), 300, 6000, .26, 1.3, 0, 0, .2);

  /* ================================================================= 05 CHECKOUT: every beep prints a line */
  groove(7); groove(8, { fill: false });
  { const t0 = fT(384), t1 = fT(511), g = ac.createGain(); g.gain.setValueAtTime(.00001, t0); g.gain.exponentialRampToValueAtTime(.025, t0 + .3); g.gain.setValueAtTime(.025, t1 - .2); g.gain.exponentialRampToValueAtTime(.00001, t1);
    chain(noise(t0, t1 - t0), filt('lowpass', 260), g, sfx); }                          // the belt motor
  const BEEPS = [N.G6, N.Bb6, N.C7, N.D7, N.F7, N.D7, N.C7, N.Bb6, N.G6, N.Bb6, N.C7, N.D7, N.F7, N.G7, N.F7, N.D7, N.F7, N.G7, N.Bb7, N.G7];
  SCANS.forEach((f, i) => { scanBeep(fT(f), BEEPS[i], i < 8 ? .1 : .085, .05 - (i % 2) * .1); printer(fT(f) + .05, i < 8 ? .09 : .06, .1, .5); });
  register(fT(500), .24); thud(fT(500) + .01, .45);
  printer(fT(503), .08, .1, .5); printer(fT(506), .08, .1, .5);

  /* ================================================================= 06 TOUCH GRASS: the game */
  groove(9, { c: .85, chords: true });
  { const ARP = [N.G3, N.Bb3, N.D4, N.G4, N.Eb3, N.G3, N.Bb3, N.Eb4]; for (let s = 0; s < 16; s++) sq(barT(9, s), ARP[(s % 8)] - 12, S16 * .8, .025, -.2, 'triangle'); }
  for (let s = 0; s < 16; s += 2) sq(barT(9, s), [N.G4, N.D5, N.Bb4, N.D5][(s / 2) % 4], S16 * .7, .016, .25);
  for (const ci of CREDIT_AT) { const t = fT(512 + ci * 2); sq(t, 83, .06, .045); sq(t + .06, 88, .22, .04); }   // coin: B5 then E6
  { const t = fT(540); for (let k = 0; k < 10; k++) sq(t + k * .03, [70, 74, 77, 82][k % 4], .03, .03, 0); }     // Touch Grass
  { const t = fT(545); const o = osc('square', 300, t, .2); o.frequency.exponentialRampToValueAtTime(1600, t + .18); chain(o, env(t, .05, .002, .18), sfx); }   // an ape, eaten
  { const t = fT(560); [N.G5, N.Bb5, N.D6, N.G6].forEach((m, k) => sq(t + k * .07, m, .09, .04, (k - 1.5) * .2)); sq(t + .28, N.G6, .4, .035); crash(t, .18, 1); }
  printer(fT(564), .3, .12, .3);

  /* ================================================================= 07 AGENTS WELCOME: heard through the terminal */
  for (const s of [0, 8]) kick(barT(10, s), .9);
  for (const s of [4, 12]) clap(barT(10, s), .3);
  for (let s = 0; s < 16; s += 2) hat(barT(10, s), .05);
  sub(barT(10, 0), N.C2, SPB * 1.8, .6); sub(barT(10, 8), N.C2, SPB * 1.6, .55); sub(barT(10, 14), N.Eb2, S16 * 1.6, .5);
  pad(barT(10), barT(11), CHORDS.Cm.notes, .035, 800, 1400, .2);
  TERM.forEach((parts, i) => {
    const t0 = TERM_AT[i], n = Math.min(9, parts.reduce((a, p) => a + p[0].length, 0) / 4);
    for (let k = 0; k < n; k++) key(fT(t0 + k * 6 / n), .16 + R() * .08, .3);
  });
  for (const f of [614, 616.5]) sq(fT(f), N.D3, .07, .03, 0, 'sawtooth');     // 402
  thud(fT(620), .5); register(fT(621), .16);

  /* ================================================================= 08 THE MODELS: breakdown, one flash per beat */
  sub(barT(11), N.D2, SPB * 4, .5);
  pad(barT(11), barT(12) - .05, [N.Fs3, N.A3, N.C4, N.F4], .05, 600, 2600, .1);
  for (const f of [640, 656, 672, 688]) shutter(fT(f), .32);
  for (let s = 0; s < 16; s += 2) tick(barT(11, s), .04, 6000, .3);
  for (let k = 0; k < 10; k++) chain(noise(fT(691 + k * .8), .05), filt('bandpass', 1400 + R() * 800, 2), env(fT(691 + k * .8), .05, .003, .04), sfx);   // grease pencil
  riser(fT(680), fT(703.6), .36, 300, 7000);
  for (const s of [8, 10, 12, 13, 14, 14.5, 15, 15.5]) snare(barT(11) + s * S16, .12 + s * .018, 220 + s * 5);

  /* ================================================================= 09 THE BEST MODELS: the second drop */
  const T12 = barT(12);
  kick(T12, 1.25); boom(T12, .65); crash(T12, .4, 2.2); sub(T12, N.G1, .26, .85); stab(T12, [N.G3, N.Bb3, N.D4, N.F4], .2, .4);
  for (const [f, ch, root] of [[712, [N.Bb3, N.D4, N.F4], N.Bb1], [720, [N.D4, N.F4, N.A4], N.D2]]) { kick(fT(f), 1.05); boom(fT(f), .3); clap(fT(f), .4); stab(fT(f), ch, .17, .3); sub(fT(f), root, .26, .8); }
  groove(12, { from: 8 }); motif(12, .07, 12);
  for (const t of TILES) { const f = 728 + t.dist * 30; if (f < 750) tick(fT(f), .045, 1800 + t.cy, (t.cx / W - .5) * 1.4); }
  for (const t of TILES) { const f = 756 + t.drop * 5 + 8 + R() * 3; if (f < 768) tick(fT(f), .05, 900 + R() * 600, (t.cx / W - .5) * 1.4); }
  whoosh(fT(755), .4, 2400, 300, .15, 1, 0, 0);

  /* ================================================================= 10 THE TOTAL */
  groove(13); motif(13, .06);
  for (const L of TOTAL_RECEIPT.lines) if (L.at >= 768) printer(fT(L.at), fT(L.dur || 4) + .03, .13, 0);
  scanBeep(fT(822), N.G7, .09, 0); thud(fT(828), .5);

  /* ================================================================= 11 KEEP THE RECEIPT */
  rip(fT(832), .42, .4); crash(fT(832), .2, 1.2);
  groove(14, { k: 1, from: 4 }); kick(barT(14), .8);
  { const t = fT(848); kick(t, 1.15); boom(t, .55); stab(t, CHORDS.Cm.notes, .16, .4); }
  for (let k = 0; k < 6; k++) key(fT(852 + k * 2.4), .14, .2);
  stab(fT(864), CHORDS.D7.notes, .14, .3); stab(fT(872), CHORDS.D7.notes, .12, .28); blip(fT(874), 1800, .05, .06);
  riser(fT(880), fT(895.6), .25, 600, 8000);
  // the last downbeat: everything, then let it ring
  { const t = barT(15); kick(t, 1.25); boom(t, .7); crash(t, .4, 3); sub(t, N.G1, 1.6, .8); thud(t, .5); register(t + .04, .22);
    pad(t, t + 2.2, [N.G3, N.Bb3, N.D4, N.F4, N.A4], .07, 3000, 600, 1.2); bell(t + .1, N.D6, .06, 2.4, -.3, .7); bell(t + .25, N.G6, .05, 2.4, .3, .7); }
  printer(fT(930), .22, .1, 0);

  const buf = await ac.startRendering();
  return wavB64(buf);
};

/* 24-bit stereo WAV, base64 */
function wavB64(buf) {
  const ch = [buf.getChannelData(0), buf.getChannelData(1)], n = ch[0].length, bytes = 44 + n * 6, dv = new DataView(new ArrayBuffer(bytes));
  const w = (o, s) => { for (let i = 0; i < s.length; i++) dv.setUint8(o + i, s.charCodeAt(i)); };
  w(0, 'RIFF'); dv.setUint32(4, bytes - 8, true); w(8, 'WAVE'); w(12, 'fmt '); dv.setUint32(16, 16, true); dv.setUint16(20, 1, true); dv.setUint16(22, 2, true);
  dv.setUint32(24, buf.sampleRate, true); dv.setUint32(28, buf.sampleRate * 6, true); dv.setUint16(32, 6, true); dv.setUint16(34, 24, true); w(36, 'data'); dv.setUint32(40, n * 6, true);
  let o = 44;
  for (let i = 0; i < n; i++) for (let c = 0; c < 2; c++) { const v = Math.max(-1, Math.min(1, ch[c][i])) * 8388607 | 0; dv.setUint8(o, v & 255); dv.setUint8(o + 1, (v >> 8) & 255); dv.setUint8(o + 2, (v >> 16) & 255); o += 3; }
  const u8 = new Uint8Array(dv.buffer); let s = ''; const CH = 0x8000;
  for (let i = 0; i < u8.length; i += CH) s += String.fromCharCode.apply(null, u8.subarray(i, i + CH));
  return btoa(s);
}
