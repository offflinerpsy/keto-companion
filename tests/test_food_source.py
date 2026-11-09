"""Synthetic, offline USDA search and reviewed import checks."""
import copy
import hashlib
import json
from pathlib import Path
import pytest
from service import food_source
from service.domain import Service, k
from service.kitchen import pantry_valid
from service.store import SQLiteStore, Conflict
from test_service import FakeBrain, consent

@pytest.fixture
def svc(tmp_path,monkeypatch):
 monkeypatch.delenv('AZURE_OPENAI_ENDPOINT',raising=False)
 s=Service(SQLiteStore(tmp_path/'source.db'),FakeBrain());consent(s);return s

def test_source_counts_and_search_cursor(svc):
 rows,meta,_=food_source.catalog();seed=svc.base['foods']
 assert len(rows)==len({r['fdc_id'] for r in rows.values()})==7793
 assert len(set('F'+str(r['fdc_id']) for r in rows.values()) & set(seed))==85
 assert sum(r['fiber_g'] is None for r in rows.values())==562
 assert hashlib.sha256(Path('library/skills/keto-menu/data/foods.json').read_bytes()).hexdigest()=='8b881cfbcfb553c5cf84a932e078799c9d0ba53d5a16efda5028fed074ad0fe9'
 for q in ('сыр','cheese'):
  first=svc.kitchen('synthetic-one','source_search',query=q,values={'limit':3});assert first['total']>3 and first['next_cursor']
  second=svc.kitchen('synthetic-one','source_search',query=q,values={'limit':3,'cursor':first['next_cursor']})
  assert not set(x['candidate_id'] for x in first['candidates']) & set(x['candidate_id'] for x in second['candidates'])
  assert all('F'+str(x['fdc_id']) not in seed for x in first['candidates']+second['candidates'])
  with pytest.raises(ValueError):svc.kitchen('synthetic-one','source_search',query=q+'x',values={'limit':3,'cursor':first['next_cursor']})
  with pytest.raises(ValueError):svc.kitchen('synthetic-one','source_search',query=q,values={'limit':3,'cursor':'bad'})

def test_review_cancel_confirm_dedup_and_unknowns(svc):
 rows,_,_=food_source.catalog();candidate=next(r for r in rows.values() if r['fiber_g'] is None and 'F'+str(r['fdc_id']) not in svc.base['foods'])
 detail=svc.kitchen('synthetic-one','source_detail',values={'candidate_id':candidate['candidate_id']})['candidate']
 assert detail['state'] is None and detail['allergens'] is None and detail['fiber_g'] is None and detail['gi_status']=='unknown'
 values={'candidate_id':detail['candidate_id'],'release_hash':detail['release_hash'],'name_ru':'Проверенный продукт','state':'raw','allergens':[],'source_review_confirmed':True}
 rev=svc.opened('synthetic-one')['state']['revision'];r=svc.kitchen('synthetic-one','source_import',values=values,expected_revision=rev)
 with pytest.raises(ValueError):pantry_valid([{'food_id':detail['candidate_id'],'state':'raw'}],svc.base)
 assert not svc.load('synthetic-one')[0]['core']['custom_foods']
 svc.apply('synthetic-one',r['proposal']['id'],rev,False)
 assert not svc.load('synthetic-one')[0]['core']['custom_foods']
 r=svc.kitchen('synthetic-one','source_import',values=values,expected_revision=rev)
 with pytest.raises(Conflict):svc.apply('synthetic-one',r['proposal']['id'],rev+1,True)
 done=svc.apply('synthetic-one',r['proposal']['id'],rev,True);again=svc.apply('synthetic-one',r['proposal']['id'],rev,True)
 assert done['receipt']==again['receipt'];d,_=svc.load('synthetic-one');food=next(iter(d['core']['custom_foods'].values()));assert food['food_id'].startswith('U') and food['fiber_g'] is None and food['recipe_eligible'] is False and food['source_type']=='usda_reference' and 'label_confirmed' not in food
 calc=k.calculate_ingredients([{'food_id':food['food_id'],'state':'raw','grams_edible':100}],{food['food_id']:food},allow_unmapped=True)
 assert calc['nutrition']['fiber_g'] is None and calc['nutrition'][k.DERIVED] is None and not calc['coverage']['fiber_g']['complete']
 assert k.check_recipe({'allergies':[],'settings':{}}, k.calculate_ingredients([{'food_id':food['food_id'],'state':'raw','grams_edible':100}],{food['food_id']:food}))
 with pytest.raises(Conflict):svc.kitchen('synthetic-one','source_import',values=values,expected_revision=done['state']['revision'])
 exported=json.loads(svc.export('synthetic-one')['text']);assert next(iter(exported['core']['custom_foods'].values()))['fiber_g'] is None
 assert svc.brain.calls==0

