# A-OK "Apes on Keys" 4-Inch Keychain

## Codex / Blender Production Brief

### Objective

Create a **manufacturable 3D model and production package** for a
limited-run keychain based on the supplied reference image:

`aok_ape_keychain_reference.png`

The reference character is authoritative. **Do not redesign,
reinterpret, substitute, or "improve" the character.** The goal is to
translate the existing 2D/3D-rendered character into printable 3D
geometry while preserving its identity, proportions, expression,
clothing, and visual details.

The final character should be **4.0 inches / 101.6 mm tall**, measured
from the soles of the shoes to the top of the cap **excluding the
keychain eyelet and external keyring hardware**.

------------------------------------------------------------------------

## 1. Source Character: Immutable Visual Requirements

Preserve the character shown in the reference:

-   Ape with large round brown eyes.
-   Surprised/open-mouth expression.
-   Tan muzzle, nose, eye surround, and inner mouth details.
-   Black/dark fur.
-   Red-and-white fitted baseball cap.
-   Raised/clearly legible **A-OK** on the front of the cap.
-   Large over-ear headphones, predominantly black/red/white.
-   Red zip hoodie.
-   Large **APES / ON / KEYS** typography on the front of the hoodie.
-   Hands in hoodie pockets.
-   Loose black/dark pants.
-   Red/white/black high-top sneakers.
-   Compact, slightly oversized head/body proportions seen in the
    reference.
-   Overall polished collectible-figurine aesthetic.

Use the supplied front, side, rear, and head views as modeling
references.

### Do not

-   Add sunglasses.
-   Add a keyboard.
-   Make the character seated.
-   Change the hoodie color.
-   Change the expression.
-   Change the cap.
-   Replace the character with another ape/monkey design.
-   Add props not present in the source.
-   Turn the character into a flat charm.
-   Treat the reference as loose inspiration.

This is a **full volumetric figurine keychain**.

------------------------------------------------------------------------

## 2. Target Scale

Primary production dimensions:

-   Character height: **101.6 mm / 4.00 in**
-   Height measurement excludes integrated eyelet and removable metal
    hardware.
-   Preserve source proportions when deriving width and depth.
-   Expected overall width: approximately **48--55 mm**, driven
    primarily by headphones/arms.
-   Expected depth: approximately **38--45 mm**, subject to the final
    sculpt.
-   Do not force the model to these approximate width/depth values if
    doing so visibly distorts the reference.

Blender scene units:

-   Metric.
-   Length: millimeters.
-   Unit scale configured so exported geometry is unambiguously
    millimeter-scaled.
-   Apply object transforms before final export.

------------------------------------------------------------------------

## 3. Intended Manufacturing Process

Optimize the master first for:

1.  **High-detail resin 3D printing** for prototype and small-batch
    production.
2.  Full-color printing where supported.
3.  Painted resin production as an alternative.
4.  Potential later conversion to PVC/vinyl or molded production.

The initial deliverable must be printable as a durable 4-inch
figurine/keychain rather than merely renderable.

------------------------------------------------------------------------

## 4. Modeling Approach

Create the model in Blender using a combination of procedural Python and
ordinary Blender mesh operations as appropriate.

Codex should create a reproducible Blender Python script, ideally:

`build_aok_keychain.py`

Running the script in Blender should create or rebuild the production
scene as far as practical.

### Suggested object hierarchy

Keep logically distinct components separate during construction:

-   `APE_HEAD`
-   `APE_MUZZLE`
-   `APE_EYES`
-   `APE_EARS`
-   `APE_FUR_HEAD`
-   `CAP_CROWN`
-   `CAP_BRIM`
-   `CAP_AOK_TEXT`
-   `HEADPHONE_BAND`
-   `HEADPHONE_L`
-   `HEADPHONE_R`
-   `HOOD`
-   `HOODIE_BODY`
-   `HOODIE_SLEEVES`
-   `HOODIE_CUFFS`
-   `HOODIE_ZIPPER`
-   `HOODIE_TEXT`
-   `HANDS`
-   `PANTS`
-   `SHOE_L`
-   `SHOE_R`
-   `EYELET`
-   any other useful subcomponents

