"""Generate the print shop specification PDF and readable handoff after export QA."""
from pathlib import Path
import json,hashlib,zipfile,textwrap
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor,Color,white
from reportlab.lib.utils import ImageReader
ROOT=Path(__file__).resolve().parent
meta=json.loads((ROOT/'qa/blender_validation.json').read_text())
qa=json.loads((ROOT/'qa/independent_export_validation.json').read_text())
w,d,h=qa['stl']['extents_mm'];vol=qa['stl']['volume_mm3']/1000
README=f'''# A-OK / Apes on Keys - prototype model package

Revision 02 | 26 September 2026 | Blender {meta['blender_version']}

**Status: ready for print-shop fabrication review and owner review of the sculpt.**
Revision 02 supersedes the rejected R01 proportions. See PROPORTION_COMPARISON.md and the visual comparison for measured changes. Actual printable geometry is included. No order has been placed, no vendor has accepted the design, and physical durability has not been tested.

## Send to the shop

Send the `AOK_Print_Shop_Prototype_R02.zip` archive. It includes the STL, geometry-only 3MF, OBJ/MTL paint-reference model, the specification PDF, actual-model renders, source reference artwork, and QA records. The separate full-source archive includes the editable Blender master and reproducible scripts.

Ask for **one solid, hand-painted resin prototype**, with keyring hardware assembled and delivery included. The shop should propose the specific resin and finish, check the attachment and exposed details, and confirm price, tolerances, and lead time. Approve the rendered sculpt and the quote before ordering. Do not quote molding or a production batch as a requirement for this sample.

## Dimensions and geometry

- Character design datum: **101.6 mm**, soles to cap crown, excluding eyelet and loose hardware. The headphone ribbon is slightly proud of the cap surface.
- Exported total height including integrated eyelet: **{h:.2f} mm**.
- Exported width: **{w:.2f} mm**; depth: **{d:.2f} mm**.
- Nominal eyelet bore: **4.60 mm**. A **4.40 mm clear cylinder** was digitally checked. Require at least 4.0 mm clear after finishing and verify with the chosen connector.
- Construction: one connected solid, flat sole contact pads, no hollow cavity or drain holes. Calculated solid volume **{vol:.2f} cm3**; mass in grams is this volume multiplied by the selected resin density in g/cm3, plus paint/hardware. This is a substantial 4-inch bag charm; confirm acceptable weight when quoting.
- Units: **millimeters** in STL and OBJ coordinates; explicit `millimeter` unit in 3MF. Do not apply an inch conversion or automatically scale to fit.
- The geometry is unsupplied with print supports. Shop selects orientation/supports, cleaning, curing, and support cleanup. Do not reduce the eyelet or alter appearance without documenting the change.

## File roles

| File | Purpose |
|---|---|
| `exports/aok_ape_keychain_4in.stl` | Primary, single-solid print geometry; no colors or unit metadata |
| `exports/aok_ape_keychain_4in.3mf` | Same geometry with explicit mm units; **geometry only**, not a full-color printer job |
| `exports/aok_ape_keychain_4in.obj` + `.mtl` | Same connected geometry with approximate material-color regions; keep these files together |
| `AOK_Prototype_Specification_R02.pdf` | Dimensions, views, finishing instructions, hardware, and sample checks |
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
'''
(ROOT/'README.md').write_text(README)
report=f'''# Geometry validation report - revision 02

## Result

STL, OBJ, and 3MF were independently re-imported using trimesh after export. Material-seam vertex duplicates are merged by coincident position on re-import before checking topology; no holes are filled and no source files are repaired. All three have matching bounds and triangle counts, are watertight, have consistent winding and positive enclosed volume, have one connected component, and contain no zero-area faces. Blender additionally checked boundary/non-manifold edges and sampled the eyelet bore.

| Check | Evidence / result |
|---|---|
| Vertices (STL re-import) | {qa['stl']['vertices']:,} |
| Triangles | {qa['stl']['faces']:,} |
| Width / depth / total height | {w:.3f} / {d:.3f} / {h:.3f} mm |
| Character cap datum | 101.6 mm nominal, excluding eyelet; source cap height used for datum compensation |
| Solid volume | {vol:.3f} cm3 |
| Watertight | PASS, all three exports |
| Connected components | 1, all three exports |
| Winding / signed volume | Consistent / positive, all three exports |
| Zero-area faces | 0, all three exports |
| Boundary / non-manifold edges | {meta['boundary_edges']} / {meta['nonmanifold_edges']} in Blender |
| Coordinates finite | PASS, all three exports |
| Cross-format bounds / triangle count | PASS |
| 3MF units | Explicit millimeter, XML read independently |
| Eyelet clearance | 4.60 mm nominal; 32 axial rays around a 4.40 mm clear cylinder passed |
| Eyelet / headphones / shoes connected | Same single connected print component |
| Export object scale | Applied before export; millimeter coordinates written directly |
| Microscopic detached remesh flecks | {len(meta['removed_microscopic_flecks'])} removed; each under 1 mm bounding diagonal; recorded in Blender JSON |
| Numerical slivers after simplification | {meta.get('numeric_slivers_before_cleanup',0)} dissolved at 0.00001 mm; final zero-area face count is 0 |
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
'''
(ROOT/'qa'/'validation_report.md').write_text(report)
(ROOT/'PRINT_SHOP_REQUEST.md').write_text(f'''# Quote request - one A-OK prototype

Please quote one finished, hand-painted resin figurine keychain using the attached revision 02 STL or geometry-only 3MF, specification PDF, and paint references. Printable geometry is supplied; modeling is not a required service unless your fabrication review identifies a necessary revision.

The character cap datum is 101.6 mm excluding the eyelet. Total printed bounds are {w:.2f} x {d:.2f} x {h:.2f} mm (width x depth x height). The model is solid. Please confirm you imported millimeters and did not auto-scale it.

Please separate printing, surface preparation/painting/protective finish, metal hardware, assembly, packing, delivery, and tax. Name your resin/process, proposed finished-part tolerances, approximate finished weight, and lead time. Flag delicate details, support placement, and any geometry changes before printing. Quote a 25-30 mm silver-colored metal split ring with a short chain/jump-ring connection compatible with the finished eyelet; include the hardware specification and assembly. The printed eyelet is resin painted silver, not a supplied metal eye bolt.

Please provide photographs and measurements of the finished sample, check that it stands and hangs acceptably, and agree an appropriate attachment/handling check before manufacture. Protect the brim, headphones, eyelet, and paint for shipment, and provide tracking.

Owner will confirm likeness, quote, destination/address, and authorization to order separately. Quantity is one prototype only. No budget, deadline, shipping address, or purchase authorization is encoded in this package.
''')
# A compact 3-page fabrication sheet.
pdf=ROOT/'AOK_Prototype_Specification_R02.pdf';c=canvas.Canvas(str(pdf),pagesize=(612,792));c.setTitle('A-OK prototype specification - revision 02');c.setAuthor('A-OK prototype project')
INK=HexColor('#171a20');MUTED=HexColor('#5d6470');RED=HexColor('#ce142b');LIGHT=HexColor('#eef0f3')
def para(text,x,y,width=520,size=9.5,leading=13,color=INK):
 c.setFillColor(color);c.setFont('Helvetica',size)
 words=text.split();line=''
 for word in words:
  test=(line+' '+word).strip()
  if c.stringWidth(test,'Helvetica',size)>width:
   c.drawString(x,y,line);y-=leading;line=word
  else:line=test
 if line:c.drawString(x,y,line);y-=leading
 return y

