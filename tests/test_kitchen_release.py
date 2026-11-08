"""Bounded release acceptance, synthetic local profiles, no network or real health data."""
import pytest
from service.domain import Service,k
from service.kitchen import parse_products,POLICY,METHODS,context_for,spec_valid,canonical_steps
from service.recipe_brain import RecipeUnavailable
from service.store import SQLiteStore
from test_service import FakeBrain,healthy
class Offline:
    def design(self,*a,**kw):raise RecipeUnavailable('SYNTHETIC_OFFLINE')
@pytest.fixture
def svc(tmp_path):
    s=Service(SQLiteStore(tmp_path/'release.db'),FakeBrain(),recipe_designer=Offline());healthy(s);return s
@pytest.mark.parametrize('phrase,fid',[('Есть курица сырая','F171077'),('Есть сырой минтай','F173725'),('Есть сырая индейка','F174515')])
def test_raw_adjective_is_not_cheese(svc,phrase,fid):
    result=parse_products(phrase,svc.base)
    assert not result['questions']
    assert [x['food_id'] for x in result['pantry']]==[fid]
def test_actual_cheese_still_needs_kind(svc):
    assert parse_products('Есть сыр',svc.base)['questions']
@pytest.mark.parametrize('message,maximum',[('Можно докупить один продукт',1),('Можно докупить три продукта',3),('Можно докупить до 5 продуктов',5)])
def test_explicit_purchase_count_is_honored(svc,message,maximum):
    items=[{'food_id':fid,'state':'raw','grams':500} for fid in ['F171287','F169291','F169251']]
    pending=svc.kitchen('synthetic-one','pantry',values={'items':items},expected_revision=svc.opened('synthetic-one')['state']['revision'])
    svc.apply('synthetic-one',pending['proposal']['id'],pending['state']['revision'],True)
    result=svc.chat('synthetic-one',message,'release_buy_'+str(maximum))
    assert result['spec']['mode']=='pantry_plus'
    assert result['spec']['max_missing_items']==maximum
    assert all(len(x['missing'])<=maximum for x in result['recipes'])
def test_yogurt_method_needs_yogurt_not_any_cheese(svc):
    d,_=svc.load('synthetic-one')
    stock=[{'food_id':'F173414','state':svc.base['foods']['F173414']['state'],'grams':200},{'food_id':'F172233','state':svc.base['foods']['F172233']['state'],'grams':20}]
    spec=spec_valid({'mode':'pantry_only','equipment':'no_cook','pantry':stock},stock,svc.base)
    ctx=context_for(d,spec,svc.base,'main')
    assert not any(x['id']=='yogurt_herb' for x in ctx['methods'])
def test_counted_oil_is_explicit_in_steps(svc):
    ingredients=k.calculate_ingredients([{'food_id':'F171287','state':'raw','grams_edible':100},{'food_id':'F169291','state':'raw','grams_edible':150},{'food_id':'F171025','state':'ready_to_eat','grams_edible':8}],svc.base['foods'])['ingredients']
    text=canonical_steps(METHODS['omelette'],ingredients)
    assert '8.0 г' in text and 'уже учтённое масло' in text
