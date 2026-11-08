"""Opt-in ONE paid Azure Sol check on synthetic local state. Never touches cloud user records.
Run with KETO_RUN_PAID_SYNTHETIC=1. Output is evidence, not clinical validation.
"""
from pathlib import Path
import os,sys,json,tempfile,time,hashlib
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT));sys.path.insert(0,str(ROOT/'tests'))
if os.getenv('KETO_RUN_PAID_SYNTHETIC')!='1':raise SystemExit('Explicit opt-in KETO_RUN_PAID_SYNTHETIC=1 required (one paid call).')
from service.domain import Service
from service.store import SQLiteStore
from service.recipe_brain import RecipeDesigner
from test_service import FakeBrain,healthy
from azure.identity import AzureCliCredential
os.environ['AZURE_OPENAI_ENDPOINT']='https://offflinerpsy-4097-resource.openai.azure.com'
os.environ['KETO_RECIPE_DEPLOYMENT']='gpt-6.1-sol'
os.environ['KETO_RECIPE_REASONING']='high'
checks=[];report={'scope':'current Service plus actual Azure Sol/high; synthetic local SQLite only; NOT authenticated hosted browser or clinical testing','checks':checks,'source_sha256':hashlib.sha256((ROOT/'service/kitchen.py').read_bytes()).hexdigest()}
def check(name,value):
 checks.append({'name':name,'passed':bool(value)})
 if not value:raise AssertionError(name)
start=time.monotonic()
try:
 with tempfile.TemporaryDirectory() as temp:
  service=Service(SQLiteStore(Path(temp)/'synthetic.db'),FakeBrain(),recipe_designer=RecipeDesigner(credential=AzureCliCredential()));healthy(service)
  spec={'mode':'pantry_only','meal':'dinner','servings':1,'time_budget':20,'equipment':'pan','pantry':[{'food_id':'F171287','state':'raw','grams':150},{'food_id':'F169291','state':'raw','grams':200},{'food_id':'F169251','state':'raw','grams':150}]}
  result=service.kitchen('synthetic-one','generate',spec=spec,request_id='release_real_sol_001')
  check('actual_provider_called_once',result['model_called'] and len(result['model_roles'])==1)
  check('actual_Sol_high',result['model_roles'][0]['deployment']=='gpt-6.1-sol' and result['model_roles'][0]['reasoning_effort']=='high')
  check('calculated_candidates_returned',1<=len(result['recipes'])<=3)
  allowed={x['food_id']:x['grams'] for x in spec['pantry']}
  check('no_hidden_ingredients_or_shortage',all(not r['missing'] and all(i['food_id'] in allowed and i['grams_edible']<=allowed[i['food_id']]+.001 for i in r['whole_batch']['ingredients']) for r in result['recipes']))
  again=service.kitchen('synthetic-one','generate',spec=spec,request_id='release_real_sol_001');check('replay_not_paid_again',again['replayed'] and not again['model_called'])
  rid=result['recipes'][0]['recipe_id'];selected=service.kitchen('synthetic-one','select',recipe_id=rid,thread_id='main',expected_revision=service.opened('synthetic-one')['state']['revision'])
  pending=service.chat('synthetic-one','Сохрани рецепт','release_save_001',thread_id='main');check('save_needs_confirmation',pending.get('proposal',{}).get('type')=='kitchen.save' and not pending['state']['kitchen']['saved_recipes'])
  done=service.apply('synthetic-one',pending['proposal']['id'],pending['state']['revision'],True);check('same_recipe_saved',rid in done['state']['kitchen']['saved_recipes'])
  pending=service.chat('synthetic-one','Запиши половину порции','release_diary_001',thread_id='main');check('diary_needs_confirmation',pending.get('proposal',{}).get('type')=='kitchen.diary' and not pending['state']['diary'])
  service.apply('synthetic-one',pending['proposal']['id'],pending['state']['revision'],True)
  summary=service.chat('synthetic-one','Подведи итоги дня','release_totals_001',thread_id='main')['daily_summary']
  check('half_portion_uses_calculation',summary['known_entries']==1 and abs(summary['nutrition']['energy_kcal']-result['recipes'][0]['nutrition']['energy_kcal']*.5)<.001)
  check('technical_chat_model_not_required',service.brain.calls==0)
  report.update(model_roles=result['model_roles'],fallback_reason=result.get('fallback_reason'),candidate_origins=[r['origin'] for r in result['recipes']],recipe_titles=[r['name_ru'] for r in result['recipes']],day_summary=summary)
except Exception as e:report['error']=type(e).__name__+': '+str(e)[:240]
report['seconds']=round(time.monotonic()-start,2);report['passed']=all(x['passed'] for x in checks) and 'error' not in report
(ROOT/'docs/evidence/KITCHEN_FINAL_PROVIDER_ACCEPTANCE.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'passed':report['passed'],'checks':len(checks),'seconds':report['seconds'],'fallback_reason':report.get('fallback_reason'),'error':report.get('error')},ensure_ascii=False))
