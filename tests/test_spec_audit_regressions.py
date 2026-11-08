"""SPEC-AUDIT-07 reproducible regressions; synthetic local records, no provider calls."""
import copy,re,json
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo
import pytest
from service.domain import Service,k
from service.edge_bridge import MemoryStore
from service.kitchen import METHODS,spec_valid,validate_draft
from service.recipe_brain import RecipeUnavailable
from service.store import SQLiteStore
from test_service import FakeBrain,healthy,event
from test_kitchen import generate,confirm,action
class Offline:
    def design(self,*args,**kwargs):raise RecipeUnavailable('SYNTHETIC_OFFLINE')
@pytest.fixture
def svc(tmp_path):
    value=Service(SQLiteStore(tmp_path/'audit.db'),FakeBrain(),recipe_designer=Offline());healthy(value);return value

def test_unquantified_meal_never_becomes_zero_carbohydrate(svc):
    today=datetime.now(ZoneInfo('Europe/Minsk')).date().isoformat()
    event(svc,'diary.add',{'date':today,'note':'Unweighed synthetic meal','intake_status':'unquantified'})
    result=generate(svc)
    for card in result['recipes']:
        budget=card['budget']
        assert budget['remaining_g'] is None and budget['meal_assumption_g'] is None
        assert budget['confirmed_logged_g'] is None and budget['known_subtotal_g']==0
        assert budget['diary_complete_for_budget'] is False
        assert 'остаток углеводов не определён' in card['fit_note']

def test_known_subtotal_remains_separate_from_unknown_total(svc):
    generated=generate(svc);rid=generated['recipes'][0]['recipe_id']
    confirm(svc,action(svc,'diary',rid,{'fraction':.5,'basis':'portion'}))
    before=svc.kitchen('synthetic-one','status')['recipes'][0]['budget']
    assert before['diary_complete_for_budget'] and before['remaining_g'] is not None
    today=datetime.now(ZoneInfo('Europe/Minsk')).date().isoformat()
    event(svc,'diary.add',{'date':today,'note':'Another meal, no amounts','intake_status':'unquantified'})
    after=svc.kitchen('synthetic-one','status')['recipes'][0]['budget']
    assert after['remaining_g'] is None
    assert after['known_subtotal_g']==before['confirmed_logged_g']

def shopping_fixture(svc,explicit_size=True):
    d,_=svc.load('synthetic-one')
    stock=[{'food_id':'F171287','state':'raw','grams':100},{'food_id':'F169291','state':'raw','grams':120}]
    spec=spec_valid({'mode':'pantry_plus','meal':'dinner','servings':2,'time_budget':20,'equipment':'pan','pantry':stock},[],svc.base)
    raw={'method_id':'omelette','title':METHODS['omelette']['title'],'servings':2,'ingredients':[{'food_id':'F171287','grams':200},{'food_id':'F169291','grams':240}]}
    draft=validate_draft(raw,spec,d,svc.base,'template');rid=draft['recipe']['recipe_id'];d['kitchen']['drafts'][rid]=draft
    d['core'].setdefault('custom_recipes',{})[rid]=draft['recipe']
    card=svc.kitchen_card(d,rid,spec);plan={'plan_id':'synthetic-plan','days':[{'meals':[card]}]}
    d['kitchen']['plan_pantry']={plan['plan_id']:stock}
    if explicit_size:d['kitchen']['plan_servings']={plan['plan_id']:2}
    return d,plan,card

@pytest.mark.parametrize('explicit_size',[True,False])
def test_saved_shopping_matches_whole_batch_without_double_scaling_nutrition(svc,explicit_size):
    d,plan,card=shopping_fixture(svc,explicit_size)
    old=copy.deepcopy(plan);actual=svc.kitchen_shopping(d,plan)
    assert {i['food_id']:i['grams_edible'] for i in actual}=={'F171287':100,'F169291':120}
    assert {i['food_id']:i['grams_edible'] for i in actual}=={i['food_id']:i['grams_edible'] for i in card['missing']}
    assert plan==old

def test_ordinary_single_person_plan_not_scaled(svc):
    d,plan,card=shopping_fixture(svc)
    d['kitchen']['plan_pantry']={}
    assert svc.kitchen_shopping(d,plan)==k.shopping_list(plan)

def test_ambiguous_historical_batch_is_not_guessed(svc):
    d,plan,_=shopping_fixture(svc,False);d['core']['custom_recipes']={}
    with pytest.raises(ValueError,match='число порций'):svc.kitchen_shopping(d,plan)

def test_accepted_day_persists_servings_and_shop_quantity(svc):
    result=svc.kitchen('synthetic-one','generate',spec={'mode':'inspiration','meal':'day','servings':2,'time_budget':30,'equipment':'pan','pantry':[]},request_id='audit_household_day_001')
    assert result['day']['status']=='calculated_draft'
    expected={i['food_id']:i['grams_edible'] for i in result['day']['shopping']}
    pending=action(svc,'accept_day',result['recipes'][0]['recipe_id']);confirm(svc,pending)
    opened=svc.opened('synthetic-one');plan=opened['state']['plans'][-1]
    doc,_=svc.load('synthetic-one');assert doc['kitchen']['plan_servings'][plan['plan_id']]==2
    actual={i['food_id']:i['grams_edible'] for i in opened['shopping']}
    assert actual.keys()==expected.keys()
    for fid,grams in actual.items():assert grams==pytest.approx(expected[fid],abs=.02)
    assert not plan['days'][0]['issues']

@pytest.mark.parametrize('relative',['cloudflare-saas/public/app.js','service/static/app.js'])
def test_all_supported_allergens_are_represented_and_unknown_saved_values_preserved(relative):
    source=(Path(__file__).resolve().parents[1]/relative).read_text()
    literal=re.search(r'const ALLERGENS=(\[.*?\]);',source).group(1)
    ids=set(re.findall(r"\['([^']+)',",literal))
    assert ids==k.ALLERGENS
    assert "p.allergies.filter(id=>!ALLERGENS.some(a=>a[0]===id))" in source
    assert 'Сохранённое ограничение:' in source

def test_transient_bridge_does_not_claim_local_or_azure_persistence():
    svc=Service(MemoryStore('audit-synthetic',None),FakeBrain(),recipe_designer=Offline())
    result=svc.opened('audit-synthetic')
    assert result['state']['capabilities']['storage']=='caller_private_storage; transient_compute_only'
    assert 'не проверен' not in result['message']
    assert 'Google sign-in does not grant' in result['state']['capabilities']['google_sync']


def test_openapi_unsupported_MCP_operations_have_distinct_stable_ids():
    from service.app import app
    schema=app.openapi()
    assert schema['paths']['/mcp']['get']['operationId']=='mcp_stream_not_offered_get'
    assert schema['paths']['/mcp']['delete']['operationId']=='mcp_stream_not_offered_delete'
