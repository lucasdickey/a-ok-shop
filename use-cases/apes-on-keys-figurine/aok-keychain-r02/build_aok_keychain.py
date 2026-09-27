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

# Reference-proportioned R02; all coordinates mm.
from mathutils.bvhtree import BVHTree

def surface_tree(o):
 bpy.context.view_layer.update();dg=bpy.context.evaluated_depsgraph_get();ev=o.evaluated_get(dg);me=ev.to_mesh()
 tree=BVHTree.FromPolygons([ev.matrix_world@v.co for v in me.vertices],[list(p.vertices) for p in me.polygons]);ev.to_mesh_clear();return tree

for s in [-1,1]:
 x=s*13.0
 for n,rows,m in [
 ('OUTSOLE',[(0,8.9,13.7,-3),(.3,9.8,14.5,-3),(1.1,9.8,14.5,-3),(1.4,9.6,14.3,-3)],RED),
 ('MIDSOLE',[(1,9.6,14.3,-3),(1.3,9.9,14.5,-3),(2.7,9.8,14.4,-3),(3,9.5,14.1,-3)],WHITE),
 ('UPPER',[(2.6,9.4,13.8,-3),(3.4,9.6,13.7,-3),(5.5,9.3,13,-3),(7,8.4,11.5,-2),(9.5,6.8,8.6,0),(13.2,6.2,6.9,1.5),(14.1,5.9,6.5,1.8)],RED)]:
  o=subdiv(loft('SHOE_'+str(s)+'_'+n,rows,m,3.1),1);o.location.x=x
 upper=o;tree=surface_tree(upper)
 # Thin toe leather follows upper surface, rather than a bulbous separate toe.
 vs=[];fs=[];N=48
 for rr in [0,.25,.5,.75,1]:
  for j in range(N):
   t=2*pi*j/N;xx=x+7.7*rr*cos(t);yy=-14.0+2.8*rr*sin(t)
   hit=tree.ray_cast(Vector((xx,yy,25)),Vector((0,0,-1)))[0]
   vs.append((xx,yy,(hit.z if hit else 5)+.12))
 for k in range(4):
  for j in range(N):a=k*N+j;b=k*N+(j+1)%N;fs.append((a,b,b+N,a+N))
 patch=mesh('SHOE_TOE_WHITE',vs,fs,WHITE);sol=patch.modifiers.new('Leather thickness','SOLIDIFY');sol.thickness=.45
 # Tongue slopes visibly upward to ankle; rows of laces follow that slope.
 tv=[];tf=[]
 for k in range(13):
  yy=-12.6+k*.8
  for j in range(9):
   xx=x+(j/8*2-1)*(4.5-k*.045);hit=tree.ray_cast(Vector((xx,yy,25)),Vector((0,0,-1)))[0];tv.append((xx,yy,hit.z+.18))
 for k in range(12):
  for j in range(8):aa=k*9+j;tf.append((aa,aa+1,aa+10,aa+9))
 tongue=mesh('SHOE_TONGUE',tv,tf,BLACK);sol=tongue.modifiers.new('Leather thickness','SOLIDIFY');sol.thickness=.7
 for k in range(6):
  yy=-11.8+k*1.3;pts=[]
  for j in range(9):
   xx=x-4.05+j*1.0125;y=yy+.45*(1-j/4)*(-1 if k%2 else 1);hit=tree.ray_cast(Vector((xx,y,25)),Vector((0,0,-1)))[0];pts.append((xx,y,hit.z+.5))
  tube('SHOE_LACE',pts,.32,WHITE)
 for side in [-1,1]:
  # Conforming side leather patch, cast from lateral direction.
  outline=[(-7,4),(5.8,4),(6.6,9.5),(3,11),(-3,8)]
  pv=[]
  for yy,zz in outline:
   hit=tree.ray_cast(Vector((x+side*30,yy,zz)),Vector((-side,0,0)))[0]
   pv.append((hit.x+side*.1,yy,zz) if hit else (x+side*6,yy,zz))
  panel=mesh('SHOE_SIDE_WHITE',pv,[(0,1,2,3,4)],WHITE);sol=panel.modifiers.new('Leather thickness','SOLIDIFY');sol.thickness=.6
  pts=[]
  for yy,zz in [(-5,6.7),(-2.5,5.4),(1,6.8),(5.3,9)]:
   hit=tree.ray_cast(Vector((x+side*30,yy,zz)),Vector((-side,0,0)))[0]
   if hit:pts.append((hit.x+side*.4,yy,zz))
  tube('SHOE_RED_SIDE_MARK',pts,.53,RED)
 # Straight, loose trousers with a slight outward fall.
 rows=[(11.3,7.3,7.1,.8),(12.5,8.0,7.5,.8),(15.5,8.2,7.7,.7),(19.5,8.0,8,.8),(23.5,8.8,8.6,1),(28.5,9.3,9,1),(32,9.2,8.8,1)]
 leg=subdiv(loft('PANTS_LEG',rows,PANTS,2.6),2);leg.location.x=s*10.7
 cuff=subdiv(loft('PANTS_CUFF',[(11.4,7.4,7.2,.8),(11.8,8,7.7,.8),(13.6,8,7.7,.8),(14,7.7,7.5,.8)],PANTS,2.8),1);cuff.location.x=s*10.7
 for k in range(3):
  z=15+k*4
  tube('PANTS_FOLD',[(s*10.7-6,-4,z+.6),(s*10.7-2,-7,z),(s*10.7+4,-6.4,z+.6)],.25,PANTS)
