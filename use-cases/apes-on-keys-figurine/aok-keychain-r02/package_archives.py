"""Bundle only current release files, with per-archive hashes and integrity checks."""
from pathlib import Path
import hashlib,json,zipfile
ROOT=Path(__file__).resolve().parent
q=json.loads((ROOT/'qa/independent_export_validation.json').read_text());assert q['cross_format_geometry_match']
a=json.loads((ROOT/'qa/saved_master_validation.json').read_text());assert a['saved_blend_matches_export_metrics']
files=[p for p in ROOT.rglob('*') if p.is_file() and not p.name.endswith(('.blend1','.pyc')) and '__pycache__' not in p.parts and p.name not in ['MANIFEST.sha256','archive_validation.json']]
manifest=lambda fs: '\n'.join(hashlib.sha256(p.read_bytes()).hexdigest()+'  '+p.relative_to(ROOT).as_posix() for p in sorted(fs))+'\n'
(ROOT/'MANIFEST.sha256').write_text(manifest(files))
shop=[p for p in files if p.relative_to(ROOT).parts[0] in ['exports','renders','references','qa','comparison'] or p.name in ['README.md','PRINT_SHOP_REQUEST.md','PROPORTION_COMPARISON.md','PROPORTION_COMPARISON.html','AOK_Prototype_Specification_R02.pdf']]
results=[]
for name,fs in [('AOK_Print_Shop_Prototype_R02.zip',shop),('AOK_Blender_Full_Source_R02.zip',files)]:
 archive=ROOT.parent/name
 with zipfile.ZipFile(archive,'w',zipfile.ZIP_DEFLATED,compresslevel=6) as z:
  for p in sorted(fs):z.write(p,'AOK_R02/'+p.relative_to(ROOT).as_posix())
  z.writestr('AOK_R02/MANIFEST.sha256',manifest(fs))
 with zipfile.ZipFile(archive) as z:
  assert z.testzip() is None
  lines=z.read('AOK_R02/MANIFEST.sha256').decode().splitlines()
  for line in lines:
   sha,rel=line.split('  ',1);assert hashlib.sha256(z.read('AOK_R02/'+rel)).hexdigest()==sha
  results.append({'name':name,'files':len(z.namelist()),'bytes':archive.stat().st_size,'sha256':hashlib.sha256(archive.read_bytes()).hexdigest(),'zip_crc_and_internal_hashes':'PASS'})
(ROOT.parent/'AOK_R02_Archive_Validation.json').write_text(json.dumps(results,indent=2));print(json.dumps(results,indent=2))
