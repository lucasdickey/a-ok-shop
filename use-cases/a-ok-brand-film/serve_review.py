"""Local review server with HTTP byte ranges for native browser video seeking."""
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from pathlib import Path
import re,os
ROOT=Path(__file__).resolve().parent
class ReviewHandler(SimpleHTTPRequestHandler):
 def __init__(self,*args,**kwargs):super().__init__(*args,directory=str(ROOT),**kwargs)
 def end_headers(self):
  self.send_header('Accept-Ranges','bytes');super().end_headers()
 def send_head(self):
  self.byte_range=None
  raw=self.headers.get('Range');path=Path(self.translate_path(self.path))
  if not raw or not path.is_file():return super().send_head()
  m=re.fullmatch(r'bytes=(\d*)-(\d*)',raw.strip());size=path.stat().st_size
  if not m or not any(m.groups()):self.send_error(416);return None
  lo,hi=m.groups()
  if lo:start=int(lo);end=min(int(hi) if hi else size-1,size-1)
  else:start=max(0,size-int(hi));end=size-1
  if start>=size or start>end:
   self.send_response(416);self.send_header('Content-Range',f'bytes */{size}');self.end_headers();return None
  f=path.open('rb');f.seek(start);self.byte_range=(start,end)
  self.send_response(206);self.send_header('Content-Type',self.guess_type(str(path)));self.send_header('Content-Length',str(end-start+1));self.send_header('Content-Range',f'bytes {start}-{end}/{size}');self.send_header('Last-Modified',self.date_time_string(path.stat().st_mtime));self.end_headers();return f
 def copyfile(self,source,outputfile):
  if self.byte_range is None:return super().copyfile(source,outputfile)
  left=self.byte_range[1]-self.byte_range[0]+1
  while left:
   chunk=source.read(min(left,65536))
   if not chunk:break
   outputfile.write(chunk);left-=len(chunk)
if __name__=='__main__':
 print(f'Serving {ROOT} at http://127.0.0.1:8840',flush=True)
 ThreadingHTTPServer(('127.0.0.1',8840),ReviewHandler).serve_forever()
