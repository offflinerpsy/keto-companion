"""Bounded, opt-in OAuth authorization server for a single public MCP client.

The encrypted transient request is not a login credential. All durable grant
transitions live in one CAS document, so code redemption and refresh rotation
are atomic even when requests hit different service instances.
"""
from __future__ import annotations
import base64, hashlib, hmac, json, re, secrets, time
from cryptography.fernet import Fernet, InvalidToken
from .store import Conflict, safe_key

CLIENT='keto-companion-chatgpt'
REDIRECT='https://chatgpt.com/connector_platform_oauth_redirect'
SCOPE='keto:use'
KEY='oauth_bridge_v1'
MAX_GRANTS=512
MAX_PER_SUBJECT=8
MAX_ROTATIONS=16
TX_TTL=600
CODE_TTL=300
ACCESS_TTL=3600
REFRESH_TTL=7*86400
ID_RE=re.compile(r'^[A-Za-z0-9_-]{32}$')
SECRET_RE=re.compile(r'^[A-Za-z0-9_-]{43}$')
VERIFIER_RE=re.compile(r'^[A-Za-z0-9._~-]{43,128}$')

class OAuthError(Exception):
    def __init__(self,code='invalid_request',status=400):self.code=code;self.status=status

def digest(value):return hashlib.sha256(value.encode('ascii')).hexdigest()
def secret():return secrets.token_urlsafe(32)
def token(jti):return jti+'.'+secret()
def token_id(value):
    if not isinstance(value,str) or len(value)!=76:return None
    a,sep,b=value.partition('.')
    return a if sep and ID_RE.fullmatch(a) and SECRET_RE.fullmatch(b) else None

def validate_challenge(value):
    if not isinstance(value,str) or not SECRET_RE.fullmatch(value):return False
    try:return base64.urlsafe_b64encode(base64.urlsafe_b64decode(value+'=')).decode().rstrip('=')==value
    except Exception:return False

