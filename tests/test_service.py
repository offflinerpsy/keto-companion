import copy,hashlib,json,time,threading,io,base64
from pathlib import Path
import pytest
from fastapi.testclient import TestClient
from service.store import SQLiteStore,Conflict,safe_key
from service.domain import Service,k,InputError,ui_valid,new_document
from service.brain import AzureBrain,BrainUnavailable,SCHEMA
from service.app import create_app,TOOLS,image_clean
KEY='synthetic_test_access_code_never_production_123456789'
AUTH=[{'subject':'synthetic-one','sha256':hashlib.sha256(KEY.encode()).hexdigest(),'kind':'demo'}]
def parsed(intent='help',**kwargs):
 d={'intent':intent,'reply_ru':'Понятное объяснение.','query':'','changes':[],'safety_signals':['none'],'days':1,'diary_note':''};d.update(kwargs);return d
class FakeBrain:
 def __init__(self):self.calls=0;self.result=parsed();self.hook=None
 def infer(self,*a,**kw):
  self.calls+=1
  if self.hook:self.hook()
  if isinstance(self.result,Exception):raise self.result
  return copy.deepcopy(self.result)
@pytest.fixture
def svc(tmp_path):return Service(SQLiteStore(tmp_path/'state.db'),FakeBrain())
@pytest.fixture
def client(svc):
 app=create_app(svc,AUTH,'test_signing_secret','http://testserver',testing=True)
 with TestClient(app) as c:yield c

def consent(svc):return svc.consent('synthetic-one',True,True,True,True,'demo')
def event(svc,typ,payload):
 d,_=svc.load('synthetic-one','demo');p=svc.propose('synthetic-one',typ,payload,d['revision'],'demo')['proposal'];return svc.apply('synthetic-one',p['id'],d['revision'],True,'demo')
def healthy(svc):
 consent(svc);s={x:False for x in k.SCREEN_FIELDS}
 for x in ['adult','medications_reviewed','allergies_reviewed']:s[x]=True
 event(svc,'profile.update',{'screening':s,'timezone':'Europe/Minsk'})
 event(svc,'targets.update',{'status':'agreed','agreed_at':'2026-11-07T00:00:00Z','basis_note':'SYNTHETIC ONLY','energy_min_kcal':1700,'energy_max_kcal':1900,'protein_min_g':85,'protein_max_g':180,'carb_basis':'net_estimate','carb_max_g':40,'fiber_min_g':25,'saturated_fat_max_pct':10})

def test_baseline_catalog(svc):assert len(svc.base['recipes'])==72
@pytest.mark.parametrize('bad',['../other','a/b','', 'x'*101])
def test_key_validation(bad):
 with pytest.raises(ValueError):safe_key(bad)
def test_storage_cas(svc):
 s=svc.store;v=s.write('abc',{'x':1},None)
 with pytest.raises(Conflict):s.write('abc',{'x':2},None)
 assert s.read('abc')[0]['x']==1
 s.write('abc',{'x':3},v)
 with pytest.raises(Conflict):s.write('abc',{'x':4},v)
def test_no_data_written_before_consent(svc):
 r=svc.chat('synthetic-one','Привет','request001',kind='demo');assert not r['model_called'];assert svc.brain.calls==0;assert svc.store.read('synthetic-one')==(None,None)
def test_read_recipes_no_consent(svc):assert svc.catalog('synthetic-one','яйца')['recipes']
def test_unknown_screening_not_healthy(svc):consent(svc);assert not svc.opened('synthetic-one')['state']['screening']['can_plan']
def test_no_plan_without_targets(svc):
 consent(svc)
 with pytest.raises(k.KetoError):svc.menu('synthetic-one','2026-11-08',1)
@pytest.mark.parametrize('payload',[{'theme':'rainbow'},{'text_size':True},{'simple_mode':'true'},{'show_nutrition':1},{'execute':'rm -rf'},{'sglt2':False}])
def test_ui_reject_invalid(payload):
 with pytest.raises(InputError):ui_valid(payload)
