/**
 * Records concepts-tour.mp4: a 60-second walk through the /concepts design review. Every
 * round and every concept in order, each scrolled through its main parts (and used, where
 * the concept is a tool), then today's homepage.
 *
 * Frames are taken one at a time while the page clock is paused and CSS animations are
 * stepped by hand, so motion plays at true speed however long a screenshot takes. The
 * frames stream straight into ffmpeg.
 *
 *   node session/1029-concepts-tour/record-tour.cts
 *
 * Environment:
 *   AOK_TOUR_URL       site to record (default https://a-ok.ai; a local `next start` works too)
 *   AOK_TOUR_OUT       output file (default concepts-tour.mp4 beside this script)
 *   AOK_TOUR_FPS       frames per second (default 60; 15 makes a quick draft)
 *   AOK_TOUR_CRF       x264 quality, lower is better and bigger (default 22)
 *   AOK_TOUR_FRAMES    folder that also gets four frames a second as JPEGs, for review
 *   PLAYWRIGHT_MODULE  where to load Playwright from (it isn't a project dependency)
 *
 * Needs Node 22.18+ (it runs this TypeScript file directly), Playwright's Chromium, and
 * ffmpeg with libx264. The captions come from the round write-ups in session/.
 */

import type { BrowserContext, Page } from "playwright";

const { spawn }: typeof import("node:child_process") = require("node:child_process");
const { once }: typeof import("node:events") = require("node:events");
const fs: typeof import("node:fs") = require("node:fs");
const path: typeof import("node:path") = require("node:path");
const { chromium }: typeof import("playwright") = require(process.env.PLAYWRIGHT_MODULE ?? "playwright");

const BASE = (process.env.AOK_TOUR_URL ?? "https://a-ok.ai").replace(/\/+$/, "");
const OUT = path.resolve(process.env.AOK_TOUR_OUT ?? path.join(__dirname, "concepts-tour.mp4"));
const FPS = Number(process.env.AOK_TOUR_FPS ?? 60);
const CRF = Number(process.env.AOK_TOUR_CRF ?? 22);
const FRAMES_DIR = process.env.AOK_TOUR_FRAMES;
const LENGTH_SECS = 60;
const WIDTH = 1920;
const HEIGHT = 1080;

/**
 * Seconds. The pauses on a concept's first screen, after each stop and after each click
 * all stretch by one factor, so the finished tour lands exactly on LENGTH_SECS.
 */
const T = {
  intro: 1.6,
  introFade: 0.3,
  pointerMove: 0.32,
  press: 0.1,
  card: 1.3, // a round's card, held over its first concept
  cardFade: 0.22,
  firstLook: 0.3, // stretches
  move: 0.38,
  stop: 0.12, // stretches
  reach: 0.22, // the pointer travelling to a control
  afterClick: 0.42, // stretches
  typing: 0.42,
  crossfade: 0.9,
  todayCard: 1.6,
  end: 1.8,
};

// ---------------------------------------------------------------------------------------
// The story

type Harness = "Cursor" | "Droid" | "Codex" | "Claude Code";

/** The gallery's own colour for each harness (its badges and dots). */
const ACCENT: Record<Harness, string> = {
  Cursor: "#818CF8",
  Droid: "#EF4444",
  Codex: "#34D399",
  "Claude Code": "#FBBF24",
};

interface Round {
  /** The concept that opens the round. */
  opens: string;
  harness: Harness;
  eyebrow: string;
  title: string;
  /** What the round set out to do, in its own words where it had them. */
  line: string;
  /** Short label kept in the gallery's header bar for the rest of the round. */
  tag: string;
}

const ROUNDS: Round[] = [
  {
    opens: "01",
    harness: "Cursor",
    eyebrow: "Round 1 · Sep 1 · concepts 01–05",
    title: "Cursor · Opus 4.8",
    line: "Five first looks: terminal, glitch, editorial, arcade, particles.",
    tag: "Round 1 · the opening set",
  },
  {
    opens: "06",
    harness: "Droid",
    eyebrow: "Round 2 · Sep 1 · concepts 06–10",
    title: "Droid · Grok 4.6",
    line: "“Four of five treat the shop as a piece of software.” Refused to redo them.",
    tag: "Round 2 · refused to redo round 1",
  },
  {
    opens: "11",
    harness: "Codex",
    eyebrow: "Round 3 · Sep 6 · concepts 11–15",
    title: "Codex · Sol 5.6",
    line: "Steered clear of all ten earlier looks. Borrowed from museums, field guides, transit maps and receipts.",
    tag: "Round 3 · avoided all ten earlier looks",
  },
  {
    opens: "16",
    harness: "Codex",
    eyebrow: "Round 4 · Sep 7 · concepts 16–20",
    title: "Codex · GPT-6",
    line: "Audited all fifteen: dead links, menus that never open. Rebuilt on the real catalog.",
    tag: "Round 4 · rebuilt on the real catalog",
  },
  {
    opens: "21",
    harness: "Claude Code",
    eyebrow: "Round 5 · Sep 23 · concepts 21–23",
    title: "Claude Code · Opus 5.5",
    line: "“Every round got easier to shop and less like A-OK.”",
    tag: "Round 5 · the brand’s own voice, posters, a real cart",
  },
  {
    opens: "24",
    harness: "Codex",
    eyebrow: "Round 5, rival entry · Sep 23 · concepts 24–26",
    title: "Codex · Astra",
    line: "Reviewed all twenty, scored the finalists, picked Print Room.",
    tag: "Round 5, rival entry · picked Print Room",
  },
  {
    opens: "27",
    harness: "Codex",
    eyebrow: "The cross · concept 27",
    title: "Club Receipt",
    line: "Hallucination Club (18) meets Receipt Machine (14).",
    tag: "The cross · 18 × 14",
  },
];

