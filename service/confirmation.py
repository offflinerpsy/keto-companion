"""Short-lived UI-only action capabilities, never part of model-visible tool data.
This protects a compliant host's model/UI boundary, not against the authenticated
account owner automating their own UI or an already-compromised host.
"""
import hashlib,secrets,time
from .store import Conflict
class Confirmations:
    def __init__(self,store):self.store=store
    def _key(self,subject):return 'confirm_'+hashlib.sha256(subject.encode()).hexdigest()
    def issue(self,subject):
        key=self._key(subject)
        for _ in range(3):
            doc,ver=self.store.read(key);doc=doc or {'tickets':[]}
            token=secrets.token_urlsafe(32)
            doc['tickets']=[x for x in doc['tickets'] if x['expires']>time.time()][-4:]
            doc['tickets'].append({'digest':hashlib.sha256(token.encode()).hexdigest(),'expires':time.time()+300})
            try:self.store.write(key,doc,ver);return token
            except Conflict:continue
        raise Conflict('Обновите страницу подтверждения')
    def consume(self,subject,token):
        if not isinstance(token,str) or not 32<=len(token)<=100:raise ValueError('Подтвердите действие кнопкой в приложении')
        key=self._key(subject);doc,ver=self.store.read(key);digest=hashlib.sha256(token.encode()).hexdigest()
        found=next((x for x in (doc or {}).get('tickets',[]) if secrets.compare_digest(x['digest'],digest) and x['expires']>time.time()),None)
        if not found:raise ValueError('Подтверждение отсутствует или истекло. Повторите нажатие в приложении.')
        doc['tickets'].remove(found);self.store.write(key,doc,ver)
