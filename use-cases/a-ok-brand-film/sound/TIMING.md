# A-OK original score

An original, instrumental 15-second bed in D Dorian at 120 BPM. All sound is generated procedurally: no third-party recordings, samples, voices, or music. Warm subkick, restrained clap/snare, swung hats, short electronic-key chords, bass, a three-note glass signature, tactile clicks, and stereo transition sweeps.

Use `AOK_15s_Original_Score.wav` at **timeline zero, at unity gain**. It is exactly 720,000 samples long: 15 seconds, 48 kHz, stereo, 24-bit PCM. It should end with the film, with no extra fade necessary. For H.264 delivery, AAC at 256–320 kb/s is suitable.

| Time | Musical/graphic cue |
| --- | --- |
| 0.00 s | Opening D-minor impact, compact melodic signature, tactile ticks. |
| 1.62–2.00 s | First upward stereo sweep into the main groove. |
| 2.00 s | Full groove enters, harmony lifts to G. |
| 4.08–4.50 s | Transition sweep; bass/chord re-entry at 4.50 s. |
| 6.56–7.00 s | Transition sweep; second harmonic lift at 7.00 s. |
| 9.75–10.50 s | Drum breathing room followed by a longer lift. |
| 10.50 s | Strong return of opening motif and pulse. |
| 12.35–13.00 s | Final sweep and four accelerating-feel graphic ticks. |
| 13.00 s | Final brand impact: resolved chord, bass, upper signature note. |
| 13.00–15.00 s | Natural musical tail for a readable end card. |

The main visual cue times are **0 / 2 / 4.5 / 7 / 10.5 / 13 seconds**. Each is on the 0.5-second beat grid; cuts can be fine-tuned by 0.25 seconds without losing the groove. No drums after the final 13-second impact.

Measured with FFmpeg `ebur128=peak=true`: **−16.8 LUFS integrated**, **−1.2 dBFS true peak**, **1.6 LU loudness range**. The source has zero clipped samples. This leaves clean headroom for AAC encoding and keeps the transients articulate.

Regenerate with:

```sh
python3 synthesize_soundtrack.py
```

The script requires NumPy only. Change the event lists, scene-hit times, synthesis functions, or named bus gains to revise the score. A deterministic seed makes exact regeneration possible.
