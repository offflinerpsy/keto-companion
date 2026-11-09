"""Loopback-only synthetic UI fixture using the actual Service HTTP transport.

Membership is a fixed synthetic fixture. Food calculations, proposals, persistence,
CAS, and the one-use confirmation capability use the real service implementation.
This test server is never imported by the Worker or included in the Azure package.
"""
from __future__ import annotations
import copy
import hashlib
import json
import sys
import tempfile
from pathlib import Path

ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT))
from fastapi import FastAPI,HTTPException,Request
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.testclient import TestClient
from service.app import create_app,UI_CONFIRM_TOOLS
from service.domain import Service,k
from service.store import SQLiteStore

SUBJECT='synthetic-ui-intake'
KEY='synthetic_ui_fixture_only_never_production_20261109'
CSRF='synthetic-ui-csrf'
temporary=tempfile.TemporaryDirectory(prefix='keto-intake-ui-')

class OfflineBrain:
    calls=0
    def infer(self,*args,**kwargs):
        self.calls+=1
        return {'intent':'help','reply_ru':'Синтетический разговор.','query':'','changes':[],
                'safety_signals':['none'],'days':1,'diary_note':''}

service=Service(SQLiteStore(Path(temporary.name)/'state.sqlite'),OfflineBrain())
transport=create_app(service,[{'subject':SUBJECT,'sha256':hashlib.sha256(KEY.encode()).hexdigest(),'kind':'personal'}],
                     'synthetic_ui_signing_key','http://testserver',testing=True)
client=TestClient(transport)
headers={'Authorization':'Bearer '+KEY}
app=FastAPI(docs_url=None,redoc_url=None,openapi_url=None)

def reset(count=0):
    service.brain.calls=0
    old,version=service.store.read(SUBJECT)
    if old is not None:service.store.delete(SUBJECT,version)
    service.consent(SUBJECT,True,True,True,True)
    document,version=service.load(SUBJECT)
    fixture=json.loads((ROOT/'qa/setup-fixtures.json').read_text())['ready']
    profile=copy.deepcopy(fixture['profile'])
    profile.update(subject_id=SUBJECT,owner_account_id=SUBJECT,subject_kind='personal')
    document['core']['profile']=profile
    document['guidance_choices']=copy.deepcopy(fixture['guidance']['choices'])
    document['targets_provenance']={'source':'manual','label':'synthetic only'}
    document['ui'].update(theme='light',home='chat',text_size='normal')
    document['revision']+=1
    for index in range(count):
        payload={'date':f'2026-10-{index%25+1:02d}','recipe_id':'B01','portions':.5,'intake_status':'confirmed','note':f'Синтетическая запись {index+1}'}
        document['core']=k.apply_event(document['core'],{'event_id':f'synthetic_seed_{index}','type':'diary.add','payload':payload,'confirmed':True},
                                       document['core']['state_revision'],SUBJECT,service.kitchen_catalog(document))
    service.save(SUBJECT,document,version)

reset()

@app.get('/auth/config')
def auth_config():return {'provider':'direct_google'}

@app.get('/api/session')
def session():return {'user':{'role':'member','status':'active','email':'synthetic@example.test'},'csrf':CSRF}

@app.post('/api/tools/{name}')
async def invoke(name:str,request:Request):
    if request.headers.get('x-csrf-token')!=CSRF:raise HTTPException(403,'Synthetic CSRF required')
    args=await request.json()
    # Same capability boundary as the edge adapter; no direct Service.apply shortcut.
    if name in UI_CONFIRM_TOOLS:
        opened=client.post('/api/tools/keto_open',json={},headers=headers)
        opened.raise_for_status();args['ui_confirmation']=opened.json()['_ui_confirmation']
    response=client.post('/api/tools/'+name,json=args,headers=headers)
    return JSONResponse(response.json(),status_code=response.status_code)

@app.post('/__test__/reset')
async def reset_fixture(request:Request):
    value=await request.json();count=value.get('entries',0)
    if type(count)is not int or count not in (0,75):raise HTTPException(400,'Fixture count')
    reset(count);return {'synthetic_only':True}

@app.get('/__test__/state')
def state():return dict(service.opened(SUBJECT),stored_diary=service.load(SUBJECT)[0]['core']['diary'],intent_calls=service.brain.calls)

@app.post('/__test__/concurrent-note')
def concurrent_note():
    document,_=service.load(SUBJECT)
    proposal=service.propose(SUBJECT,'diary.add',{'date':'2026-10-01','note':'Синтетическое параллельное изменение','intake_status':'unquantified'},document['revision'])['proposal']
    service.apply(SUBJECT,proposal['id'],document['revision'],True)
    return {'synthetic_only':True}

@app.post('/__test__/legacy-record')
def legacy_record():
    document,version=service.load(SUBJECT)
    # Imported pre-snapshot history, with more time precision than the minute editor.
    document['core']['diary'].append({'entry_id':'synthetic_legacy','date':'2026-01-03',
        'recipe_id':'B01','portions':.5,'intake_status':'confirmed',
        'time':'12:40','timezone':'Europe/Minsk','eaten_at':'2026-01-03T12:40:17+03:00',
        'meal':'Поздний завтрак','time_fold':0,'recorded_at':'2026-01-04T10:00:00Z','note':'Старая запись'})
    document['revision']+=1;service.save(SUBJECT,document,version)
    return {'synthetic_only':True}

app.mount('/',StaticFiles(directory=ROOT/'cloudflare-saas/public',html=True),name='synthetic-ui')

if __name__=='__main__':
    import uvicorn
    try:uvicorn.run(app,host='127.0.0.1',port=8898,log_level='warning')
    finally:client.close();temporary.cleanup()
