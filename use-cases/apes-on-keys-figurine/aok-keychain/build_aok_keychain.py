"""A-OK figurine master. Blender 4.5; geometry coordinates are millimeters.
Run: Blender --background --python build_aok_keychain.py -- --preview
Without --preview, saves editable geometry. Run finalize_aok_keychain.py next.
"""
import bpy, bmesh, math, os, sys, json, random
from pathlib import Path
from mathutils import Vector
from math import sin, cos, pi, sqrt
ROOT=Path(__file__).resolve().parent
for d in ['blender','exports','renders','qa','references']: (ROOT/d).mkdir(exist_ok=True)
PREVIEW='--preview' in sys.argv
random.seed(29)
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
for c in list(bpy.data.collections):
 if c.name != 'Collection': bpy.data.collections.remove(c)
base=bpy.data.collections.get('Collection'); base.name='CHARACTER_EDITABLE'
cols={'CHARACTER_EDITABLE':base}
for n in ['PRINT_MASTER','HARDWARE_PREVIEW','CAMERAS','LIGHTS','REFERENCE','STUDIO']:
 c=bpy.data.collections.new(n);bpy.context.scene.collection.children.link(c);cols[n]=c

def move(o,c='CHARACTER_EDITABLE'):
 for co in list(o.users_collection):co.objects.unlink(o)
 cols[c].objects.link(o)
 return o

def mat(n,col,rough=.55,metal=0):
 m=bpy.data.materials.new(n);m.diffuse_color=(*col,1);m.use_nodes=True
 p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*col,1);p.inputs['Roughness'].default_value=rough;p.inputs['Metallic'].default_value=metal
 return m
RED=mat('MAT_RED',(.45,.002,.008),.65);WHITE=mat('MAT_WHITE',(.88,.86,.81),.48)
BLACK=mat('MAT_BLACK',(.008,.009,.011),.5);FUR=mat('MAT_FUR',(.015,.018,.020),.7)
TAN=mat('MAT_FACE_TAN',(.42,.19,.075),.57);TANL=mat('MAT_FACE_LIGHT',(.52,.255,.11),.55)
BROWN=mat('MAT_EYE_BROWN',(.13,.045,.012),.24);EYE=mat('MAT_EYE_WHITE',(.96,.94,.86),.22)
PUPIL=mat('MAT_PUPIL',(.002,.002,.003),.16);MOUTH=mat('MAT_MOUTH_DARK',(.055,.012,.008),.65)
TONGUE=mat('MAT_TONGUE',(.46,.13,.075),.6);METAL=mat('MAT_METAL_PREVIEW',(.55,.57,.59),.22,.9)
PANTS=mat('MAT_PANTS',(.026,.029,.031),.8);SEAM=mat('MAT_RED_SEAM',(.39,.003,.009),.65)
CLAY=mat('MAT_CLAY',(.42,.45,.48),.7);CLAY.use_fake_user=True

def mesh(n,vs,fs,m):
 me=bpy.data.meshes.new(n);me.from_pydata(vs,[],fs);me.update();o=bpy.data.objects.new(n,me);base.objects.link(o)
 if m:o.data.materials.append(m)
 for p in me.polygons:p.use_smooth=True
 return o

def apply(o):
 bpy.context.view_layer.objects.active=o;o.select_set(True)
 bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.select_set(False)

def uv(n,loc,sc,m,seg=64,rings=40):
 bpy.ops.mesh.primitive_uv_sphere_add(segments=seg,ring_count=rings,location=loc)
 o=bpy.context.object;o.name=n;o.scale=sc;apply(o);move(o)
 o.data.materials.append(m)
 for p in o.data.polygons:p.use_smooth=True
 return o

def tube(n,pts,r,m):
 cu=bpy.data.curves.new(n,'CURVE');cu.dimensions='3D';cu.resolution_u=12;cu.bevel_depth=r;cu.bevel_resolution=3;cu.use_fill_caps=True
 sp=cu.splines.new('BEZIER');sp.bezier_points.add(len(pts)-1)
 for b,p in zip(sp.bezier_points,pts):b.co=p;b.handle_left_type='AUTO';b.handle_right_type='AUTO'
 o=bpy.data.objects.new(n,cu);base.objects.link(o);cu.materials.append(m);return o

