"""Second face-paint pass: procedural surface paint only, no vertex or topology edits."""
import bpy,numpy as np,hashlib,json,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parent
bpy.ops.wm.open_mainfile(filepath=str(ROOT/'outputs/R03_painted_preview.blend'))
o=bpy.data.objects['R03_APPROVED_FORM_PAINT_PREVIEW'];me=o.data
co=np.empty(len(me.vertices)*3,dtype=np.float32);me.vertices.foreach_get('co',co);before=hashlib.sha256(co.tobytes()).hexdigest()
mat=bpy.data.materials.new('FACE PAINT 02 | continuous detail');mat.use_nodes=True;nodes=mat.node_tree.nodes;nodes.clear();links=mat.node_tree.links
# Small scalar-expression builder. Everything stays editable in native Blender nodes.
def put(val,socket):
 if isinstance(val,(int,float,tuple,list)):socket.default_value=val
 else:links.new(val,socket)
def mathn(op,*args):
 n=nodes.new('ShaderNodeMath');n.operation=op
 for i,v in enumerate(args):put(v,n.inputs[i])
 return n.outputs[0]
def add(a,b):return mathn('ADD',a,b)
def sub(a,b):return mathn('SUBTRACT',a,b)
def mul(a,b):return mathn('MULTIPLY',a,b)
def div(a,b):return mathn('DIVIDE',a,b)
def sq(a):return mul(a,a)
def absn(a):return mathn('ABSOLUTE',a)
def clamp(a):return mathn('MINIMUM',mathn('MAXIMUM',a,0),1)
def smooth(a):
 q=clamp(a);return mul(sq(q),sub(3,mul(2,q)))
def below(d,edge=1,soft=.025):return smooth(div(sub(edge,d),soft))
def mix(f,a,b):
 n=nodes.new('ShaderNodeMixRGB');n.blend_type='MIX';put(f,n.inputs[0]);put(a,n.inputs[1]);put(b,n.inputs[2]);return n.outputs[0]
def rgb(r,g,b):return (r,g,b,1)
def vec(x,y,z):
 n=nodes.new('ShaderNodeCombineXYZ')
 for s,v in zip(n.inputs,(x,y,z)):put(v,s)
 return n.outputs[0]
def noise(v,scale=1,detail=2):
 n=nodes.new('ShaderNodeTexNoise');put(v,n.inputs['Vector']);n.inputs['Scale'].default_value=scale;n.inputs['Detail'].default_value=detail;n.inputs['Roughness'].default_value=.65;return n.outputs['Fac']
