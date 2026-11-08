"""Check specification links, declared source/test paths and design inventories.
This is structural documentation validation, not proof of semantic completeness.
"""
from pathlib import Path
from urllib.parse import unquote,urlparse
import argparse,json,re,sys
ROOT=Path(__file__).resolve().parents[1]
REQUIRED=['README.md','PRODUCT.md','ARCHITECTURE.md','DATA_MODEL.md','API_AND_ACTIONS.md','AI_AND_MEMORY.md','NUTRITION_RULES.md','DESIGN_SYSTEM.md','SCREEN_MAP.md','USER_FLOWS.md','SECURITY_PRIVACY.md','QA_RELEASE.md','OPERATIONS.md','ROADMAP_AND_GAPS.md','RU_INDEX.md','requirement_matrix.json']
def main():
 errors=[];checked=0;link_count=0
 files=[ROOT/'docs/spec'/name for name in REQUIRED]+[ROOT/'docs/en/AI_DESIGN_HANDOFF.md',ROOT/'docs/ru/AI_DESIGN_HANDOFF.md']
 files+=list((ROOT/'docs/spec').glob('*.md'))
 for path in sorted(set(files)):
  if not path.is_file():errors.append({'path':str(path.relative_to(ROOT)),'error':'missing_required_file'});continue
  checked+=1
  if path.suffix!='.md':continue
  content=re.sub(r'```[\s\S]*?```','',path.read_text())
  for target in re.findall(r'(?<!!)\[[^\]]*\]\(([^)]+)\)',content):
   target=target.split(' "',1)[0].strip().strip('<>')
   if not target or target.startswith(('#','mailto:','https://','http://')):continue
   if '`' in target or '${' in target:continue
   relative=unquote(target.split('#',1)[0].split('?',1)[0]);resolved=(path.parent/relative).resolve();link_count+=1
   if not resolved.is_relative_to(ROOT):errors.append({'path':str(path.relative_to(ROOT)),'target':target,'error':'outside_repo'})
   elif not resolved.exists():errors.append({'path':str(path.relative_to(ROOT)),'target':target,'error':'broken_local_link'})
 matrix=ROOT/'docs/spec/requirement_matrix.json'
 if matrix.is_file():
  try:
   data=json.loads(matrix.read_text())
   def walk(value):
    if isinstance(value,dict):
     for key,val in value.items():
      if key in ('source','source_path','test_path','source_paths','test_paths','sources','tests','code_paths'):
       vals=val if isinstance(val,list) else [val]
       for x in vals:
        if isinstance(x,str):
         name=re.split(r'[#:]|::',x,1)[0]
         if name.startswith(('service/','cloudflare-saas/','library/','tests/','scripts/','docs/','.github/')) and not (ROOT/name).exists():errors.append({'path':str(matrix.relative_to(ROOT)),'target':x,'error':'matrix_path_missing'})
      walk(val)
    elif isinstance(value,list):
     for x in value:walk(x)
   walk(data)
  except ValueError:errors.append({'path':str(matrix.relative_to(ROOT)),'error':'invalid_json'})
 # The source route inventory must stay represented in the human screen map.
 contract=ROOT/'docs/contracts/ui-contracts.json';screen=ROOT/'docs/spec/SCREEN_MAP.md'
 if contract.is_file() and screen.is_file():
  routes=json.loads(contract.read_text())['routes'];text=screen.read_text()
  for route in routes:
   if route not in text:errors.append({'path':'docs/spec/SCREEN_MAP.md','route':route,'error':'route_not_documented'})
 result={'passed':not errors,'documents_checked':checked,'local_links_checked':link_count,'findings':errors,'scope':'Required files, relative links, declared source paths and exact route-name inventory; not semantic or clinical certification'}
 print(json.dumps(result,ensure_ascii=False,indent=2));return 1 if errors else 0
if __name__=='__main__':sys.exit(main())