def torus(n,loc,major,minor,m,rotation=(pi/2,0,0),sc=(1,1,1)):
 bpy.ops.mesh.primitive_torus_add(major_segments=96,minor_segments=20,location=loc,major_radius=major,minor_radius=minor,rotation=rotation)
 o=bpy.context.object;o.name=n;o.scale=sc;apply(o);move(o);o.data.materials.append(m)
 for p in o.data.polygons:p.use_smooth=True
 return o

def capsule(n,a,b,rx,ry,m):
 mid=(Vector(a)+Vector(b))/2;d=Vector(b)-Vector(a)
 o=uv(n,mid,(rx,ry,d.length/2+rx*.45),m);o.rotation_euler=d.to_track_quat('Z','Y').to_euler();return o

def loft(n,rows,m,power=2,segments=96):
 # rows z, x radius, y radius, y center
 vs=[]
 for z,w,d,cy in rows:
  for j in range(segments):
   t=2*pi*j/segments;c=cos(t);s=sin(t)
   vs.append((w*math.copysign(abs(c)**(2/power),c),cy+d*math.copysign(abs(s)**(2/power),s),z))
 fs=[]
 for k in range(len(rows)-1):
  for j in range(segments):a=k*segments+j;b=k*segments+(j+1)%segments;fs.append((a,b,b+segments,a+segments))
 fs.append(tuple(reversed(range(segments))));fs.append(tuple((len(rows)-1)*segments+j for j in range(segments)))
 return mesh(n,vs,fs,m)

def subdiv(o,lev=2):
 mo=o.modifiers.new('Sculpt surface','SUBSURF');mo.levels=lev;mo.render_levels=lev
 return o

def boolean(o,cut):
 bpy.context.view_layer.objects.active=o
 mod=o.modifiers.new('Carved detail','BOOLEAN');mod.operation='DIFFERENCE';mod.solver='EXACT';mod.object=cut
 bpy.ops.object.modifier_apply(modifier=mod.name);bpy.data.objects.remove(cut,do_unlink=True)

# SHOES: rounded high-top silhouette with separate painted panels.
for s in [-1,1]:
 x=s*10.3
 for n,rows,m in [
 ('OUTSOLE',[(0,6.9,11,-2),(0.5,7.8,12,-2),(2.1,7.8,12,-2),(2.45,7.5,11.8,-2)],RED),
 ('MIDSOLE',[(1.9,7.7,11.9,-2),(2.4,7.85,12,-2),(3.7,7.6,11.7,-2),(4,7.2,11.5,-2)],WHITE),
 ('UPPER',[(3.4,7.15,11.4,-2),(5,7.4,11.2,-2),(7.6,6.5,9.2,-1),(10,5.1,6.1,1),(12,4.9,5.5,1)],RED)]:
  o=subdiv(loft('SHOE_'+str(s)+'_'+n,rows,m,3.1),1);o.location.x=x
 uv('SHOE_TOE_WHITE',(x,-8,6.3),(6.1,5.7,2.3),WHITE)
 uv('SHOE_TONGUE',(x,-4,8.5),(4.5,7.5,3),BLACK)
 for k in range(5):
  y=-8+k*1.2;z=8.5+3*sqrt(1-((y+4)/7.5)**2)+.08
  tube('LACE_RELIEF',[(x-3.9,y+.6,z),(x,y,z+.2),(x+3.9,y-.3,z)],.43,WHITE)
 for side in [-1,1]:
  # white leather side panel anchored to upper
  uv('SHOE_SIDE_PANEL',(x+side*6.5,.4,6.6),(1.1,7.6,2.6),WHITE)
  pts=[(x+side*7.1,4.4,8.3),(x+side*7.3,.8,6.8),(x+side*7.35,-2.6,5.8),(x+side*7.15,-3.7,6.8)]
  tube('SHOE_RED_SIDE_MARK',pts,.7,RED)
 for k in range(3):
  for j in [-1,0,1]:uv('TOE_PERFORATION_PAINT',(x+j*1.6,-10+k*1.1,8.14-k*.03),(.22,.24,.10),BLACK,16,8)
 # baggy pants with three overlapping tailored volumes
 uv('PANTS_LEG',(x,1,20),(7.35,7.4,12),PANTS)
 uv('PANTS_KNEE',(x+s*.45,-1,19.5),(7.2,7.2,6),PANTS)
 uv('PANTS_CUFF',(x,.5,12.4),(7.15,6.9,2.6),PANTS)
 for k in range(3):
  z=14.5+k*4.1
  tube('PANTS_FOLD',[(x-5.8,-3.3,z+.5),(x-2,-6.4,z),(x+3,-6.3,z+.6),(x+5.8,-3.6,z+1.4)],.38,PANTS)
