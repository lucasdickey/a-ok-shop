# Chaos Monkeys

The daily drop of new A-OK apes, made on this Mac using the Claude Code and Codex logins that are already here: no API keys, no GitHub Actions. Every morning the tool drafts about six monkeys and a contact sheet, and a person picks two or three to publish. Published monkeys appear on the homepage ("Latest drop") and at `/chaos-monkeys`.

| Step | Who | How |
|---|---|---|
| Brief | Claude | `claude -p --restricted`: six briefs in the brand voice (`BRAND.md`), avoiding jokes already published or drafted in the last two weeks |
| Topical slot | Zingers + Claude | One brief riffs on the day's AI/tech story from [Zingers](https://zingers.dev) (`/api/zingers`), with no company or person names. It is skipped if Zingers is unreachable |
| Illustrate | GPT-6-Astra | `codex exec` with Codex's built-in image tool. Hybrids get a transparent cutout drawn from the badge and hoodie reference art; Astra drafts get a finished poster |
| Compose | Claude's templates | `render/templates.ts` in headless Chrome: **specimen** (giant title behind the ape) and **form** (die-cut sticker, rubber-stamp title) |
| Judge | Claude | Reads every draft and scores spelling, character, rules, and whether the joke lands at thumbnail size |
| Pick | You | `/chaos-monkeys` in Claude Code, or `chaos status`, then `chaos ship 2 4 5` |
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
~/.a-ok-chaos/bin/chaos unpublish 0007          # take one down
~/.a-ok-chaos/bin/chaos pause | resume          # stop or restart the daily drafts
```

`ship` and `unpublish` also take `--branch <name>` and `--no-push`. `draft` and `ship` also take `--date YYYY-MM-DD`. Drafts live in `~/.a-ok-chaos/runs/<date>/`: `sheet.png`, `run.json` (briefs, scores, and what shipped), each Codex job's prompt and log, and `log.txt`.

## Safety

- Claude runs with `--restricted`: no shell or code tools, no settings or hooks, and file access confined to the run directory. `--bare` must not be used, because it ignores the Claude login and requires an API key.
- Codex runs with `--sandbox workspace-write`, confined to one job directory, and is told never to use its API-key fallback.
- Nothing is published without a human pick. Every ship goes through the same lint and build as any other change, and the site rejects a malformed manifest at build time (`app/lib/chaos-monkeys.ts`).
- Shipping never touches your working checkout. It refuses to run if the publish clone has uncommitted or unpushed work.

## Editing

Brand rules, voice, and the character live in `BRAND.md`, which both models read. Templates are in `render/templates.ts`. The pipeline is `chaos.ts` plus `lib/`. Type-check with `npx tsc -p scripts/chaos-monkeys/tsconfig.json`.
