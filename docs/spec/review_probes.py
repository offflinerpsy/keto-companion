"""SPEC-AUDIT-07: bounded synthetic reproducers, no network, files or real identities.
Run from repository root: PYTHONDONTWRITEBYTECODE=1 .venv/bin/python docs/spec/review_probes.py
These assertions describe defects at baseline, not desired regression behavior.
Python source is loaded from git show in memory, so parent fixes are not re-audited.
Baseline loader was syntax-checked; the original direct-source probes supplied the recorded observations.
"""
import copy
import json
import re
import sys
import subprocess
import importlib.abc
import importlib.util
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))
BASELINE = 'ee4b42707e138f677fb32e9dfb4602a26c1b5b63'
def baseline_text(path):
    return subprocess.run(['git','show',BASELINE+':'+path],cwd=ROOT,check=True,capture_output=True,text=True).stdout
class BaselineLoader(importlib.abc.MetaPathFinder, importlib.abc.Loader):
    """Load reviewed Python source in memory without a checkout or runtime file write."""
    def path(self, name):
        if name == 'service': return 'service/__init__.py'
        if name.startswith('service.'): return name.replace('.', '/')+'.py'
        if name == 'keto_core': return 'library/skills/keto-companion/scripts/keto_core.py'
        return None
    def find_spec(self, fullname, path=None, target=None):
        relative = self.path(fullname)
        if relative is None: return None
        return importlib.util.spec_from_loader(fullname,self,is_package=fullname=='service')
    def create_module(self, spec): return None
    def exec_module(self, module):
        relative = self.path(module.__name__)
        module.__file__ = str(ROOT/relative)
        if module.__name__ == 'service': module.__path__ = [str(ROOT/'service')]
        exec(compile(baseline_text(relative),module.__file__,'exec'),module.__dict__)
# JSON inputs are local files in baseline code; refuse drift instead of using a new catalogue.
for relative in ('service/data/kitchen_policy.json','library/skills/keto-menu/data/foods.json','library/skills/keto-menu/data/recipes.json'):
    if (ROOT/relative).read_text() != baseline_text(relative):
        raise SystemExit('Reviewed data changed; run against the exact baseline data: '+relative)
sys.meta_path.insert(0,BaselineLoader())
from service.domain import Service, k
from service.edge_bridge import MemoryStore
from service.kitchen import METHODS, spec_valid, validate_draft
from service.recipe_brain import RecipeUnavailable

SUBJECT = 'spec-audit-synthetic'
class NoBrain:
    def infer(self, *args, **kwargs):
        raise AssertionError('Unexpected intent inference: synthetic probe cannot call models')
class OfflineDesigner:
    def __init__(self): self.calls = 0
    def design(self, *args, **kwargs):
        self.calls += 1
        raise RecipeUnavailable('SYNTHETIC_OFFLINE', audit={'attempted': True, 'status': 'failed'})
def event(s, typ, payload):
    state = s.opened(SUBJECT)['state']
    p = s.propose(SUBJECT, typ, payload, state['revision'])
    return s.apply(SUBJECT, p['proposal']['id'], p['state']['revision'], True)
def service():
    designer = OfflineDesigner()
    s = Service(MemoryStore(SUBJECT, None), NoBrain(), recipe_designer=designer)
    s.consent(SUBJECT, True, True, True, True)
    screen = {key: False for key in k.SCREEN_FIELDS}
    for key in ('adult', 'medications_reviewed', 'allergies_reviewed'): screen[key] = True
    event(s, 'profile.update', {'screening': screen, 'timezone': 'Europe/Minsk'})
    event(s, 'targets.update', {'status':'agreed','agreed_at':'2026-11-08T00:00:00Z','basis_note':'SYNTHETIC REVIEW ONLY','energy_min_kcal':1700,'energy_max_kcal':1900,'protein_min_g':85,'protein_max_g':180,'carb_basis':'net_estimate','carb_max_g':40,'fiber_min_g':25,'saturated_fat_max_pct':10})
    return s, designer
def generate(s, **overrides):
    spec = {'mode':'pantry_only','meal':'dinner','time_budget':20,'equipment':'pan','servings':2,'pantry':[{'food_id':fid,'state':'raw','grams':500} for fid in ('F171287','F169291','F169251')]}
    spec.update(overrides)
    return s.kitchen(SUBJECT, 'generate', spec=spec, request_id='spec_audit_generate')

