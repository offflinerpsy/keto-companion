"""Bounded personal kitchen. Models choose IDs/grams; core owns all arithmetic.

The JSON document is the sole pantry/memory store. Drafts never mutate inventory;
all durable user choices go through the normal proposal/CAS confirmation path.
"""
from __future__ import annotations
import copy
import hashlib
import itertools
import json
import os
import re
import time
import uuid
from datetime import date, datetime, timezone
from pathlib import Path
from zoneinfo import ZoneInfo
from jsonschema import Draft202012Validator
from .mobile import topic
from .recipe_brain import RecipeDesigner, RecipeUnavailable, recipe_schema
from .store import Conflict
from . import food_source

POLICY = json.loads((Path(__file__).parent/'data/kitchen_policy.json').read_text())
ROOT = Path(__file__).resolve().parents[1]
MEALS = ('breakfast', 'lunch', 'dinner', 'snack', 'day')
MODES = ('pantry_only', 'pantry_plus', 'inspiration')
METHODS = {m['id']: m for m in POLICY['methods']}
LABEL = 'Сгенерировано; рассчитано по справочнику; не кухонное испытание.'
FALLBACK_LABEL = 'Из проверяемого шаблона; рассчитано по справочнику; не кухонное испытание.'

def core():
    from .domain import k
    return k

def init(d):
    block = d.setdefault('kitchen', {})
    for key, default in {'version':POLICY['version'], 'pantry':[], 'preferences':[], 'drafts':{}, 'requests':{}, 'ratings':{}, 'accepted':[]}.items():
        block.setdefault(key, copy.deepcopy(default))
    return block

def invalidate(d):
    block=init(d);block['drafts']={}
    for request in block['requests'].values():
        request['status']='invalidated';request.pop('response',None)
    for t in d['topics'].values():t.pop('kitchen',None);t['choices']=[]

def pantry_valid(items, cat):
    k = core()
    if not isinstance(items, list) or len(items)>POLICY['limits']['pantry_items']:
        raise ValueError('В кладовой не больше 30 продуктов')
    result = []
    for item in items:
        if not isinstance(item, dict) or set(item)-{'food_id','state','grams'} or not {'food_id','state'}<=set(item):
            raise ValueError('Продукт: точный код, состояние и необязательная масса в граммах')
        food = cat['foods'].get(item['food_id'])
        if not food: raise ValueError('Неизвестный продукт: нужна проверенная этикетка')
        if item['state']!=food['state']: raise ValueError('Сырой, готовый и замороженный вес нельзя подменять')
        grams = None if item.get('grams') is None else float(k.number(item['grams'], 'grams', .1, 30000))
        if any(i['food_id']==item['food_id'] for i in result): raise ValueError('Повтор продукта в кладовой')
        result.append({'food_id':item['food_id'], 'state':food['state'], 'grams':grams})
    return result

def spec_valid(value, pantry, cat):
    k = core()
    if not isinstance(value, dict) or set(value)-{'mode','meal','servings','time_budget','cuisine','equipment','avoid','pantry','max_missing_items'}:
        raise ValueError('Неизвестный параметр кухни')
    s = {'mode':'pantry_only','meal':'dinner','servings':1,'time_budget':30,'cuisine':'Домашняя кухня Беларуси','equipment':'pan','avoid':[], 'max_missing_items':2, **copy.deepcopy(value)}
    if s['mode'] not in MODES or s['meal'] not in MEALS or s['equipment'] not in POLICY['equipment']: raise ValueError('Проверьте режим, приём пищи и оборудование')
    for key, lo, hi in [('servings',1,6),('time_budget',5,120),('max_missing_items',0,5)]:
        s[key] = k.integer(s[key], key, lo, hi)
    s['cuisine'] = k.clean_text(s['cuisine'], 'cuisine', 100)
    if not isinstance(s['avoid'], list) or len(s['avoid'])>40 or any(fid not in cat['foods'] for fid in s['avoid']):raise ValueError('Исключение должно ссылаться на известный продукт')
    s['avoid'] = sorted(set(s['avoid']))
    s['pantry'] = pantry_valid(s.get('pantry',pantry), cat)
    if len(k.canonical(s).encode())>POLICY['limits']['request_bytes']:raise ValueError('Слишком большой запрос кухни')
    return s

def parse_products(message, cat):
    """Propose identities only. Never infer cooked/raw weights or egg count mass."""
    raw = message.casefold().replace('ё','е')
    result, questions, covered = [], [], []
    # Narrow aliases beat general ones (cauliflower before generic cabbage).
    for alias in POLICY['aliases']:
        found = re.search(alias['pattern'], raw)
        if not found or any(a<=found.start()<b for a,b in covered):continue
        covered.append(found.span())
        before = raw[max(0,found.start()-28):found.start()]
        if re.search(r'(без|не люблю|не хочу)\s*$',before):continue
        choices = [cat['foods'][fid] for fid in alias['ids'] if fid in cat['foods']]
        if not choices:
            questions.append({'text':'Нужна этикетка и точное название: '+found.group(), 'choices':[]});continue
        # Bind amounts/state to this ingredient segment, never its neighbour.
        breaks=list(re.finditer(r'(?<!\d)[,.;]|[,.;](?!\d)|\n|\s+и\s+',raw))
        left=max([x.end() for x in breaks if x.end()<=found.start()]+[0])
        right=min([x.start() for x in breaks if x.start()>=found.end()]+[len(raw)])
        local=raw[left:right]
        if 'заморож' in local:
            questions.append({'text':'Для замороженного продукта нет подтверждённого соответствия веса. Выберите точную запись или добавьте этикетку.', 'choices':[]});continue
        if re.search(r'сыр(?:ая|ое|ой|ую|ые)|сыро',local):choices=[f for f in choices if f['state']=='raw']
        elif re.search(r'готов|варен|варён|запеч',local):choices=[f for f in choices if f['state'].startswith('cooked') or f['state']=='ready_to_eat']
        elif alias.get('ambiguous_state'):
            questions.append({'text':'Уточните вид и состояние: '+found.group()+'. Масса сырого и готового продукта различается.', 'choices':[{'food_id':f['food_id'],'name_ru':f['name_ru'],'state':f['state']} for f in choices]});continue
        if len(choices)!=1:
            questions.append({'text':'Выберите точный продукт: '+found.group(), 'choices':[{'food_id':f['food_id'],'name_ru':f['name_ru'],'state':f['state']} for f in choices]});continue
        f = choices[0]
        amounts = list(re.finditer(r'(\d+(?:[.,]\d+)?)\s*(?:грамм\w*|г\b)',local))
        if len(amounts)>1:questions.append({'text':'Разделите продукты с граммовками запятыми, чтобы не перепутать массу.', 'choices':[]})
        amount=amounts[0] if len(amounts)==1 else None
        if re.search(r'\d+\s*(?:шт|яйц)',local):questions.append({'text':'Укажите массу съедобной части в граммах; штуки автоматически не пересчитываются.', 'choices':[]})
        if f['food_id'] not in {i['food_id'] for i in result}:
            result.append({'food_id':f['food_id'],'state':f['state'],'grams':float(amount[1].replace(',','.')) if amount else None})
    # Explicit ingredient clauses are exhaustive: unknown words cannot disappear.
    clause = re.search(r'(?:^|[.;])\s*(?:есть|у меня есть|продукты[: ]|из продуктов[: ])\s*(.+?)(?:[.;]|$)',raw)
    if clause:
        for part in re.split(r'(?<!\d),|,(?!\d)|\s+и\s+',clause[1]):
            part = part.strip()
            if part and not any(re.search(a['pattern'],part) for a in POLICY['aliases']):
                questions.append({'text':'Неизвестный продукт «'+part[:100]+'»: нужна этикетка, состав и состояние.', 'choices':[]})
    return {'pantry':result,'questions':questions}

def forbidden(d, spec, cat):
    p = d['core']['profile']
    ids = set(p['settings']['excluded_food_ids'])|set(p['settings']['disliked_food_ids'])|set(spec['avoid'])
    for pref in init(d)['preferences']:ids.update(pref['food_ids'])
    allergy = {core().normal_allergen(a) for a in p['allergies']}
    ids.update(fid for fid,f in cat['foods'].items() if allergy & set(f['allergens']))
    return ids

def source_retrieval(message):
    """Only included, nonretracted guidance records; separate from food numbers."""
    words = set(re.findall(r'[a-zа-я]{4,}',message.casefold()))
    rows = json.loads((ROOT/'library/skills/keto-evidence/references/sources.json').read_text())
    ranked = []
    for row in rows:
        if row['source_id'] not in POLICY['source_allowlist'] or not core().evidence_allowed(row):continue
        hay = json.dumps({k:v for k,v in row.items() if k not in ('url',)},ensure_ascii=False).casefold()
        score = sum(w[:5] in hay for w in words)
        if score:ranked.append((score,row['source_id'],row))
    ranked.sort(key=lambda x:(-x[0],x[1]))
    return [{'source_id':r['source_id'],'url':r['url'],'title':r.get('title',''),'kind':'public_guidance'} for _,_,r in ranked[:3]]

