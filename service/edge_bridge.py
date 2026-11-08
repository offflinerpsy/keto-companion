"""Opt-in Cloudflare compute bridge; Azure stores only nonce replay metadata."""
from __future__ import annotations
import copy,hashlib,hmac,json,re,time,os,base64
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PublicKey
from cryptography.exceptions import InvalidSignature
from .store import Conflict,safe_key,encode
from .domain import Service,k,new_document,literal_guard
from .brain import AzureBrain
from .speech import AudioTranscriber,SpeechError,speech_message
from jsonschema import Draft202012Validator,ValidationError

PATH='/internal/keto/compute';LIMIT=1_500_000
class BridgeError(Exception):pass
class MemoryStore:
 def __init__(self,subject,doc):self.subject=subject;self.doc=copy.deepcopy(doc);self.version=1 if doc is not None else None
 def read(self,key):
  if key!=self.subject:raise BridgeError('identity')
  return copy.deepcopy(self.doc),self.version
 def write(self,key,value,version):
  if key!=self.subject or version!=self.version:raise Conflict('state changed')
  encode(value);self.doc=copy.deepcopy(value);self.version=(version or 0)+1;return self.version
 def delete(self,key,version):
  if key!=self.subject or version!=self.version:raise Conflict('state changed')
  self.doc=None;self.version=None