def title(kicker,title,page):
 c.setFillColor(RED);c.rect(30,746,34,4,fill=1,stroke=0)
 c.setFont('Helvetica-Bold',9);c.drawString(30,730,kicker)
 c.setFillColor(INK);c.setFont('Helvetica-Bold',24);c.drawString(30,696,title)
 c.setStrokeColor(LIGHT);c.line(30,677,582,677)
 c.setFont('Helvetica',8);c.setFillColor(MUTED);c.drawString(30,24,'A-OK / APES ON KEYS  |  REV 02  |  26 SEP 2026');c.drawRightString(582,24,f'{page} / 3')
def photo(name,x,y,width,height):
 c.drawImage(ImageReader(str(ROOT/'renders'/f'{name}.png')),x,y,width,height,preserveAspectRatio=True,anchor='c',mask='auto')
def label(text,x,y):
 c.setFillColor(INK);c.setFont('Helvetica-Bold',10);c.drawString(x,y,text)
title('PROTOTYPE FABRICATION REVIEW','A-OK - Apes on Keys',1)
para('ONE PAINTED RESIN SAMPLE  /  MODEL AND QUOTE APPROVAL REQUIRED BEFORE PRINTING',30,656,size=8.5,color=MUTED)
photo('three_quarter',30,218,318,410)
label('MODEL DIMENSIONS',368,617)
y=589
for a,b in [('Character cap datum','101.60 mm / 4.00 in'),('Total with eyelet',f'{h:.2f} mm'),('Width',f'{w:.2f} mm'),('Depth',f'{d:.2f} mm'),('Eyelet bore','4.60 mm nominal'),('Solid volume',f'{vol:.2f} cm3')]:
 c.setFont('Helvetica',8.5);c.setFillColor(MUTED);c.drawString(368,y,a);c.setFont('Helvetica-Bold',12);c.setFillColor(INK);c.drawString(368,y-18,b);y-=50
