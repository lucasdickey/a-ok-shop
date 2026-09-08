export type Harness = "Cursor" | "Droid" | "Codex";

export interface Concept {
  id: string;
  title: string;
  /** Public path to the prototype (served from /public). */
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
  {
    id: "11",
    title: "Museum Store",
    file: "/design-concepts/11-museum-store.html",
    harness: "Codex",
    model: "Sol 5.6",
    tags: ["Curatorial", "Objects", "Premium"],
    description:
      "White-cube museum retail with accession labels, object cards, and gallery wall text. Products become collectible cultural artifacts.",
    highlights: ["Accession-label hero", "Object collection grid", "Theorem as wall text", "Interactive game wing"],
  },
  {
    id: "12",
    title: "Field Guide",
    file: "/design-concepts/12-field-guide.html",
    harness: "Codex",
    model: "Sol 5.6",
    tags: ["Outdoor", "Tactile", "Field notes"],
    description:
      "An expedition manual for synthetic wildlife: graph paper, specimen numbers, olive canvas, safety orange, and gear-like product cards.",
    highlights: ["Issued-to-humans hero", "Species card catalog", "Field-note theorem", "Game as survival exercise"],
  },
  {
    id: "13",
    title: "Transit Authority",
    file: "/design-concepts/13-transit-authority.html",
    harness: "Codex",
    model: "Sol 5.6",
    tags: ["Wayfinding", "Civic", "Color"],
    description:
      "Public wayfinding as storefront. Colored routes become categories, products are destinations, and brand features are transfer stations.",
    highlights: ["Route-map product hero", "Departure-board catalog", "Feature transfer stations", "Strong mobile hierarchy"],
  },
  {
    id: "14",
    title: "Receipt Machine",
    file: "/design-concepts/14-receipt-machine.html",
    harness: "Codex",
    model: "Sol 5.6",
    tags: ["Commerce", "Thermal", "Mono"],
    description:
      "The homepage as a giant thermal receipt: line items, SKU jokes, totals, barcode rhythm, and transaction-native calls to action.",
    highlights: ["Receipt hero", "Scannable line-item products", "Fine-print theorem", "Loyalty-game offer"],
  },
  {
    id: "15",
    title: "Soft Machine",
    file: "/design-concepts/15-soft-machine.html",
    harness: "Codex",
    model: "Sol 5.6",
    tags: ["Organic", "Optimistic", "Colorful"],
    description:
      "Optimistic AI culture with biomorphic fields, warm color, rounded product vessels, and gentler language without losing the strange.",
    highlights: ["Biomorphic product hero", "Rounded color-block catalog", "Gentle theorem", "Game as playful tension"],
  },

  {
    "id": "16",
    "title": "Human Standard",
    "file": "/design-concepts/16-human-standard.html",
    "harness": "Codex",
    "model": "GPT-6",
    "tags": [
      "Wearable",
      "Direct",
      "Brand core"
    ],
    "description": "A crimson masthead and real street photography turn AI nerdwear into a confident clothing label. Shopping gets the first word; art gets the second.",
    "highlights": [
      "Product and price in the opening screen",
      "Actual catalog options + preview bag",
      "Color-coded category browsing",
      "Generator and art below the collection"
    ]
  },
  {
    "id": "17",
    "title": "Open Studio",
    "file": "/design-concepts/17-open-studio.html",
    "harness": "Codex",
    "model": "GPT-6",
    "tags": [
      "Process",
      "Cobalt",
      "Art to object"
    ],
    "description": "A cobalt studio directory and a workbench composition put finished garments next to the art practice. It feels like visiting the people behind the label.",
    "highlights": [
      "Studio directory on desktop; working menu on mobile",
      "Featured product with direct options",
      "Artwork lightbox + generator workbench",
      "Commerce connected to creative process"
    ]
  },
  {
    "id": "18",
    "title": "Hallucination Club",
    "file": "/design-concepts/18-hallucination-club.html",
    "harness": "Codex",
    "model": "GPT-6",
    "tags": [
      "Graphic",
      "Collective",
      "Playful"
    ],
    "description": "A punchy yellow club identity with a product selector built into the opening spread. Belonging comes from the shared joke, with no signup between you and a tee.",
    "highlights": [
      "Clickable featured-product selector",
      "Oversized type with a wearable hero",
      "Plain-language shopping controls",
      "Generator treated as a club creative activity"
    ]
  },
  {
    "id": "19",
    "title": "After Hours",
    "file": "/design-concepts/19-after-hours.html",
    "harness": "Codex",
    "model": "GPT-6",
    "tags": [
      "Photography",
      "Night",
      "Fashion"
    ],
    "description": "A cinematic contact sheet with warm white type and a single crimson purchase accent. Real garments and quiet photographic pacing replace ambient tech effects.",
    "highlights": [
      "Shoppable contact-sheet hero",
      "Product photography stays legible in dark mode",
      "Low-motion art interlude",
      "Shared accessible options and bag flow"
    ]
  },
  {
    "id": "20",
    "title": "The Living Index",
    "file": "/design-concepts/20-living-index.html",
    "harness": "Codex",
    "model": "GPT-6",
    "tags": [
      "Catalog first",
      "Scannable",
      "Adaptive"
    ],
    "description": "The storefront opens directly on the collection. A compact manifesto, clear filters, and an optional studio drawer make this the shortest route from curiosity to a piece.",
    "highlights": [
      "Catalog in the first viewport",
      "Category filters + price sort",
      "Grid/list density toggle",
      "Art and generator in a compact studio module"
    ]
  },
];