uv('PANTS_HIPS',(0,1,27),(15,7.7,7),PANTS)
# Hoodie body: broad flat chest for graphic; sculpted shoulder taper.
body=subdiv(loft('HOODIE_BODY',[(26.5,12.8,8,1),(27,15,9.2,1),(30,16.8,10.7,1),(38,17.3,11.3,1),(46,16.7,10.8,1),(53,14.4,9.7,1),(57,11.3,8.2,1),(59,7,6,1)],RED,3.2),2)
waist=subdiv(loft('HOODIE_WAISTBAND',[(25.8,14.1,8.6,1),(26.2,15.8,9.5,1),(28.9,16,9.7,1),(29.2,15.7,9.5,1)],RED,3.2),1)
for j in range(85):
 t=2*pi*j/85;c=cos(t);ss=sin(t)
 x=15.85*math.copysign(abs(c)**.625,c);y=1+9.5*math.copysign(abs(ss)**.625,ss)
 tube('WAIST_RIB',[(x,y,26.3),(x,y,28.8)],.16,SEAM)
for s in [-1,1]:
 capsule('SLEEVE_UPPER',(s*13.4,1,51.5),(s*20.2,-.5,39.2),7.2,8,RED)
 capsule('SLEEVE_FOREARM',(s*20.3,-.7,39.4),(s*17.5,-5.5,33.6),6.2,6.8,RED)
 uv('CUFF',(s*18,-6.5,33.4),(3.5,3,3.7),RED)
 uv('TUCKED_HAND_FUR',(s*16,-6,34.4),(2.2,1.8,2.7),FUR)
 tube('POCKET_LIP',[(s*13.7,-8.5,37),(s*16.3,-6.8,34),(s*17.2,-5.6,31.5)],.75,RED)
 for k in range(4):
  tube('SLEEVE_FOLD',[(s*18,-6,43+k*2),(s*20,-6.8,41+k*2),(s*22,-4,40+k*2)],.3,RED)
 # rear side seam
 tube('SIDE_SEAM',[(s*15,5,30),(s*17,5.6,39),(s*14,5.7,49)],.23,SEAM)
# Full hood cushions wrap behind head and meet on chest.
uv('HOOD_BACK',(0,7,57),(17,10,9.8),RED)
for s in [-1,1]:
 tube('HOOD_ROLLED_EDGE',[(0,14,64),(s*12,10,63),(s*16,1,61),(s*12,-6,56),(s*6,-9,53)],2.2,RED)
 tube('HOOD_SEAM',[(0,16.7,61),(0,17,56),(0,14,50)],.23,SEAM)
 tube('DRAWSTRING',[(s*5.1,-9.9,56),(s*5.5,-10.6,53),(s*4.7,-11,50.5)],.48,RED)
 uv('DRAWSTRING_ANCHOR',(s*5,-10.05,55.5),(.85,.4,.85),METAL,32,16)
 capsule('DRAWSTRING_TIP',(s*4.7,-11,50.5),(s*4.6,-11,49.3),.48,.5,METAL)
# Zipper, closed and embedded into front.
tube('ZIPPER_TAPE',[(0,-9,26),(0,-10.25,32),(0,-10.7,41),(0,-9.7,53)],.52,SEAM)
for k in range(47):
 z=27+k*.57;y=-9.8 if z<31 else (-10.6 if z<46 else -10.0)
 uv('ZIPPER_TOOTH',((.2 if k%2 else -.2),y,z),(.29,.32,.18),METAL,12,8)
