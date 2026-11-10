"""Authenticated HTTP/MCP transport. No arbitrary execution or public user records."""
from __future__ import annotations
import base64, hashlib, hmac, io, json, os, secrets, time, threading
from pathlib import Path
from urllib.parse import urlparse, urlencode, parse_qsl
from fastapi import FastAPI,Request,HTTPException
from fastapi.responses import JSONResponse,HTMLResponse,Response,RedirectResponse
from fastapi.staticfiles import StaticFiles
from starlette.concurrency import run_in_threadpool
from jsonschema import Draft202012Validator,ValidationError
from .store import from_env, Conflict
from .brain import AzureBrain, BrainUnavailable
from .domain import Service,VERSION,UI_ALLOWED,UI_DEFAULT,InputError,PermissionError,literal_guard,k

HERE=Path(__file__).parent
# Fixed source-only inventory. No settings, private state, filesystem walk or
# environment override may stand in for the deployed bytes at app startup.
RUNTIME_CODE_FILES=(
    'function_app.py',
    'library/skills/keto-companion/scripts/keto_core.py',
    'service/__init__.py',
    'service/app.py',
    'service/brain.py',
    'service/chat_actions.py',
    'service/confirmation.py',
    'service/developer.py',
    'service/domain.py',
    'service/edge_bridge.py',
    'service/entra.py',
    'service/food_search.py',
    'service/food_source.py',
    'service/intake.py',
    'service/kitchen.py',
    'service/label.py',
    'service/mobile.py',
    'service/mobile_exports.py',
    'service/oauth_bridge.py',
    'service/planning.py',
    'service/portion_search.py',
    'service/recipe_brain.py',
    'service/speech.py',
    'service/store.py',
)

def runtime_code_sha256(root=None):
    """Versioned digest of exact installed Python bytes; missing files fail startup."""
    root=HERE.resolve().parent if root is None else Path(root)
    digest=hashlib.sha256(b'keto-runtime-code-v1\n')
    for relative in RUNTIME_CODE_FILES:
        file_digest=hashlib.sha256((root/relative).read_bytes()).hexdigest()
        digest.update(relative.encode('utf-8')+b'\0'+file_digest.encode('ascii')+b'\n')
    return digest.hexdigest()

RESOURCE='ui://keto-companion/workspace-v020'
S={'type':'string'};I={'type':'integer'};B={'type':'boolean'};O={'type':'object'}
def schema(props=None,required=None):return {'type':'object','properties':props or {},'required':required or [],'additionalProperties':False}
def tool(name,title,description,props=None,required=None,read=False,app_only=False,render=False):
    x={'name':name,'title':title,'description':description,'inputSchema':schema(props,required),
       'annotations':{'readOnlyHint':read,'destructiveHint':False,'idempotentHint':read,'openWorldHint':False},
       '_meta':{'ui':{'visibility':['app'] if app_only else ['model','app']}}}
    if render:x['_meta']['ui']['resourceUri']=RESOURCE;x['_meta']['openai/ui']={'entrypoints':[{'type':'global'},{'type':'thread'}]}
    return x
