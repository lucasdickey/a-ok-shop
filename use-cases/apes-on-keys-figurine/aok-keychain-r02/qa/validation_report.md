# Geometry validation report - revision 02

## Result

STL, OBJ, and 3MF were independently re-imported using trimesh after export. Material-seam vertex duplicates are merged by coincident position on re-import before checking topology; no holes are filled and no source files are repaired. All three have matching bounds and triangle counts, are watertight, have consistent winding and positive enclosed volume, have one connected component, and contain no zero-area faces. Blender additionally checked boundary/non-manifold edges and sampled the eyelet bore.

| Check | Evidence / result |
|---|---|
| Vertices (STL re-import) | 505,123 |
| Triangles | 1,010,266 |
| Width / depth / total height | 55.319 / 37.209 / 109.386 mm |
| Character cap datum | 101.6 mm nominal, excluding eyelet; source cap height used for datum compensation |
| Solid volume | 72.459 cm3 |
| Watertight | PASS, all three exports |
| Connected components | 1, all three exports |
| Winding / signed volume | Consistent / positive, all three exports |
| Zero-area faces | 0, all three exports |
| Boundary / non-manifold edges | 0 / 0 in Blender |
| Coordinates finite | PASS, all three exports |
| Cross-format bounds / triangle count | PASS |
| 3MF units | Explicit millimeter, XML read independently |
| Eyelet clearance | 4.60 mm nominal; 32 axial rays around a 4.40 mm clear cylinder passed |
| Eyelet / headphones / shoes connected | Same single connected print component |
| Export object scale | Applied before export; millimeter coordinates written directly |
| Microscopic detached remesh flecks | 14 removed; each under 1 mm bounding diagonal; recorded in Blender JSON |
| Numerical slivers after simplification | 2 dissolved at 0.00001 mm; final zero-area face count is 0 |
| Mesh creation | 0.12 mm voxel union; smoothing; exact sole/bore cuts; dense mesh simplification |

## Visual checks

Final front, rear, sides, top, bottom, three-quarter, attachment close-up, and clay renders are generated from the fused print mesh. Loose ring/chain are shown only in the hardware mockup. Cap and hoodie text are geometric relief. Small surface features and paint boundaries have been simplified. The original art and current sculpt are not identical; likeness remains an owner-review decision.

## Not established by these checks

- Physical strength of the eyelet, brim, headphone band, or printed body.
- Printer/resin-specific minimum-feature compliance across the whole surface.
- A full local wall-thickness field or an exact triangle self-intersection test.
- Finished hole size after paint, process shrinkage, or printer tolerance.
- Fit and articulation of real purchased hardware.
- Exact typography, paint color, paint adhesion, abrasion resistance, or lifetime.

The shop should review these before manufacturing. This is a solid model: do not hollow it without documenting the resulting wall, vent, drain, cleaning, curing, and closure scheme. No physical sample has been made or tested.

Machine-readable evidence and file hashes are in `blender_validation.json` and `independent_export_validation.json`.
