# Chaos Monkeys

The daily drop of new A-OK apes, made on this Mac using the Claude Code and Codex logins that are already here: no API keys, no GitHub Actions. Every morning the tool drafts about six tee and hoodie graphics and a contact sheet, and a person picks two or three to publish. Each draft is in a different style from `STYLES.md`, prints only the words it needs, and carries product and marketing copy for the rest. Published monkeys appear on the homepage ("Latest drop") and at `/chaos-monkeys`.

| Step | Who | How |
|---|---|---|
| Style | The tool | A different style per draft from `STYLES.md` (box logo, varsity, woodcut, tattoo flash, and about twenty more), weighted toward the styles the person has kept |
| Brief | Claude | `claude -p --restricted`: six briefs in the brand voice (`BRAND.md`), each with its printed words, garment, product copy, and marketing copy, avoiding jokes already published or drafted in the last two weeks and following past feedback |
| Topical slot | Zingers + Claude | Off by default; `chaos draft --zingers` adds one brief that riffs on the day's AI/tech story from [Zingers](https://zingers.dev) (`/api/zingers`), with no company or person names |
| Illustrate | GPT-6-Astra | `codex exec` with Codex's built-in image tool. Most styles get the finished print artwork on a swatch of the garment colour; the two house styles get a transparent cutout drawn from the badge and hoodie reference art |
| Compose | Claude's templates | `render/templates.ts` in headless Chrome: **specimen** (giant title behind the ape) and **form** (die-cut sticker, rubber-stamp title) |
| Judge | Claude | Reads every draft and scores spelling, character, rules, and whether the joke lands at thumbnail size |
| Pick | You | `/chaos-monkeys` in Claude Code, or `chaos status`, then `chaos ship 2 4 5` |
| Feedback | You | Optional: `chaos review` exports runs as a claude.ai Artifact where you keep or reject each draft and say why. `chaos feedback` imports the verdicts, and Claude distills every verdict so far into `~/.a-ok-chaos/TASTE.md`: hard bans, things to avoid, things to do more of. The brief writer and the judge both treat it as binding. Style odds follow the verdicts too: two rejects with no keep retire a style, a keep at most doubles its odds, and styles drafted in the last three days are less likely |
| Print | The tool | Drafts ticked Print on the review page: `chaos print` makes Printful print files, a model photo per colour, and product copy; `chaos sell` puts them on Stripe and the shop |
| Publish | The tool | WebP images and `app/data/chaos-monkeys.json` in a dedicated clone at `~/.a-ok-chaos/site` (outside ~/Documents, which macOS keeps from background jobs), then `npm run lint`, `npm run build`, commit, and push to `main`. Vercel deploys |

If Codex hits a usage limit, the rest of the day's drafts fall back to the A-OK badge in the same templates, so there is always something to pick.

## Setup (once per Mac)

Requirements: Node 23.6 or later (runs the TypeScript directly), Google Chrome, git, the GitHub CLI (optional, used to confirm deploys), `codex login` with ChatGPT, and Claude Code logged in.

```sh
node scripts/chaos-monkeys/chaos.ts install
```

This creates `~/.a-ok-chaos/` (the publish clone, drafts, logs, and a font cache), writes the launcher `~/.a-ok-chaos/bin/chaos`, loads the launch agent `shop.a-ok.chaos-monkeys` (daily at 9:07, and at login to catch up), and installs the `/chaos-monkeys` skill for Claude Code. The launcher always runs the tool from `main`, so merged changes take effect the next morning. `chaos uninstall` removes the job and the skill but keeps the drafts.

## Commands

```sh
~/.a-ok-chaos/bin/chaos status                  # latest drafts, scores, and what shipped
~/.a-ok-chaos/bin/chaos draft [--force]         # make today's drafts now (about 5–10 minutes)
~/.a-ok-chaos/bin/chaos ship 2 4 5              # publish drafts 2, 4 and 5 of the latest run
~/.a-ok-chaos/bin/chaos draft --count 15 --date 2026-10-01-apparel   # an extra, labelled batch
~/.a-ok-chaos/bin/chaos review --out DIR        # export the latest run for the feedback page (--date A,B for several)
~/.a-ok-chaos/bin/chaos feedback verdicts.json  # import keep/reject verdicts and notes
~/.a-ok-chaos/bin/chaos print                   # print files, model photos and copy for drafts ticked Print
~/.a-ok-chaos/bin/chaos sell 2026-10-05-apparel-15  # put one on Stripe and the shop
~/.a-ok-chaos/bin/chaos unpublish 0007          # take one down
~/.a-ok-chaos/bin/chaos pause | resume          # stop or restart the daily drafts
```

`ship` and `unpublish` also take `--branch <name>` and `--no-push`. `draft`, `status`, `judge`, `review`, and `ship` take `--date RUN`, where a run is a date or a date with a label (`2026-10-01-apparel`); labelled runs leave the daily run alone. A feedback file looks like `{"items": [{"run": "2026-10-01", "n": 3, "verdict": "keep", "note": "…"}], "notes": [{"run": "2026-10-01", "note": "…"}]}`. Drafts live in `~/.a-ok-chaos/runs/<run>/`: `sheet.png`, `run.json` (briefs, scores, feedback, and what shipped), each Codex job's prompt and log, and `log.txt`.

## Merch

`chaos print` turns drafts into shop products, in `~/.a-ok-chaos/merch/<run>-<n>/`:

