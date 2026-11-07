"""Disconnected HMAC/in-memory compute candidate; NO web route or production replay guard.

Only read-only operations are supported. Do not wire this module until the caller
provides an atomic replay guard shared across every Azure instance and Cloudflare
has durable request reservation and consent/revision rechecks.
"""
import copy,hashlib,hmac,json,re,time
from service.domain import Service,k,new_document
from service.store import Conflict,safe_key

PATH='/internal/keto/compute'
MAX_BODY=256_000
class BridgeError(Exception):pass
class MemoryStore:
    def __init__(self,subject,document):self.subject=subject;self.doc=copy.deepcopy(document);self.version=1 if document is not None else None
    def read(self,key):
        if key!=self.subject:raise BridgeError('identity')
        return copy.deepcopy(self.doc),self.version
    def write(self,key,value,version):
        if key!=self.subject or version!=self.version:raise Conflict('state changed')
        self.doc=copy.deepcopy(value);self.version=(self.version or 0)+1;return self.version
    def delete(self,key,version):
        if key!=self.subject or version!=self.version:raise Conflict('state changed')
        self.doc=None;self.version=None

def execute(method,path,timestamp,nonce,body,signature,secret,replay_claim,brain,clock=None):
    if not isinstance(secret,bytes) or len(secret)<32 or not callable(replay_claim):raise BridgeError('unavailable')
    if method!='POST' or path!=PATH or not isinstance(body,bytes) or len(body)>MAX_BODY:raise BridgeError('invalid request')
    if not isinstance(timestamp,str) or not re.fullmatch(r'[0-9]{10}',timestamp) or not isinstance(nonce,str) or not re.fullmatch(r'[A-Za-z0-9_-]{43}',nonce):raise BridgeError('invalid request')
    current=int(time.time() if clock is None else clock)
    if abs(current-int(timestamp))>60:raise BridgeError('expired')
    msg='\n'.join([method,path,timestamp,nonce,hashlib.sha256(body).hexdigest()]).encode()
    expected=hmac.new(secret,msg,hashlib.sha256).hexdigest()
    if not isinstance(signature,str) or not hmac.compare_digest(expected,signature):raise BridgeError('invalid signature')
    if not replay_claim(nonce,int(timestamp)+61):raise BridgeError('replay')
    try:
        obj=json.loads(body);subject=safe_key(obj['subject']);op=obj['operation'];doc=obj.get('state')
        if set(obj)-{'subject','operation','state','arguments'} or op not in ('open','recipes') or not isinstance(obj.get('arguments',{}),dict):raise ValueError()
        if doc is not None:
            if not isinstance(doc,dict) or not isinstance(doc.get('core'),dict):raise ValueError()
            core=k.parse_state_document(k.canonical(doc['core']))
            if core['subject_id']!=subject or core['owner_account_id']!=subject:raise ValueError()
        else:doc=new_document(subject)
        store=MemoryStore(subject,doc);svc=Service(store,brain);args=obj.get('arguments',{})
        if op=='open':
            if args:raise ValueError()
            result=svc.opened(subject)
        else:
            if set(args)-{'query','limit'}:raise ValueError()
            result=svc.catalog(subject,args.get('query',''),args.get('limit',12))
        return {'response':result,'state':copy.deepcopy(store.doc)}
    except (ValueError,TypeError,KeyError,k.KetoError):raise BridgeError('invalid payload') from None