# Typography: bold editable curves projected onto the chest.
fontpath='/System/Library/Fonts/Supplemental/Arial Black.ttf'
font=bpy.data.fonts.load(fontpath) if Path(fontpath).exists() else None

def text(n,word,z,height,width,y,material,outline=False):
 cu=bpy.data.curves.new(n,'FONT');cu.body=word;cu.align_x='CENTER';cu.align_y='CENTER';cu.size=height;cu.extrude=.38;cu.bevel_depth=.06;cu.bevel_resolution=2;cu.resolution_u=10
 if font:cu.font=font
 if outline:cu.offset=0
 o=bpy.data.objects.new(n,cu);base.objects.link(o);cu.materials.append(material);o.rotation_euler=(pi/2,0,0);o.location=(0,y,z)
 bpy.context.view_layer.update()
 o.scale.x=width/max(o.dimensions.x,.1);o.scale.y=height/max(max(v[1] for v in o.bound_box)-min(v[1] for v in o.bound_box),.1)
 if outline:cu.offset=.23
 return o
for word,z,h,w in [('APES',46.2,6.5,27),('ON',41,3.3,8),('KEYS',35.5,6.5,27)]:
 text('HOODIE_TEXT_OUTLINE_'+word,word,z,h,w,-10.35,WHITE,True)
 text('HOODIE_TEXT_'+word,word,z,h,w,-10.82,BLACK)
# Dark head mass with gently sculpted cheek shape.
head=uv('APE_FUR_HEAD',(0,0,78),(20.1,14.4,20.0),FUR,128,80)
for v in head.data.vertices:
 p=v.co;f=1+.003*sin(p.z*.73)*sin(p.x*.61)+.002*sin(p.x*2+p.z*2.4)
 p.x*=f;p.y*=1+.002*sin(p.z*2.8+p.x*1.4)
# Small ears, largely behind the headphones.
for s in [-1,1]:
 uv('APE_EAR',(s*19,0,78),(4.3,3.5,6),FUR)
 uv('APE_EAR_TAN',(s*20,-2,78),(2.7,1.8,4.2),TAN)
 # tan eye surround and seated eyeball
 uv('EYE_SURROUND',(s*7.5,-12.25,80),(7.8,4.7,9.2),TAN)
 uv('EYE_SOCKET_RIM',(s*7.55,-15.8,80.9),(4.85,1.8,5.5),TANL)
 uv('EYE_WHITE',(s*7.55,-16.85,81.15),(4.1,1.65,4.5),EYE)
 uv('EYE_IRIS',(s*7.45,-18.25,80.9),(2.9,.48,3.15),BROWN)
 uv('EYE_PUPIL',(s*7.43,-18.68,80.93),(1.7,.29,1.95),PUPIL)
 uv('EYE_CATCHLIGHT',(s*7.43-.52,-18.93,81.82),(.50,.14,.55),EYE,24,16)
 # Shallow sculpted lids seat the eyes within the sockets.
 for upper in [True,False]:
  pts=[]
  for j in range(17):
   t=pi*j/16+(0 if upper else pi);pts.append((s*7.55+4.12*cos(t),-16.92,81.15+4.5*sin(t)))
  tube('EYELID_RIM',pts,.40,TANL)
 # inset fur brow follows round facial field
 tube('BROW_FUR',[(s*1.5,-13.4,85.5),(s*5,-14.0,86.3),(s*10,-13.5,86.3),(s*14,-10.7,85.5)],.75,FUR)
