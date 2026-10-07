#!/bin/zsh
# Copy the macOS system fonts the film uses into engine/assets/fonts (they are not redistributed with this project).
# Bebas Neue, Space Grotesk and Inter (SIL OFL, from the storefront's next/font build) ship in the folder already.
set -e
D=${0:A:h}/engine/assets/fonts; mkdir -p $D
T=/System/Applications/Utilities/Terminal.app/Contents/Resources/Fonts
for w in Regular Medium Bold Heavy; do cp "$T/SF-Mono-$w.otf" $D/; done
cp "/System/Library/Fonts/Supplemental/Arial Black.ttf" $D/ArialBlack.ttf
cp "/System/Library/Fonts/Supplemental/DIN Condensed Bold.ttf" $D/DINCondensedBold.ttf
echo "fonts ready in $D"
