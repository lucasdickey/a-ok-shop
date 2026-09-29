#!/bin/zsh
# Render every 3D pass for the reel. Usage: queue.sh preview|final
Q=$1; S=${0:A:h:h}; B=/Users/ld/Downloads/AOK_Apes_on_Keys_4in_Keychain_Codex_Package/tooling/Blender.app/Contents/MacOS/Blender
OUT=$S/renders/$Q; mkdir -p $OUT; LOG=$S/renders/$Q.log; : > $LOG
run() { $B -b --python $S/blender/shots.py -- "$@" --quality $Q --out $OUT 2>&1 | grep -E "FRAME|DONE|TRACK|WIRE_FACES|Error|rror|Traceback" >> $LOG }
run --shot II --variant mask
run --shot II --variant paint --track $S/renders/track_II.json
run --shot III --variant paint --track $S/renders/track_III.json
run --shot III --variant wire
run --shot III --variant clay
echo "QUEUE_COMPLETE" >> $LOG