TOOLS=[
 tool('keto_open','KETO Companion','Открыть личную страницу, настройки, состояние и понятную справку.',read=True,render=True),
 tool('keto_chat','Обсудить питание','Разобрать сообщение через Azure Terra. Создаёт только предложения, не применяет изменения. Может сохранять историю при согласии.',{'message':{'type':'string','minLength':1,'maxLength':6000},'request_id':{'type':'string','minLength':8,'maxLength':100},'image_data_url':{'type':'string','maxLength':1500000},'thread_id':{'type':'string','maxLength':80}},['message','request_id']),
 tool('keto_recipes','Подобрать рецепты','Проверяемые рецепты из каталога с граммовками и рассчитанным составом.',{'query':S,'limit':{'type':'integer','minimum':1,'maximum':72},'include_food_ids':{'type':'array','maxItems':12,'items':S},'exclude_food_ids':{'type':'array','maxItems':40,'items':S},'max_minutes':{'type':'integer','minimum':1,'maximum':180},'offset':{'type':'integer','minimum':0,'maximum':100000},'category':{'type':'string','enum':['breakfast','main','side','component']}},read=True),
 tool('keto_propose_change','Подготовить изменение','Подготовить изменение профиля, дневника, настроек или меню. Показать для явного подтверждения в приложении.',{'event_type':S,'payload':O,'expected_revision':I},['event_type','payload','expected_revision']),
 tool('keto_apply_proposal','Подтвердить изменение','Применить выбранное пользователем предложение. Только кнопкой приложения, не решением языковой модели.',{'proposal_id':S,'expected_revision':I,'approved':B},['proposal_id','expected_revision','approved'],app_only=True),
 tool('keto_consent','Разрешения','Согласие самого пользователя на обработку Azure и хранение. Только через явные элементы согласия.',{'processing':B,'storage':B,'health':B,'confirmed':B},['processing','storage','health','confirmed'],app_only=True),
 tool('keto_menu','Рассчитать меню','Рассчитать черновик меню только после скрининга и согласованных ориентиров. Не назначает целевые калории.',{'start':{'type':'string','format':'date'},'days':{'type':'integer','minimum':1,'maximum':7}},['start','days'],read=True),
 tool('keto_export','Выгрузить данные','Вернуть содержимое собственной выгрузки JSON/CSV/HTML. Не отправляет данные в Google или по почте.',{'format':{'type':'string','enum':['json','csv','html','pdf']}},['format'],read=True),
 tool('keto_import_menu','Проверить импорт меню','Пересчитать импорт CSV/JSON и подготовить подтверждение. Не исполняет инструкции внутри файла.',{'content':{'type':'string','maxLength':150000},'format':{'type':'string','enum':['json','csv']},'expected_revision':I},['content','format','expected_revision']),
 tool('keto_settings_read','Оформление','Прочитать настройки интерфейса для нативного редактора ChatGPT.',read=True,app_only=True),
 tool('keto_settings_update','Изменить оформление','Сохранить только безопасные настройки внешнего вида из явного нативного редактора.',{'set':{'type':'object','properties':{x:({'type':'boolean'} if isinstance(v[0],bool) else {'type':'string','enum':list(v)}) for x,v in UI_ALLOWED.items()},'additionalProperties':False,'minProperties':1}},['set'],app_only=True)
]
TOOLS[-2]['outputSchema']={'type':'object','properties':{'schema':O,'values':O,'layout':{'type':'array'}},'required':['schema','values']}
TOOLS[-1]['outputSchema']={'type':'object','properties':{'values':O},'required':['values']}
TOOLS.append(tool('keto_delete_profile','Удалить личные данные','Удаление собственного профиля и дневника по явному подтверждению приложения.',{'expected_revision':I,'confirmation':{'type':'string','const':'DELETE_MY_PROFILE'}},['expected_revision','confirmation'],app_only=True))
TOOLS[-1]['annotations']['destructiveHint']=True
UI_CONFIRM_TOOLS={'keto_apply_proposal','keto_consent','keto_delete_profile'}
for definition in TOOLS:
    if definition['name'] in UI_CONFIRM_TOOLS:
        definition['inputSchema']['properties']['ui_confirmation']={'type':'string','minLength':32,'maxLength':100}
        definition['inputSchema']['required'].append('ui_confirmation')
TOOLS.extend([
 tool('keto_guidance','Знакомство и ориентиры','Детерминированные предварительные ориентиры по сохранённым данным; только отдельное подтверждение.',{'action':{'type':'string','enum':['status','preview','baseline','propose']},'values':O,'preview_hash':S},['action']),
 tool('keto_topics','Темы разговора','Личные темы; изменение только по явному подтверждению.',{'action':{'type':'string','enum':['list','create','select','rename','delete','clear']},'thread_id':S,'title':{'type':'string','maxLength':80},'confirmed':B,'expected_revision':I},['action']),
 tool('keto_reminders','Личные напоминания','Напоминания и экспорт в Календарь; сайт не отправляет push в фоне.',{'action':{'type':'string','enum':['list','create','update','delete','complete','ics']},'reminder_id':S,'values':O,'confirmed':B,'expected_revision':I},['action']),
 tool('keto_transcribe','Распознать запись','До 60 секунд, аудио до 1 МБ. Текст только черновик, не отправляется автоматически.',{'audio_base64':{'type':'string','maxLength':1400000},'mime':{'type':'string','enum':['audio/mp4','audio/webm','audio/wav','audio/x-wav']},'request_id':{'type':'string','minLength':8,'maxLength':100}},['audio_base64','mime','request_id'])
])
TOOLS.append(tool('keto_label_extract','Прочитать этикетку','Только неподтверждённый черновик; без сохранения.',{'request_id':{'type':'string','pattern':'^[A-Za-z0-9_-]{8,100}$'},'image_data_url':{'type':'string','maxLength':1500000},'note':{'type':'string','maxLength':500},'thread_id':{'type':'string','maxLength':80}},['request_id','image_data_url']))
MOBILE_HTTP_TOOLS={'keto_guidance','keto_topics','keto_reminders','keto_transcribe','keto_label_extract'}
TOOLS.append(tool('keto_kitchen','Что приготовим','Единая кладовая, рецепты и память. Генерация может вызвать Azure Sol high; сохранения только через отдельное подтверждение.',{'action':{'type':'string','enum':['status','foods','source_search','source_detail','source_import','chat_action','intake_preview','intake','diary_history','food_portion','own_dish_calculate','own_dish_detail','own_dish_save','own_dish_diary','parse','generate','select','memory','pantry','remember','forget','save','favorite','rate','diary','accept_day']},'spec':O,'request_id':{'type':'string','pattern':'^[A-Za-z0-9_-]{8,100}$'},'thread_id':{'type':'string','maxLength':80},'query':{'type':'string','maxLength':1000},'recipe_id':{'type':'string','maxLength':80},'values':O,'expected_revision':I},['action']))
TOOL_MAP={x['name']:x for x in TOOLS}