uv('PANTS_HIPS',(0,1,28.5),(15,9,7),PANTS)
body=subdiv(loft('HOODIE_BODY',[(26.8,18,10.6,1),(27.4,18.8,11,1),(31,19.7,12.7,1),(41,19.6,13.7,1),(52,17.4,12,1),(58.4,13.5,9,1),(62,8,6.5,1)],RED,3.0),2)
waist=subdiv(loft('HOODIE_WAISTBAND',[(26.2,18,10.6,1),(26.6,18.8,11.5,1),(29.4,19,11.7,1),(29.8,18.8,11.5,1)],RED,3),1)
bodytree=surface_tree(body)
for j in range(108):
 t=2*pi*j/108;c=cos(t);ss=sin(t);x=18.85*math.copysign(abs(c)**(2/3),c);y=1+11.55*math.copysign(abs(ss)**(2/3),ss)
 tube('WAIST_RIB',[(x,y,26.7),(x,y,29.4)],.13,SEAM)
for s in [-1,1]:
 capsule('SLEEVE_UPPER',(s*15.5,0,57.5),(s*23.2,-.5,40.5),6.1,7.3,RED)
 capsule('SLEEVE_FOREARM',(s*23.2,-1,40.5),(s*20,-8,36.8),5.2,6.0,RED)
 # Ribbed cuff is a slanted band around the wrist, mostly tucked into pocket.
 axis=Vector((-s*.65,-.7,.22)).normalized()
 center=Vector((s*20,-8.5,36.9))
 cuff=torus('SLEEVE_CUFF',center,3.3,.8,RED);rot=axis.to_track_quat('Z','Y');cuff.rotation_euler=rot.to_euler()
 uv('TUCKED_HAND_FUR',center+axis*.7,(2.7,2.3,3.1),FUR)
 for j in range(28):
  t=2*pi*j/28;local=Vector((3.45*cos(t),3.45*sin(t),0));c=center+rot@local
  tube('CUFF_RIB',[c-axis*.75,c+axis*.65],.13,SEAM)
 pocket=[]
 for xx,zz in [(s*14.2,42),(s*16.8,37.2),(s*18.2,32)]:
  hit=bodytree.ray_cast(Vector((xx,-50,zz)),Vector((0,1,0)))[0]
  if hit:pocket.append((xx,hit.y-.12,zz))
 tube('POCKET_LIP',pocket,.48,RED)
 for k in range(3):tube('SLEEVE_FOLD',[(s*18.8,-5.8,46+k*2),(s*22,-6.3,43+k*2),(s*24,-4.5,43+k*2)],.22,RED)