/** What the camera does inside a concept after a beat on its first screen. */
type Shot =
  | { to: number | string; secs?: number } // scroll to a position, "bottom", or the top of a selector
  | { click: string } // press the first visible match
  | { type: string; into: string }; // type into a field

const SHOTS: Record<string, Shot[]> = {
  "01": [{ to: ".terminal-section" }, { to: ".manifesto" }],
  "02": [{ to: ".products-section" }, { to: ".manifesto-band" }],
  "03": [{ to: ".products-section" }, { to: ".lookbook" }],
  "04": [{ to: ".products-section" }, { to: ".game-cta" }],
  "05": [{ to: ".products-section" }, { to: ".manifesto" }],
  "06": [{ to: "section:nth-of-type(2)" }, { to: "section:nth-of-type(3)" }, { to: "bottom" }],
  "07": [{ to: ".products" }, { to: "bottom" }],
  "08": [{ to: ".figures" }, { to: "bottom" }],
  "09": [{ to: ".rack" }, { to: "bottom" }],
  "10": [{ to: ".strip" }, { to: ".theorem" }],
  "11": [{ to: "#collection" }, { to: ".wing" }],
  "12": [{ to: "#shop" }, { to: ".feature" }],
  "13": [{ to: "#shop" }, { to: ".station" }],
  "14": [{ to: "bottom" }],
  "15": [{ to: "#shop" }, { to: ".story" }],
  "16": [{ to: "#shop" }, { to: "#studio" }],
  "17": [{ to: "#shop" }, { to: "#studio" }],
  "18": [{ click: '[data-feature="1"]' }, { to: "#shop" }, { to: "#studio" }],
  "19": [{ to: "#shop" }, { to: "#studio" }],
  "20": [{ to: "#shop" }, { to: "#studio" }],
  "21": [{ to: "main" }, { click: '.chip[data-t="founder"]' }, { click: '.chip[data-t="boardroom"]' }],
  "22": [{ to: "#decrees > section:nth-of-type(1)" }, { to: "#decrees > section:nth-of-type(4)", secs: 0.5 }, { to: "#archive", secs: 0.6 }],
  "23": [{ type: "founder", into: "#q" }, { click: "button[data-h]" }, { to: "bottom" }],
  "24": [{ to: "#shop" }, { to: "#studio" }],
  "25": [{ to: 700 }, { to: "bottom" }],
  "26": [{ click: '[data-feature="2"]' }, { to: "#shop" }, { to: "#studio" }],
  "27": [{ to: "#shop" }, { click: '[data-filter="Hoodies"]' }, { to: "#club" }, { to: "#art" }, { to: "bottom" }, { to: 0, secs: 0.5 }],
};
/** Gallery order. Sorted, because Object.keys puts "10"–"27" ahead of "01"–"09". */
const IDS = Object.keys(SHOTS).sort();

/** Today's homepage: where to stop on the way down. */
const TODAY_STOPS: { to: number | string; secs: number; hold: number }[] = [
  { to: "#shop", secs: 0.45, hold: 0.22 },
  { to: "#club", secs: 1.3, hold: 0.32 },
  { to: "#chaos-monkeys", secs: 0.45, hold: 0.32 },
  { to: "#chaos-monkeys + section", secs: 0.45, hold: 0.55 },
  { to: "bottom", secs: 0.4, hold: 0.25 },
  { to: 0, secs: 0.7, hold: 0 },
];

interface Card {
  key: string;
  tone: "night" | "paper";
  accent: string;
  eyebrow: string;
  title: string;
  line: string;
}

const roundCard = (r: Round): Card => ({ key: r.opens, tone: "night", accent: ACCENT[r.harness], eyebrow: r.eyebrow, title: r.title, line: r.line });

const TODAY_CARD: Card = {
  key: "today",
  tone: "paper",
  accent: "#C52224",
  eyebrow: "Today · a-ok.ai",
  title: "Club Receipt, shipped",
  line: "Rolled out to every page at the end of September, polished since.",
};

const END_CARD: Card = {
  key: "end",
  tone: "paper",
  accent: "#C52224",
  eyebrow: "Apes On Keys",
  title: "a-ok.ai",
  line: "All 27 concepts: a-ok.ai/concepts",
};

// ---------------------------------------------------------------------------------------
// The stage: one page holding the real gallery, today's homepage, and the captions

const escapeHtml = (text: string): string => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const PAIRS = ROUNDS.filter((r) => r.opens !== "27")
  .map((r) => `<li style="--dot:${ACCENT[r.harness]}">${escapeHtml(r.title)}</li>`)
  .join("");

