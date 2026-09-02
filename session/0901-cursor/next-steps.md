# Recommended Next Steps

---

## Immediate (before any redesign)

1. **Fix gallery** — `/gallery` returns `signal is aborted without reason`. Debug `app/gallery/page.js` and related API routes.
2. **Fix mobile nav** — Add hamburger menu or bottom nav for T-Shirts / Hoodies / Hats on mobile. Currently `hidden md:flex` with no fallback.
3. **Unify product cards** — Homepage featured cards use cream borders; products page uses color-coded system. Pick one.

---

## Phase 1: Direction (1 session)

1. Review screenshots in [screenshots/](./screenshots/)
2. Open design concepts locally (`npm run dev` → `/design-concepts/`)
3. Fill out [creative-brief-template.md](./creative-brief-template.md)
4. Pick one concept or hybrid
5. Add 2–3 reference URLs if available

---

## Phase 2: Homepage prototype (1–2 sessions)

Build new homepage in chosen direction:

- New hero (not static rounded box)
- Unified product card system
- Refined typography hierarchy (pick 2 fonts max)
- Mobile-first nav
- Keep theorem section (maybe restyled to match direction)
- Keep or evolve bento gallery teaser

**Don't touch yet:** PDP, cart drawer, checkout, game, API routes.

---

## Phase 3: System expansion (2–3 sessions)

- Nav + footer redesign
- Products page (apply new card system)
- Product detail page
- Global CSS / Tailwind token cleanup
- Dark mode? (if direction warrants it)

---

## Phase 4: Feature pages (1–2 sessions)

- Gallery (fix + restyle)
- Game page (visual cohesion with shop)
- Monthly deals, terms, privacy (lower priority)

---

## Phase 5: Polish

- Animation/motion (logo, scroll reveals, hover states)
- Performance audit (especially if using canvas/generative backgrounds)
- Accessibility pass (contrast, motion preferences, keyboard nav)
- OG images / social cards update

---

## Quick wins (can do anytime)

| Change | Effort | Impact |
|--------|--------|--------|
| Mobile hamburger menu | Low | High |
| Fix gallery error | Low | Medium |
| Unify featured/shop cards | Low | Medium |
| Hero video or subtle animation | Medium | High |
| Typography consolidation (2 fonts) | Low | Medium |
| Footer brand personality | Low | Low |

---

## Decision needed from owner

Before starting Phase 2, answer:

1. Which design concept (or hybrid)?
2. Homepage only for v1, or include products page?
3. Keep light background or go dark?
4. Is the game a core brand feature or a fun easter egg?
5. Budget for new photography or work with existing assets?
