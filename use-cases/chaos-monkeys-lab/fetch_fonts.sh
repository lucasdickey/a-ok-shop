#!/bin/zsh
# Copy the macOS system fonts the code-drawn templates use (not redistributed here).
set -e
D=${0:A:h}/claude/assets/fonts; mkdir -p $D
T=/System/Applications/Utilities/Terminal.app/Contents/Resources/Fonts
cp "$T/SF-Mono-Medium.otf" "$T/SF-Mono-Bold.otf" $D/
cp "/System/Library/Fonts/Supplemental/Arial Black.ttf" $D/ArialBlack.ttf
cp "/System/Library/Fonts/Supplemental/DIN Condensed Bold.ttf" $D/DINCondensedBold.ttf
echo "fonts ready in $D"
