"""Application service: explicit proposals, versioned writes, deterministic tools."""
from __future__ import annotations
import copy, hashlib, html, json, os, re, sys, time, uuid
from datetime import datetime,timezone,date
from pathlib import Path
from zoneinfo import ZoneInfo
from .store import Conflict
from .brain import BrainUnavailable
from .mobile import MobileService,mobile_init,compact_topics,topic
from . import planning
from .kitchen import KitchenService, init as kitchen_init, invalidate as kitchen_invalidate
from .recipe_brain import RecipeDesigner
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'library/skills/keto-companion/scripts'))
import keto_core as k

VERSION='0.2.1'
UI_DEFAULT={'theme':'ivory-plum','text_size':'normal','density':'comfortable','simple_mode':False,'home':'chat','show_nutrition':True}
UI_ALLOWED={'theme':('ivory-plum','light','dark'),'text_size':('normal','large'),'density':('comfortable','compact'),'simple_mode':(True,False),'home':('chat','today','recipes','diary'),'show_nutrition':(True,False)}
EVENTS={'consent.set','profile.update','targets.update','diary.add','diary.update','diary.delete','feedback.add','checklist.set','settings.update','settings.rollback','catalog.food.add','catalog.recipe.add','plan.accept'}
HELP=('Я помогу подобрать еду под ваш день, составить покупки и вести дневник — без строгих команд. '
 'Сначала познакомимся и уточним ограничения. Затем вы сможете попросить меню, заменить блюдо или сказать, что было неудобно. '
 'Изменения показываются отдельно: вы подтверждаете их или отменяете. '
 'В разделе «Рецепты» — блюда с граммовками; в «Дневнике» — ваши записи; в «Настройках» — оформление и время на готовку. '
 'Google автоматически не подключён и двусторонняя синхронизация не настроена; доступны собственные выгрузки. В веб-приложении диктовка создаёт редактируемый черновик; сообщение отправляете вы. '
 'С чего удобнее начать: посмотреть блюда или познакомиться?')
CONSENT_TEXT=('Это ваш личный помощник по питанию, не врач. Для персонального общения запросы обрабатывает модель в Azure. '
 'Дневник и профиль сохраняются только с вашего согласия в приватном пространстве приложения. '
 'Можно сначала изучить рецепты без личных данных. Фото, Google и напоминания подключаются отдельно.')
class InputError(ValueError):pass
class PermissionError(InputError):pass

def ui_valid(values):
    if not isinstance(values,dict) or not values or set(values)-set(UI_ALLOWED):raise InputError('Неизвестная настройка интерфейса')
    for a,v in values.items():
        opts=UI_ALLOWED[a]
        if isinstance(opts[0],bool):
            if type(v) is not bool:raise InputError('Нужен переключатель да/нет')
        elif v not in opts:raise InputError('Неизвестное значение настройки')
    return values

def text(value,limit=4000):
    return k.clean_text(value,'текст',limit)

def new_document(subject,kind='personal'):
    return {'schema':2,'revision':0,'core':k.new_state(subject,subject,demo=kind=='demo'),
        'ui':copy.deepcopy(UI_DEFAULT),'ui_history':[],'pending':{},'receipts':{},'processing_consent':False,
        'chat':[],'requests':{},'holds':[],'feature_requests':[],'usage':{},'created_at':k.utc_now()}

def storage_consent(doc):
    c=doc['core']['profile']['consent'];return c['storage'] and c['health_data']

def literal_guard(message):
    """Conservative fast-path, not a medical classifier; does not clear existing flags."""
    t=message.casefold()
    own=bool(re.search(r'\b(я|мне|у меня|принимаю|пью|беременна|кормлю)\b',t))
    if not own and not re.search(r'^(не могу дышать|задыхаюсь|теряю сознание)',t.strip()):return None
    if re.search(r'\b(принимаю|пью|на препарате|на)\s+(форсиг\w*|джардинс\w*|дапаглифлозин\w*|эмпаглифлозин\w*)',t) and not re.search(r'\bне\s+(принимаю|пью)\b',t):return 'medication_review'
    if re.search(r'\bя\s+беременна\b',t):return 'pregnancy'
    if re.search(r'(сильная боль в груди|сильно болит грудь|задыхаюсь|теряю сознание|не могу дышать|непрекращающаяся рвота)',t) and not re.search(r'(что делать если|если бы|нет сильной|не задыхаюсь|это цитата)',t):return 'urgent'
    return None

