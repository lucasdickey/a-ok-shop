#!/usr/bin/env bash
# Master: gentle glue compression, make-up gain solved for -14 LUFS, brick-wall limiter.
# Pure gain + limiting keeps the arrangement's dynamics (quiet build, loud drops) intact.
set -euo pipefail
IN=$1; OUT=$2; TARGET=${3:--14}
chain() { echo "highpass=f=28,acompressor=threshold=-22dB:ratio=2:attack=10:release=160:knee=6,volume=${1}dB,alimiter=limit=0.79:attack=1.5:release=60:level=disabled"; }
measure() { ffmpeg -hide_banner -nostats -i "$IN" -af "$(chain "$1"),ebur128" -f null - 2>&1 | grep -A3 "Integrated loudness" | grep " I:" | awk '{print $2}'; }
G=8
for i in 1 2 3; do I=$(measure $G); G=$(python3 -c "print(round($G + ($TARGET) - ($I), 2))"); done
ffmpeg -v error -y -i "$IN" -af "$(chain $G),aresample=48000" -c:a pcm_s24le "$OUT"
echo "gain ${G} dB"
ffmpeg -hide_banner -nostats -i "$OUT" -af ebur128=peak=true -f null - 2>&1 | grep -A14 Summary | grep -E " I:| LRA:|Peak:" | tr -s ' '
