import copy,json
import pytest
from service.recipe_discovery import RecipeDiscovery,RecipeUnavailable
from service.domain import Service,k
from service.store import SQLiteStore,Conflict
from test_service import FakeBrain,consent

URL='https://example.org/recipes/real-new-dish'
def public_recipe():return {'title':'Новый рецепт из источника','source_url':URL,'source_title':'Публичный рецепт','servings':2,'servings_text':'2 порции','active_minutes':10,'ingredients':[{'text':'200 г кабачка','name':'кабачок','amount':'200 г','grams':200,'state':'raw'},{'text':'яйцо 1 шт.','name':'яйцо','amount':'1 шт.','grams':None,'state':None}],'steps_ru':'Нарежьте кабачок. Смешайте с яйцом и готовьте до готовности.','questions':['Масса съедобной части яйца неизвестна']}
def response(recipe=None):return {'status':'completed','output':[{'type':'web_search_call','status':'completed','action':{'type':'search','sources':[{'url':URL}]}},{'type':'message','content':[{'type':'output_text','text':json.dumps({'recipes':[recipe or public_recipe()]})}]}],'usage':{'input_tokens':10,'output_tokens':20},'tool_usage':{'web_search':{'num_requests':1}}}
def test_grounded_boundary_and_public_payload():
 captured=[]
 def transport(p):captured.append(p);return response()
 r,a=RecipeDiscovery(transport).discover('сыр')
 assert r[0]['ingredients'][1]['grams'] is None and a['web_search_requests']==1
 assert captured[0]['input'][0]['content'][0]['text']=='сыр'
 assert 'кето- или низкоуглеводные рецепты' in captured[0]['instructions'] and 'обязательная тема поиска по умолчанию' in captured[0]['instructions']
 assert 'ничего не удаляй ради кето' in captured[0]['instructions'] and 'не объявляй блюдо безопасным' in captured[0]['instructions']
 assert 'context' not in captured[0] and captured[0]['tools']==[{'type':'web_search'}]
 for mutate in (lambda r:r['output'].pop(0),lambda r:r['output'][0]['action']['sources'].clear()):
  bad=response();mutate(bad)
  with pytest.raises(RecipeUnavailable):RecipeDiscovery(lambda p:bad).discover('кабачок')
 bad=public_recipe();bad['source_url']='https://invented.example.org/recipe'
 with pytest.raises(RecipeUnavailable):RecipeDiscovery(lambda p:response(bad)).discover('кабачок')
 bad=public_recipe();bad['ingredients'][0]['energy_kcal']=123
 with pytest.raises(RecipeUnavailable):RecipeDiscovery(lambda p:response(bad)).discover('кабачок')

def test_discover_idempotency_unknown_review_and_provenance_save(tmp_path):
 s=Service(SQLiteStore(tmp_path/'state.db'),FakeBrain());consent(s);calls=[]
 s.recipe_discovery=RecipeDiscovery(lambda p:(calls.append(p) or response()))
 revision=s.opened('synthetic-one')['state']['revision']
 r=s.kitchen('synthetic-one','discover',query='кабачок яйцо',request_id='discover_public_001',expected_revision=revision)
 assert not s.load('synthetic-one')[0]['core']['custom_recipes'] and r['recipes'][0]['ingredients'][1]['grams'] is None
 assert r['recipes'][0]['ingredients'][0]['matches']
 assert s.kitchen('synthetic-one','discover',query='кабачок яйцо',request_id='discover_public_001',expected_revision=revision)['replayed'] and len(calls)==1
 with pytest.raises(Conflict):s.kitchen('synthetic-one','discover',query='другое',request_id='discover_public_001',expected_revision=revision)
 food=s.base['foods']['F169291'];values={'recipe_id':'Rimported12345','name_ru':r['recipes'][0]['title'],'category':'main','base_servings':2,'active_minutes':10,'ingredients':[{'food_id':food['food_id'],'state':food['state'],'grams_edible':200}],'steps_ru':r['recipes'][0]['steps_ru'],'provenance':r['recipes'][0]['provenance'],'source_review_confirmed':True}
 preview=s.kitchen('synthetic-one','own_dish_calculate',values=values)['preview'];assert preview['whole_batch']['nutrition']==k.calculate_ingredients(values['ingredients'],s.base['foods'])['nutrition']
 pending=s.kitchen('synthetic-one','own_dish_save',values=values,expected_revision=s.opened('synthetic-one')['state']['revision']);s.apply('synthetic-one',pending['proposal']['id'],pending['state']['revision'],True)
 doc,_=s.load('synthetic-one');recipe=doc['core']['custom_recipes'][values['recipe_id']];assert recipe['provenance']['source_url']==URL
 snapshot=k.intake_snapshot({'recipe_id':values['recipe_id']},s.kitchen_catalog(doc));assert snapshot['source']['recipe_provenance']['source_url']==URL