class OAuthBridge:
    def __init__(self,store,verifier,issuer,key):
        self.store=store;self.verifier=verifier;self.issuer=issuer;self.resource=issuer+'/mcp'
        for record in verifier.users.values():
            subject=record.get('subject') if isinstance(record,dict) else None
            if subject==KEY or (isinstance(subject,str) and re.fullmatch(r'confirm_[0-9a-f]{64}',subject)):
                raise RuntimeError('OAuth bridge storage namespace conflicts with an allowed subject')
        try:self.fernet=Fernet(key.encode('ascii') if isinstance(key,str) else key)
        except Exception:raise RuntimeError('OAuth bridge requires a valid 32-byte Fernet key') from None
    def metadata(self):
        return {'issuer':self.issuer,'authorization_endpoint':self.issuer+'/oauth/authorize','token_endpoint':self.issuer+'/oauth/token',
          'response_types_supported':['code'],'grant_types_supported':['authorization_code','refresh_token'],
          'token_endpoint_auth_methods_supported':['none'],'revocation_endpoint':self.issuer+'/oauth/revoke',
          'revocation_endpoint_auth_methods_supported':['none'],'code_challenge_methods_supported':['S256'],
          'scopes_supported':[SCOPE],'authorization_response_iss_parameter_supported':True}
    def authorize(self,p):
        if set(p)!={'client_id','redirect_uri','response_type','scope','resource','code_challenge','code_challenge_method','state'}:raise OAuthError()
        if p['client_id']!=CLIENT or p['redirect_uri']!=REDIRECT or p['response_type']!='code' or p['scope']!=SCOPE or p['resource']!=self.resource or p['code_challenge_method']!='S256' or not validate_challenge(p['code_challenge']):raise OAuthError()
        if not isinstance(p['state'],str) or not 1<=len(p['state'])<=512 or not p['state'].isprintable():raise OAuthError()
        tx={'id':secrets.token_urlsafe(24),'state':p['state'],'challenge':p['code_challenge'],'exp':int(time.time())+TX_TTL}
        return self.fernet.encrypt(json.dumps(tx,separators=(',',':'),ensure_ascii=True).encode()).decode()
    def transaction(self,handle):
        if not isinstance(handle,str) or len(handle)>4096:raise OAuthError()
        try:
            tx=json.loads(self.fernet.decrypt(handle.encode('ascii'),ttl=TX_TTL))
            if set(tx)!={'id','state','challenge','exp'} or not ID_RE.fullmatch(tx['id']) or tx['exp']<=time.time() or not validate_challenge(tx['challenge']):raise ValueError()
            return tx
        except (InvalidToken,ValueError,TypeError,KeyError,UnicodeError):raise OAuthError() from None
    def _update(self,mutator):
        for _ in range(5):
            doc,version=self.store.read(KEY);doc=doc or {'grants':{}}
            now=time.time();doc['grants']={i:g for i,g in doc['grants'].items() if g['retain_until']>now}
            result=mutator(doc['grants'],now)
            try:self.store.write(KEY,doc,version);return result
            except Conflict:continue
        raise OAuthError('temporarily_unavailable',503)
    def _allowed(self,oid,subject):
        # Recheck the exact Entra object and subject, including on each MCP call.
        r=self.verifier.users.get(oid)
        if not isinstance(r,dict) or not isinstance(subject,str) or r.get('subject')!=subject:return None
        try:safe_key(subject)
        except ValueError:return None
        if sum(isinstance(v,dict) and v.get('subject')==subject for v in self.verifier.users.values())!=1:return None
        return dict(r)
    def complete(self,handle,oid,record,approved):
        tx=self.transaction(handle);subject=record.get('subject')
        if not self._allowed(oid,subject):raise OAuthError('access_denied',403)
        code=token(tx['id']) if approved else None
        def mutate(grants,now):
            if tx['id'] in grants:raise OAuthError('invalid_request')
            if len(grants)>=MAX_GRANTS or sum(g.get('subject')==subject and g['status'] in ('code','active') for g in grants.values())>=MAX_PER_SUBJECT:raise OAuthError('temporarily_unavailable',503)
            item={'subject':subject,'oid':oid,'retain_until':tx['exp'],'status':'denied' if not approved else 'code',
                  'challenge':tx['challenge'],'code_hash':digest(code) if code else None,'code_exp':min(tx['exp'],int(now)+CODE_TTL),'tx_exp':tx['exp']}
            grants[tx['id']]=item
        self._update(mutate)
        return {'state':tx['state'],'code':code,'error':None if approved else 'access_denied'}
    def exchange(self,p):
        typ=p.get('grant_type');common={'grant_type','client_id','resource'}
        required=common|({'code','redirect_uri','code_verifier'} if typ=='authorization_code' else {'refresh_token'} if typ=='refresh_token' else set())
        if typ not in ('authorization_code','refresh_token'):raise OAuthError('unsupported_grant_type')
        if not required<=set(p) or set(p)-required-{'scope'}:raise OAuthError()
        if p['client_id']!=CLIENT or p['resource']!=self.resource or p.get('scope',SCOPE)!=SCOPE:raise OAuthError('invalid_client' if p['client_id']!=CLIENT else 'invalid_request')
        raw=p['code'] if typ=='authorization_code' else p['refresh_token'];jti=token_id(raw)
        if not jti:raise OAuthError('invalid_grant')
        if typ=='authorization_code' and (p['redirect_uri']!=REDIRECT or not VERIFIER_RE.fullmatch(p['code_verifier'])):raise OAuthError('invalid_grant')
        access=token(jti);refresh=token(jti)
        def mutate(grants,now):
            g=grants.get(jti)
            if not g or g.get('status') not in ('code','active'):raise OAuthError('invalid_grant')
            if typ=='authorization_code':
                if not self._allowed(g['oid'],g['subject']):raise OAuthError('invalid_grant')
                challenge=base64.urlsafe_b64encode(hashlib.sha256(p['code_verifier'].encode('ascii')).digest()).decode().rstrip('=')
                if g['status']!='code' or g['code_exp']<=now or not hmac.compare_digest(g['code_hash'],digest(raw)) or not hmac.compare_digest(g['challenge'],challenge):raise OAuthError('invalid_grant')
                g['refresh_exp']=int(now)+REFRESH_TTL
                g['used_refresh_hashes']=[];g['used_access_hashes']=[]
            else:
                if g['status']!='active':raise OAuthError('invalid_grant')
                raw_hash=digest(raw)
                if any(hmac.compare_digest(old,raw_hash) for old in g.get('used_refresh_hashes',[])):
                    self._revoke_family(g)
                    return 'replayed'
                if g['refresh_exp']<=now or not self._allowed(g['oid'],g['subject']):raise OAuthError('invalid_grant')
                if not hmac.compare_digest(g['refresh_hash'],raw_hash):raise OAuthError('invalid_grant')
                if len(g.get('used_refresh_hashes',[]))>=MAX_ROTATIONS:raise OAuthError('invalid_grant')
                g.setdefault('used_refresh_hashes',[]).append(g['refresh_hash'])
                g.setdefault('used_access_hashes',[]).append(g['access_hash'])
            g.update(status='active',code_hash=None,access_hash=digest(access),access_exp=int(now)+ACCESS_TTL,refresh_hash=digest(refresh),retain_until=g['refresh_exp'])
            return 'issued'
        outcome=self._update(mutate)
        if outcome=='replayed':raise OAuthError('invalid_grant')
        return {'access_token':access,'token_type':'Bearer','expires_in':ACCESS_TTL,'refresh_token':refresh,'scope':SCOPE}
    @staticmethod
    def _revoke_family(g):
        # Keep a transaction tombstone to prevent replay, without using subject capacity.
        # Older stored grants lack tx_exp: retain them to their existing deadline.
        retain_until=g.get('tx_exp',g['retain_until'])
        g.clear();g.update(status='revoked',retain_until=retain_until)
    @staticmethod
    def _matches_family(g,raw_hash):
        if not g or g.get('status')!='active':return False
        known=[g.get('access_hash',''),g.get('refresh_hash','')]+g.get('used_refresh_hashes',[])+g.get('used_access_hashes',[])
        return any(hmac.compare_digest(x,raw_hash) for x in known)
    def revoke(self,p):
        if 'client_id' not in p or p['client_id']!=CLIENT:raise OAuthError('invalid_client',401)
        if 'token' not in p or set(p)-{'client_id','token','token_type_hint'}:raise OAuthError()
        raw=p['token'];jti=token_id(raw)
        if not jti:return
        raw_hash=digest(raw)
        # Unknown tokens must not create storage records or disclose token validity.
        doc,_=self.store.read(KEY)
        if not self._matches_family((doc or {}).get('grants',{}).get(jti),raw_hash):return
        def mutate(grants,now):
            g=grants.get(jti)
            if self._matches_family(g,raw_hash):self._revoke_family(g)
        self._update(mutate)
    def authenticate(self,raw):
        jti=token_id(raw)
        if not jti:raise OAuthError('invalid_token',401)
        doc,_=self.store.read(KEY);g=(doc or {}).get('grants',{}).get(jti)
        if not g or g.get('status')!='active' or g.get('access_exp',0)<=time.time() or not hmac.compare_digest(g.get('access_hash',''),digest(raw)):raise OAuthError('invalid_token',401)
        record=self._allowed(g['oid'],g['subject'])
        if not record:raise OAuthError('invalid_token',401)
        return record