def test_propose_not_apply(svc):
 consent(svc);r=svc.propose('synthetic-one','ui',{'text_size':'large'},1);assert r['state']['ui']['text_size']=='normal'
def test_apply_idempotent(svc):
 consent(svc);p=svc.propose('synthetic-one','ui',{'text_size':'large'},1)['proposal'];r=svc.apply('synthetic-one',p['id'],1,True);r2=svc.apply('synthetic-one',p['id'],1,True);assert r['state']['ui']['text_size']=='large';assert r2['receipt']==r['receipt']
def test_cancel(svc):
 consent(svc);p=svc.propose('synthetic-one','ui',{'text_size':'large'},1)['proposal'];r=svc.apply('synthetic-one',p['id'],1,False);assert r['state']['ui']['text_size']=='normal';assert not r['state']['pending']
def test_revision_conflict(svc):
 consent(svc);p=svc.propose('synthetic-one','ui',{'text_size':'large'},1)['proposal'];event(svc,'settings.update',{'max_active_minutes':20})
 with pytest.raises(Conflict):svc.apply('synthetic-one',p['id'],1,True)
def test_atomic_configuration(svc):
 consent(svc);r=event(svc,'configuration',{'ui':{'text_size':'large'},'settings':{'max_active_minutes':15}});assert r['state']['ui']['text_size']=='large';assert r['state']['profile']['settings']['max_active_minutes']==15
 with pytest.raises(k.KetoError):event(svc,'configuration',{'ui':{'text_size':'normal'},'settings':{'max_active_minutes':-1}})
 assert svc.opened('synthetic-one')['state']['ui']['text_size']=='large'
def test_rollback_ui(svc):
 consent(svc);r=event(svc,'ui',{'theme':'dark'});h=r['state']['ui_history'][0]['id'];r=event(svc,'ui.rollback',{'history_id':h});assert r['state']['ui']['theme']=='ivory-plum'
def test_diary_add_delete(svc):
 consent(svc);r=event(svc,'diary.add',{'date':'2026-11-07','note':'Завтрак понравился','intake_status':'unquantified'});assert len(r['state']['diary'])==1;e=r['state']['diary'][0]['entry_id'];assert not event(svc,'diary.delete',{'entry_id':e})['state']['diary']
def test_allergy_filter(svc):
 consent(svc);event(svc,'profile.update',{'allergies':['egg']});rs=svc.catalog('synthetic-one','',72)['recipes'];assert rs and all('egg' not in r['allergens'] for r in rs)
def test_forged_medication_review(svc):
 consent(svc)
 with pytest.raises(InputError):event(svc,'profile.update',{'medications':[{'name':'abc','class':'reviewed_other'}]})
def test_help_live_not_fabricated(svc):
 consent(svc);r=svc.chat('synthetic-one','Как это работает?','request002');assert r['model_called'];assert svc.brain.calls==1;assert 'Рецепты' in r['message']
def test_request_replay(svc):
 consent(svc);a=svc.chat('synthetic-one','Привет','request003');b=svc.chat('synthetic-one','Привет','request003');assert b['replayed'];assert svc.brain.calls==1
 with pytest.raises(Conflict):svc.chat('synthetic-one','Другой текст','request003')
def test_request_in_flight(svc):
 consent(svc)
 def check():
  with pytest.raises(Conflict):svc.chat('synthetic-one','Привет','request004')
 svc.brain.hook=check;svc.chat('synthetic-one','Привет','request004');assert svc.brain.calls==1
def test_revoke_during_inference(svc):
 consent(svc);svc.brain.hook=lambda:svc.consent('synthetic-one',False,False,False,True)
 r=svc.chat('synthetic-one','Привет','request005');assert not r['state']['chat'];assert not r['state']['processing_consent']