# Joined muzzle with a real concave mouth cavity.
muzzle=uv('APE_MUZZLE',(0,-13.65,69.5),(9.1,7.6,10.7),TANL,96,64)
cut=uv('MOUTH_CAVITY_CUT',(0,-21.1,65.9),(4.4,5.7,5.2),MOUTH,64,40)
boolean(muzzle,cut)
# dark back inside the cavity, visibly recessed
uv('MOUTH_INTERIOR',(0,-16.0,65.9),(4.0,1.4,4.5),MOUTH)
uv('TONGUE',(0,-17.35,63.1),(2.4,1.35,1.15),TONGUE)
uv('NOSE_BRIDGE',(0,-17.8,76),(2.7,2.7,3.2),TANL)
# nostril pads, carve recesses then add dark inset
for s in [-1,1]:
 nose=uv('NOSE_ALA',(s*1.8,-19.65,75.25),(2.25,2.0,2.1),TANL)
 cutter=uv('NOSTRIL_CUT',(s*1.9,-21.2,75.1),(.91,1.3,1.1),BLACK,40,24);boolean(nose,cutter)
 uv('NOSTRIL_INTERIOR',(s*1.9,-20.4,75.15),(.72,.48,.87),MOUTH,32,24)
tube('MUZZLE_PHILTRUM',[(0,-21.18,74),(0,-21.27,72),(0,-21.02,70.6)],.16,TAN)
# Surface-embedded fur ridges along cheeks and jaw, kept short.
for s in [-1,1]:
 for k in range(135):
  z=random.uniform(62.3,87.5);x=s*random.uniform(11.2,18.8)
  q=1-(x/20.1)**2-((z-78)/20)**2
  if q<.045:continue
  y=-14.4*sqrt(q)
  # avoid tan mask area
  if ((abs(x)-7.5)/8)**2+((z-80)/9.2)**2<1.1:continue
  pts=[]
  for dx,dz in [(0,0),(.2,-.7),(.3,-1.35)]:
   xx=x+s*dx;zz=z+dz;qq=1-(xx/20.1)**2-((zz-78)/20)**2
   if qq<=.02:break
   pts.append((xx,-14.4*sqrt(qq)+.14,zz))
  if len(pts)==3:tube('FUR_RELIEF',pts,.22,FUR)
# CAP closed dome, panels assigned by azimuth.
vs=[(0,0,101.6)];fs=[];pan=[];N=128;R=28
for k in range(1,R+1):
 a=(pi/2)*k/R
 for j in range(N):
  t=2*pi*j/N;vs.append((21*sin(a)*cos(t),15.4*sin(a)*sin(t),87.6+14*cos(a)))
for j in range(N):fs.append((0,1+j,1+(j+1)%N))
for k in range(R-1):
 for j in range(N):a=1+k*N+j;b=1+k*N+(j+1)%N;fs.append((a,a+N,b+N,b))
fs.append(tuple(reversed([1+(R-1)*N+j for j in range(N)])))
cap=mesh('CAP_CROWN',vs,fs,RED);cap.data.materials.append(WHITE)
for p in cap.data.polygons:
 c=p.center
 # mesh polygon centers need update, calculated from vertices instead
 c=sum((cap.data.vertices[i].co for i in p.vertices),Vector())/len(p.vertices)
 t=math.atan2(c.y,c.x)
 p.material_index=1 if abs(c.x)<abs(c.y)*1.4 else 0
# brim tailored flat oval slab
brim=uv('CAP_BRIM',(0,-12.4,87.0),(21,12.0,1.7),RED,128,32)
# cap front lettering supported by actual white panel
text('CAP_AOK_TEXT','A-OK',94.4,6.9,24.0,-14.5,BLACK)
# seam paths on dome
for j in range(6):
 t=2*pi*j/6+pi/6;pts=[]
 for k in range(1,25):
  a=(pi/2)*k/24;pts.append((21.03*sin(a)*cos(t),15.43*sin(a)*sin(t),87.6+14.03*cos(a)))
 tube('CAP_PANEL_SEAM',pts,.16,WHITE if j in [1,4] else RED)
# Headphone band: a broad ribbon seated on the cap, not a buried round tube.
vs=[];fs=[]
for i in range(97):
 x=-23+46*i/96
 for y,depth in [(0.0,.32),(3.6,.32),(3.6,-1.3),(0,-1.3)]:
  q=1-(x/21)**2-(y/15.4)**2
  z=87.6+14*sqrt(max(0,q)) if abs(x)<=21 else 87.6-(abs(x)-21)*1.5
  vs.append((x,y,z+depth))
