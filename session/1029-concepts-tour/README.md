# Concepts tour video · Oct 29, 2026

[`concepts-tour.mp4`](concepts-tour.mp4) is a 60-second walk through the `/concepts` design review that ends on today's homepage. 1920×1080, 60 fps, H.264, 25 MB, no sound.

It goes round by round through all 27 concepts in the gallery's fullscreen viewer. Each concept is scrolled stop by stop through its main sections, and the ones that work as tools are used on screen. At the end, concept 27 lines up with today's homepage and dissolves into it, since that's where the site came from.

## What's on screen

| Time | Round | Concepts |
| --- | --- | --- |
| 0:00 | Title over the gallery; the pointer opens the fullscreen viewer | |
| 0:02 | Round 1 · Cursor · Opus 4.8 | 01 Terminal Hacker, 02 Glitch Brutalist, 03 Streetwear Editorial, 04 Retro Arcade, 05 Signal & Noise |
| 0:09 | Round 2 · Droid · Grok 4.6 | 06 Wheatpaste Wall, 07 Inference Trace, 08 Research Issue, 09 Patchbay Studio, 10 Supergraphic |
| 0:17 | Round 3 · Codex · Sol 5.6 | 11 Museum Store, 12 Field Guide, 13 Transit Authority, 14 Receipt Machine, 15 Soft Machine |
| 0:24 | Round 4 · Codex · GPT-6 | 16 Human Standard, 17 Open Studio, 18 Hallucination Club (picks The Puppet Master), 19 After Hours, 20 The Living Index |
| 0:32 | Round 5 · Claude Code · Opus 5.5 | 21 The Router (taps two audience lines), 22 Ministry of Alignment, 23 Model Card (searches "founder", opens a card) |
| 0:40 | Round 5, rival entry · Codex · Astra | 24 Print Room, 25 The Human Edit, 26 Off Model (switches the featured piece) |
| 0:45 | The cross | 27 Club Receipt (filters to hoodies) |
| 0:50 | Today | a-ok.ai: hero, popular line items, the club, Chaos Monkeys, the fine print, the game, then back to the top |

Each round opens with a card, and a short label stays in the gallery's header bar for the rest of the round.

## Where the captions come from

| Caption | Source |
| --- | --- |
| Round 1: "Five first looks: terminal, glitch, editorial, arcade, particles." | [0901-cursor/design-concepts.md](../0901-cursor/design-concepts.md) |
| Round 2: "Four of five treat the shop as a piece of software." Refused to redo them. | [0901-grok/delta-vs-cursor.md](../0901-grok/delta-vs-cursor.md) |
| Round 3: steered clear of all ten earlier looks; borrowed from museums, field guides, transit maps and receipts | [0906-codex-sol/design-concepts.md](../0906-codex-sol/design-concepts.md), and round 5's table of where each round's joke lived in [0923-claude-opus/design-concepts.md](../0923-claude-opus/design-concepts.md) |
| Round 4: dead links and menus that never open in the first fifteen; rebuilt on the real catalog | [0907-codex-gpt6/design-concepts.md](../0907-codex-gpt6/design-concepts.md) |
| Round 5: "Every round got easier to shop and less like A-OK." | [0923-claude-opus/design-concepts.md](../0923-claude-opus/design-concepts.md) |
| Round 5, rival entry: reviewed all twenty, scored the finalists, picked Print Room | [0923-astra-round-five/review.md](../0923-astra-round-five/review.md) |
| 27: Hallucination Club meets Receipt Machine | `app/concepts/concepts.ts` |
| Today: rolled out to every page at the end of September | PR #38, "Bring the 27 / Club Receipt design to every customer-facing page" (merged Sep 30 UTC), then polish through #66 |

## Recording it again

```sh
node session/1029-concepts-tour/record-tour.cts
```

- Needs Node 22.18 or newer (it runs the TypeScript file directly), Playwright with Chromium, and ffmpeg with libx264. Playwright isn't a project dependency; set `PLAYWRIGHT_MODULE` if `require("playwright")` doesn't find it.
- It records the live site, so "today" is whatever a-ok.ai shows that day. `AOK_TOUR_URL=http://localhost:3000` records a local `next start` instead. Analytics requests are blocked while recording.
- `AOK_TOUR_FPS=15` makes a quick draft in about two minutes, and `AOK_TOUR_FRAMES=<folder>` saves four frames a second to look over.
- What happens inside each concept is in `SHOTS`, and the round captions are in `ROUNDS`. A new concept only needs a `SHOTS` entry: the pauses stretch or shrink together so the video stays at 60 seconds.
- Page timers are paused and CSS animations are moved forward one frame at a time, so motion plays at true speed however slow the screenshots are.
- Round 3 uses Georgia. Linux doesn't have it and Chromium falls back to DejaVu Serif, which looks quite different, so this recording mapped Georgia to Gelasio, a free font with the same letter widths. On a Mac the real Georgia is used.
- On the live site the Chaos Monkeys cards show "Print this" buttons. A local build without Redis hides them.
- Concept 02 keeps its "Featured" heading, product cards and manifesto hidden until they scroll into view, but it hides them with a full `clip-path`, and Chromium never counts a fully clipped element as on screen. So in Chrome and Edge they never appear, and the page shows an empty black panel. The video shows them in their final state, the way the page does when motion is reduced. The concept itself is unchanged.
