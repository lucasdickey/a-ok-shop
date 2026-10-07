# A-OK — "Infinite Apes"

A 15-second brand film for A-OK: 1920×1080, 30 fps, 450 frames, with an original score synthesized and locked to picture.

**Idea:** the infinite monkey theorem is the brand name. Apes on keys type random noise until the signal appears. The
signal is "A-OK", and it becomes the Apes on Keys figurine. That figurine really was decoded from noise by Hunyuan3D, so
the film dramatizes the brand's own pipeline rather than a metaphor for it.

## Files

| File | What it is |
|---|---|
| `A-OK_Infinite-Apes_15s_1080p_web.mp4` | Sharing copy: H.264 High at CRF 20, AAC 192k, 16 MB. |
| `A-OK_Infinite-Apes_15s_1080p_master.mp4` | Presentation master: H.264 High at CRF 14 with grain tuning, AAC 320k, 74 MB. |
| `A-OK_Infinite-Apes_score_48k24.wav` | The mastered score: 48 kHz/24-bit, −14.0 LUFS integrated, peak below −1 dBFS. |
| `A-OK_Infinite-Apes_style-frames.png` | Production board: one frame per section, with timecodes. |
| `A-OK_Infinite-Apes_poster.png` | Hero still (frame 160). |
| `source/` | Everything needed to re-render, including the final Blender frames. |

The source and its small input art are in Git. The rendered media (the MP4s, the score, the stills, and the Blender frames in `source/renders/`) stays on the machine that made it, and the whole folder is excluded from Vercel uploads (root `.vercelignore`). `./render.sh` rebuilds everything, but the 3D pass needs the figurine's Blender file, which is restored with `use-cases/apes-on-keys-figurine/scripts/restore_assets.py`.

## Structure: eight bars at 128.57 BPM (one beat = 14 frames, so every cut lands on a frame)

| Bar | Time | Section | What happens |
|---|---|---|---|
| 1–2 | 0.0–3.7 s | 01 NOISE | One ape types near-misses of A-OK ("A-0K", "@-OL"...). The colony doubles every 6 frames, and the camera pulls out to billions of keystrokes. Cells under the cap's lettering lock on 16th notes, each with a rising chime. A one-frame negative closes the section. |
| 3 | 3.7–5.6 s | 02 SIGNAL | A match cut: the ASCII A-OK is aligned pixel-for-pixel to a Cycles render of the figurine's cap. The camera whips back to the hero shot, and APES / ON / KEYS slam behind the figure on the beat, which casts its shadow on the letters. |
| 4 | 5.6–7.5 s | 03 MODEL | An x-ray orbit: scanners rebuild the figure from wireframe to clay to paint. Callouts are tracked to 3D points exported from Blender. The camera dives into the O-mouth. |
| 5 | 7.5–9.3 s | 04 INFINITE | Out of the O-mouth of the A-OK keyboard poster, one ape becomes a wall of the 27-piece archive. "INFINITE" and "APES" are knocked out of solid panels. |
| 6 | 9.3–11.2 s | 05 WEAR | Eight real catalog products with their names, prices, and XS–2XL sizes, stepping on 8th notes. |
| 7 | 11.2–13.1 s | 06 PLAY | The frame crumbles into 16 px tiles, which flip outward like a stadium card stunt into the 8-bit badge. The game's own HUD returns: `UBI CREDITS: n/3`, square coins, YOU WIN!. |
| 8 | 13.1–15.0 s | 07 A-OK | The pixels resolve into the vector badge, then the lockup: A-OK, APES ON KEYS EVERYWHERE, and A-OK.SHOP typed on the same keys as frame 0. |

## Sources

- **3D:** `apes-on-keys-figurine/aok-reconstruction-r03/outputs/R03_face_paint_v2.blend`. The approved mesh and paint are unchanged; the new cameras, lights, and variant materials exist only in unsaved render sessions. The HUD counts (556,765 vertices, 1,110,439 faces, seed 29, octree 512) come from that file and its reconstruction metadata.
- **Art:** 27 of the 31 images in `public/images/hp-art-grid-collection`. Four were left out because they depict or name real people.
- **Products:** names, prices, and photography from `product-catalog.json` and `public/images/products`.
- **Brand:** the badge (`a-ok-suprised.jpg`), the 8-bit badge (`a-ok-8bit-retro.png`, sampled back to its 64×64 grid), and the site's Bebas Neue and Space Grotesk. Arial Black matches the lettering printed on the figurine.

## Rebuild

No packages are installed. The toolchain is Blender 4.5, Node, Google Chrome (headless), and ffmpeg.

```sh
cd source
./render.sh --skip-3d   # reuse renders/final: composite, score, master, and encode in about 3 minutes
./render.sh             # also re-render the 3D (about 22 minutes on an M4 with Cycles/Metal)
```

- `blender/shots.py` renders shot II (paint) and shot III (paint, clay, wireframe) with camera motion blur. It also writes the cap-text mask and per-frame screen positions for the eyes, mouth, cap, headphones, and chest. Camera keys are set at quarter frames so the match-cut frame stays sharp.
- `engine/` is a canvas compositor (typography, HUD, knockouts, pixel morph, grain, chromatic aberration) plus a Web Audio score rendered offline. Every frame is a pure function of its frame number, and the key sounds are generated from the same typing data as the picture.
- `engine/capture.mjs` drives headless Chrome over the DevTools protocol using Node built-ins only, and pipes the frames to ffmpeg.
- `master.sh` applies glue compression, a make-up gain solved for −14 LUFS, and a −2 dBFS limiter, so the mix keeps its dynamics.
- `fetch_fonts.sh` copies the macOS system fonts the film uses (SF Mono, Arial Black, DIN Condensed). These fonts are not redistributed here.
