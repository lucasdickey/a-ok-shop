"""Blender-native 30-second globular camera animation of the approved, unpainted R03 mesh."""
import bpy,math,numpy as np,hashlib,json,sys
from mathutils import Vector
from pathlib import Path
ROOT=Path(__file__).resolve().parent
bpy.ops.wm.open_mainfile(filepath=str(ROOT/'outputs/R03_experimental_reconstruction.blend'))
s=bpy.context.scene;o=bpy.data.objects['R03_EXPERIMENTAL_LIKENESS_NOT_PRINT_APPROVED']
co=np.empty(len(o.data.vertices)*3,dtype=np.float32);o.data.vertices.foreach_get('co',co);h=hashlib.sha256(co.tobytes()).hexdigest()
# The floor is excluded so the camera can inspect the underside. Base geometry is untouched.
for ob in s.objects:
 if ob.type=='MESH' and ob!=o:ob.hide_render=True;ob.hide_set(True)
 if ob.type=='LIGHT':ob.hide_render=True
camdata=bpy.data.cameras.new('Globular inspection camera');camdata.type='PERSP';camdata.lens=65;camdata.sensor_width=36;camdata.sensor_fit='HORIZONTAL';camdata.clip_start=.1;camdata.clip_end=3000
cam=bpy.data.objects.new('GLOBULAR_CAMERA',camdata);s.collection.objects.link(cam);cam.rotation_mode='QUATERNION';s.camera=cam
center=Vector((0,0,50.8));lights=[]
for name,offset,energy,size in [('Orbit key',(-80,85,160),230000,100),('Orbit fill',(110,20,115),100000,100),('Orbit rim',(0,95,-100),160000,85)]:
 d=bpy.data.lights.new(name,'AREA');d.energy=energy;d.shape='DISK';d.size=size
 ob=bpy.data.objects.new(name,d);s.collection.objects.link(ob);ob.rotation_mode='QUATERNION';lights.append((ob,Vector(offset)))
N=720;s.render.fps=24;s.frame_start=1;s.frame_end=N
prev=None
for frame in range(1,N+1):
 u=(frame-1)/(N-1);turn=3*u;yaw=2*math.pi*turn
 if turn<1:elev=6.0
 elif turn<2:elev=6+77*math.sin(math.pi*(turn-1))**2
 else:elev=6-89*math.sin(math.pi*(turn-2))**2
 lat=math.radians(elev);radius=225*(.69+.31*math.cos(lat))*(1+.20*max(0,-math.sin(lat))**2)
 cam.location=center+Vector((radius*math.cos(lat)*math.sin(yaw),-radius*math.cos(lat)*math.cos(yaw),radius*math.sin(lat)))
 q=(center-cam.location).to_track_quat('-Z','Y')
 if prev is not None and prev.dot(q)<0:q.negate()
 cam.rotation_quaternion=q;prev=q.copy();cam.keyframe_insert('location',frame=frame);cam.keyframe_insert('rotation_quaternion',frame=frame)
 for light,offset in lights:
  light.location=center+q@offset;light.rotation_quaternion=(center-light.location).to_track_quat('-Z','Y');light.keyframe_insert('location',frame=frame);light.keyframe_insert('rotation_quaternion',frame=frame)
for ob in [cam]+[l for l,p in lights]:
 if ob.animation_data and ob.animation_data.action:
  for fc in ob.animation_data.action.fcurves:
   for k in fc.keyframe_points:k.interpolation='LINEAR'
for name,frame in [('FRONT',1),('RIGHT',61),('BACK',121),('LEFT',181),('OVERHEAD SWEEP',241),('ABOVE',361),('UNDERSIDE SWEEP',481),('BELOW / SOLES',601),('FRONT / LOOP',720)]:s.timeline_markers.new(name,frame=frame)
s.render.engine='CYCLES';s.cycles.samples=12;s.cycles.use_denoising=True;s.cycles.use_persistent_data=True
prefs=bpy.context.preferences.addons['cycles'].preferences;prefs.compute_device_type='METAL';prefs.get_devices()
for d in prefs.devices:d.use=(d.type=='METAL')
s.cycles.device='GPU'
s.render.resolution_x=900;s.render.resolution_y=900;s.render.resolution_percentage=100
s.render.film_transparent=False;s.render.image_settings.color_mode='RGB';s.render.image_settings.file_format='FFMPEG';s.render.ffmpeg.format='MPEG4';s.render.ffmpeg.codec='H264';s.render.ffmpeg.constant_rate_factor='HIGH';s.render.ffmpeg.ffmpeg_preset='GOOD';s.render.ffmpeg.audio_codec='NONE';s.render.filepath=str(ROOT/'outputs/AOK_R03_Clay_Globular_Orbit.mp4')
s.frame_set(1)
s['Animation']='30 seconds, 24 fps. Level orbit, overhead orbit to +83 degrees, underside orbit to -83 degrees.'
s['Geometry verification SHA256']=h
bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.context.view_layer.objects.active=o
for screen in bpy.data.screens:
 for area in screen.areas:
  if area.type=='VIEW_3D':area.spaces.active.region_3d.view_perspective='CAMERA'
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'outputs/R03_clay_globular_animation.blend'))
(ROOT/'outputs/ORBIT_STATUS.json').write_text(json.dumps({'base_geometry_changed':False,'vertex_sha256':h,'fps':24,'frames':720,'duration_seconds':30,'resolution':[900,900],'elevation_degrees':[-83,83],'method':'Blender Cycles native camera animation and H.264/MPEG-4 animation output','appearance':'Original unpainted clay; floor hidden for underside inspection'},indent=2))
if '--setup-only' in sys.argv:sys.exit(0)
if '--storyboard' in sys.argv:
 s.render.image_settings.file_format='PNG';s.render.resolution_percentage=70;s.cycles.samples=16
 for label,frame in [('front',1),('right',61),('back',121),('left',181),('above',361),('below',601)]:
  s.frame_set(frame);s.render.filepath=str(ROOT/'renders'/('orbit_'+label+'.png'));bpy.ops.render.render(write_still=True)
 print('ORBIT_STORYBOARD_COMPLETE',flush=True)
else:
 bpy.ops.render.render(animation=True)
 print('ORBIT_VIDEO_COMPLETE',flush=True)
