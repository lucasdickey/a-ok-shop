# New Design Concepts (Grok pass)

Five *additional* homepage prototypes in `public/design-concepts/` (06–10). Each is a self-contained HTML file. They do not replace Cursor's 01–05.

**View locally:** `npm run dev` → [http://localhost:3000/design-concepts/](http://localhost:3000/design-concepts/)

---

## 06 — Wheatpaste Wall

**File:** `public/design-concepts/06-wheatpaste-wall.html`

**Description:** The homepage is a brick wall of overlapping posters. Torn edges, wheatpaste stain, street-pole tags. Products sit on flyers. Theorem is a pasted manifesto. Gallery is already this art — the site just admits it.

**Tags:** ANALOG · STREET · COLLAGE

**Best for:** Making the gallery the brand, not an afterthought. High chaos without RGB glitch. Photography and wheatpaste art can coexist.

**Risks:** Busy on mobile if the stack isn't simplified. Can feel like a poster archive instead of a store if CTA hierarchy is weak.

---

## 07 — Inference Trace

**File:** `public/design-concepts/07-inference-trace.html`

**Description:** Light merch page on the left, dark "thinking" rail on the right. Token stream, tool calls, a Shop recommendation that arrives after the model "reasons." Current-agent UI, not 1980s terminal.

**Tags:** AGENT · SPLIT · 2026 UI

**Best for:** The AI-nerd audience without cosplaying a CRT. Makes `/game` and ACP/MPP feel native. Funny without green-on-black exclusion.

**Risks:** Two-column thinking rail fights small screens. Can read as a product demo for Factory, not a clothing brand, if the shop column is timid.

---

## 08 — Research Issue

**File:** `public/design-concepts/08-research-issue.html`

**Description:** Seasonal drop as an academic journal. Serif body, figure captions, numbered plates. Theorem is the abstract. Color-coded cards become figure backgrounds. Cream paper, crimson rules.

**Tags:** EDITORIAL · SERIF · CATALOG

**Best for:** Premium positioning that still sounds like A-OK. Closest to a *system* you can carry to PDP/emails. Product photography as evidence, not decoration.

**Risks:** Can go precious / MFA-catalog. Humor has to stay in the captions or it turns into a design blog.

---

## 09 — Patchbay Studio

**File:** `public/design-concepts/09-patchbay-studio.html`

**Description:** Takes "Keys" literally. Dark rack, patch cables, VU meters, module faces as product cards. Warm tungsten, not neon. Game is a "live channel." Footer is a mixer.

**Tags:** HARDWARE · WARM DARK · AUDIO

**Best for:** People who already listen to Key To Sleep / APES ON KNOWLEDGE. Distinct from arcade *and* terminal. Night-mode shop that still feels analog.

**Risks:** Niche if you don't already have the music audience. Hardware chrome can smother photos. Don't let cables become clip art.

---

## 10 — Supergraphic Billboard

**File:** `public/design-concepts/10-supergraphic-billboard.html`

**Description:** One oversized word ("A-OK" / "APES") filling the viewport. Product photo clipped inside the letterforms. Almost no UI chrome. Scroll reveals plates, not sections.

**Tags:** TYPE · SCALE · ARCHITECTURAL

**Best for:** Instant distinctiveness. Social screenshots. A brand that looks like a city installation, not a Shopify theme.

**Risks:** Hard to show many SKUs. Mobile letter-clipping can fail. Needs discipline or it becomes a poster with a cart icon.

---

## Comparison Matrix

| Concept | Premium | Chaos | Dev appeal | Product focus | Mobile-friendly | Distinctive |
|---------|---------|-------|------------|---------------|-----------------|-------------|
| 06 Wheatpaste | ★★☆ | ★★★★★ | ★★☆ | ★★★ | ★★☆ | ★★★★★ |
| 07 Trace | ★★★ | ★★★ | ★★★★★ | ★★★ | ★★★ | ★★★★ |
| 08 Research | ★★★★★ | ★★ | ★★★ | ★★★★★ | ★★★★ | ★★★★ |
| 09 Patchbay | ★★★★ | ★★★ | ★★★ | ★★★ | ★★★ | ★★★★ |
| 10 Supergraphic | ★★★★ | ★★★★ | ★★ | ★★★★ | ★★☆ | ★★★★★ |

Cursor 01–05 matrix lives in [../0901-cursor/design-concepts.md](../0901-cursor/design-concepts.md).

---

## Hybrid Ideas (this pass + Cursor)

| Base | Accent from | Result |
|------|-------------|--------|
| 08 Research Issue | 06 Wheatpaste hero | Journal body, street-collage cover |
| 08 Research Issue | Cursor 03 layout | Paper catalog with lookbook photography |
| 07 Inference Trace | Cursor 03 product grid | Agent rail + sellable cards |
| 10 Supergraphic | color-coded cards | Billboard home, existing shop grid |
| 09 Patchbay | Cursor 04 game page | Studio shop, arcade as a named channel |
| 06 Wheatpaste | Cursor 02 type | Analog wall with one brutal headline |

---

## Implementation Notes

Same as Cursor's prototypes: static HTML, not wired to Next.js/Shopify. To implement:

1. Pick direction (or hybrid across *both* passes)
2. Extract color tokens, type, layout patterns
3. Build as React in `app/`
4. Keep catalog/cart, animated logo, game routes
5. Fix mobile nav and gallery regardless of direction
