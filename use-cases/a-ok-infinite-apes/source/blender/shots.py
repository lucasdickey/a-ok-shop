"""A-OK "Infinite Apes" reel: 3D shots of the approved R03 painted figurine.

Frame numbers are reel frames (30 fps, beat = 14 frames). The base mesh is never edited;
variants only swap materials or add helper objects in the unsaved session.

  blender -b --python shots.py -- --shot II|III --variant paint|clay|wire|mask
                                  --quality preview|final --out DIR [--frames A-B] [--track FILE]
"""
import bpy, math, sys, json, time
from pathlib import Path
from mathutils import Vector
from bpy_extras.object_utils import world_to_camera_view

SRC = '/Users/ld/Documents/github-lucasdickey/a-ok-shop/use-cases/apes-on-keys-figurine/aok-reconstruction-r03/outputs/R03_face_paint_v2.blend'
argv = sys.argv[sys.argv.index('--') + 1:]
def arg(name, default=None):
    return argv[argv.index(name) + 1] if name in argv else default
SHOT = arg('--shot', 'II'); VARIANT = arg('--variant', 'paint'); QUALITY = arg('--quality', 'preview')
OUT = Path(arg('--out', '.')); TRACK = arg('--track')
W, H = 1920, 1080

# ---------------------------------------------------------------- easing / camera math
def clamp(x, a=0.0, b=1.0): return max(a, min(b, x))
def lerp(a, b, t): return a + (b - a) * t
def ease_out_quart(t): t = clamp(t); return 1 - (1 - t) ** 4
def ease_in_out_cubic(t): t = clamp(t); return 4 * t ** 3 if t < .5 else 1 - (-2 * t + 2) ** 3 / 2
def ease_in(t, p=2.2): return clamp(t) ** p
def sph(target, az, el, d):
    az, el = math.radians(az), math.radians(el)
    return target + Vector((d * math.cos(el) * math.sin(az), -d * math.cos(el) * math.cos(az), d * math.sin(el)))
def logl(a, b, t): return math.exp(lerp(math.log(a), math.log(b), t))

CAP_TEXT = Vector((0, -9.4, 94.0))

def pose_II(f):
    """Match-cut close-up on the cap's A-OK, whip pull-back to a low hero 3/4, slow drift."""
    u = ease_out_quart((f - 112.5) / 13.5)          # frame 112 holds still for the match cut
    w = clamp((f - 126) / 42.0)                      # drift for the rest of the bar
    T0, T1, T2 = CAP_TEXT, Vector((0, 0, 50.5)), Vector((0, 0, 49.5))
    az = lerp(0, -24, u) + lerp(0, -12, w)
    el = lerp(0, 4.0, u) + lerp(0, -1.5, w)
    d = logl(40.0, 224.0, u) * lerp(1, .93, w)
    target = T0.lerp(T1, u).lerp(T2, w)
    lens = lerp(50, 35, u)
    fstop = logl(.22, .9, u)
    return sph(target, az, el, d), target, lens, fstop, az

MOUTH = Vector((0, -10.6, 69.1))
FACE = Vector((0, -6.0, 73.0))

def pose_III(f):
    """Technical orbit from back-right to front (x-ray build), then a dive into the O-mouth."""
    u = ease_in_out_cubic((f - 168) / 42.0)
    v = ease_in((f - 210) / 14.0, 2.4)
    k = ease_in_out_cubic((f - 193) / 17.0)          # close in only after the x-ray build
    az = lerp(152, 0, u); el = lerp(14, 2.5, u)
    d = logl(236, 205, clamp((f - 168) / 25.0)) if f < 193 else logl(205, 118, k)
    target = Vector((0, 0, 51)).lerp(FACE, k)
    lens = lerp(35, 40, k)
    if f > 210:
        target = FACE.lerp(MOUTH, clamp(v * 1.6))
        d = logl(118, 11.0, v)
        lens = lerp(40, 30, v)
    return sph(target, az, el, d), target, lens, 2.0, az

POSE = {'II': pose_II, 'III': pose_III}[SHOT]
RANGE = {'II': (112, 167), 'III': (168, 223)}[SHOT]
if arg('--frames'):
    a, b = arg('--frames').split('-'); RANGE = (int(a), int(b))

# ---------------------------------------------------------------- scene
bpy.ops.wm.open_mainfile(filepath=SRC)
s = bpy.context.scene
ape = bpy.data.objects['R03_APPROVED_FORM_PAINT_PREVIEW']
overlays = [o for o in s.objects if o.name.startswith(('Hoodie outline ', 'Hoodie ink ', 'Cap ink '))]
for o in s.objects:
    if o.type == 'LIGHT' or o.type == 'CAMERA': o.hide_render = True
floor = bpy.data.objects['Plane']; floor.is_shadow_catcher = True