class Service(KitchenService,MobileService,planning.PlanningService):
    def __init__(self,store,brain,transcriber=None,recipe_designer=None):self.store=store;self.brain=brain;self.transcriber=transcriber;self.recipe_designer=recipe_designer or RecipeDesigner();self.base=k.load_catalog(ROOT/'library/skills/keto-menu/data')
    def load(self,subject,kind='personal'):
        d,v=self.store.read(subject)
        if d is None:d=new_document(subject,kind)
        if d['core']['owner_account_id']!=subject or d['core']['subject_id']!=subject:raise PermissionError('Профиль другого пользователя')
        mobile_init(d);kitchen_init(d)
        return d,v
    def save(self,subject,d,v):
        compact_topics(d)
        if len(k.canonical(d).encode())>1400000:raise InputError('Личное состояние слишком велико; экспортируйте и удалите ненужные записи')
        return self.store.write(subject,d,v)
    def snapshot(self,d):
        mobile_init(d)
        p=d['core']['profile'];screen=k.screen_profile(p)
        return {'version':VERSION,'revision':d['revision'],'subject_kind':p['subject_kind'],'profile':p,'ui':d['ui'],
          'processing_consent':d['processing_consent'],'screening':screen,'holds':d['holds'],
          'diary':d['core']['diary'][-60:],'plans':list(d['core']['plans'].values())[-8:],
          'checklists':d['core']['checklists'],'pending':[dict(x,expired=x['expires_at']<=time.time()) for x in d['pending'].values()],
          'chat':topic(d,d['active_thread'])['messages'][-60:],'active_thread':d['active_thread'],'topics':[{'id':t['id'],'title':t['title'],'messages':len(t['messages'])} for t in d['topics'].values()],'reminders':copy.deepcopy(d['reminders']),'guidance':planning.status(d,k),'kitchen':self.kitchen_snapshot(d),'mobile_version':'0.7.0-dev-media-pilot','ui_history':d['ui_history'][-8:],'catalog':{'foods':len(self.base['foods']),'recipes':len(self.base['recipes'])},
          'capabilities':{'model':'Azure GPT-6.1 Terra','native_voice':'No continuous voice in web app; dictation to editable draft',
          'storage':getattr(self.store,'storage_scope','Azure private Blob' if os.getenv('KETO_STORAGE_URL') else 'local SQLite'),
          'google_sync':'Google sign-in does not grant Drive/Gmail/Calendar access; PDF/ICS manual export only',
          'background_monitoring':False,'self_modification':'validated preferences only, never arbitrary code'},'usage':d['usage']}
    def opened(self,subject,kind='personal'):
        d,_=self.load(subject,kind);return {'state':self.snapshot(d),'message':HELP,**({'shopping':self.kitchen_shopping(d,list(d['core']['plans'].values())[-1])} if d['core']['plans'] else {})}
    def consent(self,subject,processing,storage,health,confirmed,kind='personal'):
        if confirmed is not True:raise PermissionError('Нужно согласие самой пользовательницы')
        for x in (processing,storage,health):
            if type(x) is not bool:raise InputError('Неверное согласие')
        d,v=self.load(subject,kind)
        event={'event_id':'consent_'+uuid.uuid4().hex,'type':'consent.set','payload':{'storage':storage,'health_data':health},'confirmed':True}
        d['core']=k.apply_event(d['core'],event,d['core']['state_revision'],subject,self.base)
        d['processing_consent']=processing;d['revision']+=1
        if not storage or not health or not processing:
            d['chat']=[];d['pending']={};d['requests']={};d['audio_requests']={}
            for t in d['topics'].values():t['messages']=[];t['choices']=[]
        self.save(subject,d,v)
        return {'message':'Согласие обновлено. Напишите, что удобно готовить и есть ли известные ограничения.','state':self.snapshot(d)}
    def delete_profile(self,subject,expected_revision,confirmation,kind='personal'):
        if confirmation!='DELETE_MY_PROFILE':raise InputError('Удаление требует явного подтверждения')
        d,v=self.load(subject,kind)
        if d['revision']!=expected_revision:raise Conflict('Устаревшая версия профиля')
        if v is not None:self.store.delete(subject,v)
        return {'message':'Активный профиль удалён. Для нового профиля потребуется новое согласие. Сроки удаления из резервных копий зависят от политики хранилища.','state':self.snapshot(new_document(subject,kind))}
    def catalog(self,subject,query='',limit=12,kind='personal',include_food_ids=None,exclude_food_ids=None,max_minutes=None):
        d,_=self.load(subject,kind);cat=k.merge_personal_catalog(self.base,d['core']);p=d['core']['profile']
        if include_food_ids is None and exclude_food_ids is None and query:
            inferred=self.recipe_filters(query,{},d);include_food_ids=inferred['include_food_ids'];exclude_food_ids=inferred['exclude_food_ids'];max_minutes=max_minutes if max_minutes is not None else inferred['max_minutes']
            if include_food_ids or exclude_food_ids:query=''
        query=text(query,200).casefold();tokens=[x for x in re.split(r'\W+',query) if len(x)>2]
        included=set(include_food_ids or []);excluded=set(exclude_food_ids or [])|set(p['settings'].get('disliked_food_ids',[]))
        if (included|excluded)-set(cat['foods']):raise InputError('Неизвестный продукт фильтра')
        if max_minutes is not None:max_minutes=k.integer(max_minutes,'max_minutes',1,180)
        candidates=[]
        for r in cat['recipes'].values():
            c=k.calculate_recipe(cat,r['recipe_id']);issues=k.check_recipe(p,c)
            ids={i['food_id'] for i in c['ingredients']}
            if issues or not included<=ids or ids&excluded or (max_minutes is not None and c['active_minutes']>max_minutes):continue
            hay=(r['name_ru']+' '+' '.join(x['name_ru'] for x in c['ingredients'])).casefold()
            score=sum(1 for t in tokens if t[:max(3,len(t)-2)] in hay)
            if tokens and not score and not included:continue
            candidates.append((score,c))
        candidates.sort(key=lambda x:(-x[0],x[1]['active_minutes'],x[1]['recipe_id']))
        return {'recipes':[c for _,c in candidates[:max(1,min(int(limit),72))]],'personalized':k.screen_profile(p)['can_plan'] and not d['holds'],
          'note':'Справочные рецепты. Подбор не является медицинским назначением; состав рассчитан по ингредиентам.'}
    def _prepare(self,d,event_type,payload):
        if not storage_consent(d):raise PermissionError('Сначала согласие на сохранение профиля и дневника')
        if event_type=='plan.accept':planning.ensure_current(d)
        if event_type=='plan.accept' and d['holds']:raise k.SafetyError('Сохранение меню приостановлено из-за нового ограничения')
        if event_type.startswith('kitchen.'):
            self.kitchen_validate_change(d,event_type[8:],payload)
        elif event_type=='guidance.setup':
            planning.canonical_setup_valid(payload,k)
        elif event_type=='guidance.targets':
            current=planning.preview(d,k)
            if set(payload)!={'preview_hash','candidate','before'} or payload.get('before')!=d['core']['profile'].get('targets'):raise Conflict('Сохранённые ориентиры изменились')
            if not current['candidate'] or payload.get('preview_hash')!=current.get('preview_hash') or payload.get('candidate')!=current['candidate']:raise Conflict('Ориентиры устарели или изменены. Пересчитайте.')
        elif event_type=='configuration':
            if not isinstance(payload,dict) or set(payload)!={'ui','settings'}:raise InputError('Неверная конфигурация')
            if payload['ui']:ui_valid(payload['ui'])
            if payload['settings']:k.validate_settings(dict(d['core']['profile']['settings'],**payload['settings']),k.merge_personal_catalog(self.base,d['core']))
            if not payload['ui'] and not payload['settings']:raise InputError('Нет изменений')
        elif event_type=='ui':ui_valid(payload)
        elif event_type=='ui.rollback':
            if set(payload)!={'history_id'} or not any(x['id']==payload['history_id'] for x in d['ui_history']):raise InputError('Изменение не найдено')
        elif event_type=='feature.request':
            if set(payload)!={'description'}:raise InputError('Неверное предложение')
            text(payload['description'],1500)
        elif event_type in EVENTS:
            if event_type=='targets.update':
                targets=k.validate_targets(payload);floor=1500 if d['core']['profile'].get('baseline',{}).get('equation_category')=='male' else 1200
                if targets['energy_min_kcal']<floor:raise InputError('Нижняя граница ниже продуктового предела; нужен индивидуальный разбор')
            if event_type=='consent.set':raise InputError('Согласие изменяется отдельным действием')
            if event_type=='profile.update' and payload.get('medications'):
                # Language-model classification cannot silently confer clinician review.
                for m in payload['medications']:
                    if m.get('class')=='reviewed_other' and not m.get('review_source'):raise InputError('Нужно проверенное основание классификации лекарства')
            cat=k.merge_personal_catalog(self.base,d['core'])
            if event_type=='catalog.recipe.add':
                if d['core']['profile']['screening'].get('allergies_reviewed') is not True:raise k.SafetyError('Сначала проверьте пищевые аллергии в анкете')
                recipe=k.validate_custom_recipe(payload,cat);calc=k.calculate_ingredients(recipe['ingredients'],cat['foods'])
                if k.check_recipe(d['core']['profile'],calc):raise k.SafetyError('Состав не прошёл проверку ограничений или нутриентов')
            k.apply_event(d['core'],{'event_id':'preview_'+uuid.uuid4().hex,'type':event_type,'payload':payload,'confirmed':True},d['core']['state_revision'],d['core']['owner_account_id'],cat)
        else:raise InputError('Такое действие не поддерживается. Самостоятельное изменение кода запрещено.')
        pid=uuid.uuid4().hex
        proposal={'id':pid,'type':event_type,'payload':payload,'base_revision':d['revision'],'expires_at':time.time()+1800,'status':'pending'}
        d['pending']={a:b for a,b in d['pending'].items() if b['expires_at']>time.time() or b['type']=='profile.update'}
        if len(d['pending'])>=12:raise InputError('Сначала подтвердите или отклоните предыдущие изменения')
        if event_type.startswith('kitchen.'):
            preview=self.kitchen_proposal_preview(d,event_type[8:],payload)
            if preview:proposal['preview']=preview
        d['pending'][pid]=proposal;return proposal
    def propose(self,subject,event_type,payload,expected_revision,kind='personal'):
        d,v=self.load(subject,kind)
        if expected_revision!=d['revision']:raise Conflict('Устаревший экран')
        p=self._prepare(d,event_type,payload);self.save(subject,d,v)
        return {'message':'Изменение подготовлено, но ещё не применено.','proposal':p,'state':self.snapshot(d)}
    def apply(self,subject,proposal_id,expected_revision,approved,kind='personal'):
        d,v=self.load(subject,kind)
        if proposal_id in d['receipts']:return {'message':'Это действие уже обработано; повтор не создан.','receipt':d['receipts'][proposal_id],'state':self.snapshot(d)}
        p=d['pending'].get(proposal_id)
        if not p:raise InputError('Предложение отсутствует')
        if approved is True and p['expires_at']<=time.time():raise InputError('Предложение истекло; отмените и подготовьте заново')
        if approved is not True:
            d['pending'].pop(proposal_id);self.save(subject,d,v);return {'message':'Изменение отменено.','state':self.snapshot(d)}
        if expected_revision!=d['revision'] or p['base_revision']!=d['revision']:raise Conflict('Профиль изменился. Подготовьте предложение заново.')
        self._validate_on_apply(d,p)
        previous_plans=copy.deepcopy(d['core']['plans'])
        if p['type'].startswith('kitchen.'):
            self.kitchen_apply_change(d,p['type'][8:],p['payload'],proposal_id)
        elif p['type']=='guidance.setup':
            value=planning.canonical_setup_valid(p['payload'],k);d['guidance_choices']=value.pop('choices');d['core']=k.apply_event(d['core'],{'event_id':'event_'+proposal_id,'type':'profile.update','payload':value,'confirmed':True},d['core']['state_revision'],subject,k.merge_personal_catalog(self.base,d['core']))
        elif p['type']=='guidance.targets':
            current=planning.preview(d,k);targets=dict(current['candidate'],status='agreed',agreed_at=k.utc_now(),basis_note='starter-v1; подтверждено пользователем; не назначение и не согласование специалистом')
            d['core']=k.apply_event(d['core'],{'event_id':'event_'+proposal_id,'type':'targets.update','payload':targets,'confirmed':True},d['core']['state_revision'],subject,k.merge_personal_catalog(self.base,d['core']))
            d['targets_provenance']={'source':'starter_policy','policy_version':planning.POLICY,'fingerprint':planning.fingerprint(d),'source_ids':current['source_ids'],'weight_kg':d['core']['profile']['baseline']['weight_kg'],'applied_at':k.utc_now(),'candidate':current['candidate']}
        elif p['type']=='configuration':
            old=copy.deepcopy(d['ui']);d['ui'].update(p['payload']['ui'])
            if p['payload']['settings']:
                event={'event_id':'event_'+proposal_id,'type':'settings.update','payload':p['payload']['settings'],'confirmed':True}
                d['core']=k.apply_event(d['core'],event,d['core']['state_revision'],subject,k.merge_personal_catalog(self.base,d['core']))
            if p['payload']['ui']:d['ui_history'].append({'id':proposal_id,'before':old,'after':copy.deepcopy(d['ui']),'at':k.utc_now()})
        elif p['type']=='ui':
            old=copy.deepcopy(d['ui']);d['ui'].update(p['payload']);d['ui_history'].append({'id':proposal_id,'before':old,'after':copy.deepcopy(d['ui']),'at':k.utc_now()})
        elif p['type']=='ui.rollback':
            history=next(x for x in d['ui_history'] if x['id']==p['payload']['history_id']);old=copy.deepcopy(d['ui']);d['ui']=copy.deepcopy(history['before']);d['ui_history'].append({'id':proposal_id,'before':old,'after':copy.deepcopy(d['ui']),'at':k.utc_now()})
        elif p['type']=='feature.request':d['feature_requests'].append({'id':proposal_id,'description':p['payload']['description'],'status':'awaiting_developer_review'})
        else:
            event={'event_id':'event_'+proposal_id,'type':p['type'],'payload':p['payload'],'confirmed':True}
            cat=k.merge_personal_catalog(self.base,d['core']);d['core']=k.apply_event(d['core'],event,d['core']['state_revision'],subject,cat)
        if p['type'] in ('profile.update','settings.update','settings.rollback','configuration','targets.update','guidance.setup','guidance.targets'):kitchen_invalidate(d)
        if p['type']=='targets.update':d['targets_provenance']={'source':'manual','label':'изменено пользователем','applied_at':k.utc_now()}
        if p['type']=='profile.update' and set(p['payload'])<={'display_name'}:
            for pid,old in previous_plans.items():
                if old.get('status')=='user_accepted':d['core']['plans'][pid].update(status='user_accepted',profile_hash=k.digest(d['core']['profile']),profile_revision=d['core']['profile']['profile_revision'])
        d['ui_history']=d['ui_history'][-30:];d['revision']+=1;d['pending'].pop(proposal_id)
        receipt={'id':proposal_id,'type':p['type'],'revision':d['revision'],'at':k.utc_now()};d['receipts'][proposal_id]=receipt
        d['receipts']=dict(list(d['receipts'].items())[-120:]);self.save(subject,d,v)
        return {'message':'Изменение сохранено.' if p['type']!='feature.request' else 'Пожелание записано для разработчика. Функция ещё не реализована.','receipt':receipt,'state':self.snapshot(d)}
    def _validate_on_apply(self,d,p):
        clone=copy.deepcopy(d);clone['pending']={};self._prepare(clone,p['type'],p['payload'])
    def menu(self,subject,start,days,kind='personal'):
        d,v=self.load(subject,kind);planning.ensure_current(d)
        if any(p['expires_at']>time.time() and p['type']=='profile.update' and any(key in p['payload'] for key in ('allergies','medications','screening')) for p in d['pending'].values()):raise k.SafetyError('Сначала подтвердите или уточните новые ограничения профиля')
        if d['holds']:raise k.SafetyError('Персональное планирование приостановлено: нужен разбор отмеченных ограничений')
        if not storage_consent(d):raise PermissionError('Нет согласия на персональное планирование')
        days=k.integer(days,'days',1,7);date.fromisoformat(start)
        cat=k.merge_personal_catalog(self.base,d['core'])
        try:plan=k.suggest_plan(cat,d['core']['profile'],start,days=days,feedback=d['core']['feedback'],attempts=1500)
        except k.KetoError:
            if d.get('targets_provenance',{}).get('source')!='starter_policy':raise
            from .portion_search import fit_plan
            plan=fit_plan(k,cat,d['core']['profile'],start,days=days)
            if plan:return {'plan':plan,'shopping':k.shopping_list(plan),'message':'Расчётный черновик с индивидуальными порциями блюд. Все ограничения сохранены; меню ещё не выбрано.'}
            return {'plan':None,'shopping':[],'reference_only':True,'open_view':'recipes','constraints':dict({key:value for key,value in d['core']['profile']['targets'].items() if key not in ('status','agreed_at','basis_note')},max_active_minutes=d['core']['profile']['settings']['max_active_minutes']),'message':'Поиск в текущем каталоге не дал меню с этими энергией, белком, углеводами, клетчаткой, качеством жиров и временем готовки. Это не доказательство невозможности рациона. Ограничения не ослаблены; можно продолжить со справочными рецептами или уточнить индивидуальный план.'}
        return {'plan':plan,'shopping':k.shopping_list(plan),'message':'Расчётный черновик. Он ещё не сохранён как выбранное меню.'}
    def export(self,subject,format='json',kind='personal'):
        d,_=self.load(subject,kind)
        if d['revision']==0:raise PermissionError('Нет сохранённого личного состояния')
        if format!='json':planning.ensure_current(d)
        if format=='json':return {'filename':'keto-personal-export.json','mime':'application/json','text':json.dumps({'schema':'keto-personal-export-v2','created_at':k.utc_now(),'core':d['core'],'ui':d['ui'],'kitchen':d.get('kitchen',{}),'topics':d['topics']},ensure_ascii=False,indent=2)}
        plans=list(d['core']['plans'].values())
        if not plans:raise InputError('Сначала выберите и сохраните меню')
        if d['holds'] or plans[-1].get('status')!='user_accepted' or plans[-1].get('profile_hash')!=k.digest(d['core']['profile']):raise k.SafetyError('Меню устарело или заблокировано; сначала пересчёт. Личную копию JSON можно получить.')
        if format=='pdf':
            from .mobile_exports import menu_pdf
            return menu_pdf(plans[-1],self.kitchen_shopping(d,plans[-1]),ROOT)
        if format=='csv':return {'filename':'keto-menu.csv','mime':'text/csv;charset=utf-8','text':k.export_plan_csv(plans[-1])}
        if format=='html':
            plan=plans[-1];rows=[]
            for day in plan['days']:
                rows.append('<h2>'+html.escape(day['date'])+'</h2>')
                for meal in day['meals']:
                    rows.append('<h3>'+html.escape(meal['name_ru'])+'</h3><ul>')
                    rows.extend('<li>'+html.escape(i['name_ru'])+' — '+str(round(i['grams_edible'],1))+' г</li>' for i in meal['ingredients'])
                    rows.append('</ul>')
            body='<!doctype html><html lang="ru"><meta charset="utf-8"><title>Моё меню</title><style>body{font:17px/1.6 system-ui;max-width:850px;margin:40px auto;padding:24px;color:#342d37}h1,h2{color:#6b4265}h2{break-before:auto}li{margin:4px 0}@media print{body{margin:0}}</style><h1>Моё меню · KETO Companion</h1><p>Сохранённая расчётная версия, не медицинское назначение. Граммы съедобной части; состояние продуктов смотрите в карточке рецепта.</p>'+''.join(rows)+'</html>'
            return {'filename':'keto-menu.html','mime':'text/html;charset=utf-8','text':body}
        raise InputError('Поддерживается PDF, JSON, CSV и печатный HTML')
    def import_menu(self,subject,content,format,expected_revision,kind='personal'):
        if len(content.encode())>150000:raise InputError('Файл меню слишком большой')
        d,_=self.load(subject,kind);cat=k.merge_personal_catalog(self.base,d['core'])
        if d['holds']:raise k.SafetyError('Импорт не обходит ограничения безопасности')
        if format=='json':plan=k.import_plan_json(content,cat,d['core']['profile'])
        elif format=='csv':plan=k.import_plan_csv(content,cat,d['core']['profile'])
        else:raise InputError('Нужен CSV или JSON меню')
        return self.propose(subject,'plan.accept',plan,expected_revision,kind)
    def chat(self,subject,message,request_id,kind='personal',image=None,source=None,thread_id=None):
        reservation={}
        try:
            if image is None and source is None and isinstance(message,str) and not literal_guard(message):
                result=self.kitchen_chat(subject,message,request_id,kind,thread_id)
                if result is not None:return result
            return self._chat(subject,message,request_id,kind,image,reservation,source,thread_id)
        except (InputError,k.KetoError,ValueError,Conflict):
            if reservation:
                # Only the caller that committed this reservation may mark it failed.
                for _ in range(3):
                    d,v=self.load(subject,kind)
                    request=d.get('requests',{}).get(request_id)
                    if not request or request.get('status')!='pending' or request.get('hash')!=reservation['hash']:break
                    request['status']='failed'
                    try:self.save(subject,d,v);break
                    except Conflict:continue
            raise
    def _chat(self,subject,message,request_id,kind='personal',image=None,reservation=None,source=None,thread_id=None):
        chat_started=time.monotonic()
        message=text(message,6000);request_id=text(request_id,100)
        if not re.fullmatch(r'[A-Za-z0-9_-]{8,100}',request_id):raise InputError('Неверный request_id')
        if literal_guard(message)=='urgent':
            reply='При таких выраженных симптомах нужна срочная медицинская помощь. Не ждите ответа чата и не объясняйте это адаптацией к кето. Обратитесь в местную экстренную службу.'
            result={'message':reply,'safety_hold':['urgent'],'intent':'safety','model_called':False}
            try:
                d,v=self.load(subject,kind)
                if storage_consent(d):
                    d['holds']=sorted(set(d['holds'])|{'urgent'});d['revision']+=1
                    for plan in d['core']['plans'].values():plan['status']='blocked_safety_review'
                    self.save(subject,d,v)
                result['state']=self.snapshot(d)
            except Exception:
                # An urgent message must survive a storage/network failure; do not claim the hold was saved.
                result['persistence_error']=True
                result['message']+=' Ограничение не удалось сохранить; не используйте прежнее меню.'
            return result
        d,v=self.load(subject,kind)
        if not d['processing_consent']:
            return {'message':CONSENT_TEXT,'requires_consent':True,'state':self.snapshot(d),'model_called':False}
        if not storage_consent(d):return {'message':'Для ведения личного диалога нужно согласие на сохранение профиля и дневника. Каталог рецептов доступен отдельно.','state':self.snapshot(d),'model_called':False}
        tid=thread_id or 'main';topic(d,tid);d['active_thread']=tid
        request_material=message+'|'+(image or '')
        if tid!='main':request_material+='|thread:'+tid
        if source is not None:request_material+='|'+json.dumps(source,ensure_ascii=False,sort_keys=True,separators=(',',':'))
        request_hash=hashlib.sha256(request_material.encode()).hexdigest()
        requests=d.setdefault('requests',{})
        existing=requests.get(request_id)
        if existing:
            if existing['hash']!=request_hash:raise Conflict('request_id повторно использован с другим содержимым')
            if existing['status']=='pending':raise Conflict('Этот запрос уже обрабатывается. Обновите экран.')
            if existing['status']=='completed':return {'message':existing['reply'],'state':self.snapshot(d),'replayed':True,'model_called':False}
            raise Conflict('Запрос не завершился. Повторите с новым request_id.')
        today=datetime.now(timezone.utc).date().isoformat();u=d['usage']
        previous=next((x for x in topic(d,tid)['messages'] if x.get('request_id')==request_id and x['role']=='assistant'),None)
        if previous:
            if previous.get('request_hash')!=request_hash:raise Conflict('request_id повторно использован с другим текстом')
            return {'message':previous['text'],'state':self.snapshot(d),'replayed':True,'model_called':False}
        if u.get('day')!=today:u.clear();u.update(day=today,calls=0,input_tokens=0,output_tokens=0)
        literal=literal_guard(message)
        local_guidance=not literal and bool(re.search(r'сколько.*калор|рассчитай|рассчитайте',message.casefold()))
        if not literal and not local_guidance and u['calls']>=int(os.getenv('KETO_DAILY_REQUEST_LIMIT','60')):raise InputError('Дневной лимит Azure достигнут. Дневник, каталог и настройки продолжают работать.')
        # Count only possible model calls; local safety responses do not spend the model quota.
        if not literal and not local_guidance:u['calls']+=1
        requests[request_id]={'hash':request_hash,'status':'pending','at':time.time(),'thread_id':tid}
        d['requests']=dict(list(requests.items())[-150:])
        v=self.save(subject,d,v)
        reservation['hash']=request_hash
        if local_guidance:
            parsed={'intent':'guidance' if re.search(r'калор|рассчита',message.casefold()) else 'setup_help','safety_signals':[]};called=False
        elif literal:
            parsed={'intent':'safety','safety_signals':[literal],'reply_ru':'','changes':[],'query':'','days':1,'diary_note':''};called=False
        else:
            ctx={'screening':k.screen_profile(d['core']['profile']),'holds':d['holds'],'ui':d['ui'],
                'settings':d['core']['profile']['settings'],'screening_fields':list(k.SCREEN_FIELDS),'confirmed_preferences':{'allergies':d['core']['profile']['allergies'],'goal':d['core']['profile'].get('goal')},'food_catalog':[{'id':f['food_id'],'name':f['name_ru']} for f in k.merge_personal_catalog(self.base,d['core'])['foods'].values()],'recipe_choices':topic(d,tid).get('choices',[]),'recent_chat':[{'role':x['role'],'text':x['text'][:700]} for x in self.kitchen_recent_chat(d,tid)],
                'capabilities':{'saved_diary':True,'google_connected':False,'dictation':'speech is transcribed into an editable draft, not auto-sent','topics':True,'pdf_export':True,'calendar_ics_export':True,'native_live_voice':False,'code_self_modification':False}}
            ctx.update(self.kitchen_context(d,message,tid))
            if source is not None:ctx['untrusted_source']=source
            try:parsed=self.brain.infer(message,ctx,image);called=True
            except BrainUnavailable:
                latest,version=self.load(subject,kind)
                if request_id in latest.get('requests',{}):
                    latest['requests'][request_id]['status']='failed';self.save(subject,latest,version)
                return {'message':'Сейчас Azure не ответила или ответ не прошёл проверку. Ничего не изменено. Каталог, дневник и настройки доступны через кнопки.','state':self.snapshot(d),'model_called':True,'error_code':'MODEL_UNAVAILABLE'}
        # Re-read after inference: do not overwrite other tabs/devices or confirmation changes.
        d,v=self.load(subject,kind)
        if not d['processing_consent'] or not storage_consent(d):
            return {'message':'Согласие изменено. Ответ не сохранён и изменения не подготовлены.','state':self.snapshot(d),'model_called':called}
        topic(d,tid);d['active_thread']=tid
        reply='';extra={};intent=parsed['intent'];signals=set(parsed.get('safety_signals',[]))-{'none'}
        if source is not None and not signals and intent in ('onboarding','preferences','diary','feature_request'):
            intent='other';parsed['reply_ru']='Источник можно обсудить, но он не меняет ваш профиль и настройки. Для записи или изменения используйте соответствующий раздел.'
        if not signals and topic(d,tid).get('choices') and re.search(r'второй|вторую|вариант\s*2',message.casefold()):intent='recipes'
        if signals or intent=='safety':
            flags=sorted(signals or {'medication_review'});d['holds']=sorted(set(d['holds'])|set(flags));d['revision']+=1
            for plan in d['core']['plans'].values():plan['status']='blocked_safety_review'
            reply=('При таких выраженных симптомах нужна срочная медицинская помощь. Не ждите ответа чата и не объясняйте это адаптацией к кето. Обратитесь в местную экстренную службу.' if 'urgent' in flags else 'Я не буду составлять строгий кето-план при этих обстоятельствах. Нужен разбор ограничения с лечащим специалистом; лекарства самостоятельно не меняйте. Можно продолжить дневник и подготовить вопросы врачу.')
            extra['safety_hold']=flags
        elif intent in ('guidance','setup_help'):
            guide=planning.preview(d,k);stage=planning.status(d,k)['stage'];extra['open_view']='targets' if stage in ('targets','ready') else 'setup';extra['actions']=[{'view':extra['open_view'],'label':'Ваш план питания' if extra['open_view']=='targets' else 'Продолжить знакомство'},{'view':'recipes','label':'Рецепты без настройки'}]
            if intent=='guidance' and guide['candidate']:
                extra['guidance_preview']=guide;reply='Предварительно: '+str(guide['candidate']['energy_min_kcal'])+'–'+str(guide['candidate']['energy_max_kcal'])+' ккал в день по сохранённым данным. Это не назначение; откройте расчёт и подтвердите отдельно.'
            else:reply='Сначала '+{'consent':'дайте свои разрешения','about':'укажите исходные данные','restrictions':'завершите ограничения','targets':'посмотрите и подтвердите ориентиры','ready':'откройте ваш план питания'}[stage]+'. Рецепты доступны отдельной кнопкой.'
        elif intent=='kitchen':
            spec={}
            for change in parsed.get('changes',[]):
                if change.get('key')=='kitchen.spec':spec=json.loads(change['json_value'])
            products=self.kitchen(subject,'parse',query=message,thread_id=tid,kind=kind)
            if products['questions']:
                reply=' '.join(q['text'] for q in products['questions']);extra['product_questions']=products['questions']
            else:
                if products['pantry']:spec['pantry']=products['pantry']
                elapsed=time.monotonic()-chat_started
                extra.update(self.kitchen(subject,'generate',spec=spec,request_id=request_id,thread_id=tid,kind=kind,recipe_timeout=max(0,50-elapsed)))
                reply=extra.pop('message',None) or ' '.join(str(q) for q in extra.get('questions',[])) or 'Подходящих блюд пока нет; ограничения сохранены.';extra.pop('state',None)
                d,v=self.load(subject,kind)
        elif intent=='preferences':
            ui={};sett={};unsupported=[]
            for change in parsed['changes']:
                if not isinstance(change,dict) or set(change)!={'key','json_value'}:raise InputError('Некорректное предложение модели')
                key=change['key']
                try:val=json.loads(change['json_value'])
                except (ValueError,TypeError):raise InputError('Модель предложила неверное значение')
                if key in ('settings.disliked_food_ids','settings.excluded_food_ids') and not re.search(r'запомн|постоянн|всегда|сохрани.*предпочт',message.casefold()):unsupported.append(key);continue
                if key.startswith('ui.'):ui[key[3:]]=val
                elif key.startswith('settings.'):sett[key[9:]]=val
                else:unsupported.append(key)
            if unsupported:reply='Это изменение нельзя применить автоматически. Опишите желаемое поведение — сохраню предложение для отдельной проверки.'
            elif ui and sett:
                # One confirmation per change family; no hidden partial application.
                extra['proposal']=self._prepare(d,'configuration',{'ui':ui,'settings':sett})
                reply='Подготовлены изменения оформления и настроек питания. Подтвердите их вместе; можно отменить без изменений.'
            elif ui or sett:
                p=self._prepare(d,'ui' if ui else 'settings.update',ui or sett);extra['proposal']=p
                reply='Вот предлагаемое изменение. Нажмите «Применить», чтобы сохранить; «Отмена» оставит всё как есть.'
            else:reply=parsed['reply_ru'] or 'Что именно неудобно: размер текста, карточки, число показателей или порядок разделов?'
        elif intent=='onboarding':
            payload={};allowed={'display_name','timezone','goal','allergies','medications'}
            for ch in parsed['changes']:
                key=ch.get('key','');val=json.loads(ch.get('json_value','null'))
                if key.startswith('profile.screening.'):
                    field=key.split('.')[-1]
                    if field not in k.SCREEN_FIELDS:raise InputError('Неизвестный вопрос анкеты')
                    payload.setdefault('screening',{})[field]=val
                elif key.startswith('profile.') and key[8:] in allowed:
                    if key=='profile.medications':
                        if not isinstance(val,list) or any(not isinstance(m,dict) or set(m)-{'name','class'} or m.get('class','unknown')!='unknown' for m in val):raise InputError('Лекарство требует отдельной проверки')
                    payload[key[8:]]=val
                else:raise InputError('Модель предложила недопустимое изменение профиля')
            if payload:
                extra['proposal']=self._prepare(d,'profile.update',payload)
                reply='Вот что я поняла из ваших слов. Проверьте сведения и подтвердите. Неотвеченные вопросы остаются неизвестными.'
            else:reply=parsed['reply_ru'] or 'Как к вам обращаться и какие ограничения питания важно учесть?'
        elif intent=='diary':
            zone=d['core']['profile'].get('timezone')
            if not zone:reply='Уточните часовой пояс в анкете, чтобы запись попала в правильный день. Сам текст пока не записан в дневник.'
            else:
                note=text(parsed.get('diary_note') or message,3000)
                entry={'date':datetime.now(ZoneInfo(zone)).date().isoformat(),'note':note,'intake_status':'unquantified'}
                extra['proposal']=self._prepare(d,'diary.add',entry);reply='Подготовила запись без выдуманных граммовок и калорий. Проверьте текст и подтвердите сохранение.'
        elif intent=='recipes':
            filters=self.recipe_filters(message,parsed,d)
            choice=re.search(r'(?:второй|вторую|вариант\s*2|номер\s*2)',message.casefold())
            old_choices=topic(d,tid).get('choices',[])
            if choice and len(old_choices)>1:
                chosen=old_choices[1];options=self.catalog(subject,'',72,kind)['recipes'];extra['recipes']=[r for r in options if r['recipe_id']==chosen]
                reply='Второй вариант из этой темы. Проверьте состав; он ещё не выбран как меню.' if extra['recipes'] else 'Прежний вариант уже не подходит ограничениям. Уточните продукты для нового подбора.'
            else:
                extra.update(self.catalog(subject,'' if filters['include_food_ids'] else parsed['query'],4,kind,**filters))
                reply='Вот подходящие варианты из каталога с граммовками. Временные пожелания не изменяют профиль.'
                for r in extra['recipes']:r['fit_note']='Соответствует указанным продуктам и времени; проверено по сохранённым ограничениям.';r['match']='exact'
                if not extra['recipes']:
                    partial=self.catalog(subject,'',72,kind,exclude_food_ids=filters['exclude_food_ids'],max_minutes=filters['max_minutes'])['recipes']
                    if not partial:partial=self.catalog(subject,'',72,kind,include_food_ids=filters['include_food_ids'],exclude_food_ids=filters['exclude_food_ids'])['recipes']
                    wanted=set(filters['include_food_ids']);partial.sort(key=lambda r:(-len(wanted&{i['food_id'] for i in r['ingredients']}),r['active_minutes']))
                    extra['recipes']=partial[:4]
                    for r in extra['recipes']:
                        missing=wanted-{i['food_id'] for i in r['ingredients']};names=[k.merge_personal_catalog(self.base,d['core'])['foods'][f]['name_ru'] for f in sorted(missing)]
                        r['match']='partial';r['fit_note']='Частичное совпадение. '+('Нет запрошенных продуктов: '+', '.join(names)+'. ' if names else '')+('Нужно больше времени: '+str(r['active_minutes'])+' мин. ' if filters['max_minutes'] and r['active_minutes']>filters['max_minutes'] else '')+'Аллергии и постоянные исключения учтены.'
                    reply='Точного сочетания в каталоге нет. Ниже варианты с указанием отличий. Что можно изменить: продукты или время? Аллергии и постоянные исключения сохраняются.'

            topic(d,tid)['choices']=[r['recipe_id'] for r in extra['recipes']]
        elif intent=='menu':
            if d['holds'] or not k.screen_profile(d['core']['profile'])['can_plan'] or not d['core']['profile'].get('targets'):
                reply='Сначала завершим важные вопросы и согласуем ориентиры питания. Готовую калорийность из демонстрации я вам не назначаю. Откройте «Знакомство» — там видно, что ещё осталось.'
            elif not d['core']['profile'].get('timezone'):reply='Сначала подтвердите часовой пояс в анкете.'
            else:
                start=datetime.now(ZoneInfo(d['core']['profile']['timezone'])).date().isoformat()
                extra.update(self.menu(subject,start,k.integer(parsed.get('days',1),'days',1,7),kind));reply=extra['message']
        elif re.search(r'напомн|будильник',message.casefold()):
            reply='Откройте «Напоминания», выберите время и часовой пояс и подтвердите. Для уведомлений после закрытия сайта импортируйте событие в Календарь.';extra['open_view']='reminders'
        elif intent=='help':
            extra['actions']=[{'view':'setup','label':'Продолжить знакомство'},{'view':'recipes','label':'Рецепты'},{'view':'targets','label':'Ваш план питания'}];reply='Откройте «Рецепты» или напишите, что хочется приготовить. Можно добавить запись о дне. Я покажу варианты и попрошу подтвердить изменения. Что удобнее сейчас?'
        elif intent=='feature_request':
            extra['proposal']=self._prepare(d,'feature.request',{'description':message[:1500]});reply='Это новая функция, а не безопасная настройка. Могу сохранить пожелание для разработки. Сейчас код и разрешения не изменены.'
        else:reply=parsed['reply_ru'] or 'Уточните, пожалуйста, задачу: подобрать еду, записать день или настроить интерфейс?'
        usage=dict(parsed.get('_usage',{}))
        intent_usage=dict(usage)
        extra['model_roles']=[{'role':'intent','deployment':parsed.get('_deployment',getattr(self.brain,'deployment','unknown')),'attempted':called,**intent_usage}]+extra.get('model_roles',[])
        recipe_usage=extra.pop('model_usage',{})
        called=called or extra.pop('model_called',False)
        for key in ('input_tokens','output_tokens'):usage[key]=int(usage.get(key,0))+int(recipe_usage.get(key,0))
        role=d['usage'].setdefault('roles',{}).setdefault('intent',{'calls':0,'input_tokens':0,'output_tokens':0})
        role['calls']+=int(called)
        for key in ('input_tokens','output_tokens'):role[key]+=int(intent_usage.get(key,0))
        d['usage']['input_tokens']+=int(intent_usage.get('input_tokens',0));d['usage']['output_tokens']+=int(intent_usage.get('output_tokens',0))
        now=k.utc_now();topic(d,tid)['messages']+= [{'role':'user','text':message,'at':now}, {'role':'assistant','text':reply,'at':now,'request_id':request_id,'request_hash':request_hash}]
        topic(d,tid)['messages']=topic(d,tid)['messages'][-60:]
        d['chat']=copy.deepcopy(topic(d,'main')['messages'])
        d['requests'][request_id].update(status='completed',reply=reply)
        self.save(subject,d,v)
        return {'message':reply,'intent':intent,'model_called':called,'model_usage':usage,'latency_ms':parsed.get('_latency_ms'),'state':self.snapshot(d),**extra}