def probe_unknown_diary_budget():
    s, _ = service()
    day = datetime.now(ZoneInfo('Europe/Minsk')).date().isoformat()
    event(s, 'diary.add', {'date':day,'note':'Synthetic unweighed meal','intake_status':'unquantified'})
    result = generate(s)
    budget = result['recipes'][0]['budget']
    summary = result['state']['kitchen']['today_summary']
    assert summary['unquantified_entries'] == 1
    assert budget['confirmed_logged_g'] == 0 and budget['remaining_g'] == 40
    return {'id':'SA07-01','unquantified_entries':1,'reported_remaining_g':budget['remaining_g'],'reported_logged_g':budget['confirmed_logged_g']}

def probe_chat_quota_classification():
    s, designer = service()
    message = 'Рассчитай ужин: есть яйца, кабачок и шампиньоны; без покупок за 20 минут'
    worker_local = bool(re.search(r'сколько.*калор|рассчитай|рассчитайте', message, re.I))
    result = s.chat(SUBJECT, message, 'spec_audit_quota_chat')
    assert worker_local and designer.calls == 1 and result['model_called']
    return {'id':'SA07-02','worker_paid_reservation':0,'synthetic_designer_attempts':designer.calls,'service_model_called':result['model_called'],'note':'Worker predicate evaluated verbatim; no real provider or full Worker execution'}

def probe_batch_shopping():
    s, _ = service()
    doc, _ = s.load(SUBJECT)
    spec = spec_valid({'mode':'pantry_plus','meal':'dinner','servings':2,'time_budget':20,'equipment':'pan','pantry':[{'food_id':'F171287','state':'raw','grams':100},{'food_id':'F169291','state':'raw','grams':120}]}, [], s.base)
    raw = {'method_id':'omelette','title':METHODS['omelette']['title'],'servings':2,'ingredients':[{'food_id':'F171287','grams':200},{'food_id':'F169291','grams':240}]}
    draft = validate_draft(raw, spec, doc, s.base, 'template')
    rid = draft['recipe']['recipe_id']; doc['kitchen']['drafts'][rid] = draft
    card = s.kitchen_card(doc, rid, spec)
    # This is the same per-person meal representation kitchen_day stores: portions=1.
    plan = {'plan_id':'synthetic_batch_plan','days':[{'meals':[card]}]}
    doc['kitchen']['plan_pantry'] = {plan['plan_id']:copy.deepcopy(spec['pantry'])}
    actual = s.kitchen_shopping(doc, plan)
    assert len(card['missing']) == 2 and actual == []
    return {'id':'SA07-03','batch_missing':[{key:i[key] for key in ('food_id','grams_edible')} for i in card['missing']],'saved_plan_shopping':actual,'scope':'Actual shopping function with kitchen_day per-person representation; not a full accepted-day E2E'}

def probe_allergen_editor_projection():
    s, _ = service()
    event(s, 'profile.update', {'allergies':['mustard']})
    source = baseline_text('cloudflare-saas/public/app.js')
    literal = re.search(r'const ALLERGENS=(\[.*?\]);', source).group(1)
    visible_ids = re.findall(r"\['([^']+)',", literal)
    old = s.opened(SUBJECT)['state']['profile']['allergies']
    # fillOnboard creates checkboxes only for ALLERGENS; submit collects checked IDs.
    submitted = [code for code in visible_ids if code in old]
    result = event(s, 'profile.update', {'display_name':'Synthetic renamed user','allergies':submitted})
    assert 'mustard' not in visible_ids and result['state']['profile']['allergies'] == []
    return {'id':'SA07-04','saved_before':old,'visible_checkbox_count':len(visible_ids),'submitted_allergies':submitted,'saved_after':result['state']['profile']['allergies'],'scope':'Source-derived checkbox projection plus actual propose/apply; no rendered DOM'}

if __name__ == '__main__':
    results = [probe_unknown_diary_budget(), probe_chat_quota_classification(), probe_batch_shopping(), probe_allergen_editor_projection()]
    print(json.dumps({'schema':'spec-audit-07-probes-v1','results':results,'provider_calls':0,'persistent_writes':0},ensure_ascii=False,indent=2))
