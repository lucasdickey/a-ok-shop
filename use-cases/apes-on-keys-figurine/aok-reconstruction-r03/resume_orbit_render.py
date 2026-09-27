"""Continue the verified orbit after retained frames 1–203; final assembly is lossless."""
import bpy,json
from pathlib import Path
r=Path(__file__).resolve().parent
assert json.loads((r/'outputs/ORBIT_FRAMING_QA.json').read_text())['all_vertices_in_frame']
bpy.ops.wm.open_mainfile(filepath=str(r/'outputs/R03_clay_globular_animation.blend'))
s=bpy.context.scene
p=bpy.context.preferences.addons['cycles'].preferences;p.compute_device_type='METAL';p.get_devices()
for d in p.devices:d.use=(d.type=='METAL')
s.cycles.device='GPU';s.frame_start=204;s.frame_end=720
s.render.filepath=str(r/'outputs/orbit_parts/part2_0204_0720.mp4')
bpy.ops.render.render(animation=True)
print('ORBIT_REMAINDER_COMPLETE',flush=True)
