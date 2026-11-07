"""Synthetic, local-only OAuth flows; no browser or external identity calls."""
import base64,hashlib,json,time,concurrent.futures
from urllib.parse import parse_qs,urlparse
import pytest
from cryptography.fernet import Fernet
from fastapi.testclient import TestClient
from service.app import create_app
from service.domain import Service
from service.store import SQLiteStore
from service.oauth_bridge import CLIENT,REDIRECT,SCOPE,KEY

class FakeEntra:
 def __init__(self):self.users={'oid-a':{'subject':'user-a','kind':'demo'},'oid-b':{'subject':'user-b','kind':'demo'}}
 def verify_identity(self,token):
  oid={'entra-a':'oid-a','entra-b':'oid-b','uninvited':'oid-x'}.get(token)
  if oid not in self.users:raise ValueError('denied')
  return oid,dict(self.users[oid])
 def verify(self,token):return self.verify_identity(token)[1]
class Brain:
 def infer(self,*args):raise AssertionError('No model call expected')
@pytest.fixture
def env(tmp_path):
 verifier=FakeEntra();store=SQLiteStore(tmp_path/'synthetic.sqlite');svc=Service(store,Brain())
 app=create_app(svc,public_url='https://keto.test',testing=True,entra_verifier=verifier,oauth_key=Fernet.generate_key())
 with TestClient(app) as c:yield c,verifier,store

def headers(identity='entra-a'):return {'Origin':'https://keto.test','Authorization':'Bearer '+identity}
def params(verifier='v'*64):
 challenge=base64.urlsafe_b64encode(hashlib.sha256(verifier.encode()).digest()).decode().rstrip('=')
 return {'client_id':CLIENT,'redirect_uri':REDIRECT,'response_type':'code','scope':SCOPE,'resource':'https://keto.test/mcp','code_challenge':challenge,'code_challenge_method':'S256','state':'synthetic-state'}
def start(c,p=None):
 r=c.get('/oauth/authorize',params=p or params(),follow_redirects=False);assert r.status_code==303
 return parse_qs(urlparse(r.headers['location']).query)['oauth_transaction'][0]
def complete(c,tx,identity='entra-a',approved=True):return c.post('/oauth/complete',headers=headers(identity),json={'transaction':tx,'approved':approved})
def code(c,identity='entra-a'):
 tx=start(c);assert c.post('/oauth/request',headers=headers(identity),json={'transaction':tx}).status_code==200
 r=complete(c,tx,identity);assert r.status_code==200;query=parse_qs(urlparse(r.json()['redirect']).query);assert query['state']==['synthetic-state'] and query['iss']==['https://keto.test'];return query['code'][0],tx
def token_args(code):return {'grant_type':'authorization_code','client_id':CLIENT,'resource':'https://keto.test/mcp','redirect_uri':REDIRECT,'code':code,'code_verifier':'v'*64}
def exchange(c,values):return c.post('/oauth/token',data=values)
def mcp(c,t,method='tools/list',params=None):return c.post('/mcp',headers={'Authorization':'Bearer '+t,'Accept':'application/json, text/event-stream','MCP-Protocol-Version':'2025-11-25'},json={'jsonrpc':'2.0','id':1,'method':method,'params':params or {}})