# Only these fixed domain failures may cross the private compute boundary.
# All other exception messages, source text and identifiers remain opaque.
INTAKE_VALIDATION_CODES={
 'Двусмысленное время: нужно уточнить переход часов':'INTAKE_TIME_AMBIGUOUS',
 'Несуществующее время перехода на летнее время':'INTAKE_TIME_NONEXISTENT',
 'Устаревший экран дневника':'INTAKE_STALE',
 'Укажите актуальную ревизию дневника':'INTAKE_STALE',
 'Дневник изменился; обновите историю':'INTAKE_STALE',
 'Расчёт или запись изменились. Проверьте количество заново.':'INTAKE_STALE',
 'Расчёт изменился. Проверьте новое предложение перед сохранением.':'INTAKE_STALE',
 'Профиль изменился. Подготовьте предложение заново.':'INTAKE_STALE',
 'Предложение истекло; отмените и подготовьте заново':'INTAKE_STALE',
 'Запись не найдена в вашем дневнике':'INTAKE_ENTRY_NOT_FOUND',
 'Запись дневника не найдена':'INTAKE_ENTRY_NOT_FOUND',
 'Блюдо не найдено':'INTAKE_SOURCE_NOT_FOUND',
 'Продукт не найден':'INTAKE_SOURCE_NOT_FOUND',
 'Черновик не принадлежит выбранной теме или устарел':'INTAKE_SOURCE_MISMATCH',
 'Подбор изменился. Выберите рецепт заново.':'INTAKE_SOURCE_MISMATCH',
 'Источник записи не совпадает с сообщением':'INTAKE_SOURCE_MISMATCH',
 'Рецепт сообщения больше недоступен':'INTAKE_SOURCE_MISMATCH',
 'Рецепт не совпадает с сообщением':'INTAKE_SOURCE_MISMATCH',
 'Сообщение отсутствует в выбранной теме':'INTAKE_SOURCE_MISMATCH',
 'Действие отсутствует в выбранном сообщении':'INTAKE_SOURCE_MISMATCH',
 'Количество порций противоречит основе':'INTAKE_AMOUNT_BASIS',
 'Масса противоречит количеству':'INTAKE_AMOUNT_BASIS',
 'Для блюда нужна порция или доля всего блюда; готовая масса неизвестна':'INTAKE_AMOUNT_BASIS',
 'Для продукта нужна масса в граммах':'INTAKE_AMOUNT_BASIS',
 'Дата, время и часовой пояс еды не совпадают':'INTAKE_TIME_MISMATCH',
 'Уточнение перехода часов не совпадает со временем':'INTAKE_TIME_MISMATCH',
 'Подтвердите часовой пояс в профиле':'INTAKE_TIMEZONE_REQUIRED',
 'Укажите часовой пояс IANA':'INTAKE_TIMEZONE_REQUIRED',
 'Для времени нужен часовой пояс':'INTAKE_TIMEZONE_REQUIRED',
}

def intake_validation_code(message,body):
    code=INTAKE_VALIDATION_CODES.get(message)
    if code is None:return None
    try:
        request=json.loads(body);args=request.get('arguments',{});state=request.get('state') or {}
        if not isinstance(args,dict) or not isinstance(state,dict):return None
        if request.get('operation')=='kitchen' and args.get('action') in ('intake','intake_preview','diary_history'):return code
        if request.get('operation')=='apply':
            owner=state.get('core',{})
            proposal=state.get('pending',{}).get(args.get('proposal_id'),{})
            if owner.get('owner_account_id')==request.get('subject')==owner.get('subject_id') and proposal.get('type') in ('kitchen.intake','kitchen.diary','kitchen.own_dish_diary','diary.add','diary.update','diary.repeat','diary.delete'):return code
    except (ValueError,TypeError,AttributeError):pass
    return None

def image_clean(value):
    if value is None:return None
    from PIL import Image,ImageOps
    if not isinstance(value,str) or not value.startswith(('data:image/png;base64,','data:image/jpeg;base64,','data:image/webp;base64,','data:image/gif;base64,')):raise InputError('Нужно фото JPEG, PNG, WebP или GIF, не страница и не SVG')
    try:raw=base64.b64decode(value.split(',',1)[1],validate=True)
    except Exception as e:raise InputError('Повреждённое фото') from e
    if len(raw)>1_000_000:raise InputError('Сожмите фото до 1 МБ')
    try:
        im=Image.open(io.BytesIO(raw))
        if im.format not in ('JPEG','PNG','WEBP','GIF') or im.width*im.height>8_000_000:raise InputError('Слишком большое изображение')
        im.seek(0);im.load();im=ImageOps.exif_transpose(im).convert('RGB');im.thumbnail((1024,1024));buf=io.BytesIO();im.save(buf,format='JPEG',quality=82)
    except InputError:raise
    except Exception as e:raise InputError('Не удалось прочитать фото') from e
    return 'data:image/jpeg;base64,'+base64.b64encode(buf.getvalue()).decode()

def b64(raw):return base64.urlsafe_b64encode(raw).decode().rstrip('=')
def unb64(v):return base64.urlsafe_b64decode(v+'='*(-len(v)%4))

