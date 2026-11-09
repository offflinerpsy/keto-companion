"""Compact, message-owned UI references. Resolving never applies or generates."""
import copy
import re
import time
import uuid
from .mobile import topic
from .store import Conflict

VIEWS = {'setup':'Продолжить знакомство','targets':'Ваш план питания','recipes':'Рецепты',
         'today':'Моё меню','diary':'Дневник','reminders':'Напоминания',
         'knowledge':'База знаний','memory':'Что я помню'}
MODES = {'pantry_only':'Из того, что есть','pantry_plus':'Можно докупить','inspiration':'Просто идеи'}
TYPES = {'navigate','choose_meal_mode','open_recipe','open_intake','review_proposal'}
RECIPE_KINDS = {'catalog_recipe','saved_recipe','generated_recipe'}


def chat_context(d,tid,request_id,request_hash):
    return {'thread_id':tid,'epoch':topic(d,tid).get('epoch',0),
            'request_id':request_id,'request_hash':request_hash}


def check_chat_context(d,context):
    t=topic(d,context['thread_id']);request=d.get('requests',{}).get(context['request_id'])
    if t.get('epoch',0)!=context['epoch'] or not request or request.get('hash')!=context['request_hash'] or request.get('status')!='pending':
        raise Conflict('Разговор изменился; ответ отброшен')
    return t


def hunger_request(message):
    return bool(re.fullmatch(r'\s*(?:(?:я\s+)?(?:голоден|голодна|проголодался|проголодалась)|(?:я\s+)?хочу\s+(?:поесть|есть|кушать))(?:\s*[.!?])?\s*',message.casefold()))


