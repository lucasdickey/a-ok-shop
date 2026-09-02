export type Harness = "Cursor" | "Droid";

export interface Concept {
  id: string;
  title: string;
  /** Public path to the self-contained prototype (served from /public). */
  file: string;
  harness: Harness;
  model: string;
  tags: string[];
  description: string;
  /** Key moments of the web experience to look at inside each prototype. */
  highlights: string[];
}

export const concepts: Concept[] = [
  {
    id: "01",
    title: "Terminal Hacker",
    file: "/design-concepts/01-terminal-hacker.html",
    harness: "Cursor",
    model: "Opus 4.8",
    tags: ["Dark", "Monospace", "Dev culture"],
    description:
      "Green-on-black terminal UI. Product cards as shell windows, scanlines, blinking cursors, command-line prompts.",
    highlights: ["Hero CLI prompt + matrix rain", "Product cards as shell windows", "Manifesto terminal window"],
  },
  {
    id: "02",
    title: "Glitch Brutalist",
    file: "/design-concepts/02-glitch-brutalist.html",
    harness: "Cursor",
    model: "Opus 4.8",
    tags: ["Bold", "Glitch", "High contrast"],
    description:
      "Aggressive typography with CSS glitch animation. Crimson diagonal stripe, scrolling marquee, hard-grid product layout.",
    highlights: ["Glitched headline hero", "Diagonal crimson stripe + marquee", "Hard-grid products"],
  },
  {
    id: "03",
    title: "Streetwear Editorial",
    file: "/design-concepts/03-streetwear-editorial.html",
    harness: "Cursor",
    model: "Opus 4.8",
    tags: ["Minimal", "Editorial", "Warm"],
    description:
      "Clean split-hero layout, warm cream palette, generous whitespace. Lookbook triptych. Product photography as hero.",
    highlights: ["Split-hero lookbook", "Cream editorial palette", "Lookbook triptych"],
  },
  {
    id: "04",
    title: "Retro Arcade",
    file: "/design-concepts/04-retro-arcade.html",
    harness: "Cursor",
    model: "Opus 4.8",
    tags: ["Neon", "Pixel", "Playful"],
    description:
      "CRT scanlines, neon colors, pixel font, twinkling stars. Score bar and arcade-screen cards lean into the game.",
    highlights: ["CRT scanline hero", "Score bar + stars", "Arcade-screen cards"],
  },
  {
    id: "05",
    title: "Signal & Noise",
    file: "/design-concepts/05-signal-noise.html",
    harness: "Cursor",
    model: "Opus 4.8",
    tags: ["Generative", "Dark", "Elegant"],
    description:
      "Generative particle canvas background, near-black luxury aesthetic. Subtle red wave accents, atmospheric.",
    highlights: ["Particle canvas atmosphere", "Near-black luxury grid", "Red wave accents"],
  },
  {
    id: "06",
    title: "Wheatpaste Wall",
    file: "/design-concepts/06-wheatpaste-wall.html",
    harness: "Droid",
    model: "Grok 4.6",
    tags: ["Analog", "Street", "Collage"],
    description:
      "Brick wall of overlapping posters. Torn edges, wheatpaste stain, street-pole tags. Products sit on flyers; the gallery is the brand.",
    highlights: ["Overlapping poster hero", "Torn-edge flyer grid", "Wheatpasted manifesto", "Chaos Monkeys bento"],
  },
  {
    id: "07",
    title: "Inference Trace",
    file: "/design-concepts/07-inference-trace.html",
    harness: "Droid",
    model: "Grok 4.6",
    tags: ["Agent", "Split", "2026 UI"],
    description:
      "Light merch column plus a dark thinking rail. Token stream and a shop recommendation arrive after the model reasons.",
    highlights: ["Split shop / trace shell", "Live thinking rail", "Recommendation card", "Theorem as band"],
  },
  {
    id: "08",
    title: "Research Issue",
    file: "/design-concepts/08-research-issue.html",
    harness: "Droid",
    model: "Grok 4.6",
    tags: ["Editorial", "Serif", "Catalog"],
    description:
      "Seasonal drop as an academic journal. Serif body, figure captions, numbered plates. Theorem as abstract. Product photos as evidence.",
    highlights: ["Journal masthead", "Abstract section", "Numbered figure plates", "Methods + game field test"],
  },
  {
    id: "09",
    title: "Patchbay Studio",
    file: "/design-concepts/09-patchbay-studio.html",
    harness: "Droid",
    model: "Grok 4.6",
    tags: ["Hardware", "Warm dark", "Audio"],
    description:
      "Takes Keys literally. Dark rack, patch cables, VU meters, module faces as product cards. Warm tungsten, not neon.",
    highlights: ["VU meter channel", "Module-face product rack", "Liner-notes theorem", "Game as live channel"],
  },
  {
    id: "10",
    title: "Supergraphic",
    file: "/design-concepts/10-supergraphic-billboard.html",
    harness: "Droid",
    model: "Grok 4.6",
    tags: ["Type", "Scale", "Architectural"],
    description:
      "One oversized word filling the viewport. Product photo clipped inside the letterforms. Almost no chrome, city-scale type.",
    highlights: ["Giant clipped type", "Product plates strip", "Theorem statement section"],
  },
];
