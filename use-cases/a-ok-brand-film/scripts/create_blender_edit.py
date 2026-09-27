"""Editable video/sound timeline; motion layers remain in compose_film.cjs."""
import bpy
from pathlib import Path
R=Path(__file__).resolve().parents[1]
bpy.ops.wm.read_factory_settings(use_empty=True)
s=bpy.context.scene;s.name='A-OK - TRUST THE NOISE';s.render.fps=30;s.frame_start=1;s.frame_end=450;s.render.resolution_x=1920;s.render.resolution_y=1080;s.render.resolution_percentage=100
seq=s.sequence_editor_create();seq.strips.new_movie('A-OK motion design',str(R/'outputs/AOK_Trust_The_Noise_15s_Silent.mp4'),channel=1,frame_start=1)
seq.strips.new_sound('Original 120 BPM score',str(R/'sound/AOK_15s_Original_Score.wav'),channel=2,frame_start=1)
for label,frame in [('TRUST THE NOISE',1),('FIND THE PATTERN',61),('WEAR THE OUTPUT',136),('FROM SIGNAL TO OBJECT',211),('ALL OUTPUTS',316),('A-OK END CARD',391)]:s.timeline_markers.new(label,frame=frame)
s.view_settings.view_transform='Standard';s.view_settings.look='None';s.sequencer_colorspace_settings.name='sRGB'
s.render.image_settings.file_format='FFMPEG';s.render.ffmpeg.format='MPEG4';s.render.ffmpeg.codec='H264';s.render.ffmpeg.constant_rate_factor='HIGH';s.render.ffmpeg.audio_codec='AAC';s.render.ffmpeg.audio_bitrate=320;s.render.filepath='//AOK_Trust_The_Noise_15s.mp4'
s['Motion source']='../scripts/compose_film.cjs';s['Hero source']='AOK_Brand_Film_Hero.blend';s['Sound source']='../sound/synthesize_soundtrack.py'
bpy.ops.wm.save_as_mainfile(filepath=str(R/'outputs/AOK_Trust_The_Noise_Edit.blend'));bpy.ops.file.make_paths_relative();bpy.ops.wm.save_as_mainfile(filepath=str(R/'outputs/AOK_Trust_The_Noise_Edit.blend'))
