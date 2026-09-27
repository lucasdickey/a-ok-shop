"""Paint the approved R03 mesh. Base vertices remain unchanged; graphics are conformal paint overlays."""
import bpy,bmesh,numpy as np,math,json,hashlib,sys
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parent
bpy.ops.wm.open_mainfile(filepath=str(ROOT/'outputs/R03_experimental_reconstruction.blend'))
o=bpy.data.objects['R03_EXPERIMENTAL_LIKENESS_NOT_PRINT_APPROVED'];o.name='R03_APPROVED_FORM_PAINT_PREVIEW'
me=o.data
coords=np.empty(len(me.vertices)*3,dtype=np.float32);me.vertices.foreach_get('co',coords);coords=coords.reshape(-1,3)
basehash=hashlib.sha256(coords.tobytes()).hexdigest()
# Classify dense existing surface faces into editable paint materials.
loops=np.empty(len(me.loops),dtype=np.int32);me.loops.foreach_get('vertex_index',loops)
centers=np.empty(len(me.polygons)*3,dtype=np.float32);me.polygons.foreach_get('center',centers);centers=centers.reshape(-1,3);x,y,z=centers.T;a=np.abs(x)
normals=np.empty(len(me.polygons)*3,dtype=np.float32);me.polygons.foreach_get('normal',normals);normals=normals.reshape(-1,3)
materials=[]
def material(name,color,rough=.6,cloth=False,metal=0):
 m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True;n=m.node_tree.nodes;p=n.get('Principled BSDF');p.inputs['Base Color'].default_value=(*color,1);p.inputs['Roughness'].default_value=rough;p.inputs['Metallic'].default_value=metal
 if cloth:
  tex=n.new('ShaderNodeTexNoise');tex.inputs['Scale'].default_value=75;tex.inputs['Detail'].default_value=2
  coord=n.new('ShaderNodeTexCoord');m.node_tree.links.new(coord.outputs['Generated'],tex.inputs['Vector'])
  bump=n.new('ShaderNodeBump');bump.inputs['Strength'].default_value=.14;bump.inputs['Distance'].default_value=.055;m.node_tree.links.new(tex.outputs['Fac'],bump.inputs['Height']);m.node_tree.links.new(bump.outputs['Normal'],p.inputs['Normal'])
  p.inputs['Sheen Weight'].default_value=.12
 materials.append(m);return len(materials)-1
RED=material('01 Hoodie | vermilion red',(.40,.003,.009),.76,True)
FUR=material('02 Fur and pocketed hands | charcoal',(.012,.015,.019),.8,True)
PANT=material('03 Pants | washed black',(.021,.024,.029),.84,True)
TAN=material('04 Face | warm tan',(.52,.255,.12),.65)
WHITE=material('05 Cap and sneaker panels | warm white',(.83,.82,.77),.65,True)
BLACK=material('06 Black graphics and trim',(.006,.007,.009),.55)
EYE=material('07 Eye whites | satin ivory',(.91,.9,.84),.22)
IRIS=material('08 Iris | amber brown',(.18,.068,.023),.21)
PUPIL=material('09 Pupils | gloss black',(.0015,.002,.003),.13)
GLINT=material('10 Eye catchlights',(.98,.98,.97),.17)
MOUTH=material('11 Mouth and nostril shadows',(.038,.009,.006),.72)
TONGUE=material('12 Tongue | muted rose',(.36,.095,.065),.43)
HRED=material('13 Headphone and sneaker red',(.5,.003,.009),.38)
HWHITE=material('14 Headphone white inset',(.86,.85,.81),.4)
METAL=material('15 Zipper | brushed silver',(.4,.43,.46),.32,False,.75)
LACE=material('16 Laces and printed outline | ivory',(.91,.89,.82),.68)
me.materials.clear()
for m in materials:me.materials.append(m)
ids=np.full(len(centers),PANT,dtype=np.int32)
# Clothing: keep sculpted folds and tucked hands intact.
hood_bottom=27.6-.045*a-.04*np.maximum(y,0)
ids[z>hood_bottom]=RED
head_low=62.3+.17*a+.40*np.maximum(y+4,0)
head=(z>head_low)&(z>62.3)
ids[head]=FUR
# Paint the sculpted brow mask and muzzle, clipped to front of head.
tan_eye=(((a-4.6)/5.05)**2+((z-81.7)/5.65)**2<1)
tan_muzzle=((x/7.15)**2+((z-71.25)/8.0)**2<1)
ids[head&(y<-3.5)&(tan_eye|tan_muzzle)]=TAN
# Sculpted eye recesses: layers of paint follow their actual curved surface.
e=((a-4.65)/2.17)**2+((z-81.35)/2.33)**2
ids[(e<1)&(y<0)]=EYE
ir=((a-4.62)/1.38)**2+((z-81.16)/1.49)**2
ids[(ir<1)&(y<0)]=IRIS
ids[(((a-4.62)/.89)**2+((z-81.16)/1.0)**2<1)&(y<0)]=PUPIL
for s in [-1,1]:
 ids[(((x-(s*4.65-.43))/.28)**2+((z-81.8)/.32)**2<1)&(y<0)]=GLINT
 ids[(((x-(s*4.65+.4))/.105)**2+((z-80.7)/.12)**2<1)&(y<0)]=GLINT
