"""Owner appliance addendum: synthetic fixtures, no real account or paid model."""
import copy
import pytest
from service.domain import Service,k
from service.kitchen import POLICY,METHODS,spec_valid,context_for,validate_draft
from service.recipe_brain import RecipeUnavailable
from service.store import SQLiteStore
from test_service import FakeBrain,healthy
class Offline:
 def design(self,*a,**kw):raise RecipeUnavailable('SYNTHETIC_OFFLINE')
@pytest.fixture
def svc(tmp_path):
 s=Service(SQLiteStore(tmp_path/'appliances.db'),FakeBrain(),recipe_designer=Offline());healthy(s);return s

def stock(svc,ids):return [{'food_id':fid,'state':svc.base['foods'][fid]['state'],'grams':500} for fid in ids]
def setup_stock(svc,ids):
 q=svc.kitchen('synthetic-one','pantry',values={'items':stock(svc,ids)},expected_revision=svc.opened('synthetic-one')['state']['revision']);svc.apply('synthetic-one',q['proposal']['id'],q['state']['revision'],True)

@pytest.mark.parametrize('equipment,ids,minutes,expected_method',[('multicooker',['F171287','F169291'],30,'multicooker_egg_steam'),('multicooker',['F171077','F169291'],40,'multicooker_poultry_steam'),('air_fryer',['F171077','F169291'],35,'air_fryer_poultry'),('air_fryer',['F175167','F169291'],30,'air_fryer_fish'),('air_fryer',['F169291','F169975'],25,'air_fryer_vegetables'),('waffle_iron',['F171287','F173414'],20,'waffle_egg_cheese')])
def test_real_appliance_specific_templates(svc,equipment,ids,minutes,expected_method):
 spec={'mode':'pantry_only','meal':'dinner','equipment':equipment,'time_budget':minutes,'servings':1,'pantry':stock(svc,ids)}
 r=svc.kitchen('synthetic-one','generate',spec=spec,request_id='fixture_appliance_001')
 assert r['recipes'] and not r['model_called']
 assert all(x['equipment']==equipment and x['method_id']==expected_method for x in r['recipes'])
 assert all(not x['missing'] and x['equipment_note'] for x in r['recipes'])
 assert all(x['nutrition']==k.calculate_ingredients(x['ingredients'],svc.base['foods'])['nutrition'] for x in r['recipes'])
 for x in r['recipes']:
  if equipment=='multicooker':assert 'без давления' in x['steps_ru'] and 'технологическую воду' in x['steps_ru']
  if expected_method.endswith('poultry') or 'poultry_steam' in expected_method:assert '74 °C' in x['steps_ru']
  if equipment=='waffle_iron':assert '71 °C' in x['steps_ru'] and 'Не переполняйте' in x['steps_ru'] and 'Мука, сахар' in x['steps_ru']

@pytest.mark.parametrize('phrase,equipment,ids',[('Приготовь завтрак в вафельнице за20минут без покупок','waffle_iron',['F171287','F173414']),('Приготовь ужин в аэрогриле за35минут без покупок','air_fryer',['F171077','F169291']),('Приготовь в мультиварке за30минут без покупок','multicooker',['F171287','F169291'])])
def test_chat_selects_explicit_appliance(svc,phrase,equipment,ids):
 setup_stock(svc,ids)
 r=svc.chat('synthetic-one',phrase,'fixture_chat_appliance_001')
 assert r['spec']['equipment']==equipment and r['recipes']
 assert svc.brain.calls==0

def test_two_appliances_require_selection(svc):
 setup_stock(svc,['F171287','F169291'])
 r=svc.chat('synthetic-one','Приготовь в аэрогриле или в мультиварке без покупок','fixture_appliance_choice')
 assert 'один прибор' in r['message'] and not r['model_called'] and not r.get('recipes')

def test_pressure_mode_not_guessed(svc):
 setup_stock(svc,['F171077','F169291'])
 r=svc.chat('synthetic-one','Приготовь в мультиварке под давлением без покупок','fixture_pressure_unsupported')
 assert 'не поддерживаются' in r['message'] and not r['model_called'] and not r.get('recipes')

def test_wrong_method_or_raw_chicken_in_waffle_rejected(svc):
 d,_=svc.load('synthetic-one');spec=spec_valid({'mode':'inspiration','equipment':'waffle_iron','time_budget':30},[],svc.base)
 raw={'method_id':'waffle_egg_cheese','title':METHODS['waffle_egg_cheese']['title'],'flavor':'домашний','servings':1,'ingredients':[{'food_id':'F171287','grams':100},{'food_id':'F173414','grams':40},{'food_id':'F171077','grams':50}]}
 with pytest.raises(ValueError):validate_draft(raw,spec,d,svc.base,'sol')
 raw['ingredients']=raw['ingredients'][:2];spec['equipment']='air_fryer'
 with pytest.raises(ValueError):validate_draft(raw,spec,d,svc.base,'sol')
