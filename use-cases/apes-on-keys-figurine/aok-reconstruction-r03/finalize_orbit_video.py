"""Losslessly join consecutive Blender animation segments and verify the finished video."""
from pathlib import Path
import subprocess,json
r=Path(__file__).resolve().parent;out=r/'outputs';parts=out/'orbit_parts'
ff='/opt/homebrew/bin/ffmpeg';probe='/opt/homebrew/bin/ffprobe'
def inspect(p,count=False):
 cmd=[probe,'-v','error']+(['-count_frames'] if count else [])+['-show_streams','-show_format','-of','json',str(p)]
 return json.loads(subprocess.check_output(cmd))
for fn,expected in [('part1_0001_0203.mp4',203),('part2_0204_0720.mp4',517)]:
 s=inspect(parts/fn)['streams'][0];assert int(s['nb_frames'])==expected,(fn,s.get('nb_frames'));assert s['width']==900 and s['height']==900 and s['r_frame_rate']=='24/1'
listing=parts/'consecutive_frames.txt';listing.write_text("file 'part1_0001_0203.mp4'\nfile 'part2_0204_0720.mp4'\n")
final=out/'AOK_R03_Clay_Globular_Orbit.mp4'
subprocess.run([ff,'-hide_banner','-loglevel','error','-y','-f','concat','-safe','0','-i',str(listing),'-c','copy','-movflags','+faststart',str(final)],check=True)
info=inspect(final,True);s=info['streams'][0]
assert int(s['nb_read_frames'])==720 and abs(float(s['duration'])-30)<.05
for name,time in [('front',0),('right',2.5),('back',5),('left',7.5),('above',15),('below',25)]:
 subprocess.run([ff,'-hide_banner','-loglevel','error','-y','-ss',str(time),'-i',str(final),'-frames:v','1',str(r/'renders'/('orbit_'+name+'.png'))],check=True)
qa={'width':s['width'],'height':s['height'],'fps':s['r_frame_rate'],'decoded_frames':int(s['nb_read_frames']),'duration_seconds':float(s['duration']),'codec':s['codec_name'],'pixel_format':s['pix_fmt'],'file_bytes':final.stat().st_size,'consecutive_frame_ranges':[[1,203],[204,720]],'assembly':'Lossless concat; no frame interpolation or image manipulation; fast-start MP4'}
(out/'ORBIT_VIDEO_QA.json').write_text(json.dumps(qa,indent=2));print(json.dumps(qa,indent=2))