For the final print mesh, join/boolean components as appropriate to
produce robust watertight geometry. Preserve a working version with
editable components.

------------------------------------------------------------------------

## 5. Keychain Attachment

Use an **integrated reinforced eyelet** as part of the 3D geometry.

Placement:

-   Top center of the cap/head.
-   Slight rearward bias is acceptable if required for the figure to
    hang more vertically.
-   Integrate structurally into the cap/head mass.
-   Do **not** rely on a tiny glued or screwed-in printed post.

Target eyelet:

-   Internal opening: **4.0 mm minimum**
-   Target outer diameter: approximately **8--10 mm**
-   Minimum surrounding material: **2.0 mm**, preferably 2.5 mm at the
    highest-load areas.
-   Rounded transitions/fillets into the cap.
-   No sharp internal corners.
-   Geometry must withstand ordinary use as a bag charm/keychain.

The eyelet may extend above the 101.6 mm character height.

Also create a rendered example showing:

-   25--30 mm metal split ring.
-   Short metal chain or jump-ring connection.
-   Hardware is illustrative and should **not** be fused into the
    printable character mesh.

------------------------------------------------------------------------

## 6. Printability Constraints

Use conservative small-run resin-printing rules unless a selected vendor
specifies otherwise:

-   Minimum structural wall/feature thickness: **1.5 mm**
-   Prefer **2.0 mm+** for load-bearing or exposed details.
-   Eyelet: 2.0--2.5 mm+ material around hole.
-   Avoid fragile isolated details.
-   Avoid unsupported paper-thin cap brim geometry.
-   Reinforce headphone band sufficiently to survive handling.
-   Merge or structurally connect headphones to the head where visually
    unobtrusive.
-   Hands/fingers should read visually but not be modeled as fragile
    independent fingers.
-   Shoelaces and shoe paneling may be relief geometry rather than loose
    geometry.
-   Fur should be represented with restrained sculpted texture/normal
    detail, not thousands of fragile hairs.
-   Hoodie fabric texture should be subtle and printable.
-   Typography must have enough depth to survive printing/painting.
-   Eliminate non-manifold geometry, internal floating shells,
    accidental intersections, and zero-thickness surfaces.

### Text geometry

`A-OK` and `APES ON KEYS` are important character identifiers.

Preferred implementation:

-   Raised lettering where practical.
-   Relief height approximately **0.6--1.0 mm** at this scale.
-   Minimum stroke width approximately **0.8 mm**, preferably 1.0 mm+.
-   If exact source typography cannot be reconstructed as geometry,
    approximate its silhouette closely and preserve legibility.
-   Keep text objects editable in the working `.blend`.

------------------------------------------------------------------------

## 7. Character Geometry Guidance

### Head and face

This is the most important identity area.

Preserve:

-   Large spherical eyes.
-   Thick dark fur framing the tan facial area.
-   Rounded tan muzzle.
-   Small nostrils.
-   Open circular/oval mouth.
-   Childlike but not generic "cute monkey" proportions.
-   Face must match the reference rather than a stock primate sculpt.

Avoid over-realistic primate anatomy.

### Cap

-   Red brim.
-   White front panel.
-   Red side/rear panels.
-   Black/dark seam/detail where useful.
-   `A-OK` prominently on front.
-   Preserve fitted/baseball-cap proportions from reference.
-   Integrate eyelet without visually overwhelming cap.

### Headphones

-   Large over-ear silhouette.
-   Black main structure.
-   Red accent rings.
-   White/silver face areas as shown.
-   Headband must visibly pass over/around cap in the same manner as
    reference.
-   Ensure sufficient physical connection to the head/cap for printing.

### Hoodie

-   Saturated red.
-   Thick hood behind neck/head.
-   Zipper centered.
-   Ribbed cuffs and waistband may be simplified relief.
-   Hands remain tucked in pockets.
-   Preserve oversized streetwear silhouette.
-   `APES ON KEYS` remains dominant front graphic.

### Pants and shoes