def ellipse(dx,dz,rx,rz):return mathn('SQRT',add(sq(div(dx,rx)),sq(div(dz,rz))))
tex=nodes.new('ShaderNodeTexCoord');sep=nodes.new('ShaderNodeSeparateXYZ');links.new(tex.outputs['Object'],sep.inputs[0]);x,y,z=[sep.outputs[k] for k in ['X','Y','Z']];a=absn(x)
# Continuous fur flow and soft-edged tan fields remove the polygon-shaped paint edges.
flow=vec(add(mul(x,13),mul(sub(z,77),mul(x,.045))),mul(y,5),mul(z,.8))
furnoise=noise(flow,2.5,3)
fur=mix(furnoise,rgb(.007,.009,.012),rgb(.028,.032,.038))
eye_dx=sub(a,4.60);eye_dz=sub(z,81.7)
eyemask=below(ellipse(eye_dx,eye_dz,5.05,5.65),1,.045)
muzzle_d=ellipse(x,sub(z,71.25),7.15,8.0);muzzle=below(muzzle_d,1,.035)
skinmask=mathn('MAXIMUM',mathn('MAXIMUM',eyemask,muzzle),below(ellipse(x,sub(z,78.1),2.2,2.1),1,.15))
skin=mix(below(muzzle_d,.96,.6),rgb(.39,.174,.070),rgb(.55,.288,.142))
# Warm shading around eye sockets, with a narrow painted eyelid and tear rim.
dx=sub(a,4.65);dz=sub(z,81.35);eye_r=ellipse(dx,dz,2.36,2.53)
orbital=mul(below(eye_r,1.85,.65),sub(1,below(eye_r,1.14,.10)))
skin=mix(mul(orbital,.35),skin,rgb(.19,.066,.023))
lid_light=mul(below(eye_r,1.32,.08),sub(1,below(eye_r,1.16,.07)))
skin=mix(mul(lid_light,.16),skin,rgb(.57,.294,.14))
lid=mul(below(eye_r,1.085,.055),sub(1,below(eye_r,.985,.035)))
skin=mix(lid,skin,rgb(.255,.104,.043))
# Muzzle contour shading, central philtrum and fine creases in the painted finish.
lip_r=ellipse(x,sub(z,69.1),2.04,2.30)
lip_shadow=mul(below(lip_r,1.53,.20),sub(1,below(lip_r,1.05,.06)))
skin=mix(mul(lip_shadow,.42),skin,rgb(.30,.105,.046))
lip_high=mul(below(lip_r,1.28,.075),sub(1,below(lip_r,1.13,.06)))
skin=mix(mul(lip_high,.22),skin,rgb(.64,.335,.174))
philtrum=mul(below(absn(x),.10,.07),mul(smooth(div(sub(z,72),.5)),smooth(div(sub(77.1,z),.65))))
skin=mix(mul(philtrum,.3),skin,rgb(.22,.077,.029))
chin=mul(below(absn(x),.075,.05),mul(smooth(sub(z,63.8)),smooth(sub(66.65,z))))
skin=mix(mul(chin,.24),skin,rgb(.24,.091,.036))
crease_z=sub(69.25,mul(sub(a,2.1),.11));crease=mul(below(absn(sub(z,crease_z)),.095,.08),mul(smooth(sub(a,2.2)),smooth(sub(5.2,a))))
skin=mix(mul(crease,.35),skin,rgb(.24,.09,.035))
# Fine pores add tonal variation without changing silhouette.
pores=noise(tex.outputs['Object'],18,2)
skin=mix(mul(pores,.08),skin,rgb(.30,.12,.05))
color=mix(skinmask,fur,skin)
# Sculpted nose: elongated tilted nostrils, warm rims, and a softly lit bridge.
ndx=sub(a,1.0);ndz=sub(z,77.55)
nu=add(mul(ndx,.86),mul(ndz,.50));nv=add(mul(ndx,-.50),mul(ndz,.86));nr=ellipse(nu,nv,.46,.69)
nose_rim=below(nr,1.40,.3)
color=mix(mul(nose_rim,.65),color,rgb(.27,.095,.034))
nostril=below(nr,1,.10)
color=mix(nostril,color,rgb(.045,.012,.005))
bridge=below(ellipse(x,sub(z,78.50),1.2,.5),1,.65)
color=mix(mul(bridge,.24),color,rgb(.68,.374,.20))
# Eyes: continuous ivory sclera, limbal ring, radial iris fibers, pupils and catchlights.
sclera=below(eye_r,.99,.025)
eye_shade=clamp(mul(eye_r,.22));ivory=mix(eye_shade,rgb(.87,.84,.76),rgb(.57,.50,.40))
color=mix(sclera,color,ivory)
ir_dx=sub(a,4.60);ir_dz=sub(z,81.16);ir=ellipse(ir_dx,ir_dz,1.53,1.64)
limbal=below(ir,1.04,.025);color=mix(limbal,color,rgb(.034,.012,.005))
angle=mathn('ARCTAN2',ir_dz,ir_dx)
fibers=add(mul(mathn('SINE',add(mul(angle,71),mul(noise(vec(mul(ir_dx,5),mul(ir_dz,5),0),3),6))),.32),.5)
fibers=clamp(add(fibers,mul(mathn('SINE',add(mul(angle,117),mul(ir,21))),.15)))
iris=mix(fibers,rgb(.075,.023,.006),rgb(.29,.128,.037))
outer=below(ir,.97,.22);iris=mix(outer,rgb(.035,.011,.003),iris)
collar=mul(below(ir,.69,.08),sub(1,below(ir,.53,.05)));iris=mix(mul(collar,.45),iris,rgb(.35,.162,.047))
color=mix(below(ir,.97,.025),color,iris)
pupil=below(ellipse(ir_dx,ir_dz,.86,.96),1,.025);color=mix(pupil,color,rgb(.0015,.002,.003))
# Separate left/right catchlights maintain consistent studio-light direction.
catch=0
for sign in [-1,1]:
 c=below(ellipse(sub(x,sign*4.65-.43),sub(z,81.84),.29,.33),1,.15)
 c2=below(ellipse(sub(x,sign*4.65+.40),sub(z,80.73),.11,.12),1,.2)
 catch=mathn('MAXIMUM',catch,mathn('MAXIMUM',c,c2))
