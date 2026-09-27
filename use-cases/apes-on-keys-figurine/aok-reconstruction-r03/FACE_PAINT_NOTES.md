# Face paint — pass 2

The user approved the existing clay geometry and requested more detail in the facial paint. This pass changes only the surface appearance of the frontal face and cheek fur. Clothing, cap, headphones, footwear, and lettering retain their previous appearance.

## Changes

- Smooth continuous eye edges instead of the previous mesh-resolution color boundaries.
- Brown irises with radial fibers, dark outer rims, pupils, and consistent catchlights.
- Softer eyelid shading, ivory eye whites, and warmer tonal variation in the facial skin.
- Shaped nostrils with shaded rims and a soft highlight across the bridge.
- Subtle philtrum and chin lines, lip shading, mouth creases, and a rounded painted tongue indication inside the existing cavity.
- Fine procedural fur and skin shading.

All detail is a native Blender surface shader. No added facial geometry, displaced vertices, image-generated preview, or change to the approved silhouette is involved. The base vertex hash is checked by the build script and recorded in `outputs/FACE_PAINT_V2_STATUS.json`. Shader microtexture is appearance detail, not print relief.

## Files

- `outputs/R03_face_paint_v2.blend`: updated editable appearance scene.
- `refine_face_paint.py`: reproducible face shader and rendering script.
- `renders/face_v2_*.png`: five actual Blender renders.
- `FACE_REVIEW.html`: matching-camera before/after and full-figure toggle.
- `outputs/R03_painted_preview.blend`: preserved first paint pass.

This is an appearance review. For physical manufacture, the chosen print/paint workflow will determine how this surface finish is transferred to the prototype. No production release or color match certification is implied.
