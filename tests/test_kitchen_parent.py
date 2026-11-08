"""Independent acceptance regressions on synthetic local data, no model/network."""
import copy
from datetime import datetime
from zoneinfo import ZoneInfo
import pytest
from service.domain import Service,k
from service.kitchen import parse_products,recall
from service.store import SQLiteStore
from service.recipe_brain import RecipeUnavailable
from test_service import FakeBrain,healthy,event
from test_kitchen import action,confirm,generate
class Offline:
 def design(self,*a,**kw):raise RecipeUnavailable('SYNTHETIC_OFFLINE')
@pytest.fixture
def svc(tmp_path):
 s=Service(SQLiteStore(tmp_path/'own.db'),FakeBrain(),recipe_designer=Offline());healthy(s);return s

def test_quantities_bind_to_own_ingredient_and_decimal_comma(svc):
 p=parse_products('Есть 150,5 г яиц, 200 г кабачка и 70 г шампиньонов; ужин',svc.base)
 assert not p['questions'];assert {i['food_id']:i['grams'] for i in p['pantry']}=={'F171287':150.5,'F169291':200.,'F169251':70.}

def test_no_cheese_does_not_mean_no_raw_meat(svc):
 svc.chat('synthetic-one','Есть яйца, кабачок и шампиньоны; ужин за20минут без покупок','parent_first')
 r=svc.chat('synthetic-one','Второй вариант, но без сыра','parent_replace')
 assert 'F173414' in r['spec']['avoid'];assert 'F171077' not in r['spec']['avoid'];assert 'F173725' not in r['spec']['avoid'];assert 'F174515' not in r['spec']['avoid']

def test_confirmed_preference_is_shared_and_forgotten_in_recent_context(svc):
 r=svc.chat('synthetic-one','Запомни, что не люблю курицу','parent_remember');confirm(svc,r)
 d,_=svc.load('synthetic-one');facts=d['kitchen']['preferences'];assert facts
 assert not svc.kitchen_recent_chat(d,'main');assert 'F171077' in d['core']['profile']['settings']['disliked_food_ids']
 confirm(svc,action(svc,'forget',values={'fact_id':facts[0]['id']}))
 d,_=svc.load('synthetic-one');assert not d['kitchen']['preferences'];assert 'F171077' not in d['core']['profile']['settings']['disliked_food_ids'];assert not svc.kitchen_recent_chat(d,'main');assert not recall(d,'курица','main')

def test_diary_summary_uses_confirmed_fraction_and_counts_unknown(svc):
 r=generate(svc);rid=r['recipes'][0]['recipe_id'];per=r['recipes'][0]['nutrition']['energy_kcal']
 pending=action(svc,'diary',rid,{'fraction':.5,'basis':'portion'})
 assert svc.kitchen('synthetic-one','memory')['kitchen']['today_summary']['known_entries']==0
 confirm(svc,pending);event(svc,'diary.add',{'date':datetime.now(ZoneInfo('Europe/Minsk')).date().isoformat(),'note':'Перекус без граммовки','intake_status':'unquantified'})
 r=svc.chat('synthetic-one','Подведи итоги дня','parent_summary');summary=r['daily_summary'];assert summary['known_entries']==1 and summary['unquantified_entries']==1;assert summary['nutrition']['energy_kcal']==pytest.approx(per*.5);assert r['model_called'] is False;assert 'не вся' in r['message']

def test_chat_full_day_confirmation_and_pdf(svc):
 r=svc.chat('synthetic-one','Ничего нет, составь завтрак обед ужин','parent_full_day');assert r['day']['status']=='calculated_draft'
 p=svc.chat('synthetic-one','Сохрани меню','parent_accept_day');assert p['proposal']['type']=='kitchen.accept_day';assert not svc.opened('synthetic-one')['state']['plans'];confirm(svc,p);assert svc.opened('synthetic-one')['state']['plans'];assert svc.export('synthetic-one','pdf')['mime']=='application/pdf'

def test_unknown_pantry_meal_does_not_throw(svc):
 r=svc.chat('synthetic-one','Нужен ужин только из кладовой без покупок','parent_empty');assert not r.get('recipes');assert r['message'];assert not r['model_called']

def test_no_protein_vegetable_candidate_is_not_presented_as_full_dinner(svc):
 r=generate(svc);side=[x for x in r['recipes'] if not any(svc.base['foods'][i['food_id']]['group'] in {'egg','poultry','fish','soy','dairy'} for i in x['ingredients'])]
 assert side;assert all(x['meal_role']=='side_or_light' and 'не полноценный' in x['fit_note'] for x in side)