s.render.engine = 'CYCLES'
prefs = bpy.context.preferences.addons['cycles'].preferences
prefs.compute_device_type = 'METAL'; prefs.get_devices()
for d in prefs.devices: d.use = (d.type == 'METAL')
s.cycles.device = 'GPU'; s.cycles.use_persistent_data = True
s.render.resolution_x, s.render.resolution_y = W, H
s.render.resolution_percentage = 100 if QUALITY == 'final' else 50
s.cycles.samples = {'final': 24, 'preview': 4}[QUALITY]
s.cycles.use_adaptive_sampling = True; s.cycles.adaptive_threshold = .02
s.cycles.use_denoising = True
s.render.film_transparent = True
s.render.use_motion_blur = True; s.render.motion_blur_shutter = .5
s.render.image_settings.file_format = 'PNG'; s.render.image_settings.color_mode = 'RGBA'; s.render.image_settings.color_depth = '8'

# Camera-relative light rig: lights keep the same relationship to the lens as it orbits.
rig = bpy.data.objects.new('RIG', None); s.collection.objects.link(rig); rig.location = (0, 0, 50)
def area(name, loc, energy, size, color=(1, 1, 1)):
    d = bpy.data.lights.new(name, 'AREA'); d.energy = energy; d.shape = 'DISK'; d.size = size; d.color = color
    ob = bpy.data.objects.new(name, d); s.collection.objects.link(ob); ob.parent = rig
    ob.location = Vector(loc) - Vector((0, 0, 50))
    ob.rotation_mode = 'QUATERNION'; ob.rotation_quaternion = (Vector((0, 0, 0)) - ob.location).to_track_quat('-Z', 'Y')
    return ob
area('KEY', (-95, -120, 160), 270000, 80, (1, .97, .93))
area('FILL', (120, -95, 75), 70000, 120, (.93, .96, 1))
area('RIM_L', (-120, 95, 125), 230000, 55)
area('RIM_R', (120, 105, 115), 230000, 55)
area('KICK', (0, 30, -40), 25000, 90, (1, .85, .8))

cd = bpy.data.cameras.new('REEL_CAM'); cd.sensor_width = 36; cd.sensor_fit = 'HORIZONTAL'; cd.clip_start = .4; cd.clip_end = 5000
cam = bpy.data.objects.new('REEL_CAM', cd); s.collection.objects.link(cam); s.camera = cam
cam.rotation_mode = 'QUATERNION'
cd.dof.use_dof = VARIANT in ('paint', 'clay')

prev = None
# Quarter-frame keys: Cycles samples the shutter between frames, so sparse keys would leak motion.
for q in range((RANGE[0] - 1) * 4, (RANGE[1] + 2) * 4 + 1):
    f = q / 4.0
    loc, target, lens, fstop, az = POSE(f)
    cam.location = loc
    q = (target - loc).to_track_quat('-Z', 'Y')
    if prev is not None and prev.dot(q) < 0: q.negate()
    prev = q.copy(); cam.rotation_quaternion = q
    cd.lens = lens; cd.dof.focus_distance = (target - loc).length; cd.dof.aperture_fstop = fstop
    rig.rotation_euler = (0, 0, math.radians(az))
    for data, path in [(cam, 'location'), (cam, 'rotation_quaternion'), (cd, 'lens'), (cd.dof, 'focus_distance'), (cd.dof, 'aperture_fstop'), (rig, 'rotation_euler')]:
        data.keyframe_insert(path, frame=f)
for ob in (cam, cd, rig):
    ad = ob.animation_data
    if ad and ad.action:
        for fc in ad.action.fcurves:
            for k in fc.keyframe_points: k.interpolation = 'LINEAR'

# ---------------------------------------------------------------- variants
def flat(name, rgb, strength=1.0):
    m = bpy.data.materials.new(name); m.use_nodes = True; n = m.node_tree.nodes; n.clear()
    e = n.new('ShaderNodeEmission'); e.inputs['Color'].default_value = (*rgb, 1); e.inputs['Strength'].default_value = strength
    o = n.new('ShaderNodeOutputMaterial'); m.node_tree.links.new(e.outputs[0], o.inputs[0]); return m
def assign(ob, m):
    ob.data.materials.clear(); ob.data.materials.append(m)
    ob.data.polygons.foreach_set('material_index', [0] * len(ob.data.polygons))

if VARIANT == 'clay':
    clay = bpy.data.materials.new('REEL CLAY'); clay.use_nodes = True
    p = clay.node_tree.nodes['Principled BSDF']
    p.inputs['Base Color'].default_value = (.62, .56, .49, 1); p.inputs['Roughness'].default_value = .62
    p.inputs['Specular IOR Level'].default_value = .35
    assign(ape, clay)
    for o in overlays: o.hide_render = True
    s.cycles.samples = {'final': 16, 'preview': 4}[QUALITY]

