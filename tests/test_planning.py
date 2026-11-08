"""Synthetic starter-v1 policy and confirmation checks; no model/cloud calls."""
import copy
from datetime import datetime,timezone,timedelta
import pytest
from service.domain import Service,k
from service import planning
from service.store import SQLiteStore,Conflict
from test_service import FakeBrain,healthy,consent,event
@pytest.fixture
def svc(tmp_path):return Service(SQLiteStore(tmp_path/'planning.db'),FakeBrain())
def configured(svc,subject='synthetic-one',**changes):
 svc.consent(subject,True,True,True,True);d,v=svc.load(subject);screen={key:(key in ['adult','medications_reviewed','allergies_reviewed']) for key in k.SCREEN_FIELDS};d['core']['profile']['screening']=screen
 d['core']['profile']['timezone']='Europe/Minsk';values={'baseline':{'age_years':'40','height_cm':'170','weight_kg':'70','equation_category':'female','activity':'light','measured_at':datetime.now(timezone.utc).date().isoformat()},'choices':{'goal':'maintain','mode':'starter'},'timezone':'Europe/Minsk'}
 for key,value in changes.items():
  if key in values['baseline']:values['baseline'][key]=value
  elif key in values['choices']:values['choices'][key]=value
 d['core']['profile']['baseline']=planning.baseline_valid(values['baseline'],k);d['guidance_choices']=values['choices'];svc.save(subject,d,v);return values

def accept_guidance(svc,subject='synthetic-one'):
 r=svc.guidance(subject,'preview');p=svc.guidance(subject,'propose',preview_hash=r['preview']['preview_hash']);return svc.apply(subject,p['proposal']['id'],p['state']['revision'],True)
def test_golden_and_explicit_save(svc):
 configured(svc);r=svc.guidance('synthetic-one','preview')['preview'];assert r['calculation']['resting_energy_estimate_kcal']==1402;assert r['calculation']['maintenance_estimate_kcal']==2242;assert r['candidate']=={'energy_min_kcal':2130,'energy_max_kcal':2350,'protein_min_g':80,'protein_max_g':115,'carb_basis':'total','carb_max_g':100,'fiber_min_g':31,'saturated_fat_max_pct':10};assert svc.opened('synthetic-one')['state']['profile']['targets'] is None
 applied=accept_guidance(svc);assert applied['state']['profile']['targets']['energy_min_kcal']==2130;assert applied['state']['guidance']['provenance']['source']=='starter_policy';assert svc.brain.calls==0

def test_loss_and_rounding(svc):
 configured(svc,goal='loss',mode='keto');r=svc.guidance('synthetic-one','preview')['preview'];assert r['calculation']['loss_product_deduction_kcal']==pytest.approx(224.2);assert r['candidate']['energy_min_kcal']==1920;assert r['candidate']['energy_max_kcal']==2120;assert r['candidate']['fiber_min_g']==28;assert r['candidate']['carb_max_g']==50;assert planning.round10(1205)==1210;assert planning.round10(1215)==1220
@pytest.mark.parametrize('value',[None,'','NaN','Infinity','-Infinity',True,'1.2.3','текст'])
def test_bad_number(value):
 with pytest.raises(ValueError):planning.number(value)
def test_decimal_comma_and_missing_no_defaults(svc):
 assert planning.number('72,5')==72.5;consent(svc);r=svc.guidance('synthetic-one','preview')['preview'];assert r['candidate'] is None and 'weight_kg' in r['missing'];assert not svc.opened('synthetic-one')['state']['profile']['baseline']
@pytest.mark.parametrize('key,value,reason',[('age_years',18,'age_outside_19_78'),('age_years',79,'age_outside_19_78'),('age_years',17,'adult_only'),('equation_category','not_selected','equation_coefficient_required'),('goal','gain','gain_needs_individual_plan'),('weight_kg',40,'bmi_outside_pilot_scope'),('weight_kg',110,'bmi_outside_pilot_scope')])
def test_scope_fail_closed(svc,key,value,reason):
 configured(svc,**{key:value});r=svc.guidance('synthetic-one','preview')['preview'];assert r['candidate'] is None and reason in r['reasons']