def test_metadata_and_end_to_end(env):
 c,v,store=env;md=c.get('/.well-known/oauth-authorization-server').json();assert md['issuer']=='https://keto.test' and md['code_challenge_methods_supported']==['S256'] and md['authorization_response_iss_parameter_supported'] is True
 protected=c.get('/.well-known/oauth-protected-resource/mcp').json();assert protected['authorization_servers']==['https://keto.test'] and protected['scopes_supported']==[SCOPE]
 assert c.post('/mcp',json={}).status_code==401 and 'resource_metadata=' in c.post('/mcp',json={}).headers['www-authenticate']
 cd,tx=code(c);r=exchange(c,token_args(cd));assert r.status_code==200 and r.headers['cache-control']=='no-store';tokens=r.json();access=tokens['access_token'];refresh=tokens['refresh_token']
 for method in ('initialize','tools/list','resources/list'):
  assert 'result' in mcp(c,access,method,{'protocolVersion':'2025-11-25'} if method=='initialize' else {}).json()
 uri=mcp(c,access,'resources/list').json()['result']['resources'][0]['uri'];assert mcp(c,access,'resources/read',{'uri':uri}).json()['result']['contents']
 result=mcp(c,access,'tools/call',{'name':'keto_open','arguments':{}}).json()['result'];cap=result['_meta']['keto/uiConfirmation'];assert cap not in json.dumps(result['content']) and cap not in json.dumps(result['structuredContent']);assert access not in json.dumps(result) and refresh not in json.dumps(result)
 doc,_=store.read(KEY);encoded=json.dumps(doc);assert cd not in encoded and access not in encoded and refresh not in encoded and tx not in encoded
 assert c.post('/api/tools/keto_open',headers={'Authorization':'Bearer '+access},json={}).status_code==401
 assert c.post('/api/tools/keto_open',headers={'Authorization':'Bearer entra-a'},json={}).status_code==200
 assert c.get('/mcp').status_code==405

def test_disabled_default(tmp_path):
 svc=Service(SQLiteStore(tmp_path/'test.db'),Brain());app=create_app(svc,public_url='https://keto.test',testing=True,entra_verifier=FakeEntra())
 with TestClient(app) as c:assert c.get('/.well-known/oauth-authorization-server').status_code==404

@pytest.mark.parametrize('field,value',[('client_id','evil'),('redirect_uri','https://evil.example/'),('resource','https://evil.example/mcp'),('scope','other'),('response_type','token'),('code_challenge_method','plain'),('code_challenge','x'),('state','')])
def test_authorize_rejects_before_storage(env,field,value):
 c,v,store=env;p=params();p[field]=value;r=c.get('/oauth/authorize',params=p,follow_redirects=False);assert r.status_code==400 and 'location' not in r.headers;assert store.read(KEY)==(None,None)

def test_denial_iss_state_and_no_replay(env):
 c,_,_=env;tx=start(c);r=complete(c,tx,approved=False);q=parse_qs(urlparse(r.json()['redirect']).query);assert q=={'state':['synthetic-state'],'iss':['https://keto.test'],'error':['access_denied']};assert complete(c,tx).status_code==400

def test_same_transaction_complete_once_and_uninvited(env):
 c,_,_=env;tx=start(c);assert complete(c,tx,'uninvited').status_code==401
 assert complete(c,tx).status_code==200;assert complete(c,tx,'entra-b').status_code==400

def test_exchange_verifier_bindings_replay(env):
 c,_,_=env;cd,_=code(c);base=token_args(cd)
 for field,value in [('client_id','evil'),('resource','https://evil/mcp'),('scope','bad'),('redirect_uri','https://evil/'),('code_verifier','x'*64)]:
  wrong=dict(base,**{field:value});assert exchange(c,wrong).status_code==400
 assert exchange(c,base).status_code==200;assert exchange(c,base).status_code==400

def test_expired_code_and_transaction(env,monkeypatch):
 c,_,store=env;cd,tx=code(c);doc,ver=store.read(KEY);ident=cd.split('.')[0];doc['grants'][ident]['code_exp']=time.time()-1;store.write(KEY,doc,ver);assert exchange(c,token_args(cd)).status_code==400
 unused=start(c);now=time.time();monkeypatch.setattr('service.oauth_bridge.time.time',lambda:now+601);assert complete(c,unused).status_code==400

def test_refresh_rotation_replay_expiry_and_revocation(env):
 c,v,store=env;cd,_=code(c);t=exchange(c,token_args(cd)).json();args={'grant_type':'refresh_token','client_id':CLIENT,'resource':'https://keto.test/mcp','refresh_token':t['refresh_token']}
 next_token=exchange(c,args);assert next_token.status_code==200
 t2=next_token.json();assert mcp(c,t['access_token']).status_code==401 and mcp(c,t2['access_token']).status_code==200
 assert exchange(c,args).status_code==400
 assert mcp(c,t2['access_token']).status_code==401
 assert exchange(c,dict(args,refresh_token=t2['refresh_token'])).status_code==400

