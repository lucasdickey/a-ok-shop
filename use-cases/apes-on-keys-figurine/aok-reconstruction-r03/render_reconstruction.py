"""Render the actual reconstructed geometry without color textures for likeness review."""
import bpy,json,math
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parent
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=str(ROOT/'outputs/reference_conditioned_raw.glb'))
objects=[o for o in bpy.context.scene.objects if o.type=='MESH']
bpy.ops.object.select_all(action='DESELECT')
for o in objects:o.select_set(True)
bpy.context.view_layer.objects.active=objects[0];bpy.ops.object.join();o=bpy.context.object;o.name='R03_EXPERIMENTAL_LIKENESS_NOT_PRINT_APPROVED'
bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
vs=o.data.vertices;mn=Vector(tuple(min(v.co[i] for v in vs) for i in range(3)));mx=Vector(tuple(max(v.co[i] for v in vs) for i in range(3)))
print('RAW_BOUNDS',list(mn),list(mx),flush=True)
scale=101.6/(mx.z-mn.z);center=(mn+mx)/2
for v in vs:v.co=Vector(((v.co.x-center.x)*scale,(v.co.y-center.y)*scale,(v.co.z-mn.z)*scale))
# Preserve the raw inference separately; remove only the obvious bridge between the feet.
raw=o.copy();raw.data=o.data.copy();bpy.context.scene.collection.objects.link(raw);raw.name='RAW_INFERENCE_BEFORE_FOOT_GAP_REPAIR';raw.hide_render=True;raw.hide_set(True)
# The reconstructed jacket span is about 6% wider than the primary image estimate.
# Apply a smooth localized width correction; preserve head, pants, and footwear.
for v in o.data.vertices:
 z=v.co.z
 if 27<z<64:
  t=min(1.0,(z-27)/7.0,(64-z)/7.0);t=t*t*(3-2*t);v.co.x*=1-.057*t
bpy.ops.mesh.primitive_uv_sphere_add(segments=96,ring_count=64,location=(0,0,0));cut=bpy.context.object;cut.name='FOOT_GAP_REPAIR_TOOL';cut.scale=(3.8,50,21);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
bpy.context.view_layer.objects.active=o;mod=o.modifiers.new('Remove generated web between feet','BOOLEAN');mod.operation='DIFFERENCE';mod.solver='EXACT';mod.object=cut;bpy.ops.object.modifier_apply(modifier=mod.name);bpy.data.objects.remove(cut,do_unlink=True)
for p in o.data.polygons:p.use_smooth=True
mat=bpy.data.materials.new('NEUTRAL_CLAY_NO_TEXTURE');mat.diffuse_color=(.32,.35,.38,1);mat.use_nodes=True;p=mat.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(.32,.35,.38,1);p.inputs['Roughness'].default_value=.8
o.data.materials.clear();o.data.materials.append(mat)
scene=bpy.context.scene;scene.unit_settings.system='METRIC';scene.unit_settings.scale_length=.001;scene.unit_settings.length_unit='MILLIMETERS';scene.render.engine='CYCLES';scene.cycles.samples=32;scene.cycles.use_denoising=True
scene.render.resolution_x=1100;scene.render.resolution_y=1300;scene.render.resolution_percentage=100
scene.view_settings.view_transform='AgX';scene.view_settings.look='AgX - Medium High Contrast'
scene.world.use_nodes=True;bg=scene.world.node_tree.nodes['Background'];bg.inputs[0].default_value=(.7,.73,.77,1);bg.inputs[1].default_value=.35
floor=bpy.data.materials.new('Floor');floor.diffuse_color=(.52,.54,.56,1)
bpy.ops.mesh.primitive_plane_add(size=2000,location=(0,0,-.05));bpy.context.object.data.materials.append(floor)
def area(name,loc,energy,size):
 d=bpy.data.lights.new(name,'AREA');d.energy=energy;d.shape='DISK';d.size=size;a=bpy.data.objects.new(name,d);scene.collection.objects.link(a);a.location=loc;a.rotation_euler=(Vector((0,0,52))-a.location).to_track_quat('-Z','Y').to_euler()
area('KEY',(-80,-100,155),260000,75);area('FILL',(80,-80,90),90000,100);area('RIM',(30,70,150),280000,70)
def cam(name,loc,target=(0,0,51),ortho=117):
 d=bpy.data.cameras.new(name);d.type='ORTHO';d.ortho_scale=ortho;d.clip_end=3000;a=bpy.data.objects.new(name,d);scene.collection.objects.link(a);a.location=loc;a.rotation_euler=(Vector(target)-a.location).to_track_quat('-Z','Y').to_euler();return a
cameras={'front':cam('Front',(0,-250,51)),'three_quarter':cam('Three-quarter',(100,-260,105)),'rear':cam('Rear',(0,250,51)),'side':cam('Side',(250,0,51)),'face_detail':cam('Face',(0,-250,84),(0,0,82),45)}
scene.camera=cameras['front'];bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'outputs/R03_experimental_reconstruction.blend'))
for name,c in cameras.items():
 scene.camera=c;scene.render.filepath=str(ROOT/'renders'/f'clay_{name}.png');bpy.ops.render.render(write_still=True)
print('CLAY_REVIEW_RENDERS_COMPLETE',flush=True)