if VARIANT == 'wire':
    for o in overlays: o.hide_render = True
    lo = ape.copy(); lo.data = ape.data.copy(); s.collection.objects.link(lo); lo.name = 'REEL_LOWPOLY'
    dec = lo.modifiers.new('dec', 'DECIMATE'); dec.ratio = .014
    bpy.context.view_layer.objects.active = lo
    with bpy.context.temp_override(object=lo, active_object=lo):
        bpy.ops.object.modifier_apply(modifier='dec')
    wire = lo.copy(); wire.data = lo.data.copy(); s.collection.objects.link(wire); wire.name = 'REEL_WIRE'
    wm = wire.modifiers.new('wf', 'WIREFRAME'); wm.thickness = .16; wm.offset = 1; wm.use_even_offset = True; wm.use_replace = True
    assign(wire, flat('REEL WIRE RED', (1.0, .035, .03), 3.2))
    body = bpy.data.materials.new('REEL WIRE BODY'); body.use_nodes = True
    bp = body.node_tree.nodes['Principled BSDF']; bp.inputs['Base Color'].default_value = (.012, .012, .014, 1); bp.inputs['Roughness'].default_value = .5
    assign(lo, body)
    ape.hide_render = True
    s.cycles.samples = {'final': 12, 'preview': 4}[QUALITY]
    print('WIRE_FACES', len(lo.data.polygons), flush=True)

if VARIANT == 'mask':
    white, black = flat('MASK WHITE', (1, 1, 1)), flat('MASK BLACK', (0, 0, 0))
    assign(ape, white)
    for o in overlays: assign(o, black if o.name.startswith('Cap ink') else white)
    s.render.film_transparent = False; floor.hide_render = True
    s.world.use_nodes = True
    bg = s.world.node_tree.nodes.get('Background'); bg.inputs['Color'].default_value = (1, 1, 1, 1); bg.inputs['Strength'].default_value = 1
    s.view_settings.view_transform = 'Standard'; s.view_settings.look = 'None'
    s.render.use_motion_blur = False; s.cycles.samples = 16; s.cycles.use_denoising = False
    s.render.image_settings.color_mode = 'BW'

# ---------------------------------------------------------------- tracking export
def surface(origin, direction):
    hit, loc, n, i = ape.ray_cast(ape.matrix_world.inverted() @ Vector(origin), Vector(direction))
    return ape.matrix_world @ loc if hit else Vector(origin)
POINTS = {
    'cap_text': CAP_TEXT,
    'mouth': surface((0, -100, 69.1), (0, 1, 0)),
    'eye_l': surface((4.65, -100, 81.35), (0, 1, 0)), 'eye_r': surface((-4.65, -100, 81.35), (0, 1, 0)),
    'cup_l': surface((100, 4.9, 78.5), (-1, 0, 0)), 'cup_r': surface((-100, 4.9, 78.5), (1, 0, 0)),
    'chest': surface((0, -100, 46), (0, 1, 0)),
    'shoe_l': surface((13.5, -100, 6), (0, 1, 0)), 'shoe_r': surface((-13.5, -100, 6), (0, 1, 0)),
    'head_top': Vector((0, 0, 101.6)), 'feet': Vector((0, 0, 0)), 'hood_back': surface((0, 100, 60), (0, -1, 0)),
}
if TRACK:
    data = {'points': {k: list(v) for k, v in POINTS.items()}, 'frames': {}}
    for f in range(RANGE[0], RANGE[1] + 1):
        s.frame_set(f)
        row = {}
        for k, v in POINTS.items():
            c = world_to_camera_view(s, cam, v)
            row[k] = [round(c.x * W, 2), round((1 - c.y) * H, 2), round(c.z, 3)]
        row['_lens'] = round(cam.data.lens, 3)
        data['frames'][f] = row
    Path(TRACK).write_text(json.dumps(data))
    print('TRACK_WRITTEN', TRACK, flush=True)
    if '--track-only' in argv: sys.exit(0)

# ---------------------------------------------------------------- render
OUT.mkdir(parents=True, exist_ok=True)
frames = [RANGE[0]] if VARIANT == 'mask' else range(RANGE[0], RANGE[1] + 1)
if arg('--only'): frames = [int(x) for x in arg('--only').split(',')]
t_all = time.time()
for f in frames:
    t = time.time(); s.frame_set(f)
    s.render.filepath = str(OUT / f'{VARIANT}_{f:04d}.png')
    bpy.ops.render.render(write_still=True)
    print(f'FRAME {SHOT} {VARIANT} {f} {time.time() - t:.2f}s', flush=True)
print(f'DONE {SHOT} {VARIANT} {len(frames)} frames {time.time() - t_all:.1f}s', flush=True)