class EdgeBridge:
 def __init__(self,secret,replay_store,brain,tool_map,image_clean,clock=None,public_jwk=None,transcriber=None):
  self.transcriber=transcriber or AudioTranscriber();self.verify_key=None;self.secret=None
  if public_jwk:
   if secret:raise RuntimeError('Choose exactly one bridge authentication mode')
   try:
    key=json.loads(public_jwk) if isinstance(public_jwk,str) else public_jwk
    if not isinstance(key,dict) or key.get('kty')!='OKP' or key.get('crv')!='Ed25519' or 'd' in key or not isinstance(key.get('x'),str) or not re.fullmatch(r'[A-Za-z0-9_-]{43}',key['x']):raise ValueError()
    self.verify_key=Ed25519PublicKey.from_public_bytes(base64.urlsafe_b64decode(key['x']+'='))
   except (ValueError,TypeError,KeyError):raise RuntimeError('Invalid public verification key') from None
  else:
   if not isinstance(secret,str) or len(secret.encode())<32:raise RuntimeError('Edge bridge requires authentication')
   self.secret=secret.encode()
  self.replay=replay_store;self.brain=brain;self.tool_map=tool_map;self.image_clean=image_clean;self.clock=clock or time.time
 def execute(self,method,path,stamp,nonce,signature,body):
  if method!='POST' or path!=PATH or not isinstance(body,bytes) or len(body)>LIMIT:raise BridgeError('invalid request')
  if not isinstance(stamp,str) or not re.fullmatch(r'[0-9]{10}',stamp) or not isinstance(nonce,str) or not re.fullmatch(r'[A-Za-z0-9_-]{43}',nonce):raise BridgeError('invalid request')
  now=int(self.clock())
  if abs(now-int(stamp))>60:raise BridgeError('expired')
  material='\n'.join([method,path,stamp,nonce,hashlib.sha256(body).hexdigest()]).encode()
  if self.verify_key is not None:
   try:
    if not isinstance(signature,str) or not re.fullmatch(r'[0-9a-f]{128}',signature):raise ValueError()
    self.verify_key.verify(bytes.fromhex(signature),material)
   except (ValueError,InvalidSignature):raise BridgeError('invalid signature') from None
  else:
   expected=hmac.new(self.secret,material,hashlib.sha256).hexdigest()
   if not isinstance(signature,str) or not hmac.compare_digest(expected,signature):raise BridgeError('invalid signature')
  digest=hashlib.sha256(nonce.encode()).hexdigest();key='edge_replay_'+digest
  try:self.replay.write(key,{'nonce_hash':digest,'expires_at':max(now,int(stamp))+121},None)
  except Conflict:raise BridgeError('replay') from None
  if hasattr(self.replay,'prune_edge_replay'):
   try:self.replay.prune_edge_replay(now)
   except Exception:pass  # best-effort operational metadata cleanup
  try:
   data=json.loads(body)
   if not isinstance(data,dict) or set(data)!={'subject','operation','state','arguments'}:raise ValueError()
   subject=safe_key(data['subject']);op=data['operation'];args=data['arguments'];doc=data['state']
   if not isinstance(args,dict):raise ValueError()
   source=args.pop('source_context',None) if op=='chat' else None
   if source is not None and (not isinstance(source,dict) or set(source)!={'title','author','url','text'} or any(not isinstance(v,str) or len(v)>2000 for v in source.values()) or len(json.dumps(source,ensure_ascii=False).encode())>10000):raise ValueError()
   if op=='sanitize_image':
    if set(args)!={'image_data_url'} or doc is not None:raise ValueError()
    return {'response':{'image_data_url':self.image_clean(args['image_data_url'])},'state':None}
   if op=='transcribe':
    if doc is not None:raise ValueError()
    Draft202012Validator(self.tool_map['keto_transcribe']['inputSchema']).validate(args)
    try:response={'text':self.transcriber.transcribe(args['audio_base64'],args['mime']),'model_called':True}
    except SpeechError as e:response={'error_code':e.code,'message':speech_message(e.code),'model_called':e.paid}
    return {'response':response,'state':None}
   names={'kitchen':'keto_kitchen','guidance':'keto_guidance','topics':'keto_topics','reminders':'keto_reminders','open':'keto_open','recipes':'keto_recipes','consent':'keto_consent','propose':'keto_propose_change','apply':'keto_apply_proposal','menu':'keto_menu','chat':'keto_chat','export':'keto_export','import_menu':'keto_import_menu','delete':'keto_delete_profile'}
   if op not in names:raise ValueError()
   schema=copy.deepcopy(self.tool_map[names[op]]['inputSchema']);schema['properties'].pop('ui_confirmation',None);schema['required']=[x for x in schema['required'] if x!='ui_confirmation'];Draft202012Validator(schema).validate(args)
   if doc is not None:
    if not isinstance(doc,dict) or not isinstance(doc.get('core'),dict):raise ValueError()
    core=k.parse_state_document(k.canonical(doc['core']))
    if core['subject_id']!=subject or core['owner_account_id']!=subject:raise ValueError()
    template=new_document(subject)
    if not set(template)<=set(doc) or type(doc.get('revision')) is not int or type(doc.get('processing_consent')) is not bool:raise ValueError()
   store=MemoryStore(subject,doc);svc=Service(store,self.brain)
   if op=='open':result=svc.opened(subject)
   elif op=='recipes':result=svc.catalog(subject,args.get('query',''),args.get('limit',12),include_food_ids=args.get('include_food_ids'),exclude_food_ids=args.get('exclude_food_ids'),max_minutes=args.get('max_minutes'))
   elif op=='consent':result=svc.consent(subject,args['processing'],args['storage'],args['health'],args['confirmed'])
   elif op=='propose':result=svc.propose(subject,args['event_type'],args['payload'],args['expected_revision'])
   elif op=='apply':result=svc.apply(subject,args['proposal_id'],args['expected_revision'],args['approved'])
   elif op=='menu':result=svc.menu(subject,args['start'],args['days'])
   elif op=='chat':
    if isinstance(self.brain,AzureBrain) and os.getenv('KETO_AZURE_AUTH')=='cli':raise BridgeError('model unavailable')
    result=svc.chat(subject,args['message'],args['request_id'],image=None if literal_guard(args['message'])=='urgent' else self.image_clean(args.get('image_data_url')),source=source,thread_id=args.get('thread_id'))
   elif op=='kitchen':result=svc.kitchen(subject,**args)
   elif op=='guidance':result=svc.guidance(subject,**args)
   elif op=='topics':result=svc.topics(subject,**args)
   elif op=='reminders':result=svc.reminders(subject,**args)
   elif op=='export':
    try:result=svc.export(subject,args['format'])
    except (ValueError,ImportError) as exc:
     if args['format']=='pdf' and (isinstance(exc,ImportError) or str(exc).startswith('PDF_')):result={'error_code':'PDF_UNAVAILABLE','message':'PDF сейчас недоступен: не подготовлены шрифты или превышен размер документа. Скачайте CSV или попробуйте позже.','model_called':False}
     else:raise
   elif op=='import_menu':result=svc.import_menu(subject,args['content'],args['format'],args['expected_revision'])
   else:result=svc.delete_profile(subject,args['expected_revision'],args['confirmation'])
   if isinstance(result.get('state'),dict):
    snapshot=result['state'];snapshot['capabilities']['storage']='Cloudflare D1';snapshot['capabilities']['native_voice']='Microphone dictation via Azure; editable transcript, not a voice conversation';snapshot['capabilities']['dictation']=True
    if not snapshot['holds'] and snapshot['plans'] and snapshot['plans'][-1].get('status')=='user_accepted':result['shopping']=svc.kitchen_shopping(store.doc,snapshot['plans'][-1])
   if result.get('requires_consent'):result['message']='Для личного диалога нужны ваши разрешения на обработку Azure и хранение в Cloudflare.'
   return {'response':result,'state':None if op=='export' and args.get('format')=='pdf' else copy.deepcopy(store.doc)}
  except (ValueError,TypeError,KeyError,ValidationError,k.KetoError,Conflict) as e:raise BridgeError(str(e)) from None