def recall(d, message, tid):
    """Bounded own quotes. Preferences come only from canonical facts, never quotes."""
    words = {w[:5] for w in re.findall(r'[a-zа-я]{4,}',message.casefold())}
    hits = []
    for other,t in d['topics'].items():
        for index,m in enumerate(t['messages'][:-8] if other==tid else t['messages']):
            value = m['text']
            if init(d).get('facts_changed_at') and m.get('at','')<=init(d)['facts_changed_at']:continue
            if m['role']!='user' or re.search(r'запомн|не люблю|предпочт|забуд|аллерг|беремен|диабет|лекарств|принимаю',value,re.I):continue
            score = sum(w in value.casefold() for w in words)
            if score:hits.append((score,m.get('at',''),{'source_id':f'topic:{other}:{index}','quote':value[:500],'untrusted_historical_quote':True}))
    for entry in init(d)['accepted'][-10:]:
        if entry.get('thread_id') in d['topics'] and any(w in entry['name_ru'].casefold() for w in words):
            hits.append((1,entry['at'],{'source_id':'accepted:'+entry['recipe_id'],'quote':entry['name_ru'][:500],'untrusted_historical_quote':True}))
    hits.sort(key=lambda x:x[1],reverse=True)
    hits.sort(key=lambda x:x[0],reverse=True)
    return [x[2] for x in hits[:5]]

def canonical_steps(method, ingredients):
    """No model instructions. Every ingredient name originates in the validated list."""
    names = ', '.join(i['name_ru'] for i in ingredients)
    steps = ['Взвесьте съедобную часть в указанном состоянии: '+names+'. Массы относятся ко всему блюду.']
    if method['no_cook']:
        steps.append('Нарежьте подходящие для еды без нагрева продукты. Готовый белковый продукт используйте охлаждённым, соблюдая срок и условия хранения. Соедините перечисленные ингредиенты.')
    elif method['equipment']==['multicooker']:
        steps.append('Используйте только предусмотренный вашей моделью режим «На пару» без давления. Не переносите эти указания на режим скороварки. Если такого режима нет, выберите другое оборудование.')
        steps.append('Налейте в чашу технологическую воду в объёме, указанном производителем; она не входит в съедобный состав и не учтена как продукт. Установите штатную паровую вставку. Не готовьте без воды и не превышайте допустимую загрузку.')
        if method['id']=='multicooker_egg_steam':steps.append('Взбейте яйца, мелко нарежьте овощи. Перелейте смесь в разрешённую производителем жаропрочную форму и поставьте её на паровую вставку, не перекрывая циркуляцию пара. Не выливайте жидкую смесь прямо в отверстия вставки.')
        else:steps.append('Сырой белковый продукт и овощи подготовьте отдельно; после сырой птицы вымойте руки и инвентарь. Разложите продукты небольшими кусочками на паровой вставке. Готовые к употреблению продукты не должны касаться сырой птицы.')
        steps.append('Готовьте до безопасной температуры внутри продукта. При открывании крышки соблюдайте инструкцию и берегитесь горячего пара; расчётное время не гарантирует готовность.')
    elif method['equipment']==['air_fryer']:
        steps.append('Подготовьте продукты и разложите их в разрешённой производителем корзине или форме, оставляя место для циркуляции воздуха. При большой порции готовьте партиями. Не наливайте в прибор масло для фритюра и не используйте незакреплённую бумагу.')
        steps.append('Выберите рекомендованный инструкцией вашей модели режим для этих продуктов. В середине приготовления при необходимости переверните кусочки безопасным инструментом. Точная температура воздуха и время зависят от модели, размера кусочков и загрузки; универсальная настройка не назначается.')
        if method['id']=='air_fryer_poultry':steps.append('После работы с сырой птицей вымойте руки и инвентарь; не допускайте контакта сырой птицы с готовой едой.')
        if any(i['food_id'] in POLICY['groups']['mushroom'] for i in ingredients):steps.append('Шампиньоны доведите до полной готовности; сырыми не подавайте.')
    elif method['equipment']==['waffle_iron']:
        steps.append('Натрите указанный сыр, взбейте яйца и смешайте только перечисленные ингредиенты. Если в списке есть зелень, мелко нарежьте её. Мука, сахар и дополнительное масло не подразумеваются.')
        steps.append('Подготовьте вафельницу по инструкции. Выложите небольшую порцию смеси с учётом вместимости пластин, закройте без усилия и готовьте партиями. Не переполняйте прибор и не добавляйте сырые мясо или рыбу в эту смесь.')
        steps.append('Готовые вафли должны полностью схватиться внутри; проверьте безопасную температуру яичного блюда. Сигнал нагрева вафельницы и румяная поверхность сами по себе не подтверждают готовность.')
    elif method['id']=='omelette':
        steps.append('Нарежьте овощи. На антипригарной сковороде под крышкой прогрейте их до мягкости на умеренном огне; добавьте взбитые яйца, готовьте до полной готовности. Если без масла пригорает, остановитесь и выберите другой способ.')
    elif method['id']=='mushroom_pan':
        steps.append('Нарежьте шампиньоны и овощи, прогрейте на антипригарной сковороде под крышкой на умеренном огне до полной готовности. Шампиньоны сырыми не подавайте. Если пригорает без масла, остановитесь.')
    elif method['id'] in ('fish_pan','poultry_pan'):
        steps.append('Отдельно нарежьте сырой белковый продукт небольшими кусочками и овощи. Вымойте руки и инвентарь после сырого продукта. Готовьте на антипригарной сковороде под крышкой на умеренном огне до готовности; при пригорании остановитесь.')
    elif method['equipment']==['oven']:
        steps.append('Нарежьте ингредиенты; для кабачка с начинкой выньте середину и заполните её перечисленными продуктами. Поместите в пригодную для духовки форму, запекайте при 180 °C до готовности. Сырые продукты держите отдельно от готовых.')
    else:
        steps.append('Нарежьте перечисленные ингредиенты, готовьте на антипригарной сковороде под крышкой на умеренном огне до полной готовности. Если без масла пригорает, остановитесь.')
    oils=[i for i in ingredients if i['food_id'] in POLICY['groups']['oil']]
    if oils:
        oil_use='Смешайте масло с продуктами, не наливайте его на дно прибора.' if method['equipment']==['air_fryer'] else 'Слегка смажьте пластины, только если это разрешено инструкцией.' if method['equipment']==['waffle_iron'] else 'Используйте для продуктов или подходящей формы; для блюда без нагрева вмешайте в готовую смесь.'
        steps.insert(1,'Используйте только уже учтённое масло из состава: '+', '.join(i['name_ru']+' — '+str(round(i['grams_edible'],1))+' г' for i in oils)+'. '+oil_use)
    if method['temperature_c']:
        steps.append(f'Проверьте пищевым термометром в самой толстой части: не ниже {method["temperature_c"]} °C. Указанное время — ориентир, не гарантия безопасности.')
    steps.append('Ничего сверх списка не добавлено: дополнительное масло и соль допустимы только после отдельного пересчёта с их граммами. Остатки быстро охладите и уберите в холодильник; при разогреве доведите до 74 °C.')
    return '\n'.join(steps)

def missing_list(ingredients, pantry):
    stock = {i['food_id']:i for i in pantry}
    missing = []
    for row in ingredients:
        available = stock.get(row['food_id'])
        if available is not None and available['grams'] is None:
            missing.append({**row,'grams_edible':None,'required_grams':row['grams_edible'],'stock_quantity_unknown':True,'checked':False})
            continue
        short = row['grams_edible'] if available is None else max(0,row['grams_edible']-available['grams'])
        if short>.00001:missing.append({**row,'grams_edible':round(short,3),'checked':False})
    return missing

def validate_draft(raw, spec, d, cat, origin):
    k = core()
    m = METHODS.get(raw.get('method_id'))
    if not m or spec['equipment'] not in m['equipment'] or m['minutes']>spec['time_budget']:raise ValueError('Метод не соответствует оборудованию или времени')
    if raw.get('servings')!=spec['servings'] or raw.get('title')!=m['title']:raise ValueError('Порции или название метода изменены')
    allowed_ids = set(cat['foods'])-forbidden(d,spec,cat)
    entries = raw.get('ingredients')
    if not isinstance(entries,list) or not 2<=len(entries)<=6:raise ValueError('Нужно 2–6 ингредиентов')
    if len({i['food_id'] for i in entries})!=len(entries):raise ValueError('Дубли ингредиентов')
    ids = {i['food_id'] for i in entries}
    if not ids<=allowed_ids:raise ValueError('Ингредиент не разрешён')
    permitted = set().union(*(set(POLICY['groups'].get(g,[])) for g in m['roles']+m['optional_groups']))
    if not ids<=permitted:raise ValueError('Продукт не соответствует ролям метода')
    # Each required role needs a distinct ingredient, e.g. mushroom != vegetable.
    if not any(len(set(pick))==len(m['roles']) for pick in itertools.product(*[ids & set(POLICY['groups'][g]) for g in m['roles']])):raise ValueError('Не заполнены роли метода')
    ingredients, group_grams = [], {}
    for i in entries:
        f = cat['foods'][i['food_id']]
        grams = float(k.number(i['grams'],'grams',1,min(5000,1000*spec['servings'])))
        group = f.get('group','vegetable');group_grams[group]=group_grams.get(group,0)+grams/spec['servings']
        if m['no_cook'] and (f['state']=='raw' and group in ('poultry','meat','fish','egg','seafood') or i['food_id'] in POLICY['groups']['mushroom']):raise ValueError('Продукт требует нагрева')
        if group=='poultry' and f['state']=='raw' and (m['temperature_c'] or 0)<74:raise ValueError('Птице требуется 74 °C')
        if group=='egg' and (m['temperature_c'] or 0)<71:raise ValueError('Яйцам требуется 71 °C')
        ingredients.append({'food_id':f['food_id'],'grams_edible':grams,'state':f['state']})
    if sum(i['grams_edible'] for i in ingredients)/spec['servings']>1000:raise ValueError('Слишком большая порция')
    if any(g>POLICY['group_max_per_person'].get(group,350) for group,g in group_grams.items()):raise ValueError('Нереалистичная масса группы продуктов')
    calc = k.calculate_ingredients(ingredients,cat['foods'])
    hard = [issue for issue in k.check_recipe(d['core']['profile'],calc) if issue!='missing_core_nutrition']
    if hard:raise k.SafetyError(';'.join(hard))
    missing = missing_list(calc['ingredients'],spec['pantry'])
    if spec['mode']=='pantry_only' and any(not x.get('stock_quantity_unknown') for x in missing):raise ValueError('Недостаточно продуктов на всё блюдо')
    if spec['mode']=='pantry_plus' and sum(not x.get('stock_quantity_unknown') for x in missing)>spec['max_missing_items']:raise ValueError('Превышен лимит докупки')
    rid = 'RK'+k.digest([POLICY['version'],raw])[:24]
    recipe = {'recipe_id':rid,'name_ru':m['title'],'category':'breakfast' if spec['meal']=='breakfast' else 'main','protein_family':next((cat['foods'][i]['group'] for i in ids if cat['foods'][i]['group'] in ('poultry','fish','egg','soy')), 'vegetable'),'base_servings':spec['servings'],'active_minutes':m['minutes'],'ingredients':ingredients,'steps_ru':canonical_steps(m,calc['ingredients']),'source_ref':json.dumps({'kind':'kitchen_draft','policy':POLICY['version'],'method_id':m['id'],'origin':origin,'food_sources':sorted({i['source_url'] for i in calc['ingredients']})},ensure_ascii=False),'confirmed':True}
    k.validate_custom_recipe(recipe,cat)
    return {'recipe':recipe,'method_id':m['id'],'origin':origin,'created_at':k.utc_now()}

