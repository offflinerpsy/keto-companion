"""Local process-only synthetic bridge harness; no credential/network access."""
import json,sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[2]))
from service.edge_bridge import EdgeBridge
from service.app import TOOL_MAP,image_clean
from service.store import Conflict
class Replay:
 def __init__(self):self.items=set()
 def write(self,k,v,version):
  if k in self.items:raise Conflict()
  self.items.add(k);return 1
class Brain:
 def infer(self,message,context,image=None):
  return {'intent':'diary' if 'запиши' in message.casefold() else 'help','reply_ru':'Синтетический ответ','query':'','changes':[],'safety_signals':['none'],'days':1,'diary_note':'Синтетическая запись','_usage':{'input_tokens':1,'output_tokens':1}}
request=json.load(sys.stdin);body=request['body'].encode();bridge=EdgeBridge('synthetic-edge-secret-not-a-real-production-key',Replay(),Brain(),TOOL_MAP,image_clean)
try:
 result=bridge.execute('POST','/internal/keto/compute',request['timestamp'],request['nonce'],request['signature'],body)
 print(json.dumps({'status':200,'result':result},ensure_ascii=False))
except Exception:print(json.dumps({'status':422,'error':'BRIDGE_REJECTED'}))
