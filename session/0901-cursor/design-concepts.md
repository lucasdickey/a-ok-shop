# Existing Design Concepts

Five homepage prototypes already exist in `public/design-concepts/`. Each is a self-contained HTML file exploring a distinct visual direction.

**View locally:** `npm run dev` → [http://localhost:3000/design-concepts/](http://localhost:3000/design-concepts/)

---

## 01 — Terminal Hacker

**File:** `public/design-concepts/01-terminal-hacker.html`

**Description:** Green-on-black terminal UI. Product cards as shell windows. Scanlines, blinking cursors, command-line prompts.

**Tags:** DARK · MONOSPACE · DEV CULTURE

**Best for:** Leaning into the AI/dev audience. Makes the shop feel like a CLI tool. Strong identity, niche appeal.

**Risks:** Can feel exclusionary to non-devs. Hard to make product photography shine on dark green.

---

## 02 — Glitch Brutalist

**File:** `public/design-concepts/02-glitch-brutalist.html`

**Description:** Aggressive typography with CSS glitch animation. Crimson diagonal stripe, scrolling marquee, hard-grid product layout.

**Tags:** BOLD · GLITCH · HIGH CONTRAST

**Best for:** Maximum brand chaos. Matches the irreverent copy energy. High memorability.

**Risks:** Accessibility concerns (motion, contrast). Can fatigue quickly if overdone.

---

## 03 — Streetwear Editorial

**File:** `public/design-concepts/03-streetwear-editorial.html`

**Description:** Clean split-hero layout, warm cream palette, generous whitespace. Lookbook triptych. Fashion-forward, lets product speak.

**Tags:** MINIMAL · EDITORIAL · WARM

**Best for:** Premium positioning. Closest to current brand colors. Product photography as hero. Most "sellable."

**Risks:** Could lose the chaos/personality that makes A-OK distinctive. Needs careful copy integration.

---

## 04 — Retro Arcade

**File:** `public/design-concepts/04-retro-arcade.html`

**Description:** CRT scanlines, neon colors, pixel font, twinkling stars. Score bar, arcade-screen cards. Leans into the game.

**Tags:** NEON · PIXEL · PLAYFUL

**Best for:** Tying shop to "Run, Human, Run!" game. Playful, nostalgic. Strong for social sharing.

**Risks:** Can feel gimmicky. Hard to scale to PDP/checkout without breaking immersion.

---

## 05 — Signal & Noise

**File:** `public/design-concepts/05-signal-noise.html`

**Description:** Generative particle canvas background, near-black luxury aesthetic. Subtle red wave accents, atmospheric and techy.

**Tags:** GENERATIVE · DARK · ELEGANT

**Best for:** Premium dark mode. "AI luxury" positioning. Atmospheric without being chaotic.

**Risks:** Performance (canvas animation). Can feel cold without warm product photography.

---

## Comparison Matrix

| Concept | Premium | Chaos | Dev appeal | Product focus | Mobile-friendly | Distinctive |
|---------|---------|-------|------------|---------------|-----------------|-------------|
| 01 Terminal | ★★☆ | ★★★ | ★★★★★ | ★★☆ | ★★★ | ★★★★ |
| 02 Glitch | ★★☆ | ★★★★★ | ★★★ | ★★★ | ★★☆ | ★★★★★ |
| 03 Editorial | ★★★★★ | ★★☆ | ★★☆ | ★★★★★ | ★★★★ | ★★★ |
| 04 Arcade | ★★☆ | ★★★★ | ★★★ | ★★★ | ★★★ | ★★★★ |
| 05 Signal | ★★★★ | ★★★ | ★★★★ | ★★★★ | ★★★ | ★★★★ |

---

## Hybrid Ideas

If no single concept fits, consider mixing:

| Base | Accent from | Result |
|------|-------------|--------|
| 03 Editorial | 02 Glitch hero | Premium shop with chaotic hero moment |
| 05 Signal | 03 Editorial layout | Dark luxury with clean product grid |
| 03 Editorial | 01 Terminal about section | Fashion-forward with dev-culture theorem |
| 05 Signal | 04 Arcade game page | Cohesive dark theme, arcade as sub-brand |

---

## Implementation Notes

These are static HTML prototypes — not integrated with Next.js components, Shopify data, or Tailwind. To implement:

1. Pick direction (or hybrid)
2. Extract color tokens, typography, layout patterns
3. Build as React components in `app/`
4. Reuse existing catalog/cart infrastructure
5. Preserve animated logo, product card logic, game routes
