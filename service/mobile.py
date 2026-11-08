"""Backward-compatible own-document topics, reminders and speech receipts."""
import base64,copy,hashlib,re,time,uuid
from datetime import datetime,date,timedelta,timezone
from zoneinfo import ZoneInfo,ZoneInfoNotFoundError
from .store import Conflict
from .speech import AudioTranscriber,SpeechError,speech_message

def mobile_init(d):
    if 'topics' not in d:d['topics']={'main':{'id':'main','title':'Основной разговор','messages':copy.deepcopy(d.get('chat',[]))[-60:],'choices':[]}}
    if d.get('active_thread') not in d['topics']:d['active_thread']='main'
    d.setdefault('reminders',[])
def compact_topics(d):
    if 'topics' not in d:return
    import json
    for t in d['topics'].values():t['messages']=t['messages'][-60:]
    while sum(len(json.dumps(t['messages'],ensure_ascii=False).encode()) for t in d['topics'].values())>200000:
        oldest=min((t for t in d['topics'].values() if t['messages']),key=lambda t:t['messages'][0].get('at',''))
        oldest['messages']=oldest['messages'][2:]
    d['chat']=copy.deepcopy(d['topics']['main']['messages'])

def topic(d,tid):
    if not isinstance(tid,str) or tid not in d['topics']:raise ValueError('Тема не найдена в вашем пространстве')
    return d['topics'][tid]
def next_due(r,after=None):
    now=after or datetime.now(timezone.utc);zone=ZoneInfo(r['timezone']);local=now.astimezone(zone);h,m=map(int,r['time'].split(':'))
    dates=[date.fromisoformat(r['date'])] if r.get('date') else [local.date()+timedelta(days=n) for n in range(15)]
    for day in dates:
        if r.get('date') and day!=date.fromisoformat(r['date']):continue
        if r['days_of_week'] and day.weekday() not in r['days_of_week']:continue
        dt=datetime(day.year,day.month,day.day,h,m,tzinfo=zone,fold=0)
        if dt.astimezone(timezone.utc).astimezone(zone).replace(tzinfo=None)!=dt.replace(tzinfo=None):continue
        if dt>now:return dt.isoformat()
    return None

def validate_reminder(x):
    if not isinstance(x,dict) or set(x)-{'title','time','timezone','days_of_week','enabled','date'}:raise ValueError('Неверное напоминание')
    title=x.get('title');clock=x.get('time');days=x.get('days_of_week',[]);zone=x.get('timezone')
    if not isinstance(title,str) or not title.strip() or len(title)>120 or '\n' in title or '\r' in title:raise ValueError('Укажите короткое название без переносов')
    if not isinstance(clock,str) or not re.fullmatch(r'(?:[01]\d|2[0-3]):[0-5]\d',clock):raise ValueError('Нужно время ЧЧ:ММ')
    if not isinstance(days,list) or len(days)>7 or any(type(i)is not int or not 0<=i<=6 for i in days) or len(set(days))!=len(days):raise ValueError('Неверные дни недели')
    try:ZoneInfo(zone)
    except (ZoneInfoNotFoundError,TypeError,ValueError):raise ValueError('Нужен часовой пояс IANA, например Europe/Minsk') from None
    if type(x.get('enabled',True))is not bool:raise ValueError('Неверный переключатель')
    day=x.get('date')
    if day:
        if days:raise ValueError('Выберите дату или дни недели')
        date.fromisoformat(day)
    elif not days:raise ValueError('Выберите дату или дни недели')
    return {'title':title.strip(),'time':clock,'timezone':zone,'days_of_week':sorted(days),'enabled':x.get('enabled',True),'date':day}