def test_model_unavailable(svc):
 consent(svc);svc.brain.result=BrainUnavailable('test');r=svc.chat('synthetic-one','Привет','request006');assert r['error_code']=='MODEL_UNAVAILABLE';assert not r['state']['pending']
def test_model_preferences_no_auto_commit(svc):
 consent(svc);svc.brain.result=parsed('preferences',changes=[{'key':'ui.text_size','json_value':'"large"'}]);r=svc.chat('synthetic-one','Сделай текст крупнее','request007');assert r['proposal'];assert r['state']['ui']['text_size']=='normal'
def test_model_mixed_atomic(svc):
 consent(svc);svc.brain.result=parsed('preferences',changes=[{'key':'ui.text_size','json_value':'"large"'},{'key':'settings.max_active_minutes','json_value':'15'}]);r=svc.chat('synthetic-one','Крупнее и готовка15','request008');assert r['proposal']['type']=='configuration'
def test_model_arbitrary_code_not_executed(svc):
 consent(svc);svc.brain.result=parsed('preferences',changes=[{'key':'execute','json_value':'"echo pwned"'}]);r=svc.chat('synthetic-one','Перепиши код','request009');assert not r['state']['pending']
def test_feature_request_not_done(svc):
 consent(svc);svc.brain.result=parsed('feature_request');r=svc.chat('synthetic-one','Хочу новую функцию','request010');assert r['proposal']['type']=='feature.request';assert not r['state']['ui_history']
def test_model_no_false_profile(svc):
 consent(svc);svc.brain.result=parsed('onboarding');r=svc.chat('synthetic-one','Я здорова','request011');assert not r['state']['screening']['can_plan']
def test_model_profile_proposal(svc):
 consent(svc);svc.brain.result=parsed('onboarding',changes=[{'key':'profile.display_name','json_value':'"Тест"'}]);r=svc.chat('synthetic-one','Зови меня Тест','request012');assert r['proposal']['payload']['display_name']=='Тест';assert r['state']['profile']['display_name'] is None
@pytest.mark.parametrize('message,flag',[('Я принимаю Форсигу, хочу кето','medication_review'),('Я беременна','pregnancy'),('У меня сильная боль в груди','urgent')])
def test_safety_fastpath(svc,message,flag):
 consent(svc);r=svc.chat('synthetic-one',message,'request013');assert flag in r['state']['holds'];assert not r['model_called']
def test_negation_not_urgent(svc):
 consent(svc);r=svc.chat('synthetic-one','У меня нет сильной боли в груди','request014');assert not r['state']['holds']
def test_daily_cap(svc,monkeypatch):
 consent(svc);monkeypatch.setenv('KETO_DAILY_REQUEST_LIMIT','1');svc.chat('synthetic-one','Привет','request015')
 with pytest.raises(InputError):svc.chat('synthetic-one','Привет','request016')
def test_delete_owned_data(svc):
 consent(svc);svc.delete_profile('synthetic-one',1,'DELETE_MY_PROFILE');assert svc.store.read('synthetic-one')==(None,None)
def test_export_after_revoke(svc):
 consent(svc);svc.consent('synthetic-one',False,False,False,True);assert 'keto-personal-export-v2' in svc.export('synthetic-one')['text']
def test_healthy_plan(svc):
 healthy(svc);plan=svc.menu('synthetic-one','2026-11-08',1)['plan'];assert all(not d['issues'] for d in plan['days']);event(svc,'plan.accept',plan);assert '<h1>' in svc.export('synthetic-one','html')['text'];assert 'recipe_id' in svc.export('synthetic-one','csv')['text']
def test_pending_allergy_blocks(svc):
 healthy(svc);d,_=svc.load('synthetic-one');svc.propose('synthetic-one','profile.update',{'allergies':['egg']},d['revision'])
 with pytest.raises(k.SafetyError):svc.menu('synthetic-one','2026-11-08',1)
def test_unauthorized(client):assert client.post('/api/tools/keto_open',json={}).status_code==401

