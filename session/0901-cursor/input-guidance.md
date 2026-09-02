# How to Supply Creative Direction

Guidance for working with Cursor (or any collaborator) on the A-OK site refresh. **Structure matters more than volume.**

---

## Ranked by Impact

### 1. Short creative brief (highest ROI)

One message with these sections is enough to start. Use the [creative-brief-template.md](./creative-brief-template.md).

```
KEEP:     What must survive
CHANGE:   What feels wrong
AUDIENCE: Who buys this
VIBE:     3–5 adjectives
ANTI:     What to avoid
SCOPE:    Homepage only? Full site?
```

### 2. React to existing design concepts

Five prototypes live in `public/design-concepts/`. Fastest path to a direction.

**Examples of useful feedback:**
- "Concept 03 (Streetwear Editorial) as the base, but darker"
- "Concept 02's glitch energy on the hero, Concept 03's product layout"
- "None of these — too X, not enough Y"
- "Hybrid: 05's atmosphere + 03's product grid"

Open locally: `npm run dev` → `http://localhost:3000/design-concepts/`

### 3. Reference URLs

Send 3–5 links with a one-liner each:

- "Love the nav on [url]"
- "This product grid rhythm on [url]"
- "This tone/typography on [url]"

Cursor can fetch and analyze them. Works best for **structure, typography, and layout** — less reliable for subtle motion/animation feel.

### 4. Images

Attach directly in chat. Most valuable types:

| Type | Why |
|------|-----|
| **Moodboards** | 3–6 images capturing feeling (not necessarily e-commerce) |
| **Product hero shots** | New photography or specific products to feature |
| **Logo/brand assets** | If anything has changed |
| **Annotated screenshots** | Circle what you like/hate on current site |

Screenshots of the current site are already in [screenshots/](./screenshots/).

### 5. Priority ranking

When tradeoffs come up, rank these:

1. Conversion / shop clarity
2. Brand expression / chaos
3. Premium feel
4. Mobile experience
5. Keeping game/gallery/theorem as first-class features

---

## What Works Well vs. What Doesn't

| Input type | Works well for | Less useful for |
|------------|----------------|-----------------|
| Text brief | Strategy, tone, scope | Pixel-perfect layout |
| Reference URLs | Layout, typography, nav patterns | Brand-specific copy |
| Images/moodboards | Feeling, color, photography style | Functional requirements |
| Existing concepts | Fast directional decisions | Net-new directions |
| Annotated screenshots | Specific fixes | Holistic vision |

---

## Anti-patterns (avoid these)

- **"Make it better"** — too vague; say what's wrong specifically
- **20 reference sites with no commentary** — pick 3–5 and say why each matters
- **Contradictory vibes** — "minimal but chaotic and premium but playful" needs prioritization
- **Scope creep in v1** — "redesign everything including checkout, emails, and packaging" — start with homepage

---

## Recommended Session Flow

1. **Review** — skim design concepts + screenshots in this folder
2. **Brief** — fill out creative-brief-template.md
3. **Pick direction** — one concept or hybrid, with 2–3 reference URLs
4. **Prototype** — homepage only, iterate
5. **Expand** — products page, PDP, nav/footer, then game/gallery
