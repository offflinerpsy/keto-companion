"""Export/check actual API and UI inventories for AI-assisted changes.
No cloud credentials or existing state are read. Azure tool schemas/OpenAPI are
imported in a sanitized subprocess with a throwaway local test store. Worker
routes are a source inventory, NOT a generated complete HTTP validation schema.
"""
from __future__ import annotations
import argparse,ast,hashlib,json,os,re,sqlite3,subprocess,sys,tempfile
from collections import Counter
from html.parser import HTMLParser
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'docs/contracts'
class Markup(HTMLParser):
    def __init__(self):super().__init__();self.items=[]
    def handle_starttag(self,tag,attrs):
        a=dict(attrs)
        if any(k in a for k in ('id','data-testid','data-page','data-view','name')):
            self.items.append({'tag':tag,**{k:a[k] for k in ('id','name','type','data-testid','data-page','data-view','aria-describedby','aria-label') if k in a}})
def encoded(x):return json.dumps(x,ensure_ascii=False,sort_keys=True,indent=2)+'\n'
def digest(name):return hashlib.sha256((ROOT/name).read_bytes()).hexdigest()
def generate():
    with tempfile.TemporaryDirectory(prefix='keto-contracts-') as temp:
        env={k:v for k,v in os.environ.items() if not k.startswith(('KETO_','AZURE_','WEBSITE_','IDENTITY_','MSI_'))}
        env.update(KETO_ENV='test',KETO_AUTH_MODE='local_test',KETO_LOCAL_DB=str(Path(temp)/'fixture.sqlite'),PYTHONDONTWRITEBYTECODE='1')
        code="from service.app import app,TOOLS,MOBILE_HTTP_TOOLS;import json;print(json.dumps({'tools':TOOLS,'mobile_http_tools':sorted(MOBILE_HTTP_TOOLS),'openapi':app.openapi()},ensure_ascii=False))"
        p=subprocess.run([sys.executable,'-c',code],cwd=ROOT,env=env,capture_output=True,text=True,timeout=20,check=True)
        data=json.loads(p.stdout)
    sources={path:digest(path) for path in ['service/app.py','cloudflare-saas/src/worker.mjs','cloudflare-saas/src/compute.mjs','cloudflare-saas/public/index.html','cloudflare-saas/public/routes.js','cloudflare-saas/public/app.css']}
    html=Markup();html.feed((ROOT/'cloudflare-saas/public/index.html').read_text())
    duplicates=[k for k,v in Counter(x['id'] for x in html.items if 'id' in x).items() if v>1]
    if duplicates:raise ValueError('Duplicate DOM identifiers: '+', '.join(duplicates))
    routes=(ROOT/'cloudflare-saas/public/routes.js').read_text()
    match=re.search(r'export const ROUTES=(\[[^;]+\]);',routes);assert match
    pages=ast.literal_eval(match[1]);css=(ROOT/'cloudflare-saas/public/app.css').read_text()
    tokens={selector:dict(re.findall(r'(--[\w-]+)\s*:\s*([^;}]+)',body)) for selector,body in re.findall(r'(:root|body\.dark|body\.light)\s*\{([^}]+)\}',css)}
    compute=(ROOT/'cloudflare-saas/src/compute.mjs').read_text();ops=re.search(r'export const OPS=\{([^}]+)\}',compute);assert ops
    mapping=dict(re.findall(r"(keto_\w+):'([^']+)'",ops[1]))
    worker=(ROOT/'cloudflare-saas/src/worker.mjs').read_text()
    direct=sorted(set(re.findall(r"path===['\"]([^'\"]+)['\"]",worker)))
    db=sqlite3.connect(':memory:');migrations=[]
    for f in sorted((ROOT/'cloudflare-saas/migrations').glob('*.sql')):
        db.executescript(f.read_text());migrations.append({'path':str(f.relative_to(ROOT)),'sha256':hashlib.sha256(f.read_bytes()).hexdigest()})
    tables=[]
    for (name,) in db.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"):
        columns=[{'name':row[1],'type':row[2],'not_null':bool(row[3]),'default':row[4],'primary_key_order':row[5]} for row in db.execute('PRAGMA table_info('+name+')')]
        fks=[{'table':row[2],'from':row[3],'to':row[4],'on_update':row[5],'on_delete':row[6]} for row in db.execute('PRAGMA foreign_key_list('+name+')')]
        tables.append({'table':name,'columns':columns,'foreign_keys':fks})
    db.close()
    policy=json.loads((ROOT/'service/data/kitchen_policy.json').read_text())
    output={
      'tool-schemas.json':{'schema':'keto-tool-inventory-v1','source':'service/app.py','source_sha256':sources['service/app.py'],'notice':'The listed Azure schemas are not a promise that all tools are exposed through every client. Cloudflare applies its own session/CSRF/operation map; UI-only capabilities remain mandatory.','mobile_http_only':data['mobile_http_tools'],'tools':data['tools']},
      'azure-openapi.json':data['openapi'],
      'ui-contracts.json':{'schema':'keto-ui-contract-v1','source_files':sources,'routes':pages,'static_elements':html.items,'css_tokens':tokens,'notice':'Static markup only. Additional DOM elements are constructed by setup-ui.js, kitchen-ui.js and mobile-ui.js; see design handoff. Preserve ids, data attributes and event contracts during redesign.'},
      'worker-api-inventory.json':{'schema':'keto-worker-inventory-v1','source_sha256':sources['cloudflare-saas/src/worker.mjs'],'direct_route_paths':direct,'tool_path':'/api/tools/{name}','tool_operations':mapping,'notice':'Inventory from literal routes and OPS, not full OpenAPI. Dynamic admin/source/upload/deletion routes and all authorization conditions must be read in source.'},
      'database-schema.json':{'schema':'keto-d1-schema-v1','migrations':migrations,'tables':tables,'notice':'Actual SQLite-compatible D1 migration result; no user data or database connection.'},
      'kitchen-capabilities.json':{'schema':'keto-kitchen-capabilities-v1','policy_version':policy['version'],'source_sha256':digest('service/data/kitchen_policy.json'),'equipment':policy['equipment'],'method_ids':[x['id'] for x in policy['methods']],'limits':policy['limits'],'USDA_food_count':len(json.loads((ROOT/'library/skills/keto-menu/data/foods.json').read_text())),'reference_recipe_count':len(json.loads((ROOT/'library/skills/keto-menu/data/recipes.json').read_text())),'notice':'Equipment options do not imply possession by each user; generated recipe variants are not reference recipe count or kitchen-tested dishes.'}
    }
    developer=(ROOT/'cloudflare-saas/src/developer-policy.mjs').read_text()
    media=(ROOT/'cloudflare-saas/src/image-link.mjs').read_text()
    editable=ast.literal_eval(re.search(r'export const EDITABLE=(\[[^;]+\]);',developer)[1])
    stages=ast.literal_eval(re.search(r'export const TEST_STAGES=(\[[^;]+\]);',developer)[1])
    hosts=ast.literal_eval(re.search(r'export const IMAGE_HOSTS=(\[[^;]+\]);',media)[1])
    output['developer-media-contract.json']={'schema':'keto-developer-media-v1','version':'0.7.0-dev-media-pilot','source_hashes':{p:digest(p) for p in ['cloudflare-saas/src/developer.mjs','cloudflare-saas/src/developer-policy.mjs','cloudflare-saas/src/image-link.mjs','service/developer.py','developer-runtime/runner.py','developer-runtime/worker.mjs']},'developer':{'role':'server-derived admin, active session, CSRF on writes','editable_files':editable,'max_files':3,'max_utf8_bytes':60000,'task_chars':2000,'max_jobs_day':3,'max_output_tokens':5000,'state_to_model':None,'fixed_test_stages':stages,'receipt_bindings':['baseline','patch_hash','image_digest'],'service_binding':'DEVELOPER_RUNNER','artifact_prefix':'developer/','ttl_hours_max':24,'preview':'private same-session artifact, opaque sandbox, synthetic data, network CSP','publication':'separate_verified_release; no broker or publish endpoint'},'images':{'public_hosts':hosts,'scheme':'https','port':443,'max_redirects':2,'network_timeout_seconds':8,'fetch_bytes_max':4194304,'sanitizer_input_bytes_max':1000000,'larger_images':'upload file for local compression','mime':['image/jpeg','image/png','image/webp','image/gif'],'consent':'processing, storage and health; revision/session rechecked','saved_on_link_fetch':False,'dns_rebinding_scope':'conservative fixed host allowlist plus all A/AAAA validation; not universal image URL fetching'}}
    return {name:encoded(value) for name,value in output.items()}
def main():
    parser=argparse.ArgumentParser();parser.add_argument('--check',action='store_true');args=parser.parse_args()
    outputs=generate();OUT.mkdir(parents=True,exist_ok=True);bad=[]
    for name,value in outputs.items():
        path=OUT/name
        if args.check:
            if not path.exists() or path.read_text()!=value:bad.append(name)
        else:path.write_text(value)
    print(json.dumps({'mode':'check' if args.check else 'export','files':sorted(outputs),'passed':not bad,'drift':bad,'no_cloud_or_user_state':True}))
    return 1 if bad else 0
if __name__=='__main__':raise SystemExit(main())
