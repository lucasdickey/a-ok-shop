# A-OK — Trust the Noise

A 15-second brand film that moves from graphic signal to streetwear to a dimensional figure, ending on the A-OK identity. New motion design, new Blender cinematography, and an original electronic score. The character is shown as a figure study in development.

## Watch and download

[Film with sound](https://5ghiacawdpwx1cyi.public.blob.vercel-storage.com/a-ok-brand-film/trust-the-noise/2026-09-27/AOK_Trust_The_Noise_15s.mp4) · [Editable source package](https://5ghiacawdpwx1cyi.public.blob.vercel-storage.com/a-ok-brand-film/trust-the-noise/2026-09-27/AOK_Brand_Film_Source.zip)

## Deliverables

- `outputs/AOK_Trust_The_Noise_15s.mp4`: 1920 × 1080, 30 fps, 15 seconds, H.264 + stereo AAC; ready to share.
- `outputs/AOK_Trust_The_Noise_15s_Silent.mp4`: identical picture without sound.
- `outputs/AOK_Trust_The_Noise_Edit.blend`: native Blender video/audio edit with scene markers and relative media links.
- `outputs/AOK_Brand_Film_Hero.blend`: new camera and lighting animation on the approved R03 paint study.
- `sound/AOK_15s_Original_Score.wav`: original 48 kHz stereo 24-bit score, no external samples.
- `outputs/AOK_Trust_The_Noise_Poster.png`: hero still.
- `outputs/AOK_Brand_Film_Source.zip`: portable source package, including selected catalog images, Blender files, scripts, music, and final movies. Intermediate rendered frames can be regenerated.

## Timeline

| Time | Scene |
| --- | --- |
| 0–2 s | Trust the noise: character field and kinetic typography |
| 2–4.5 s | Find the pattern: moving print-registration artwork |
| 4.5–7 s | Wear the output: three catalog products |
| 7–10.5 s | From signal to object: newly rendered 3D hero |
| 10.5–13 s | All outputs lead to: typographic crescendo |
| 13–15 s | A-OK identity and a-ok.shop end card |

## Rebuild

Run commands from this directory. Blender 4.5.3 with Cycles/Metal was used on the original Mac. Change the device setup in `scripts/render_hero.py` for another GPU. The renderer preserves the figure mesh and paint; camera and lighting are new.

```sh
npm install --prefix .runtime @napi-rs/canvas@1.0.9
blender --background --python scripts/render_hero.py -- --proof
blender --background --python scripts/render_hero.py
node scripts/compose_film.cjs
ffmpeg -y -i outputs/AOK_Trust_The_Noise_15s_Silent.mp4 -i sound/AOK_15s_Original_Score.wav -map 0:v:0 -map 1:a:0 -c:v copy -c:a aac -b:a 320k -t 15 -movflags +faststart outputs/AOK_Trust_The_Noise_15s.mp4
blender --background --python scripts/create_blender_edit.py
```

Font paths currently point to macOS Arial Black, Impact, Arial Bold, and Menlo. Configure equivalent local font paths in `compose_film.cjs` on other systems; fonts themselves are not redistributed. The original score can be regenerated with `sound/synthesize_soundtrack.py` (NumPy and FFmpeg).

`ASSET_PROVENANCE.json` identifies catalog art and copy. `VIDEO_QA.json` records exact duration/frame count. `sound/AOK_15s_Sound_QA.json` records loudness and clipping checks. View locally with `python3 serve_review.py` at http://127.0.0.1:8840/REVIEW.html.

Large files are excluded from Git and Vercel app uploads. Blender/Python tooling remains local. Shared downloads are listed in `ASSETS.json`.
