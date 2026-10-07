# Chaos Monkeys lab: step 0

A bake-off to decide how new Chaos Monkeys get made before building the daily pipeline. Each brief in `briefs.json` was made by two engines, both running on subscriptions already on this Mac. No API keys and no GitHub Actions were used.

| Engine | How it ran | Auth |
|---|---|---|
| **Claude** (Opus 5.5) | Code-drawn canvas templates (`claude/`), rendered in headless Chrome. `claude -p` is verified for headless runs. | `apiKeySource: none` (Claude login) |
| **Astra** (`gpt-6-astra`) | `codex exec` using Codex's built-in `image_gen` tool | "Logged in using ChatGPT"; the built-in tool needs no `OPENAI_API_KEY` |

## Results (29 Sep 2026)

| Nº | Brief | Claude, code-drawn | Astra | Pick |
|---|---|---|---|---|
| 0413 | Context Window Washer (poster) | Can't pose the ape; the figurine is pasted in | Strong narrative poster, all text correct | **Astra** |
| 0414 | Rate-Limited (pixel) | Real 8-bit and exact type, but flat | Depth, a queue gag, and every string correct | **Astra** (use code when true pixel art is wanted) |
| 0415 | Certified A-OK (seal) | Best joke (the inspection form); weak stamp | Clean seal on a black backing | **Hybrid**: Astra's seal on Claude's form |
| 0416 | Zero-Shot (hybrid test) | House template and type | Transparent character cutout from your art as reference | **Hybrid**, the recommended default |

Measured: Astra took about 2.3–3 minutes per image, and two runs in parallel both completed. It rendered every requested string correctly in 4 of 4 images. With the badge and Hallucination Club art attached (`-i`), the character stayed on-model. A Claude template renders in about 1 second once written. All six candidates read at 300 px.

Quirks for step 1:
- Codex saves to `~/.codex/generated_images/` and copies into the workspace, so ask for an exact output path.
- Cutout alpha is 250–254 rather than 255; snap alpha ≥ 245 to 255.
- Outputs are 1.5–3 MB PNGs, so normalize to WebP.
- The prompt must keep Codex on the built-in tool. Its CLI fallback would require `OPENAI_API_KEY`.

## Commands

```sh
# Astra (in codex/, with briefs.json beside it)
codex exec --skip-git-repo-check --ephemeral -s workspace-write -C . \
  -i ref-badge.jpg -i ref-body.png -o last.txt "…use your built-in image generation tool (never the CLI fallback)…"

# Claude templates
./fetch_fonts.sh && node claude/render.mjs 0413 0414 0415 h0415 h0416
```

The exact prompts Astra used are in `codex/*.last.txt`. Images live in `results/`, which is ignored by Git and Vercel. `bakeoff.png` and `hybrid_0416.png` are the comparison sheets.