for i in range(96):
 for j in range(4):a=i*4+j;b=i*4+(j+1)%4;fs.append((a,b,b+4,a+4))
fs.extend([(3,2,1,0),(384,385,386,387)])
mesh('HEADPHONE_BAND',vs,fs,BLACK)
for s in [-1,1]:
 uv('HEADPHONE_PAD',(s*20.7,.5,79),(3.5,7.7,9.2),BLACK)
 uv('HEADPHONE_CUP',(s*23.0,.5,79),(3.15,7.3,8.7),BLACK)
 # disks axes X (sphere for smooth bezels)
 uv('HEADPHONE_RED_BEZEL',(s*25.1,.5,79),(1.2,6.65,7.9),RED)
 uv('HEADPHONE_WHITE_DISC',(s*26.0,.5,79),(.6,5.2,6.25),WHITE)
 uv('HEADPHONE_RED_DISC',(s*26.4,.5,79),(.35,4.65,5.65),RED)
 uv('HEADPHONE_WHITE_CENTER',(s*26.7,.5,79),(.22,3.8,4.75),WHITE)
 for dy,dz in [(-.85,-1.2),(.85,-1.2),(-.85,1.2),(.85,1.2)]:
  uv('HEADPHONE_MARK',(s*26.87,.5+dy,79+dz),(.19,1.05,1.45),RED,32,16)
# Project letter relief onto the actual cap/chest surface; retain editable source curves.
textcol=bpy.data.collections.new('TYPOGRAPHY_EDITABLE_SOURCES');scene_tmp=bpy.context.scene;scene_tmp.collection.children.link(textcol);textcol.hide_render=True;textcol.hide_viewport=True
for src in list(base.objects):
 if src.type != 'FONT':continue
 ob=src.copy();ob.data=src.data.copy();base.objects.link(ob)
 for co in list(src.users_collection):co.objects.unlink(src)
 textcol.objects.link(src)
 bpy.ops.object.select_all(action='DESELECT');ob.select_set(True);bpy.context.view_layer.objects.active=ob
 bpy.ops.object.convert(target='MESH');ob=bpy.context.object
 bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
 bm=bmesh.new();bm.from_mesh(ob.data);bmesh.ops.triangulate(bm,faces=list(bm.faces));bmesh.ops.subdivide_edges(bm,edges=list(bm.edges),cuts=7,use_grid_fill=True);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(ob.data);bm.free()
 baseline=src.location.y
 for v in ob.data.vertices:
  x,y,z=v.co
  if src.name.startswith('CAP_'):
   q=max(.02,1-(x/21)**2-((z-87.6)/14)**2);surface=-15.4*sqrt(q)
   v.co.y=surface-.12+(y-baseline)
  else:
   rows=[(26,15.2,9.2),(30,16.3,10.2),(38,17,11.1),(46,16.1,10.5),(53,14,9.2),(57,11,8)]
   for aa,bb in zip(rows,rows[1:]):
    if aa[0]<=z<=bb[0]:
     t=(z-aa[0])/(bb[0]-aa[0]);w=aa[1]*(1-t)+bb[1]*t;d=aa[2]*(1-t)+bb[2]*t;break
   else:w,d=16,10
   surface=1-d*max(.02,1-(abs(x)/w)**3.2)**(1/3.2)
   depth=.52 if '_OUTLINE_' not in src.name else .0
   v.co.y=surface-.05-depth+(y-baseline)
 ob.name=src.name+'_RELIEF'
# Integrated eyelet: 4.6 mm designed clearance, 10.2 mm OD, 2.8 mm section.
eye=torus('EYELET',(0,1.8,104.3),3.7,1.4,METAL)
uv('EYELET_REINFORCED_BASE',(0,1.8,100.9),(4.4,3.7,2.1),RED)
# Do not allow band/base geometry to exceed nominal cap datum except attachment.
# Ring illustration, excluded from character export.
ring=torus('SPLIT_RING_PREVIEW',(0,2.5,126),13.5,.95,METAL);move(ring,'HARDWARE_PREVIEW')
for z,rot in [(111,(0,pi/2,0)),(115,(pi/2,0,0))]:
 o=torus('CHAIN_LINK_PREVIEW',(0,2,z),2.4,.65,METAL,rot,sc=(1,1,1.2));move(o,'HARDWARE_PREVIEW')
