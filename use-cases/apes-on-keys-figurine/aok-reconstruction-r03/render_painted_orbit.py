"""Use the verified clay camera animation with the current approved-form paint study."""
import bpy,numpy as np,hashlib,json,sys
from pathlib import Path
r=Path(__file__).resolve().parent
bpy.ops.wm.open_mainfile(filepath=str(r/'outputs/R03_clay_globular_animation.blend'))
s=bpy.context.scene;clay=bpy.data.objects['R03_EXPERIMENTAL_LIKENESS_NOT_PRINT_APPROVED'];clay.hide_render=True;clay.hide_set(True)
with bpy.data.libraries.load(str(r/'outputs/R03_face_paint_v2.blend'),link=False) as (src,dst):
 dst.objects=[n for n in src.objects if n=='R03_APPROVED_FORM_PAINT_PREVIEW' or n.startswith(('Hoodie outline ','Hoodie ink ','Cap ink '))]
for ob in dst.objects:
 if ob is not None:
  s.collection.objects.link(ob);ob.hide_render=False;ob.hide_set(False)
o=bpy.data.objects['R03_APPROVED_FORM_PAINT_PREVIEW'];a=np.empty(len(o.data.vertices)*3,dtype=np.float32);o.data.vertices.foreach_get('co',a)
h=hashlib.sha256(a.tobytes()).hexdigest();expected=json.loads((r/'outputs/ORBIT_STATUS.json').read_text())['vertex_sha256'];assert h==expected
s.camera=bpy.data.objects['GLOBULAR_CAMERA'];s.render.filepath=str(r/'outputs/AOK_R03_Painted_Globular_Orbit.mp4');s.frame_start=1;s.frame_end=720;s.frame_set(1)
p=bpy.context.preferences.addons['cycles'].preferences;p.compute_device_type='METAL';p.get_devices()
for d in p.devices:d.use=(d.type=='METAL')
s.cycles.device='GPU'
bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.context.view_layer.objects.active=o
s['Appearance']='Current R03 paint with refined face shader. Work-in-progress digital figure.'
s['Camera provenance']='Exact camera and lighting animation from the verified 30-second clay orbit.'
bpy.ops.wm.save_as_mainfile(filepath=str(r/'outputs/R03_painted_globular_animation.blend'))
(r/'outputs/PAINTED_ORBIT_STATUS.json').write_text(json.dumps({'base_geometry_changed':False,'vertex_sha256':h,'fps':24,'frames':720,'duration_seconds':30,'resolution':[900,900],'paint_source':'R03_face_paint_v2.blend','camera_source':'R03_clay_globular_animation.blend','comparison':'Identical camera, lighting, timing and base mesh; appearance changes only','status':'Work-in-progress digital render'},indent=2))
if '--setup-only' in sys.argv:sys.exit(0)
if '--storyboard' in sys.argv:
 s.render.image_settings.file_format='PNG';s.render.resolution_percentage=80
 for label,frame in [('front',1),('right',61),('back',121),('left',181),('above',361),('below',601)]:
  s.frame_set(frame);s.render.filepath=str(r/'renders'/('painted_orbit_'+label+'.png'));bpy.ops.render.render(write_still=True)
 print('PAINTED_ORBIT_STORYBOARD_COMPLETE',flush=True)
else:
 bpy.ops.render.render(animation=True)
 print('PAINTED_ORBIT_COMPLETE',flush=True)
