"""Create a fused print master, millimeter STL/OBJ/3MF, and actual-model renders.
Run against the saved editable .blend with Blender --background <file> --python <this>.
"""
import bpy,bmesh,sys,math,json,struct,zipfile
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree
ROOT=Path(__file__).resolve().parent
scene=bpy.context.scene
col=bpy.data.collections['CHARACTER_EDITABLE'];out=bpy.data.collections['PRINT_MASTER']
for stale in list(out.objects):bpy.data.objects.remove(stale,do_unlink=True)
col.hide_render=False
# Duplicate evaluated geometry so original sculpt and font sources remain editable.
bpy.ops.object.select_all(action='DESELECT')
deps=bpy.context.evaluated_depsgraph_get();copies=[]
for src in list(col.objects):
 if src.type not in {'MESH','CURVE','FONT'}:continue
 ev=src.evaluated_get(deps);me=bpy.data.meshes.new_from_object(ev,depsgraph=deps)
 ob=bpy.data.objects.new(src.name+'_PRINT',me);out.objects.link(ob);ob.matrix_world=src.matrix_world.copy();copies.append(ob)
for ob in copies:ob.select_set(True)
bpy.context.view_layer.objects.active=copies[0];bpy.ops.object.join();master=bpy.context.object;master.name='AOK_PRINT_MASTER_MM'
bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
# Fix each source shell's winding prior to volumetric union.
bm=bmesh.new();bm.from_mesh(master.data);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(master.data);bm.free()
print('UNION_SOURCE',len(master.data.vertices),len(master.data.polygons),flush=True)
# Preserve the source surface/material map independently of voxel remesh.
source_bvh=BVHTree.FromPolygons([v.co.copy() for v in master.data.vertices],[tuple(p.vertices) for p in master.data.polygons])
source_materials=[p.material_index for p in master.data.polygons]
# Voxel union creates one solid; surface colors are transferred below.
mod=master.modifiers.new('Manufacturing union 0.12mm','REMESH');mod.mode='VOXEL';mod.voxel_size=.12;mod.use_smooth_shade=True
bpy.ops.object.modifier_apply(modifier=mod.name)
print('UNION_DONE',len(master.data.vertices),len(master.data.polygons),flush=True)
sm=master.modifiers.new('Blend intersecting sculpt surfaces','SMOOTH');sm.factor=.7;sm.iterations=3;bpy.ops.object.modifier_apply(modifier=sm.name)
# Millimeter XY sole datum, cut true planar support pads.
def cut_boolean(cutter,name):
 bpy.context.view_layer.objects.active=master
 mod=master.modifiers.new(name,'BOOLEAN');mod.operation='DIFFERENCE';mod.solver='EXACT';mod.object=cutter
 bpy.ops.object.modifier_apply(modifier=mod.name);bpy.data.objects.remove(cutter,do_unlink=True)
bpy.ops.mesh.primitive_cube_add(size=1,location=(0,0,-24.95));c=bpy.context.object;c.scale=(100,100,50);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);cut_boolean(c,'Planar soles at Z 0.05mm')
# The cap surface datum is 101.6mm; compensate global voxel shrink/sole leveling.
# Geometry here excludes loose hardware. Only the attachment extends beyond the cap.
# Scale from actual planar sole to measured cap-top source datum, before final hole cut.
sole=min(v.co.z for v in master.data.vertices)
cap_source=bpy.data.objects['CAP_CROWN']
cap_eval=cap_source.evaluated_get(bpy.context.evaluated_depsgraph_get());capmesh=cap_eval.to_mesh()
cap_top=max((cap_eval.matrix_world@v.co).z for v in capmesh.vertices);cap_eval.to_mesh_clear()
scale=101.6/(cap_top-sole)
for v in master.data.vertices:v.co=Vector((v.co.x*scale,v.co.y*scale,(v.co.z-sole)*scale))
# Eyelet clearance: drilled through after voxel union, guaranteed circular in CAD.
eyecenter=Vector((0,1.8*scale,(104.3-sole)*scale))
bpy.ops.mesh.primitive_cylinder_add(vertices=128,radius=2.3,depth=22,location=eyecenter,rotation=(math.pi/2,0,0));cut_boolean(bpy.context.object,'Eyelet clear bore 4.60mm')
# Remove only unconnected microscopic remesh flecks, if any; retain evidence.
bm=bmesh.new();bm.from_mesh(master.data);bm.verts.ensure_lookup_table();seen=set();components=[]
for v in bm.verts:
 if v.index in seen:continue
 stack=[v];seen.add(v.index);group=[]
 while stack:
  q=stack.pop();group.append(q)
  for e in q.link_edges:
   t=e.other_vert(q)
   if t.index not in seen:seen.add(t.index);stack.append(t)
 components.append(group)
