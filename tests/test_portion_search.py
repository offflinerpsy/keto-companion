"""Real synthetic setup-to-menu checks; no handwritten calorie targets."""
import copy
import pytest
from service.domain import Service,k
from service.store import SQLiteStore
from service.portion_search import fit_plan,fit_portions
from test_service import FakeBrain
from test_planning import configured,accept_guidance

@pytest.fixture
def svc(tmp_path):return Service(SQLiteStore(tmp_path/'portions.db'),FakeBrain())

def test_keto_one_day_from_actual_setup_without_manual_calories(svc):
 configured(svc,height_cm=165,weight_kg=70,age_years=40,activity='sitting',goal='loss',mode='keto')
 preview=svc.guidance('synthetic-one','preview')['preview'];assert preview['catalogue_check']['feasible']
 accept_guidance(svc);before=copy.deepcopy(svc.opened('synthetic-one')['state']['profile']['targets']);result=svc.menu('synthetic-one','2026-11-09',1)
 assert result['plan'] and all(not x['issues'] for x in result['plan']['days'])
 assert svc.opened('synthetic-one')['state']['profile']['targets']==before
 assert svc.brain.calls==0

def test_starter_second_profile_from_setup(svc):
 configured(svc,height_cm=165,weight_kg=80,activity='light',goal='loss',mode='starter');accept_guidance(svc)
 result=svc.menu('synthetic-one','2026-11-09',1);assert result['plan'] and all(not d['issues'] for d in result['plan']['days'])

def test_portion_search_never_erases_exclusions_or_changes_targets(svc):
 configured(svc,height_cm=165,weight_kg=70,activity='sitting',goal='loss',mode='keto');accept_guidance(svc)
 profile=copy.deepcopy(svc.opened('synthetic-one')['state']['profile']);profile['settings']['excluded_food_ids']=list(svc.base['foods']);before=copy.deepcopy(profile)
 assert fit_plan(k,svc.base,profile,'2026-11-09') is None
 assert profile==before

def test_missing_nutrient_is_not_zero(svc):
 configured(svc);accept_guidance(svc);p=svc.opened('synthetic-one')['state']['profile'];c=k.calculate_recipe(svc.base,next(iter(svc.base['recipes'])));c['nutrition']['protein_g']=None
 assert fit_portions([c],p['targets']) is None
