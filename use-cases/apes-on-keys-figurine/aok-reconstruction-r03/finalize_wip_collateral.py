"""Check and package the Blender-rendered WIP footage without altering its motion."""
from pathlib import Path
import subprocess,json,os,sys,zipfile
r=Path(__file__).resolve().parent;out=r/'outputs';c=r/'collateral';c.mkdir(exist_ok=True)
ff='/opt/homebrew/bin/ffmpeg';probe='/opt/homebrew/bin/ffprobe'
def inspect(path):
 d=json.loads(subprocess.check_output([probe,'-v','error','-count_frames','-show_streams','-show_format','-of','json',str(path)]));s=d['streams'][0]
 assert int(s['nb_read_frames'])==720 and abs(float(s['duration'])-30)<.05 and s['r_frame_rate']=='24/1',(path,s)
 return {'file':path.name,'frames':int(s['nb_read_frames']),'duration':float(s['duration']),'width':s['width'],'height':s['height'],'fps':s['r_frame_rate'],'codec':s['codec_name'],'pixel_format':s['pix_fmt'],'bytes':path.stat().st_size}
def faststart(path):
 temp=path.with_name(path.stem+'_faststart.mp4');subprocess.run([ff,'-hide_banner','-loglevel','error','-y','-i',str(path),'-c','copy','-movflags','+faststart',str(temp)],check=True);os.replace(temp,path)
def still(video,seconds,path):
 subprocess.run([ff,'-hide_banner','-loglevel','error','-y','-ss',str(seconds),'-i',str(video),'-frames:v','1',str(path)],check=True)
master=out/'AOK_R03_Painted_Globular_Orbit.mp4'
if '--master' in sys.argv:
 report=inspect(master);faststart(master)
 for name,t in [('front',0),('right',2.5),('back',5),('left',7.5),('above',15),('below',25)]:still(master,t,r/'renders'/('painted_orbit_'+name+'.png'))
 (out/'PAINTED_ORBIT_VIDEO_QA.json').write_text(json.dumps(report,indent=2));print(json.dumps(report,indent=2));sys.exit(0)
reports=[inspect(master)]
for name,w,h in [('AOK_WIP_Painted_Orbit',1080,1080),('AOK_WIP_Clay_to_Paint',1920,1080)]:
 path=c/(name+'.mp4');q=inspect(path);assert (q['width'],q['height'])==(w,h);faststart(path);reports.append(q);still(path,1.25,c/(name+'_Poster.png'))
(c/'VIDEO_QA.json').write_text(json.dumps(reports,indent=2))
(c/'README.md').write_text('''# A-OK / Apes on Keys — work-in-progress footage

Three 30-second, silent MP4 videos at 24 fps:

- **AOK_WIP_Painted_Orbit.mp4** — 1080 × 1080 square, branded for sharing.
- **AOK_WIP_Clay_to_Paint.mp4** — 1920 × 1080 landscape, synchronized clay and painted views.
- **AOK_R03_Painted_Globular_Orbit.mp4** — 900 × 900 clean painted master, included in the ZIP for your own edits.

Each covers the front, sides, back, overhead and underside. Camera timing matches the original clay video. The current face and body paint are retained; no additional sculpt changes are made. These are Blender renders of a digital figure in development, not footage of a manufactured sample.

Two PNG posters are included. A suggested social caption is in CAPTION.txt. No music is included, so the footage can be paired with audio in your publishing workflow.

The native animated 3D scene is ../outputs/R03_painted_globular_animation.blend. The local video edit project is AOK_WIP_Video_Edit.blend; it references the source videos in ../outputs/. Those editable source projects remain in the main package and are not bundled into the lightweight media ZIP.
''')
(c/'CAPTION.txt').write_text('From clay to color. A behind-the-scenes look at A-OK / Apes on Keys as the figure takes shape.\n\nWork in progress — digital sculpt and paint study.\n')
archive=r/'AOK_WIP_Sales_Collateral.zip'
with zipfile.ZipFile(archive,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=5) as z:
 for p in [c/'AOK_WIP_Painted_Orbit.mp4',c/'AOK_WIP_Clay_to_Paint.mp4',master,c/'AOK_WIP_Painted_Orbit_Poster.png',c/'AOK_WIP_Clay_to_Paint_Poster.png',c/'README.md',c/'CAPTION.txt']:z.write(p,p.name)
print(json.dumps({'videos':reports,'archive':str(archive),'archive_bytes':archive.stat().st_size},indent=2))