class MobileService:
    def topics(self,subject,action='list',thread_id=None,title=None,confirmed=False,expected_revision=None,kind='personal'):
        from .domain import storage_consent,text
        d,v=self.load(subject,kind)
        if action=='list':return {'state':self.snapshot(d)}
        if not storage_consent(d):raise ValueError('Сначала разрешите хранение')
        if confirmed is not True:raise ValueError('Подтвердите действие с темой')
        if expected_revision!=d['revision']:raise Conflict('Устаревший экран')
        if action=='create':
            if len(d['topics'])>=12:raise ValueError('Не больше 12 тем; удалите ненужную')
            tid=uuid.uuid4().hex;d['topics'][tid]={'id':tid,'title':text(title,80),'messages':[],'choices':[]};d['active_thread']=tid
        elif action=='select':topic(d,thread_id);d['active_thread']=thread_id
        elif action=='rename':topic(d,thread_id)['title']=text(title,80)
        elif action=='delete':
            if thread_id=='main':raise ValueError('Основную тему можно очистить, но нельзя удалить')
            topic(d,thread_id);del d['topics'][thread_id]
            if d['active_thread']==thread_id:d['active_thread']='main'
        elif action=='clear':topic(d,thread_id)['messages']=[];topic(d,thread_id)['choices']=[]
        else:raise ValueError('Неизвестное действие темы')
        if action in ('delete','clear'):
            d['requests']={rid:r for rid,r in d.get('requests',{}).items() if r.get('thread_id','main')!=thread_id}
            if action=='clear':topic(d,thread_id).pop('kitchen',None)
            block=d.get('kitchen',{});block['requests']={rid:r for rid,r in block.get('requests',{}).items() if r.get('thread_id')!=thread_id}
            block['accepted']=[r for r in block.get('accepted',[]) if r.get('thread_id')!=thread_id]
            active={rid for t in d['topics'].values() for rid in t.get('kitchen',{}).get('candidate_ids',[])}
            block['drafts']={rid:r for rid,r in block.get('drafts',{}).items() if rid in active}
        d['chat']=copy.deepcopy(d['topics']['main']['messages']);d['revision']+=1;self.save(subject,d,v);return {'state':self.snapshot(d),'message':'Тема обновлена. Общие подтверждённые настройки сохранены.'}
    def reminders(self,subject,action='list',reminder_id=None,values=None,confirmed=False,expected_revision=None,kind='personal'):
        from .domain import storage_consent
        from .mobile_exports import reminder_ics
        d,v=self.load(subject,kind)
        if not storage_consent(d):raise ValueError('Сначала разрешите хранение')
        if action=='list':return {'reminders':copy.deepcopy(d['reminders']),'state':self.snapshot(d)}
        old=next((r for r in d['reminders'] if r['id']==reminder_id),None)
        if action=='ics':
            if not old or not old['enabled'] or not old['next_due']:raise ValueError('Нет включённого будущего напоминания')
            return reminder_ics(old,subject)
        if confirmed is not True:raise ValueError('Подтвердите изменение напоминания')
        if expected_revision!=d['revision']:raise Conflict('Устаревший экран')
        if action in ('create','update'):
            if action=='create' and len(d['reminders'])>=20:raise ValueError('Не больше 20 напоминаний')
            if action=='update' and not old:raise ValueError('Напоминание не найдено')
            r=validate_reminder(values);r.update(id=old['id'] if old else uuid.uuid4().hex,last_completed=old.get('last_completed') if old else None);r['next_due']=next_due(r) if r['enabled'] else None
            if r['enabled'] and not r['next_due']:raise ValueError('Укажите будущую дату или повторение')
            if old:d['reminders'].remove(old)
            d['reminders'].append(r)
        elif action=='delete':
            if not old:raise ValueError('Напоминание не найдено')
            d['reminders'].remove(old)
        elif action=='complete':
            if not old:raise ValueError('Напоминание не найдено')
            stamp=datetime.now(timezone.utc);old['last_completed']=stamp.isoformat();after=max(stamp,datetime.fromisoformat(old['next_due'])+timedelta(seconds=1)) if old.get('next_due') else stamp;old['next_due']=next_due(old,after) if old['days_of_week'] else None
        else:raise ValueError('Неизвестное действие напоминания')
        d['revision']+=1;self.save(subject,d,v);return {'state':self.snapshot(d),'message':'Напоминание сохранено. Для уведомлений импортируйте файл в Календарь.'}
    def transcribe(self,subject,audio_base64,mime,request_id,kind='personal'):
        from .domain import storage_consent
        d,v=self.load(subject,kind)
        if not d['processing_consent'] or not storage_consent(d):raise ValueError('Нет согласия на обработку и хранение')
        if not isinstance(request_id,str) or not re.fullmatch(r'[A-Za-z0-9_-]{8,100}',request_id):raise ValueError('Неверный request_id')
        if not isinstance(audio_base64,str) or len(audio_base64)>1_400_000:raise ValueError('AUDIO_SIZE')
        digest=hashlib.sha256((mime+'|'+audio_base64).encode()).hexdigest();requests=d.setdefault('audio_requests',{});old=requests.get(request_id)
        if old:raise Conflict('AUDIO_ALREADY_PROCESSED' if old['hash']==digest else 'request_id повторно использован с другим содержимым')
        today=datetime.now(timezone.utc).date().isoformat();usage=d.setdefault('audio_usage',{'day':today,'calls':0})
        if usage['day']!=today:usage.update(day=today,calls=0)
        if usage['calls']>=30:raise ValueError('AUDIO_QUOTA')
        requests[request_id]={'hash':digest,'status':'pending'};d['audio_requests']=dict(list(requests.items())[-150:]);self.save(subject,d,v)
        error=None;transcript=None
        try:transcript=(self.transcriber or AudioTranscriber()).transcribe(audio_base64,mime);paid=True
        except SpeechError as e:error=e.code;paid=e.paid
        d,v=self.load(subject,kind)
        if request_id not in d.get('audio_requests',{}):raise Conflict('Согласие изменено, ответ отброшен')
        d['audio_requests'][request_id]['status']='completed' if not error else 'failed'
        if paid:d['audio_usage']['calls']+=1
        self.save(subject,d,v)
        if not d['processing_consent'] or not storage_consent(d):raise Conflict('Согласие изменено, ответ отброшен')
        if error:return {'error_code':error,'message':speech_message(error),'model_called':paid}
        return {'text':transcript,'model_called':True,'message':'Текст подготовлен. Проверьте его перед отправкой.'}
    def recipe_filters(self,message,parsed,d):
        # Map only known catalog identities; model text never creates food IDs.
        from .domain import k
        catalog=k.merge_personal_catalog(self.base,d['core'])['foods'];t=message.casefold();include=[];exclude=[]
        aliases=[(r'яйц|яичн|яйч',r'^яйцо'),(r'кабач|цукини',r'^кабач'),(r'куриц|курин|курят',r'курин'),(r'брокколи',r'^брокколи'),(r'лосос',r'^лосось'),(r'помидор|томат',r'^помидор'),(r'огур',r'^огур'),(r'шпинат',r'^шпинат'),(r'шампиньон|гриб',r'^шампиньон'),(r'тофу',r'^тофу'),(r'говядин|говяж',r'^говяж'),(r'кревет',r'^кревет')]
        for mention,name in aliases:
            found=re.search(mention,t)
            if not found:continue
            ids=[fid for fid,f in catalog.items() if re.search(name,f['name_ru'].casefold())]
            before=t[max(0,found.start()-35):found.start()];after=t[found.end():found.end()+20]
            negative=bool(re.search(r'(без|не хочу|не надо|не люблю|надоел[аио]?|устал[аи]? от)[^,.;]*$',before) or re.search(r'^\w*\s+(?:надоел|наскучил)',after))
            if negative:exclude+=ids
            elif ids:include.append(ids[0])
        maximum=None;match=re.search(r'(\d{1,3})\s*(?:мин|минут)',t)
        if match:maximum=int(match[1])
        for change in parsed.get('changes',[]):
            key=change.get('key');value=change.get('json_value')
            if key in ('recipe.include_food_ids','recipe.exclude_food_ids','recipe.max_minutes'):
                import json
                val=json.loads(value)
                if key.endswith('max_minutes'):maximum=val
                else:
                    if not isinstance(val,list) or any(not isinstance(x,str) or x not in catalog for x in val):raise ValueError('Неизвестный продукт модели')
                    if key.endswith('include_food_ids'):include+=val
                    else:exclude+=val
        return {'include_food_ids':sorted(set(include)),'exclude_food_ids':sorted(set(exclude)),'max_minutes':maximum}
