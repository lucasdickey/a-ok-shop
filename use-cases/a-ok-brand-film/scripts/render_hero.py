"""New transparent hero cinematography; preserve approved R03 geometry and paint."""
import bpy, math, sys, json
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[1]
SOURCE=ROOT.parent/'apes-on-keys-figurine/aok-reconstruction-r03/outputs/R03_face_paint_v2.blend'
if not SOURCE.exists(): SOURCE=ROOT/'outputs/AOK_Brand_Film_Hero.blend'
bpy.ops.wm.open_mainfile(filepath=str(SOURCE));s=bpy.context.scene
for ob in s.objects:
    if ob.type=='LIGHT': ob.hide_render=True
    if ob.type=='MESH' and not (ob.name=='R03_APPROVED_FORM_PAINT_PREVIEW' or ob.name.startswith(('Hoodie outline ','Hoodie ink ','Cap ink '))): ob.hide_render=True
s.world.use_nodes=True;s.world.node_tree.nodes['Background'].inputs[0].default_value=(.45,.49,.58,1);s.world.node_tree.nodes['Background'].inputs[1].default_value=.28
center=Vector((0,0,51))
def light(name,loc,energy,size,color):
    d=bpy.data.lights.new(name,'AREA');d.energy=energy;d.shape='DISK';d.size=size;d.color=color
    o=bpy.data.objects.new(name,d);s.collection.objects.link(o);o.location=loc;o.rotation_euler=(center-o.location).to_track_quat('-Z','Y').to_euler()
light('Film soft key',(-80,-110,150),320000,95,(1,.91,.81))
light('Film fill',(90,-70,80),110000,110,(.8,.88,1))
light('Film rim',(50,60,120),280000,75,(1,.14,.085))
light('Top strip',(-30,30,190),180000,60,(1,1,1))
d=bpy.data.cameras.new('Brand film camera');d.type='ORTHO';d.ortho_scale=120;d.clip_end=3000
cam=bpy.data.objects.new('Brand film camera',d);s.collection.objects.link(cam);s.camera=cam
s.render.engine='CYCLES';s.cycles.samples=16;s.cycles.use_denoising=True;s.cycles.use_persistent_data=True
prefs=bpy.context.preferences.addons['cycles'].preferences;prefs.compute_device_type='METAL';prefs.get_devices()
for dev in prefs.devices:dev.use=dev.type=='METAL'
s.cycles.device='GPU';s.render.resolution_x=1200;s.render.resolution_y=1400;s.render.resolution_percentage=100
s.render.fps=30;s.frame_start=1;s.frame_end=105;s.render.film_transparent=True
s.render.image_settings.file_format='PNG';s.render.image_settings.color_mode='RGBA';s.render.image_settings.color_depth='8';s.render.image_settings.compression=20
s.view_settings.view_transform='AgX';s.view_settings.look='AgX - Medium High Contrast'
for f in range(1,106):
    u=(f-1)/104;angle=math.radians(-24+64*(u*u*(3-2*u)));elev=math.radians(5+5*math.sin(math.pi*u));radius=240
    cam.location=center+Vector((radius*math.sin(angle)*math.cos(elev),-radius*math.cos(angle)*math.cos(elev),radius*math.sin(elev)))
    cam.rotation_euler=(center-cam.location).to_track_quat('-Z','Y').to_euler();cam.keyframe_insert('location',frame=f);cam.keyframe_insert('rotation_euler',frame=f)
s.frame_set(1);s.render.filepath=str(ROOT/'renders/hero_')
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'outputs/AOK_Brand_Film_Hero.blend'))
if '--proof' in sys.argv:
    s.frame_set(53);s.render.filepath=str(ROOT/'renders/hero_proof.png');bpy.ops.render.render(write_still=True)
else:bpy.ops.render.render(animation=True)
print('HERO_RENDER_COMPLETE',flush=True)