uv('HOOD_BACK',(0,6,62),(17.0,9.2,7.6),RED)
for s in [-1,1]:
 # Folded fabric panels taper toward the V below the chin.
 pv=[(s*15,0,65),(s*14,-6,64),(s*10,-10,61.5),(s*3,-11.8,58.5),(s*14,-2,60),(s*12,-8,59),(s*7,-10.9,57.6),(s*2,-11.6,57.8)]
 panel=mesh('HOOD_COLLAR',pv,[(0,1,5,4),(1,2,6,5),(2,3,7,6)],RED);sol=panel.modifiers.new('Fold thickness','SOLIDIFY');sol.thickness=2.2;subdiv(panel,2)
 tube('HOOD_ROLLED_EDGE',[(0,14,68.4),(s*13.8,8,67),(s*16.6,1,64.7),(s*12.6,-7,62.3),(s*3,-11.9,58.5)],.85,RED)
 tube('DRAWSTRING',[(s*4.7,-12.0,61.4),(s*5,-12.5,59.8),(s*4.5,-12.7,58)],.33,RED)
 uv('DRAWSTRING_ANCHOR',(s*4.7,-12,61.1),(.65,.35,.65),METAL,24,16)
 capsule('DRAWSTRING_TIP',(s*4.5,-12.7,58),(s*4.4,-12.7,57.2),.33,.35,METAL)
tube('HOOD_BACK_SEAM',[(0,15.1,64),(0,15.2,60),(0,12,56)],.18,SEAM)
# Seat strings, grommets and tips into the actual collar/body surface.
support_trees=[surface_tree(o) for o in list(base.objects) if o.name.startswith(('HOODIE_BODY','HOOD_BACK','HOOD_COLLAR','HOOD_ROLLED_EDGE'))]
def front_at(x,z):
 hits=[t.ray_cast(Vector((x,-50,z)),Vector((0,1,0)))[0] for t in support_trees]
 return min(h.y for h in hits if h is not None)
for o in list(base.objects):
 if not o.name.startswith('DRAWSTRING'):continue
 if o.type=='CURVE':
  for sp in o.data.splines:
   for pt in sp.bezier_points:pt.co.y=front_at(pt.co.x,pt.co.z)-.12
 else:o.location.y=front_at(o.location.x,o.location.z)-.1

bodytree=surface_tree(body)
pts=[]
for k in range(66):
 z=27+k*.5;hit=bodytree.ray_cast(Vector((0,-50,z)),Vector((0,1,0)))[0]
 if hit:
  pts.append((0,hit.y-.15,z))
  uv('ZIPPER_TOOTH',((.17 if k%2 else -.17),hit.y-.22,z),(.23,.25,.14),METAL,12,8)
tube('ZIPPER_TAPE',pts,.35,SEAM)
fontpath='/System/Library/Fonts/Supplemental/Arial Black.ttf';font=bpy.data.fonts.load(fontpath)
def text(n,word,z,height,width,y,material,outline=False):
 cu=bpy.data.curves.new(n,'FONT');cu.body=word;cu.align_x='CENTER';cu.align_y='CENTER';cu.size=height;cu.extrude=.23;cu.bevel_depth=.04;cu.bevel_resolution=2;cu.resolution_u=10;cu.font=font;cu.shear=.12 if n.startswith('HOODIE') else 0
 o=bpy.data.objects.new(n,cu);base.objects.link(o);cu.materials.append(material);o.rotation_euler=(pi/2,0,0);o.location=(0,y,z)
 bpy.context.view_layer.update();o.scale.x=width/max(o.dimensions.x,.1);o.scale.y=height/max(max(v[1] for v in o.bound_box)-min(v[1] for v in o.bound_box),.1)
 if outline:cu.offset=.16
 return o
for word,z,h,w in [('APES',54.1,7.3,24),('ON',48.8,3.1,7),('KEYS',43.5,7.3,25)]:
 text('HOODIE_TEXT_OUTLINE_'+word,word,z,h,w,0,WHITE,True);text('HOODIE_TEXT_'+word,word,z,h,w,0,BLACK)