class ChatActionService:
    def chat_recipe_target(self,d,tid,rid):
        group=topic(d,tid).get('kitchen',{})
        if rid in group.get('candidate_ids',[]) and rid in d.get('kitchen',{}).get('drafts',{}):
            return {'kind':'generated_recipe','recipe_id':rid,'generation_id':group.get('generation_id')}
        if rid in d['core'].get('custom_recipes',{}):return {'kind':'saved_recipe','recipe_id':rid}
        if rid in self.base['recipes']:return {'kind':'catalog_recipe','recipe_id':rid}
        return None

    def chat_actions(self,d,tid,result):
        """Translate service-owned results; never accept model-authored actions."""
        actions=[]
        def add(kind,label,target,**extra):
            if len(actions)<3:actions.append({'id':'a'+str(len(actions)+1),'type':kind,'label':label[:140],
                                             'issued_revision':d['revision'],'target':target,**extra})
        if result.get('safety_hold'):return actions
        if result.get('meal_modes'):
            for mode,label in MODES.items():add('choose_meal_mode',label,{'mode':mode})
        elif result.get('proposal'):
            add('review_proposal','Проверить изменение',{'proposal_id':result['proposal']['id']})
        elif result.get('chat_intake'):
            intake=result['chat_intake'];target=self.chat_recipe_target(d,tid,intake['recipe_id'])
            if target:
                extra={'suggested_amount':copy.deepcopy(intake['suggested_amount'])} if intake.get('suggested_amount') else {}
                add('open_intake','Записать съеденное',target,**extra)
        elif result.get('recipes'):
            recipes=result['recipes'][:3]
            for recipe in recipes:
                target=self.chat_recipe_target(d,tid,recipe['recipe_id'])
                if target:
                    provenance={}
                    if target['kind']!='generated_recipe' and recipe.get('match') in ('exact','partial'):
                        provenance['match']=recipe['match']
                        note=recipe.get('fit_note')
                        if isinstance(note,str):provenance['fit_note']=note if len(note)<=600 else note[:599]+'…'
                    add('open_recipe',recipe['name_ru'],target,**provenance)
            if len(recipes)==1 and actions:add('open_intake','Записать съеденное',copy.deepcopy(actions[0]['target']))
        elif result.get('plan'):
            add('navigate',VIEWS['today'],{'view':'today'})
        else:
            requested=result.get('actions') or ([{'view':result['open_view']}] if result.get('open_view') else [])
            seen=set()
            for action in requested:
                view=action.get('view')
                if view in VIEWS and view not in seen:add('navigate',VIEWS[view],{'view':view});seen.add(view)
            if not actions and (result.get('product_questions') or result.get('recipes')==[] and result.get('questions')):
                add('navigate',VIEWS['recipes'],{'view':'recipes'})
        return actions

    def append_chat_turn(self,d,tid,message,reply,request_id,request_hash,result,context):
        from .domain import k
        t=check_chat_context(d,context);now=k.utc_now();mid=uuid.uuid4().hex
        assistant={'id':mid,'thread_id':tid,'role':'assistant','text':reply,'at':now,
                   'request_id':request_id,'request_hash':request_hash,'actions':self.chat_actions(d,tid,result)}
        t['messages'] += [{'id':uuid.uuid4().hex,'thread_id':tid,'role':'user','text':message,'at':now},assistant]
        t['messages']=t['messages'][-60:]
        d['requests'][request_id].update(status='completed',reply=reply,message_id=mid)
        proposal=result.get('proposal')
        if proposal and proposal['id'] in d['pending']:
            d['pending'][proposal['id']]['chat_origin']={'thread_id':tid,'message_id':mid}
        return mid

    def chat_action_status(self,d,tid,action):
        target=action.get('target',{});kind=action.get('type')
        if kind not in TYPES or not isinstance(target,dict):return 'unavailable','Действие недоступно'
        if kind=='navigate':return ('available',None) if target.get('view') in VIEWS else ('unavailable','Раздел недоступен')
        if kind=='choose_meal_mode':return ('available',None) if target.get('mode') in MODES else ('unavailable','Режим недоступен')
        if kind=='review_proposal':
            pid=target.get('proposal_id')
            if pid in d['receipts']:return 'completed','Изменение уже подтверждено'
            proposal=d['pending'].get(pid)
            if not proposal:return 'unavailable','Предложение отменено или недоступно'
            if proposal['expires_at']<=time.time():return 'expired','Срок предложения истёк'
            if proposal['base_revision']!=d['revision']:return 'stale','Данные изменились; подготовьте предложение заново'
            return 'available',None
        rid=target.get('recipe_id');source=target.get('kind')
        if source not in RECIPE_KINDS:return 'unavailable','Рецепт недоступен'
        if source=='generated_recipe':
            group=topic(d,tid).get('kitchen',{})
            if not target.get('generation_id') or target['generation_id']!=group.get('generation_id') or rid not in group.get('candidate_ids',[]) or rid not in d.get('kitchen',{}).get('drafts',{}):
                return 'unavailable','Подбор изменился. Выберите рецепт заново.'
        elif source=='saved_recipe' and rid not in d['core'].get('custom_recipes',{}):return 'unavailable','Сохранённый рецепт недоступен'
        elif source=='catalog_recipe' and rid not in self.base['recipes']:return 'unavailable','Рецепт недоступен'
        return 'available',None

    def chat_messages(self,d,tid):
        messages=copy.deepcopy(topic(d,tid)['messages'][-60:])
        for message in messages:
            for action in message.get('actions',[]):
                action['status'],reason=self.chat_action_status(d,tid,action)
                if reason:action['reason']=reason
        return messages

    def resolve_chat_action(self,d,tid,values,expected_revision=None):
        from .domain import k,storage_consent
        if not d['processing_consent'] or not storage_consent(d):raise ValueError('Сначала разрешите личное хранение и обработку')
        if expected_revision is not None and (type(expected_revision)is not int or expected_revision!=d['revision']):raise Conflict('Разговор изменился; обновите экран')
        if not isinstance(values,dict) or set(values)!={'message_id','action_id'} or any(not isinstance(v,str) or not re.fullmatch(r'[A-Za-z0-9_-]{1,100}',v) for v in values.values()):raise ValueError('Выберите действие сообщения')
        message=next((m for m in topic(d,tid)['messages'] if m.get('id')==values['message_id'] and m.get('role')=='assistant' and m.get('thread_id')==tid),None)
        if not message:raise ValueError('Сообщение отсутствует в выбранной теме')
        original=next((a for a in message.get('actions',[])[:3] if a.get('id')==values['action_id']),None)
        if not original:raise ValueError('Действие отсутствует в выбранном сообщении')
        action=copy.deepcopy(original);action['status'],reason=self.chat_action_status(d,tid,action)
        if reason:action['reason']=reason
        result={'action':action,'command':None,'revision':d['revision'],'response_thread_id':tid,'message_id':message['id'],'model_called':False}
        if action['status']!='available':return result
        kind=action['type'];target=action['target'];command={'type':kind}
        if kind=='navigate':command['view']=target['view']
        elif kind=='choose_meal_mode':command['mode']=target['mode']
        elif kind=='review_proposal':command['proposal_id']=target['proposal_id']
        else:
            rid=target['recipe_id'];cat=self.kitchen_catalog(d)
            try:
                if target['kind']=='generated_recipe':card=self.kitchen_card(d,rid,topic(d,tid)['kitchen']['spec'],target['generation_id'])
                else:
                    card=k.calculate_recipe(cat,rid)
                    if k.check_recipe(d['core']['profile'],card) and cat['recipes'][rid].get('usage')!='observational':raise ValueError('Ограничения изменились')
                    if action.get('match') in ('exact','partial'):
                        card['match']=action['match']
                        if isinstance(action.get('fit_note'),str):card['fit_note']=action['fit_note']
            except (ValueError,k.KetoError):
                action.update(status='unavailable',reason='Состав или ограничения изменились. Проверьте рецепт заново.')
                return result
            source={**target,'name_ru':card['name_ru'],'thread_id':tid,
                    'origin':{'thread_id':tid,'message_id':message['id'],'action_id':action['id']}}
            command['source']=source
            if kind=='open_recipe':command['recipe']=card
            if action.get('suggested_amount'):command['suggested_amount']=copy.deepcopy(action['suggested_amount'])
        result['command']=command
        return result

    def chat_intake_origin(self,d,payload):
        origin=payload.get('origin')
        if not isinstance(origin,dict) or set(origin)!={'thread_id','message_id','action_id'}:raise ValueError('Неверный источник записи из чата')
        if payload.get('operation','add')!='add' or payload.get('food_id') or payload.get('thread_id')!=origin['thread_id']:raise ValueError('Источник записи не совпадает с сообщением')
        resolved=self.resolve_chat_action(d,origin['thread_id'],{key:origin[key] for key in ('message_id','action_id')})
        command=resolved['command']
        if not command or command['type'] not in ('open_recipe','open_intake'):raise ValueError('Рецепт сообщения больше недоступен')
        if command['source']['recipe_id']!=payload.get('recipe_id'):raise ValueError('Рецепт не совпадает с сообщением')
        return command['source']
