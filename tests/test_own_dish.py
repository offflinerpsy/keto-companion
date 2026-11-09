import pytest
from service import food_source
from service.kitchen import missing_list
from test_food_source import svc
import keto_core as k
from service.store import Conflict


def test_own_dish_partial_save_intake_and_plan_guard(svc):
 rows,_,_=food_source.catalog(); candidate=next(r for r in rows.values() if r['fiber_g'] is None and 'F'+str(r['fdc_id']) not in svc.base['foods'])
 values={'candidate_id':candidate['candidate_id'],'release_hash':candidate['release_hash'],'name_ru':'Личный продукт','state':'raw','allergens':[],'source_review_confirmed':True}
 rev=svc.opened('synthetic-one')['state']['revision']; proposal=svc.kitchen('synthetic-one','source_import',values=values,expected_revision=rev)['proposal']; svc.apply('synthetic-one',proposal['id'],rev,True)
 d,v=svc.load('synthetic-one');d['core']['profile']['timezone']='America/New_York';svc.save('synthetic-one',d,v)
 d,_=svc.load('synthetic-one'); fid=next(iter(d['core']['custom_foods']));seed=next(f for f in svc.base['foods'].values() if f['state']=='raw')
 recipe={'recipe_id':'Rown12345678','name_ru':'Домашнее блюдо','category':'main','base_servings':2,'active_minutes':15,'ingredients':[{'food_id':fid,'state':'raw','grams_edible':75.5},{'food_id':seed['food_id'],'state':'raw','grams_edible':100.25}],'steps_ru':'Смешать'}
 calc=svc.kitchen('synthetic-one','own_dish_calculate',values=recipe)['preview'];batch=calc['whole_batch'];portion=calc['per_portion']
 assert batch['ingredients'][0]['name_ru']=='Личный продукт';assert portion['ingredients'][0]['grams_edible']==37.75
 assert batch['nutrition']['fiber_g'] is None and batch['nutrition'][k.DERIVED] is None and batch['coverage']['fiber_g']['known_subtotal']>=0
 assert 'observational_recipe' in k.check_recipe(d['core']['profile'],batch)
 rev=d['revision'];p=svc.kitchen('synthetic-one','own_dish_save',values=recipe,expected_revision=rev)['proposal'];svc.apply('synthetic-one',p['id'],rev,False);assert not svc.load('synthetic-one')[0]['core']['custom_recipes']
 p=svc.kitchen('synthetic-one','own_dish_save',values=recipe,expected_revision=rev)['proposal']
 with pytest.raises(Conflict):svc.apply('synthetic-one',p['id'],rev+1,True)
 done=svc.apply('synthetic-one',p['id'],rev,True);assert svc.apply('synthetic-one',p['id'],rev,True)['receipt']==done['receipt']
 ready=k.default_profile('synthetic-one','synthetic-one');ready['screening']={x:False for x in k.SCREEN_FIELDS}
 for x in ('adult','medications_reviewed','allergies_reviewed'):ready['screening'][x]=True
 ready['targets']={'status':'agreed','agreed_at':'2026-11-07T00:00:00Z','basis_note':'synthetic','energy_min_kcal':1700,'energy_max_kcal':1900,'protein_min_g':85,'protein_max_g':180,'carb_basis':'net_estimate','carb_max_g':40,'fiber_min_g':25,'saturated_fat_max_pct':10}
 cat=svc.kitchen_catalog(svc.load('synthetic-one')[0]);picks=[{'recipe_id':recipe['recipe_id'],'portions':1,'slot':'breakfast'},{'recipe_id':recipe['recipe_id'],'portions':1,'slot':'lunch'}]
 with pytest.raises(k.SafetyError,match='observational_recipe'):k.calculate_day(cat,ready,'2026-11-09',picks)
 rev=done['state']['revision']
 for bad_date in ('2026-02-31','2026-1-1',''):
  with pytest.raises(ValueError):svc.kitchen('synthetic-one','own_dish_diary',values={'recipe_id':recipe['recipe_id'],'fraction':.25,'basis':'batch','date':bad_date},expected_revision=rev)
 p=svc.kitchen('synthetic-one','own_dish_diary',values={'recipe_id':recipe['recipe_id'],'fraction':.25,'basis':'batch','date':'2026-01-03'},expected_revision=rev)['proposal'];assert p['payload']['date']=='2026-01-03';done=svc.apply('synthetic-one',p['id'],rev,True)
 assert done['state']['diary'][-1]['portions']==.5 and done['state']['diary'][-1]['date']=='2026-01-03'
 before=svc.load('synthetic-one')[0];detail=svc.kitchen('synthetic-one','own_dish_detail',values={'recipe_id':recipe['recipe_id']})['preview'];after=svc.load('synthetic-one')[0]
 assert detail['servings']==2 and detail['steps_ru']=='Смешать' and detail['whole_batch']['nutrition'][k.DERIVED] is None and before==after
 svc.consent('synthetic-other',True,True,True,True)
 with pytest.raises(ValueError):svc.kitchen('synthetic-other','own_dish_detail',values={'recipe_id':recipe['recipe_id']})
 with pytest.raises(ValueError):svc.kitchen('synthetic-one','own_dish_detail',values={'recipe_id':'Rforeign123'})
 from datetime import datetime
 from zoneinfo import ZoneInfo
 today=datetime.now(ZoneInfo('America/New_York')).date().isoformat();rev=done['state']['revision'];p=svc.kitchen('synthetic-one','own_dish_diary',values={'recipe_id':recipe['recipe_id'],'fraction':.25,'basis':'batch','date':today},expected_revision=rev)['proposal'];done=svc.apply('synthetic-one',p['id'],rev,True)
 assert done['state']['kitchen']['today_summary']['nutrition'][k.DERIVED] is None
 for patch in ({'food_id':'unknown','state':'raw','grams_edible':1},{'food_id':fid,'state':'cooked','grams_edible':1},{'food_id':fid,'state':'raw','grams_edible':0}):
  with pytest.raises(ValueError):svc.kitchen('synthetic-one','own_dish_calculate',values=dict(recipe,ingredients=[patch]))


def test_library_pages_and_unknown_stock(svc):
 first=svc.catalog('synthetic-one',limit=9); pages=[first]; offset=9
 while pages[-1]['has_more']:
  pages.append(svc.catalog('synthetic-one',limit=9,offset=offset));offset+=9
 ids=[r['recipe_id'] for page in pages for r in page['recipes']]
 assert len(ids)==len(set(ids))==first['total']==72
 assert len({r['category'] for r in first['recipes']})>1
 assert all(r['category']=='side' for r in svc.catalog('synthetic-one',category='side')['recipes'])
 row={'food_id':'F1','name_ru':'Продукт','state':'raw','grams_edible':100}; result=missing_list([row],[{'food_id':'F1','grams':None}]);assert result[0]['grams_edible'] is None and result[0]['required_grams']==100 and result[0]['stock_quantity_unknown']
