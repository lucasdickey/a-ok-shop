# R03 paint preview

The user approved the R03 clay silhouette and requested a paint pass. This version preserves that base geometry. Its vertex coordinates are checked against the clay source in the build script; the SHA-256 is saved in `outputs/PAINT_STATUS.json`.

## Files

- `outputs/R03_painted_preview.blend`: editable model with named paint materials, conformal graphics, lights, and five cameras.
- `renders/painted_*.png`: actual Cycles renders, including front, three-quarter, side, rear, and face detail.
- `REVIEW.html`: original versus painted/clay comparison.
- `paint_reconstruction.py`: reproducible Blender paint setup.
- `outputs/R03_experimental_reconstruction.blend`: unchanged approved clay source.

## Paint treatment

Red hoodie; charcoal fur and trousers; tan face and muzzle; brown irises with dark pupils and catchlights; red/white cap with black A-OK lettering; black/red/white headphones; red/white/black sneakers with ivory laces. The jacket lettering is black with an ivory outline. Surface regions use named Blender materials with a `Paint_RGBA` vertex-color attribute to smooth their boundaries. Edit the color attribute or rerun the paint script to change the palette. Text is rendered with thin conformal overlay meshes above the original surface. The existing body vertices are not altered.

These are a proposed paint layout and an appearance preview, not a factory color standard. No precise Pantone match is claimed. Fabric microtexture is shader detail, not sculpted print relief. Shoe panels, laces, iris detail, zipper teeth, and headphone emblems are paint indications at this stage. No image-generated product mockup is used for the model views.

## Next manufacturing work

This file is not yet a print release. Attachment engineering, final scale/datum verification, manufacturability checks, and the shop's paint or color-print workflow still need to be resolved. The thin graphic overlays are intended for the appearance scene; the production method must determine how to transfer them to the physical prototype.
