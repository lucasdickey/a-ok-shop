#!/usr/bin/env bash
# A-OK — "Hallucination Receipt": rebuild the 32-second film from source (about 25 minutes).
# Needs Node 22+, ffmpeg, Python 3 with Pillow, and Chrome or Chromium (set CHROME=/path if it isn't found).
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p out audio
FRAMES=0,96,150,170,188,192,226,250,268,280,326,370,420,470,505,566,604,636,644,678,702,724,746,790,831,900
node engine/capture.mjs --frames 0-959 --mp4 out/picture_lossless.mkv --audio audio/score_raw.wav
node engine/capture.mjs --only $FRAMES --png out/stills
./master.sh audio/score_raw.wav audio/score_master.wav
# Master: high-bitrate H.264 for editing and presentation. Web: small enough to message or upload anywhere.
NAME=A-OK_Hallucination-Receipt_32s_1080p
ffmpeg -v error -y -i out/picture_lossless.mkv -i audio/score_master.wav -map 0:v -map 1:a \
  -c:v libx264 -preset slow -crf 14 -tune grain -pix_fmt yuv420p -profile:v high -colorspace bt709 -color_primaries bt709 -color_trc bt709 \
  -c:a aac -b:a 320k -movflags +faststart -shortest out/${NAME}_master.mp4
ffmpeg -v error -y -i out/picture_lossless.mkv -i audio/score_master.wav -map 0:v -map 1:a \
  -c:v libx264 -preset slow -crf 20 -maxrate 12M -bufsize 24M -pix_fmt yuv420p -profile:v high -colorspace bt709 -color_primaries bt709 -color_trc bt709 \
  -c:a aac -b:a 192k -movflags +faststart -shortest out/${NAME}_web.mp4
cp audio/score_master.wav out/A-OK_Hallucination-Receipt_score_48k24.wav
cp out/stills/f250.png out/A-OK_Hallucination-Receipt_poster.png
python3 board.py out/stills out/A-OK_Hallucination-Receipt_style-frames.png
ls -lh out/*.mp4 out/*.png out/*.wav