head=uv('APE_FUR_HEAD',(0,0,80.5),(16.1,13.5,17),FUR,160,100)
for v in head.data.vertices:
 p=v.co;p.y*=1+.0025*sin(p.z*1.8+p.x*1.3)
for s in [-1,1]:
 uv('APE_EAR',(s*15.1,0,80),(3,2.7,4.8),FUR)
 uv('EYE_SURROUND',(s*4.2,-11.9,82.7),(4.9,3.1,5.3),TAN)
 uv('EYE_WHITE',(s*3.9,-14.65,81.7),(2.4,1.1,2.6),EYE)
 uv('EYE_IRIS',(s*3.9,-15.61,81.6),(1.7,.4,1.85),BROWN)
 uv('EYE_PUPIL',(s*3.9,-15.97,81.6),(1.05,.22,1.2),PUPIL)
 uv('EYE_CATCHLIGHT',(s*3.9-.33,-16.16,82.18),(.28,.1,.32),EYE,24,16)
 for upper in [True,False]:
  pts=[]
  for j in range(17):
   t=pi*j/16+(0 if upper else pi);pts.append((s*3.9+2.4*cos(t),-14.8,81.7+2.6*sin(t)))
  tube('EYELID',pts,.28,TANL)
# The tan face descends into a compact protruding muzzle.
muzzle=uv('APE_MUZZLE',(0,-15.3,71),(7.3,5.8,7.8),TANL,96,64)
cut=uv('MOUTH_CAVITY_CUT',(0,-20.8,70),(2.65,3.3,3.2),MOUTH,64,40);boolean(muzzle,cut)
uv('MOUTH_INTERIOR',(0,-17.9,70),(2.5,.9,3),MOUTH)
uv('TONGUE',(0,-18.8,67.8),(1.6,1,.7),TONGUE)
pts=[]
for j in range(65):
 t=2*pi*j/64;x=3.0*cos(t);z=70+3.5*sin(t);q=1-(x/7.3)**2-((z-71)/7.8)**2;pts.append((x,-15.3-5.8*sqrt(q)-.04,z))
tube('SOFT_LIP',pts,.4,TANL)
uv('NOSE_BRIDGE',(0,-16.8,78.3),(1.9,2,2.3),TANL)
for s in [-1,1]:
 nose=uv('NOSE_ALA',(s*1.2,-18.4,78),(1.55,1.65,1.5),TANL)
 cut=uv('NOSTRIL_CUT',(s*1.25,-19.85,78),(.65,.9,.72),MOUTH,32,24);boolean(nose,cut)
 uv('NOSTRIL_INTERIOR',(s*1.25,-19.25,78),(.54,.35,.61),MOUTH,24,16)
# Fur ridges flow down and out, shallow enough to survive finishing.
for s in [-1,1]:
 for k in range(140):
  z=random.uniform(65,90);x=s*random.uniform(8.7,15)
  if ((abs(x)-4.2)/5.2)**2+((z-83.2)/6.4)**2<1.1:continue
  pts=[]
  for dx,dz in [(0,0),(.2,-1.3),(.55,-2.7)]:
   xx=x+s*dx;zz=z+dz;q=1-(xx/16.1)**2-((zz-80.5)/17)**2
   if q<=.035:break
   pts.append((xx,-13.5*sqrt(q)+.1,zz))
  if len(pts)==3:tube('FUR_RELIEF',pts,.17,FUR)
# Cap: original 33 mm width, shallow bill and compact crown.
vs=[(0,0,101.6)];fs=[];N=128;R=28
for k in range(1,R+1):
 a=pi/2*k/R
 for j in range(N):
  t=2*pi*j/N;vs.append((16.5*sin(a)*cos(t),14*sin(a)*sin(t),89.9+11.7*cos(a)))
for j in range(N):fs.append((0,1+j,1+(j+1)%N))
for k in range(R-1):
 for j in range(N):a=1+k*N+j;b=1+k*N+(j+1)%N;fs.append((a,a+N,b+N,b))
