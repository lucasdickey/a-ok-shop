from pathlib import Path
import hashlib,json,zipfile,time
root=Path(__file__).resolve().parents[1]
cache=root/'.remote-cache';cache.mkdir(exist_ok=True)
files=[]
for p in sorted(root.rglob('*')):
 rel=p.relative_to(root)
 if not p.is_file() or p.is_symlink() or any(x in rel.parts for x in ['tooling','.remote-cache','__pycache__']) or p.name in ('.DS_Store','ASSETS.json','ARCHIVE_CONTENTS.json'): continue
 files.append(p)
inventory=[]
archive=cache/'AOK_Figure_Project_2026-09-27.zip'
if archive.exists(): raise SystemExit('Archive already exists. Use a new dated release filename for a new snapshot.')
with zipfile.ZipFile(archive,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=3,allowZip64=True) as z:
 for p in files:
  rel=p.relative_to(root).as_posix()
  h=hashlib.file_digest(p.open('rb'),'sha256').hexdigest()
  inventory.append({'path':rel,'bytes':p.stat().st_size,'sha256':h})
  z.write(p,rel)
  if p.stat().st_size>30000000: print('Archived',rel,flush=True)
 z.writestr('ARCHIVE_CONTENTS.json',json.dumps(inventory,indent=2)+'\n')
(root/'ARCHIVE_CONTENTS.json').write_text(json.dumps(inventory,indent=2)+'\n')
print(json.dumps({'files':len(files),'source_bytes':sum(f['bytes'] for f in inventory),'archive_bytes':archive.stat().st_size,'archive_sha256':hashlib.file_digest(archive.open('rb'),'sha256').hexdigest()}),flush=True)
