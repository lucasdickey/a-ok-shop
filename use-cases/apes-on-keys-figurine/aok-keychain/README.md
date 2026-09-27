> **REJECTED BY OWNER — DO NOT PRINT.** This sculpt does not match the reference. See REJECTED_DO_NOT_PRINT.md.

# A-OK / Apes on Keys - prototype model package

Revision 01 | 26 September 2026 | Blender 4.5.3 LTS

**Status: ready for print-shop fabrication review and owner review of the sculpt.**
Actual printable geometry is included. No order has been placed, no vendor has accepted the design, and physical durability has not been tested.

## Send to the shop

Send the `AOK_Print_Shop_Prototype_R01.zip` archive. It includes the STL, geometry-only 3MF, OBJ/MTL paint-reference model, the specification PDF, actual-model renders, source reference artwork, and QA records. The separate full-source archive includes the editable Blender master and reproducible scripts.

Ask for **one solid, hand-painted resin prototype**, with keyring hardware assembled and delivery included. The shop should propose the specific resin and finish, check the attachment and exposed details, and confirm price, tolerances, and lead time. Approve the rendered sculpt and the quote before ordering. Do not quote molding or a production batch as a requirement for this sample.

## Dimensions and geometry

- Character design datum: **101.6 mm**, soles to cap crown, excluding eyelet and loose hardware. The headphone ribbon is slightly proud of the cap surface.
- Exported total height including integrated eyelet: **109.39 mm**.
- Exported width: **54.14 mm**; depth: **41.72 mm**.
- Nominal eyelet bore: **4.60 mm**. A **4.40 mm clear cylinder** was digitally checked. Require at least 4.0 mm clear after finishing and verify with the chosen connector.
- Construction: one connected solid, flat sole contact pads, no hollow cavity or drain holes. Calculated solid volume **75.13 cm3**; mass in grams is this volume multiplied by the selected resin density in g/cm3, plus paint/hardware. This is a substantial 4-inch bag charm; confirm acceptable weight when quoting.
- Units: **millimeters** in STL and OBJ coordinates; explicit `millimeter` unit in 3MF. Do not apply an inch conversion or automatically scale to fit.
- The geometry is unsupplied with print supports. Shop selects orientation/supports, cleaning, curing, and support cleanup. Do not reduce the eyelet or alter appearance without documenting the change.

## File roles

| File | Purpose |
|---|---|
| `exports/aok_ape_keychain_4in.stl` | Primary, single-solid print geometry; no colors or unit metadata |
| `exports/aok_ape_keychain_4in.3mf` | Same geometry with explicit mm units; **geometry only**, not a full-color printer job |
| `exports/aok_ape_keychain_4in.obj` + `.mtl` | Same connected geometry with approximate material-color regions; keep these files together |
| `AOK_Prototype_Specification_R01.pdf` | Dimensions, views, finishing instructions, hardware, and sample checks |
| `renders/` | Views of the final fused print master, including clay views and illustrative loose hardware |
| `qa/` | Blender checks, independent export re-import checks, and readable limitations |
| `blender/aok_ape_keychain_master.blend` | Editable component sculpt, hidden print master, font sources, cameras, materials, packed image references |

The OBJ color map was transferred from the editable sculpture to the fused mesh. It is a paint guide, not a verified direct full-color production workflow. The PDF and original character reference govern paint intent where transferred color boundaries are coarse. No STEP is supplied: this is a polygonal character sculpt.

## Blender use and reproduction

Open the `.blend` in Blender 4.5 or later. `CHARACTER_EDITABLE` contains the editable components. `PRINT_MASTER/AOK_PRINT_MASTER_MM` is the exact connected export mesh, hidden by default. Hide the editable collection and show the print master to inspect it. `HARDWARE_PREVIEW` is illustrative, hidden by default, and excluded from every print export. `TYPOGRAPHY_EDITABLE_SOURCES` retains text curves; the character has mesh copies of the letters. Editing those source curves uses Arial Black when available; final meshes do not require that font.

From this directory:

```sh
/path/to/Blender --background --python build_aok_keychain.py
/path/to/Blender --background blender/aok_ape_keychain_master.blend --python finalize_aok_keychain.py
python validate_exports.py
python package_handoff.py
```

Use `build_aok_keychain.py -- --preview` to render early front/three-quarter previews. Run the finalizer after rebuilding; the builder alone saves editable geometry. Validation uses Python packages `trimesh`, `numpy`, `scipy`, `lxml`, and `networkx` (see `requirements-qa.txt`); PDF packaging uses `reportlab`. Blender 4.5.3 LTS was downloaded from the official Blender mirror for this build. The runtime is not included in either deliverable ZIP.

## Interpretations and limits

This is a newly constructed, simplified 3D interpretation of the supplied character, not a recovered original production model. Hidden surfaces were inferred. The model preserves the cap, facial expression, headphones, hoodie words, pocketed pose, and sneaker palette, while simplifying fur, fabric grain, shoe detailing, hoodie folds, and small graphics for this prototype. Typography uses a bold approximation rather than supplied vector logo artwork. Eyes, facial contours, clothing folds, and footwear are not an exact match to the reference. Review the actual-model images for likeness before ordering.

The original concept sheet's 100 mm including-eyelet label is superseded by the dimensions above. The original character art remains the appearance reference; the new PDF records this model's measured geometry.

Digital checks establish closed, connected exported geometry and consistent scale. They do not establish strength, paint adhesion, wear life, color accuracy, printer compatibility, or finished-part tolerances. Exact triangle self-intersection testing and a complete local thickness field were not performed. The shop must review local details and attachment loading in its chosen process.
