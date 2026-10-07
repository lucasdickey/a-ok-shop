'use strict';
/* A-OK — Infinite Apes. Score and sound design, synthesized offline and locked to picture.
   One beat = 14 frames = 0.4667 s (128.57 BPM). Eight bars = 448 frames. Key: F minor. */

const SR = 48000, DUR = TOTAL / FPS, SPB = BEAT / FPS, S16 = SPB / 4;
const barT = (bar, step = 0) => ((bar - 1) * 16 + step) * S16;   // bars are 1-indexed
const fT = f => f / FPS;
const hz = m => 440 * Math.pow(2, (m - 69) / 12);
const M = { F1: 29, Ab1: 32, Bb1: 34, C2: 36, Db2: 37, Eb2: 39, F2: 41, C3: 48, Db3: 49, Eb3: 51, F3: 53, G3: 55, Ab3: 56, Bb3: 58, C4: 60, Eb4: 63, F4: 65, G4: 67, Ab4: 68, Bb4: 70, C5: 72, Eb5: 75, F5: 77, G5: 79, Ab5: 80, Bb5: 82, C6: 84, Db6: 85, Eb6: 87, F6: 89, B5: 83, E6: 88, C7: 96 };

window.renderAudio = async function () {
  const ac = new OfflineAudioContext(2, Math.round(SR * DUR), SR);
  const R = rng(4242);

  /* ---------------------------------------------------------------- buses */
  // Clean float mix with headroom; compression, limiting and loudness are mastered in ffmpeg.
  const master = ac.createGain(); master.gain.value = .32;
  const outG = ac.createGain(); master.connect(outG); outG.connect(ac.destination);
  outG.gain.setValueAtTime(1, 0); outG.gain.setValueAtTime(1, DUR - .25); outG.gain.linearRampToValueAtTime(0, DUR - .005);

  const dive = ac.createBiquadFilter(); dive.type = 'lowpass'; dive.Q.value = 1.1; dive.connect(master);
  const drums = ac.createGain(); drums.gain.value = 1; drums.connect(dive);
  const music = ac.createGain(); music.connect(dive);        // bass + harmony, ducked by the kick
  const sfx = ac.createGain(); sfx.gain.value = 1; sfx.connect(master);
  const verb = ac.createConvolver(); verb.buffer = impulse(2.4); const verbOut = ac.createGain(); verbOut.gain.value = .32;
  const verbHP = ac.createBiquadFilter(); verbHP.type = 'highpass'; verbHP.frequency.value = 350;
  verb.connect(verbHP); verbHP.connect(verbOut); verbOut.connect(master);

  // the dive into the O-mouth closes the filter; the pull-out opens it
  dive.frequency.setValueAtTime(19000, 0);
  dive.frequency.setValueAtTime(19000, fT(212)); dive.frequency.exponentialRampToValueAtTime(320, fT(223.5));
  dive.frequency.setValueAtTime(320, fT(224)); dive.frequency.exponentialRampToValueAtTime(19000, fT(238));

  /* ---------------------------------------------------------------- sources */
  const NOISE = ac.createBuffer(2, SR * 3, SR);
  for (let c = 0; c < 2; c++) { const d = NOISE.getChannelData(c); for (let i = 0; i < d.length; i++) d[i] = R() * 2 - 1; }
  const SAT = new Float32Array(1024).map((_, i) => Math.tanh((i / 511.5 - 1) * 2.2) / Math.tanh(2.2));
  function impulse(sec) {
    const n = Math.round(SR * sec), b = ac.createBuffer(2, n, SR);
    for (let c = 0; c < 2; c++) {
      const d = b.getChannelData(c); let lp = 0;
      for (let i = 0; i < n; i++) { const t = i / n; lp += ((R() * 2 - 1) - lp) * (0.9 - .75 * t); d[i] = lp * Math.pow(1 - t, 2.6) * (i < 480 ? i / 480 : 1); }
    }
    return b;
  }
  const noise = (t, dur) => { const s = ac.createBufferSource(); s.buffer = NOISE; s.start(t, R() * 1.8, dur + .05); return s; };
  const osc = (type, f, t, dur) => { const o = ac.createOscillator(); o.type = type; o.frequency.setValueAtTime(f, t); o.start(t); o.stop(t + dur + .05); return o; };
  const filt = (type, f, q = .7) => { const b = ac.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = q; return b; };
  const pan = (p) => { const s = ac.createStereoPanner(); s.pan.value = Math.max(-1, Math.min(1, p)); return s; };
  function env(t, peak, a, d) { const g = ac.createGain(); g.gain.setValueAtTime(.00001, t); g.gain.linearRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(.00001, t + a + d); return g; }
  function chain(...nodes) { for (let i = 0; i < nodes.length - 1; i++) nodes[i].connect(nodes[i + 1]); return nodes[nodes.length - 1]; }
  function send(node, amt) { const g = ac.createGain(); g.gain.value = amt; node.connect(g); g.connect(verb); }

  /* ---------------------------------------------------------------- instruments */
  const KICKS = [];
  function kick(t, amp = 1) {
    KICKS.push([t, amp]);
    const o = osc('sine', 175, t, .6); o.frequency.exponentialRampToValueAtTime(55, t + .06); o.frequency.exponentialRampToValueAtTime(41, t + .45);
    const sh = ac.createWaveShaper(); sh.curve = SAT;
    chain(o, sh, env(t, amp, .002, .5), drums);
    chain(noise(t, .02), filt('highpass', 2600), env(t, amp * .3, .0005, .014), drums);
  }
  function boom(t, amp = .6) {   // trailer-style low thud under the big type
    const o = osc('sine', 78, t, 1); o.frequency.exponentialRampToValueAtTime(34, t + .8);
    chain(o, env(t, amp * .45, .004, .8), drums);
  }
  function clap(t, amp = .55, rev = .45) {
    for (let k = 0; k < 4; k++) {
      const tt = t + k * .0095, last = k === 3;
      const g = chain(noise(tt, .3), filt('bandpass', 1250, 1.1), env(tt, amp * (last ? 1 : .55), .0008, last ? .19 : .011));
      g.connect(drums); if (last) send(g, rev);
    }
  }
  function snare(t, amp = .4, tone = 190) {
    const g = chain(noise(t, .25), filt('bandpass', 2100, .75), filt('highpass', 650), env(t, amp, .001, .15)); g.connect(drums); send(g, .18);
    const o = osc('triangle', tone, t, .12); o.frequency.exponentialRampToValueAtTime(tone * .78, t + .08);
    chain(o, env(t, amp * .55, .001, .08), drums);
  }
  function hat(t, amp = .12, open = false, p = 0) {
    chain(noise(t, open ? .4 : .08), filt('highpass', 7400), filt('bandpass', 10500, .6), env(t, amp, .0008, open ? .26 : .032), pan(p), drums);
  }
  function crash(t, amp = .35, len = 1.7) {
    for (const p of [-.45, .45]) { const g = chain(noise(t, len), filt('highpass', 3800), env(t, amp, .002, len), pan(p)); g.connect(drums); send(g, .25); }
  }
  function sub(t, m, dur, amp = .75, from = null) {
    amp *= .7;
    const f = hz(m), o = osc('sine', from ? hz(from) : f * 1.7, t, dur + .3);
    o.frequency.exponentialRampToValueAtTime(f, t + (from ? .09 : .03));
    const g = ac.createGain(); g.gain.setValueAtTime(.00001, t); g.gain.linearRampToValueAtTime(amp, t + .005);
    g.gain.setValueAtTime(amp, t + Math.max(.02, dur - .06)); g.gain.exponentialRampToValueAtTime(.00001, t + dur + .16);
    const sh = ac.createWaveShaper(); sh.curve = SAT; chain(o, sh, g, music);
  }
  function stab(t, ms, amp = .16, dur = .42, cut = 3600) {
    const lp = filt('lowpass', cut, 5); lp.frequency.setValueAtTime(cut, t); lp.frequency.exponentialRampToValueAtTime(420, t + dur);
    const g = chain(lp, env(t, amp, .003, dur)); g.connect(music); send(g, .3);
    for (const m of ms) for (const det of [-11, 0, 11]) { const o = osc('sawtooth', hz(m), t, dur + .1); o.detune.value = det; chain(o, pan(det / 22), lp); }
  }
  function pad(t0, t1, ms, amp, cutFrom, cutTo, rel = .8) {
    const lp = filt('lowpass', cutFrom, 1.2); lp.frequency.setValueAtTime(cutFrom, t0); lp.frequency.exponentialRampToValueAtTime(cutTo, t1);
    const g = ac.createGain(); g.gain.setValueAtTime(.00001, t0); g.gain.exponentialRampToValueAtTime(amp, t0 + .05 + (t1 - t0) * .25);
    g.gain.setValueAtTime(amp, t1); g.gain.exponentialRampToValueAtTime(.00001, t1 + rel);
    chain(lp, g, music); send(g, .35);
    for (const m of ms) for (const det of [-14, 6, 17]) { const o = osc('sawtooth', hz(m), t0, t1 - t0 + rel); o.detune.value = det; chain(o, pan(det / 30), lp); }
  }
  function bell(t, m, amp = .1, dur = .9, p = 0, rev = .5) {
    const out = pan(p); out.connect(sfx); send(out, rev);
    for (const [ratio, a, dd] of [[1, 1, 1], [2.76, .38, .45], [5.4, .14, .25], [2, .25, .6]]) chain(osc('sine', hz(m) * ratio, t, dur), env(t, amp * a, .002, dur * dd), out);
  }
  function blip(t, f, amp = .08, dur = .05, type = 'sine', p = 0) { chain(osc(type, f, t, dur), env(t, amp, .001, dur), pan(p), sfx); }
  function key(t, amp = .5, p = 0) {   // mechanical keyboard: clack + thock + bottom-out tick
    const o = pan(p); o.connect(sfx);
    chain(noise(t, .06), filt('bandpass', 2600 + R() * 2200, 2.2), env(t, amp * .9, .0007, .026 + R() * .012), o);
    const th = osc('sine', 150 + R() * 110, t + .003, .09); th.frequency.exponentialRampToValueAtTime(70, t + .06);
    chain(th, env(t + .003, amp * .5, .001, .05), o);
    chain(noise(t + .011, .02), filt('highpass', 6500), env(t + .011, amp * .3, .0003, .007), o);
  }
  function sweep(t, dur, f0, f1, amp, q = 1.4, p0 = 0, p1 = 0, rev = .2) {
    const bp = filt('bandpass', f0, q); bp.frequency.setValueAtTime(f0, t); bp.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const g = ac.createGain(); g.gain.setValueAtTime(.00001, t); g.gain.exponentialRampToValueAtTime(amp, t + dur * .6); g.gain.exponentialRampToValueAtTime(.00001, t + dur);
    const pn = ac.createStereoPanner(); pn.pan.setValueAtTime(p0, t); pn.pan.linearRampToValueAtTime(p1, t + dur);
    const n = chain(noise(t, dur), bp, g, pn); n.connect(sfx); send(n, rev);
  }
  function sq(t, m, dur, amp = .09, type = 'square', p = 0) {   // chip voice: hard gates, no smoothing
    amp *= 3.2;
    const o = osc(type, hz(m), t, dur); const g = ac.createGain();
    g.gain.setValueAtTime(0, t); g.gain.setValueAtTime(amp, t + .001); g.gain.setValueAtTime(amp, t + dur * .7); g.gain.linearRampToValueAtTime(0, t + dur);
    chain(o, g, pan(p), sfx);
  }
  function coin(t) { sq(t, M.B5, .075, .11); sq(t + .075, M.E6, .34, .1); }
  function glitch(t, dur = .09, amp = .07) {
    for (let k = 0; k < 7; k++) { const tt = t + k * dur / 7; sq(tt, 60 + Math.floor(R() * 40), dur / 7, amp / 3.2, R() < .5 ? 'square' : 'sawtooth', R() * 1.4 - .7); }
    chain(noise(t, dur), filt('bandpass', 3000, .5), env(t, amp * 1.4, .001, dur), sfx);
  }

  /* ================================================================= 01 NOISE: apes on keys */
  for (const k of KEYLOG) {
    if (!k.hero && R() > .35) continue;
    if (k.hero) key(fT(k.t), k.t < 40 ? 1.0 : .55, -.05);
    else key(fT(k.t), .12 + R() * .14, k.pan * .8);
  }
  // the build: an eighth-note pulse whose filter opens toward the drop
  for (let k = 0; k < 7; k++) {
    const t = barT(2, k * 2), lp = filt('lowpass', 260 * Math.pow(10, k / 6), 6);
    const g = chain(lp, env(t, .17 + k * .04, .004, .2)); g.connect(music);
    for (const det of [-8, 8]) { const o = osc('sawtooth', hz(M.F2), t, .25); o.detune.value = det; o.connect(lp); }
  }
  for (let f = 34; f < 104; f++) {   // the colony becomes a roar
    const fade = (1 - inv(62, 104, f)) * lerp(.55, 1, inv(34, 58, f));
    const n = Math.min(8, Math.round(KEYDENSITY[f] * .03));
    for (let i = 0; i < n; i++) key(fT(f + R()), (.07 + R() * .1) * fade, R() * 1.8 - .9);
  }
  { const g = ac.createGain(); g.gain.setValueAtTime(.00001, fT(30)); g.gain.exponentialRampToValueAtTime(.05, fT(66)); g.gain.exponentialRampToValueAtTime(.00001, fT(104));
    chain(noise(fT(30), 3), filt('bandpass', 3400, .7), g, sfx); }
  // drone + opening filter
  { const o = osc('sine', hz(M.F1), 0, 3.52); const g = ac.createGain(); g.gain.setValueAtTime(.00001, 0); g.gain.exponentialRampToValueAtTime(.12, 2.2); g.gain.setValueAtTime(.12, 3.49); g.gain.linearRampToValueAtTime(0, 3.52); chain(o, g, music); }
  pad(0, 3.5, [M.F2, M.C3, M.Ab3], .085, 160, 3200, .02);
  // heartbeat
  for (const [b, a] of [[2, .22], [3, .28], [4, .34], [5, .4], [6, .48], [7, .55]]) { const t = b * SPB; const o = osc('sine', 120, t, .3); o.frequency.exponentialRampToValueAtTime(45, t + .08); chain(o, filt('lowpass', 400), env(t, a, .003, .22), drums); }
  // riser and snare roll into the gap
  { const t0 = fT(40), t1 = barT(2, 14); const bp = filt('bandpass', 300, 2.2); bp.frequency.setValueAtTime(300, t0); bp.frequency.exponentialRampToValueAtTime(9000, t1);
    const g = ac.createGain(); g.gain.setValueAtTime(.002, t0); g.gain.exponentialRampToValueAtTime(.3, fT(80)); g.gain.exponentialRampToValueAtTime(.62, t1); g.gain.setValueAtTime(0, t1 + .002);
    const n = chain(noise(t0, t1 - t0), bp, g); n.connect(sfx); send(n, .25); }
  { const hits = []; for (let s = 0; s < 8; s += 2) hits.push(s); for (let s = 8; s < 12; s++) hits.push(s); for (let s = 12; s < 14; s += .5) hits.push(s);
    for (const s of hits) snare(barT(2, s), .16 + .52 * Math.pow(s / 14, 1.3), 190 + s * 9); }
  // the signal locks, one sixteenth at a time: an ascending chime
  const LADDER = [M.F4, M.Ab4, M.Bb4, M.C5, M.Eb5, M.F5, M.Ab5, M.Bb5, M.C6, M.Eb6, M.F6];
  for (let k = 0; k < 11; k++) bell(fT(59 + k * 3.5), LADDER[k], .13 + k * .008, .5, (k / 10) * 1.2 - .6, .45);
  bell(fT(96), M.C6, .16, 1.2, -.2, .6); bell(fT(96) + .06, M.F6, .14, 1.4, .2, .6);
  // pre-drop gap with a reverse suck into the cut
  { const t0 = barT(2, 14), t1 = barT(3) - .004; const g = ac.createGain(); g.gain.setValueAtTime(.00001, t0); g.gain.exponentialRampToValueAtTime(.3, t1); g.gain.setValueAtTime(0, t1 + .002);
    chain(noise(t0, t1 - t0), filt('highpass', 1500), g, sfx); }

  /* ================================================================= 02 SIGNAL: drop + APES / ON / KEYS */
  const T3 = barT(3);
  kick(T3, 1.15); boom(T3, .5); crash(T3, .42, 2); sub(T3, M.F1, 1.05, .8);
  stab(T3, [M.F3, M.Ab3, M.C4], .2, .6);
  sweep(T3, .5, 7000, 260, .28, 1.2, 0, 0, .3);          // the whip pull-back
  const SLAMS = [[barT(3, 4), [M.F3, M.Ab3, M.C4], M.F1], [barT(3, 8), [M.Db3, M.F3, M.Ab3], M.Db2], [barT(3, 12), [M.Eb3, M.G3, M.Bb3], M.Eb2]];
  for (const [t, chord, root] of SLAMS) { kick(t, 1); boom(t, .38); clap(t, .42, .35); stab(t, chord, .19, .44); sub(t, root, .42, .72); }
  for (let s = 2; s < 16; s++) hat(barT(3, s), s % 2 ? .1 : .06, s % 4 === 2, .15);

  /* ================================================================= 03 MODEL: x-ray build and the dive */
  const T4 = barT(4);
  kick(T4, 1); glitch(fT(167.5), .1, .06); clap(barT(4, 4), .5); clap(barT(4, 12), .5); kick(barT(4, 8), .9); kick(barT(4, 10), .7);
  for (let s = 0; s < 14; s++) hat(barT(4, s), s % 2 ? .1 : .055, s === 6, -.15);
  sub(T4, M.F1, .66, .72); sub(barT(4, 6), M.Ab1, .2, .62); sub(barT(4, 8), M.F1, .66, .72); sub(barT(4, 14), M.C2, .2, .6);
  stab(T4, [M.F3, M.C4, M.Eb4], .11, .9, 2400);
  sweep(fT(171), fT(15), 500, 5200, .16, 6, -.35, .35, .3);    // scanner A, panned with the line
  sweep(fT(184), fT(15), 450, 6200, .16, 6, -.35, .4, .3);     // scanner B
  for (const [f, p] of [[176, .35], [186, -.35], [196, .35], [199, -.3]]) { blip(fT(f), 2093, .06, .05, 'sine', p); blip(fT(f) + .055, 2637, .05, .06, 'sine', p); }
  for (const f of [178, 191]) blip(fT(f), 1318, .05, .03, 'square');
  sweep(fT(208), fT(16), 300, 3200, .24, 1.1, 0, 0, .2);     // rush toward the mouth
  { const t = fT(219); const o = osc('sine', 110, t, .35); o.frequency.exponentialRampToValueAtTime(34, t + .28); chain(o, env(t, .55, .005, .3), sfx); }

  /* ================================================================= 04 INFINITE: the archive */
  const T5 = barT(5);
  kick(T5, 1.05); sub(T5, M.F1, .9, .78); crash(T5, .3, 1.4);
  sweep(T5, .45, 3400, 220, .3, 1, 0, 0, .35);               // out of the poster ape's mouth
  bell(barT(5, 4), M.C6, .07, .8, -.3); bell(barT(5, 4) + .03, M.Eb6, .06, .8, .3);
  const ARP = [M.F4, M.Ab4, M.C5, M.Eb5, M.F5, M.Ab5, M.C6, M.Eb6];
  for (let s = 4; s < 16; s++) sq(barT(5, s), ARP[(s * 3) % 8] + 12 * (s > 11 ? 1 : 0) - 12, S16 * .8, .014, 'triangle', (s % 2) ? .4 : -.4);
  for (const [t, chord, root] of [[barT(5, 8), [M.Db3, M.F3, M.Ab3], M.Db2], [barT(5, 12), [M.Eb3, M.G3, M.Bb3], M.Eb2]]) { kick(t, 1); boom(t, .4); clap(t, .45, .4); stab(t, chord, .19, .44); sub(t, root, .42, .72); crash(t, .16, .7); }
  clap(barT(5, 4), .38);
  for (let s = 0; s < 16; s++) hat(barT(5, s), s % 2 ? .1 : .055, s % 4 === 2, .2);

  /* ================================================================= 05 WEAR: the catalog */
  const T6 = barT(6);
  glitch(fT(279.5), .09, .06); kick(T6, 1); kick(barT(6, 8), .95); kick(barT(6, 11), .7);
  clap(barT(6, 4), .48); clap(barT(6, 12), .48);
  for (let s = 0; s < 16; s++) hat(barT(6, s), s % 2 ? .1 : .055, s % 4 === 2, -.1);
  for (const [s, m, d] of [[0, M.F1, .3], [3, M.F1, .25], [6, M.Ab1, .2], [8, M.Bb1, .3], [11, M.C2, .25], [14, M.Eb2, .2]]) sub(barT(6, s), m, d, .7);
  stab(T6, [M.F3, M.Ab3, M.C4, M.Eb4], .1, .3, 2800);
  const MENU = [M.F5, M.G5, M.Ab5, M.Bb5, M.C6, M.Db6, M.Eb6, M.F6];
  for (let k = 0; k < 8; k++) { const t = fT(280 + k * 7); sq(t, MENU[k], .06, .016, 'square', .3); blip(t, hz(MENU[k]) * 2, .03, .05, 'sine', .3);
    if (k) chain(noise(t, .08), filt('highpass', 5000), env(t, .045, .003, .06), pan(.5), sfx); }

  /* ================================================================= 06 PLAY: 8-bit, three UBI credits */
  const T7 = barT(7);
  for (const [k, f] of [336, 339.5, 343, 346.5].entries()) { sq(fT(f), [M.C6, M.G5, M.Eb5, M.C5][k], .07, .06); glitch(fT(f), .05, .05); }
  for (let s = 4; s < 16; s++) {   // chiptune: bass, noise drums, arpeggio
    const t = barT(7, s);
    if (s % 2 === 0) sq(t, s % 4 === 0 ? M.F2 : M.F3, S16 * 1.7, .075, 'square', 0);
    if (s % 4 === 0) { const o = osc('square', 150, t, .08); o.frequency.exponentialRampToValueAtTime(50, t + .06); chain(o, env(t, .38, .001, .06), sfx); }
    if (s % 4 === 2) chain(noise(t, .07), filt('highpass', 2500), env(t, .26, .001, .05), sfx);
    sq(t, [M.F5, M.Ab5, M.C6, M.Ab5][s % 4] - 12, S16 * .6, .026, 'square', s % 2 ? .35 : -.35);
  }
  for (let i = 0; i < 260; i++) {   // tiles flipping outwards from the centre
    const d = Math.sqrt(R()), f = 350 + d * 24 + R() * 6;
    sq(fT(f), 84 + Math.floor(R() * 14), .012, .014 * (1 - d * .5), 'square', R() * 1.6 - .8);
  }
  for (const f of [350, 364, 378]) { coin(fT(f)); sq(fT(f + 8), M.E6 + 7, .05, .05); }
  for (const [k, m] of [M.Ab5, M.C6, M.Eb6].entries()) sq(fT(382) + k * S16, m, S16 * .9, .08, 'square', 0);
  sweep(fT(378), fT(14), 800, 9000, .12, 1.5, 0, 0, .2);

  /* ================================================================= 07 A-OK: resolve */
  const T8 = barT(8);
  kick(T8, 1.2); boom(T8, .55); crash(T8, .45, 2.2); sub(T8, M.F1, 1.55, .82);
  sq(T8, M.F6, .12, .03);
  pad(T8, DUR - .35, [M.F2, M.C3, M.Ab3, M.Eb4, M.G4], .085, 900, 4200, .3);
  stab(T8, [M.F3, M.Ab3, M.C4, M.Eb4, M.G4], .18, 1.1, 5200);
  bell(T8 + .02, M.F6, .11, 2, -.4, .7); bell(T8 + .05, M.C7, .07, 2, .4, .7);
  { const t = T8; const hp = filt('highpass', 400, 1); hp.frequency.setValueAtTime(400, t); hp.frequency.exponentialRampToValueAtTime(12000, t + .2);
    chain(noise(t, .22), hp, env(t, .09, .002, .2), sfx); }                     // de-rez fizz
  sweep(fT(400), .5, 2600, 500, .1, 1, -.3, .3, .3);                              // wordmark rises
  for (let i = 0; i < 14; i++) blip(fT(410) + i * .028, 1500 + R() * 2600, .018, .02, 'square', R() - .5);   // tagline decode
  for (let k = 0; k < 9; k++) key(fT(420 + k * 2), .85, .05);                     // A-OK.SHOP, typed on the same keys as frame 0

  /* ---------------------------------------------------------------- sidechain: duck the harmony under every kick */
  { const n = Math.round(DUR * 500), curve = new Float32Array(n).fill(1);
    for (const [t, a] of KICKS) for (let i = Math.floor(t * 500); i < Math.min(n, Math.floor((t + .3) * 500)); i++) { const d = i / 500 - t; curve[i] = Math.min(curve[i], 1 - .55 * Math.min(1, a) * Math.exp(-d / .09)); }
    music.gain.setValueCurveAtTime(curve, 0, DUR); }

  const buf = await ac.startRendering();
  return wavBase64(buf);
};

