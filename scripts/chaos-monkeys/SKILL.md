---
name: chaos-monkeys
description: Review, ship, or unpublish A-OK's daily Chaos Monkeys, which this Mac drafts every morning with Claude and GPT-6-Astra. Use when the user runs /chaos-monkeys, asks to see today's monkeys or drafts, picks drafts to publish ("ship 2 4 5"), wants a monkey taken down, or wants the daily job paused or run now.
---

# Chaos Monkeys

Every morning at 9:07 (or at login if the Mac was off), this Mac drafts about six new A-OK monkeys and a contact sheet. Nothing is published until the user picks drafts. The tool lives in the a-ok-shop repo at `scripts/chaos-monkeys`; its launcher is `~/.a-ok-chaos/bin/chaos`.

## Show the latest drafts

1. Run `~/.a-ok-chaos/bin/chaos status`. It prints the contact sheet path and each draft's title, engine, score, and state. A `zingers` tag marks the topical draft, which riffs on that day's Zingers story.
2. Read the contact sheet with the Read tool. If you can send files to the user, send it too.
3. Summarize in a few lines: the top two or three by score and why, and any flags (TEXT, OFF-MODEL, RULES, JOKE?). Recommend a pick of two or three, usually including the topical one if it scored well. Then ask which to ship.

## Ship

Only ship the draft numbers the user names; never choose for them. Run `~/.a-ok-chaos/bin/chaos ship <numbers>`, e.g. `ship 2 4 5`. It assigns the next series numbers, writes WebP images and the manifest in the publish clone, runs lint and build, commits, pushes to main, and waits for Vercel. Report the new numbers and the deployment result. If lint or build fails, the tool discards its changes; report the log path it prints.

## Other commands

- `~/.a-ok-chaos/bin/chaos draft` makes today's drafts now if the morning run didn't (about 10 minutes). Add `--force` to redo a day.
- `~/.a-ok-chaos/bin/chaos unpublish 0007` takes a published monkey down. Confirm the number with the user first.
- `~/.a-ok-chaos/bin/chaos pause` and `resume` stop and restart the daily drafts.
- `--date YYYY-MM-DD` on `status` or `ship` works with an earlier day's drafts.

## Rules

- Never edit the manifest by hand, and never commit or push from the user's own checkout; the tool publishes from its own clone.
- If a command fails because Codex or Claude is logged out, tell the user to run `codex login`, or to open Claude Code and log in, and stop.
