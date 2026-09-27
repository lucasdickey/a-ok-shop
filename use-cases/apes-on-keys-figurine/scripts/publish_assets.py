from pathlib import Path
import os,json,subprocess,hashlib,re,urllib.request
root=Path(__file__).resolve().parents[1];repo=root.parents[1]
env=os.environ.copy()
if not env.get('BLOB_READ_WRITE_TOKEN'):
 raise SystemExit('Set BLOB_READ_WRITE_TOKEN for the shop Blob store before publishing.')
env.pop('VERCEL_OIDC_TOKEN',None);env.pop('BLOB_STORE_ID',None)
manifest=root/'ASSETS.json'
data=json.loads(manifest.read_text()) if manifest.exists() else {'version':1,'store':'a-ok-shop-figure-assets','storeId':'store_5GhiACaWDPWX1CYI','access':'public','prefix':'apes-on-keys-figurine/r03/2026-09-27','assets':[]}
base='aok-reconstruction-r03/'
paths=[base+'collateral/AOK_WIP_Clay_to_Paint_Poster.png',base+'collateral/AOK_WIP_Painted_Orbit_Poster.png',base+'collateral/AOK_WIP_Painted_Orbit.mp4',base+'collateral/AOK_WIP_Clay_to_Paint.mp4',base+'outputs/AOK_R03_Painted_Globular_Orbit.mp4',base+'outputs/AOK_R03_Clay_Globular_Orbit.mp4',base+'AOK_WIP_Sales_Collateral.zip']
paths += [str(p.relative_to(root)) for p in sorted((root/base/'renders').glob('painted_orbit_*.png'))]
paths += [base+'collateral/AOK_WIP_Video_Edit.blend',base+'outputs/R03_painted_globular_animation.blend',base+'outputs/R03_clay_globular_animation.blend']
if '--archive' in __import__('sys').argv: paths=['.remote-cache/AOK_Figure_Project_2026-09-27.zip']
for rel in paths:
 p=root/rel
 digest=hashlib.file_digest(p.open('rb'),'sha256').hexdigest()
 old=next((a for a in data['assets'] if a['path']==rel and a['sha256']==digest),None)
 if old: print('Already uploaded:',rel,flush=True);continue
 pathname=data['prefix']+'/'+p.name
 r=subprocess.run(['vercel','blob','put',str(p),'--access','public','--pathname',pathname,'--multipart','true'],cwd=repo,env=env,capture_output=True,text=True)
 if r.returncode: raise RuntimeError(r.stderr[-1200:])
 urls=re.findall(r'https://[^\s\x1b]+\.public\.blob\.vercel-storage\.com/[^\s\x1b]+',r.stdout+r.stderr)
 if not urls: raise RuntimeError('No Blob URL returned for '+rel)
 url=urls[-1]
 with urllib.request.urlopen(urllib.request.Request(url,method='HEAD'),timeout=60) as r:
  n=int(r.headers['Content-Length'])
  if n!=p.stat().st_size: raise RuntimeError('Remote size mismatch: '+rel)
 item={'path':rel,'url':url,'bytes':p.stat().st_size,'sha256':digest}
 data['assets']=[a for a in data['assets'] if a['path']!=rel]+[item]
 if '--archive' in __import__('sys').argv: data['archive']=item
 manifest.write_text(json.dumps(data,indent=2)+'\n')
 print('Uploaded and verified:',rel,p.stat().st_size,flush=True)
