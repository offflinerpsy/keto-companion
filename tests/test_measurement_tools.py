import copy, json
import pytest
from service.domain import Service,k
from service.store import SQLiteStore,Conflict
from test_service import FakeBrain,consent

@pytest.fixture
def svc(tmp_path):
    s=Service(SQLiteStore(tmp_path/'state.db'),FakeBrain());consent(s);return s

def session(**extra):
    return {'measured_at':'2026-11-09T10:30:00-05:00','timezone':'America/New_York',**extra}

def proposal(s,kind,payload):
    rev=s.opened('synthetic-one')['state']['revision']
    return s.propose('synthetic-one',kind,payload,rev)

def apply(s,r):
    return s.apply('synthetic-one',r['proposal']['id'],r['state']['revision'],True)

def test_pair_add_correct_delete_roundtrip_and_intake(svc):
    before=svc.opened('synthetic-one')['state']['kitchen']['today_summary']
    p=proposal(svc,'measurement.add',session(glucose={'value':'90,08','unit':'mg/dL'},bhb={'value':2,'unit':'mmol/L'}))
    assert not p['state']['measurements']
    a=apply(svc,p);m=a['state']['measurements'][0]
    assert m['gki']['value']==pytest.approx(2.5) and m['glucose']['value']==90.08
    assert a['state']['kitchen']['today_summary']==before
    exported=json.loads(svc.export('synthetic-one')['text'])['core']
    assert k.parse_state_document(json.dumps(exported))['measurements'][0]['measurement_id']==m['measurement_id']
    p=proposal(svc,'measurement.update',{'measurement_id':m['measurement_id'],'session':session(bhb={'value':0,'unit':'mmol/L'})})
    m=apply(svc,p)['state']['measurements'][0]
    assert m['gki']['value'] is None and m['measurement_id']==exported['measurements'][0]['measurement_id']
    p=proposal(svc,'measurement.delete',{'measurement_id':m['measurement_id']})
    assert apply(svc,p)['state']['measurements']==[]

def test_unpaired_and_zero_do_not_generate_gki(svc):
    for data in [session(glucose={'value':4,'unit':'mmol/L'}),session(bhb={'value':1,'unit':'mmol/L'})]:apply(svc,proposal(svc,'measurement.add',data))
    assert all(x['gki']['value'] is None for x in svc.opened('synthetic-one')['state']['measurements'])
    assert k.measurement_gki({'glucose':{'value':4,'unit':'mmol/L'},'bhb':{'value':0,'unit':'mmol/L'}})['value'] is None

@pytest.mark.parametrize('bad',[session(glucose={'value':-1,'unit':'mmol/L'}),session(glucose={'value':'NaN','unit':'mmol/L'}),session(bhb={'value':1,'unit':'mg/dL'}),session(glucose={'value':True,'unit':'mmol/L'}),{'measured_at':'2026-11-09T10:30:00','timezone':'America/New_York','bhb':{'value':1,'unit':'mmol/L'}},session()])
def test_invalid_measurements_rejected(svc,bad):
    with pytest.raises((ValueError,TypeError)):proposal(svc,'measurement.add',bad)

def test_old_document_and_gl_unknowns(svc):
    state=k.new_state('a','a');del state['measurements'];assert 'measurements' not in k.parse_state_document(json.dumps(state))
    food=copy.deepcopy(next(iter(svc.base['foods'].values())))
    food.update(carbohydrate_total_g=20,fiber_g=5)
    gi={'value':40,'source':'source','preparation':food['state'],'scale':'glucose_100'}
    assert k.calculate_food_portion(food,200)['gl'] is None
    assert k.calculate_food_portion(food,200,gi)['gl']==pytest.approx(12)
    assert k.calculate_food_portion(food,200,dict(gi,scale='bread_100'))['gl'] is None
    assert k.calculate_food_portion(food,200,dict(gi,preparation='different'))['gl'] is None
    food['fiber_g']=None
    assert k.calculate_food_portion(food,200,gi)['gl'] is None

def test_stale_proposal_and_food_api(svc):
    p=proposal(svc,'measurement.add',session(glucose={'value':4,'unit':'mmol/L'}));apply(svc,p)
    with pytest.raises(Conflict):svc.propose('synthetic-one','measurement.add',session(bhb={'value':1,'unit':'mmol/L'}),p['state']['revision'])
    food=next(iter(svc.base['foods'].values()));r=svc.kitchen('synthetic-one','food_portion',values={'food_id':food['food_id'],'grams':100})
    assert r['food']['name_ru']==food['name_ru'] and r['portion']['gi_status']=='unknown'

def test_model_context_excludes_measurements(svc):
    class CapturingBrain(FakeBrain):
        def infer(self,message,ctx,image):
            self.context=ctx
            return super().infer(message,ctx,image)
    svc.brain=CapturingBrain()
    apply(svc,proposal(svc,'measurement.add',session(glucose={'value':97.12345,'unit':'mg/dL'},context='private-marker-measurement')))
    svc.chat('synthetic-one','Расскажи о продуктах','request_measure_privacy_1')
    serialized=json.dumps(svc.brain.context,ensure_ascii=False)
    assert 'private-marker-measurement' not in serialized and '97.12345' not in serialized and 'measurements' not in serialized

def test_parser_string_zero_bhb_snapshot_no_division_by_zero(svc):
    old=k.new_state('synthetic-one','synthetic-one')
    old['measurements']=[dict(session(glucose={'value':'90.08','unit':'mg/dL'},bhb={'value':'0','unit':'mmol/L'}),measurement_id='event_123456',recorded_at='2026-11-09T15:30:00+00:00')]
    parsed=k.parse_state_document(json.dumps(old))
    assert parsed['measurements'][0]['bhb']['value']==0.0
    doc,_=svc.load('synthetic-one');doc['core']['measurements']=parsed['measurements']
    assert svc.snapshot(doc)['measurements'][0]['gki']['value'] is None
    doc['core']['measurements']=old['measurements']
    assert svc.snapshot(doc)['measurements'][0]['gki']['value'] is None