def login(c):
 r=c.post('/api/login',json={'access_code':KEY});assert r.status_code==200;return {'x-csrf-token':r.json()['csrf']}
def test_cookie_csrf(client):
 h=login(client);assert 'HttpOnly' in client.cookies.get('keto_session','') or client.cookies.get('keto_session');assert client.post('/api/tools/keto_open',json={}).status_code==403;assert client.post('/api/tools/keto_open',json={},headers=h).status_code==200
@pytest.mark.parametrize('route',['/api/tools/keto_open','/mcp'])
def test_evil_origin(client,route):assert client.post(route,json={},headers={'Origin':'https://evil.example'}).status_code==403

def test_host_validation(client):assert client.get('/status',headers={'Host':'evil.example'}).status_code==400

def test_login_bruteforce(client):
 for _ in range(10):assert client.post('/api/login',json={'access_code':'bad'}).status_code==401
 assert client.post('/api/login',json={'access_code':'bad'}).status_code==429

def test_tools_types(client):
 h=login(client);r=client.post('/api/tools/keto_propose_change',json={'event_type':'ui','payload':{},'expected_revision':'1'},headers=h);assert r.status_code==422

def rpc(c,method,params={}):return c.post('/mcp',headers={'Authorization':'Bearer '+KEY},json={'jsonrpc':'2.0','id':1,'method':method,'params':params})
def test_mcp_initialize(client):assert rpc(client,'initialize',{'protocolVersion':'2025-11-25'}).json()['result']['serverInfo']['version']=='0.2.1'
def test_mcp_tools(client):
 ts=rpc(client,'tools/list').json()['result']['tools'];assert len(ts)==13;assert any(t['name']=='keto_kitchen' and not t['annotations']['readOnlyHint'] for t in ts);assert next(t for t in ts if t['name']=='keto_apply_proposal')['_meta']['ui']['visibility']==['app']
def test_mcp_open(client):assert rpc(client,'tools/call',{'name':'keto_open','arguments':{}}).json()['result']['structuredContent']['state']['revision']==0

def test_mcp_no_cookie_auth(client):login(client);assert client.post('/mcp',json={}).status_code==401

def test_mcp_invalid_params(client):assert rpc(client,'initialize',[]).status_code==400

def test_mcp_bad_json(client):assert client.post('/mcp',headers={'Authorization':'Bearer '+KEY},content='{').status_code==400

def test_mcp_unsupported_get(client):assert client.get('/mcp').status_code==405

def test_security_headers(client):
 r=client.get('/');assert "script-src 'self'" in r.headers['content-security-policy'];assert r.headers['cache-control']=='no-store'
@pytest.mark.parametrize('value',['https://evil/a.jpg','data:image/svg+xml;base64,eA==','data:image/png;base64,!!!'])
def test_image_reject(value):
 with pytest.raises(InputError):image_clean(value)
def test_image_reencoded():
 from PIL import Image
 b=io.BytesIO();Image.new('RGB',(30,30)).save(b,format='PNG');v=image_clean('data:image/png;base64,'+base64.b64encode(b.getvalue()).decode());assert v.startswith('data:image/jpeg;base64,')
def response(p):return {'status':'completed','output':[{'content':[{'type':'output_text','text':json.dumps(p)}]}],'usage':{'input_tokens':10,'output_tokens':5}}
def test_strict_model_response():assert AzureBrain(lambda _:response(parsed())).infer('hi',{})['intent']=='help'
@pytest.mark.parametrize('data',[{}, {'intent':'bad'},[], 'hello'])
def test_model_wrong_shape(data):
 with pytest.raises(BrainUnavailable):AzureBrain(lambda _:response(data)).infer('hi',{})