function wavBase64(buf) {   // 32-bit float WAV keeps the headroom for mastering
  const ch = buf.numberOfChannels, n = buf.length, bytes = 44 + n * ch * 4, dv = new DataView(new ArrayBuffer(bytes));
  const w = (o, s) => { for (let i = 0; i < s.length; i++) dv.setUint8(o + i, s.charCodeAt(i)); };
  w(0, 'RIFF'); dv.setUint32(4, bytes - 8, true); w(8, 'WAVE'); w(12, 'fmt '); dv.setUint32(16, 16, true); dv.setUint16(20, 3, true);
  dv.setUint16(22, ch, true); dv.setUint32(24, buf.sampleRate, true); dv.setUint32(28, buf.sampleRate * ch * 4, true); dv.setUint16(32, ch * 4, true); dv.setUint16(34, 32, true);
  w(36, 'data'); dv.setUint32(40, n * ch * 4, true);
  const data = [...Array(ch)].map((_, c) => buf.getChannelData(c)); let o = 44, peak = 0;
  for (let i = 0; i < n; i++) for (let c = 0; c < ch; c++) { const v = data[c][i]; peak = Math.max(peak, Math.abs(v)); dv.setFloat32(o, v, true); o += 4; }
  window.AUDIO_PEAK = peak;
  const u8 = new Uint8Array(dv.buffer); let s = '';
  for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
  return btoa(s);
}