-   Loose dark pants.
-   Chunky red/white/black sneakers.
-   Preserve high-top/basketball-shoe visual language without relying on
    microscopic details.
-   Flatten the soles enough that the figurine can stand independently
    during display/inspection even though it is a keychain.

------------------------------------------------------------------------

## 8. Materials and Color IDs

Set up named Blender materials so colors can be changed without
remodeling.

At minimum:

-   `MAT_RED`
-   `MAT_WHITE`
-   `MAT_BLACK`
-   `MAT_FUR`
-   `MAT_FACE_TAN`
-   `MAT_EYE_BROWN`
-   `MAT_EYE_WHITE`
-   `MAT_MOUTH_DARK`
-   `MAT_METAL_PREVIEW`

Use the source image as the color authority rather than inventing a new
palette.

The production model should work both as:

-   monochrome geometry for resin printing/painting; and
-   a color-assigned model for full-color workflows.

------------------------------------------------------------------------

## 9. Files Codex Must Produce

Create this directory structure:

``` text
aok-keychain/
├── README.md
├── build_aok_keychain.py
├── references/
│   └── aok_ape_keychain_reference.png
├── blender/
│   └── aok_ape_keychain_master.blend
├── exports/
│   ├── aok_ape_keychain_4in.stl
│   ├── aok_ape_keychain_4in.obj
│   ├── aok_ape_keychain_4in.mtl
│   └── aok_ape_keychain_4in.3mf
├── renders/
│   ├── front.png
│   ├── left.png
│   ├── right.png
│   ├── rear.png
│   ├── top.png
│   ├── bottom.png
│   ├── three_quarter.png
│   ├── clay_front.png
│   ├── clay_three_quarter.png
│   ├── eyelet_detail.png
│   └── keyring_mockup.png
└── qa/
    └── validation_report.md
```

If Blender's installed version cannot reliably export 3MF, document that
clearly and produce STL + OBJ/MTL; do not fake a 3MF file.

If STEP export is available through a trustworthy installed
add-on/toolchain, additionally produce:

`aok_ape_keychain_4in.step`

Do not claim that a triangulated character sculpt has become true
parametric CAD merely because it was placed in a STEP container.

------------------------------------------------------------------------

## 10. Required Blender Master

`aok_ape_keychain_master.blend` must contain:

-   Editable component objects.
-   Final joined print mesh in a dedicated collection.
-   Named materials.
-   Orthographic cameras.
-   Three-quarter presentation camera.
-   Neutral studio lighting.
-   A measurement/reference collection.
-   Keyring hardware mockup in a separate, non-export collection.
-   Reference images in a dedicated reference collection.
-   Sensible object names.
-   Applied scale on the final export mesh.

Collections suggested:

-   `REFERENCE`
-   `CHARACTER_EDITABLE`
-   `PRINT_MASTER`
-   `HARDWARE_PREVIEW`
-   `CAMERAS`
-   `LIGHTS`

------------------------------------------------------------------------

## 11. Automated Validation

Before export, run checks and write results to
`qa/validation_report.md`.

At minimum validate:

-   Final character height = **101.6 mm ± 0.25 mm**, excluding eyelet.
-   Eyelet opening \>= **4.0 mm**.
-   No non-manifold edges in final STL mesh.
-   No zero-area faces.
-   No obvious disconnected floating components.
-   Normals consistently outward.
-   No duplicate vertices within an appropriate tolerance.
-   Final mesh is watertight.
-   Applied object scale = 1,1,1.
-   Export units verified in millimeters.
-   Bounding box dimensions recorded.
-   Triangle count recorded.
-   All expected export files exist and are non-zero.
-   Typography is present and visible.
-   Eyelet is physically connected to main body.
-   Headphones are structurally connected.
-   Both shoes connect to legs/body and contain no floating decorative
    pieces.

If a validation check fails, fix the model before declaring completion.

------------------------------------------------------------------------

## 12. Render Requirements

Render on a neutral light/white background.

Create consistent orthographic views:

-   Front.
-   Rear.
-   Left.
-   Right.
-   Top.
-   Bottom.