# Continuation regressions: synthetic identities and inputs only.
def test_expired_profile_proposal_can_be_cancelled_and_does_not_block(svc):
 healthy(svc);d,v=svc.load('synthetic-one');p=svc.propose('synthetic-one','profile.update',{'allergies':['egg']},d['revision'])['proposal']
 d,v=svc.load('synthetic-one');d['pending'][p['id']]['expires_at']=time.time()-1;svc.save('synthetic-one',d,v)
 assert svc.opened('synthetic-one')['state']['pending'][0]['expired']
 assert svc.menu('synthetic-one','2026-11-08',1)['plan']
 with pytest.raises(InputError):svc.apply('synthetic-one',p['id'],d['revision'],True)
 assert not svc.apply('synthetic-one',p['id'],d['revision'],False)['state']['pending']

def test_new_hold_invalidates_menu_proposal_and_exports(svc):
 healthy(svc);d,_=svc.load('synthetic-one');plan=svc.menu('synthetic-one','2026-11-08',1)['plan'];p=svc.propose('synthetic-one','plan.accept',plan,d['revision'])['proposal']
 svc.chat('synthetic-one','Я принимаю Форсигу','requesthold1')
 with pytest.raises((Conflict,k.SafetyError)):svc.apply('synthetic-one',p['id'],d['revision'],True)
 d,_=svc.load('synthetic-one');assert not d['core']['plans']

def test_stale_plan_export_blocked(svc):
 healthy(svc);plan=svc.menu('synthetic-one','2026-11-08',1)['plan'];event(svc,'plan.accept',plan);event(svc,'profile.update',{'allergies':['egg']})
 for fmt in ('csv','html'):
  with pytest.raises(k.SafetyError):svc.export('synthetic-one',fmt)
 assert svc.export('synthetic-one','json')['text']

def test_urgent_ignores_limit_brain_and_storage_failure(svc,monkeypatch):
 consent(svc);monkeypatch.setenv('KETO_DAILY_REQUEST_LIMIT','0');svc.brain.result=BrainUnavailable('offline')
 r=svc.chat('synthetic-one','Не могу дышать','urgent001');assert r['intent']=='safety' and not r['model_called'] and 'urgent' in r['state']['holds']
 monkeypatch.setattr(svc.store,'read',lambda *a: (_ for _ in ()).throw(OSError('offline')))
 r=svc.chat('synthetic-one','Не могу дышать','urgent002');assert r['persistence_error'] and 'экстренную' in r['message'] and 'state' not in r

def test_invalid_model_output_marks_reserved_request_failed(svc):
 consent(svc);svc.brain.result=parsed('preferences',changes=[{'key':'ui.theme','json_value':'"invalid"'}])
 with pytest.raises(InputError):svc.chat('synthetic-one','Измени вид','badmodel01')
 d,_=svc.load('synthetic-one');assert d['requests']['badmodel01']['status']=='failed';assert not d['pending']
 with pytest.raises(Conflict):svc.chat('synthetic-one','Измени вид','badmodel01')
 assert svc.brain.calls==1

def test_urgent_with_bad_image(client):
 r=rpc(client,'tools/call',{'name':'keto_chat','arguments':{'message':'Не могу дышать','request_id':'urgent003','image_data_url':'not-an-image'}}).json()['result'];assert not r['isError'];assert r['structuredContent']['intent']=='safety'

def test_confirmation_capability_hidden_and_single_use(client):
 r=rpc(client,'tools/call',{'name':'keto_open','arguments':{}}).json()['result'];token=r['_meta']['keto/uiConfirmation'];assert token not in json.dumps(r['content']) and token not in json.dumps(r['structuredContent'])
 args={'processing':True,'storage':True,'health':True,'confirmed':True,'ui_confirmation':token};assert not rpc(client,'tools/call',{'name':'keto_consent','arguments':args}).json()['result']['isError']
 assert rpc(client,'tools/call',{'name':'keto_consent','arguments':args}).json()['result']['isError']

def test_payload_bounds_bad_import_and_metadata(client):
 r=client.post('/mcp',headers={'Authorization':'Bearer '+KEY},content=b'x'*1700001);assert r.status_code==413
 meta=client.get('/.well-known/oauth-protected-resource/mcp').json();assert meta['resource']=='http://testserver/mcp' and meta['bearer_methods_supported']==['header']
 result=rpc(client,'tools/call',{'name':'keto_import_menu','arguments':{'content':'not json','format':'json','expected_revision':0}}).json()['result'];assert result['isError']

