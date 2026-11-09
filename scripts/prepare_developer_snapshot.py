"""Deterministic, source-only developer image context. No credentials or QA logs."""
from __future__ import annotations
import argparse,gzip,hashlib,io,json,subprocess,tarfile
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
EDITABLE=('cloudflare-saas/public/app.css','cloudflare-saas/public/help.html','cloudflare-saas/public/developer-extension.js')
ROOT_FILES={'requirements.txt','requirements-dev.txt','pytest.ini','pyproject.toml','setup.cfg','conftest.py'}
PREFIXES=('service/','library/','tests/','scripts/','cloudflare-saas/','ui-sdk/','developer-runtime/')
EXCLUDED={'node_modules','.git','.private','.venv','__pycache__','.pytest_cache','dist','generated','build','.cache'}
GENERATED={'developer-runtime/release.json','cloudflare-saas/src/embedded-assets.mjs','cloudflare-saas/public/app.bundle.js','cloudflare-saas/public/style.css','cloudflare-saas/public/knowledge-data.js','service/static/app.bundle.js'}
SUFFIXES={'.py','.mjs','.cjs','.js','.json','.css','.html','.sql','.toml','.txt','.yaml','.yml','.md','.svg','.png','.webp','.ico','.webmanifest','.csv','.ts'}
PUBLIC_REFERENCE_FILES={'library/skills/keto-menu/data/usda-reference/usda-sr-legacy-normalized.json.gz'}
def permitted(name):
    p=Path(name)
    return not p.is_absolute() and not any(x in EXCLUDED or x.startswith('.') or x in ('qa','data-private','health') for x in p.parts) and name not in GENERATED and (name in ROOT_FILES or name.startswith(PREFIXES)) and (p.suffix in SUFFIXES or name in PUBLIC_REFERENCE_FILES) and not any(word in p.name.lower() for word in ('credential','token-state','local.settings','firebase-admin','service-account'))
def prepare(output,generated):
    candidates=subprocess.run(['git','ls-files','--cached','--others','--exclude-standard','-z'],cwd=ROOT,capture_output=True,check=True).stdout.decode().split('\0')
    names=set()
    for name in candidates:
        if not name or not permitted(name):continue
        path=ROOT/name
        if path.is_symlink():raise ValueError('Symlink in source snapshot: '+name)
        if path.is_file():names.add(name)
    entries=[]
    for name in sorted(names):
        data=(ROOT/name).read_bytes();entries.append({'path':name,'sha256':hashlib.sha256(data).hexdigest(),'bytes':len(data)})
    baseline=hashlib.sha256(json.dumps(entries,separators=(',',':')).encode()).hexdigest()
    manifest={'schema':'keto-developer-snapshot-v1','baseline':baseline,'files':entries,'sources':[{'path':p,'sha256':hashlib.sha256((ROOT/p).read_bytes()).hexdigest(),'content':(ROOT/p).read_text()} for p in EDITABLE]}
    if sum(len(s['content'].encode()) for s in manifest['sources'])>120000:raise ValueError('Model source bound')
    output.mkdir(parents=True,exist_ok=True);(output/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
    raw=io.BytesIO()
    with tarfile.open(fileobj=raw,mode='w',format=tarfile.USTAR_FORMAT) as archive:
        for row in entries:
            data=(ROOT/row['path']).read_bytes();info=tarfile.TarInfo(row['path']);info.size=len(data);info.mode=0o444;info.mtime=0;archive.addfile(info,io.BytesIO(data))
        # Public Firebase config is intentionally public build input, the only QA exception.
        data=(ROOT/'qa/firebase-public-config.json').read_bytes();info=tarfile.TarInfo('qa/firebase-public-config.json');info.size=len(data);info.mode=0o444;archive.addfile(info,io.BytesIO(data))
    with (output/'source.tar.gz').open('wb') as f:
        with gzip.GzipFile(fileobj=f,mode='wb',mtime=0,filename='') as zipped:zipped.write(raw.getvalue())
    generated.parent.mkdir(parents=True,exist_ok=True)
    generated.write_text('export const developerSnapshot='+json.dumps({'baseline':baseline,'sources':manifest['sources']},ensure_ascii=False,separators=(',',':'))+';\n')
    return {'baseline':baseline,'files':len(entries),'archive_sha256':hashlib.sha256((output/'source.tar.gz').read_bytes()).hexdigest()}
if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--output',type=Path,default=ROOT/'developer-runtime/build');p.add_argument('--generated',type=Path,default=ROOT/'cloudflare-saas/generated/developer-snapshot.mjs');a=p.parse_args();print(json.dumps(prepare(a.output,a.generated)))