components.sort(key=len,reverse=True)
print('COMPONENT_SIZES',[len(x) for x in components],flush=True)
removed=[]
for group in components[1:]:
 mn=Vector(tuple(min(v.co[i] for v in group) for i in range(3)));mx=Vector(tuple(max(v.co[i] for v in group) for i in range(3)))
 removed.append({'vertices':len(group),'min':list(mn),'max':list(mx)})
 # Never silently discard a meaningful component.
 if (mx-mn).length>1.0:
  (ROOT/'qa'/'disconnected_components.json').write_text(json.dumps(removed,indent=2));raise RuntimeError('Disconnected substantial component; repair source before export')
 bmesh.ops.delete(bm,geom=group,context='VERTS')
bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(master.data);bm.free()
# Reduce oversampling on smooth surfaces while keeping a dense sculpt mesh.
bpy.context.view_layer.objects.active=master
dec=master.modifiers.new('Print mesh simplification','DECIMATE');dec.ratio=.32;dec.use_collapse_triangulate=True;bpy.ops.object.modifier_apply(modifier=dec.name)
# Triangulate once for identical geometry in all exchange files.
tri=master.modifiers.new('Export triangulation','TRIANGULATE');bpy.context.view_layer.objects.active=master;bpy.ops.object.modifier_apply(modifier=tri.name)
master.data.update()
for p in master.data.polygons:
 q=p.center.copy()/scale;q.z+=sole
 hit=source_bvh.find_nearest(q)
 if hit[2] is not None:p.material_index=source_materials[hit[2]]
# Keep the headphone ribbon's paint region continuous where it is embedded in cap.
black_index=next(i for i,m in enumerate(master.data.materials) if m and m.name=='MAT_BLACK')
for p in master.data.polygons:
 q=p.center.copy()/scale;q.z+=sole
 if 4.5<abs(q.x)<23.5 and 0<=q.y<=3.6 and q.z>=87.3:p.material_index=black_index
del source_bvh,source_materials
print('MATERIAL_TRANSFER_DONE',flush=True)
vs=[v.co.copy() for v in master.data.vertices];faces=[tuple(p.vertices) for p in master.data.polygons]
bm=bmesh.new();bm.from_mesh(master.data)
boundary=sum(e.is_boundary for e in bm.edges);nonmanifold=sum(not e.is_manifold for e in bm.edges);degenerate=sum(f.calc_area()<1e-10 for f in bm.faces);volume=bm.calc_volume(signed=True);bm.free()
if boundary or nonmanifold or degenerate or volume<=0:raise RuntimeError(f'Invalid mesh: boundary {boundary} nonmanifold {nonmanifold} degenerate {degenerate} volume {volume}')
# Eyelet rays sample full bore to ensure no mesh blocks the designed opening.
bvh=BVHTree.FromPolygons(vs,faces,all_triangles=True)
clear=True
for i in range(32):
 t=2*math.pi*i/32;p=Vector((eyecenter.x+2.2*math.cos(t),-20,eyecenter.z+2.2*math.sin(t)))
 if bvh.ray_cast(p,Vector((0,1,0)),45)[0] is not None:clear=False
if not clear:raise RuntimeError('Eyelet clearance ray failed')
mn=[min(v[i] for v in vs) for i in range(3)];mx=[max(v[i] for v in vs) for i in range(3)]
meta={'blender_version':bpy.app.version_string,'units':'millimeter','character_height_datum_mm':101.6,'height_definition':'sole to cap crown, excludes integrated eyelet and loose metal hardware','bounds_min_mm':mn,'bounds_max_mm':mx,'bounds_size_mm':[mx[i]-mn[i] for i in range(3)],'vertices':len(vs),'triangles':len(faces),'boundary_edges':boundary,'nonmanifold_edges':nonmanifold,'degenerate_faces':degenerate,'signed_volume_mm3':volume,'connected_components':1,'eyelet_design_bore_mm':4.6,'eyelet_verified_clear_cylinder_mm':4.4,'eyelet_center_mm':list(eyecenter),'voxel_resolution_mm':.12,'removed_microscopic_flecks':removed,'solid_construction':True,'physical_tests':'not performed','self_intersection_exact_test':'not performed; voxel union followed by exact bore/sole booleans','scale_compensation':scale}
(ROOT/'qa'/'blender_validation.json').write_text(json.dumps(meta,indent=2))
# STL contains plain millimeter coordinates, as requested by print services.
stl=ROOT/'exports'/'aok_ape_keychain_4in.stl'
with stl.open('wb') as f:
 f.write(b'AOK 101.6mm character; MILLIMETERS; integrated eyelet; no hardware'.ljust(80,b' '));f.write(struct.pack('<I',len(faces)))
 for poly in master.data.polygons:
  data=list(poly.normal)
  for idx in poly.vertices:data.extend(vs[idx])
  f.write(struct.pack('<12fH',*data,0))