@pytest.mark.parametrize('flag',['pregnant','breastfeeding','type1_diabetes','sglt2','kidney_disease','eating_disorder_risk','liver_pancreas_gallbladder_disease'])
def test_clinical_flags(svc,flag):
 configured(svc);d,v=svc.load('synthetic-one');d['core']['profile']['screening'][flag]=True;svc.save('synthetic-one',d,v);r=svc.guidance('synthetic-one','preview')['preview'];assert not r['candidate'] and flag in r['reasons']
def test_unknown_medication_and_hold(svc):
 configured(svc);d,v=svc.load('synthetic-one');d['core']['profile']['medications']=[{'name':'synthetic medication','class':'unknown'}];d['holds']=['medication_review'];svc.save('synthetic-one',d,v);r=svc.guidance('synthetic-one','preview')['preview'];assert not r['candidate'];assert 'unknown_medication' in r['reasons']
def test_bmi_edges_loss_and_floor(svc):
 configured(svc,height_cm=200,weight_kg=74);assert svc.guidance('synthetic-one','preview')['preview']['bmi']==18.5
 configured(svc,height_cm=200,weight_kg=140);assert not svc.guidance('synthetic-one','preview')['preview']['candidate']
 configured(svc,height_cm=200,weight_kg=79,goal='loss');assert 'loss_requires_bmi_20' in svc.guidance('synthetic-one','preview')['preview']['reasons']
 configured(svc,age_years=78,height_cm=150,weight_kg=45,activity='sitting',goal='loss');r=svc.guidance('synthetic-one','preview')['preview'];assert 'lower_bound_below_product_floor_choose_maintain_or_review' in r['reasons'];assert r['candidate'] is None

def test_stage_resume_and_goal_mode_reload(svc):
 assert svc.opened('synthetic-one')['state']['guidance']['stage']=='consent';consent(svc);assert svc.opened('synthetic-one')['state']['guidance']['stage']=='about';values=configured(svc);d,v=svc.load('synthetic-one');d['core']['profile']['screening']['pregnant']=None;svc.save('synthetic-one',d,v);assert svc.opened('synthetic-one')['state']['guidance']['stage']=='restrictions'
 configured(svc);assert svc.opened('synthetic-one')['state']['guidance']['stage']=='targets';accept_guidance(svc);assert svc.opened('synthetic-one')['state']['guidance']['stage']=='ready';assert Service(svc.store,svc.brain).opened('synthetic-one')['state']['guidance']['choices']==values['choices']

def test_baseline_pipeline_no_consent_no_save(svc):
 values={'baseline':{'age_years':40,'height_cm':170,'weight_kg':70,'equation_category':'female','activity':'light','measured_at':'2026-11-07'},'choices':{'goal':'maintain','mode':'starter'},'timezone':'Europe/Minsk'}
 with pytest.raises(ValueError):svc.guidance('synthetic-one','baseline',values=values)
 assert svc.store.read('synthetic-one')==(None,None);consent(svc);r=svc.guidance('synthetic-one','baseline',values=values);assert not r['state']['profile']['baseline'];r=svc.apply('synthetic-one',r['proposal']['id'],r['state']['revision'],True);assert r['state']['profile']['baseline']['weight_kg']==70

def test_stale_cross_user_and_manual_preserved(svc):
 configured(svc);configured(svc,subject='synthetic-two');a=svc.guidance('synthetic-one','preview')['preview'];
 with pytest.raises(Conflict):svc.guidance('synthetic-two','propose',preview_hash=a['preview_hash'])
 p=svc.guidance('synthetic-one','propose',preview_hash=a['preview_hash']);event(svc,'profile.update',{'baseline':dict(p['state']['profile']['baseline'],weight_kg=75)})
 with pytest.raises(Conflict):svc.apply('synthetic-one',p['proposal']['id'],p['state']['revision'],True)
 accept_guidance(svc);event(svc,'profile.update',{'baseline':dict(svc.opened('synthetic-one')['state']['profile']['baseline'],weight_kg=76)})
 assert svc.opened('synthetic-one')['state']['guidance']['targets_stale']
 with pytest.raises(ValueError):svc.menu('synthetic-one','2026-11-09',1)
 with pytest.raises(ValueError):svc.export('synthetic-one','pdf')

