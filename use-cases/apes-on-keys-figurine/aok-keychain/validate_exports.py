"""Independent re-import checks. Requires trimesh, numpy, scipy.
Usage: python validate_exports.py
"""
from pathlib import Path
import json,zipfile,xml.etree.ElementTree as ET,hashlib
import numpy as np
import trimesh
ROOT=Path(__file__).resolve().parent
checks={}
for ext in ['stl','obj','3mf']:
 p=ROOT/'exports'/('aok_ape_keychain_4in.'+ext)
 obj=trimesh.load(p,force='mesh',process=True)
 obj.merge_vertices(merge_tex=True,merge_norm=True);obj.remove_unreferenced_vertices()
 checks[ext]={'size_bytes':p.stat().st_size,'vertices':len(obj.vertices),'faces':len(obj.faces),'bounds_mm':obj.bounds.tolist(),'extents_mm':obj.extents.tolist(),'watertight':bool(obj.is_watertight),'winding_consistent':bool(obj.is_winding_consistent),'positive_volume':bool(obj.volume>0),'volume_mm3':float(obj.volume),'connected_components':len(trimesh.graph.connected_components(obj.face_adjacency,min_len=1,nodes=np.arange(len(obj.faces)))),'zero_area_faces':int(np.sum(obj.area_faces<1e-10)),'finite_coordinates':bool(np.isfinite(obj.vertices).all()),'sha256':hashlib.sha256(p.read_bytes()).hexdigest()}
 print(ext,json.dumps(checks[ext]),flush=True)
 assert obj.is_watertight and obj.is_winding_consistent and obj.volume>0
 assert checks[ext]['connected_components']==1
 assert checks[ext]['zero_area_faces']==0
 if ext=='stl':reference=obj
 else:
  assert np.allclose(reference.bounds,obj.bounds,atol=.0001)
  assert abs(reference.volume-obj.volume)/reference.volume<.00001
  assert len(reference.faces)==len(obj.faces)
with zipfile.ZipFile(ROOT/'exports'/'aok_ape_keychain_4in.3mf') as z:
 assert z.testzip() is None
 model=ET.fromstring(z.read('3D/3dmodel.model'));assert model.attrib['unit']=='millimeter'
checks['cross_format_geometry_match']=True
checks['three_mf_explicit_millimeter_units']=True
(ROOT/'qa'/'independent_export_validation.json').write_text(json.dumps(checks,indent=2))
print(json.dumps(checks,indent=2))