def context_for(d, spec, cat, tid):
    allowed = {fid for fid,f in cat['foods'].items() if f.get('recipe_eligible') is not False}-forbidden(d,spec,cat)
    pantry_ids = [i['food_id'] for i in spec['pantry'] if i['food_id'] in allowed]
    ids = pantry_ids if spec['mode']=='pantry_only' else list(dict.fromkeys(pantry_ids+POLICY['common_ids']))
    ids = [i for i in ids if i in allowed][:40]
    methods = [m for m in POLICY['methods'] if spec['equipment'] in m['equipment'] and m['minutes']<=spec['time_budget'] and all(set(POLICY['groups'][g]) & set(ids) for g in m['roles'])]
    return {'policy_version':POLICY['version'],'region':POLICY['region'],'today_summary':daily_summary(d,cat),'spec':spec,'foods':[{key:cat['foods'][i].get(key) for key in ('food_id','name_ru','state','group','allergens','energy_kcal','protein_g','fat_g','carbohydrate_total_g','fiber_g','saturated_fat_g')} for i in ids],'methods':methods,'role_food_ids':{g:[i for i in values if i in ids] for g,values in POLICY['groups'].items()},'confirmed_targets':d['core']['profile'].get('targets'),'hard_excludes':sorted(forbidden(d,spec,cat)),'recent_recipes':init(d)['accepted'][-8:],'confirmed_diary':[{key:e[key] for key in ('date','recipe_id','portions') if key in e} for e in d['core']['diary'][-8:] if e.get('intake_status')=='confirmed'],'historical_quotes':recall(d,' '.join(f['name_ru'] for f in (cat['foods'][i] for i in ids)),tid),'sources':source_retrieval('готовка безопасность белок углеводы')+[POLICY['safety_source']]}

def template_drafts(context, d, cat):
    spec = context['spec'];ids = [f['food_id'] for f in context['foods']];stock={i['food_id']:i for i in spec['pantry']}
    recent = [r['recipe_id'] for r in init(d)['accepted'][-8:]]+[r.get('recipe_id') for r in d['core']['diary'][-8:] if r.get('intake_status')=='confirmed']
    output = []
    for m in context['methods']:
        roles = [[fid for fid in ids if fid in POLICY['groups'][role]] for role in m['roles']]
        for combo in itertools.product(*roles):
            if len(set(combo))!=len(combo):continue
            for variant in range(2):
                entries=[]
                for fid in combo:
                    f=cat['foods'][fid];g=f.get('group');per=100 if g=='egg' else 150 if g in ('fish','poultry','soy') else 120 if g=='vegetable' else 100 if g=='dairy' else 8
                    if spec['meal']=='day':per=150 if g=='egg' else 190 if g in ('fish','poultry','soy') else 200 if g=='vegetable' else per
                    for role,value in m.get('role_grams',{}).items():
                        if fid in POLICY['groups'][role]:per=value;break
                    per += (20 if g in ('egg','vegetable') else 10)*variant
                    amount=per*spec['servings'];available=stock.get(fid)
                    if available and available['grams'] is not None and spec['mode']=='pantry_only':amount=min(amount,available['grams'])
                    entries.append({'food_id':fid,'grams':amount})
                optional=next((fid for fid in ids if fid not in combo and any(fid in POLICY['groups'][g] for g in m['optional_groups'])),None)
                if (variant or spec['meal']=='day') and optional:
                    amount=(150 if spec['meal']=='day' else 60)*spec['servings'];available=stock.get(optional)
                    if available and available['grams'] is not None and spec['mode']=='pantry_only':amount=min(amount,available['grams'])
                    entries.append({'food_id':optional,'grams':amount})
                if spec['meal']=='day':
                    oil=next((fid for fid in ids if fid in POLICY['groups']['oil'] and fid not in {i['food_id'] for i in entries}),None)
                    if oil and not m['no_cook']:entries.append({'food_id':oil,'grams':20*spec['servings']})
                raw={'method_id':m['id'],'title':m['title'],'flavor':'домашний','servings':spec['servings'],'ingredients':entries}
                try:entry=validate_draft(raw,spec,d,cat,'template')
                except ValueError:continue
                rid=entry['recipe']['recipe_id'];weights=POLICY['repetition_weights']
                accepted=sum(r.get('method_id')==entry['method_id'] and set(r.get('food_ids',[]))==set(i['food_id'] for i in entries) for r in init(d)['accepted'][-8:])
                logged=sum(r.get('recipe_id')==rid and r.get('intake_status')=='confirmed' for r in d['core']['diary'][-8:])
                favorite=rid in d['core']['profile']['settings']['favorites']
                entry['rank']=accepted*weights['accepted_recent']+logged*weights['confirmed_diary']+favorite*weights['favorite']+len(missing_list(core().calculate_ingredients(entry['recipe']['ingredients'],cat['foods'])['ingredients'],spec['pantry']))
                output.append(entry)
    output.sort(key=lambda r:(r['rank'],r['recipe']['active_minutes'],r['recipe']['recipe_id']))
    # Prefer distinct dishes/ingredient sets; a changed gram alone is no novelty.
    unique=[];seen=set()
    for entry in output:
        signature=(entry['method_id'],tuple(sorted(i['food_id'] for i in entry['recipe']['ingredients'])))
        if signature not in seen:unique.append(entry);seen.add(signature)
    return unique

def daily_summary(d,cat):
    k=core();zone=d['core']['profile'].get('timezone')
    if not zone:return {'date':None,'known_entries':0,'unquantified_entries':0,'nutrition':None,'note':'Сначала подтвердите часовой пояс.'}
    day=datetime.now(ZoneInfo(zone)).date().isoformat();entries=[e for e in d['core']['diary'] if e.get('date')==day];calcs=[];unknown=0
    for e in entries:
        if e.get('intake_status')!='confirmed' or e.get('recipe_id') not in cat['recipes'] or e.get('portions') is None:unknown+=1;continue
        calcs.append(k.calculate_recipe(cat,e['recipe_id'],e['portions']))
    totals=k.sum_calculations(calcs)['nutrition'] if calcs else None
    return {'date':day,'known_entries':len(calcs),'unquantified_entries':unknown,'nutrition':totals,'note':'Сумма только подтверждённых записей с известными порциями, не вся фактически съеденная еда. Неизвестные значения не считаются нулём.'}