def test_partial_legacy_and_forgery(svc):
 f={'food_id':'U12345678','name_ru':'Личная запись','state':'raw','allergens':[],'label_confirmed':True,'source_ref':'user-upload:x','carb_basis':'total_includes_fiber','energy_kcal':20,'protein_g':1,'fat_g':1,'carbohydrate_total_g':2,'fiber_g':None}
 with pytest.raises(k.KetoError):k.validate_custom_food(f)
 f['nutrient_status']='partial';assert k.validate_custom_food(f)['fiber_g'] is None
 complete=copy.deepcopy(f);complete['fiber_g']=1
 with pytest.raises(k.KetoError):k.validate_custom_food(complete)
 complete['nutrient_status']='complete';assert k.validate_custom_food(complete)['fiber_g']==1
 for bad in (float('nan'),-1,True):
  badf=copy.deepcopy(f);badf['protein_g']=bad
  with pytest.raises(k.KetoError):k.validate_custom_food(badf)
 rows,_,h=food_source.catalog();row=next(r for r in rows.values() if 'F'+str(r['fdc_id']) not in svc.base['foods'])
 values={'candidate_id':row['candidate_id'],'release_hash':'0'*64,'name_ru':'Test','state':'raw','allergens':[],'source_review_confirmed':True}
 with pytest.raises(Conflict):svc.kitchen('synthetic-one','source_import',values=values,expected_revision=svc.opened('synthetic-one')['state']['revision'])

def test_apply_rechecks_source_and_owner_and_recipe_boundary(svc,monkeypatch):
 rows,_,_=food_source.catalog();row=next(r for r in rows.values() if 'F'+str(r['fdc_id']) not in svc.base['foods'] and r['fiber_g'] is not None)
 values={'candidate_id':row['candidate_id'],'release_hash':row['release_hash'],'name_ru':'Проверено','state':'raw','allergens':['egg'],'source_review_confirmed':True}
 rev=svc.opened('synthetic-one')['state']['revision'];r=svc.kitchen('synthetic-one','source_import',values=values,expected_revision=rev)
 with pytest.raises(ValueError):svc.apply('other-owner',r['proposal']['id'],0,True)
 resolve=food_source.candidate
 def changed(*args):
  out=resolve(*args);out['release_hash']='0'*64;return out
 monkeypatch.setattr(food_source,'candidate',changed)
 with pytest.raises(Conflict):svc.apply('synthetic-one',r['proposal']['id'],rev,True)
 assert not svc.load('synthetic-one')[0]['core']['custom_foods']
 monkeypatch.setattr(food_source,'candidate',resolve)
 svc.apply('synthetic-one',r['proposal']['id'],rev,True);doc,_=svc.load('synthetic-one');fid=next(iter(doc['core']['custom_foods']))
 recipe={'recipe_id':'R12345678','name_ru':'Test','category':'main','protein_family':'other','base_servings':1,'active_minutes':10,'ingredients':[{'food_id':fid,'state':'raw','grams_edible':100}],'steps_ru':'Шаг','source_ref':'user:recipe','confirmed':True}
 with pytest.raises(k.SafetyError):k.validate_custom_recipe(recipe,k.merge_personal_catalog(svc.base,doc['core']))
 assert svc.brain.calls==0


def test_cheese_search_ranks_primary_and_excludes_raw_meat(svc):
 seed=svc.base['foods'];first=food_source.search('сыр',None,8,seed);english=food_source.search('cheese',None,8,seed)
 assert first['total']==english['total']
 assert all(row['name_en'].casefold().startswith('cheese,') for row in first['candidates'])
 assert [r['candidate_id'] for r in first['candidates']]==[r['candidate_id'] for r in english['candidates']]
 seen=[];page=first
 while True:
  seen.extend(page['candidates'])
  if not page['next_cursor']:break
  page=food_source.search('сыр',page['next_cursor'],8,seed)
 assert len(seen)==first['total']==len({r['candidate_id'] for r in seen})
 assert not any(r['name_en'].startswith('Beef, ground') and 'raw' in r['name_en'] for r in seen)