def test_cross_user_isolation(env):
 c,v,store=env;ca,_=code(c,'entra-a');cb,_=code(c,'entra-b');a=exchange(c,token_args(ca)).json()['access_token'];b=exchange(c,token_args(cb)).json()['access_token']
 ra=mcp(c,a,'tools/call',{'name':'keto_open','arguments':{}}).json()['result']['structuredContent']['state'];rb=mcp(c,b,'tools/call',{'name':'keto_open','arguments':{}}).json()['result']['structuredContent']['state'];assert ra['profile']['subject_id']=='user-a' and rb['profile']['subject_id']=='user-b'
 v.users['oid-b']['subject']='user-a';assert mcp(c,b).status_code==401 and mcp(c,a).status_code==401

def test_malformed_oversized_origin_and_duplicate_fields(env):
 c,_,store=env;assert c.post('/oauth/token',content='a=1&a=2',headers={'Content-Type':'application/x-www-form-urlencoded'}).status_code==400
 assert c.post('/oauth/token',content='x='+('a'*9000),headers={'Content-Type':'application/x-www-form-urlencoded'}).status_code==413
 assert c.post('/oauth/complete',headers={'Origin':'https://evil.test','Authorization':'Bearer entra-a'},json={'transaction':'x','approved':True}).status_code==403
 assert c.post('/oauth/complete',headers=headers(),content='{',).status_code==400
 p=list(params().items())+[('state','second')];assert c.get('/oauth/authorize',params=p,follow_redirects=False).status_code==400
 assert store.read(KEY)==(None,None)

def test_concurrent_redemption_single_winner(env):
 c,_,_=env;cd,_=code(c);args=token_args(cd)
 with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:results=list(pool.map(lambda _:exchange(c,args).status_code,range(2)))
 assert sorted(results)==[200,400]


def test_access_and_refresh_expiry(env):
 c,_,store=env;cd,_=code(c);t=exchange(c,token_args(cd)).json();ident=t['access_token'].split('.')[0];doc,ver=store.read(KEY);doc['grants'][ident]['access_exp']=time.time()-1;doc['grants'][ident]['refresh_exp']=time.time()-1;store.write(KEY,doc,ver)
 assert mcp(c,t['access_token']).status_code==401
 assert exchange(c,{'grant_type':'refresh_token','client_id':CLIENT,'resource':'https://keto.test/mcp','refresh_token':t['refresh_token']}).status_code==400

def test_mcp_media_types_and_protocol(env):
 c,_,_=env;cd,_=code(c);t=exchange(c,token_args(cd)).json()['access_token'];h={'Authorization':'Bearer '+t}
 assert c.post('/mcp',headers=h,json={'jsonrpc':'2.0','id':1,'method':'ping'}).status_code==406
 h['Accept']='application/json, text/event-stream';h['Content-Type']='text/plain';assert c.post('/mcp',headers=h,content='{}').status_code==415
 h['Content-Type']='application/json';h['MCP-Protocol-Version']='invalid';assert c.post('/mcp',headers=h,json={'jsonrpc':'2.0','id':1,'method':'ping'}).status_code==400

def test_installed_mcp_client_with_asgi_transport(env):
 import asyncio,httpx2
 from mcp.client.streamable_http import streamable_http_client
 from mcp import ClientSession
 c,_,_=env;cd,_=code(c);t=exchange(c,token_args(cd)).json()['access_token']
 async def exercise():
  transport=httpx2.ASGITransport(app=c.app)
  async with httpx2.AsyncClient(transport=transport,headers={'Authorization':'Bearer '+t}) as http:
   async with streamable_http_client('https://keto.test/mcp',http_client=http,terminate_on_close=False) as (read,write):
    async with ClientSession(read,write) as session:
     init=await session.initialize();assert init.server_info.version=='0.2.1'
     tools=await session.list_tools();assert any(x.name=='keto_open' for x in tools.tools)
     resources=await session.list_resources();resource=await session.read_resource(resources.resources[0].uri);assert resource.contents
     response=await session.call_tool('keto_open',{});assert response.structured_content['state']['profile']['subject_id']=='user-a'
 asyncio.run(exercise())