def test_available_carbohydrate_batch_portion_snapshot_and_mixed():
 cat=k.load_catalog(k.Path('library/skills/keto-menu/data'));f=copy.deepcopy(cat['foods']['F169291']);f.update(carbohydrate_total_g=None,fiber_g=None,declared_carbohydrate={'value':3.2,'basis':'available_excludes_fiber'})
 cat['foods'][f['food_id']]=f
 ingredients=[{'food_id':f['food_id'],'state':f['state'],'grams_edible':200}]
 batch=k.calculate_ingredients(ingredients,cat['foods']);assert batch['nutrition']['available_carbohydrate_g']==6.4
 assert batch['nutrition'][k.DERIVED] is None and batch['nutrition']['carbohydrate_total_g'] is None
 recipe={'recipe_id':'Ravailable1234','name_ru':'Проверка','category':'main','protein_family':'other','base_servings':2,'active_minutes':10,'ingredients':ingredients,'steps_ru':'Смешать','confirmed':True,'usage':'observational'};cat['recipes'][recipe['recipe_id']]=recipe
 assert k.calculate_recipe(cat,recipe['recipe_id'],1)['nutrition']['available_carbohydrate_g']==3.2
 entry={'recipe_id':recipe['recipe_id'],'portions':.5,'intake_status':'confirmed','nutrition_snapshot':k.intake_snapshot({'recipe_id':recipe['recipe_id']},cat)}
 half=k.diary_calculation(entry,cat);assert half['available_carbohydrate_g']==1.6 and half['nutrition']['available_carbohydrate_g']==1.6
 second=copy.deepcopy(f);second['food_id']='Uunknown12345';second.pop('declared_carbohydrate');cat['foods'][second['food_id']]=second
 mixed=k.calculate_ingredients(ingredients+[{'food_id':second['food_id'],'state':second['state'],'grams_edible':100}],cat['foods']);assert mixed['nutrition']['available_carbohydrate_g'] is None
 assert mixed['coverage']['available_carbohydrate_g']=={'complete':False,'known_subtotal':6.4,'missing_food_ids':[second['food_id']]}

def test_older_known_available_snapshot_is_preserved():
 cat=k.load_catalog(k.Path('library/skills/keto-menu/data'));snap=k.intake_snapshot({'food_id':'F169291'},cat);snap['nutrition'].pop('available_carbohydrate_g');snap['known_subtotals'].pop('available_carbohydrate_g');snap['available_carbohydrate_g']=3.2
 calc=k.diary_calculation({'food_id':'F169291','grams':100,'intake_status':'confirmed','nutrition_snapshot':snap},cat)
 assert calc['nutrition']['available_carbohydrate_g']==3.2 and calc['coverage']['available_carbohydrate_g']['known_subtotal']==3.2
 assert k.sum_calculations([calc])['nutrition']['available_carbohydrate_g']==3.2

def test_discovery_attempted_failure_is_not_refunded_or_replayed(tmp_path):
 s=Service(SQLiteStore(tmp_path/'failed.db'),FakeBrain());consent(s)
 class Failed:
  def discover(self,query):raise RecipeUnavailable('DISCOVERY_DEADLINE',True,{'attempted':True,'status':'failed','role':'recipe_discovery'})
 s.recipe_discovery=Failed();rev=s.opened('synthetic-one')['state']['revision']
 result=s.kitchen('synthetic-one','discover',query='публичное блюдо',request_id='discover_failed_01',expected_revision=rev)
 assert result['discovery_failed'] and result['model_called'] is True and result['model_roles'][0]['attempted'] is True
 doc,_=s.load('synthetic-one');assert doc['usage']['calls']==1 and doc['kitchen']['requests']['discover_failed_01']['status']=='failed'
 with pytest.raises(Conflict):s.kitchen('synthetic-one','discover',query='публичное блюдо',request_id='discover_failed_01',expected_revision=rev)

def test_incomplete_search_metadata_remains_attributable_not_a_fictional_recipe():
 response_only=response();response_only['output'][1]['content'][0]['text']='{"recipes":[]}'
 recipes,_=RecipeDiscovery(lambda p:response_only).discover('кабачок')
 assert recipes[0]['source_url']==URL and recipes[0]['retrieval_status']=='source_only' and recipes[0]['ingredients']==[] and recipes[0]['servings'] is None

def test_explicit_null_declared_carbohydrate_accepted_label_does_not_crash():
 f={'food_id':'Uexplicitnull123','name_ru':'Проверенная этикетка','state':'ready_to_eat','allergens':[],'label_confirmed':True,'source_ref':'Личная этикетка','carb_basis':'total_includes_fiber','energy_kcal':100,'protein_g':4,'fat_g':3,'carbohydrate_total_g':10,'fiber_g':2,'declared_carbohydrate':None,'nutrient_status':'complete'}
 f['provenance']={'type':'shop_label','provider':'personal_label','barcode':None,'license':None};f['recipe_eligible']=False;f['declared_label']={'basis':'per100g','mass_g':100,'energy_kcal':100,'protein_g':4,'fat_g':3,'carbohydrate_g':10,'fiber_g':2,'carbohydrate_basis':'total_includes_fiber'}
 food=k.validate_custom_food(f);calc=k.calculate_food_portion(food,200);assert calc['available_carbohydrate_g']==16

def test_thirty_source_ingredients_reach_existing_calculator(tmp_path):
 s=Service(SQLiteStore(tmp_path/'thirty.db'),FakeBrain());consent(s);foods=list(s.base['foods'].values())[:30]
 values={'recipe_id':'Rthirtyrows123','name_ru':'Тридцать ингредиентов','category':'main','base_servings':2,'active_minutes':15,'ingredients':[{'food_id':f['food_id'],'state':f['state'],'grams_edible':10} for f in foods],'steps_ru':'Собрать проверенные ингредиенты'}
 result=s.kitchen('synthetic-one','own_dish_calculate',values=values);assert len(result['preview']['whole_batch']['ingredients'])==30

def test_import_ingredient_russian_reference_names_match_actual_foods():
 from service import food_source
 for query,expected in [('капуста пекинская','USDA169979'),('лук зеленый','USDA170005'),('сок лимонный','USDA167747')]:
  rows=food_source.search(query,None,20)['candidates'];assert expected in {r['candidate_id'] for r in rows}
 olives=food_source.search('оливки',None,8)['candidates'];assert olives[0]['name_en'].startswith('Olives,')