cols['HARDWARE_PREVIEW'].hide_render=True
# Reference images are packed and assigned to hidden reference objects.
for filename in ['01_original_character_reference.png','02_concept_spec_sheet_NOT_DIMENSION_AUTHORITY.png']:
 path=ROOT/'references'/filename
 if path.exists():
  img=bpy.data.images.load(str(path));img.pack();o=bpy.data.objects.new(filename,None);o.empty_display_type='IMAGE';o.data=img;cols['REFERENCE'].objects.link(o);o.hide_render=True;o.hide_viewport=True
# Scene, cameras and neutral studio.
scene=bpy.context.scene;scene.unit_settings.system='METRIC';scene.unit_settings.scale_length=.001;scene.unit_settings.length_unit='MILLIMETERS'
scene.render.engine='CYCLES';scene.cycles.samples=24 if PREVIEW else 48;scene.cycles.use_denoising=True
scene.render.resolution_x=1000;scene.render.resolution_y=1100;scene.render.resolution_percentage=100
scene.world.color=(.25,.25,.25);scene.view_settings.view_transform='AgX';scene.view_settings.look='AgX - Medium High Contrast'
world=scene.world;world.use_nodes=True;world.node_tree.nodes['Background'].inputs[0].default_value=(.65,.65,.65,1);world.node_tree.nodes['Background'].inputs[1].default_value=.5
floor=mat('STUDIO_FLOOR',(.77,.79,.81),.8)
bpy.ops.mesh.primitive_plane_add(size=2000,location=(0,0,-.08));o=bpy.context.object;o.name='STUDIO_FLOOR';o.data.materials.append(floor);move(o,'STUDIO')
def area(n,loc,power,size):
 data=bpy.data.lights.new(n,'AREA');data.energy=power;data.shape='DISK';data.size=size
 o=bpy.data.objects.new(n,data);cols['LIGHTS'].objects.link(o);o.location=loc;o.rotation_euler=(Vector((0,0,52))-o.location).to_track_quat('-Z','Y').to_euler()
area('KEY',(-90,-110,180),350000,110);area('FILL',(90,-60,105),200000,90);area('RIM',(10,100,140),400000,85)
def camera(n,loc,target=(0,0,53),scale=121):
 d=bpy.data.cameras.new(n);o=bpy.data.objects.new(n,d);cols['CAMERAS'].objects.link(o);o.location=loc;o.rotation_euler=(Vector(target)-o.location).to_track_quat('-Z','Y').to_euler();d.type='ORTHO';d.ortho_scale=scale;d.clip_end=5000;return o
cams={
 'front':camera('CAM_FRONT',(0,-250,53)),
 'rear':camera('CAM_REAR',(0,250,53)),
 'left':camera('CAM_LEFT',(-250,0,53)),
 'right':camera('CAM_RIGHT',(250,0,53)),
 'three_quarter':camera('CAM_HERO',(155,-260,125)),
 'top':camera('CAM_TOP',(0,0,300),(0,0,53),76),
 'bottom':camera('CAM_BOTTOM',(0,0,-200),(0,0,53),76),
 'eyelet_detail':camera('CAM_EYELET',(30,-100,125),(0,1,101),26),
 'keyring_mockup':camera('CAM_HARDWARE',(100,-250,120),(0,0,68),158)}
def render(n,cam):
 scene.camera=cam;scene.render.filepath=str(ROOT/'renders'/f'{n}.png');bpy.ops.render.render(write_still=True)
# Save editable scene before any expensive remesh.
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'blender'/'aok_ape_keychain_master.blend'))
if PREVIEW:
 render('preview_front',cams['front']);render('preview_three_quarter',cams['three_quarter'])
 print('PREVIEW_COMPLETE');sys.exit()
# Export and validation are performed by the separate finalize script after visual inspection.
print('EDITABLE_MASTER_COMPLETE')