def test_production_storage_fails_closed(monkeypatch):
 from service.store import from_env
 monkeypatch.delenv('KETO_STORAGE_URL',raising=False);monkeypatch.setenv('KETO_ENV',' Production ')
 with pytest.raises(RuntimeError):from_env()
 monkeypatch.delenv('KETO_ENV');monkeypatch.setenv('WEBSITE_INSTANCE_ID','synthetic')
 with pytest.raises(RuntimeError):from_env()

@pytest.mark.parametrize('change',['issuer','audience','tenant','scope','uninvited'])
def test_entra_rejects_bad_claims(change):
 import jwt
 from cryptography.hazmat.primitives.asymmetric import rsa
 from types import SimpleNamespace
 from service.entra import EntraVerifier
 tenant='11111111-1111-1111-1111-111111111111';client='22222222-2222-2222-2222-222222222222';oid='33333333-3333-3333-3333-333333333333'
 key=rsa.generate_private_key(public_exponent=65537,key_size=2048)
 class Keys:
  def get_signing_key_from_jwt(self,token):return SimpleNamespace(key=key.public_key())
 v=EntraVerifier(tenant,client,{oid:{'subject':'synthetic-one'}},Keys());now=int(time.time())
 claims={'iss':v.issuer,'aud':client,'tid':tenant,'oid':oid,'scp':'user_impersonation','iat':now,'exp':now+300}
 field={'issuer':'iss','audience':'aud','tenant':'tid','scope':'scp','uninvited':'oid'}[change];claims[field]='wrong'
 with pytest.raises(ValueError):v.verify(jwt.encode(claims,key,algorithm='RS256'))

def test_entra_accepts_invited_identity():
 import jwt
 from cryptography.hazmat.primitives.asymmetric import rsa
 from types import SimpleNamespace
 from service.entra import EntraVerifier
 tenant='11111111-1111-1111-1111-111111111111';client='22222222-2222-2222-2222-222222222222';oid='33333333-3333-3333-3333-333333333333';key=rsa.generate_private_key(public_exponent=65537,key_size=2048)
 class Keys:
  def get_signing_key_from_jwt(self,token):return SimpleNamespace(key=key.public_key())
 v=EntraVerifier(tenant,client,{oid:{'subject':'synthetic-one'}},Keys());now=int(time.time());claims={'iss':v.issuer,'aud':client,'tid':tenant,'oid':oid,'scp':'user_impersonation','iat':now,'exp':now+300}
 assert v.verify(jwt.encode(claims,key,algorithm='RS256'))['subject']=='synthetic-one'

def test_apply_revalidates_hold_even_without_revision_change(svc):
 healthy(svc);d,_=svc.load('synthetic-one');plan=svc.menu('synthetic-one','2026-11-08',1)['plan'];p=svc.propose('synthetic-one','plan.accept',plan,d['revision'])['proposal']
 changed,v=svc.load('synthetic-one');changed['holds']=['urgent'];svc.save('synthetic-one',changed,v)
 with pytest.raises(k.SafetyError):svc.apply('synthetic-one',p['id'],d['revision'],True)
 assert not svc.load('synthetic-one')[0]['core']['plans']

def test_duplicate_pending_does_not_mark_other_call_failed(svc):
 consent(svc)
 def during_inference():
  with pytest.raises(Conflict):svc.chat('synthetic-one','Привет','pendingdup01')
  assert svc.load('synthetic-one')[0]['requests']['pendingdup01']['status']=='pending'
 svc.brain.hook=during_inference;svc.chat('synthetic-one','Привет','pendingdup01')
 assert svc.load('synthetic-one')[0]['requests']['pendingdup01']['status']=='completed' and svc.brain.calls==1