def test_anonymous_authorize_is_bounded_and_nonpersistent(env):
 c,_,store=env
 for _ in range(60):assert c.get('/oauth/authorize',params=params(),follow_redirects=False).status_code==303
 assert c.get('/oauth/authorize',params=params(),follow_redirects=False).status_code==429
 assert store.read(KEY)==(None,None)

def test_refresh_race_single_winner(env):
 c,_,_=env;cd,_=code(c);t=exchange(c,token_args(cd)).json();args={'grant_type':'refresh_token','client_id':CLIENT,'resource':'https://keto.test/mcp','refresh_token':t['refresh_token']}
 with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:results=list(pool.map(lambda _:exchange(c,args).status_code,range(2)))
 assert sorted(results)==[200,400]
 assert mcp(c,t['access_token']).status_code==401

def test_write_failure_never_returns_code(env,monkeypatch):
 c,_,store=env;tx=start(c);monkeypatch.setattr(store,'write',lambda *args:(_ for _ in ()).throw(OSError('offline')))
 with TestClient(c.app,raise_server_exceptions=False) as safe:
  r=complete(safe,tx);assert r.status_code==500 and 'code' not in r.text and 'offline' not in r.text
 assert store.read(KEY)==(None,None)

def test_capacity_and_expired_cleanup(env):
 c,_,store=env
 for _ in range(8):assert complete(c,start(c)).status_code==200
 assert complete(c,start(c)).status_code==503
 doc,ver=store.read(KEY)
 for item in doc['grants'].values():item['retain_until']=time.time()-1
 store.write(KEY,doc,ver)
 assert complete(c,start(c)).status_code==200
 assert len(store.read(KEY)[0]['grants'])==1

def test_missing_or_wrong_origin_cannot_complete(env):
 c,_,store=env;tx=start(c)
 for h in ({'Authorization':'Bearer entra-a'},{'Origin':'https://chatgpt.com','Authorization':'Bearer entra-a'}):
  assert c.post('/oauth/complete',headers=h,json={'transaction':tx,'approved':True}).status_code==403
 assert store.read(KEY)==(None,None)

def test_bridge_misconfiguration_fails_closed(tmp_path,monkeypatch):
 svc=Service(SQLiteStore(tmp_path/'state.db'),Brain());verifier=FakeEntra()
 with pytest.raises(RuntimeError):create_app(svc,public_url='https://keto.test',testing=True,entra_verifier=verifier,oauth_key=b'bad')
 with pytest.raises(RuntimeError):create_app(svc,public_url='https://keto.test',testing=True,oauth_key=Fernet.generate_key())
 with pytest.raises(RuntimeError):create_app(svc,public_url='https://keto.test',testing=False,entra_verifier=verifier,oauth_key=Fernet.generate_key())

def test_refresh_client_resource_scope_bindings(env):
 c,_,_=env;cd,_=code(c);t=exchange(c,token_args(cd)).json();args={'grant_type':'refresh_token','client_id':CLIENT,'resource':'https://keto.test/mcp','refresh_token':t['refresh_token']}
 for field,value in [('client_id','different'),('resource','https://wrong.test/mcp'),('scope','wrong')]:assert exchange(c,dict(args,**{field:value})).status_code==400
 assert exchange(c,args).status_code==200


def test_bridge_rejects_storage_namespace_collision(tmp_path):
 svc=Service(SQLiteStore(tmp_path/'state.db'),Brain());verifier=FakeEntra();verifier.users['oid-a']['subject']=KEY
 with pytest.raises(RuntimeError):create_app(svc,public_url='https://keto.test',testing=True,entra_verifier=verifier,oauth_key=Fernet.generate_key())


