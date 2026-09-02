# A-OK Shop — Site Audit (September 1, 2026)

Live site reviewed at [a-ok.shop](https://a-ok.shop) via Playwright screenshots, live fetch, and codebase review.

---

## Brand & Positioning

- **Brand:** Apes On Keys — "AI Nerdwear" / "Nerd streetwear for AI junkies"
- **Tagline:** APES ON KEYS - AI NERDWEAR
- **Voice:** Irreverent, tech-literate, funny (E/ACC Monkey Theorem, git-diff copy, AI in-jokes)
- **Products:** Graphic tees, hoodies, hats with AI/ape themes

### Current design tokens

| Token | Value | Usage |
|-------|-------|-------|
| Primary red | `#B91C1C` | CTAs, accents, t-shirt card bg |
| Cream/bone | `#F5F2DC` | Hoodie cards, secondary bg |
| Charcoal | `#2C2C2C` / `#171717` | Hat cards, dark sections |
| White | `#FFFFFF` | Page background |

### Typography

- **Bebas Neue** — display headlines, logo, product titles
- **Inter** — body (default)
- **Space Grotesk** — product cards, some UI

**Issue:** Three font families without a clear hierarchy system. Headlines compete rather than guide.

---

## What Works

### Strong brand identity
The ape/AI nerdwear positioning is clear and distinctive. Copy like the E/ACC Monkey Theorem is genuinely funny and on-brand. This is a moat — most merch sites are forgettable.

### Product photography
Lifestyle shots on the shop page feel real and wearable, not just flat mockups. Models in real environments (steps, studio, sticker-covered walls).

### Product card system
Color-coded cards by garment type give the catalog visual rhythm:
- **T-shirts** → deep red (`#8B1E24`)
- **Hoodies** → cream (`#F5F2DC`)
- **Hats** → charcoal (`#2C2C2C`)

This is one of the strongest design decisions on the site. **Preserve or evolve, don't discard.**

### Personality injections
- Animated text logo (`TextAnimatedLogo`) with dot morphing
- Git-diff styled "monkey_theorem.md" about section
- Chaos Monkeys bento grid gallery
- "Run, Human, Run!" Pac-Man-style game with discount incentive

### Technical foundation
- Next.js 14 App Router, TypeScript, Tailwind
- Shopify/Stripe catalog integration
- Responsive grid layouts (mostly)
- Existing design concept prototypes in `public/design-concepts/`

---

## What Feels Dated or Weak

### Generic e-commerce template energy
White background, centered container, standard hero → grid → footer. The *content* is wild; the *frame* is safe. Reads like a Shopify theme with personality grafted on.

### Hero is static
Single illustration in a rounded box with a frosted CTA card. For a brand this bold, the hero undersells it. No motion, no narrative, no editorial tension.

### Homepage is long but not immersive
Hero → Featured Products → Who Are Apes On Keys → Chaos Monkeys reads like stacked sections, not a story. No scroll-driven reveals, no visual through-line.

### Mobile nav is broken
Category links (T-Shirts, Hoodies, Hats) are `hidden md:flex` — they disappear on mobile with no hamburger menu. Only logo + cart visible. Critical UX gap.

### Gallery is broken live
`/gallery` shows error: `signal is aborted without reason`. All filter counts show `(0)`. API/fetch failure — needs a fix independent of redesign.

### Inconsistent visual modes
Three different sites wearing one logo:
1. **Homepage** — clean/minimal white
2. **Products** — colorful editorial cards
3. **Game** — pixel retro arcade

No shared visual language tying them together.

### Footer is forgettable
Standard 4-column layout. Functional but doesn't extend the brand.

### Navbar is minimal
Sticky header with animated logo, category links, cart. No search, no account, no mobile menu. "Run, Human, Run!" link pulses but feels orphaned in the nav.

---

## Page-by-Page Notes

### Homepage (`/`)

**Sections:**
1. Hero — AI ape illustration, "A - O K" CTA card, Shop Now button
2. Featured Products — 3-card grid with cream-bordered cards
3. Who are Apes On Keys? — faux terminal with `monkey_theorem.md` git-diff content
4. Chaos Monkeys at Work — bento grid linking to `/gallery`

**Observations:**
- Hero illustration is strong (cyberpunk apes in streetwear)
- Featured product cards use a different style than the products page (cream border vs. color-coded)
- Theorem section is clever but very long — 400px scrollable box
- Bento grid is visually interesting but disconnected from the rest of the page aesthetic

### Products (`/products`)

**Best-looking page on the site.**

- Color-coded product cards by type
- Good photography with hover scale
- Size buttons visible on cards
- Grid: 4 columns desktop, responsive down

**Opportunities:**
- No filtering UI visible on "Shop All" (category nav exists in header only)
- No sort options
- Product titles truncate awkwardly on some cards

### Product Detail (`/products/[handle]`)

Not screenshot'd but codebase shows:
- `ProductPageClient.tsx` for client interactivity
- Size selector, add to cart
- Standard PDP layout

### Gallery (`/gallery`)

**Broken.** Error state visible. Filter tabs (All, A-OK Collection, Self-Replicating Art) all show 0 items.

### Game (`/game`)

- "RUN, HUMAN, RUN!" — Pac-Man-style game
- Pixel art aesthetic, green START GAME button
- Discount code incentive (25% off for collecting 3 UBI Credits)
- Visually disconnected from shop but fun brand moment

### Nav / Footer

**Nav:** Logo | T-Shirts | Hoodies | Hats | Run Human Run | Cart  
**Footer:** 4 columns — Store, Quick Links, Contact, Follow Us (YouTube, Spotify, GitHub, SoundCloud)

---

## Bugs to Fix (regardless of redesign)

1. **Gallery API failure** — `signal is aborted without reason`
2. **Mobile navigation** — no hamburger/menu for category links
3. **Featured vs. shop card inconsistency** — homepage featured cards don't use the color-coded system

---

## Codebase Notes for Redesign

| Area | Key files |
|------|-----------|
| Homepage | `app/page.tsx` |
| Layout / fonts | `app/layout.tsx`, `app/globals.css` |
| Nav / footer | `app/components/layout/Navbar.tsx`, `Footer.tsx` |
| Product cards | `app/components/product/ProductCard.tsx` |
| Design tokens | `tailwind.config.js` |
| Design concepts | `public/design-concepts/*.html` |
| Logo animation | `app/components/layout/TextAnimatedLogo.tsx` |

### Existing design concepts

Five static HTML prototypes already explore visual directions. See [design-concepts.md](./design-concepts.md).

---

## Priority Matrix (for redesign tradeoffs)

When decisions conflict, suggested priority order:

1. **Conversion / shop clarity** — can people find and buy products?
2. **Brand expression / chaos** — does it feel like Apes On Keys?
3. **Premium feel** — does it justify $40–75 price points?
4. **Mobile experience** — fix nav, responsive polish
5. **Feature parity** — game, gallery, theorem as first-class (not afterthoughts)
