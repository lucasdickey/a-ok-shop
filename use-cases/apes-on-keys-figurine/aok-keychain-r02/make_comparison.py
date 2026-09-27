from pathlib import Path
import json,shutil
ROOT=Path(__file__).resolve().parent
(ROOT/'comparison').mkdir(exist_ok=True)
if not (ROOT/'comparison/rejected_r01_front.png').exists():
 shutil.copy2(ROOT.parent/'aok-keychain/renders/front.png',ROOT/'comparison/rejected_r01_front.png')
a=json.loads((ROOT/'qa/proportions_r01.json').read_text());b=json.loads((ROOT/'qa/proportions_r02.json').read_text())
rows=[]
for label,key,target in [('Headphone span','headphones','about 41'),('Fur head width','fur_head','about 33'),('Cap / brim width','cap','about 33'),('Jacket span','jacket','about 55'),('Waistband width','waist','about 38'),('Shoe pair span','shoes','about 43–47'),('Muzzle width','muzzle','about 14')]:
 rows.append((label,target,a[key]['size_mm'][0],b[key]['size_mm'][0]))
rows.append(('APES center above soles','about 54',sum(a['apes_text'][k][2] for k in ['min_mm','max_mm'])/2,sum(b['apes_text'][k][2] for k in ['min_mm','max_mm'])/2))
md='''# R02 proportion correction

R01 is superseded. The 101.6 mm sole-to-cap datum stays the same. This revision corrects relative sizes and positions rather than scaling the rejected model as a whole.

The large original character view controls appearance. The concept specification sheet remains a secondary reference for the keychain presentation; its labeled dimensions do not override the approved height definition. Both references are supplied unmodified.

## Comparison in millimeters

| Feature | Estimate from source art | Rejected R01 | Revised R02 |
|---|---:|---:|---:|
'''
for label,target,old,new in rows:md+=f'| {label} | {target} | {old:.1f} | {new:.1f} |\n'
md+='''
## Measurement method and limits

Reference estimates use the large character in the 1024 x 1536 artwork, with approximately y=110 at the cap crown and y=1445 at the soles. The 1335-pixel span is normalized to 101.6 mm. Jacket span is approximately 720 pixels, headphone span approximately 540 pixels, and cap width approximately 435 pixels. Footwear is perspective-dependent; about 43–47 mm is an interpretation range, not an artist-specified tolerance. These are approximate image measurements. The source is a perspective illustration, not an orthographic engineering drawing.

Model measurements come from evaluated Blender component bounds before voxel fusion; final overall print bounds are separately recorded in the specification and export QA. Tiny changes from fusion, smoothing, and sole-datum compensation are expected. The HTML aligns source and both orthographic model views at the same cap-to-sole height; the artwork's perspective still differs. No source art was reshaped to match the model.

Additional corrections: reduced eye size and spacing, shorter muzzle, higher graphic, flatter folded hood front, straighter loose trousers, larger sneaker soles, projected tongues/laces, and cuffs seated closer to the pockets. The hero camera is less oblique than R01. Fur, fabric folds, footwear panels, and typography remain a simplified sculpt interpretation; the numerical comparison does not establish an exact likeness.

Open PROPORTION_COMPARISON.html for the aligned visual comparison. Render images show the actual fused model, not generated concept art. R02 supersedes R01 for any future quotation; do not print R01.
'''
(ROOT/'PROPORTION_COMPARISON.md').write_text(md)
tr=''.join(f'<tr><th>{label}</th><td>{target}</td><td>{old:.1f}</td><td>{new:.1f}</td></tr>' for label,target,old,new in rows)
html='''<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>A-OK • R02 proportion comparison</title><style>
*{box-sizing:border-box}body{margin:0;background:#eceef1;color:#182029;font-family:system-ui,sans-serif}main{max-width:1080px;margin:32px auto;padding:0 24px}h1{font-size:32px;margin-bottom:10px}p{line-height:1.55;max-width:900px;color:#455363}.eyebrow{font-weight:800;letter-spacing:.14em;color:#c91831;font-size:12px}.grid{display:flex;gap:18px;justify-content:center;flex-wrap:wrap;margin:28px 0}.card{width:312px;border:1px solid #d3d8df;border-radius:12px;overflow:hidden;background:white}.card h2{font-size:16px;padding:16px;margin:0}.stage{height:570px;width:310px;position:relative;overflow:hidden;background:#a2a2a2}.stage img{position:absolute;max-width:none}.stage.source{background:#000}.source img{width:383.52px;left:8.93px;top:3.8px;clip-path:polygon(0 0,74% 0,74% 67%,63% 67%,63% 100%,0 100%)}.model img{width:541.34px;left:-115.67px;top:-13.55px}.guide{position:absolute;left:0;right:0;border-top:1px dashed #ffc46f;pointer-events:none}.top{top:45px}.sole{top:545px}.caption{padding:14px;font-size:12px;line-height:1.5;color:#52606d;min-height:77px}table{border-collapse:collapse;width:100%;background:white;border-radius:12px;overflow:hidden;font-size:14px}td,th{text-align:left;padding:13px 16px;border-bottom:1px solid #e5e9ef}thead{background:#202a35;color:white}tbody td:last-child{font-weight:800;color:#ac1327}tbody th{font-weight:600}.note{font-size:13px}.detail{background:white;border-radius:12px;padding:18px;margin:26px 0}.detail img{max-width:100%;height:auto}a{color:#a91830}summary{cursor:pointer;font-weight:700}
</style><main><div class="eyebrow">A-OK / APES ON KEYS • REVISION 02</div><h1>Corrected proportions, same 4-inch height.</h1><p>The first model made the head and headphones too wide, the shoes too small, and the chest graphic too low. R02 rebuilds those relationships using the original character as the primary appearance reference.</p><div class="grid">
<section class="card"><h2>Original character</h2><div class="stage source"><img src="references/01_original_character_reference.png" alt="Original supplied character, main figure cropped for comparison"><i class="guide top"></i><i class="guide sole"></i></div><div class="caption">Primary appearance reference. Main figure cropped for this comparison; original file is unchanged.</div></section>
<section class="card"><h2>R01 • rejected</h2><div class="stage model"><img src="comparison/rejected_r01_front.png" alt="Rejected R01 orthographic render"><i class="guide top"></i><i class="guide sole"></i></div><div class="caption">Headphones wider than jacket. Narrow shoes and low lettering.</div></section>
<section class="card"><h2>R02 • revised</h2><div class="stage model"><img src="renders/front.png" alt="R02 orthographic render of actual fused print mesh"><i class="guide top"></i><i class="guide sole"></i></div><div class="caption">Smaller head, broader jacket, larger shoes, and higher lettering. Actual fused print mesh.</div></section></div>
<p class="note">Dashed lines align the nominal cap crown and sole datums. All three character heights are normalized to 101.6 mm; eyelets are excluded. Source perspective differs from the orthographic renders, so this is a proportion comparison, not a pixel-perfect overlay.</p>
<table><thead><tr><th>Feature</th><th>Art estimate (mm)</th><th>R01 (mm)</th><th>R02 (mm)</th></tr></thead><tbody>'''+tr+'''</tbody></table><p class="note">Art measurements are estimates from a perspective illustration, not manufacturing dimensions. Model values are measured evaluated component bounds before fusion. See <a href="PROPORTION_COMPARISON.md">measurement notes</a> and the specification for final print bounds.</p>
<details class="detail"><summary>Revised three-quarter render</summary><img src="renders/three_quarter.png" alt="Actual R02 model three-quarter render"></details><details class="detail"><summary>Secondary concept specification sheet</summary><p>This sheet informs keychain presentation. Its 100 mm including-eyelet label is superseded by the 101.6 mm sole-to-cap datum. It is not a measured drawing.</p><img src="references/02_concept_spec_sheet_NOT_DIMENSION_AUTHORITY.png" alt="Supplied concept specification sheet"></details><p>R02 supersedes R01. Fine fur, fabric, shoes, and typography remain simplified; final likeness and the shop's process review remain separate from mesh validity.</p></main></html>'''
(ROOT/'PROPORTION_COMPARISON.html').write_text(html)