const STAGE_HTML = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Concepts tour</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@800;900&family=JetBrains+Mono:wght@500&family=Space+Grotesk:wght@500;700&display=block">
<style>
  :root { --night: #0A0A0A; --paper: #F7F3DF; --slip: #FFFBED; --ink: #22221E; --red: #C52224; --red-light: #E0474A; }
  * { box-sizing: border-box; }
  html, body { margin: 0; width: ${WIDTH}px; height: ${HEIGHT}px; overflow: hidden; background: var(--night); }
  iframe { position: absolute; inset: 0; width: ${WIDTH}px; height: ${HEIGHT}px; border: 0; background: var(--night); }
  #today { visibility: hidden; opacity: 0; }
  .layer { position: absolute; pointer-events: none; }
  .eyebrow { font: 500 22px/1.2 'JetBrains Mono', monospace; letter-spacing: .14em; text-transform: uppercase; }

  #intro { inset: 0; padding: 0 128px; display: flex; flex-direction: column; justify-content: center; color: var(--paper);
    background: linear-gradient(90deg, rgba(10,10,10,.96) 0%, rgba(10,10,10,.9) 60%, rgba(10,10,10,.66) 100%); }
  #intro .eyebrow { font-size: 24px; color: rgba(247,243,223,.7); }
  #intro h1 { margin: 26px 0 26px; font: 900 176px/.86 'Barlow Condensed', Impact, sans-serif; text-transform: uppercase; }
  #intro h1 b { color: var(--red-light); font-weight: inherit; }
  #intro p { margin: 0; max-width: 1280px; font: 500 40px/1.3 'Space Grotesk', sans-serif; color: rgba(247,243,223,.92); text-wrap: balance; }
  #intro ul { display: flex; flex-wrap: wrap; gap: 16px 36px; margin: 52px 0 0; padding: 0; list-style: none;
    font: 500 21px/1 'JetBrains Mono', monospace; letter-spacing: .06em; text-transform: uppercase; color: rgba(247,243,223,.82); }
  #intro li::before, #tag::before { content: ""; display: inline-block; width: 11px; height: 11px; margin-right: 12px;
    border-radius: 50%; background: var(--dot); vertical-align: 1px; }

  #card { left: 104px; bottom: 104px; max-width: 1240px; padding: 30px 44px 36px 40px; opacity: 0; }
  #card.night { background: rgba(10,10,10,.95); border-left: 10px solid var(--accent); color: var(--paper); box-shadow: 0 30px 90px rgba(0,0,0,.5); }
  #card.paper { background: var(--slip); border: 3px solid var(--ink); color: var(--ink); box-shadow: 12px 12px 0 var(--ink); }
  #card .eyebrow { color: var(--accent); }
  #card h2 { margin: 12px 0 14px; font: 900 112px/.9 'Barlow Condensed', Impact, sans-serif; text-transform: uppercase; }
  #card p { margin: 0; font: 500 38px/1.25 'Space Grotesk', sans-serif; text-wrap: balance; }
  #card.night p { color: rgba(247,243,223,.92); }

  #tag { font: 500 19px/1 'JetBrains Mono', monospace; letter-spacing: .1em; text-transform: uppercase; color: rgba(247,243,223,.85);
    white-space: nowrap; opacity: 0; }
  #pointer { left: 0; top: 0; width: 30px; height: 42px; opacity: 0; filter: drop-shadow(0 3px 6px rgba(0,0,0,.45)); }
  #press { left: 0; top: 0; width: 64px; height: 64px; margin: -32px 0 0 -32px; border-radius: 50%; border: 4px solid #fff;
    box-shadow: 0 0 0 2px rgba(0,0,0,.35); opacity: 0; }
</style>
</head>
<body>
<iframe id="gallery" title="Concept gallery" src="/concepts"></iframe>
<iframe id="today" title="Today’s homepage"></iframe>
<div id="tag" class="layer"></div>
<div id="card" class="layer"><div class="eyebrow"></div><h2></h2><p></p></div>
<div id="intro" class="layer">
  <div class="eyebrow">A-OK · design review · a-ok.ai/concepts</div>
  <h1><b>27</b> storefront<br>concepts.</h1>
  <p>Five rounds. Six AI tool and model pairs. Each round reviewed the ones before it, then tried to beat them.</p>
  <ul>${PAIRS}</ul>
</div>
<div id="press" class="layer"></div>
<svg id="pointer" class="layer" viewBox="0 0 22 31" aria-hidden="true">
  <path d="M1.5 1.5v24.2l6.1-5.8 4.3 9.6 4.2-1.9-4.2-9.4h8.6z" fill="#fff" stroke="#111" stroke-width="1.6" stroke-linejoin="round"/>
