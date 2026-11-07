import hashlib,hmac,importlib.util,json,sys
from pathlib import Path
import pytest
from service.domain import new_document
p=Path(__file__).resolve().parents[1]/'cloudflare-saas/bridge_candidate.py'
spec=importlib.util.spec_from_file_location('edge_candidate',p);edge=importlib.util.module_from_spec(spec);spec.loader.exec_module(edge)
SECRET=b'x'*32;NONCE='A'*43;STAMP='1800000000';clock=int(STAMP)
class Brain:
 def infer(self,*a,**k):raise AssertionError('model must not be called')
class Replay:
 def __init__(self):self.used=set()
 def __call__(self,n,e):
  if n in self.used:return False
  self.used.add(n);return True
def body(subject='test-user'):
 return json.dumps({'subject':subject,'operation':'open','state':new_document(subject),'arguments':{}},separators=(',',':')).encode()
def sign(b,method='POST',path=edge.PATH,stamp=STAMP,nonce=NONCE):return hmac.new(SECRET,'\n'.join([method,path,stamp,nonce,hashlib.sha256(b).hexdigest()]).encode(),hashlib.sha256).hexdigest()
def call(b,**kw):
 v={'method':'POST','path':edge.PATH,'timestamp':STAMP,'nonce':NONCE,'body':b,'signature':sign(b),'secret':SECRET,'replay_claim':Replay(),'brain':Brain(),'clock':clock};v.update(kw);return edge.execute(**v)
def test_signed_readonly_memory_state():
 b=body();r=call(b);assert r['state']['core']['owner_account_id']=='test-user';assert r['response']['state']['revision']==0
@pytest.mark.parametrize('change',[{'method':'GET'},{'path':'/other'},{'timestamp':'1799999800'},{'signature':'0'*64},{'secret':b'short'},{'replay_claim':None},{'body':b'x'*256001}])
def test_fail_closed_invalid_envelopes(change):
 with pytest.raises(edge.BridgeError):call(body(),**change)
def test_body_tampering_and_replay():
 b=body();guard=Replay();call(b,replay_claim=guard)
 with pytest.raises(edge.BridgeError):call(b,replay_claim=guard)
 with pytest.raises(edge.BridgeError):call(b+b' ',signature=sign(b))
def test_cross_subject_and_unsafe_operation_rejected():
 obj=json.loads(body());obj['subject']='other';b=json.dumps(obj).encode()
 with pytest.raises(edge.BridgeError):call(b,signature=sign(b))
 obj=json.loads(body());obj['operation']='execute';b=json.dumps(obj).encode()
 with pytest.raises(edge.BridgeError):call(b,signature=sign(b))

def test_memory_execution_does_not_write_personal_state(tmp_path,monkeypatch):
 monkeypatch.chdir(tmp_path);b=body();before=set(tmp_path.iterdir());out=call(b)
 assert set(tmp_path.iterdir())==before and out['state']['core']['subject_id']=='test-user'
