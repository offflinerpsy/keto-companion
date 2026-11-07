"""Parent build step: pinned OFL fonts, never an application runtime download."""
from pathlib import Path
import argparse,hashlib,urllib.request
REVISION='ffebf8c1ee449e544955a7e813c54f9b73848eac'
FILES={'NotoSans-Regular.ttf':'b85c38ecea8a7cfb39c24e395a4007474fa5a4fc864f6ee33309eb4948d232d5','NotoSans-Bold.ttf':'c976e4b1b99edc88775377fcc21692ca4bfa46b6d6ca6522bfda505b28ff9d6a'}
def main():
 p=argparse.ArgumentParser();p.add_argument('--directory',default='runtime-fonts');p.add_argument('--download',action='store_true');args=p.parse_args();directory=Path(args.directory)
 for name,digest in FILES.items():
  target=directory/name
  if args.download and not target.exists():
   url=f'https://raw.githubusercontent.com/notofonts/noto-fonts/{REVISION}/hinted/ttf/NotoSans/{name}'
   with urllib.request.urlopen(url,timeout=25) as r:data=r.read(1000001)
   if hashlib.sha256(data).hexdigest()!=digest:raise SystemExit('Font checksum mismatch')
   directory.mkdir(parents=True,exist_ok=True);target.write_bytes(data)
  if not target.is_file() or hashlib.sha256(target.read_bytes()).hexdigest()!=digest:raise SystemExit('Missing or mismatched font: '+name)
 print('Pinned OFL regular/bold fonts verified; keep runtime font directory out of Git.')
if __name__=='__main__':main()