- `art.png`: the draft with its flat background removed and trimmed to the art. A full-bleed poster keeps its background and prints as a rectangle.
- `art-light.png`: for art GPT-6-Astra drew whole, the same art re-inked for dark garments: black lettering and linework become bone cream, and the ape keeps his black fur with a cream outline. Claude checks it against `art.png`, with one retry. Then, colour by colour, the tool measures how much of each version's ink would sit under 3:1 contrast on that fabric and prints whichever leaves less of it hard to see (light ink must win by a clear margin). Black, Navy and Blue usually get light ink, but a design with cream lettering may use it everywhere. A colour where more than 45% of the print would still be hard to see is left out of that product.
- `print-tee.png`, `print-hoodie.png` (and `print-tee-light-ink.png`, `print-hoodie-light-ink.png` for dark garments): Printful DTG print files: transparent sRGB PNGs the size of the front print area at 300 DPI (15 × 18 in for the Bella + Canvas 3001 tee, 13 × 13 in for the Gildan 18500 hoodie), with the art centred an inch below the top. The art prints as wide as it can while keeping at least Printful's 150 DPI of real detail, up to 11 in on a tee and 10 in on a hoodie; the log prints the size and effective DPI.
- `mockups/`, `web/`: a photo of a model wearing the garment in each of the seven colours (Red, Yellow, Blue, Green, Black, White, Navy, mapped to each blank's Printful colours in `lib/merch.ts`), drawn by GPT-6-Astra from the art, and checked by Claude against `art.png`. A photo whose print drifted gets one retry; `sheet.png` shows them all with their scores.
- `PRINTFUL.md`: how to order it by hand: the blank, the print size, and which print file goes with which colours.
- `merch.json`: print sizes, photo checks, and Claude's product copy (title, handle, description, product-page HTML, tags, SEO) in the house format.

`chaos sell RUN-N` then adds the photos to `public/images/products/`, a product per garment to `product-catalog.json` (every colour in XS–2XL, $30 a tee and $60 a hoodie, each variant's SKU naming its Printful variant), creates the Stripe product with a price per variant, each naming its print file (needs the shop's `STRIPE_SECRET_KEY` in the environment), and runs lint, build, commit, push, and the Vercel wait, like `ship`. `--dry-run` stops after the build and changes nothing. ## All-over prints

A draft whose placement is all-over (a pattern) prints edge to edge on Printful's direct-to-fabric garments instead of on the chest: the All-Over Print Men's Cotton Crew Neck T-Shirt (product 1414, $45) and the All-Over Print Unisex Cotton Hoodie (1419, $90), XS–2XL, in one colourway, the pattern. A pattern draft is cut off at its edges, so tiling it as-is would show half motifs at every seam; instead `chaos print` finds each whole motif (a figure with its props, or a small icon), drops the ones touching the edge, cuts them from the 4× master, and lays them out as a seamless half-drop repeat at their original relative sizes. It writes `tile.png` (an 18 in repeat at 150 DPI, Printful's resolution for direct-to-fabric) and `fabric.jpg` (the tile repeated to 36 × 40 in), photographs a model front and back, and writes copy. In Printful's design maker, repeat the tile across every panel, or place the swatch panel by panel; `PRINTFUL.md` says so per product.

## Print masters

Astra draws at about 1250 pixels, enough for Printful's 150 DPI floor at 8 inches and no more. `chaos print` enlarges the art 4× with [Real-ESRGAN](https://github.com/xinntao/Real-ESRGAN) (its anime model, which suits flat illustration) before making print files, so a print carries 300 DPI or more and can go up to 11 in wide on a tee. Products already on the shop keep the size their page states. Install it once per Mac (without it, print files use the art as drawn):

```sh
mkdir -p ~/.a-ok-chaos/tools && cd ~/.a-ok-chaos/tools
curl -LO https://github.com/xinntao/Real-ESRGAN/releases/download/v0.2.5.0/realesrgan-ncnn-vulkan-20220424-macos.zip
unzip -q realesrgan-ncnn-vulkan-20220424-macos.zip -d realesrgan && rm realesrgan-ncnn-vulkan-20220424-macos.zip
chmod +x realesrgan/realesrgan-ncnn-vulkan
```

## Archive

This repository is public, so everything else the tool makes goes to the private [lucasdickey/a-ok-print-files](https://github.com/lucasdickey/a-ok-print-files) (cloned at `~/.a-ok-chaos/print-files`) as it is made: `concepts/<run>/` gets every draft as a near-lossless WebP with its brief, score, and verdict after each `draft`, `judge`, `ship`, and `feedback`; `merch/<run>-<n>/` gets the print files, art, original draft PNG, model photos, and Printful notes after `print`, plus `<handle>-product.json` (Printful variant ids) after `sell`; `TASTE.md` sits at the top. Every file name starts with its design (`a-ok-insert-token-tee-art-light.png`, `2026-10-08-03-beam-search.webp`). A failed push never fails the step; `chaos archive --all` catches up.

 Orders still reach Printful by hand: upload the print file there and order the SKU's variant. The Gildan 18500 has no XS, so an XS hoodie order needs a substitute blank.

## Safety

- Claude runs with `--restricted`: no shell or code tools, no settings or hooks, and file access confined to the run directory. `--bare` must not be used, because it ignores the Claude login and requires an API key.
- Codex runs with `--sandbox workspace-write`, confined to one job directory, and is told never to use its API-key fallback.
- Nothing is published without a human pick. Every ship goes through the same lint and build as any other change, and the site rejects a malformed manifest at build time (`app/lib/chaos-monkeys.ts`).
- Shipping never touches your working checkout. It refuses to run if the publish clone has uncommitted or unpushed work.

## Editing

Brand rules, voice, and the character live in `BRAND.md`, which both models read. Styles live in `STYLES.md`: add, cut, or reweight them freely. Templates are in `render/templates.ts`; the feedback page is `review/index.html`. The pipeline is `chaos.ts` plus `lib/`. Type-check with `npx tsc -p scripts/chaos-monkeys/tsconfig.json`.
