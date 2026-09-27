# R03 — approved base and paint preview

**Not approved for printing. No fabrication package has been released.** R01 and R02 were rejected for visual mismatch; their mesh-validity results do not establish likeness.

This experiment uses the original main character image to condition a local Hunyuan3D shape model. The image's RGB content is preserved. Cropping and a background alpha mask isolate the character from the separate small reference views. No generated raster render is used as evidence of a 3D result.

The user approved the clay base and requested painting. The latest painted preview is `outputs/R03_face_paint_v2.blend`; review it in `FACE_REVIEW.html` or `REVIEW.html`. The first paint pass remains preserved in `outputs/R03_painted_preview.blend`. Its base vertex coordinates are unchanged from the approved clay file. See `PAINT_NOTES.md` for the appearance treatment. Eyelet engineering, scale verification, and fabrication checks remain pending.

## Likeness criteria

- Integrated eye surrounds, brow, nasal bridge, nostrils, muzzle, and chin; avoid separate discs and spheres.
- Eyes seated into the face, with the source's spacing and eyelid shape.
- Broad furry cheeks tapering into the neck beneath the muzzle.
- A folded V-shaped hood around the neck; no inflated circular collar or exposed horizontal shelf.
- Continuous loose sleeves bending into substantial ribbed cuffs, with hands disappearing into the pockets.
- Real pocket volumes and a zipper following the jacket front.
- Loose trousers with gathered ankle fabric, rather than straight rigid tubes.
- Sneakers with a curved toe box, visible tongue/lacing, leather panel shapes, and coherent sole thickness.

The original artwork is a perspective illustration, so an exact hidden-surface reconstruction is unavailable. This does not excuse visible departures from its face, clothing, pose, or silhouette.

## Software provenance

- Tencent Hunyuan3D-2: https://github.com/Tencent-Hunyuan/Hunyuan3D-2
- Shape weights: tencent/Hunyuan3D-2mini, hunyuan3d-dit-v2-mini, fp16 safetensors.
- Input segmentation: rembg / U2Net, run locally.
- Review rendering: Blender 4.5.3 LTS.
- Local runtime adaptations: select only the required checkpoint format; floating-point hierarchical sampling coordinates and CPU binary dilation and CPU masking of large decoded grids for MPS portability. Modifications are recorded in the local source and a patch file.

All processing is local after downloading software/model weights. No user artwork has been uploaded to a generation service. The upstream license is retained with this experiment.

## Current study edits

The raw inferred mesh is retained. The review sculpture receives a smooth 5.7% width reduction around the jacket, fading out near the neck and hem, to better match the main reference. An elliptical opening removes the unwanted generated membrane between the feet. These are likeness-study edits, not a completed manufacturing validation.

The delivered study uses a 512-level geometry extraction with 1,136,772 raw triangles. The earlier 256-level preview has been replaced. The clay source is preserved alongside the painted preview. All model review images are rendered from actual Blender geometry.

## Clay orbit video

`ORBIT_REVIEW.html` plays the 30-second Blender camera animation around the unpainted sculpt, including overhead and underside sweeps. The MP4 is `outputs/AOK_R03_Clay_Globular_Orbit.mp4`; the editable animation is `outputs/R03_clay_globular_animation.blend`. The approved mesh is unchanged.

## Painted orbit and WIP collateral

Open `PAINTED_ORBIT_REVIEW.html` through the local review server to watch the completed painted orbit and synchronized clay/paint comparison. `AOK_WIP_Sales_Collateral.zip` contains the clean painted master, branded square and landscape MP4s, two posters, and a suggested caption. All videos are silent, 30 seconds, 24 fps, with 720 verified frames.

The animation preserves the approved R03 geometry and uses face paint pass 2. Native editable files: `outputs/R03_painted_globular_animation.blend` and `collateral/AOK_WIP_Video_Edit.blend`. The video edit references the movie files in `outputs/`; keep the folder structure intact. The footage is labeled as a digital work in progress.
