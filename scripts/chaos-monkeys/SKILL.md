---
name: chaos-monkeys
description: Review, ship, or unpublish A-OK's daily Chaos Monkeys, the tee and hoodie graphics this Mac drafts every morning with Claude and GPT-6-Astra. Use when the user runs /chaos-monkeys, asks to see today's monkeys or drafts, wants a batch of drafts to review or give feedback on, picks drafts to publish ("ship 2 4 5"), wants a monkey taken down, or wants the daily job paused or run now.
---

# Chaos Monkeys

Every morning at 9:07 (or at login if the Mac was off), this Mac drafts about six A-OK tee and hoodie graphics, each in a different style from `STYLES.md` (box logo, varsity, woodcut, tattoo flash, and so on), plus a contact sheet. Each draft has a short list of printed words, and product and marketing copy for everything that doesn't need to be on the shirt. Nothing is published until the user picks drafts. The tool lives in the a-ok-shop repo at `scripts/chaos-monkeys`; its launcher is `~/.a-ok-chaos/bin/chaos`.

A run is a date (`2026-10-01`) or a date with a label (`2026-10-01-apparel`) for an extra batch. Every command takes `--date RUN`; without it, commands use the latest run.

## Show the latest drafts

1. Run `~/.a-ok-chaos/bin/chaos status`. It prints the contact sheet path and each draft's title, score, style, and state. A `zingers` tag marks the topical draft, which riffs on that day's Zingers story.
2. Read the contact sheet with the Read tool. If you can send files to the user, send it too.
3. Summarize in a few lines: the top two or three by score and why, and any flags (TEXT, OFF-MODEL, RULES, JOKE?). Recommend a pick of two or three, usually including the topical one if it scored well. Then ask which to ship, or offer the review page for detailed feedback.

## Review page and feedback

The review page is a claude.ai Artifact where the user keeps or rejects each draft and writes why. Verdicts land in the Artifact's database, and importing them teaches the next batches: kept styles get picked more often, and the brief writer reads every verdict and note.

1. Export the run: `~/.a-ok-chaos/bin/chaos review --date RUN --out <scratchpad>/chaos-review`. It writes `index.html`, `drafts.json`, and `img/RUN-N.webp`.
2. Publish it with the Artifact tool: `file_path` the exported `index.html`, `root` the export folder, `files` set to `drafts.json` and every `img/…` file. If `~/.a-ok-chaos/review-artifact.txt` holds a URL, read that Artifact first and publish to it with `url` (feedback from earlier runs stays in its database). Otherwise publish a new one with `capabilities: {"db": {}}` and `icon: "shirt"`, then save its URL to that file. Give the user the link.
3. When the user says they're done, read the feedback with the `ArtifactData` tool on that URL: `query` the `feedback` collection where `run` equals RUN, and `get` the document `notes/RUN`. Write them to a file shaped `{"items": [{"run", "n", "verdict", "note"}], "notes": [{"run", "note"}]}` and run `~/.a-ok-chaos/bin/chaos feedback FILE`. Feedback can also come straight from chat: put the user's words in the same shape.
4. Report what was imported and the style record the command prints, then ask whether to ship any of the kept drafts.

## Ship

Only ship the draft numbers the user names; never choose for them. Run `~/.a-ok-chaos/bin/chaos ship <numbers>` (with `--date RUN` for a run other than the latest), e.g. `ship 2 4 5`. It assigns the next series numbers, writes WebP images and the manifest in the publish clone, runs lint and build, commits, pushes to main, and waits for Vercel. Report the new numbers and the deployment result. If lint or build fails, the tool discards its changes; report the log path it prints.

## Other commands

- `~/.a-ok-chaos/bin/chaos draft` makes today's drafts now if the morning run didn't (about 10 minutes). Add `--force` to redo a day. For an extra batch that leaves the daily run alone, use a labelled run: `chaos draft --count 15 --date 2026-10-01-apparel` (up to 24 drafts; about a minute per draft).
- `~/.a-ok-chaos/bin/chaos unpublish 0007` takes a published monkey down. Confirm the number with the user first.
- `~/.a-ok-chaos/bin/chaos pause` and `resume` stop and restart the daily drafts.

## Rules

- Never edit the manifest by hand, and never commit or push from the user's own checkout; the tool publishes from its own clone.
- If a command fails because Codex or Claude is logged out, tell the user to run `codex login`, or to open Claude Code and log in, and stop.