class KitchenService:
    def kitchen_catalog(self,d):
        return core().merge_personal_catalog(self.base,d['core'])

    def kitchen_shopping(self,d,plan):
        block=init(d);pantry=block.get('plan_pantry',{}).get(plan['plan_id'])
        if pantry is None:return core().shopping_list(plan)
        servings=block.get('plan_servings',{}).get(plan['plan_id'])
        if servings is None:
            # Backward compatibility: older kitchen plans retained whole-batch recipes
            # but not the explicit household size. Infer only one consistent size.
            recipes=d['core'].get('custom_recipes',{})
            counts={recipes[m['recipe_id']]['base_servings'] for day in plan['days'] for m in day['meals'] if m['recipe_id'] in recipes}
            all_known=all(m['recipe_id'] in recipes for day in plan['days'] for m in day['meals'])
            if not all_known or len(counts)!=1:raise ValueError('Уточните число порций для списка покупок; размер блюда не определён')
            servings=counts.pop()
        servings=core().integer(servings,'shopping_servings',1,6)
        batch_plan=copy.deepcopy(plan)
        for day in batch_plan['days']:
            for meal in day['meals']:
                for ingredient in meal['ingredients']:ingredient['grams_edible']*=servings
        return missing_list(core().shopping_list(batch_plan),pantry)

    def source_import_food(self,d,payload):
        k=core()
        if set(payload)!={'candidate_id','release_hash','name_ru','state','allergens','source_review_confirmed'} or payload['source_review_confirmed'] is not True:raise ValueError('Подтвердите название, состояние и проверку аллергенов')
        row=food_source.candidate(payload['candidate_id'],self.base['foods'])
        if payload['release_hash']!=row['release_hash']:raise Conflict('Источник изменился; откройте запись заново')
        if any(f.get('provenance',{}).get('candidate_id')==row['candidate_id'] for f in d['core'].get('custom_foods',{}).values()):raise Conflict('Этот продукт источника уже добавлен')
        name=k.clean_text(payload['name_ru'],'name_ru',200)
        if not name:raise ValueError('Укажите название')
        food={'food_id':'U'+k.digest(row['candidate_id'])[:24], 'name_ru':name,'state':payload['state'],'allergens':payload['allergens'], 'source_ref':row['source_url'],'carb_basis':'total_includes_fiber', 'provenance':{'type':'usda_reference','candidate_id':row['candidate_id'],'release_hash':row['release_hash']},'source_review_confirmed':True,'recipe_eligible':False,'nutrient_status':'partial' if any(row.get(n) is None for n in k.CORE) else 'complete'}
        food.update({n:row.get(n) for n in k.NUTRIENTS})
        k.validate_custom_food(food)
        return food

    def own_dish(self,d,payload):
        k=core();cat=self.kitchen_catalog(d)
        if not isinstance(payload,dict) or set(payload)!={'recipe_id','name_ru','category','base_servings','active_minutes','ingredients','steps_ru'}:raise ValueError('Проверьте состав блюда')
        if not isinstance(payload['ingredients'],list) or not 1<=len(payload['ingredients'])<=20 or any(not isinstance(i,dict) or set(i)!={'food_id','grams_edible','state'} for i in payload['ingredients']):raise ValueError('Проверьте ингредиенты блюда')
        recipe=k.validate_custom_recipe(dict(payload,protein_family='other',usage='observational',confirmed=True),cat)
        cat['recipes'][recipe['recipe_id']]=recipe
        batch=k.calculate_recipe(cat,recipe['recipe_id'],recipe['base_servings'])
        portion=k.calculate_recipe(cat,recipe['recipe_id'],1)
        return recipe,{'whole_batch':batch,'per_portion':portion,'issues':k.check_recipe(d['core']['profile'],batch),'usage':'observational','servings':recipe['base_servings'],'steps_ru':recipe['steps_ru']}

    def kitchen_proposal_preview(self,d,action,payload):
        if action=='own_dish_save':return self.own_dish(d,payload)[1]
        if action=='own_dish_diary':
            cat=self.kitchen_catalog(d);return core().calculate_recipe(cat,payload['recipe_id'],float(payload['fraction'])*(cat['recipes'][payload['recipe_id']]['base_servings'] if payload['basis']=='batch' else 1))
        if action=='source_import':
            food=self.source_import_food(d,payload)
            return {'food':food,'original_name':food_source.candidate(payload['candidate_id'],self.base['foods'])['name_en']}
        if action=='pantry':
            cat=self.kitchen_catalog(d)
            return {'items':[dict(i,name_ru=cat['foods'][i['food_id']]['name_ru']) for i in payload['items']]}
        if action=='accept_day':
            group=topic(d,payload['thread_id'])['kitchen'];drafts=init(d)['drafts']
            return {'day_items':[drafts[rid]['recipe']['name_ru'] for rid in group['candidate_ids']]}
        if action not in ('save','favorite','diary','rate'):return None
        entry=init(d)['drafts'][payload['recipe_id']];rec=entry['recipe'];cat=self.kitchen_catalog(d);cat['recipes'][rec['recipe_id']]=rec
        portions=float(payload.get('fraction',1))*(rec['base_servings'] if payload.get('basis')=='batch' else 1)
        return core().calculate_recipe(cat,rec['recipe_id'],portions)

    def kitchen_snapshot(self,d):
        block=init(d);cat=self.kitchen_catalog(d)
        return {'version':block['version'],'diary_recipe_names':{e['recipe_id']:cat['recipes'][e['recipe_id']]['name_ru'] for e in d['core']['diary'] if e.get('recipe_id') in cat['recipes']},'pantry':[dict(i,name_ru=cat['foods'][i['food_id']]['name_ru']) for i in block['pantry'] if i['food_id'] in cat['foods']],'preferences':copy.deepcopy(block['preferences']),'ratings':copy.deepcopy(block['ratings']),'own_recipes':[{'recipe_id':rid,'name_ru':rec['name_ru']} for rid,rec in d['core'].get('custom_recipes',{}).items() if rec.get('usage')=='observational'],'saved_recipes':[rid for rid in d['core'].get('custom_recipes',{}) if rid.startswith('RK')],'memory_limits':'Только подтверждённые факты и до 5 собственных цитат; не безграничная память. Удаление темы не удаляет общие факты.','region':POLICY['region'],'today_summary':daily_summary(d,cat),
            'pantry_origin':next(({'origin':'explicit_user_confirmation','at':r['at']} for r in reversed(list(d['receipts'].values())) if r['type']=='kitchen.pantry'),None),
            'legacy_disliked':[{'food_id':fid,'name_ru':cat['foods'][fid]['name_ru']} for fid in d['core']['profile']['settings']['disliked_food_ids'] if fid not in {fid for pref in block['preferences'] for fid in pref['food_ids']}],
            'favorites_details':[{'recipe_id':rid,'name_ru':cat['recipes'][rid]['name_ru']} for rid in d['core']['profile']['settings']['favorites'] if rid in cat['recipes']]}

    def kitchen_recent_chat(self,d,tid):
        changed=init(d).get('facts_changed_at')
        return [m for m in topic(d,tid)['messages'][-8:] if not changed or m.get('at','')>changed]

    def kitchen_context(self,d,message,tid):
        return {'confirmed_kitchen':self.kitchen_snapshot(d),'own_historical_quotes':recall(d,message,tid),'retrieved_guidance':source_retrieval(message)}

    def kitchen_validate_change(self,d,action,payload):
        k=core();cat=self.kitchen_catalog(d);block=init(d)
        if not isinstance(payload,dict):raise ValueError('Неверное изменение кухни')
        if action in ('own_dish_save','own_dish_diary') and not d.get('processing_consent'):raise ValueError('Сначала разрешите личное хранение и обработку')
        if action=='own_dish_save':
            recipe,_=self.own_dish(d,payload)
            if recipe['recipe_id'] in cat['recipes']:raise ValueError('Блюдо уже сохранено')
            if len(d['core'].get('custom_recipes',{}))>=30:raise ValueError('Не больше 30 личных рецептов')
        elif action=='own_dish_diary':
            if set(payload)!={'recipe_id','fraction','basis','date'} or payload['recipe_id'] not in cat['recipes'] or cat['recipes'][payload['recipe_id']].get('usage')!='observational':raise ValueError('Выберите сохранённое блюдо')
            if not isinstance(payload['date'],str) or not re.fullmatch(r'\d{4}-\d{2}-\d{2}',payload['date']):raise ValueError('Укажите дату приёма пищи')
            date.fromisoformat(payload['date'])
            k.number(payload['fraction'],'fraction',.05,6)
            if payload['basis'] not in ('portion','batch') or not d['core']['profile'].get('timezone'):raise ValueError('Уточните долю и часовой пояс')
            k.number(float(payload['fraction'])*(cat['recipes'][payload['recipe_id']]['base_servings'] if payload['basis']=='batch' else 1),'portions',.05,20)
        elif action=='source_import':
            self.source_import_food(d,payload)
        elif action=='pantry':
            if set(payload)!={'items'}:raise ValueError('Неверная кладовая')
            pantry_valid(payload['items'],cat)
        elif action=='remember':
            if set(payload)!={'food_ids','text'} or not isinstance(payload['food_ids'],list) or not 1<=len(payload['food_ids'])<=40 or set(payload['food_ids'])-set(cat['foods']):raise ValueError('Укажите известные продукты предпочтения')
            k.clean_text(payload['text'],'preference',160)
            if len(block['preferences'])>=20:raise ValueError('Сначала удалите ненужное предпочтение')
        elif action=='forget':
            if set(payload)!={'fact_id'} or not any(p['id']==payload['fact_id'] for p in block['preferences']):raise ValueError('Предпочтение не найдено')
        elif action in ('save','favorite','rate','diary','accept_day'):
            allowed={'thread_id','recipe_id'}|({'rating'} if action=='rate' else {'fraction','basis'} if action=='diary' else set())
            if set(payload)!=allowed:raise ValueError('Неверные параметры рецепта')
            t=topic(d,payload['thread_id']);group=t.get('kitchen',{})
            if payload['recipe_id'] not in group.get('candidate_ids',[]):raise ValueError('Выберите действительный вариант текущей темы')
            if action=='accept_day':
                self.kitchen_day(d,group,require_valid=True)
                if len(set(d['core'].get('custom_recipes',{}))|set(group['candidate_ids']))>30:raise ValueError('Не больше 30 сохранённых рецептов')
            else:self.kitchen_card(d,payload['recipe_id'],group['spec'])
            if action in ('save','favorite') and len(d['core'].get('custom_recipes',{}))>=30 and payload['recipe_id'] not in d['core'].get('custom_recipes',{}):raise ValueError('Не больше 30 личных рецептов')
            if action=='rate':k.integer(payload['rating'],'rating',1,5)
            if action=='diary':
                k.number(payload['fraction'],'fraction',.05,6)
                if payload['basis'] not in ('portion','batch'):raise ValueError('Уточните долю порции или всего блюда')
                if not d['core']['profile'].get('timezone'):raise ValueError('Подтвердите часовой пояс для дневника')
            # Existing custom recipe safety validation remains mandatory for saves.
            if action!='accept_day' and action!='rate':
                rec=block['drafts'][payload['recipe_id']]['recipe'];calc=k.calculate_ingredients(rec['ingredients'],cat['foods'])
                if d['holds'] or d['core']['profile']['screening'].get('allergies_reviewed') is not True or k.check_recipe(d['core']['profile'],calc):raise k.SafetyError('Сначала проверьте ограничения и полноту состава; пока это справочная идея')
        else:raise ValueError('Неизвестное действие кухни')

    def kitchen_apply_change(self,d,action,payload,proposal_id):
        k=core();block=init(d)
        if action=='own_dish_save':
            recipe,_=self.own_dish(d,payload)
            d['core']=k.apply_event(d['core'],{'event_id':'own_'+proposal_id,'type':'catalog.recipe.add','payload':dict(payload,protein_family='other',usage='observational',confirmed=True),'confirmed':True},d['core']['state_revision'],d['core']['owner_account_id'],self.kitchen_catalog(d))
        elif action=='own_dish_diary':
            rec=self.kitchen_catalog(d)['recipes'][payload['recipe_id']];portions=float(payload['fraction'])*(rec['base_servings'] if payload['basis']=='batch' else 1)
            entry={'date':payload['date'],'recipe_id':payload['recipe_id'],'portions':portions,'intake_status':'confirmed','note':'Подтверждённая доля собственного блюда'}
            d['core']=k.apply_event(d['core'],{'event_id':'own_diary_'+proposal_id,'type':'diary.add','payload':entry,'confirmed':True},d['core']['state_revision'],d['core']['owner_account_id'],self.kitchen_catalog(d))
        elif action=='source_import':
            food=self.source_import_food(d,payload)
            d['core']=k.apply_event(d['core'],{'event_id':'source_'+proposal_id,'type':'catalog.food.add','payload':food,'confirmed':True},d['core']['state_revision'],d['core']['owner_account_id'],self.kitchen_catalog(d))
        elif action=='pantry':block['pantry']=pantry_valid(payload['items'],self.kitchen_catalog(d))
        elif action=='remember':
            old=set(d['core']['profile']['settings']['disliked_food_ids']);ids=set(payload['food_ids'])
            block['preferences'].append({'id':'pref_'+proposal_id,'food_ids':sorted(ids),'added_dislike_ids':sorted(ids-old),'text':payload['text'],'origin':'explicit_user_confirmation','at':k.utc_now()})
            d['core']=k.apply_event(d['core'],{'event_id':'pref_'+proposal_id,'type':'settings.update','payload':{'disliked_food_ids':sorted(old|ids)},'confirmed':True},d['core']['state_revision'],d['core']['owner_account_id'],self.kitchen_catalog(d))
        elif action=='forget':
            removed=next(p for p in block['preferences'] if p['id']==payload['fact_id']);block['preferences']=[p for p in block['preferences'] if p['id']!=payload['fact_id']]
            others={fid for pref in block['preferences'] for fid in pref['food_ids']}
            for fid in set(removed.get('added_dislike_ids',[])) & others:
                successor=next(pref for pref in block['preferences'] if fid in pref['food_ids'])
                successor['added_dislike_ids']=sorted(set(successor.get('added_dislike_ids',[]))|{fid})
            ids=set(d['core']['profile']['settings']['disliked_food_ids'])-(set(removed.get('added_dislike_ids',[]))-others)
            d['core']=k.apply_event(d['core'],{'event_id':'forget_'+proposal_id,'type':'settings.update','payload':{'disliked_food_ids':sorted(ids)},'confirmed':True},d['core']['state_revision'],d['core']['owner_account_id'],self.kitchen_catalog(d))
        else:
            rid=payload['recipe_id'];group=topic(d,payload['thread_id'])['kitchen']
            ids=group['candidate_ids'] if action=='accept_day' else [rid]
            if action=='rate':block['ratings'][rid]={'rating':payload['rating'],'at':k.utc_now()}
            else:
                for item in ids:
                    if item not in d['core'].get('custom_recipes',{}):
                        recipe=block['drafts'][item]['recipe'];d['core']=k.apply_event(d['core'],{'event_id':f'kitchen_{proposal_id}_{item}','type':'catalog.recipe.add','payload':recipe,'confirmed':True},d['core']['state_revision'],d['core']['owner_account_id'],self.kitchen_catalog(d))
                if action=='favorite':
                    favorites=list(dict.fromkeys(d['core']['profile']['settings']['favorites']+[rid]))
                    d['core']=k.apply_event(d['core'],{'event_id':'fav_'+proposal_id,'type':'settings.update','payload':{'favorites':favorites},'confirmed':True},d['core']['state_revision'],d['core']['owner_account_id'],self.kitchen_catalog(d))
                elif action=='diary':
                    portions=float(payload['fraction'])*(block['drafts'][rid]['recipe']['base_servings'] if payload['basis']=='batch' else 1)
                    entry={'date':datetime.now(ZoneInfo(d['core']['profile']['timezone'])).date().isoformat(),'recipe_id':rid,'portions':portions,'intake_status':'confirmed','note':'Подтверждённая доля '+('всего блюда' if payload['basis']=='batch' else 'порции')}
                    d['core']=k.apply_event(d['core'],{'event_id':'diary_'+proposal_id,'type':'diary.add','payload':entry,'confirmed':True},d['core']['state_revision'],d['core']['owner_account_id'],self.kitchen_catalog(d))
                elif action=='accept_day':
                    plan=self.kitchen_day(d,group,require_valid=True)['plan']
                    d['core']=k.apply_event(d['core'],{'event_id':'day_'+proposal_id,'type':'plan.accept','payload':plan,'confirmed':True},d['core']['state_revision'],d['core']['owner_account_id'],self.kitchen_catalog(d))
                if action=='accept_day':
                    block.setdefault('plan_pantry',{})[plan['plan_id']]=copy.deepcopy(group['spec']['pantry']);block['plan_pantry']=dict(list(block['plan_pantry'].items())[-8:])
                    block.setdefault('plan_servings',{})[plan['plan_id']]=group['spec']['servings']
                    block['plan_servings']={pid:n for pid,n in block['plan_servings'].items() if pid in block['plan_pantry']}
                block['accepted']=(block['accepted']+[{'recipe_id':item,'name_ru':block['drafts'][item]['recipe']['name_ru'],'thread_id':payload['thread_id'],'method_id':block['drafts'][item]['method_id'],'food_ids':[i['food_id'] for i in block['drafts'][item]['recipe']['ingredients']],'at':k.utc_now()} for item in ids])[-30:]
        if action in ('remember','forget'):block['facts_changed_at']=k.utc_now()
        if action in ('remember','forget','pantry'):
            # Cached suggestions never retain forgotten preferences or old stock.
            invalidate(d)
        block['ratings']=dict(list(block['ratings'].items())[-30:])

    def kitchen_card(self,d,rid,spec):
        k=core();entry=init(d)['drafts'].get(rid)
        if not entry:raise ValueError('Черновик устарел: приготовьте новые варианты')
        rec=entry['recipe'];raw={'method_id':entry['method_id'],'title':rec['name_ru'],'flavor':'домашний','servings':rec['base_servings'],'ingredients':[{'food_id':i['food_id'],'grams':i['grams_edible']} for i in rec['ingredients']]}
        validate_draft(raw,spec,d,self.kitchen_catalog(d),entry['origin'])
        cat=self.kitchen_catalog(d);cat['recipes'][rid]=rec
        portion=k.calculate_recipe(cat,rid,1);batch=k.calculate_recipe(cat,rid,rec['base_servings'])
        targets=d['core']['profile'].get('targets');note='Справочная идея: нет активных подтверждённых ориентиров.';budget=None
        if targets and not d['holds'] and k.screen_profile(d['core']['profile'])['can_plan']:
            from .planning import ensure_current
            try:ensure_current(d)
            except ValueError:note='Ориентиры устарели: пока только справочная идея.'
            else:
                carb='carbohydrate_total_g' if targets['carb_basis']=='total' else k.DERIVED
                zone=d['core']['profile'].get('timezone');today=datetime.now(ZoneInfo(zone)).date().isoformat() if zone else None
                entries_today=[r for r in d['core']['diary'] if r['date']==today]
                logged=[r for r in entries_today if r.get('intake_status')=='confirmed']
                used=0;known=all(r.get('intake_status')=='confirmed' for r in entries_today)
                for r in logged:
                    if r.get('recipe_id') not in cat['recipes']:known=False;continue
                    value=k.calculate_recipe(cat,r['recipe_id'],r.get('portions',1))['nutrition'][carb]
                    if value is None:known=False
                    else:used+=value
                remaining=max(0,targets['carb_max_g']-used) if known else None
                budget={'carb_basis':targets['carb_basis'],'daily_max_g':targets['carb_max_g'],'confirmed_logged_g':used if known else None,'remaining_g':remaining,'meal_assumption_g':remaining/d['core']['profile']['settings']['meals_per_day'] if remaining is not None else None,'diary_complete_for_budget':known,'known_subtotal_g':used}
                value=portion['nutrition'][carb];allot=budget['meal_assumption_g']
                note='Проверены аллергии и исключения. '+('Углеводы порции укладываются в условную равную долю остатка дня.' if value is not None and allot is not None and value<=allot else 'Углеводы превышают условную долю дня или данных недостаточно.')+' Равная доля — допущение продукта, не медицинская норма и не гарантия кетоза.'
                if not known:note+=' Есть записи без полного количества/состава; остаток углеводов не определён. Указанная сумма — только известная часть.'
        kcal=portion['nutrition'].get('energy_kcal');allocation=targets['energy_min_kcal']/d['core']['profile']['settings']['meals_per_day'] if targets else None
        groups={cat['foods'][i['food_id']]['group'] for i in rec['ingredients']}
        light=not (groups & {'egg','poultry','fish','meat','seafood','soy','dairy'}) or (kcal is not None and allocation is not None and kcal<allocation*.5)
        if light:note+=' Это небольшое блюдо или гарнир, не полноценный приём пищи по условному распределению дня. Дополнение можно подобрать в режиме докупки.'
        return {**portion,'meal_role':'side_or_light' if light else 'meal_idea','servings':rec['base_servings'],'whole_batch':batch,'missing':missing_list(batch['ingredients'],spec['pantry']),'origin':entry['origin'],'draft_label':LABEL if entry['origin']=='sol' else FALLBACK_LABEL,'fit_note':note,'budget':budget,'method_id':entry['method_id'],'sources':[{'source_id':'food:'+i['food_id'],'url':i['source_url']} for i in portion['ingredients']]+[POLICY['safety_source']],'equipment':spec['equipment'],'equipment_note':POLICY.get('equipment_notes',{}).get(spec['equipment'],''),'quantity_note':'Граммы без указанного запаса требуют взвешивания; кладовая не списана.'}

    def kitchen_fit_day(self,d,spec,cat,entries):
        from .portion_search import fit_portions
        from .planning import ensure_current
        k=core();p=d['core']['profile'];targets=p.get('targets')
        can_fit=bool(targets and not d['holds'] and k.screen_profile(p)['can_plan'])
        try:ensure_current(d)
        except ValueError:can_fit=False
        unique=list({e['recipe']['recipe_id']:e for e in entries}.values())[:48]
        calcs={e['recipe']['recipe_id']:k.calculate_ingredients(e['recipe']['ingredients'],cat['foods'],1/e['recipe']['base_servings']) for e in unique}
        end=time.monotonic()+2
        for attempt,combo in enumerate(itertools.combinations(unique,3) if can_fit else []):
            if attempt>=1500 or time.monotonic()>end:break
            factors=fit_portions([calcs[e['recipe']['recipe_id']] for e in combo],targets)
            if not factors:continue
            drafts=[];total={}
            try:
                for entry,factor in zip(combo,factors):
                    r=entry['recipe'];raw={'method_id':entry['method_id'],'title':r['name_ru'],'flavor':'домашний','servings':spec['servings'],'ingredients':[{'food_id':i['food_id'],'grams':round(i['grams_edible']*factor,3)} for i in r['ingredients']]}
                    fresh=validate_draft(raw,spec,d,cat,entry['origin']);drafts.append(fresh)
                    for i in fresh['recipe']['ingredients']:
                        fid=i['food_id'];total.setdefault(fid,dict(i,grams_edible=0));total[fid]['grams_edible']+=i['grams_edible']
                sums=k.calculate_ingredients(list(total.values()),cat['foods']);gaps=missing_list(sums['ingredients'],spec['pantry'])
                if spec['mode']=='pantry_only' and any(not x.get('stock_quantity_unknown') for x in gaps) or spec['mode']=='pantry_plus' and sum(not x.get('stock_quantity_unknown') for x in gaps)>spec['max_missing_items']:continue
                per_person=k.calculate_ingredients(list(total.values()),cat['foods'],1/spec['servings'])
                if not k.target_issues(per_person['nutrition'],targets):return drafts
            except ValueError:continue
        # Retain globally feasible entries even when full nutrition is infeasible.
        output=[];total={}
        for entry in entries:
            combined=copy.deepcopy(total)
            for i in entry['recipe']['ingredients']:
                fid=i['food_id'];combined.setdefault(fid,dict(i,grams_edible=0));combined[fid]['grams_edible']+=i['grams_edible']
            gaps=missing_list(k.calculate_ingredients(list(combined.values()),cat['foods'])['ingredients'],spec['pantry'])
            if spec['mode']=='pantry_only' and any(not x.get('stock_quantity_unknown') for x in gaps) or spec['mode']=='pantry_plus' and sum(not x.get('stock_quantity_unknown') for x in gaps)>spec['max_missing_items']:continue
            if entry['recipe']['recipe_id'] in [e['recipe']['recipe_id'] for e in output]:continue
            output.append(entry);total=combined
            if len(output)==3:break
        return output

    def kitchen_day(self,d,group,require_valid=False):
        k=core();spec=group['spec'];cat=self.kitchen_catalog(d);ids=group['candidate_ids'];issues=[]
        # Use per-person portions for daily nutrition; batch stock for all eaters.
        for rid in ids:cat['recipes'][rid]=init(d)['drafts'][rid]['recipe']
        total_ingredients={}
        for rid in ids:
            self.kitchen_card(d,rid,spec)
            for i in cat['recipes'][rid]['ingredients']:
                key=i['food_id'];total_ingredients.setdefault(key,dict(i,grams_edible=0));total_ingredients[key]['grams_edible']+=i['grams_edible']
        calculation=k.calculate_ingredients(list(total_ingredients.values()),cat['foods']) if total_ingredients else None
        missing=missing_list(calculation['ingredients'],spec['pantry']) if calculation else []
        if spec['mode']=='pantry_only' and missing:issues.append('global_inventory_shortfall')
        if spec['mode']=='pantry_plus' and len(missing)>spec['max_missing_items']:issues.append('global_missing_item_limit')
        if len(ids)!=3:issues.append('three_meals_unavailable')
        from .planning import ensure_current
        try:ensure_current(d)
        except ValueError:issues.append('stale_targets')
        if d['holds'] or not k.screen_profile(d['core']['profile'])['can_plan']:issues.append('safety_or_screening')
        if not d['core']['profile'].get('targets'):issues.append('confirmed_targets_required')
        plan=None
        if not issues:
            day=datetime.now(ZoneInfo(d['core']['profile'].get('timezone') or 'UTC')).date().isoformat()
            # Core catalogue hashing remains stable when these are saved as custom recipes.
            temp=copy.deepcopy(d['core']);temp.setdefault('custom_recipes',{}).update({rid:k.validate_custom_recipe(cat['recipes'][rid],cat) for rid in ids})
            cat=k.merge_personal_catalog(self.base,temp)
            try:plan=k.build_plan(cat,d['core']['profile'],[{'date':day,'picks':[{'recipe_id':rid,'portions':1,'slot':slot} for rid,slot in zip(ids,('breakfast','lunch','dinner'))]}]);issues.extend(plan['days'][0]['issues'])
            except k.KetoError as e:issues.append(str(e))
        if require_valid and issues:raise k.SafetyError('День не принят: '+', '.join(issues))
        return {'plan':plan,'accepted':False,'status':'calculated_draft' if not issues else 'partial_not_accepted','issues':issues,'shopping':missing,'inventory_for_servings':spec['servings']}

    def kitchen(self,subject,action='status',spec=None,request_id=None,thread_id=None,query='',recipe_id=None,values=None,expected_revision=None,kind='personal',recipe_timeout=None):
        from .domain import storage_consent
        k=core();d,v=self.load(subject,kind);block=init(d);cat=self.kitchen_catalog(d);tid=thread_id or d['active_thread'];t=topic(d,tid)
        if action=='source_search':
            opts=values or {}
            if set(opts)-{'cursor','limit'}:raise ValueError('Неизвестные параметры поиска')
            result=food_source.search(query,opts.get('cursor'),opts.get('limit',20),self.base['foods'])
            imported={f.get('provenance',{}).get('candidate_id') for f in d['core'].get('custom_foods',{}).values()}
            for row in result['candidates']:row['already_imported']=row['candidate_id'] in imported
            return result
        if action=='source_detail':
            opts=values or {}
            if set(opts)!={'candidate_id'}:raise ValueError('Выберите запись источника')
            return {'candidate':food_source.candidate(opts['candidate_id'],self.base['foods']),'model_called':False}
        if action=='foods':
            parsed=parse_products(query,cat)
            matches=[{'food_id':f['food_id'],'name_ru':f['name_ru'],'state':f['state'],'source_url':f['source_url']} for f in cat['foods'].values() if not query or query.casefold() in f['name_ru'].casefold() or query.split(' · ')[0].upper()==f['food_id'] or f['food_id'] in [i['food_id'] for i in parsed['pantry']] or (query.casefold().strip()=='сыр' and f.get('group')=='dairy' and re.search(r'сыр|моцарелл|фета|чеддер',f['name_ru'].casefold()))]
            return {'foods':matches,'total':len(matches),'parsed':parsed,'model_called':False}
        if not storage_consent(d) or not d['processing_consent']:raise ValueError('Сначала разрешите личное хранение и обработку; справочник доступен отдельно')
        if action=='food_portion':
            opts=values or {}
            if set(opts)-{'food_id','grams','gi'} or opts.get('food_id') not in cat['foods']:raise ValueError('Выберите продукт')
            food=cat['foods'][opts['food_id']]
            return {'food':{'name_ru':food['name_ru'],'state':food['state'],'source_url':food['source_url']},'portion':k.calculate_food_portion(food,opts.get('grams'),opts.get('gi')),'model_called':False}
        if action=='own_dish_detail':
            opts=values or {}
            if set(opts)!={'recipe_id'} or opts['recipe_id'] not in d['core'].get('custom_recipes',{}) or d['core']['custom_recipes'][opts['recipe_id']].get('usage')!='observational':raise ValueError('Сохранённое блюдо не найдено')
            rec=d['core']['custom_recipes'][opts['recipe_id']];batch=k.calculate_recipe(cat,rec['recipe_id'],rec['base_servings']);portion=k.calculate_recipe(cat,rec['recipe_id'],1)
            return {'preview':{'whole_batch':batch,'per_portion':portion,'issues':k.check_recipe(d['core']['profile'],batch),'usage':'observational','servings':rec['base_servings'],'steps_ru':rec['steps_ru']},'model_called':False}
        if action=='own_dish_calculate':
            _,preview=self.own_dish(d,values or {})
            return {'preview':preview,'model_called':False}
        if action in ('status','memory'):
            result={'kitchen':self.kitchen_snapshot(d),'state':self.snapshot(d),'model_called':False}
            group=t.get('kitchen')
            if group:
                result['spec']=group['spec'];result['recipes']=[self.kitchen_card(d,rid,group['spec']) for rid in group['candidate_ids'] if rid in block['drafts']]
                if group['spec']['meal']=='day':result['day']=self.kitchen_day(d,group)
            return result
        if action=='parse':
            parsed=parse_products(query,cat)
            parsed['food_names']={i['food_id']:cat['foods'][i['food_id']]['name_ru'] for i in parsed['pantry']}
            return {**parsed,'model_called':False}
        if action in ('pantry','remember','forget','save','favorite','rate','diary','accept_day','source_import','own_dish_save','own_dish_diary'):
            if expected_revision!=d['revision']:raise Conflict('Устаревший экран кухни')
            payload=copy.deepcopy(values or {})
            if action in ('save','favorite','rate','diary','accept_day'):payload.update(thread_id=tid,recipe_id=recipe_id)
            proposal=self._prepare(d,'kitchen.'+action,payload);self.save(subject,d,v)
            return {'proposal':proposal,'state':self.snapshot(d),'message':'Проверьте изменение и подтвердите. Пока не сохранено.','model_called':False}
        if action=='select':
            if expected_revision!=d['revision']:raise Conflict('Устаревшие варианты')
            group=t.get('kitchen',{})
            if recipe_id not in group.get('candidate_ids',[]):raise ValueError('Вариант не принадлежит текущей теме')
            card=self.kitchen_card(d,recipe_id,group['spec']);group['selected_id']=recipe_id;self.save(subject,d,v)
            return {'recipes':[card],'state':self.snapshot(d),'model_called':False,'message':'Вариант выбран для следующих действий; меню и дневник не изменены.'}
        if action!='generate':raise ValueError('Неизвестное действие кухни')
        spec=spec_valid(spec or {},block['pantry'],cat)
        if not isinstance(request_id,str) or not re.fullmatch(r'[A-Za-z0-9_-]{8,100}',request_id):raise ValueError('Неверный request_id')
        fingerprint=k.digest({'spec':spec,'thread_id':tid});old=block['requests'].get(request_id)
        if old:
            if old['hash']!=fingerprint:raise Conflict('request_id повторно использован с другим содержимым')
            if old['status']!='completed' or 'response' not in old:raise Conflict('Этот запрос уже начат или его экран устарел; результат не повторяется')
            return {**copy.deepcopy(old['response']),'state':self.snapshot(d),'replayed':True,'model_called':False}
        if expected_revision is not None and expected_revision!=d['revision']:raise Conflict('Устаревший экран кухни')
        if d['holds'] or k.screen_profile(d['core']['profile'])['status'] in ('blocked','clinician_review'):raise k.SafetyError('Подбор приостановлен: сначала разбор нового ограничения')
        if any(p['type']=='profile.update' and p['expires_at']>time.time() and set(p['payload']) & {'allergies','medications','screening'} for p in d['pending'].values()):raise k.SafetyError('Сначала подтвердите новые ограничения')
        if spec['mode']=='pantry_only' and not spec['pantry']:
            return {'recipes':[],'questions':['Добавьте продукты или выберите «Идеи без кладовой».'],'model_called':False,'state':self.snapshot(d)}
        context=context_for(d,spec,cat,tid);fallback=template_drafts(context,d,cat)
        if not fallback:return {'recipes':[],'questions':['Нет допустимого метода с этими продуктами, временем и оборудованием. Ограничения сохранены.'],'model_called':False,'state':self.snapshot(d)}
        today=datetime.now(timezone.utc).date().isoformat();u=d['usage']
        if u.get('day')!=today:u.clear();u.update(day=today,calls=0,input_tokens=0,output_tokens=0)
        if u['calls']>=int(os.getenv('KETO_DAILY_REQUEST_LIMIT','60')):raise ValueError('Дневной лимит Azure достигнут')
        u['calls']+=1;block['requests'][request_id]={'hash':fingerprint,'status':'pending','thread_id':tid}
        block['requests']=dict(list(block['requests'].items())[-100:]);v=self.save(subject,d,v)
        audit={'role':'recipe','deployment':'gpt-6.1-sol','reasoning_effort':'high','attempted':False,'input_tokens':0,'output_tokens':0,'status':'not_called'};chosen=[];failure=None
        try:
            raw,audit=self.recipe_designer.design(context,timeout=min(POLICY['limits']['designer_timeout_seconds'],recipe_timeout) if recipe_timeout is not None else POLICY['limits']['designer_timeout_seconds'])
            Draft202012Validator(recipe_schema([f['food_id'] for f in context['foods']],context['methods'])).validate({'recipes':raw})
            chosen=[validate_draft(r,spec,d,cat,'sol') for r in raw]
            signatures={(r['method_id'],tuple(sorted(i['food_id'] for i in r['recipe']['ingredients']))) for r in chosen}
            if len(signatures)!=len(chosen):raise ValueError('Повтор кандидата')
        except RecipeUnavailable as e:failure=str(e);audit=e.audit or audit;chosen=[]
        except (ValueError,KeyError,TypeError):failure='RECIPE_VALIDATION_FAILED';audit['status']='rejected';chosen=[]
        except Exception:
            # jsonschema/provider errors disclose no prompt or provider response.
            failure='RECIPE_VALIDATION_FAILED';audit['status']='rejected';chosen=[]
        if spec['meal']=='day' and chosen:
            combined={}
            for entry in chosen:
                for i in entry['recipe']['ingredients']:
                    fid=i['food_id'];combined.setdefault(fid,dict(i,grams_edible=0));combined[fid]['grams_edible']+=i['grams_edible']
            gaps=missing_list(core().calculate_ingredients(list(combined.values()),cat['foods'])['ingredients'],spec['pantry'])
            if spec['mode']=='pantry_only' and any(not x.get('stock_quantity_unknown') for x in gaps) or spec['mode']=='pantry_plus' and sum(not x.get('stock_quantity_unknown') for x in gaps)>spec['max_missing_items']:
                chosen=[];failure='RECIPE_GLOBAL_INVENTORY_FAILED'
        # Fill feasible distinct dishes with explicitly labelled templates, never retry.
        signatures={(r['method_id'],tuple(sorted(i['food_id'] for i in r['recipe']['ingredients']))) for r in chosen}
        used_methods={r['method_id'] for r in chosen}
        ordered=[]
        for entry in fallback:
            if entry['method_id'] not in used_methods:
                ordered.append(entry);used_methods.add(entry['method_id'])
        ordered += [entry for entry in fallback if entry not in ordered]
        for entry in ordered:
            signature=(entry['method_id'],tuple(sorted(i['food_id'] for i in entry['recipe']['ingredients'])))
            if len(chosen)>=3:break
            if signature not in signatures:
                if spec['meal']=='day':
                    combined={}
                    for candidate in chosen+[entry]:
                        for i in candidate['recipe']['ingredients']:
                            fid=i['food_id'];combined.setdefault(fid,dict(i,grams_edible=0));combined[fid]['grams_edible']+=i['grams_edible']
                    total=core().calculate_ingredients(list(combined.values()),cat['foods'])
                    gaps=missing_list(total['ingredients'],spec['pantry'])
                    if spec['mode']=='pantry_only' and any(not x.get('stock_quantity_unknown') for x in gaps):continue
                    if spec['mode']=='pantry_plus' and sum(not x.get('stock_quantity_unknown') for x in gaps)>spec['max_missing_items']:continue
                chosen.append(entry);signatures.add(signature)
        if spec['meal']=='day':chosen=self.kitchen_fit_day(d,spec,cat,chosen+fallback)
        latest,version=self.load(subject,kind)
        if version!=v or not storage_consent(latest) or not latest['processing_consent']:raise Conflict('Согласие или состояние изменилось; ответ отброшен')
        d=latest;block=init(d);t=topic(d,tid)
        for entry in chosen:block['drafts'][entry['recipe']['recipe_id']]=entry
        block['drafts']=dict(list(block['drafts'].items())[-30:]);ids=[e['recipe']['recipe_id'] for e in chosen]
        group={'spec':spec,'candidate_ids':ids,'selected_id':ids[0] if len(ids)==1 else None,'at':k.utc_now()};t['kitchen']=group;t['choices']=ids
        for other in d['topics'].values():
            if other.get('kitchen') and any(rid not in block['drafts'] for rid in other['kitchen']['candidate_ids']):other.pop('kitchen',None);other['choices']=[]
        result={'recipes':[self.kitchen_card(d,rid,spec) for rid in ids],'spec':spec,'questions':[],'model_called':bool(audit.get('attempted')),'model_roles':[audit],'model_usage':{key:int(audit.get(key,0)) for key in ('input_tokens','output_tokens')},'fallback_reason':failure,'message':('Azure-дизайн недоступен или не прошёл проверку. Показаны проверяемые шаблоны.' if failure else 'Варианты рассчитаны. Проверьте состав и подтвердите отдельные сохранения.')}
        if len(ids)<3:result['questions'].append('С этими ограничениями получилось меньше трёх разных блюд; бесконечное разнообразие не обещается.')
        if spec['meal']=='day':result['day']=self.kitchen_day(d,group)
        if not audit.get('attempted'):d['usage']['calls']-=1
        for key in ('input_tokens','output_tokens'):d['usage'][key]+=int(audit.get(key,0))
        roles=d['usage'].setdefault('roles',{});role=roles.setdefault('recipe',{'calls':0,'input_tokens':0,'output_tokens':0});role['calls']+=int(bool(audit.get('attempted')))
        for key in ('input_tokens','output_tokens'):role[key]+=int(audit.get(key,0))
        block['requests'][request_id].update(status='completed',response=result)
        # Receipts store IDs, not a repeated private menu per request.
        for rid in list(block['requests'])[:-3]:block['requests'][rid].pop('response',None)
        d['revision']+=1
        self.save(subject,d,version)
        return {**result,'state':self.snapshot(d)}

    def kitchen_chat(self,subject,message,request_id,kind='personal',thread_id=None):
        """Explicit kitchen commands are local tools, no paid intent call required.

        Ambiguous/clinical conversation continues through the existing safety/intent
        layer. External quotes never enter this dispatcher.
        """
        from .domain import literal_guard, storage_consent
        msg=message.casefold();d,_=self.load(subject,kind);tid=thread_id or 'main';t=topic(d,tid);block=init(d)
        if literal_guard(message) or re.search(r'беремен|диабет|инсулин|форсиг|джардинс|поч[екч]|лекарств|аллерги|сглт|sglt|рпп|кормлю',msg):return None
        group=t.get('kitchen');explicit=bool(re.search(r'подведи.*итог|итоги дня|итоги за сегодня|сколько.*съел|сводка.*дня|без покупок|можно докупить|ничего нет|только из|из кладовой|сохрани рецепт|что ты обо мне помнишь|забудь.*предпочт|запомни.*не люблю|есть .*(?:ужин|завтрак|приготов|обед)',msg))
        follow=bool(group and re.search(r'вариант|второй|первый|третий|запиши.*половин|сохрани|докупить|без сыра',msg))
        explicit=explicit or bool(re.search(r'приготов|сделай|испеки|хочу',msg) and any(re.search(pattern,msg) for pattern in POLICY['equipment_patterns'].values()))
        if not explicit and not follow:return None
        if not d['processing_consent'] or not storage_consent(d):return None
        if not re.fullmatch(r'[A-Za-z0-9_-]{8,100}',request_id):raise ValueError('Неверный request_id')
        fingerprint=core().digest([message,tid]);old=d['requests'].get(request_id)
        if old:
            if old['hash']!=fingerprint:raise Conflict('request_id повторно использован с другим содержимым')
            if old['status']!='completed':raise Conflict('Запрос не завершён')
            return {'message':old['reply'],'state':self.snapshot(d),'model_called':False,'replayed':True}
        result=None;action=None;values={};rid=group.get('selected_id') if group else None
        if re.search(r'подведи.*итог|итоги дня|итоги за сегодня|сколько.*съел|сводка.*дня',msg):
            summary=daily_summary(d,self.kitchen_catalog(d));n=summary['nutrition']
            if n:
                fields=[('energy_kcal','ккал'),('protein_g','г белка'),('carbohydrate_total_g','г общих углеводов'),('fiber_g','г клетчатки')]
                reply='По подтверждённым записям: '+', '.join(('нет данных' if n[key] is None else str(round(n[key],1)))+' '+label for key,label in fields)+'. '
            else:reply='Сегодня пока нет записей с подтверждёнными граммовками. '
            reply+=summary['note']
            if summary['unquantified_entries']:reply+=' Ещё записей без полного количественного состава: '+str(summary['unquantified_entries'])+'.'
            result={'message':reply,'daily_summary':summary,'open_view':'diary','model_called':False}
        elif re.search(r'что ты обо мне помнишь',msg):
            result={'message':'Помню только подтверждённые настройки: '+('; '.join(p['text'] for p in block['preferences']) or 'кухонных предпочтений пока нет')+'. Полный список можно проверить и изменить в «Что я помню».','open_view':'memory','model_called':False}
        elif re.search(r'забудь.*предпочт',msg):
            if len(block['preferences'])==1:action='forget';values={'fact_id':block['preferences'][0]['id']}
            else:result={'message':'Выберите конкретное предпочтение в «Что я помню», чтобы удалить его после подтверждения.','open_view':'memory','model_called':False}
        elif re.search(r'запомни.*не люблю',msg):
            tail=re.split(r'не люблю',msg,maxsplit=1)[1];ids=[]
            if re.search(r'рыб',tail):ids=[fid for fid,f in self.kitchen_catalog(d)['foods'].items() if f.get('group')=='fish']
            elif re.search(r'куриц|курин',tail):ids=[fid for fid,f in self.kitchen_catalog(d)['foods'].items() if re.search(r'куриц|курин',f['name_ru'],re.I)]
            elif re.search(r'яйц|яиц|яич',tail):ids=[fid for fid,f in self.kitchen_catalog(d)['foods'].items() if f.get('group')=='egg']
            else:
                for a in POLICY['aliases']:
                    if re.search(a['pattern'],tail):ids += [fid for fid in a['ids'] if fid in self.kitchen_catalog(d)['foods']]
            if ids:action='remember';values={'food_ids':sorted(set(ids)),'text':'Не люблю: '+tail.strip()[:130]}
            else:result={'message':'Уточните продукт из справочника; неизвестные предпочтения не буду угадывать.','open_view':'memory','model_called':False}
        elif group and group.get('spec',{}).get('meal')=='day' and re.search(r'сохрани (?:день|меню)|выбери (?:этот )?день|прими меню',msg):
            action='accept_day';rid=group['candidate_ids'][0] if group.get('candidate_ids') else None
        elif group and re.search(r'сохрани рецепт',msg):
            if rid:action='save'
            else:result={'message':'Какой вариант сохранить: первый, второй или третий?','model_called':False}
        elif group and re.search(r'запиши.*половин',msg):
            if not rid:result={'message':'Выберите вариант из этой темы. Затем уточните: половина порции или половина всего блюда?','model_called':False}
            elif re.search(r'порци|всего блюда',msg):action='diary';values={'fraction':.5,'basis':'portion' if 'порци' in msg else 'batch'}
            else:result={'message':'Половину одной порции или половину всего блюда? Масса будет рассчитана после уточнения и показана для подтверждения.','model_called':False}
        else:
            choice=re.search(r'второй|вторую|первый|первую|третий|третью|вариант\s*[123]',msg)
            number=(1 if 'втор' in choice[0] else 2 if 'трет' in choice[0] else int(choice[0][-1])-1 if choice[0][-1].isdigit() else 0) if choice else None
            if group and number is not None:
                if number>=len(group['candidate_ids']):result={'message':'В этой теме такого варианта нет. Выберите показанный рецепт.','model_called':False}
                else:
                    rid=group['candidate_ids'][number]
                    result=self.kitchen(subject,'select',thread_id=tid,recipe_id=rid,expected_revision=d['revision'],kind=kind)
            if result is None or group and re.search(r'без сыра|докупить',msg):
                s=copy.deepcopy(group['spec'] if group else {})
                parsed=parse_products(message,self.kitchen_catalog(d))
                if parsed['questions']:
                    result={'message':' '.join(q['text'] for q in parsed['questions']),'product_questions':parsed['questions'],'model_called':False,'open_view':'recipes'}
                else:
                    if parsed['pantry']:s['pantry']=parsed['pantry']
                    if re.search(r'ничего нет',msg):s.update(mode='inspiration',pantry=[])
                    if re.search(r'без покупок|только из|из кладовой',msg):s['mode']='pantry_only'
                    if 'докупить' in msg:
                        purchase=re.search(r'докупить\s+(?:(?:до|не больше)\s+)?(\d+|ноль|один|одну|два|две|три|четыре|пять)\b',msg)
                        count=2 if purchase is None else int(purchase[1]) if purchase[1].isdigit() else {'ноль':0,'один':1,'одну':1,'два':2,'две':2,'три':3,'четыре':4,'пять':5}[purchase[1]]
                        s.update(mode='pantry_plus',max_missing_items=count)
                    if re.search(r'без сыра',msg):s['avoid']=sorted(set(s.get('avoid',[]))|{fid for fid,f in self.kitchen_catalog(d)['foods'].items() if f.get('group')=='dairy' and re.search(r'\bсыр\b|моцарелл|фета|чеддер',f['name_ru'].casefold())})
                    if re.search(r'завтрак.*обед.*ужин|на день',msg):s['meal']='day'
                    else:
                        for word,meal in [('завтрак','breakfast'),('обед','lunch'),('ужин','dinner'),('перекус','snack')]:
                            if word in msg:s['meal']=meal
                    minutes=re.search(r'(\d{1,3})\s*мин',msg)
                    if minutes:s['time_budget']=int(minutes[1])
                    appliance_matches=[name for name,pattern in POLICY['equipment_patterns'].items() if re.search(pattern,msg)]
                    if len(appliance_matches)>1:
                        result={'message':'Для одного подбора выберите один прибор: мультиварку, аэрогриль, вафельницу, духовку или плиту. Сохранённые варианты пока не изменены.','model_called':False,'open_view':'recipes'}
                    elif 'multicooker' in appliance_matches and re.search(r'под давлен|скороварк',msg):
                        result={'message':'Режимы под давлением пока не поддерживаются: точная модель не задана. Выберите пар без давления, если он есть по инструкции, или другой прибор.','model_called':False,'open_view':'recipes'}
                    else:
                        if appliance_matches:s['equipment']=appliance_matches[0]
                        result=self.kitchen(subject,'generate',spec=s,request_id=request_id,thread_id=tid,kind=kind)
        if action:result=self.kitchen(subject,action,thread_id=tid,recipe_id=rid,values=values,expected_revision=d['revision'],kind=kind)
        latest,v=self.load(subject,kind)
        if not latest['processing_consent'] or not storage_consent(latest):raise Conflict('Согласие изменилось; ответ отброшен')
        t=topic(latest,tid);latest['active_thread']=tid;now=core().utc_now();reply=result.get('message') or ' '.join(str(q) for q in result.get('questions',[])) or 'Нет подходящих вариантов; ограничения не изменены.';result['message']=reply
        t['messages'] += [{'role':'user','text':message,'at':now},{'role':'assistant','text':reply,'at':now,'request_id':request_id,'request_hash':fingerprint}]
        latest['requests'][request_id]={'hash':fingerprint,'status':'completed','reply':reply,'thread_id':tid}
        latest['requests']=dict(list(latest['requests'].items())[-150:]);self.save(subject,latest,v)
        return {**result,'intent':'kitchen','state':self.snapshot(latest)}
