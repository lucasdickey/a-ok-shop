from pathlib import Path
from PIL import Image
import numpy as np
from rembg import remove,new_session
p=Path(__file__).resolve().parent.parent;r=p/'aok-reconstruction-r03/inputs'
a=np.array(Image.open(p/'aok-keychain-r02/references/01_original_character_reference.png').convert('RGB'));a[:,750:]=0;a[1040:,650:]=0
im=Image.fromarray(a).crop((16,86,766,1464))
res=remove(im,session=new_session('u2net'));res.save(r/'segmented_conditioning.png')
bg=Image.new('RGBA',res.size,(245,245,245,255));bg.alpha_composite(res);bg.convert('RGB').save(r/'segmented_preview.jpg');print('SEGMENTATION_COMPLETE',flush=True)