nostril=(((a-.83)/.47)**2+((z-77.55)/.49)**2<1)&(y<-8)
ids[nostril]=MOUTH
mouth=((x/2.02)**2+((z-69.1)/2.30)**2<1)&(y>-10.3)&(y<2)
ids[mouth]=MOUTH
ids[mouth&(z<68.35)&(z>67.45)&(np.abs(x)<1.32)]=TONGUE
# Cap crown, bill and central front panel. Rear panels alternate white/red.
cap=head&(z>88.6-.21*y-.017*x*x)
ids[cap]=HRED
angle=np.arctan2(x,5-y)
white_cap=cap&(np.abs(angle)<.85)&(z>90.65-.025*x*x)&(y>-11.0)
ids[white_cap]=WHITE
ids[cap&(y>9)&(a>5)&(a<12.5)&(z<98)]=WHITE
# Button remains red; headphone arch is black.
ids[(z>100.2)]=HRED
ids[(y<1)&(z>88.9-.024*a*a)&(z<91.5)&~white_cap]=HRED
band=(z>84)&(y>1.2)&(y<10.0)&head
ids[band]=BLACK
ids[(z>100.2)&(a<2.1)]=HRED
# Existing headphone cup surfaces, with concentric painted rings.
hr=((y-4.9)/7.65)**2+((z-78.55)/7.4)**2
cup=(a>14.0)&(hr<1.23)&head
ids[cup]=BLACK
ids[cup&(a>18.4)&(hr<.94)]=HRED
ids[cup&(a>19.1)&(hr<.63)]=BLACK
ids[cup&(a>19.4)&(hr<.48)]=HWHITE
for cy,cz in [(4.22,77.65),(5.58,77.65),(4.22,79.45),(5.58,79.45)]:
 mark=((y-cy)/.86)**2+((z-cz)/1.05)**2<1
 ids[cup&(a>19.5)&mark]=HRED
# Exposed sliver of the hands where cuffs meet pocket openings.
hand=((a-(18.1-.37*(z-36)))/1.0)**2+((z-35.8)/3.35)**2<1
ids[hand&(y<-4.5)]=FUR
# Sneakers: red outsole / white midsole / panelled uppers.
shoe=z<11.55
ids[shoe]=HRED
ids[shoe&(z>1.15)&(z<2.75)]=WHITE
ids[shoe&(z>3.0)&(y>-15)&(y<4.5)]=WHITE
local=a-(13.5+.11*np.maximum(-y-8,0))
ids[shoe&(z>4.5)&(np.abs(local)<3.65)&(y<-4)]=BLACK
# White toe box with red perimeter.
ids[shoe&(z>2.75)&(y<-12.5)]=HRED
ids[shoe&(z>4.7)&(y<-11.5)&(normals[:,2]>.32)&((local/5.3)**2+((y+15.3)/4.5)**2<1)]=WHITE
ids[shoe&(z>6.7)&(np.abs(local)<3.5)&(y<-4)]=BLACK
# Red heel and ankle collar, with black collar rim.
ids[shoe&(y>3.4)&(z>3)]=HRED
ids[shoe&(z>10.3)]=BLACK
# Laces painted across the tongue, conforming to the existing sculpt.
for height in [7.05,8.05,9.05,10.05]:
 lace=(np.abs(z-(height+.09*local))<.24)&(np.abs(local)<3.2)&(y<-4.3)&shoe
 ids[lace]=LACE
# Shoe side black diagonal panel, leaving the white quarter visible.
ids[shoe&(z>3.2)&(z<9.5)&(np.abs(y-(-3.0-1.25*(z-5)))<1.45)&(np.abs(local)>3.4)]=BLACK
# Jacket center zipper, metallic teeth, and ribbed hem paint.
zipper=(a<.21)&(z>28.1)&(z<59)&(y<-5.5)
ids[zipper]=BLACK
ids[zipper&(np.abs((z*2.8)%1-.5)<.25)]=METAL
# Smooth antialiasing of the paint boundaries across existing vertices.
facecolors=np.array([m.diffuse_color[:] for m in materials],dtype=np.float32)[ids]
lengths=np.empty(len(me.polygons),dtype=np.int32);me.polygons.foreach_get('loop_total',lengths)
loopcolors=np.repeat(facecolors,lengths,axis=0)
vc=np.zeros((len(me.vertices),4),dtype=np.float32);counts=np.zeros(len(me.vertices),dtype=np.float32)
np.add.at(vc,loops,loopcolors);np.add.at(counts,loops,1);vc/=np.maximum(counts[:,None],1)
attr=me.color_attributes.new(name='Paint_RGBA',type='FLOAT_COLOR',domain='POINT');attr.data.foreach_set('color',vc.ravel())
for i,mat in enumerate(materials):
 base_mat=mat.copy();base_mat.name=mat.name+' | surface paint';me.materials[i]=base_mat
 attrnode=base_mat.node_tree.nodes.new('ShaderNodeVertexColor');attrnode.layer_name='Paint_RGBA';base_mat.node_tree.links.new(attrnode.outputs['Color'],base_mat.node_tree.nodes['Principled BSDF'].inputs['Base Color'])