def test_manual_existing_and_name_only(svc):
 healthy(svc);before=copy.deepcopy(svc.opened('synthetic-one')['state']['profile']['targets']);svc.guidance('synthetic-one','preview');assert svc.opened('synthetic-one')['state']['profile']['targets']==before
 configured(svc);accept_guidance(svc);event(svc,'profile.update',{'display_name':'Новое имя'});assert not svc.opened('synthetic-one')['state']['guidance']['targets_stale']

def test_actual_two_profiles_no_handwritten_targets(svc,record_property):
 results=[]
 for subject,params in [('synthetic-one',{}),('synthetic-two',{'equation_category':'male','age_years':50,'height_cm':180,'weight_kg':85,'activity':'sitting','mode':'keto'})]:
  configured(svc,subject=subject,**params);accept_guidance(svc,subject)
  try:
   result=svc.menu(subject,'2026-11-09',1)
   if result['plan']:assert all(not day['issues'] for day in result['plan']['days']);results.append('calculated')
   else:assert result['reference_only'] and result['constraints'] and result['message'];results.append('catalog_infeasible')
  except k.KetoError as error:assert str(error);results.append('catalog_infeasible')
 assert len(results)==2
 record_property('automatic_menu_outcomes',str(results))

def test_net_manual_and_review_rules(svc):
 configured(svc);accept_guidance(svc);d,v=svc.load('synthetic-one');d['core']['profile']['baseline']['measured_at']=(datetime.now(timezone.utc)-timedelta(days=40)).date().isoformat();d['core']['profile']['baseline']['weight_kg']=75;svc.save('synthetic-one',d,v);r=svc.guidance('synthetic-one','preview')['preview'];assert len(r['review'])==2
 t=svc.opened('synthetic-one')['state']['profile']['targets'];event(svc,'targets.update',dict(t,carb_basis='net_estimate',basis_note='Manual specialist data'));assert svc.opened('synthetic-one')['state']['guidance']['provenance']['source']=='manual';assert svc.opened('synthetic-one')['state']['profile']['targets']['carb_basis']=='net_estimate'
@pytest.mark.parametrize('field,value',[('goal','loss'),('mode','keto')])
def test_goal_or_mode_change_makes_computed_targets_stale_without_overwriting(svc,field,value):
 values=configured(svc);applied=accept_guidance(svc);old=copy.deepcopy(applied['state']['profile']['targets']);values['choices'][field]=value;r=svc.guidance('synthetic-one','baseline',values=values);r=svc.apply('synthetic-one',r['proposal']['id'],r['state']['revision'],True);assert r['state']['guidance']['targets_stale'];assert r['state']['profile']['targets']==old

def test_male_manual_floor_and_untrusted_candidate(svc):
 configured(svc,equation_category='male',height_cm=180,weight_kg=85);preview=svc.guidance('synthetic-one','preview')['preview'];r=svc.guidance('synthetic-one','propose',values={'energy_min_kcal':1200},preview_hash=preview['preview_hash']);assert r['proposal']['payload']['candidate']==preview['candidate'];t=dict(preview['candidate'],status='agreed',agreed_at='2026-11-08',basis_note='manual',energy_min_kcal=1400)
 with pytest.raises(ValueError):event(svc,'targets.update',t)

def test_calorie_chat_is_canonical_and_not_model_generated_even_at_model_cap(svc):
 configured(svc);d,v=svc.load('synthetic-one');d['usage']={'day':datetime.now(timezone.utc).date().isoformat(),'calls':60,'input_tokens':0,'output_tokens':0};svc.save('synthetic-one',d,v);r=svc.chat('synthetic-one','Сколько мне калорий?','guidance_calorie_1');assert r['model_called'] is False;assert r['guidance_preview']['candidate']['energy_min_kcal']==2130;assert svc.brain.calls==0