def test_chunked_oauth_body_stops_at_limit(env):
 import asyncio,httpx2
 c,_,_=env;chunks=[]
 async def body():
  for _ in range(100):
   chunks.append(1);yield b'x'*1024
 async def run():
  async with httpx2.AsyncClient(transport=httpx2.ASGITransport(app=c.app)) as http:
   r=await http.post('https://keto.test/oauth/token',headers={'Content-Type':'application/x-www-form-urlencoded'},content=body());assert r.status_code==413
 asyncio.run(run());assert len(chunks)<=9

# Revocation and reuse tests use synthetic credentials only.
def revoke(c,t,client=CLIENT,**extra):return c.post('/oauth/revoke',data={'client_id':client,'token':t,**extra})
def refresh_args(t):return {'grant_type':'refresh_token','client_id':CLIENT,'resource':'https://keto.test/mcp','refresh_token':t}

@pytest.mark.parametrize('key',['access_token','refresh_token'])
def test_revoke_current_token_family(env,key):
 c,_,_=env;cd,tx=code(c);t=exchange(c,token_args(cd)).json();r=revoke(c,t[key]);assert r.status_code==200 and r.text=='' and r.headers['cache-control']=='no-store'
 assert mcp(c,t['access_token']).status_code==401 and exchange(c,refresh_args(t['refresh_token'])).status_code==400
 assert revoke(c,t[key]).status_code==200 and complete(c,tx).status_code==400

@pytest.mark.parametrize('key',['access_token','refresh_token'])
def test_revoke_previously_rotated_token(env,key):
 c,_,_=env;cd,_=code(c);old=exchange(c,token_args(cd)).json();new=exchange(c,refresh_args(old['refresh_token'])).json()
 assert revoke(c,old[key]).status_code==200
 assert mcp(c,new['access_token']).status_code==401 and exchange(c,refresh_args(new['refresh_token'])).status_code==400

def test_revoke_invalid_tokens_and_wrong_client_do_not_revoke(env):
 c,_,store=env;cd,_=code(c);t=exchange(c,token_args(cd)).json();ident=t['access_token'].split('.')[0]
 random_same_family=ident+'.'+('A'*43)
 assert revoke(c,'not-a-token').status_code==200 and revoke(c,random_same_family).status_code==200
 assert revoke(c,t['refresh_token'],client='wrong').status_code==401
 assert mcp(c,t['access_token']).status_code==200
 assert exchange(c,refresh_args(t['refresh_token'])).status_code==200

def test_random_refresh_does_not_revoke_but_reuse_does(env):
 c,_,_=env;cd,_=code(c);old=exchange(c,token_args(cd)).json();new=exchange(c,refresh_args(old['refresh_token'])).json()
 random_same_family=new['refresh_token'].split('.')[0]+'.'+('A'*43)
 assert exchange(c,refresh_args(random_same_family)).status_code==400 and mcp(c,new['access_token']).status_code==200
 assert exchange(c,refresh_args(old['refresh_token'])).status_code==400
 assert mcp(c,new['access_token']).status_code==401 and exchange(c,refresh_args(new['refresh_token'])).status_code==400

def test_revocation_tombstone_releases_subject_capacity(env):
 c,_,store=env;cd,tx=code(c);t=exchange(c,token_args(cd)).json()
 for _ in range(7):assert complete(c,start(c)).status_code==200
 assert complete(c,start(c)).status_code==503
 assert revoke(c,t['refresh_token']).status_code==200
 grant=store.read(KEY)[0]['grants'][t['refresh_token'].split('.')[0]]
 assert grant['status']=='revoked' and grant['retain_until']>time.time() and 'subject' not in grant
 assert complete(c,tx).status_code==400 and complete(c,start(c)).status_code==200

