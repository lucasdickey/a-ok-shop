#!/bin/zsh
# A-OK — "Infinite Apes": rebuild the 15-second film from source.
#   ./render.sh            full pipeline (3D renders + composite + score + encode)
#   ./render.sh --skip-3d  reuse existing renders/final
set -e
HERE=${0:A:h}
cd $HERE
./fetch_fonts.sh
if [[ "$1" != "--skip-3d" ]]; then ./blender/queue.sh final; fi
mkdir -p out audio
node engine/capture.mjs --q final --frames 0-449 --mp4 out/picture_lossless.mkv --audio audio/score_raw.wav --png out/stills --png-every 15
./master.sh audio/score_raw.wav audio/score_master.wav
# Master: high-bitrate H.264 for editing and presentation. Web: small enough to message or upload anywhere.
ffmpeg -v error -y -i out/picture_lossless.mkv -i audio/score_master.wav -map 0:v -map 1:a \
  -c:v libx264 -preset slow -crf 14 -tune grain -pix_fmt yuv420p -profile:v high -colorspace bt709 -color_primaries bt709 -color_trc bt709 \
  -c:a aac -b:a 320k -movflags +faststart -shortest out/A-OK_Infinite-Apes_15s_1080p_master.mp4
ffmpeg -v error -y -i out/picture_lossless.mkv -i audio/score_master.wav -map 0:v -map 1:a \
  -c:v libx264 -preset slow -crf 20 -maxrate 12M -bufsize 24M -pix_fmt yuv420p -profile:v high -colorspace bt709 -color_primaries bt709 -color_trc bt709 \
  -c:a aac -b:a 192k -movflags +faststart -shortest out/A-OK_Infinite-Apes_15s_1080p_web.mp4
ls -lh out/*.mp4
