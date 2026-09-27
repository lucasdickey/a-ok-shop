"""Blender Video Sequencer edits for behind-the-scenes WIP collateral."""
import bpy,sys
from pathlib import Path
r=Path(__file__).resolve().parent;dest=r/'collateral';dest.mkdir(exist_ok=True)
PROOF='--proof' in sys.argv
bpy.ops.wm.read_factory_settings(use_empty=True)
font=bpy.data.fonts.load('/System/Library/Fonts/Supplemental/Arial Black.ttf')
regular=bpy.data.fonts.load('/System/Library/Fonts/Supplemental/Arial.ttf')
def edit(name,width):
 s=bpy.data.scenes.new(name);s.render.resolution_x=width;s.render.resolution_y=1080;s.render.resolution_percentage=100;s.render.fps=24;s.frame_start=1;s.frame_end=720
 s.view_settings.view_transform='Standard';s.view_settings.look='None';s.sequencer_colorspace_settings.name='sRGB';s.render.engine='BLENDER_WORKBENCH'
 seq=s.sequence_editor_create().strips
 bg=seq.new_effect(name='Dark frame',type='COLOR',channel=1,frame_start=1,frame_end=721);bg.color=(.012,.016,.023)
 return s,seq
def txt(seq,name,body,x,y,size,width,channel,color=(.93,.94,.96,1),bold=False,right=False):
 t=seq.new_effect(name=name,type='TEXT',channel=channel,frame_start=1,frame_end=721);t.text=body;t.font=font if bold else regular;t.font_size=size;t.color=color;t.location=(x/width,1-y/1080);t.anchor_x='RIGHT' if right else 'LEFT';t.anchor_y='TOP';t.alignment_x='RIGHT' if right else 'LEFT';t.blend_type='ALPHA_OVER';return t
def footage(seq,label,path,still,x,width,channel):
 if PROOF:
  t=seq.new_image(name=label,filepath=str(r/still),channel=channel,frame_start=1,fit_method='ORIGINAL');t.frame_final_end=721
  img=bpy.data.images.load(str(r/still));factor=900/img.size[0];t.transform.scale_x=factor;t.transform.scale_y=factor
 else:t=seq.new_movie(name=label,filepath=str(r/path),channel=channel,frame_start=1,fit_method='ORIGINAL')
 t.transform.offset_x=x+450-width/2;t.transform.offset_y=-40;t.blend_type='ALPHA_OVER';return t
square,seq=edit('WIP painted square',1080)
footage(seq,'Painted orbit','outputs/AOK_R03_Painted_Globular_Orbit.mp4','renders/painted_orbit_front.png',90,1080,2)
txt(seq,'Brand','A-OK / APES ON KEYS',90,27,34,1080,3,bold=True)
txt(seq,'Status','WORK IN PROGRESS  /  PAINT STUDY',90,77,18,1080,4,color=(.92,.28,.31,1))
txt(seq,'Footer','DIGITAL DEVELOPMENT PREVIEW',90,1045,14,1080,5,color=(.59,.64,.71,1))
txt(seq,'Revision','R03',990,1045,14,1080,6,color=(.59,.64,.71,1),right=True)
comparison,seq=edit('WIP clay to paint',1920)
footage(seq,'Clay orbit','outputs/AOK_R03_Clay_Globular_Orbit.mp4','renders/orbit_front.png',45,1920,2)
footage(seq,'Painted orbit','outputs/AOK_R03_Painted_Globular_Orbit.mp4','renders/painted_orbit_front.png',975,1920,3)
txt(seq,'Brand','A-OK / APES ON KEYS',45,22,32,1920,4,bold=True)
txt(seq,'Status','BEHIND THE SCENES / WORK IN PROGRESS',1875,32,18,1920,5,color=(.92,.28,.31,1),right=True)
txt(seq,'Clay label','CLAY SCULPT',45,99,16,1920,6,color=(.68,.72,.78,1))
txt(seq,'Paint label','PAINT STUDY',975,99,16,1920,7,color=(.68,.72,.78,1))
txt(seq,'Footer','DIGITAL DEVELOPMENT PREVIEW',45,1045,14,1920,8,color=(.59,.64,.71,1))
txt(seq,'Revision','R03',1875,1045,14,1920,9,color=(.59,.64,.71,1),right=True)
for s,filename in [(square,'AOK_WIP_Painted_Orbit'),(comparison,'AOK_WIP_Clay_to_Paint')]:
 s.render.image_settings.file_format='FFMPEG';s.render.ffmpeg.format='MPEG4';s.render.ffmpeg.codec='H264';s.render.ffmpeg.constant_rate_factor='HIGH';s.render.ffmpeg.ffmpeg_preset='GOOD';s.render.ffmpeg.audio_codec='NONE';s.render.filepath=str(dest/(filename+'.mp4'))
bpy.context.window.scene=square
if not PROOF:
 bpy.ops.wm.save_as_mainfile(filepath=str(dest/'AOK_WIP_Video_Edit.blend'));bpy.ops.file.make_paths_relative();bpy.ops.wm.save_as_mainfile(filepath=str(dest/'AOK_WIP_Video_Edit.blend'))
for s,filename in [(square,'AOK_WIP_Painted_Orbit'),(comparison,'AOK_WIP_Clay_to_Paint')]:
 bpy.context.window.scene=s;s.frame_set(1)
 if PROOF:s.render.image_settings.file_format='PNG';s.render.filepath=str(r/'renders'/(filename+'_layout.png'));bpy.ops.render.render(write_still=True)
 else:bpy.ops.render.render(animation=True)
print('WIP_EDITS_COMPLETE',flush=True)