me.polygons.foreach_set('material_index',ids)
print('MATERIAL_COUNTS',[(materials[i].name,int((ids==i).sum())) for i in range(len(materials))],flush=True)
# True conformal type overlays (offsets 0.09–0.19 mm for stable display), not a replacement render.
paintcol=bpy.data.collections.new('PAINT_GRAPHICS_CONFORMAL_OVERLAYS');bpy.context.scene.collection.children.link(paintcol)
font=bpy.data.fonts.load('/System/Library/Fonts/Supplemental/Arial Black.ttf')
def lettering(name,word,zcenter,height,width,mat,offset=0,depth=.035):
 cu=bpy.data.curves.new(name,'FONT');cu.body=word;cu.font=font;cu.size=1;cu.resolution_u=12;cu.shear=.12 if name.startswith('Hoodie') else 0
 ob=bpy.data.objects.new(name,cu);paintcol.objects.link(ob);cu.materials.append(materials[mat]);bpy.context.view_layer.update()
 box=[Vector(v) for v in ob.bound_box];lo=Vector((min(v.x for v in box),min(v.y for v in box),0));hi=Vector((max(v.x for v in box),max(v.y for v in box),0));mid=(lo+hi)/2;sx=width/(hi.x-lo.x);sz=height/(hi.y-lo.y);cu.offset=offset
 bpy.ops.object.select_all(action='DESELECT');ob.select_set(True);bpy.context.view_layer.objects.active=ob;bpy.ops.object.convert(target='MESH');ob=bpy.context.object
 bm=bmesh.new();bm.from_mesh(ob.data);bmesh.ops.triangulate(bm,faces=list(bm.faces));bmesh.ops.subdivide_edges(bm,edges=list(bm.edges),cuts=12,use_grid_fill=True);bm.to_mesh(ob.data);bm.free()
 for v in ob.data.vertices:
  px=(v.co.x-mid.x)*sx;pz=(v.co.y-mid.y)*sz+zcenter;hit,loc,norm,index=o.ray_cast(Vector((px,-100,pz)),Vector((0,1,0)))
  v.co=(px,loc.y-depth if hit else -5,pz)
 for p in ob.data.polygons:p.use_smooth=True
 ob['purpose']='Conformal paint graphic; not structural geometry'
 return ob
for word,zc,h,w in [('APES',50.5,6.6,23.4),('ON',45.4,2.8,6.8),('KEYS',40.0,6.6,24.0)]:
 lettering('Hoodie outline '+word,word,zc,h,w,LACE,.022,.09)
 lettering('Hoodie ink '+word,word,zc,h,w,BLACK,0,.19)
lettering('Cap ink A-OK','A-OK',94.0,5.35,18.1,BLACK,0,.12)
# Store provenance and validate that the approved base coordinates are unchanged.
check=np.empty(len(me.vertices)*3,dtype=np.float32);me.vertices.foreach_get('co',check)
assert hashlib.sha256(check.tobytes()).hexdigest()==basehash
scene=bpy.context.scene;scene.cycles.samples=48;scene.render.resolution_percentage=100
scene.camera=bpy.data.objects['Three-quarter']
bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.context.view_layer.objects.active=o
for screen in bpy.data.screens:
 for area in screen.areas:
  if area.type=='VIEW_3D':
   area.spaces.active.shading.type='MATERIAL';area.spaces.active.region_3d.view_perspective='CAMERA'
scene['Appearance status']='Paint preview on user-approved R03 shape; manufacturing engineering pending'
scene['Base vertex SHA256']=basehash
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'outputs/R03_painted_preview.blend'))
(ROOT/'outputs/PAINT_STATUS.json').write_text(json.dumps({'status':'appearance preview','approved_base_geometry_changed':False,'base_vertex_sha256':basehash,'paint':'Editable surface materials and conformal lettering overlays','not_manufacturing_release':True},indent=2))
views={'front':'Front','three_quarter':'Three-quarter','rear':'Rear','side':'Side','face_detail':'Face'}
if '--draft' in sys.argv:
 scene.cycles.samples=20;scene.render.resolution_percentage=70;views={'front':'Front','three_quarter':'Three-quarter'}
for key,cam in views.items():
 scene.camera=bpy.data.objects[cam];scene.render.filepath=str(ROOT/'renders'/('painted_'+key+'.png'));bpy.ops.render.render(write_still=True)
print('PAINT_PREVIEW_COMPLETE',flush=True)