color=mix(catch,color,rgb(.97,.97,.94))
# Dark oral cavity and a softly rounded tongue painted on its existing inner wall.
inside=mul(below(lip_r,1.045,.06),smooth(div(add(y,10.3),.5)))
color=mix(inside,color,rgb(.024,.004,.002))
tonguer=ellipse(x,sub(z,68.15),1.42,.80);tongue=mul(inside,below(tonguer,1,.15))
tonguecol=mix(below(tonguer,.94,.9),rgb(.39,.095,.066),rgb(.70,.29,.22))
tonguegroove=mul(below(absn(x),.065,.05),below(absn(sub(z,68.22)),.48,.3));tonguecol=mix(mul(tonguegroove,.3),tonguecol,rgb(.20,.031,.02))
color=mix(tongue,color,tonguecol)
# One coherent shader prevents roughness seams at old face-material borders.
bs=nodes.new('ShaderNodeBsdfPrincipled');links.new(color,bs.inputs['Base Color']);put(add(.22,mul(sub(1,sclera),.46)),bs.inputs['Roughness']);bs.inputs['Specular IOR Level'].default_value=.30
bump=nodes.new('ShaderNodeBump');put(mix(skinmask,furnoise,pores),bump.inputs['Height']);put(add(.008,mul(sub(1,skinmask),.027)),bump.inputs['Distance']);put(mul(sub(1,sclera),.24),bump.inputs['Strength']);links.new(bump.outputs['Normal'],bs.inputs['Normal'])
out=nodes.new('ShaderNodeOutputMaterial');links.new(bs.outputs[0],out.inputs['Surface'])
# Restrict this pass to existing frontal face/fur polygons; clothing/cap/graphics are untouched.
centers=np.empty(len(me.polygons)*3,dtype=np.float32);me.polygons.foreach_get('center',centers);centers=centers.reshape(-1,3);px,py,pz=centers.T
ids=np.empty(len(me.polygons),dtype=np.int32);me.polygons.foreach_get('material_index',ids)
region=(np.isin(ids,[1,3,6,7,8,9,10,11]))&(pz>62)&(pz<89)&(py<2)&(np.abs(px)<14)
me.materials.append(mat);ids[region]=len(me.materials)-1;me.polygons.foreach_set('material_index',ids)
check=np.empty(len(me.vertices)*3,dtype=np.float32);me.vertices.foreach_get('co',check);assert hashlib.sha256(check.tobytes()).hexdigest()==before
scene=bpy.context.scene;scene.camera=bpy.data.objects['Three-quarter'];scene.cycles.samples=48;scene.render.resolution_percentage=100
scene['Face paint version']='02: continuous paint, detailed irises, shaded skin, nose and mouth'
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'outputs/R03_face_paint_v2.blend'))
(ROOT/'outputs/FACE_PAINT_V2_STATUS.json').write_text(json.dumps({'base_geometry_changed':False,'vertex_sha256':before,'face_polygons_repainted':int(region.sum()),'method':'Native procedural Blender surface shader; no added or modified geometry','scope':'Face paint only','manufacturing_release':False},indent=2))
views={'face_detail':'Face','three_quarter':'Three-quarter','front':'Front','side':'Side','rear':'Rear'}
if '--draft' in sys.argv:views={'face_detail':'Face','three_quarter':'Three-quarter'};scene.cycles.samples=24
for key,cam in views.items():
 scene.camera=bpy.data.objects[cam];scene.render.filepath=str(ROOT/'renders'/('face_v2_'+key+'.png'));bpy.ops.render.render(write_still=True)
print('FACE_PAINT_V2_COMPLETE',flush=True)
