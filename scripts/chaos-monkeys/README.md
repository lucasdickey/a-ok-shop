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
| Feedback | You | Optional: `chaos review` exports a run as a claude.ai Artifact where you keep or reject each draft and say why; `chaos feedback` imports the verdicts, and the next briefs and style picks learn from them |
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
~/.a-ok-chaos/bin/chaos review --out DIR        # export the latest run for the feedback page
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
- `print-tee.png`, `print-hoodie.png`: Printful DTG print files: transparent sRGB PNGs the size of the front print area at 300 DPI (15 × 18 in for the Bella + Canvas 3001 tee, 13 × 13 in for the Gildan 18500 hoodie), with the art centred an inch below the top. The art prints as wide as it can while keeping at least Printful's 150 DPI of real detail, up to 11 in on a tee and 10 in on a hoodie; the log prints the size and effective DPI.
- `mockups/`, `web/`: a photo of a model wearing the garment in each of the seven colours (Red, Yellow, Blue, Green, Black, White, Navy, mapped to each blank's Printful colours in `lib/merch.ts`), drawn by GPT-6-Astra from the art, and checked by Claude against `art.png`. A photo whose print drifted gets one retry; `sheet.png` shows them all with their scores.
- `merch.json`: print sizes, photo checks, and Claude's product copy (title, handle, description, product-page HTML, tags, SEO) in the house format.

`chaos sell RUN-N` then adds the photos to `public/images/products/`, a product per garment to `product-catalog.json` (every colour in XS–2XL, $30 a tee and $60 a hoodie, each variant's SKU naming its Printful variant), creates the Stripe product with a price per variant (needs the shop's `STRIPE_SECRET_KEY` in the environment), and runs lint, build, commit, push, and the Vercel wait, like `ship`. `--dry-run` stops after the build and changes nothing. Orders still reach Printful by hand: upload the print file there and order the SKU's variant. The Gildan 18500 has no XS, so an XS hoodie order needs a substitute blank.

## Safety

- Claude runs with `--restricted`: no shell or code tools, no settings or hooks, and file access confined to the run directory. `--bare` must not be used, because it ignores the Claude login and requires an API key.
- Codex runs with `--sandbox workspace-write`, confined to one job directory, and is told never to use its API-key fallback.
- Nothing is published without a human pick. Every ship goes through the same lint and build as any other change, and the site rejects a malformed manifest at build time (`app/lib/chaos-monkeys.ts`).
- Shipping never touches your working checkout. It refuses to run if the publish clone has uncommitted or unpushed work.

## Editing

Brand rules, voice, and the character live in `BRAND.md`, which both models read. Styles live in `STYLES.md`: add, cut, or reweight them freely. Templates are in `render/templates.ts`; the feedback page is `review/index.html`. The pipeline is `chaos.ts` plus `lib/`. Type-check with `npx tsc -p scripts/chaos-monkeys/tsconfig.json`.