</svg>
</body>
</html>`;

// ---------------------------------------------------------------------------------------
// In the browser. These run inside the stage page, so they can only use what they define.

type Where = "concept" | "today";

interface Scene {
  /** Virtual milliseconds since the recording began; CSS animations are stepped to it. */
  now: number;
  fps: number;
  intro: number;
  card: Card | null;
  cardShow: number;
  tag: { text: string; accent: string } | null;
  tagShow: number;
  pointer: { x: number; y: number; press: number; show: number } | null;
  conceptY: number | null;
  field: { selector: string; value: string } | null;
  followStrip: boolean;
  /** 0–1: slides and scales the gallery so concept 27's header lands on today's header. */
  morph: number;
  todayShow: number;
  todayY: number | null;
}

interface TourApi {
  apply(scene: Scene): void;
  conceptReady(id: string, expanded: boolean): boolean;
  galleryReady(): boolean;
  next(): void;
  expandButton(): { x: number; y: number };
  openToday(url: string): void;
  todayReady(): boolean;
  maxScroll(where: Where): number;
  scrollRaw(where: Where, y: number): void;
  pendingImages(where: Where): number;
  eagerImages(where: Where): void;
  finishAnimations(where: Where): void;
  showStuckReveals(where: Where): number;
  resolveY(where: Where, target: number | string): number;
  locate(where: Where, selector: string): { x: number; y: number } | null;
  click(where: Where, selector: string): boolean;
  focus(where: Where, selector: string): boolean;
}

function installStage(): void {
  const byId = <T extends Element>(id: string): T => document.getElementById(id) as unknown as T;
  const gallery = byId<HTMLIFrameElement>("gallery");
  const today = byId<HTMLIFrameElement>("today");
  const intro = byId<HTMLElement>("intro");
  const card = byId<HTMLElement>("card");
  const tag = byId<HTMLElement>("tag");
  const pointer = byId<SVGElement>("pointer");
  const press = byId<HTMLElement>("press");

  const galleryDoc = (): Document | null => gallery.contentDocument;
  const conceptFrame = (): HTMLIFrameElement | null => {
    const g = galleryDoc();
    return g?.querySelector<HTMLIFrameElement>("dialog[open] iframe") ?? g?.querySelector<HTMLIFrameElement>("iframe") ?? null;
  };
  const docOf = (where: Where): Document | null => (where === "today" ? today.contentDocument : conceptFrame()?.contentDocument ?? null);
  const offsetOf = (where: Where): { x: number; y: number } => {
    if (where === "today") return { x: 0, y: 0 };
    const box = conceptFrame()?.getBoundingClientRect();
    // The iframe's border is 1px; its content starts inside it.
    return box ? { x: box.left + 1, y: box.top + 1 } : { x: 0, y: 0 };
  };
  const visible = (el: Element): boolean => el.getClientRects().length > 0;
  const firstVisible = (doc: Document, selector: string): HTMLElement | null =>
    [...doc.querySelectorAll<HTMLElement>(selector)].find(visible) ?? null;
  const maxScroll = (where: Where): number => {
    const doc = docOf(where);
    const root = doc?.scrollingElement;
    return root && doc.defaultView ? Math.max(0, root.scrollHeight - doc.defaultView.innerHeight) : 0;
  };
  const scrollRaw = (where: Where, y: number): void => {
    docOf(where)?.defaultView?.scrollTo({ top: y, behavior: "instant" });
  };

  // Every animation is paused when first seen, then moved to the scene's clock each frame.
  const seen = new WeakMap<Animation, { at: number; base: number }>();
  const stepAnimations = (doc: Document | null, now: number): void => {
    if (!doc) return;
    for (const animation of doc.getAnimations()) {
      let record = seen.get(animation);
      if (!record) {
        record = { at: now, base: Number(animation.currentTime ?? 0) };
        seen.set(animation, record);
        animation.pause();
      }
      animation.currentTime = record.base + (now - record.at);
    }
  };

  const api: TourApi = {
    apply(scene) {
      intro.style.opacity = String(scene.intro);
      intro.style.visibility = scene.intro > 0 ? "visible" : "hidden";

      if (scene.card && card.dataset.key !== scene.card.key) {
        card.dataset.key = scene.card.key;
        card.className = `layer ${scene.card.tone}`;
        card.style.setProperty("--accent", scene.card.accent);
        (card.children[0] as HTMLElement).textContent = scene.card.eyebrow;
        (card.children[1] as HTMLElement).textContent = scene.card.title;
        (card.children[2] as HTMLElement).textContent = scene.card.line;
      }
      const cardShow = scene.card ? scene.cardShow : 0;
      card.style.opacity = String(cardShow);
      card.style.transform = `translateY(${(1 - cardShow) * 26}px)`;

      // The round label sits in the gallery's header bar, just left of its viewport toggle.
      const controls = galleryDoc()?.querySelector("dialog[open] > div:first-child > .ml-auto");
      if (scene.tag && controls && scene.tagShow > 0) {
        if (tag.textContent !== scene.tag.text) tag.textContent = scene.tag.text;
        tag.style.setProperty("--dot", scene.tag.accent);
        const box = controls.getBoundingClientRect();
        tag.style.right = `${window.innerWidth - box.left + 30}px`;
        tag.style.top = `${box.top + box.height / 2 - 10}px`;
        tag.style.opacity = String(scene.tagShow);
      } else {
        tag.style.opacity = "0";
      }

      if (scene.pointer) {
        const { x, y } = scene.pointer;
        pointer.style.opacity = String(scene.pointer.show);
        pointer.style.transform = `translate(${x - 2}px, ${y - 2}px)`;
        const ring = scene.pointer.press;
        press.style.opacity = ring > 0 && ring < 1 ? String((1 - ring) * scene.pointer.show) : "0";
        press.style.transform = `translate(${x}px, ${y}px) scale(${0.35 + ring * 0.85})`;
      } else {
        pointer.style.opacity = "0";
        press.style.opacity = "0";
      }

      const concept = docOf("concept");
      if (scene.conceptY !== null) scrollRaw("concept", scene.conceptY);
      if (scene.field && concept?.defaultView) {
        const field = concept.querySelector<HTMLInputElement>(scene.field.selector);
        if (field && field.value !== scene.field.value) {
          field.value = scene.field.value;
          field.dispatchEvent(new concept.defaultView.Event("input", { bubbles: true }));
        }
      }

      // Keep the current concept's chip in view in the gallery's strip, easing toward it.
      const strip = galleryDoc()?.querySelector<HTMLElement>('dialog[open] [aria-label="Concept list"]');
      const chip = strip?.querySelector('button[aria-pressed="true"]');
      if (scene.followStrip && strip && chip) {
        const stripBox = strip.getBoundingClientRect();
        const chipBox = chip.getBoundingClientRect();
        const wanted = strip.scrollLeft + chipBox.left - stripBox.left + chipBox.width / 2 - strip.clientWidth / 2;
        const target = Math.max(0, Math.min(strip.scrollWidth - strip.clientWidth, wanted));
        strip.scrollLeft += (target - strip.scrollLeft) * (1 - Math.pow(0.8, 60 / scene.fps));
      }

      // Today's homepage grew out of 27, so lining up their headers lines up their heroes too.
      const fromHeader = scene.morph > 0 ? concept?.querySelector("header")?.getBoundingClientRect() : undefined;
      const toHeader = scene.morph > 0 ? today.contentDocument?.querySelector("header")?.getBoundingClientRect() : undefined;
      if (fromHeader && toHeader && fromHeader.width > 0) {
        const offset = offsetOf("concept");
        const scale = toHeader.width / fromHeader.width;
        const x = toHeader.left - scale * (offset.x + fromHeader.left);
        const y = toHeader.top - scale * (offset.y + fromHeader.top);
        gallery.style.transformOrigin = "0 0";
        gallery.style.transform = `translate(${x * scene.morph}px, ${y * scene.morph}px) scale(${1 + (scale - 1) * scene.morph})`;
      } else {
        gallery.style.transform = "";
      }
      today.style.visibility = scene.todayShow > 0 ? "visible" : "hidden";
      today.style.opacity = String(scene.todayShow);
      gallery.style.visibility = scene.todayShow >= 1 ? "hidden" : "visible";
      if (scene.todayY !== null) scrollRaw("today", scene.todayY);

      if (scene.todayShow < 1) {
        stepAnimations(galleryDoc(), scene.now);
        stepAnimations(concept, scene.now);
      }
      if (scene.todayShow > 0) stepAnimations(today.contentDocument, scene.now);
    },

    conceptReady(id, expanded) {
      const g = galleryDoc();
      if (!g || Boolean(g.querySelector("dialog[open]")) !== expanded) return false;
      const frame = conceptFrame();
      const doc = frame?.contentDocument;
      const file = frame?.contentWindow?.location.pathname ?? "";
      return Boolean(doc && file.includes(`/design-concepts/${id}-`) && doc.readyState === "complete" && doc.fonts.status === "loaded");
    },

    // The arrows are in the server-rendered page before React wires them up, so wait for React.
    galleryReady() {
      const next = galleryDoc()?.querySelector('button[aria-label="Next concept"]');
      return Boolean(next && Object.keys(next).some((key) => key.startsWith("__reactProps")));
    },

    next() {
      const g = galleryDoc();
      const button =
        g?.querySelector<HTMLButtonElement>('dialog[open] button[aria-label="Next concept"]') ??
        g?.querySelector<HTMLButtonElement>('button[aria-label="Next concept"]');
      button?.click();
    },

    expandButton() {
      const button = [...(galleryDoc()?.querySelectorAll("button") ?? [])].find((b) => b.textContent?.startsWith("Expand"));
      const box = button?.getBoundingClientRect();
      return box ? { x: box.left + box.width / 2, y: box.top + box.height / 2 } : { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    },

    openToday(url) {
      today.src = url;
    },

    todayReady() {
      const doc = today.contentDocument;
      return Boolean(doc && doc.location.href !== "about:blank" && doc.readyState === "complete" && doc.fonts.status === "loaded");
    },

    maxScroll,
    scrollRaw,

    pendingImages(where) {
      const doc = docOf(where);
      return doc ? [...doc.images].filter((img) => !img.complete && img.loading !== "lazy").length : 0;
    },

    eagerImages(where) {
      for (const img of docOf(where)?.images ?? []) if (img.loading === "lazy") img.loading = "eager";
    },

    // Reveal-on-scroll fades and other one-off animations jump to their end.
    finishAnimations(where) {
      for (const animation of docOf(where)?.getAnimations() ?? []) {
        try {
          animation.finish();
        } catch {
          // Endless animations can't finish; they keep running on the scene clock.
        }
      }
    },

    // Concept 02 hides its reveal-on-scroll elements with a full clip-path, and Chromium never
    // counts a fully clipped element as on screen, so they never appear. Show any still hidden
    // after a full scroll the way the page itself does when motion is reduced.
    showStuckReveals(where) {
      const stuck = [...(docOf(where)?.querySelectorAll<HTMLElement>(".reveal") ?? [])].filter(
        (el) => el.ownerDocument.defaultView?.getComputedStyle(el).opacity === "0",
      );
      for (const el of stuck) el.classList.remove("reveal");
      return stuck.length;
    },

    resolveY(where, target) {
      const doc = docOf(where);
      const max = maxScroll(where);
      if (typeof target === "number") return Math.max(0, Math.min(max, target));
      if (target === "bottom" || !doc) return max;
      const el = doc.querySelector(target);
      if (!el || !doc.defaultView) return -1;
      return Math.max(0, Math.min(max, Math.round(el.getBoundingClientRect().top + doc.defaultView.scrollY)));
    },

    locate(where, selector) {
      const doc = docOf(where);
      const el = doc ? firstVisible(doc, selector) : null;
      if (!el) return null;
      const box = el.getBoundingClientRect();
      const offset = offsetOf(where);
      return { x: offset.x + box.left + Math.min(box.width / 2, 60), y: offset.y + box.top + box.height / 2 };
    },

    click(where, selector) {
      const doc = docOf(where);
      const el = doc ? firstVisible(doc, selector) : null;
      el?.click();
      return Boolean(el);
    },

    focus(where, selector) {
      const doc = docOf(where);
      const el = doc ? firstVisible(doc, selector) : null;
      el?.focus();
      return Boolean(el);
    },
  };

  (window as unknown as { __tour: TourApi }).__tour = api;
}

/** Calls a stage function in the page. */
function call<K extends keyof TourApi>(page: Page, name: K, ...args: Parameters<TourApi[K]>): Promise<ReturnType<TourApi[K]>> {
  return page.evaluate(
    ({ name, args }) => {
      const api = (window as unknown as { __tour: TourApi }).__tour;
      return (api[name] as (...a: unknown[]) => unknown)(...args);
    },
    { name, args: args as unknown[] },
  ) as Promise<ReturnType<TourApi[K]>>;
}

// ---------------------------------------------------------------------------------------
// The recorder: a browser on a paused clock, and ffmpeg

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

async function until(what: string, check: () => Promise<boolean>, timeoutMs = 45_000): Promise<void> {
  const started = Date.now();
  while (!(await check())) {
    if (Date.now() - started > timeoutMs) throw new Error(`Timed out waiting for ${what}`);
    await sleep(100);
  }
}

class Recorder {
  page: Page;
  context: BrowserContext;
  ffmpeg: import("node:child_process").ChildProcessWithoutNullStreams;
  close: () => Promise<void>;

  constructor(page: Page, context: BrowserContext, close: () => Promise<void>) {
    this.page = page;
    this.context = context;
    this.close = close;
    this.ffmpeg = spawn("ffmpeg", [
      "-y", "-hide_banner", "-loglevel", "error",
      "-f", "image2pipe", "-framerate", String(FPS), "-c:v", "mjpeg", "-i", "-",
      "-vf", "scale=in_range=full:out_range=tv:in_color_matrix=bt601:out_color_matrix=bt709,format=yuv420p",
      "-c:v", "libx264", "-preset", "slow", "-crf", String(CRF), "-profile:v", "high",
      "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709", "-color_range", "tv",
      "-movflags", "+faststart", OUT,
    ]);
    this.ffmpeg.stderr.pipe(process.stderr);
  }

  static async open(): Promise<Recorder> {
    const proxy = process.env.HTTPS_PROXY;
    const browser = await chromium.launch({ proxy: proxy ? { server: proxy, bypass: "localhost,127.0.0.1" } : undefined });
    const context = await browser.newContext({ viewport: { width: WIDTH, height: HEIGHT }, deviceScaleFactor: 1 });
    // Keep the recording out of the site's analytics.
    await context.route(/\/(ingest|_vercel\/insights|_vercel\/speed-insights)\//, (route) => route.abort());
    await context.route(`${BASE}/__tour`, (route) => route.fulfill({ contentType: "text/html; charset=utf-8", body: STAGE_HTML }));

    // From here page time only moves when a frame is taken (or a page is warmed up below).
    await context.clock.install();
    const page = await context.newPage();
    await context.clock.pauseAt(Date.now() + 1000);
    await page.goto(`${BASE}/__tour`, { waitUntil: "load" });
    await page.evaluate(installStage);
    await page.evaluate(async () => {
      const faces = ["900 100px 'Barlow Condensed'", "500 20px 'JetBrains Mono'", "500 20px 'Space Grotesk'"];
      await Promise.all(faces.map((face) => document.fonts.load(face)));
    });
    const recorder = new Recorder(page, context, () => browser.close());
    await until("the gallery", () => call(page, "galleryReady"));
    return recorder;
  }

  /** Waits for a concept to load, then gets it ready to film: images in, reveals done. */
  async settleConcept(id: string, expanded: boolean): Promise<void> {
    await until(`concept ${id}`, () => call(this.page, "conceptReady", id, expanded));
    const max = await call(this.page, "maxScroll", "concept");
    for (let y = 0; y < max; y += 600) {
      await call(this.page, "scrollRaw", "concept", y);
      await sleep(40);
    }
    await call(this.page, "scrollRaw", "concept", max);
    await call(this.page, "eagerImages", "concept");
    await sleep(150);
    await until(`images in ${id}`, async () => (await call(this.page, "pendingImages", "concept")) === 0, 20_000).catch((error: Error) =>
      console.warn(`  ${error.message}; filming anyway`),
    );
    await this.context.clock.runFor(1000);
    await sleep(80);
    await call(this.page, "finishAnimations", "concept");
    const stuck = await call(this.page, "showStuckReveals", "concept");
    if (stuck > 0) console.log(`  ${id}: ${stuck} reveal-on-scroll elements still hidden after scrolling; showing them in their final state`);
    await sleep(80);
    await call(this.page, "finishAnimations", "concept");
    await call(this.page, "scrollRaw", "concept", 0);
    await sleep(80);
    await call(this.page, "finishAnimations", "concept");
  }

  async next(id: string): Promise<void> {
    await call(this.page, "next");
    await this.settleConcept(id, true);
  }

  async click(selector: string): Promise<void> {
    if (!(await call(this.page, "click", "concept", selector))) console.warn(`  nothing matches ${selector}`);
    await sleep(120);
    await until("images after a click", async () => (await call(this.page, "pendingImages", "concept")) === 0, 10_000).catch(() => undefined);
    await sleep(80);
  }

  async openToday(): Promise<void> {
    await call(this.page, "openToday", `${BASE}/`);
    await until("today’s homepage", () => call(this.page, "todayReady"));
    await call(this.page, "eagerImages", "today");
    await sleep(200);
    await until("today’s images", async () => (await call(this.page, "pendingImages", "today")) === 0, 30_000).catch((error: Error) =>
      console.warn(`  ${error.message}; filming anyway`),
    );
    await this.context.clock.runFor(500);
    await call(this.page, "scrollRaw", "today", 0);
  }

  async frame(scene: Scene, index: number): Promise<void> {
    const before = Math.round((index * 1000) / FPS);
    const after = Math.round(((index + 1) * 1000) / FPS);
    await this.context.clock.runFor(after - before);
    scene.now = after;
    await call(this.page, "apply", scene);
    const jpeg = await this.page.screenshot({ type: "jpeg", quality: 92, caret: "initial" });
    if (!this.ffmpeg.stdin.write(jpeg)) await once(this.ffmpeg.stdin, "drain");
    if (FRAMES_DIR && index % Math.max(1, Math.round(FPS / 4)) === 0) {
      fs.writeFileSync(path.join(FRAMES_DIR, `${String(index).padStart(5, "0")}-${(index / FPS).toFixed(2)}s.jpg`), jpeg);
    }
  }

  async finish(): Promise<void> {
    this.ffmpeg.stdin.end();
    const [code] = (await once(this.ffmpeg, "close")) as [number | null];
    await this.close();
    if (code !== 0) throw new Error(`ffmpeg exited with ${code}`);
  }
}

// ---------------------------------------------------------------------------------------
// The director: the same choreography runs twice, first to measure it, then to film it

const ease = (u: number): number => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);
const lerp = (a: number, b: number, u: number): number => a + (b - a) * u;
/** 0 → 1 → 0 across a beat, fading over `fade` seconds at each end. */
const envelope = (u: number, secs: number, fade: number): number => ease(Math.max(0, Math.min(1, (u * secs) / fade, ((1 - u) * secs) / fade)));

class Director {
  scene: Scene = {
    now: 0,
    fps: FPS,
    intro: 0,
    card: null,
    cardShow: 0,
    tag: null,
    tagShow: 0,
    pointer: null,
    conceptY: null,
    field: null,
    followStrip: false,
    morph: 0,
    todayShow: 0,
    todayY: null,
  };
  fixedSecs = 0;
  stretchSecs = 0;
  rec: Recorder | null;
  stretch: number;
  private clockSecs = 0;
  private written = 0;

  constructor(rec: Recorder | null, stretch = 1) {
    this.rec = rec;
    this.stretch = stretch;
  }

  /** Films `secs` of the scene, calling `update` with progress 0–1 before each frame. */
  async frames(secs: number, stretches: boolean, update?: (u: number) => void): Promise<void> {
    if (stretches) this.stretchSecs += secs;
    else this.fixedSecs += secs;
    if (!this.rec) return;
    this.clockSecs += stretches ? secs * this.stretch : secs;
    const count = Math.round(this.clockSecs * FPS) - this.written;
    for (let i = 0; i < count; i++) {
      update?.((i + 1) / count);
      await this.rec.frame(this.scene, this.written++);
    }
  }

  /** Does something off camera, between frames. */
  async act(work: (rec: Recorder) => Promise<unknown>): Promise<void> {
    if (this.rec) await work(this.rec);
  }

  async look<T>(work: (rec: Recorder) => Promise<T>, planned: T): Promise<T> {
    return this.rec ? work(this.rec) : planned;
  }

  log(what: string): void {
    if (this.rec) console.log(`${(this.written / FPS).toFixed(2).padStart(6)}s  ${what}`);
  }

  async shot(shot: Shot): Promise<void> {
    const s = this.scene;
    if ("to" in shot) {
      const from = s.conceptY ?? 0;
      const to = await this.look((rec) => call(rec.page, "resolveY", "concept", shot.to), 0);
      if (to < 0) console.warn(`  nothing matches ${String(shot.to)}`);
      const pointer = s.pointer;
      await this.frames(shot.secs ?? T.move, false, (u) => {
        if (to >= 0) s.conceptY = lerp(from, to, ease(u));
        if (pointer) pointer.show = Math.max(0, 1 - u * 3);
      });
      s.pointer = null;
      await this.frames(T.stop, true);
    } else if ("click" in shot) {
      await this.reach(shot.click);
      await this.act((rec) => rec.click(shot.click));
      await this.frames(T.afterClick, true);
    } else {
      await this.reach(shot.into);
      await this.act((rec) => call(rec.page, "focus", "concept", shot.into));
      const field = { selector: shot.into, value: "" };
      s.field = field;
      await this.frames(T.typing, false, (u) => {
        field.value = shot.type.slice(0, Math.ceil(u * shot.type.length));
      });
      await this.frames(T.stop, true);
    }
  }

  /** Moves the pointer onto a control and presses it. */
  async reach(selector: string): Promise<void> {
    const s = this.scene;
    const target = (await this.look((rec) => call(rec.page, "locate", "concept", selector), null)) ?? { x: WIDTH / 2, y: HEIGHT / 2 };
    const from = s.pointer ? { x: s.pointer.x, y: s.pointer.y } : { x: target.x + 110, y: target.y + 150 };
    const shown = s.pointer?.show ?? 0;
    const pointer = { x: from.x, y: from.y, press: 0, show: shown };
    s.pointer = pointer;
    await this.frames(T.reach, false, (u) => {
      pointer.x = lerp(from.x, target.x, ease(u));
      pointer.y = lerp(from.y, target.y, ease(u));
      pointer.show = Math.max(shown, Math.min(1, u * 2.5));
    });
    await this.frames(T.press, false, (u) => {
      pointer.press = u;
    });
  }

  async scrollToday(to: number | string, secs: number): Promise<void> {
    const s = this.scene;
    const from = s.todayY ?? 0;
    const y = await this.look((rec) => call(rec.page, "resolveY", "today", to), 0);
    if (y < 0) console.warn(`  nothing matches ${String(to)} on today’s homepage`);
    await this.frames(secs, false, (u) => {
      if (y >= 0) s.todayY = lerp(from, y, ease(u));
    });
  }
}

async function tour(d: Director): Promise<void> {
  const s = d.scene;

  // Opening: the gallery as it loads for everyone, with the title over it, then Expand.
  d.log("intro");
  s.intro = 1;
  await d.frames(T.intro, false);
  await d.frames(T.introFade, false, (u) => {
    s.intro = 1 - ease(u);
  });
  const expand = await d.look((rec) => call(rec.page, "expandButton"), { x: 0, y: 0 });
  const start = { x: expand.x - 280, y: expand.y + 260 };
  const pointer = { x: start.x, y: start.y, press: 0, show: 0 };
  s.pointer = pointer;
  await d.frames(T.pointerMove, false, (u) => {
    pointer.x = lerp(start.x, expand.x, ease(u));
    pointer.y = lerp(start.y, expand.y, ease(u));
    pointer.show = Math.min(1, u * 3);
  });
  await d.frames(T.press, false, (u) => {
    pointer.press = u;
  });
  await d.act(async (rec) => {
    // A real click, as a visitor makes it: a scripted one would leave a keyboard focus ring
    // on the viewer's Close button. Then the mouse rests on bare background.
    await rec.page.mouse.click(expand.x, expand.y);
    await rec.page.mouse.move(2, 300);
    await rec.settleConcept(IDS[0], true);
  });
  s.pointer = null;
  s.followStrip = true;

  for (const [index, id] of IDS.entries()) {
    if (index > 0) {
      await d.act(async (rec) => {
        await rec.next(id);
        // Today's homepage loads while 27 is on screen, so the cut to it is instant.
        if (id === IDS[IDS.length - 1]) await rec.openToday();
      });
    }
    d.log(`concept ${id}`);
    s.conceptY = 0;
    s.field = null;
    s.pointer = null;

    const round = ROUNDS.find((r) => r.opens === id);
    if (round) {
      // The card fades in over the old round's label; the new label appears as it fades out.
      s.card = roundCard(round);
      await d.frames(T.card, false, (u) => {
        s.cardShow = envelope(u, T.card, T.cardFade);
        if (u * T.card >= T.cardFade) s.tag = { text: round.tag, accent: ACCENT[round.harness] };
        s.tagShow = 1 - s.cardShow;
      });
      s.card = null;
      s.tagShow = 1;
    } else {
      await d.frames(T.firstLook, true);
    }
    for (const shot of SHOTS[id]) await d.shot(shot);
  }

  // Today: the homepage that grew out of 27, dissolving in over 27's own hero as the two line up.
  d.log("today");
  s.todayY = 0;
  await d.frames(T.crossfade, false, (u) => {
    s.morph = ease(u);
    s.todayShow = ease(Math.max(0, (u - 0.25) / 0.75));
    s.tagShow = Math.max(0, 1 - u * 4);
  });
  s.tag = null;
  s.followStrip = false;
  s.card = TODAY_CARD;
  await d.frames(T.todayCard, false, (u) => {
    s.cardShow = envelope(u, T.todayCard, T.cardFade);
  });
  s.card = null;
  for (const stop of TODAY_STOPS) {
    await d.scrollToday(stop.to, stop.secs);
    if (stop.hold > 0) await d.frames(stop.hold, true);
  }
  s.card = END_CARD;
  await d.frames(T.end, false, (u) => {
    s.cardShow = ease(Math.min(1, (u * T.end) / T.cardFade));
  });
}

async function main(): Promise<void> {
  const plan = new Director(null);
  await tour(plan);
  const stretch = (LENGTH_SECS - plan.fixedSecs) / plan.stretchSecs;
  if (stretch < 0.5) throw new Error(`The choreography runs too long for ${LENGTH_SECS}s (pauses would shrink to ${stretch.toFixed(2)}×)`);
  console.log(`Recording ${BASE}/concepts at ${FPS} fps into ${OUT}`);
  console.log(`Pauses stretch ${stretch.toFixed(2)}× to fill ${LENGTH_SECS}s`);
  if (FRAMES_DIR) fs.mkdirSync(FRAMES_DIR, { recursive: true });

  const rec = await Recorder.open();
  // The gallery opens on the newest concept; the arrow wraps it around to 01.
  await call(rec.page, "next");
  await rec.settleConcept(IDS[0], false);
  const film = new Director(rec, stretch);
  const started = Date.now();
  await tour(film);
  await rec.finish();
  console.log(`Done in ${((Date.now() - started) / 1000).toFixed(0)}s: ${OUT}`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
