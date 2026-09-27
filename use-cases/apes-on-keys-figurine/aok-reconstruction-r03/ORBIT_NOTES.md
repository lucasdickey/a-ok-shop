# Clay orbital inspection video

A 30-second continuous camera animation around the approved R03 unpainted clay mesh, rendered directly to H.264 MP4 using Blender's animation renderer.

- 0–10 seconds: 360-degree body orbit at 6 degrees above horizontal.
- 10–20 seconds: another revolution sweeping to 83 degrees above the model and back.
- 20–30 seconds: another revolution sweeping to 83 degrees below the model and returning to the starting view.
- Camera distance adjusts smoothly with elevation to keep the figure framed.
- The floor is hidden for the underside inspection. Studio lights travel with the camera to keep all surfaces legible.
- Base geometry is unchanged; its vertex hash matches the approved clay and paint versions.

## Deliverables

- `outputs/AOK_R03_Clay_Globular_Orbit.mp4` — 900 × 900, 24 fps, 720 frames, 30 seconds, silent.
- `outputs/R03_clay_globular_animation.blend` — native camera and light animation, timeline markers, and MP4 output configuration.
- `render_clay_orbit.py` — reproducible setup and rendering script.
- `ORBIT_REVIEW.html` — video player, angle shortcuts, and six inspection stills.
- `outputs/ORBIT_STATUS.json` — settings and base-geometry identity.

This is an inspection video of the actual sculpt, including its current underside and hidden surfaces. It does not represent a physical manufactured sample or a print release.
