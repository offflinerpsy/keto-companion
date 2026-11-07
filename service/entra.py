"""Microsoft Entra access-token validation. No secrets or tokens in logs/model input."""
import json,os,re
import jwt
from jwt import PyJWKClient
class EntraVerifier:
    def __init__(self,tenant=None,client=None,users=None,jwks=None):
        self.tenant=tenant or os.environ['KETO_ENTRA_TENANT_ID']
        self.client=client or os.environ['KETO_ENTRA_CLIENT_ID']
        if not all(re.fullmatch(r'[a-fA-F0-9-]{36}',x) for x in (self.tenant,self.client)):raise RuntimeError('Invalid identity configuration')
        self.users=users if users is not None else json.loads(os.getenv('KETO_ENTRA_USERS','{}'))
        self.issuer='https://login.microsoftonline.com/'+self.tenant+'/v2.0'
        self.jwks=jwks or PyJWKClient('https://login.microsoftonline.com/'+self.tenant+'/discovery/v2.0/keys',cache_keys=True,timeout=8)
    def verify_identity(self,token):
        if not isinstance(token,str) or len(token)>16000:raise ValueError('Неверное подключение')
        try:
            key=self.jwks.get_signing_key_from_jwt(token).key
            claims=jwt.decode(token,key,algorithms=['RS256'],audience=self.client,issuer=self.issuer,options={'require':['exp','iat','aud','iss','tid','oid','scp']},leeway=30)
            if claims['tid']!=self.tenant or 'user_impersonation' not in claims['scp'].split():raise ValueError('Wrong scope')
            record=self.users.get(claims['oid'])
            if not record:raise ValueError('Пользователь ещё не приглашён')
            return claims['oid'],dict(record)
        except (jwt.PyJWTError,ValueError,TypeError,KeyError) as e:
            raise ValueError('Вход не подтверждён или пользователь ещё не приглашён') from e

    def verify(self,token):
        return self.verify_identity(token)[1]