para('All geometry coordinates are millimeters. Character height is measured from sole to cap crown; the integrated eyelet and loose hardware are excluded. The band is slightly proud of the cap.',368,271,210,9,12)
label('PRINT FILE',30,194)
para('Use the STL or geometry-only 3MF. One connected solid; supports and loose metal hardware are not included. Keep the model at its supplied scale.',30,176,552)
label('PROCESS TO QUOTE',30,133)
para('High-detail resin, surface cleanup, hand painting, protective finish, keyring assembly, protective packing, and shipment. Shop to name resin, confirm local features, choose supports, and quote finished tolerances.',30,115,552)
para('This is a simplified interpretation of the source artwork. Current renders show the modeled result; owner likeness approval and vendor manufacturability acceptance remain outstanding.',30,64,552,8.5,11,MUTED)
c.showPage()
title('ACTUAL FUSED PRINT GEOMETRY','Orthographic model views',2)
for idx,(name,lbl) in enumerate([('front','FRONT'),('rear','REAR'),('left','LEFT'),('right','RIGHT'),('top','TOP'),('bottom','BOTTOM')]):
 row=idx//3;column=idx%3;x=30+column*188;y=431-row*242
 photo(name,x,y,176,215);label(lbl,x,y-16)
para('Views are rendered from the same fused mesh used for the exports. Images are not drawn to scale. Dimensional authority is the millimeter geometry and the recorded bounding measurements on page 1.',30,145,552)
para('Cap / hoodie wording and visible details are relief geometry. Shallow fur, clothing texture, shoe details, and typography are simplified for this 4-inch prototype. Original artwork is included for paint and likeness reference.',30,95,552)
c.showPage()
title('FINISH AND HARDWARE','Prototype shop instructions',3)
label('PAINT TARGETS',30,650)
rows=[('Hoodie / brim','Saturated red; satin finish'),('Cap panels','White front/rear; red side panels'),('Fur / pants','Dark black; subdued sheen'),('Face / muzzle','Warm tan; soft satin'),('Eyes','White / brown / black; gloss'),('Mouth / tongue','Dark brown interior; muted pink'),('Graphics','Black letters, white hoodie outlines'),('Headphones','Black / red / white; match reference'),('Sneakers','Red / white / black'),('Printed eyelet','Silver paint over resin')]
y=626
for i,(a,b) in enumerate(rows):
 if i%2==0:c.setFillColor(LIGHT);c.rect(30,y-16,350,26,fill=1,stroke=0)
 c.setFillColor(INK);c.setFont('Helvetica-Bold',8.5);c.drawString(36,y-5,a);c.setFont('Helvetica',8.4);c.drawString(153,y-5,b);y-=26
photo('eyelet_detail',400,477,178,178);label('INTEGRATED RESIN EYELET',400,467)
photo('keyring_mockup',417,251,145,201);label('LOOSE HARDWARE EXAMPLE',400,240)
label('ATTACHMENT',30,337)
y=para('Printed ring: nominal 10.2 mm outside diameter, 2.8 mm round section, 4.6 mm bore. Reinforced into the cap. Verify >=4.0 mm clear after paint. Silver appearance does not mean a metal eye bolt.',30,319,350,9,12)
para('Quote a 25-30 mm metal split ring and short chain/jump-ring connection. Specify material and dimensions; check fit, articulation, closure, and hanging direction. Hardware preview is illustrative.',30,y-7,350,9,12)
label('BEFORE SHIPMENT',30,217)
y=para('1. Confirm final dimensions, finished weight, full cure, and cleanup. 2. Check legible graphics, paint coverage, cracks, support scars, and clean eyelet clearance. 3. Assemble hardware and check standing/hanging behavior. 4. Agree and record an appropriate attachment/handling check. 5. Send photos, protect vulnerable features, and provide tracking.',30,199,552,9.5,13)
label('DIGITAL QA / PHYSICAL LIMIT',30,112)
para(f'Closed mesh, one connected component, consistent winding, positive volume; {qa["stl"]["faces"]:,} triangles. STL, OBJ, and 3MF re-import checks passed. Physical durability, paint adhesion, process-specific minimum features, and finished tolerances are not established by these mesh checks.',30,94,552,9,12)
c.save()
print(pdf)