Also render:

-   Three-quarter hero.
-   Monochrome/clay front.
-   Monochrome/clay three-quarter.
-   Close-up of integrated eyelet.
-   Keyring mockup showing approximate final physical appearance.

Do not use perspective distortion for the orthographic manufacturing
views.

Use the same pose throughout.

------------------------------------------------------------------------

## 13. README Requirements

The generated `README.md` should explain:

1.  What the model is.
2.  Blender version used.
3.  How to run `build_aok_keychain.py`.
4.  How dimensions are defined.
5.  Which object is the final print master.
6.  How to export STL/OBJ/3MF.
7.  Which files should be sent to a print vendor.
8.  Known limitations or areas requiring human sculpting.
9.  Suggested prototype process.
10. A statement that the supplied reference image is the visual source
    of truth.

------------------------------------------------------------------------

## 14. Manufacturer Handoff Package

The files ultimately sent to a prototype shop should be:

-   `aok_ape_keychain_4in.stl` --- geometry.
-   `aok_ape_keychain_4in.3mf` --- preferred if full color/material
    assignments survive export.
-   `aok_ape_keychain_4in.obj` + `.mtl` --- color/material fallback.
-   Orthographic renders.
-   Three-quarter color render.
-   Eyelet detail render.
-   Original reference image.
-   Dimension/specification sheet if available.
-   `validation_report.md`.

Ask the vendor to quote:

-   Quantity 1 prototype.
-   Quantity 10.
-   Quantity 25.
-   Quantity 50.
-   High-detail resin, unpainted.
-   High-detail resin, painted/full finished.
-   Full-color printing if supported.
-   25--30 mm split-ring hardware and assembly.
-   Per-unit and setup/finishing costs separately.

Do **not** order a production run before approving one physical
prototype.

------------------------------------------------------------------------

## 15. Definition of Done

This task is complete only when:

-   The character clearly matches the supplied A-OK reference.
-   It is not a newly invented monkey/ape.
-   Character height is exactly 4 inches / 101.6 mm excluding eyelet.
-   The integrated eyelet is structurally printable.
-   The final mesh is watertight/manifold.
-   Manufacturer-ready STL exists.
-   Color-capable OBJ/MTL or 3MF exists.
-   Editable `.blend` exists.
-   Orthographic and presentation renders exist.
-   Validation report passes.
-   README explains reproduction and export.
-   The result can be handed to a professional 3D-print service for a
    prototype quote without needing them to guess the intended character
    or dimensions.

------------------------------------------------------------------------

## 16. Execution Guidance for Codex

Work iteratively rather than trying to solve the sculpt in one enormous
script.

Recommended sequence:

1.  Inspect the supplied reference.
2.  Set Blender units and scene structure.
3.  Block out silhouette and proportions.
4.  Match head/face.
5.  Match body/clothing.
6.  Add cap/headphones.
7.  Add shoes and secondary forms.
8.  Add text/relief.
9.  Add integrated eyelet.
10. Inspect all orthographic views against reference.
11. Make printability modifications without materially changing
    appearance.
12. Build final watertight print mesh.
13. Validate.
14. Render.
15. Export.
16. Write README and QA report.

At each modeling stage, save progress and render a contact sheet or
orthographic views for comparison.

**Prioritize resemblance over procedural cleverness.** If a part needs
manual mesh/sculpt operations to match the source, use them. The Python
script should automate reproducible setup/build/export/validation
wherever reasonable, but it is acceptable for the `.blend` master to
contain sculpted geometry that is not trivially regenerated from
primitives.

### Critical instruction

If you cannot faithfully infer some hidden geometry from the available
reference views, choose the simplest geometry consistent with all
visible views. Do not introduce novel character elements. Document any
such interpretation in the README.

------------------------------------------------------------------------

## Source of Truth

`references/aok_ape_keychain_reference.png`

When any written instruction conflicts with the visible identity of the
character, preserve the character shown in the source image unless the
conflict concerns explicit manufacturing requirements such as scale,
eyelet, or minimum feature thickness.
