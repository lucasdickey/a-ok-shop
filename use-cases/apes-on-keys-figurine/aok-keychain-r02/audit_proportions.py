"""Measure evaluated editable component geometry in millimeters, no render inference."""
import bpy,json,sys
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parent
col=bpy.data.collections['CHARACTER_EDITABLE'];dg=bpy.context.evaluated_depsgraph_get()
def bounds(prefixes):
 vs=[]
 for o in col.objects:
  if not any(o.name.startswith(p) for p in prefixes):continue
  e=o.evaluated_get(dg);me=e.to_mesh();vs.extend([e.matrix_world@v.co for v in me.vertices]);e.to_mesh_clear()
 mn=[min(v[i] for v in vs) for i in range(3)];mx=[max(v[i] for v in vs) for i in range(3)]
 return {'min_mm':mn,'max_mm':mx,'size_mm':[mx[i]-mn[i] for i in range(3)]}
groups={'headphones':['HEADPHONE_'],'fur_head':['APE_FUR_HEAD'],'cap':['CAP_CROWN','CAP_BRIM'],'jacket':['HOODIE_BODY','SLEEVE_UPPER','SLEEVE_FOREARM'],'shoes':['SHOE_'],'waist':['HOODIE_WAISTBAND'],'muzzle':['APE_MUZZLE'],'eye_pair':['EYE_WHITE'],'apes_text':['HOODIE_TEXT_APES_RELIEF']}
result={k:bounds(v) for k,v in groups.items()};result['units']='mm';result['method']='Bounds of evaluated editable components, prior to voxel fusion. Reference estimates are not CAD dimensions.'
name='proportions_r01.json' if '--r01' in sys.argv else 'proportions_r02.json'
(ROOT/'qa'/name).write_text(json.dumps(result,indent=2));print(json.dumps(result))
