# Drag and Drop — Die Cut Sticker (draft)

A first pass at a die cut sticker of the A-OK Drag and Drop Tee artwork, cut from the shop photo for a test order. Expect to touch it up before a real order (see Known limits).

## Files

- `drag-and-drop-sticker.png` — the art cut to its outline on a transparent background, 1266 × 1947. Upload this to printers that add their own white border and cut line.
- `drag-and-drop-sticker-with-border.png` — the same art with a white border (about 0.1 in) already added, for printers that want the border in the file.
- `drag-and-drop-sticker-preview.jpg` — the bordered sticker on a gray surface, to judge the cut shape.

The files are saved at 300 dpi, which makes them about 4.2 × 6.5 in. Order them smaller, around 3 in tall, for sharper results (see below).

## How it was made

There was no flat artwork file in this repo, so the art was cut by script from `public/images/products/a-ok-drag-and-drop-tee-navy.webp`. The navy photo was used rather than the black one because the art carries a thin light outline on navy, while on black the ape's black fur and pants run into the shirt.

1. Crop the chest area of the photo: left 330, top 440, right 800, bottom 1185 (photo pixels).
2. Mark shirt pixels: dark (no channel above 110) and blue-tinted (blue at least 15 above red). The black fur is neutral and the outline is light, so neither counts as shirt.
3. Thicken the art by 2 pixels so small breaks in the outline are closed, fill in the shirt from the crop's edge inward, then hand the 2 pixels back to the shirt. This keeps the navy pants, which are bare shirt fabric showing through the print, inside the cut.
4. Drop single-pixel specks, then keep each remaining piece of at least 800 pixels that doesn't touch the crop's edge. That keeps the ape, pointer hand and shoes, and drops the dashed "drop zone" marks under the feet and a shirt shadow at the right edge.
5. Shave one pixel off the outline, where navy blends into the light outline.
6. Enlarge 3× (Lanczos), and smooth the cut edge with a slight blur and re-threshold.
7. For the border: grow the outline by 30 pixels with rounded corners and smooth it so the cut has no small notches. The border joins the pointer hand to the ape.

## Known limits

- The art comes from a photo of a printed shirt, not the original file. Only about 450 pixels of real detail across were enlarged 3×, and a faint fabric texture shows on the hoodie.
- The edge of the figure keeps the print's dark outline and some of the shirt's navy where the light outline is thin, which can look off against the white border.
- The pants are navy because on that shirt they're the shirt itself. On the black shirt they're black.
- The pointer hand's lines are navy for the same reason.

The original art would give a cleaner sticker than this cut. It's in the design's Chaos Monkeys merch folder, `~/.a-ok-chaos/merch/<id>/` on the computer that made it (and in the private archive): `art.png` is the regular version, and `art-light.png` is the light-outline version printed on dark shirts, which is the one this cut came from.