# Single-solid OBJ + MTL. Face colors transferred from nearest source surface.
materials=list(master.data.materials)
mtl=ROOT/'exports'/'aok_ape_keychain_4in.mtl'
with mtl.open('w') as f:
 for i,m in enumerate(materials):
  c=m.diffuse_color[:3] if m else (.5,.5,.5)
  f.write(f'newmtl material_{i}\nKd {c[0]:.6f} {c[1]:.6f} {c[2]:.6f}\nd 1.0\nillum 2\n\n')
with (ROOT/'exports'/'aok_ape_keychain_4in.obj').open('w') as f:
 f.write('# AOK connected print master; coordinates in millimeters\nmtllib aok_ape_keychain_4in.mtl\no AOK_PRINT_MASTER_MM\n')
 for v in vs:f.write(f'v {v.x:.6f} {v.y:.6f} {v.z:.6f}\n')
 current=None
 for p in master.data.polygons:
  if p.material_index!=current:current=p.material_index;f.write(f'usemtl material_{current}\n')
  f.write('f '+' '.join(str(i+1) for i in p.vertices)+'\n')
# Core-spec 3MF geometry container. Explicit units; geometry-only by design for painted resin.
head='<?xml version="1.0" encoding="UTF-8"?><model unit="millimeter" xml:lang="en-US" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02"><metadata name="Title">AOK 101.6 mm figurine keychain</metadata><resources><object id="1" type="model"><mesh><vertices>'
body=''.join(f'<vertex x="{v.x:.6f}" y="{v.y:.6f}" z="{v.z:.6f}"/>' for v in vs)+'</vertices><triangles>'+''.join(f'<triangle v1="{a}" v2="{b}" v3="{c}"/>' for a,b,c in faces)+'</triangles></mesh></object></resources><build><item objectid="1"/></build></model>'
with zipfile.ZipFile(ROOT/'exports'/'aok_ape_keychain_4in.3mf','w',zipfile.ZIP_DEFLATED) as z:
 z.writestr('[Content_Types].xml','<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml"/></Types>')
 z.writestr('_rels/.rels','<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Target="/3D/3dmodel.model" Id="rel0" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel"/></Relationships>')
 z.writestr('3D/3dmodel.model',head+body)
# Save master with connected mesh hidden by default; editable color scene remains visible.
master.hide_render=True;master.hide_set(True)
scene.camera=bpy.data.objects['CAM_HERO']
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'blender'/'aok_ape_keychain_master.blend'))
print('EXPORT_COMPLETE',meta,flush=True)
# Print clay renders expose exact exported surface; color views show finish intent.
col.hide_render=True;master.hide_render=False;master.hide_set(False)
scene.cycles.samples=40;scene.render.resolution_x=1200;scene.render.resolution_y=1320
cams={'front':'CAM_FRONT','rear':'CAM_REAR','left':'CAM_LEFT','right':'CAM_RIGHT','three_quarter':'CAM_HERO','top':'CAM_TOP','bottom':'CAM_BOTTOM','eyelet_detail':'CAM_EYELET','keyring_mockup':'CAM_HARDWARE'}
for name,cam in cams.items():
 scene.camera=bpy.data.objects[cam];scene.render.filepath=str(ROOT/'renders'/f'{name}.png')
 bpy.data.collections['STUDIO'].hide_render=name=='bottom'
 bpy.data.collections['HARDWARE_PREVIEW'].hide_render=name!='keyring_mockup'
 bpy.ops.render.render(write_still=True)
bpy.data.collections['HARDWARE_PREVIEW'].hide_render=True;bpy.data.collections['STUDIO'].hide_render=False
col.hide_render=True;master.hide_render=False;master.hide_set(False)
clay=bpy.data.materials.get('MAT_CLAY') or bpy.data.materials.new('MAT_CLAY');clay.diffuse_color=(.42,.45,.48,1);clay.use_fake_user=True
scene.view_layers[0].material_override=clay
for name,cam in [('clay_front','CAM_FRONT'),('clay_three_quarter','CAM_HERO')]:
 scene.camera=bpy.data.objects[cam];scene.render.filepath=str(ROOT/'renders'/f'{name}.png');bpy.ops.render.render(write_still=True)
scene.view_layers[0].material_override=None;col.hide_render=False;master.hide_render=True;master.hide_set(True);scene.camera=bpy.data.objects['CAM_HERO']
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'blender'/'aok_ape_keychain_master.blend'))
print('FINALIZE_COMPLETE',flush=True)