def test_revoke_preserves_global_cap(env):
 c,_,store=env;cd,tx=code(c);t=exchange(c,token_args(cd)).json();doc,ver=store.read(KEY)
 for i in range(511):doc['grants']['synthetic_'+str(i)]={'status':'revoked','retain_until':time.time()+300}
 store.write(KEY,doc,ver)
 assert revoke(c,t['access_token']).status_code==200
 assert complete(c,start(c)).status_code==503 and len(store.read(KEY)[0]['grants'])==512
 assert complete(c,tx).status_code==400

def test_rotation_bound_never_discards_history(env,monkeypatch):
 import service.oauth_bridge as ob
 monkeypatch.setattr(ob,'MAX_ROTATIONS',2)
 c,_,store=env;cd,_=code(c);first=exchange(c,token_args(cd)).json();second=exchange(c,refresh_args(first['refresh_token'])).json();third=exchange(c,refresh_args(second['refresh_token'])).json()
 assert exchange(c,refresh_args(third['refresh_token'])).status_code==400
 assert mcp(c,third['access_token']).status_code==200
 assert exchange(c,refresh_args(first['refresh_token'])).status_code==400 and mcp(c,third['access_token']).status_code==401

def test_concurrent_revoke_and_refresh_revoke_family(env):
 c,_,_=env;cd,_=code(c);t=exchange(c,token_args(cd)).json()
 with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
  f1=pool.submit(revoke,c,t['access_token']);f2=pool.submit(exchange,c,refresh_args(t['refresh_token']));rev,rot=f1.result(),f2.result()
 assert rev.status_code==200 and rot.status_code in (200,400)
 assert mcp(c,t['access_token']).status_code==401
 if rot.status_code==200:
  assert mcp(c,rot.json()['access_token']).status_code==401
  assert exchange(c,refresh_args(rot.json()['refresh_token'])).status_code==400

def test_revoke_metadata_and_unknown_token_no_write(env):
 c,_,store=env;md=c.get('/.well-known/oauth-authorization-server').json()
 assert md['revocation_endpoint']=='https://keto.test/oauth/revoke' and md['revocation_endpoint_auth_methods_supported']==['none']
 assert revoke(c,'unknown').status_code==200 and store.read(KEY)==(None,None)
 assert c.post('/oauth/revoke',data={'client_id':CLIENT}).status_code==400

def test_reuse_revokes_even_if_subject_temporarily_removed(env):
 c,v,_=env;cd,_=code(c);old=exchange(c,token_args(cd)).json();new=exchange(c,refresh_args(old['refresh_token'])).json();record=v.users.pop('oid-a')
 assert exchange(c,refresh_args(old['refresh_token'])).status_code==400
 v.users['oid-a']=record
 assert mcp(c,new['access_token']).status_code==401 and exchange(c,refresh_args(new['refresh_token'])).status_code==400

def test_legacy_grant_tombstone_keeps_safe_expiry(env):
 c,_,store=env;cd,_=code(c);t=exchange(c,token_args(cd)).json();ident=t['access_token'].split('.')[0];doc,ver=store.read(KEY);g=doc['grants'][ident];expiry=g['retain_until'];g.pop('tx_exp');store.write(KEY,doc,ver)
 assert revoke(c,t['access_token']).status_code==200
 assert store.read(KEY)[0]['grants'][ident]['retain_until']==expiry

def test_maximum_history_fits_document_bound(env):
 from service.store import encode
 from service.oauth_bridge import MAX_GRANTS,MAX_ROTATIONS
 c,_,store=env;cd,_=code(c);t=exchange(c,token_args(cd)).json();g=store.read(KEY)[0]['grants'][t['access_token'].split('.')[0]]
 g['subject']='s'*100;g['used_refresh_hashes']=['a'*64]*MAX_ROTATIONS;g['used_access_hashes']=['b'*64]*MAX_ROTATIONS
 doc={'grants':{str(i).zfill(32):g for i in range(MAX_GRANTS)}}
 assert len(encode(doc))<=2_000_000