fs.append(tuple(reversed([1+(R-1)*N+j for j in range(N)])))
cap=mesh('CAP_CROWN',vs,fs,RED);cap.data.materials.append(WHITE)
for p in cap.data.polygons:
 c=sum((cap.data.vertices[i].co for i in p.vertices),Vector())/len(p.vertices);p.material_index=1 if abs(c.x)<abs(c.y)*.95 else 0
brim=uv('CAP_BRIM',(0,-11.5,89.5),(16.5,10.2,1.15),RED,128,32)
for v in brim.data.vertices:v.co.z-=.8*(v.co.x/16.5)**2
text('CAP_AOK_TEXT','A-OK',95.1,5.5,19.2,0,BLACK)
for j in range(6):
 t=2*pi*j/6+pi/6;pts=[]
 for k in range(1,25):
  a=pi/2*k/24;pts.append((16.52*sin(a)*cos(t),14.02*sin(a)*sin(t),89.9+11.72*cos(a)))
 tube('CAP_PANEL_SEAM',pts,.12,WHITE if j in [1,4] else RED)
vs=[];fs=[]
for i in range(97):
 x=-17.6+35.2*i/96
 for y,depth in [(0,.25),(3,.25),(3,-1.05),(0,-1.05)]:
  q=1-(x/16.5)**2-(y/14)**2;z=89.9+11.7*sqrt(max(0,q)) if abs(x)<=16.5 else 89.9-(abs(x)-16.5)*3
  vs.append((x,y,z+depth))
for i in range(96):
 for j in range(4):a=i*4+j;b=i*4+(j+1)%4;fs.append((a,b,b+4,a+4))
fs.extend([(3,2,1,0),(384,385,386,387)]);mesh('HEADPHONE_BAND',vs,fs,BLACK)
for s in [-1,1]:
 for n,x,sc,m in [('PAD',15.75,(2.7,6.5,7.6),BLACK),('CUP',17.5,(2.4,6.2,7.2),BLACK),('RED_BEZEL',19.1,(.9,5.65,6.6),RED),('WHITE_DISC',19.75,(.46,4.4,5.25),WHITE),('RED_DISC',20.06,(.27,3.95,4.75),RED),('WHITE_CENTER',20.28,(.17,3.2,4),WHITE)]:uv('HEADPHONE_'+n,(s*x,.5,80.5),sc,m)
 for dy,dz in [(-.7,-1),(.7,-1),(-.7,1),(.7,1)]:uv('HEADPHONE_MARK',(s*20.4,.5+dy,80.5+dz),(.14,.85,1.15),RED,24,16)
# Project every relief vertex onto evaluated sculpture, retaining editable fonts.
textcol=bpy.data.collections.new('TYPOGRAPHY_EDITABLE_SOURCES');bpy.context.scene.collection.children.link(textcol);textcol.hide_render=True;textcol.hide_viewport=True
captree=surface_tree(cap)
for src in list(base.objects):
 if src.type!='FONT':continue
 ob=src.copy();ob.data=src.data.copy();base.objects.link(ob)
 for co in list(src.users_collection):co.objects.unlink(src)
 textcol.objects.link(src)
 bpy.ops.object.select_all(action='DESELECT');ob.select_set(True);bpy.context.view_layer.objects.active=ob;bpy.ops.object.convert(target='MESH');ob=bpy.context.object;bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
 bm=bmesh.new();bm.from_mesh(ob.data);bmesh.ops.triangulate(bm,faces=list(bm.faces));bmesh.ops.subdivide_edges(bm,edges=list(bm.edges),cuts=7,use_grid_fill=True);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(ob.data);bm.free()
 tree=captree if src.name.startswith('CAP_') else bodytree;depth=.0 if '_OUTLINE_' in src.name else .26
 for v in ob.data.vertices:
  x,y,z=v.co;hit=tree.ray_cast(Vector((x,-50,z)),Vector((0,1,0)))[0]
  if hit:v.co.y=hit.y-.025-depth+y
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
 'three_quarter':camera('CAM_HERO',(85,-300,106)),
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
