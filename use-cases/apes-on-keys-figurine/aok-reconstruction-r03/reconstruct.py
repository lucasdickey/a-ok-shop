"""Local reference-conditioned geometry experiment; not fabrication-approved."""
import os,sys,time,json
from pathlib import Path
ROOT=Path(__file__).resolve().parent
TOOLING=Path(os.environ.get('AOK_TOOLING_DIR', str(ROOT.parent/'tooling')))
os.environ['PYTORCH_ENABLE_MPS_FALLBACK']='1'
os.environ['HF_HOME']=str(TOOLING/'huggingface-cache')
os.environ['HF_HUB_DISABLE_TELEMETRY']='1'
os.environ['HF_HUB_DISABLE_XET']='1'
sys.path.insert(0,str(TOOLING/'Hunyuan3D-2'))
import numpy as np
from PIL import Image
import cv2
from scipy.ndimage import binary_fill_holes
im=Image.open(ROOT/'inputs/segmented_conditioning.png').convert('RGBA')
print('INPUT',im.size,'rembg alpha; original RGB unchanged',flush=True)
import torch
print('TORCH',torch.__version__,'MPS',torch.backends.mps.is_available(),flush=True)
from hy3dgen.shapegen import Hunyuan3DDiTFlowMatchingPipeline
start=time.time()
pipe=Hunyuan3DDiTFlowMatchingPipeline.from_pretrained('tencent/Hunyuan3D-2mini',subfolder='hunyuan3d-dit-v2-mini',device='mps',dtype=torch.float16,use_safetensors=True)
print('MODEL_LOADED',time.time()-start,flush=True)
# Modest initial resolution tests actual geometry/likeness before texture or print work.
latent_path=ROOT/'outputs/shape_latents.pt'
if latent_path.exists():
 latents=torch.load(latent_path,map_location='cpu',weights_only=True).to('mps')
else:
 latents=pipe(image=im,num_inference_steps=30,guidance_scale=5.0,generator=torch.Generator(device='cpu').manual_seed(29),output_type='latent')
 torch.save(latents.cpu(),latent_path)
print('LATENTS_READY',time.time()-start,flush=True)
pipe.model.to('cpu');pipe.conditioner.to('cpu');torch.mps.empty_cache()
pipe.vae.enable_flashvdm_decoder(enabled=True,adaptive_kv_selection=False,mc_algo='mc')
mesh=pipe._export(latents,octree_resolution=512,num_chunks=4000,mc_algo='mc')[0]
mesh.export(ROOT/'outputs/reference_conditioned_raw.glb');mesh.export(ROOT/'outputs/reference_conditioned_raw.ply')
meta={'status':'experimental geometry; not approved for printing','model':'tencent/Hunyuan3D-2mini','subfolder':'hunyuan3d-dit-v2-mini','device':'mps','seed':29,'steps':30,'octree_resolution':512,'vertices':len(mesh.vertices),'faces':len(mesh.faces),'bounds':mesh.bounds.tolist(),'elapsed_seconds':time.time()-start,'input_method':'Unmodified source RGB pixels; main-figure crop and rembg alpha mask only. No raster image generation.'}
(ROOT/'outputs/reconstruction_metadata.json').write_text(json.dumps(meta,indent=2));print('RECONSTRUCTION_COMPLETE',meta,flush=True)
