"""Verify packaged source/data integrity and a local arithmetic/safety smoke test."""
from pathlib import Path
import hashlib,json
import keto_core as k
root=Path(__file__).resolve().parents[3]
manifest=json.loads((root/'runtime_manifest.json').read_text())
for item in manifest['files']:
    path=(root/item['path']).resolve()
    if root not in path.parents or not path.is_file():raise RuntimeError('Missing or unsafe path: '+item['path'])
    if hashlib.sha256(path.read_bytes()).hexdigest()!=item['sha256']:raise RuntimeError('Checksum mismatch: '+item['path'])
c=k.load_catalog();assert len(c['foods'])==78 and len(c['recipes'])==72
r=k.calculate_recipe(c,'B01');assert r['nutrition']['energy_kcal']>0
assert not k.screen_profile(k.default_profile('smoke-test'))['can_plan']
s=k.new_state('smoke-test','synthetic-owner',True);assert k.parse_state_document(k.canonical(s))['state_revision']==0
print(json.dumps({'status':'passed','files_verified':len(manifest['files']),'foods':len(c['foods']),'recipes':len(c['recipes']),'catalog_hash':c['catalog_hash'],'engine_version':k.ENGINE_VERSION,'scope':'runtime arithmetic and screening smoke only; no Google or clinical validation'},ensure_ascii=False))
