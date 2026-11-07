"""Deploy existing Azure KETO application from a committed source checkpoint."""
from pathlib import Path
import json,subprocess,tempfile,zipfile,hashlib,datetime
ROOT=Path(__file__).resolve().parents[1]
AZ='/opt/homebrew/bin/az';GROUP='rg-keto-companion';APP='keto-companion-ay-20261107'
def run(args,timeout=60):
 p=subprocess.run(args,cwd=ROOT,capture_output=True,text=True,timeout=timeout)
 if p.returncode:raise RuntimeError('Command failed: '+args[0]+' '+args[1]+'; '+p.stderr[:400])
 return p.stdout
commit=run(['git','rev-parse','HEAD']).strip()
if run(['git','diff','--name-only']).strip():raise RuntimeError('Tracked source must be committed before deployment')
account=json.loads(run([AZ,'account','show','--query','{id:id}','-o','json']))
if account['id']!='c446448a-67ca-4c67-9f95-e74b41f3c247':raise RuntimeError('Unexpected Azure subscription')
public=json.loads((ROOT/'docs/evidence/AZURE_EDGE_PUBLIC_KEY.json').read_text());assert 'd' not in public and public['crv']=='Ed25519'
settings={'KETO_EDGE_PUBLIC_JWK':json.dumps(public,separators=(',',':')),'KETO_SOURCE_COMMIT':commit}
with tempfile.NamedTemporaryFile(mode='w',suffix='.json',delete=False) as f:json.dump(settings,f);p=Path(f.name)
try:run([AZ,'functionapp','config','appsettings','set','-g',GROUP,'-n',APP,'--settings','@'+str(p),'-o','none'])
finally:p.unlink(missing_ok=True)
archive=ROOT/'deploy/function-compute.zip'
with zipfile.ZipFile(archive,'w',zipfile.ZIP_DEFLATED,strict_timestamps=False) as z:
 for folder in ['service','library']:
  for path in (ROOT/folder).rglob('*'):
   if path.is_file() and not any(x in path.parts for x in ['__pycache__','.pytest_cache','server']) and path.suffix not in ['.pyc','.sqlite','.db']:z.write(path,path.relative_to(ROOT))
 for path in ['function_app.py','host.json','requirements.txt']:z.write(ROOT/path,path)
receipt={'task':'KETO-COMPUTE-004','source_commit':commit,'azure_app':APP,'archive_sha256':hashlib.sha256(archive.read_bytes()).hexdigest(),'public_key_only_transferred':True,'personal_state_migration':False}
(ROOT/'qa/azure-compute-release-pending.json').write_text(json.dumps(receipt,indent=2))
raw=run([AZ,'functionapp','deployment','source','config-zip','-g',GROUP,'-n',APP,'--src',str(archive),'--build-remote','true','--timeout','600','--only-show-errors','-o','json'],timeout=660)
d=json.loads(raw);receipt.update({'status':d.get('status'),'complete':d.get('complete'),'deployment_id':d.get('id'),'checked_at':datetime.datetime.now(datetime.timezone.utc).isoformat()})
(ROOT/'docs/evidence/AZURE_COMPUTE_DEPLOYMENT.json').write_text(json.dumps(receipt,indent=2)+'\n');print(json.dumps(receipt))