def create_app(service=None,auth_records=None,signing_key=None,public_url=None,testing=False,entra_verifier=None,oauth_key=None,edge_secret=None,edge_replay_store=None):
    runtime_digest=runtime_code_sha256()
    svc=service or Service(from_env(),AzureBrain())
    records=auth_records if auth_records is not None else json.loads(os.getenv('KETO_AUTH_RECORDS','[]'))
    secret=signing_key or os.getenv('KETO_SESSION_SECRET','')
    entra_mode=entra_verifier is not None or os.getenv('KETO_AUTH_MODE')=='entra'
    if entra_mode:
        from .entra import EntraVerifier
        entra_verifier=entra_verifier or EntraVerifier()
    if not secret and os.getenv('KETO_ENV')=='production' and not entra_mode:raise RuntimeError('Missing session secret')
    secret=(secret or secrets.token_urlsafe(48)).encode()
    public_url=(public_url or os.getenv('KETO_PUBLIC_URL','http://127.0.0.1:8821')).rstrip('/')
    from .oauth_bridge import OAuthBridge,OAuthError,CLIENT,REDIRECT,SCOPE
    bridge_enabled=oauth_key is not None or os.getenv('KETO_OAUTH_BRIDGE_ENABLED')=='1'
    bridge=None
    if bridge_enabled:
        if not entra_mode:raise RuntimeError('OAuth bridge requires Entra authentication')
        if not testing:
            from .store import BlobStore
            if not public_url.startswith('https://') or not isinstance(svc.store,BlobStore):raise RuntimeError('OAuth bridge requires HTTPS and Blob storage')
        key=oauth_key or os.getenv('KETO_OAUTH_BRIDGE_KEY','')
        bridge=OAuthBridge(svc.store,entra_verifier,public_url,key)
    allowed={public_url,'https://chatgpt.com','https://chat.openai.com'}
    app=FastAPI(title='KETO Companion',version=VERSION,docs_url=None,redoc_url=None,openapi_url=None)
    app.state.service=svc;app.state.auth_records=records;app.state.public_url=public_url
    from .confirmation import Confirmations
    confirmations=Confirmations(svc.store)
    failed_logins={}
    oauth_rates={};oauth_rate_lock=threading.Lock()
    def oauth_limit(req):
        ip=req.client.host if req.client else 'unknown';now=time.monotonic()
        with oauth_rate_lock:
            for k in list(oauth_rates):
                if oauth_rates[k][1]<=now:del oauth_rates[k]
            if ip not in oauth_rates and len(oauth_rates)>=2048:raise OAuthError('temporarily_unavailable',503)
            count,until=oauth_rates.get(ip,(0,now+60))
            if count>=60:raise OAuthError('temporarily_unavailable',429)
            oauth_rates[ip]=(count+1,until)
    def require_bridge():
        if bridge is None:raise HTTPException(404,'Not found')
    def mcp_identity(req):
        if bridge is None:return identity(req)
        authorization=req.headers.get('authorization','')
        challenge={'WWW-Authenticate':'Bearer resource_metadata="'+public_url+'/.well-known/oauth-protected-resource/mcp"'}
        if not authorization.startswith('Bearer '):raise HTTPException(401,'Authentication required',headers=challenge)
        try:return bridge.authenticate(authorization[7:])
        except OAuthError:raise HTTPException(401,'Authentication required',headers=challenge)
    def oauth_site_identity(req):
        if req.headers.get('origin')!=public_url:raise OAuthError('invalid_request',403)
        auth=req.headers.get('authorization','')
        if not auth.startswith('Bearer '):raise OAuthError('access_denied',401)
        try:return entra_verifier.verify_identity(auth[7:])
        except ValueError:raise OAuthError('access_denied',401)
    async def oauth_body(req):
        parts=[];total=0
        async for part in req.stream():
            total+=len(part)
            if total>8192:raise OAuthError('invalid_request',413)
            parts.append(part)
        return b''.join(parts)
    async def oauth_json(req):
        if req.headers.get('content-type','').split(';')[0].strip().lower()!='application/json':raise OAuthError()
        raw=await oauth_body(req)
        try:data=json.loads(raw)
        except (ValueError,UnicodeError):raise OAuthError() from None
        if not isinstance(data,dict):raise OAuthError()
        return data
    async def oauth_form(req):
        if req.headers.get('content-type','').split(';')[0].strip().lower()!='application/x-www-form-urlencoded':raise OAuthError()
        raw=await oauth_body(req)
        try:pairs=parse_qsl(raw.decode('utf-8'),keep_blank_values=True,strict_parsing=True,max_num_fields=12)
        except (ValueError,UnicodeError):raise OAuthError() from None
        if len(dict(pairs))!=len(pairs):raise OAuthError()
        return dict(pairs)

    def record_for_key(value):
        if not isinstance(value,str) or not 32<=len(value)<=200:return None
        digest=hashlib.sha256(value.encode()).hexdigest()
        return next((r for r in app.state.auth_records if hmac.compare_digest(r.get('sha256',''),digest)),None)
    def session_token(r):
        p={'sub':r['subject'],'exp':int(time.time())+86400,'csrf':secrets.token_urlsafe(24),'rev':r['sha256'][:16]}
        body=b64(json.dumps(p,separators=(',',':')).encode());sig=b64(hmac.new(secret,body.encode(),hashlib.sha256).digest())
        return body+'.'+sig,p
    def session_read(token):
        try:
            body,sig=token.split('.')
            if not hmac.compare_digest(b64(hmac.new(secret,body.encode(),hashlib.sha256).digest()),sig):return None
            p=json.loads(unb64(body))
            if not isinstance(p.get('exp'),int) or p['exp']<time.time():return None
            r=next((x for x in app.state.auth_records if x['subject']==p.get('sub') and x['sha256'][:16]==p.get('rev')),None)
            return (r,p) if r else None
        except Exception:return None
    def identity(request,write=False):
        authorization=request.headers.get('authorization','')
        if entra_mode:
            if not authorization.startswith('Bearer '):raise HTTPException(401,'Войдите через Microsoft',headers={'WWW-Authenticate':'Bearer resource_metadata="'+public_url+'/.well-known/oauth-protected-resource"'})
            try:return entra_verifier.verify(authorization[7:])
            except ValueError:raise HTTPException(401,'Вход не подтверждён или доступ ещё не предоставлен',headers={'WWW-Authenticate':'Bearer resource_metadata="'+public_url+'/.well-known/oauth-protected-resource"'})
        if authorization.startswith('Bearer '):
            r=record_for_key(authorization[7:]);p=None
            if not r:raise HTTPException(401,'Требуется подключение',headers={'WWW-Authenticate':'Bearer realm="keto-companion"'})
            return r
        pair=session_read(request.cookies.get('keto_session',''))
        if not pair:raise HTTPException(401,'Войдите в личное пространство',headers={'WWW-Authenticate':'Bearer realm="keto-companion"'})
        r,p=pair
        if write and not hmac.compare_digest(request.headers.get('x-csrf-token',''),p['csrf']):raise HTTPException(403,'Не подтверждён источник действия')
        return r
    @app.middleware('http')
    async def guard(request,call_next):
        host=request.url.hostname
        accepted_hosts={urlparse(public_url).hostname}
        if testing:accepted_hosts|={'testserver','127.0.0.1','localhost'}
        if host not in accepted_hosts:return JSONResponse({'detail':'Неверный адрес сервиса'},status_code=400)
        origin=request.headers.get('origin')
        if origin and origin.rstrip('/') not in allowed:return JSONResponse({'detail':'Источник запроса не разрешён'},status_code=403)
        try:length=int(request.headers.get('content-length','0'))
        except ValueError:return JSONResponse({'detail':'Неверный размер'},status_code=400)
        if length>1_700_000:return JSONResponse({'detail':'Запрос слишком большой'},status_code=413)
        resp=await call_next(request)
        resp.headers['X-Content-Type-Options']='nosniff';resp.headers['Referrer-Policy']='no-referrer'
        resp.headers['Cache-Control']='no-store'
        if request.url.path not in ('/mcp',):
            resp.headers['Content-Security-Policy']="default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data: blob:; connect-src 'self' https://login.microsoftonline.com; frame-src https://login.microsoftonline.com; font-src 'self'; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'"
        if public_url.startswith('https://'):resp.headers['Strict-Transport-Security']='max-age=31536000'
        return resp
    @app.exception_handler(Conflict)
    async def conflict(req,exc):return JSONResponse({'detail':str(exc),'code':'REVISION_CONFLICT'},status_code=409)
    @app.exception_handler(ValueError)
    @app.exception_handler(InputError)
    @app.exception_handler(k.KetoError)
    async def invalid(req,exc):return JSONResponse({'detail':str(exc),'code':'VALIDATION_FAILED'},status_code=422)
    @app.exception_handler(OAuthError)
    async def oauth_error(req,exc):return JSONResponse({'error':exc.code},status_code=exc.status,headers={'Cache-Control':'no-store','Pragma':'no-cache'})
    @app.get('/.well-known/oauth-authorization-server')
    def oauth_metadata():
        require_bridge();return bridge.metadata()
    @app.get('/oauth/authorize')
    def oauth_authorize(req:Request):
        require_bridge();oauth_limit(req)
        if len(req.url.query)>8192:raise OAuthError('invalid_request',413)
        pairs=list(req.query_params.multi_items())
        if len(pairs)>12 or len(dict(pairs))!=len(pairs):raise OAuthError()
        handle=bridge.authorize(dict(pairs))
        return RedirectResponse(public_url+'/?'+urlencode({'oauth_transaction':handle}),status_code=303)
    @app.post('/oauth/request')
    async def oauth_request(req:Request):
        require_bridge();oauth_limit(req);oauth_site_identity(req)
        data=await oauth_json(req)
        if set(data)!={'transaction'}:raise OAuthError()
        bridge.transaction(data['transaction'])
        return {'client_name':'KETO Companion in ChatGPT','scope':SCOPE}
    @app.post('/oauth/complete')
    async def oauth_complete(req:Request):
        require_bridge();oauth_limit(req);oid,record=oauth_site_identity(req)
        data=await oauth_json(req)
        if set(data)!={'transaction','approved'} or type(data['approved']) is not bool:raise OAuthError()
        result=await run_in_threadpool(bridge.complete,data['transaction'],oid,record,data['approved'])
        params={'state':result['state'],'iss':public_url}
        if result['code']:params['code']=result['code']
        else:params['error']=result['error']
        return {'redirect':REDIRECT+'?'+urlencode(params)}
    @app.post('/oauth/token')
    async def oauth_token(req:Request):
        require_bridge();oauth_limit(req);params=await oauth_form(req)
        value=await run_in_threadpool(bridge.exchange,params)
        return JSONResponse(value,headers={'Cache-Control':'no-store','Pragma':'no-cache'})
    @app.post('/oauth/revoke')
    async def oauth_revoke(req:Request):
        require_bridge();oauth_limit(req);params=await oauth_form(req)
        await run_in_threadpool(bridge.revoke,params)
        return Response(status_code=200,headers={'Cache-Control':'no-store','Pragma':'no-cache'})
    edge_secret_value=edge_secret if edge_secret is not None else os.getenv('KETO_EDGE_BRIDGE_SECRET','')
    edge_public_value=os.getenv('KETO_EDGE_PUBLIC_JWK','')
    if edge_secret_value or edge_public_value:
        from .edge_bridge import EdgeBridge,BridgeError,LIMIT
        from .store import BlobStore
        replay_store=edge_replay_store if testing and edge_replay_store is not None else svc.store
        if not testing and not isinstance(replay_store,BlobStore):raise RuntimeError('Edge bridge requires durable Blob replay protection')
        edge=EdgeBridge(edge_secret_value,replay_store,svc.brain,TOOL_MAP,image_clean,public_jwk=edge_public_value)
        @app.post('/internal/keto/compute')
        async def edge_compute(req:Request):
            pieces=[];size=0
            async for part in req.stream():
                size+=len(part)
                if size>LIMIT:return JSONResponse({'error':'PAYLOAD_TOO_LARGE'},status_code=413)
                pieces.append(part)
            try:
                result=await run_in_threadpool(edge.execute,req.method,req.url.path,req.headers.get('x-keto-timestamp'),req.headers.get('x-keto-nonce'),req.headers.get('x-keto-signature'),b''.join(pieces))
                return JSONResponse(result,headers={'Cache-Control':'no-store'})
            except BridgeError as exc:
                # Authentication and validation failures contain no input or credentials.
                status=401 if str(exc) in ('invalid request','expired','invalid signature','replay') else 422
                code=intake_validation_code(str(exc),b''.join(pieces)) if status==422 else None
                return JSONResponse({'error':'BRIDGE_REJECTED',**({'validation_code':code} if code else {})},status_code=status)
    @app.get('/api/auth-config')
    def auth_config():
        return {'mode':'entra' if entra_mode else 'local_test','clientId':os.getenv('KETO_ENTRA_CLIENT_ID'),'tenantId':os.getenv('KETO_ENTRA_TENANT_ID'),'scope':'api://'+os.getenv('KETO_ENTRA_CLIENT_ID','')+'/user_impersonation','redirectUri':public_url+'/'}
    @app.get('/.well-known/oauth-protected-resource')
    @app.get('/.well-known/oauth-protected-resource/mcp')
    def protected_metadata():
        return {'resource':public_url+'/mcp','authorization_servers':([public_url] if bridge else ['https://login.microsoftonline.com/'+os.getenv('KETO_ENTRA_TENANT_ID','')+'/v2.0']),'scopes_supported':([SCOPE] if bridge else ['api://'+os.getenv('KETO_ENTRA_CLIENT_ID','')+'/user_impersonation']),'bearer_methods_supported':['header']}
    @app.get('/status')
    def status():return JSONResponse({'service':'KETO Companion','version':VERSION,'transport':'HTTP + MCP','authentication_required':True,'medical_monitoring':False,'source_commit':os.getenv('KETO_SOURCE_COMMIT',''),'runtime_code_sha256':runtime_digest,'edge_signature':'Ed25519' if edge_public_value else ('HMAC' if edge_secret_value else 'disabled')},headers={'Cache-Control':'no-store'})
    @app.get('/')
    def home():return HTMLResponse((HERE/'static/index.html').read_text())
    @app.post('/api/login')
    async def login(req:Request):
        if entra_mode:raise HTTPException(405,'Используйте вход через Microsoft')
        ip=req.client.host if req.client else 'unknown';now=time.time();count,until=failed_logins.get(ip,(0,now+300))
        if until<now:count,until=0,now+300
        if count>=10:raise HTTPException(429,'Слишком много попыток входа. Повторите позже.')
        d=await req.json();r=record_for_key(d.get('access_code')) if isinstance(d,dict) else None
        if not r:
            if len(failed_logins)>2000:failed_logins.clear()
            failed_logins[ip]=(count+1,until);raise HTTPException(401,'Код доступа не подошёл')
        failed_logins.pop(ip,None);token,p=session_token(r)
        resp=JSONResponse({'csrf':p['csrf'],'subject_kind':r.get('kind','personal')})
        resp.set_cookie('keto_session',token,httponly=True,secure=public_url.startswith('https://'),samesite='strict',max_age=86400,path='/')
        return resp
    @app.get('/api/session')
    def session(req:Request):
        r=identity(req);pair=session_read(req.cookies.get('keto_session',''))
        return {'csrf':pair[1]['csrf'] if pair else None,'subject_kind':r.get('kind','personal')}
    @app.post('/api/logout')
    def logout(req:Request):
        identity(req,True);resp=JSONResponse({'logged_out':True});resp.delete_cookie('keto_session',path='/');return resp
    def invoke(r,name,args):
        definition=TOOL_MAP.get(name)
        if definition is None:raise InputError('Неизвестный инструмент')
        try:Draft202012Validator(definition['inputSchema']).validate(args)
        except ValidationError as e:raise InputError('Неверный формат или размер аудиозаписи' if name=='keto_transcribe' else 'Неверные параметры: '+e.message[:250]) from None
        sub=r['subject'];kind=r.get('kind','personal')
        if name in UI_CONFIRM_TOOLS:confirmations.consume(sub,args['ui_confirmation'])
        if name=='keto_delete_profile':return svc.delete_profile(sub,args['expected_revision'],args['confirmation'],kind)
        if name=='keto_open':return dict(svc.opened(sub,kind),_ui_confirmation=confirmations.issue(sub))
        if name=='keto_chat':return svc.chat(sub,args['message'],args['request_id'],kind,None if literal_guard(args['message'])=='urgent' else image_clean(args.get('image_data_url')),thread_id=args.get('thread_id'))
        if name=='keto_recipes':return svc.catalog(sub,args.get('query',''),args.get('limit',12),kind,args.get('include_food_ids'),args.get('exclude_food_ids'),args.get('max_minutes'),args.get('offset',0),args.get('category'))
        if name=='keto_propose_change':return svc.propose(sub,args['event_type'],args['payload'],args['expected_revision'],kind)
        if name=='keto_apply_proposal':return svc.apply(sub,args['proposal_id'],args['expected_revision'],args['approved'],kind)
        if name=='keto_consent':return svc.consent(sub,args['processing'],args['storage'],args['health'],args['confirmed'],kind)
        if name=='keto_menu':return svc.menu(sub,args['start'],args['days'],kind)
        if name=='keto_kitchen':return svc.kitchen(sub,kind=kind,**args)
        if name=='keto_guidance':return svc.guidance(sub,kind=kind,**args)
        if name=='keto_topics':return svc.topics(sub,kind=kind,**args)
        if name=='keto_reminders':return svc.reminders(sub,kind=kind,**args)
        if name=='keto_transcribe':return svc.transcribe(sub,kind=kind,**args)
        if name=='keto_export':return svc.export(sub,args['format'],kind)
        if name=='keto_import_menu':return svc.import_menu(sub,args['content'],args['format'],args['expected_revision'],kind)
        if name=='keto_settings_read':
            d,_=svc.load(sub,kind);titles={'theme':'Тема','text_size':'Размер текста','density':'Плотность карточек','simple_mode':'Простой режим','home':'Начальный раздел','show_nutrition':'Показывать состав'}
            props={a:dict({'type':'boolean'} if isinstance(v[0],bool) else {'type':'string','enum':list(v)},title=titles[a]) for a,v in UI_ALLOWED.items()}
            return {'schema':{'type':'object','properties':props},'values':d['ui'],'layout':[{'kind':'group','title':'Оформление','items':[{'kind':'property','property':a} for a in props]}]}
        if name=='keto_settings_update':
            d,_=svc.load(sub,kind);p=svc.propose(sub,'ui',args['set'],d['revision'],kind)['proposal'];result=svc.apply(sub,p['id'],d['revision'],True,kind)
            return {'values':result['state']['ui']}
        raise InputError('Инструмент не реализован')
    app.state.invoke=invoke
    async def read_bounded_body(req:Request,limit:int=1_700_000,message:str='Слишком большой запрос')->bytes:
        pieces=[];size=0
        async for chunk in req.stream():
            size+=len(chunk)
            if size>limit:raise HTTPException(413,message)
            pieces.append(chunk)
        return b''.join(pieces)
    @app.post('/api/tools/{name}')
    async def tool_route(name:str,req:Request):
        r=identity(req,True)
        raw=await read_bounded_body(req,1_700_000,'Слишком большой запрос')
        try:args=json.loads(raw)
        except ValueError:raise HTTPException(400,'Неверный JSON')
        result=await run_in_threadpool(invoke,r,name,args)
        if name=='keto_transcribe' and result.get('error_code'):return JSONResponse(result,status_code=422)
        return result
    @app.get('/mcp',operation_id='mcp_stream_not_offered_get')
    @app.delete('/mcp',operation_id='mcp_stream_not_offered_delete')
    def stream_not_offered():return Response(status_code=405,headers={'Allow':'POST'})
    @app.post('/mcp')
    async def mcp(req:Request):
        r=mcp_identity(req)
        if not req.headers.get('authorization','').startswith('Bearer '):raise HTTPException(401,'Для MCP нужен отдельный код подключения')
        if bridge:
            accepts=req.headers.get('accept','')
            if 'application/json' not in accepts or 'text/event-stream' not in accepts:return JSONResponse({'jsonrpc':'2.0','id':None,'error':{'code':-32000,'message':'Not Acceptable'}},status_code=406)
            if req.headers.get('content-type','').split(';')[0].strip().lower()!='application/json':return JSONResponse({'jsonrpc':'2.0','id':None,'error':{'code':-32000,'message':'Unsupported Media Type'}},status_code=415)
        protocol=req.headers.get('mcp-protocol-version')
        if protocol and protocol not in ('2025-03-26','2025-06-18','2025-11-25'):raise HTTPException(400,'Unsupported MCP version')
        raw=await read_bounded_body(req,1_700_000,'Payload too large')
        try:j=json.loads(raw)
        except ValueError:return JSONResponse({'jsonrpc':'2.0','id':None,'error':{'code':-32700,'message':'Parse error'}},status_code=400)
        if not isinstance(j,dict) or j.get('jsonrpc')!='2.0' or not isinstance(j.get('method'),str):return JSONResponse({'jsonrpc':'2.0','id':None,'error':{'code':-32600,'message':'Invalid request'}},status_code=400)
        method=j['method'];params=j.get('params',{})
        if not isinstance(params,dict):return JSONResponse({'jsonrpc':'2.0','id':j.get('id'),'error':{'code':-32602,'message':'Invalid params'}},status_code=400)
        if 'id' not in j:
            return Response(status_code=202) if method.startswith('notifications/') else Response(status_code=400)
        def result(value):return {'jsonrpc':'2.0','id':j['id'],'result':value}
        if method=='initialize':
            requested=params.get('protocolVersion');pv=requested if requested in ('2025-03-26','2025-06-18','2025-11-25') else '2025-11-25'
            return result({'protocolVersion':pv,'serverInfo':{'name':'keto-companion-azure','version':VERSION},'capabilities':{'tools':{},'resources':{},'experimental':{'openai/settings':{'readTool':'keto_settings_read','updateTool':'keto_settings_update'}}},'instructions':'Use keto_open for the interface. Never invent calculated nutrients or saved changes. Consent and confirmation are app-only controls. Azure processing is explicit and bounded.'})
        if method=='ping':return result({})
        if method=='tools/list':return result({'tools':[t for t in TOOLS if t['name'] not in MOBILE_HTTP_TOOLS]})
        if method=='resources/list':return result({'resources':[{'uri':RESOURCE,'name':'KETO Companion','mimeType':'text/html;profile=mcp-app'}]})
        if method=='resources/read':
            if params.get('uri')!=RESOURCE:return {'jsonrpc':'2.0','id':j['id'],'error':{'code':-32602,'message':'Unknown resource'}}
            html_text=(HERE/'static/index.html').read_text()
            # Self-contained resource: no credentials or remote asset dependencies.
            css=(HERE/'static/style.css').read_text();js=(HERE/'static/app.bundle.js').read_text()
            html_text=html_text.replace('<link rel="stylesheet" href="/static/style.css">','<style>'+css+'</style>').replace('<script type="module" src="/static/app.bundle.js"></script>','<script type="module">'+js.replace('</script','<\\/script')+'</script>')
            return result({'contents':[{'uri':RESOURCE,'mimeType':'text/html;profile=mcp-app','text':html_text,'_meta':{'ui':{'csp':{'connectDomains':[],'resourceDomains':[]}},'openai/ui':{'availableDisplayModes':['inline','fullscreen'],'preferredDisplayMode':'fullscreen'}}}]})
        if method=='tools/call':
            if params.get('name') in MOBILE_HTTP_TOOLS:return result({'content':[{'type':'text','text':'This operation is available only through the authenticated application UI.'}],'isError':True})
            try:
                value=await run_in_threadpool(invoke,r,params.get('name'),params.get('arguments',{}))
                ui_confirmation=value.pop('_ui_confirmation',None)
                out={'content':[{'type':'text','text':json.dumps(value,ensure_ascii=False)}],'structuredContent':value,'isError':False}
                if ui_confirmation:out['_meta']={'keto/uiConfirmation':ui_confirmation}
                return result(out)
            except (InputError,k.KetoError,Conflict,ValueError) as e:return result({'content':[{'type':'text','text':str(e)}],'isError':True})
            except Exception:return result({'content':[{'type':'text','text':'Сервис временно недоступен. Не считайте действие выполненным.'}],'isError':True})
        return {'jsonrpc':'2.0','id':j['id'],'error':{'code':-32601,'message':'Method not found'}}
    app.mount('/static',StaticFiles(directory=HERE/'static'),name='static')
    return app
app=create_app()
