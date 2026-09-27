"""Check the deliverable saved Blender master agrees with the release exports."""
import bpy,json
from pathlib import Path
ROOT=Path(__file__).resolve().parent
q=json.loads((ROOT/'qa/blender_validation.json').read_text());o=bpy.data.objects['AOK_PRINT_MASTER_MM'];vs=[o.matrix_world@v.co for v in o.data.vertices]
mn=[min(v[i] for v in vs) for i in range(3)];mx=[max(v[i] for v in vs) for i in range(3)]
assert len(vs)==q['vertices'] and len(o.data.polygons)==q['triangles']
assert max(abs(mn[i]-q['bounds_min_mm'][i]) for i in range(3))<1e-5
assert max(abs(mx[i]-q['bounds_max_mm'][i]) for i in range(3))<1e-5
assert all(abs(x-1)<1e-6 for x in o.scale)
assert len(bpy.data.collections['PRINT_MASTER'].objects)==1
r={'revision':'R02','saved_blend_matches_export_metrics':True,'vertices':len(vs),'triangles':len(o.data.polygons),'editable_objects':len(bpy.data.collections['CHARACTER_EDITABLE'].objects),'used_print_material_regions':len(set(p.material_index for p in o.data.polygons)),'packed_reference_images':len([im for im in bpy.data.images if im.packed_file]),'cameras':len(bpy.data.collections['CAMERAS'].objects),'character_height_datum_mm':101.6,'bounds_size_mm':[mx[i]-mn[i] for i in range(3)]}
assert r['packed_reference_images']==2
(ROOT/'qa/saved_master_validation.json').write_text(json.dumps(r,indent=2));print(r)
