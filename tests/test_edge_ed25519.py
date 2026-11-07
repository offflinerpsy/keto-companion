import base64,hashlib,json,time
import pytest
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
from service.edge_bridge import EdgeBridge,BridgeError,PATH
from service.app import TOOL_MAP,image_clean,create_app
from service.domain import Service
from service.store import SQLiteStore
from test_service import FakeBrain

def setup(tmp_path,monkeypatch=None):
 key=Ed25519PrivateKey.generate();pub={"kty":"OKP","crv":"Ed25519","x":base64.urlsafe_b64encode(key.public_key().public_bytes_raw()).decode().rstrip('=')}
 replay=SQLiteStore(tmp_path/'nonce.db');bridge=EdgeBridge(None,replay,FakeBrain(),TOOL_MAP,image_clean,public_jwk=pub)
 return key,pub,bridge,replay

def packet(key,nonce='e'*43,stamp=None):
 body=json.dumps({'subject':'synthetic-ed25519','operation':'open','state':None,'arguments':{}}).encode();stamp=str(int(time.time())) if stamp is None else stamp
 material='\n'.join(['POST',PATH,stamp,nonce,hashlib.sha256(body).hexdigest()]).encode()
 return body,stamp,nonce,key.sign(material).hex()

def test_ed25519_accepts_and_replay_refused(tmp_path):
 key,pub,bridge,replay=setup(tmp_path);b,t,n,s=packet(key);result=bridge.execute('POST',PATH,t,n,s,b)
 assert result['response']['state']['profile']['subject_id']=='synthetic-ed25519'
 with pytest.raises(BridgeError,match='replay'):bridge.execute('POST',PATH,t,n,s,b)
 entry,_=replay.read('edge_replay_'+hashlib.sha256(n.encode()).hexdigest());assert set(entry)=={'nonce_hash','expires_at'}

def test_ed25519_tamper_wrong_key_expiry_and_wrong_algorithm(tmp_path):
 key,_,bridge,_=setup(tmp_path);b,t,n,s=packet(key)
 for signature,body in [(s,b+b' '),('a'*64,b),('z'*128,b),(packet(Ed25519PrivateKey.generate())[3],b)]:
  with pytest.raises(BridgeError,match='invalid signature'):bridge.execute('POST',PATH,t,n,signature,body)
 b,t,n,s=packet(key,stamp=str(int(time.time())-61))
 with pytest.raises(BridgeError,match='expired'):bridge.execute('POST',PATH,t,n,s,b)

@pytest.mark.parametrize('change',[{'crv':'X25519'},{'d':'not-allowed'},{'x':'bad'},{'kty':'RSA'}])
def test_public_key_configuration_fails_closed(tmp_path,change):
 _,pub,_,replay=setup(tmp_path)
 with pytest.raises(RuntimeError):EdgeBridge(None,replay,FakeBrain(),TOOL_MAP,image_clean,public_jwk={**pub,**change})

def test_cannot_enable_both_algorithms(tmp_path):
 _,pub,_,replay=setup(tmp_path)
 with pytest.raises(RuntimeError):EdgeBridge('synthetic-shared-key-012345678901234567890',replay,FakeBrain(),TOOL_MAP,image_clean,public_jwk=pub)

def test_http_route_uses_public_configuration(tmp_path,monkeypatch):
 from fastapi.testclient import TestClient
 key,pub,_,replay=setup(tmp_path);monkeypatch.setenv('KETO_EDGE_PUBLIC_JWK',json.dumps(pub));personal=SQLiteStore(tmp_path/'personal.db')
 with TestClient(create_app(Service(personal,FakeBrain()),[],public_url='http://testserver',testing=True,edge_replay_store=replay)) as c:
  b,t,n,s=packet(key);response=c.post(PATH,content=b,headers={'x-keto-timestamp':t,'x-keto-nonce':n,'x-keto-signature':s});assert response.status_code==200
  assert personal.read('synthetic-ed25519')==(None,None)
