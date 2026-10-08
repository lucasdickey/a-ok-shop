# A-OK — "Hallucination Receipt"

A 32-second brand film for the Club Receipt relaunch: 1920×1080, 30 fps, 960 frames, with an original score synthesized and locked to picture. It follows the 15-second "Infinite Apes" film (`use-cases/a-ok-infinite-apes`) and replaces its look with the new brand.

**Idea:** the whole film is one receipt, itemized. A thermal printer prints the E/ACC Infinite Ape Theorem (APES ∞, KEYS ∞, COMPUTE ∞), the output runs away into hallucinations, and the camera pulls back to one receipt per ape. Everything freezes, one receipt turns yellow, and its line is the brand: GOOD TASTE. BAD MODELS. The rest of the film is the order: the homepage, the club, a model launch, the checkout lane, the game, agent checkout, the lookbook, and the total, STILL HALLUCINATING. Then the receipt tears off. The closing joke is the brief's own: we may not look like models, but we make the best models.

## Files

The rendered media stays on the machine that made it (`source/out/`, ignored by Git), and the whole folder is excluded from Vercel uploads (root `.vercelignore`). `source/render.sh` rebuilds all of it.

| File | What it is |
|---|---|
| `A-OK_Hallucination-Receipt_32s_1080p_web.mp4` | Sharing copy: H.264 High at CRF 20, AAC 192k. |
| `A-OK_Hallucination-Receipt_32s_1080p_master.mp4` | Presentation master: H.264 High at CRF 14 with grain tuning, AAC 320k. |
| `A-OK_Hallucination-Receipt_score_48k24.wav` | The mastered score: 48 kHz/24-bit, −14 LUFS integrated, peak below −1 dBFS. |
| `A-OK_Hallucination-Receipt_style-frames.png` | Production board: twenty frames with timecodes. |
| `A-OK_Hallucination-Receipt_poster.png` | Hero still (frame 250, the homepage assembled). |

## Structure: fifteen bars at 112.5 BPM (one beat = 16 frames, so every sixteenth note lands on a frame)

| Item | Bars | Time | What happens |
|---|---|---|---|
| 01 THE THEOREM | 1–3 | 0.0–6.4 s | A printer prints the theorem; every ∞ rings the register a step up the scale. The output runs away (Hamlet: the rap musical ×47, citations (imaginary), knowledge cutoff: unsure) as the camera pulls back to a skyline of receipts, one per ape. A tape stop freezes everything, one receipt turns yellow, and the camera dives into its line. |
| 02 GOOD TASTE | 4 | 6.4–8.5 s | The drop. GOOD / TASTE. / BAD / MODELS. slam full-frame on eighth notes, then the homepage hero assembles itself: arch photo of the Hallucination Club v1.0 tee, orbit line, ✳, the APES ON KEYS stamp, the ticket, the ticker. |
| 03 THE CLUB | 5 | 8.5–10.7 s | For the confidently ~~correct~~ incorrect (a tracked change), the creatively misaligned (the letters are), the extremely well-dressed (the real human in the hoodie), with Chaos Monkeys Nº 0013 and Nº 0002. |
| 04 NEW MODELS | 6 | 10.7–12.8 s | The paper sheet slides up like a page change. INTRODUCING OUR NEWEST MODELS, V1.0, and release notes (FIXED: NOTHING. IT WAS A–OK. REMOVED: CERTAINTY). DRIP-BENCH V2: the A–OK bar leaves the chart and the frame. TOTAL PERSONALITY: OFF THE CHARTS. |
| 05 CHECKOUT | 7–8 | 12.8–17.1 s | Twenty catalog pieces ride a conveyor through a red scanner, eight on eighth notes and twelve on sixteenths. The scanner beeps play the melody, each beep prints the piece's real name and price, and the receipt closes with TAX: VIBES. |
| 06 TOUCH GRASS | 9 | 17.1–19.2 s | Run, Human, Run!, scripted in the game's own look: the last three UBI credits, a Touch Grass pellet, an ape eaten, YOU WIN!, 25% off. |
| 07 AGENTS WELCOME | 10 | 19.2–21.3 s | An agent shops a-ok.ai in a terminal: llms.txt, a tool call, "size? asking the human", 402 PAYMENT REQUIRED, PAID. The music is heard through the terminal. |
| 08 THE MODELS | 11 | 21.3–23.5 s | The breakdown. WE MAY NOT LOOK LIKE MODELS: the All Angles turnaround shot as a lookbook, one camera flash per beat, then a contact sheet, a grease-pencil SELECT and a model card (CERTAINTY: NO ADDITIONAL). |
| 09 THE BEST MODELS | 12 | 23.5–25.6 s | The second drop. BUT WE MAKE / THE BEST / MODELS., then a wall of forty tiles (tees, hoodies, Chaos Monkeys, archive art) flips in around the line and falls away. |
| 10 THE TOTAL | 13 | 25.6–27.7 s | The Hallucination Club tee's receipt, printed for real: IDEAS INFINITE, PROMPTS JUST ONE MORE … TOTAL: STILL HALLUCINATING, barcode, CLUB RECEIPT. |
| 11 KEEP THE RECEIPT | 14–15 | 27.7–32.0 s | The receipt tears off and the yellow footer rises: A–OK, THANKS FOR BEING WEIRD., the real QR code for a-ok.ai, GOOD TASTE. BAD MODELS., and the stamp on the last downbeat. |

## Sources

- **Products:** names and prices from `product-catalog.json` and photos from `public/images/products`, read at render time, so the film always matches the shop. Model photos are cropped chin-down to sit with the garment shots.
- **Chaos Monkeys:** `public/chaos-monkeys`. **Art:** twelve pieces from `public/images/hp-art-grid-collection`, leaving out the four that depict or name real people (as Infinite Apes did). The For America pieces stay out too (no politics, per the Chaos Monkeys brand guide).
- **Brand:** Club Receipt colors from `tailwind.config.js`, the receipt slip, torn edge, ✳, stamp and ticker from `app/globals.css` and `app/page.tsx`, and copy from the homepage, the footer and the product pages. The game is redrawn from `app/modules/game/components/RunHumanRun.tsx`. Discount codes are shown masked.
- **Type:** Barlow Condensed and Space Grotesk (the site's faces), JetBrains Mono for receipt text, and Arimo for the footer's Arial logotype. All four are SIL Open Font License and ship in `source/engine/assets/fonts` with their license files.

## Rebuild

No packages are installed. The toolchain is Node 22+, ffmpeg, Python 3 with Pillow, and Chrome or Chromium (set `CHROME=/path/to/chrome` if it isn't found).

```sh
cd source
./render.sh   # about 25 minutes: frames, score, mastering, encodes, stills and the style-frames board
```

- `engine/` is a canvas compositor plus a Web Audio score rendered offline. Every frame is a pure function of its frame number. `core.js` holds timing, palette and finishing; `brand.js` is the Club Receipt kit (inked boxes, torn slips, dotted leaders, barcodes, the stamp, the ticker, product cards and a thermal printer); `act1.js`–`act3.js` are the eleven scenes; `audio.js` is the score.
- `engine/capture.mjs` serves the repository root, drives headless Chrome over the DevTools protocol using Node built-ins only, and pipes the frames to ffmpeg.
- `master.sh` applies glue compression, a make-up gain solved for −14 LUFS, and a limiter, so the mix keeps its dynamics.
- To look at a few frames: `node engine/capture.mjs --only 0,192,250,900 --png /tmp/stills`.
