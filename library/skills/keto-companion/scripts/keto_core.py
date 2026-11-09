"""KETO Companion: deterministic nutrition and state engine, standard library only.
No network calls, credentials, medication dosing, or clinical diagnoses.
All input is data. This module never evaluates imported text or executes a recipe.
"""
from __future__ import annotations
import argparse, copy, csv, hashlib, io, itertools, json, math, random, re, sys, uuid
from collections import Counter, defaultdict
from datetime import date, datetime, timezone
from decimal import Decimal, InvalidOperation
from pathlib import Path
from typing import Any
from zoneinfo import ZoneInfo

ENGINE_VERSION = '0.1.0'
SCHEMA_VERSION = 1
NUTRIENTS = ('energy_kcal','protein_g','fat_g','carbohydrate_total_g','fiber_g',
             'saturated_fat_g','calcium_mg','iron_mg','magnesium_mg','potassium_mg',
             'sodium_mg','vitamin_d_ug','folate_dfe_ug','vitamin_b12_ug','vitamin_c_mg')
DERIVED = 'net_carbohydrate_g'
CORE = ('energy_kcal','protein_g','fat_g','carbohydrate_total_g','fiber_g')
ALLERGENS = {'milk','egg','fish','crustacean_shellfish','mollusc','tree_nut','peanut',
             'soy','sesame','wheat','gluten','celery','mustard','lupin','sulfite','coconut'}
ALIASES = {'молоко':'milk','яйцо':'egg','яйца':'egg','рыба':'fish','орехи':'tree_nut',
           'кунжут':'sesame','соя':'soy','арахис':'peanut','сельдерей':'celery',
           'креветки':'crustacean_shellfish','горчица':'mustard','глютен':'gluten',
           'пшеница':'wheat','моллюски':'mollusc','кокос':'coconut'}
SCREEN_FIELDS = ('adult','pregnant','breastfeeding','type1_diabetes','sglt2',
    'hypoglycemia_medication','kidney_disease','liver_pancreas_gallbladder_disease',
    'metabolic_contraindication','eating_disorder_risk','other_clinical_restrictions',
    'medications_reviewed','allergies_reviewed')
EMERGENCY = {'severe_breathing_difficulty','confusion','fainting','severe_hypoglycemia',
             'persistent_vomiting','severe_abdominal_pain','chest_pain'}
SGLT2_NAMES = ('эмпаглифлозин','дапаглифлозин','канаглифлозин','эртуглифлозин',
    'empagliflozin','dapagliflozin','canagliflozin','ertugliflozin',
    'джардинс','форсига','jardiance','farxiga','forxiga','invokana','steglatro',
    'synjardy','xigduo','синджарди','сигдуо','sotagliflozin')
HYPO_NAMES = ('insulin','инсулин','гликлазид','gliclazide','glimepiride',
              'глимепирид','glipizide','глибенкламид','glyburide','repaglinide','репаглинид')
DEFAULT_SETTINGS = dict(language='ru', theme='ivory-plum', meals_per_day=3,
    max_active_minutes=30, budget_level='balanced', max_recipe_repeats_per_week=2,
    favorites=[], disliked_food_ids=[], excluded_food_ids=[], favorite_cuisines=[],
    weight_tracking='off', show_calories=True, display_units='metric', photo_storage=False,
    email_enabled=False, reminders_enabled=False, preferred_checkin='weekly',
    remote_images=False, adaptive_preferences=True)

class KetoError(ValueError): pass
class ConflictError(KetoError): pass
class SafetyError(KetoError): pass

def canonical(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(',',':'), allow_nan=False)

def digest(value: Any) -> str:
    return hashlib.sha256(canonical(value).encode()).hexdigest()

def number(value: Any, name: str, lo: float | None = None, hi: float | None = None) -> Decimal:
    if isinstance(value, bool) or value is None:
        raise KetoError(f'{name}: требуется число, не bool/null')
    try: out = Decimal(str(value).strip().replace(',', '.'))
    except (InvalidOperation, ValueError): raise KetoError(f'{name}: неверное число') from None
    if not out.is_finite() or (lo is not None and out < Decimal(str(lo))) or (hi is not None and out > Decimal(str(hi))):
        raise KetoError(f'{name}: вне допустимого диапазона')
    return out

def integer(value: Any, name: str, lo: int, hi: int) -> int:
    n = number(value, name, lo, hi)
    if n != n.to_integral_value(): raise KetoError(f'{name}: требуется целое число')
    return int(n)

def strict_bool(value: Any, name: str, nullable=False):
    if type(value) is bool or (nullable and value is None): return value
    raise KetoError(f'{name}: требуется boolean')

def clean_text(value: Any, name='text', maxlen=2000) -> str:
    if not isinstance(value, str) or len(value) > maxlen or '\x00' in value:
        raise KetoError(f'{name}: неверный текст')
    return value.strip()

def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec='seconds')

def normal_allergen(value: str) -> str:
    v = clean_text(value, 'allergen', 80).casefold()
    v = ALIASES.get(v,v)
    if v not in ALLERGENS: raise SafetyError(f'Неизвестный аллерген {v}: нужна ручная проверка')
    return v

def load_catalog(directory: str | Path | None = None) -> dict:
    base = Path(directory) if directory else Path(__file__).resolve().parents[2] / 'keto-menu' / 'data'
    foods_list = json.loads((base/'foods.json').read_text())
    recipes_list = json.loads((base/'recipes.json').read_text())
    if not isinstance(foods_list,list) or not isinstance(recipes_list,list): raise KetoError('Некорректный каталог')
    foods = {x['food_id']:x for x in foods_list}; recipes={x['recipe_id']:x for x in recipes_list}
    if len(foods)!=len(foods_list) or len(recipes)!=len(recipes_list): raise KetoError('Дубли ID в каталоге')
    for f in foods.values():
        if not f.get('fdc_id') or not f.get('source_url') or not f.get('state'): raise KetoError('Нет происхождения продукта')
        for k in NUTRIENTS:
            if f.get(k) is not None: number(f[k], k,0)
        if f.get('fiber_g') is not None and f.get('carbohydrate_total_g') is not None and number(f['fiber_g'],'fiber')>number(f['carbohydrate_total_g'],'carbs'):
            raise KetoError('Клетчатка превышает общие углеводы в USDA записи')
        if not isinstance(f.get('allergens'),list): raise KetoError('Нужен список аллергенов')
        for a in f['allergens']: normal_allergen(a)
    for r in recipes.values():
        if not r.get('ingredients') or number(r.get('base_servings',1),'servings',0.01)>100: raise KetoError('Некорректный рецепт')
        calculate_ingredients(r['ingredients'],foods)
    return {'foods':foods,'recipes':recipes,'version':'2026-11-07','catalog_hash':digest([foods_list,recipes_list])}

def calculate_ingredients(ingredients: list, foods: dict, factor: Any=1, *, allow_unmapped: bool=True) -> dict:
    ineligible=[]
    if not isinstance(ingredients,list) or not 1<=len(ingredients)<=100: raise KetoError('Нужно 1–100 ингредиентов')
    factor=number(factor,'factor',0.001,100)
    sums={k:Decimal(0) for k in NUTRIENTS}; missing={k:[] for k in NUTRIENTS}; allergens=set(); details=[]
    for entry in ingredients:
        if not isinstance(entry,dict): raise KetoError('Неверный ингредиент')
        fid=entry.get('food_id'); f=foods.get(fid)
        if f is None: raise KetoError(f'Неизвестный продукт {fid}')
        if f.get('recipe_eligible') is False and not allow_unmapped: raise SafetyError('Продукт источника ещё не проверен для рецептов')
        grams=number(entry.get('grams_edible'),'grams_edible',0.001,5000)*factor
        state=entry.get('state')
        if state != f['state']: raise KetoError(f'{fid}: сырой/готовый вес не совпадает ({state} ≠ {f["state"]})')
        allergens.update(f['allergens'])
        if f.get('recipe_eligible') is False: ineligible.append(fid)
        for k in NUTRIENTS:
            if f.get(k) is None: missing[k].append(fid)
            else: sums[k]+=number(f[k],k,0)*grams/100
        details.append({'food_id':fid,'name_ru':f['name_ru'],'grams_edible':float(grams),
                        'state':state,'source_url':f['source_url']})
    values={k:round(float(v),6) if not missing[k] else None for k,v in sums.items()}
    complete_net=not missing['carbohydrate_total_g'] and not missing['fiber_g']
    net=sums['carbohydrate_total_g']-sums['fiber_g']
    values[DERIVED]=round(float(net),6) if complete_net else None
    coverage={k:{'complete':not missing[k],'known_subtotal':round(float(sums[k]),6),
                 'missing_food_ids':sorted(set(missing[k]))} for k in NUTRIENTS}
    coverage[DERIVED]={'complete':complete_net,'known_subtotal':None if not complete_net else values[DERIVED],
                      'missing_food_ids':sorted(set(missing['carbohydrate_total_g']+missing['fiber_g']))}
    return {'nutrition':values,'coverage':coverage,'allergens':sorted(allergens),'ingredients':details,'eligibility_reasons':['unmapped_food:'+fid for fid in sorted(set(ineligible))],
            'net_method':'USDA total carbohydrate minus fiber; no blanket polyol subtraction',
            'calculation':'sum(edible grams * nutrient per 100 g / 100); no retention/yield correction'}

def calculate_recipe(catalog: dict, recipe_id: str, portions: Any=1) -> dict:
    r=catalog['recipes'].get(recipe_id)
    if r is None: raise KetoError(f'Неизвестный рецепт {recipe_id}')
    portions=number(portions,'portions',0.05,30)
    factor=portions/number(r.get('base_servings',1),'base_servings',0.01)
    result=calculate_ingredients(r['ingredients'],catalog['foods'],factor)
    return dict(result,recipe_id=recipe_id,name_ru=r['name_ru'],portions=float(portions),
                steps_ru=r['steps_ru'],active_minutes=r['active_minutes'],category=r['category'],
                protein_family=r['protein_family'],usage=r.get('usage'),kitchen_tested=False)

def default_profile(subject_id: str, owner_account_id: str | None=None, demo=False) -> dict:
    return {'schema_version':SCHEMA_VERSION,'subject_id':clean_text(subject_id,'subject_id',80),
        'owner_account_id':owner_account_id,'subject_kind':'demo' if demo else 'personal',
        'profile_revision':0,'display_name':None,'timezone':None,'goal':None,
        'consent':{'storage':False,'health_data':False,'media_storage':False,'recorded_at':None},
        'screening':{k:None for k in SCREEN_FIELDS},'medications':[], 'allergies':[],
        'settings':copy.deepcopy(DEFAULT_SETTINGS),'targets':None,'last_screened_at':None,'baseline':{}}

def screen_profile(profile: dict, signals: list | None=None) -> dict:
    signals=signals or []
    if not isinstance(signals,list): raise KetoError('signals должен быть списком')
    urgent=sorted(set(signals)&EMERGENCY)
    if urgent: return {'status':'urgent','can_plan':False,'reasons':urgent,
        'message_ru':'Обычное планирование остановлено. При таких выраженных симптомах нужна срочная медицинская помощь; чат не может исключить опасное состояние.'}
    s=profile.get('screening',{})
    for k,v in s.items():
        if k not in SCREEN_FIELDS: raise KetoError(f'Неизвестное поле скрининга: {k}')
        strict_bool(v,k,nullable=True)
    missing=[k for k in SCREEN_FIELDS if s.get(k) is None]
    blocks=[]
    if s.get('adult') is False: blocks.append('adult_only')
    if profile.get('baseline',{}).get('age_years') is not None and number(profile['baseline']['age_years'],'age_years',0)<18:blocks.append('adult_only')
    for k in ('pregnant','breastfeeding','type1_diabetes','sglt2','metabolic_contraindication','eating_disorder_risk'):
        if s.get(k) is True: blocks.append(k)
    reviews=[k for k in ('hypoglycemia_medication','kidney_disease','liver_pancreas_gallbladder_disease','other_clinical_restrictions') if s.get(k) is True]
    for m in profile.get('medications',[]):
        if not isinstance(m,dict): raise KetoError('medications: нужен объект')
        name=clean_text(m.get('name',''),'medication name',200).casefold()
        cls=m.get('class')
        if any(x in name for x in SGLT2_NAMES) or cls=='sglt2': blocks.append('sglt2')
        elif any(x in name for x in HYPO_NAMES) or cls in ('insulin','sulfonylurea','hypoglycemia_risk'): reviews.append('hypoglycemia_medication')
        elif cls != 'reviewed_other': reviews.append('unknown_medication')
        elif not m.get('review_source'): reviews.append('missing_medication_review_source')
    if s.get('medications_reviewed') is False: missing.append('medications_reviewed')
    if s.get('allergies_reviewed') is False: missing.append('allergies_reviewed')
    try: [normal_allergen(x) for x in profile.get('allergies',[])]
    except SafetyError: reviews.append('unknown_allergen')
    if blocks: status='blocked'
    elif reviews: status='clinician_review'
    elif missing: status='onboarding_required'
    else: status='screened_no_reported_flags'
    return {'status':status,'can_plan':not(blocks or reviews or missing),
            'reasons':sorted(set(blocks+reviews+missing)),
            'message_ru':'Это проверка сообщённых данных, не медицинское разрешение и не диагноз.'}

def validate_settings(settings: dict, catalog: dict | None=None) -> dict:
    if not isinstance(settings,dict): raise KetoError('settings: нужен объект')
    if set(settings)-set(DEFAULT_SETTINGS): raise KetoError('Нельзя изменять неизвестные/медицинские параметры через settings')
    out=copy.deepcopy(DEFAULT_SETTINGS);out.update(settings)
    for k in ('photo_storage','email_enabled','reminders_enabled','show_calories','remote_images','adaptive_preferences'): strict_bool(out[k],k)
    for k,lo,hi in [('meals_per_day',2,4),('max_active_minutes',5,180),('max_recipe_repeats_per_week',1,7)]:out[k]=integer(out[k],k,lo,hi)
    for k,allowed in {'language':['ru','en'],'theme':['ivory-plum','light','dark'],
       'budget_level':['economy','balanced','flexible'],'weight_tracking':['off','weekly','custom'],
       'display_units':['metric'],'preferred_checkin':['off','weekly','custom']}.items():
        if out[k] not in allowed: raise KetoError(f'{k}: неизвестный вариант')
    for k in ('favorites','disliked_food_ids','excluded_food_ids','favorite_cuisines'):
        if not isinstance(out[k],list) or len(out[k])>100: raise KetoError(f'{k}: нужен ограниченный список')
        out[k]=list(dict.fromkeys(clean_text(x,k,100) for x in out[k]))
    if catalog:
        for k in ('disliked_food_ids','excluded_food_ids'):
            if set(out[k])-set(catalog['foods']): raise KetoError(f'{k}: неизвестный food_id')
        if set(out['favorites'])-set(catalog['recipes']): raise KetoError('favorites: неизвестный recipe_id')
    return out

def validate_baseline(value: dict) -> dict:
    allowed={'age_years','height_cm','weight_kg','equation_category','activity_factor','activity_note','measured_at'}
    if not isinstance(value,dict) or set(value)-allowed:raise KetoError('Неверные исходные измерения')
    out=copy.deepcopy(value)
    for key,lo,hi in [('age_years',0,120),('height_cm',80,240),('weight_kg',20,400),('activity_factor',1,2.5)]:
        if key in out:out[key]=float(number(out[key],key,lo,hi))
    if 'equation_category' in out and out['equation_category'] not in ('female','male','not_selected'):raise KetoError('Неизвестный коэффициент уравнения')
    for key in ('activity_note','measured_at'):
        if key in out:out[key]=clean_text(out[key],key,300)
    return out

def estimate_energy(profile: dict) -> dict:
    if not screen_profile(profile)['can_plan']:raise SafetyError('Оценка не используется при медицинских флагах/незавершённой анкете')
    b=validate_baseline(profile.get('baseline',{}))
    if set(('age_years','height_cm','weight_kg','equation_category','activity_factor','activity_note'))-set(b):raise KetoError('Недостаточно исходных параметров; коэффициент активности не подставляется автоматически')
    age=b['age_years'];sex=b['equation_category']
    if not 19<=age<=78 or sex not in ('female','male') or not b['activity_note']:raise SafetyError('Вне исходной области применения уравнения или коэффициент не согласован')
    rmr=10*b['weight_kg']+6.25*b['height_cm']-5*age+(5 if sex=='male' else -161)
    if rmr<=0:raise KetoError('Невозможная оценка')
    return {'resting_energy_estimate_kcal':round(rmr),'activity_factor_assumed':b['activity_factor'],
        'maintenance_estimate_kcal':round(rmr*b['activity_factor']),'target_prescription':None,
        'method':'Mifflin–St Jeor simplified; activity multiplier is an explicit assumption, not part of the original equation',
        'source_url':'https://pubmed.ncbi.nlm.nih.gov/2305711/','doi':'10.1093/ajcn/51.2.241',
        'caveat':'Расчётная оценка, не измеренный расход и не рекомендация дефицита. Точность индивидуально ограничена; цели обсуждаются отдельно.'}

def validate_targets(targets: dict | None) -> dict:
    if not isinstance(targets,dict) or targets.get('status')!='agreed' or not targets.get('agreed_at') or not targets.get('basis_note'):
        raise SafetyError('Сначала согласовать цели; демонстрационная калорийность не назначается автоматически')
    allowed={'status','agreed_at','basis_note','energy_min_kcal','energy_max_kcal','protein_min_g','protein_max_g','carb_basis','carb_max_g','fiber_min_g','saturated_fat_max_pct'}
    if set(targets)-allowed: raise KetoError('Неизвестные поля целей')
    out=copy.deepcopy(targets)
    for k,lo,hi in [('energy_min_kcal',1200,6000),('energy_max_kcal',1200,6000),('protein_min_g',1,300),('protein_max_g',1,350),('carb_max_g',1,300),('fiber_min_g',0,80),('saturated_fat_max_pct',1,30)]:
        out[k]=float(number(out.get(k),k,lo,hi))
    if out['energy_min_kcal']>out['energy_max_kcal'] or out['protein_min_g']>out['protein_max_g']: raise KetoError('Перепутаны границы целей')
    if out['carb_basis'] not in ('total','net_estimate'): raise KetoError('Нужно явно выбрать total или net_estimate')
    return out

def check_recipe(profile: dict, calc: dict) -> list:
    allergy={normal_allergen(a) for a in profile.get('allergies',[])}
    problems=list(calc.get('eligibility_reasons',[]))
    if calc.get('usage')=='observational':problems.append('observational_recipe')
    hits=allergy & set(calc['allergens'])
    if hits:problems.append('allergen:'+','.join(sorted(hits)))
    excluded=set(profile.get('settings',{}).get('excluded_food_ids',[]))
    hits=excluded & {i['food_id'] for i in calc['ingredients']}
    if hits:problems.append('excluded_food:'+','.join(sorted(hits)))
    if any(calc['nutrition'][k] is None for k in CORE): problems.append('missing_core_nutrition')
    return problems

def sum_calculations(calcs: list) -> dict:
    if not calcs: raise KetoError('Пустой план')
    out={};coverage={}
    for k in NUTRIENTS+(DERIVED,):
        vals=[c['nutrition'][k] for c in calcs]
        out[k]=round(sum(v for v in vals if v is not None),6) if all(v is not None for v in vals) else None
        coverage[k]={'complete':out[k] is not None,'known_subtotal':round(sum(c['coverage'][k].get('known_subtotal') or 0 for c in calcs),6)}
    return {'nutrition':out,'coverage':coverage}

def target_issues(n: dict, t: dict) -> list:
    issues=[]
    for k,lo,hi in [('energy_kcal',t['energy_min_kcal'],t['energy_max_kcal']),('protein_g',t['protein_min_g'],t['protein_max_g'])]:
        if n.get(k) is None:issues.append('unknown:'+k)
        elif not lo<=n[k]<=hi:issues.append('outside_target:'+k)
    carb='carbohydrate_total_g' if t['carb_basis']=='total' else DERIVED
    if n.get(carb) is None or n[carb]>t['carb_max_g']+1e-6:issues.append('carb_limit:'+carb)
    if n.get('fiber_g') is None or n['fiber_g']<t['fiber_min_g']-1e-6:issues.append('fiber_below_target')
    if n.get('saturated_fat_g') is None or not n.get('energy_kcal'):issues.append('unknown:saturated_fat_ratio')
    elif 900*n['saturated_fat_g']/n['energy_kcal']>t['saturated_fat_max_pct']+1e-6:issues.append('saturated_fat_above_target')
    return issues

def calculate_day(catalog: dict, profile: dict, day_date: str, picks: list) -> dict:
    date.fromisoformat(day_date)
    gate=screen_profile(profile)
    if not gate['can_plan']: raise SafetyError('План не разрешён: '+','.join(gate['reasons']))
    t=validate_targets(profile.get('targets'))
    if not isinstance(picks,list) or not 2<=len(picks)<=12:raise KetoError('Некорректное число компонентов дня')
    meals=[]
    for pick in picks:
        if set(pick)-{'recipe_id','portions','slot'}:raise KetoError('Импорт не может задавать собственные нутриенты/правила')
        slot=pick.get('slot')
        if slot not in ('breakfast','lunch','dinner','extra'):raise KetoError('Неизвестный приём пищи')
        c=calculate_recipe(catalog,pick.get('recipe_id'),pick.get('portions',1))
        problems=check_recipe(profile,c)
        if problems:raise SafetyError(';'.join(problems))
        meals.append(dict(c,slot=slot))
    totals=sum_calculations(meals)
    issues=target_issues(totals['nutrition'],t)
    return dict(totals,date=day_date,meals=meals,issues=issues,
        status='calculated_draft' if not issues else 'needs_review',
        profile_revision=profile.get('profile_revision',0),profile_hash=digest(profile),
        catalog_hash=catalog['catalog_hash'],engine_version=ENGINE_VERSION,
        caveats=['Расчёт по справочным данным, не анализ готового блюда.','Кухонное тестирование рецептов не проводилось.',
                 'Не доказательство кетоза или полной обеспеченности микронутриентами.'])

def build_plan(catalog: dict, profile: dict, days: list) -> dict:
    if not isinstance(days,list) or not 1<=len(days)<=35:raise KetoError('Нужно 1–35 дней')
    dates=[d['date'] for d in days]
    if len(set(dates))!=len(dates):raise KetoError('Дублирующиеся даты')
    result=[calculate_day(catalog,profile,d['date'],d['picks']) for d in days]
    plan={'schema_version':SCHEMA_VERSION,'kind':'meal_plan','subject_id':profile['subject_id'],
          'subject_kind':profile.get('subject_kind','personal'),'created_at':utc_now(),'status':'draft',
          'profile_revision':profile.get('profile_revision',0),'profile_hash':digest(profile),
          'catalog_hash':catalog['catalog_hash'],'engine_version':ENGINE_VERSION,'days':result}
    plan['plan_id']='plan_'+digest({k:plan[k] for k in ['subject_id','profile_hash','catalog_hash','days']})[:20]
    return plan

def plan_selection(plan: dict) -> list:
    return [{'date':d['date'],'picks':[{'recipe_id':m['recipe_id'],'portions':m['portions'],'slot':m['slot']} for m in d['meals']]} for d in plan['days']]

def approve_plan(catalog: dict, profile: dict, plan: dict, confirmed: bool) -> dict:
    if confirmed is not True:raise SafetyError('Нужно подтверждение выбранного меню')
    if plan.get('subject_id')!=profile.get('subject_id'):raise SafetyError('План другого человека')
    if plan.get('profile_hash')!=digest(profile) or plan.get('catalog_hash')!=catalog['catalog_hash']:
        raise ConflictError('Профиль/каталог изменился: сначала пересчёт')
    fresh=build_plan(catalog,profile,plan_selection(plan))
    if any(d['issues'] for d in fresh['days']):raise SafetyError('План не соответствует согласованным ограничениям')
    fresh.update(status='user_accepted',accepted_at=utc_now())
    return fresh

def shopping_list(plan: dict) -> list:
    grams=defaultdict(Decimal); metadata={}
    for d in plan['days']:
        for m in d['meals']:
            for i in m['ingredients']:
                key=(i['food_id'],i['state'])
                grams[key]+=number(i['grams_edible'],'grams',0)
                metadata[key]=i
    return [{'food_id':k[0],'state':k[1],'name_ru':metadata[k]['name_ru'],
             'grams_edible':round(float(g),2),'purchase_weight_note':'Съедобная масса в указанном состоянии; сырой вес покупки не выведен из готового.',
             'source_url':metadata[k]['source_url'],'checked':False} for k,g in sorted(grams.items())]

def preference_scores(feedback: list) -> dict:
    ratings=defaultdict(list)
    for f in feedback:
        if f.get('confirmed') is True:
            ratings[f['recipe_id']].append(float(number(f['rating'],'rating',1,5)))
    # Bayesian shrinkage here is a taste ranking heuristic, NOT a health or evidence score.
    return {rid:round((6+sum(vals))/(2+len(vals)),4) for rid,vals in ratings.items()}

def suggest_plan(catalog: dict, profile: dict, start_date: str, days=7, seed=17, feedback=None, attempts=2500) -> dict:
    from datetime import timedelta
    gate=screen_profile(profile)
    if not gate['can_plan']:raise SafetyError('Сначала скрининг: '+','.join(gate['reasons']))
    settings=validate_settings(profile.get('settings',{}),catalog); t=validate_targets(profile.get('targets'))
    days=integer(days,'days',1,14); attempts=integer(attempts,'attempts',1,10000)
    start=date.fromisoformat(start_date); rng=random.Random(seed); calc={}
    pools=defaultdict(list); avoid=set(settings['excluded_food_ids']+settings['disliked_food_ids'])
    for rid,r in catalog['recipes'].items():
        c=calculate_recipe(catalog,rid)
        if check_recipe(profile,c) or r['active_minutes']>settings['max_active_minutes']:continue
        if avoid & {i['food_id'] for i in r['ingredients']}:continue
        calc[rid]=c;pools[r['category']].append(rid)
    extras=pools['addon']+pools['snack']+pools['side']+pools['component']
    mains=pools['main']; breakfasts=pools['breakfast']
    if not mains or not breakfasts:raise KetoError('Нет подходящих блюд; ограничения не ослаблены')
    scores=preference_scores(feedback or []) if settings['adaptive_preferences'] else {}
    counts=Counter(); selected=[]; previous=set()
    for ix in range(days):
        # Repetition cap is enforced on rolling seven calendar days.
        recent=selected[max(0,ix-6):]
        counts=Counter(p['recipe_id'] for dd in recent for p in dd['picks'])
        b=[x for x in breakfasts if counts[x]<settings['max_recipe_repeats_per_week'] and x not in previous]
        m=[x for x in mains if counts[x]<settings['max_recipe_repeats_per_week'] and x not in previous]
        a=[x for x in extras if counts[x]<settings['max_recipe_repeats_per_week'] and x not in previous]
        if not b or len(m)<2 or (settings['meals_per_day']==4 and not a):raise KetoError('Не хватает разнообразия под ограничения; нужен выбор пользователя')
        best=None;best_score=-1e99
        for _ in range(attempts):
            rids=[rng.choice(b),*rng.sample(m,2)]
            if catalog['recipes'][rids[1]]['protein_family']==catalog['recipes'][rids[2]]['protein_family']:continue
            if a and (settings['meals_per_day']==4 or rng.random()<0.8):rids.append(rng.choice(a))
            base_energy=sum(calc[r]['nutrition']['energy_kcal'] for r in rids)
            scale=((t['energy_min_kcal']+t['energy_max_kcal'])/2)/base_energy
            if not .65<=scale<=1.65:continue
            # Round edible grams at export, not during constraints; portions fixed to 3 decimals.
            portion=round(scale,3)
            n={k:None if any(calc[r]['nutrition'][k] is None for r in rids) else sum(calc[r]['nutrition'][k]*portion for r in rids) for k in NUTRIENTS+(DERIVED,)}
            if target_issues(n,t):continue
            score=sum(scores.get(r,3) + (1 if r in settings['favorites'] else 0)-counts[r] for r in rids)
            score-=sum(catalog['recipes'][r]['active_minutes'] for r in rids)/120
            score+=sum(0.5 for r in rids if catalog['recipes'][r].get('cuisine_inspiration') in settings['favorite_cuisines'])
            if settings['budget_level']=='economy':score-=sum(2 for r in rids if catalog['recipes'][r].get('relative_cost')=='выше среднего')
            if score>best_score:
                best=(rids,portion);best_score=score
        if best is None:raise KetoError(f'День {ix+1}: допустимая комбинация не найдена; автоматического ослабления ограничений нет')
        rids,portion=best
        # 2-meal mode groups breakfast component with lunch, never drops its food.
        slots=['breakfast','lunch','dinner','extra']
        if settings['meals_per_day']==2:slots=['lunch','lunch','dinner','dinner']
        elif settings['meals_per_day']==3:slots=['breakfast','lunch','dinner','dinner']
        selected.append({'date':(start+timedelta(days=ix)).isoformat(),
                         'picks':[{'recipe_id':r,'portions':portion,'slot':slots[j]} for j,r in enumerate(rids)]})
        previous=set(rids)
    result=build_plan(catalog,profile,selected)
    result['planner_note']='Heuristic search, not a global optimum or a clinical protocol; cost not estimated without actual prices.'
    return result

def new_state(subject_id: str, owner_account_id: str, demo=False) -> dict:
    return {'schema_version':SCHEMA_VERSION,'kind':'keto_state','state_revision':0,'owner_account_id':owner_account_id,
        'subject_id':subject_id,'profile':default_profile(subject_id,owner_account_id,demo),
        'diary':[],'measurements':[],'feedback':[],'checklists':{},'plans':{},'events':[],'event_receipts':{},
        'change_proposals':[],'integration_receipts':[],'custom_foods':{},'custom_recipes':{},'settings_history':[],'updated_at':utc_now()}

def validate_diary(entry: dict) -> dict:
    allowed={'date','meal','note','energy_1_5','hunger_1_5','sleep_hours','weight_kg','symptoms',
             'photo_ref','recipe_id','portions','intake_status','food_id','grams','amount',
             'time','timezone','eaten_at','time_fold'}
    if not isinstance(entry,dict) or set(entry)-allowed:raise KetoError('Некорректные поля дневника')
    out=copy.deepcopy(entry)
    diary_date(out.get('date'))
    if 'note' in out:out['note']=clean_text(out['note'],'note',4000)
    for k in ('meal','recipe_id','food_id','photo_ref'):
        if k in out:out[k]=clean_text(out[k],k,500)
    if 'symptoms' in out and isinstance(out['symptoms'],list):out['symptoms']=[clean_text(x,'symptom',300) for x in out['symptoms']]
    for k in ('energy_1_5','hunger_1_5'):
        if k in out:out[k]=integer(out[k],k,1,5)
    for k,lo,hi in [('sleep_hours',0,24),('weight_kg',20,400),('portions',0.05,20),('grams',0.001,5000)]:
        if k in out:out[k]=float(number(out[k],k,lo,hi))
    if out.get('recipe_id') and out.get('food_id'):raise KetoError('Выберите одно блюдо или продукт')
    if 'amount' in out:
        amount=out['amount']
        if not isinstance(amount,dict) or set(amount)!={'value','unit'} or amount['unit'] not in ('portion','batch','g'):raise KetoError('Укажите количество и основу')
        out['amount']={'value':float(number(amount['value'],'amount',0.001,5000)),'unit':amount['unit']}
    if 'timezone' in out:
        try:ZoneInfo(out['timezone'])
        except (ValueError,TypeError,KeyError):raise KetoError('Укажите часовой пояс IANA') from None
    if 'time_fold' in out and (type(out['time_fold']) is not int or out['time_fold'] not in (0,1)):raise KetoError('Укажите вариант перехода часов 0 или 1')
    if 'time' in out and out['time'] is not None:
        if not isinstance(out['time'],str) or not re.fullmatch(r'(?:[01]\d|2[0-3]):[0-5]\d',out['time']):raise KetoError('Укажите время ЧЧ:ММ')
        if not out.get('timezone'):raise KetoError('Для времени нужен часовой пояс')
        if out.get('eaten_at'):
            try:
                consumed=datetime.fromisoformat(out['eaten_at']);local=consumed.astimezone(ZoneInfo(out['timezone']))
                if consumed.tzinfo is None or consumed.utcoffset()!=local.utcoffset() or local.date().isoformat()!=out['date'] or local.strftime('%H:%M')!=out['time']:raise ValueError()
            except (TypeError,ValueError):raise KetoError('Дата, время и часовой пояс еды не совпадают') from None
        else:
            consumed=local_time_to_utc(out['date']+'T'+out['time'],out['timezone'],out.get('time_fold'))
            local=consumed.astimezone(ZoneInfo(out['timezone']))
        if 'time_fold' in out and out['time_fold']!=local.fold:raise KetoError('Уточнение перехода часов не совпадает со временем')
        out['eaten_at']=local.isoformat();out['time_fold']=local.fold
    elif out.get('eaten_at'):
        try:
            consumed=datetime.fromisoformat(out['eaten_at']); zone=ZoneInfo(out['timezone'])
            local=consumed.astimezone(zone)
            if consumed.tzinfo is None or consumed.utcoffset()!=local.utcoffset() or local.date().isoformat()!=out['date']:raise ValueError()
        except (KeyError,TypeError,ValueError):raise KetoError('Дата, время и часовой пояс еды не совпадают') from None
        out['eaten_at']=consumed.isoformat();out['time']=local.strftime('%H:%M');out['time_fold']=local.fold
    else:
        out.pop('eaten_at',None);out.pop('time_fold',None)
    if out.get('intake_status','unquantified') not in ('confirmed','estimated','unquantified'):raise KetoError('Неверный статус записи')
    if 'symptoms' in out and (not isinstance(out['symptoms'],list) or len(out['symptoms'])>20):raise KetoError('Неверные симптомы')
    return out


def diary_date(value):
    if not isinstance(value,str) or not re.fullmatch(r'\d{4}-\d{2}-\d{2}',value):raise KetoError('Укажите дату еды ГГГГ-ММ-ДД')
    try:date.fromisoformat(value)
    except ValueError:raise KetoError('Неверная дата еды') from None
    return value


def intake_snapshot(entry: dict, catalog: dict) -> dict:
    """Create a compact immutable calculation basis from authoritative records only."""
    if entry.get('recipe_id'):
        rid=entry['recipe_id'];recipe=catalog['recipes'].get(rid)
        if recipe is None:raise KetoError('Блюдо не найдено')
        calc=calculate_recipe(catalog,rid,1)
        kind='own_dish' if recipe.get('usage')=='observational' else 'generated_recipe' if rid.startswith('RK') else 'catalog_recipe'
        records=[catalog['foods'][i['food_id']] for i in recipe['ingredients']]
        source={'kind':kind,'id':rid,'name_ru':recipe['name_ru'],'composition_hash':digest([recipe,records]),'source_urls':sorted({i['source_url'] for i in calc['ingredients']})}
        basis={'unit':'portion','quantity':1,'base_servings':recipe['base_servings']}
        available=None
    elif entry.get('food_id'):
        fid=entry['food_id'];food=catalog['foods'].get(fid)
        if food is None:raise KetoError('Продукт не найден')
        result=calculate_food_portion(food,100);calc=result['calculation'];available=result['available_carbohydrate_g']
        source={'kind':'product','id':fid,'name_ru':food['name_ru'],'state':food['state'],'composition_hash':digest(food),'source_urls':[food['source_url']]}
        basis={'unit':'g','quantity':100}
    else:raise KetoError('Выберите блюдо или продукт')
    return {'version':1,'source':source,'basis':basis,'nutrition':calc['nutrition'],'allergens':copy.deepcopy(calc['allergens']),
            'known_subtotals':{n:calc['coverage'][n]['known_subtotal'] for n in NUTRIENTS+(DERIVED,)},
            'missing_food_ids':{n:calc['coverage'][n].get('missing_food_ids',[]) for n in NUTRIENTS+(DERIVED,) if not calc['coverage'][n]['complete']},
            'available_carbohydrate_g':available}


def prepare_diary_entry(value: dict, catalog: dict | None, previous: dict | None=None) -> dict:
    """Normalize quantities and attach a server snapshot; callers cannot provide one."""
    entry=validate_diary(value)
    quantified=bool(entry.get('recipe_id') or entry.get('food_id')) and any(x in entry for x in ('amount','portions','grams'))
    if not quantified:return entry
    same_source=previous and all(previous.get(x)==entry.get(x) for x in ('recipe_id','food_id'))
    snapshot=copy.deepcopy(previous['nutrition_snapshot']) if same_source and previous.get('nutrition_snapshot') else intake_snapshot(entry,catalog or {'recipes':{},'foods':{}})
    amount=entry.get('amount') or {'value':entry.get('portions') if entry.get('recipe_id') else entry.get('grams'),'unit':'portion' if entry.get('recipe_id') else 'g'}
    value=number(amount['value'],'amount',0.001,5000);unit=amount['unit']
    if entry.get('recipe_id'):
        if unit not in ('portion','batch') or 'grams' in entry:raise KetoError('Для блюда нужна порция или доля всего блюда; готовая масса неизвестна')
        portions=value*(number(snapshot['basis']['base_servings'],'base_servings',0.1,30) if unit=='batch' else 1)
        portions=float(number(portions,'portions',0.05,20))
        if 'portions' in entry and abs(entry['portions']-portions)>1e-9:raise KetoError('Количество порций противоречит основе')
        entry['portions']=portions
    else:
        if unit!='g' or 'portions' in entry:raise KetoError('Для продукта нужна масса в граммах')
        grams=float(number(value,'grams',0.001,5000))
        if 'grams' in entry and abs(entry['grams']-grams)>1e-9:raise KetoError('Масса противоречит количеству')
        entry['grams']=grams
    entry['amount']={'value':float(value),'unit':unit};entry['nutrition_snapshot']=snapshot
    return entry


def diary_calculation(entry: dict, catalog: dict) -> dict | None:
    if entry.get('intake_status')!='confirmed':return None
    snapshot=entry.get('nutrition_snapshot')
    if snapshot:
        amount=entry.get('portions') if snapshot['basis']['unit']=='portion' else entry.get('grams')
        if amount is None:return None
        factor=number(amount,'amount',0.001,5000)/number(snapshot['basis']['quantity'],'basis',0.001)
        def scaled(value):return None if value is None else round(float(number(value,'nutrient',0)*factor),6)
        nutrition={n:scaled(snapshot['nutrition'][n]) for n in NUTRIENTS+(DERIVED,)}
        coverage={n:{'complete':nutrition[n] is not None,'known_subtotal':scaled(snapshot['known_subtotals'][n]),'missing_food_ids':snapshot['missing_food_ids'].get(n,[])} for n in nutrition}
        return {'nutrition':nutrition,'coverage':coverage,'available_carbohydrate_g':scaled(snapshot.get('available_carbohydrate_g')),'legacy_estimate':False}
    try:
        if entry.get('recipe_id') and entry.get('portions') is not None:calc=calculate_recipe(catalog,entry['recipe_id'],entry['portions'])
        elif entry.get('food_id') in catalog['foods'] and entry.get('grams') is not None:calc=calculate_food_portion(catalog['foods'][entry['food_id']],entry['grams'])['calculation']
        else:return None
    except KetoError:return None
    return {**calc,'legacy_estimate':True}


def diary_summary(entries: list, catalog: dict, day: str) -> dict:
    diary_date(day);entries=[e for e in entries if e.get('date')==day]
    calcs=[diary_calculation(e,catalog) for e in entries];known=[c for c in calcs if c is not None]
    unknown=len(entries)-len(known);summed=sum_calculations(known) if known else None
    coverage={n:{'complete':bool(known) and not unknown and summed['coverage'][n]['complete'],
                 'known_subtotal':summed['coverage'][n]['known_subtotal'] if summed and any(c['coverage'][n].get('known_subtotal') is not None for c in known) else None} for n in NUTRIENTS+(DERIVED,)}
    incomplete=unknown+sum(any(c['nutrition'][n] is None for n in NUTRIENTS+(DERIVED,)) for c in known)
    return {'date':day,'entry_count':len(entries),'empty':not entries,'known_entries':len(known),'unquantified_entries':unknown,
            'incomplete_entries':incomplete,'legacy_estimated_entries':sum(c.get('legacy_estimate',False) for c in known),
            'nutrition':summed['nutrition'] if summed else None,'coverage':coverage,
            'note':'Нет записей; фактическое потребление неизвестно.' if not entries else 'Сумма только подтверждённых записей с известными порциями, не вся фактически съеденная еда. Неизвестные значения не считаются нулём.'}

def validate_measurement_session(value: dict) -> dict:
    if not isinstance(value,dict) or set(value)-{'measured_at','timezone','glucose','bhb','context'}:raise KetoError('Неверные поля измерения')
    try:
        dt=datetime.fromisoformat(value['measured_at']); zone=ZoneInfo(value['timezone'])
        if dt.tzinfo is None or dt.utcoffset()!=dt.astimezone(zone).utcoffset():raise ValueError()
    except (KeyError,TypeError,ValueError,OverflowError):raise KetoError('Укажите дату, время и соответствующий часовой пояс') from None
    except Exception as exc:
        from zoneinfo import ZoneInfoNotFoundError
        if isinstance(exc,ZoneInfoNotFoundError):raise KetoError('Неизвестный часовой пояс') from None
        raise
    out={'measured_at':dt.isoformat(),'timezone':value['timezone']}
    for kind,units in [('glucose',('mmol/L','mg/dL')),('bhb',('mmol/L',))]:
        item=value.get(kind)
        if item is None:continue
        if not isinstance(item,dict) or set(item)!={'value','unit'} or item['unit'] not in units:raise KetoError('Неверная единица измерения')
        out[kind]={'value':float(number(item['value'],kind,0,10000)),'unit':item['unit']}
    if not any(x in out for x in ('glucose','bhb')):raise KetoError('Укажите хотя бы одно измерение')
    if 'context' in value:out['context']=clean_text(value['context'],'context',500)
    return out

def measurement_gki(session: dict) -> dict:
    g=session.get('glucose');b=session.get('bhb')
    if not g or not b:return {'value':None,'reason':'Для GKI нужны оба показателя крови в одной подтверждённой записи.'}
    glucose=number(g['value'],'glucose',0); ketones=number(b['value'],'bhb',0)
    if ketones==0:return {'value':None,'reason':'GKI не рассчитывается при нулевом BHB.'}
    if g['unit']=='mg/dL':glucose/=Decimal('18.016')
    return {'value':float(glucose/ketones),'reason':None}

def calculate_food_portion(food: dict, grams: Any, gi: dict | None=None) -> dict:
    calc=calculate_ingredients([{'food_id':food['food_id'],'grams_edible':grams,'state':food['state']}],{food['food_id']:food})
    available=calc['nutrition'][DERIVED]
    declared=food.get('declared_carbohydrate')
    if available is None and declared and declared.get('basis')=='available_excludes_fiber':available=float(number(declared['value'],'carbs',0)*number(grams,'grams',0.001,5000)/100)
    result={'calculation':calc,'available_carbohydrate_g':available,'gi_status':'unknown','gl':None,'gl_reason':'ГИ для этого продукта и приготовления не подтверждён.'}
    if gi is None:return result
    if not isinstance(gi,dict) or set(gi)!={'value','source','preparation','scale'}:raise KetoError('Укажите источник, приготовление и шкалу ГИ')
    val=number(gi['value'],'GI',0,1000)
    if not clean_text(gi['source'],'source',500) or gi['preparation']!=food['state'] or gi['scale']!='glucose_100':
        result['gl_reason']='Источник, приготовление или шкала ГИ не совпадают.';return result
    result['gi_status']='manual_source_reviewed';result['gi']=float(val)
    if available is None:result['gl_reason']='Доступные углеводы порции неизвестны.';return result
    result['gl']=float(val*Decimal(str(available))/100);result['gl_reason']=None
    return result

def apply_event(state: dict, event: dict, expected_revision: int, actor_account_id: str, catalog: dict | None=None) -> dict:
    if state.get('schema_version')!=SCHEMA_VERSION or state.get('kind')!='keto_state':raise KetoError('Неподдерживаемая схема')
    if actor_account_id != state.get('owner_account_id'):raise SafetyError('Другой владелец: запись запрещена')
    if not isinstance(event,dict) or set(event)-{'event_id','type','payload','confirmed','created_at'}:raise KetoError('Неверный event')
    eid=clean_text(event.get('event_id',''),'event_id',100)
    if not re.fullmatch(r'[A-Za-z0-9_-]{8,100}',eid):raise KetoError('Нужен устойчивый event_id')
    fp=digest(event)
    if eid in state.get('event_receipts',{}):
        if state['event_receipts'][eid]['hash']!=fp:raise ConflictError('event_id уже использован с другим содержимым')
        return copy.deepcopy(state)
    if expected_revision != state['state_revision']:raise ConflictError('Старая версия состояния')
    if event.get('confirmed') is not True:raise SafetyError('Нет подтверждённого действия пользователя')
    kind=event.get('type'); payload=event.get('payload')
    if not isinstance(payload,dict):raise KetoError('payload должен быть объектом')
    out=copy.deepcopy(state);p=out['profile']
    if kind!='consent.set' and not (p['consent']['storage'] and p['consent']['health_data']):
        raise SafetyError('Нет согласия самой пользовательницы на хранение')
    if kind=='consent.set':
        if set(payload)-{'storage','health_data','media_storage'}:raise KetoError('Неизвестное поле согласия')
        for k,v in payload.items():p['consent'][k]=strict_bool(v,k)
        p['consent']['recorded_at']=event.get('created_at') or utc_now()
    elif kind=='profile.update':
        allowed={'display_name','timezone','goal','screening','allergies','medications','baseline'}
        if set(payload)-allowed:raise KetoError('Нельзя менять служебные поля профиля')
        for k in ('display_name','goal'):
            if k in payload:p[k]=clean_text(payload[k],k,200)
        if 'baseline' in payload:p['baseline']=validate_baseline(payload['baseline'])
        if 'timezone' in payload:
            ZoneInfo(payload['timezone']);p['timezone']=payload['timezone']
        if 'screening' in payload:
            if not isinstance(payload['screening'],dict) or set(payload['screening'])-set(SCREEN_FIELDS):raise KetoError('Неизвестный скрининг')
            for k,v in payload['screening'].items():p['screening'][k]=strict_bool(v,k,nullable=True)
            p['last_screened_at']=event.get('created_at') or utc_now()
        if 'allergies' in payload:
            if not isinstance(payload['allergies'],list):raise KetoError('allergies: нужен список')
            p['allergies']=sorted({normal_allergen(x) for x in payload['allergies']})
        if 'medications' in payload:
            if not isinstance(payload['medications'],list) or len(payload['medications'])>50:raise KetoError('Неверные лекарства')
            p['medications']=copy.deepcopy(payload['medications'])
        screen_profile(p)
    elif kind in ('settings.update','settings.rollback'):
        before=copy.deepcopy(p['settings'])
        if kind=='settings.rollback':
            if set(payload)!={'history_event_id'}:raise KetoError('Нужен history_event_id')
            matched=[x for x in out.get('settings_history',[]) if x['event_id']==payload['history_event_id']]
            if not matched:raise KetoError('История настройки не найдена')
            p['settings']=validate_settings(matched[-1]['before'],catalog)
        else:p['settings']=validate_settings(dict(p['settings'],**payload),catalog)
        out.setdefault('settings_history',[]).append({'event_id':eid,'before':before,'after':copy.deepcopy(p['settings']),'kind':kind})
        out['settings_history']=out['settings_history'][-30:]

    elif kind=='targets.update':p['targets']=validate_targets(payload)
    elif kind in ('measurement.add','measurement.update','measurement.delete'):
        records=out.setdefault('measurements',[])
        if kind=='measurement.add':
            records.append(dict(validate_measurement_session(payload),measurement_id=eid,recorded_at=event.get('created_at') or utc_now()))
        else:
            if set(payload)!=({'measurement_id','session'} if kind=='measurement.update' else {'measurement_id'}):raise KetoError('Неверное исправление измерения')
            matches=[i for i,x in enumerate(records) if x['measurement_id']==payload['measurement_id']]
            if len(matches)!=1:raise KetoError('Измерение не найдено')
            ix=matches[0];previous=records[ix]
            if kind=='measurement.delete':records.pop(ix)
            else:records[ix]=dict(validate_measurement_session(payload['session']),measurement_id=previous['measurement_id'],recorded_at=previous['recorded_at'],updated_at=utc_now())
    elif kind=='diary.add':
        entry=prepare_diary_entry(dict(payload,**({'timezone':p['timezone']} if p.get('timezone') and 'timezone' not in payload else {})),catalog)
        if entry.get('photo_ref') and not p['consent']['media_storage']:raise SafetyError('Фото не разрешено сохранять')
        out['diary'].append(dict(entry,entry_id=eid,recorded_at=event.get('created_at') or utc_now()))
    elif kind in ('diary.update','diary.delete','diary.repeat'):
        allowed={'entry_id'} if kind=='diary.delete' else {'entry_id','changes'}
        if set(payload)-allowed or not payload.get('entry_id'):raise KetoError('Неверное исправление дневника')
        matches=[i for i,x in enumerate(out['diary']) if x['entry_id']==payload['entry_id']]
        if len(matches)!=1:raise KetoError('Запись дневника не найдена')
        ix=matches[0]
        if kind=='diary.delete':out['diary'].pop(ix)
        else:
            prev=out['diary'][ix]
            old={a:b for a,b in prev.items() if a not in ('entry_id','recorded_at','updated_at','nutrition_snapshot')}
            changes=payload.get('changes')
            if not isinstance(changes,dict):raise KetoError('changes должен быть объектом')
            if kind=='diary.repeat':
                if 'date' not in changes:raise KetoError('Выберите дату повторной записи')
                old={a:b for a,b in old.items() if a in {'date','meal','note','recipe_id','portions','food_id','grams','amount','intake_status','timezone'}}
            clock_changed=any(key in changes and changes[key]!=old.get(key) for key in ('date','time','timezone'))
            if (clock_changed or 'time_fold' in changes) and 'eaten_at' not in changes:old.pop('eaten_at',None)
            if clock_changed and 'time_fold' not in changes:old.pop('time_fold',None)
            if 'amount' in changes:
                old.pop('portions',None);old.pop('grams',None)
            elif set(changes)&{'portions','grams'}:old.pop('amount',None)
            source_changed=any(key in changes and changes[key]!=old.get(key) for key in ('recipe_id','food_id'))
            if source_changed:
                if 'recipe_id' in changes:old.pop('food_id',None);old.pop('grams',None)
                if 'food_id' in changes:old.pop('recipe_id',None);old.pop('portions',None)
                if 'amount' not in changes:old.pop('amount',None)
                merged=dict(old,**changes)
                if merged.get('intake_status')=='confirmed' and (merged.get('recipe_id') or merged.get('food_id')) and not any(key in merged for key in ('amount','portions','grams')):raise KetoError('Укажите количество новой еды')
            material=kind=='diary.repeat' or bool(set(changes)&{'amount','portions','grams','recipe_id','food_id','intake_status'})
            entry=prepare_diary_entry(dict(old,**changes),catalog,prev) if material else validate_diary(dict(old,**changes))
            if not material and prev.get('nutrition_snapshot'):entry['nutrition_snapshot']=copy.deepcopy(prev['nutrition_snapshot'])
            if entry.get('photo_ref') and not p['consent']['media_storage']:raise SafetyError('Фото не разрешено сохранять')
            if kind=='diary.repeat':out['diary'].append(dict(entry,entry_id=eid,recorded_at=event.get('created_at') or utc_now()))
            else:out['diary'][ix]=dict(entry,entry_id=prev['entry_id'],recorded_at=prev['recorded_at'],updated_at=utc_now())
    elif kind=='feedback.add':
        if set(payload)-{'recipe_id','rating','note','would_repeat'}:raise KetoError('Неверные поля отзыва')
        rid=payload.get('recipe_id')
        if not catalog or rid not in catalog['recipes']:raise KetoError('Неизвестный рецепт')
        feedback={'recipe_id':rid,'rating':integer(payload.get('rating'),'rating',1,5),'confirmed':True,'event_id':eid}
        if 'note' in payload:feedback['note']=clean_text(payload['note'],'note')
        if 'would_repeat' in payload:feedback['would_repeat']=strict_bool(payload['would_repeat'],'would_repeat')
        out['feedback'].append(feedback)
    elif kind=='catalog.food.add':
        food=validate_custom_food(payload)
        if food['food_id'] in out['custom_foods']:raise ConflictError('Продукт уже существует; исправление требует отдельной версии')
        out['custom_foods'][food['food_id']]=food
    elif kind=='catalog.recipe.add':
        if not catalog:raise KetoError('Нужен каталог')
        recipe=validate_custom_recipe(payload,catalog)
        if recipe['recipe_id'] in out['custom_recipes']:raise ConflictError('Рецепт уже существует')
        out['custom_recipes'][recipe['recipe_id']]=recipe
    elif kind=='checklist.set':
        if set(payload)!={'list_id','item_id','checked','label'}:raise KetoError('Неверный checklist')
        lid=clean_text(payload['list_id'],'list_id',100);item=clean_text(payload['item_id'],'item_id',100)
        out['checklists'].setdefault(lid,{})[item]={'checked':strict_bool(payload['checked'],'checked'),'label':clean_text(payload['label'],'label',500)}
    elif kind=='plan.accept':
        if not catalog:raise KetoError('Нужен каталог для проверки плана')
        accepted=approve_plan(catalog,p,payload,True);out['plans'][accepted['plan_id']]=accepted
    elif kind=='integration.receipt':
        if set(payload)-{'provider','external_id','status','action_id','url','summary'}:raise KetoError('Неверная квитанция')
        if payload.get('provider') not in ('google_drive','google_calendar','gmail'):raise KetoError('Неизвестный provider')
        if payload.get('status')!='verified' or not payload.get('external_id'):raise KetoError('Нет подтверждения внешнего результата')
        out['integration_receipts'].append(copy.deepcopy(payload))
    elif kind=='change.propose':
        if set(payload)-{'area','reason','proposal'} or payload.get('area') not in ('taste','cooking','interface','knowledge_review'):raise KetoError('Неверное предложение')
        out['change_proposals'].append({'id':eid,'status':'pending_review',**payload})
    else:raise KetoError('Неизвестный или запрещённый тип события')
    if kind in ('profile.update','settings.update','settings.rollback','targets.update','consent.set','catalog.food.add','catalog.recipe.add'):
        p['profile_revision']+=1
        # All previous approvals become stale if personal constraints/preferences change.
        for plan in out['plans'].values():
            if plan.get('status')=='user_accepted':plan['status']='stale_requires_recheck'
    out['state_revision']+=1;out['updated_at']=utc_now()
    out['events'].append({'event_id':eid,'type':kind,'recorded_at':out['updated_at']})
    out['event_receipts'][eid]={'hash':fp,'revision':out['state_revision']}
    return out

def safe_csv_cell(v: Any) -> Any:
    return "'"+v if isinstance(v,str) and v.lstrip().startswith(('=','+','-','@','\t','\r')) else v

def export_plan_csv(plan: dict) -> str:
    buf=io.StringIO();w=csv.writer(buf)
    w.writerow(['date','slot','recipe_id','portions','name_ru','energy_kcal','protein_g','fat_g','carbohydrate_total_g','fiber_g','net_carbohydrate_g'])
    for day in plan['days']:
        for m in day['meals']:
            w.writerow([safe_csv_cell(v) for v in [day['date'],m['slot'],m['recipe_id'],m['portions'],m['name_ru'],*[m['nutrition'][k] for k in CORE+(DERIVED,)]]])
    return buf.getvalue()

def import_plan_csv(text: str, catalog: dict, profile: dict) -> dict:
    if len(text.encode('utf-8'))>2_000_000:raise KetoError('CSV слишком большой')
    reader=csv.DictReader(io.StringIO(text.lstrip('\ufeff')))
    required={'date','slot','recipe_id','portions'}
    if not reader.fieldnames or not required.issubset(reader.fieldnames):raise KetoError('Нужны date,slot,recipe_id,portions')
    days={}
    for n,row in enumerate(reader):
        if n>=420:raise KetoError('Слишком много строк')
        day=row['date'];date.fromisoformat(day)
        # Ignore imported nutrient totals; recompute using trusted ingredient records.
        days.setdefault(day,[]).append({k:row[k] for k in ('slot','recipe_id','portions')})
    return build_plan(catalog,profile,[{'date':k,'picks':v} for k,v in sorted(days.items())])


def import_plan_json(text: str, catalog: dict, profile: dict) -> dict:
    if not isinstance(text,str) or len(text.encode('utf-8'))>2_000_000:raise KetoError('Слишком большой JSON')
    try:obj=json.loads(text)
    except ValueError:raise KetoError('Неверный JSON меню') from None
    if not isinstance(obj,dict) or obj.get('kind')!='meal_plan' or not isinstance(obj.get('days'),list):raise KetoError('Не тот формат меню')
    days=[]
    for d in obj['days']:
        if not isinstance(d,dict):raise KetoError('Неверный день')
        meals=d.get('picks',d.get('meals'))
        if not isinstance(meals,list):raise KetoError('Нет блюд')
        days.append({'date':d['date'],'picks':[{k:m[k] for k in ('recipe_id','portions','slot')} for m in meals]})
    # Imported totals, approvals, personal profile and instructions are never trusted.
    return build_plan(catalog,profile,days)

def replace_plan_meal(catalog: dict, profile: dict, plan: dict, day_date: str, meal_index: int, recipe_id: str, portions: Any=1) -> dict:
    if plan.get('subject_id')!=profile['subject_id']:raise SafetyError('Меню другого человека')
    days=plan_selection(plan);found=False
    for d in days:
        if d['date']==day_date:
            ix=integer(meal_index,'meal_index',0,len(d['picks'])-1)
            slot=d['picks'][ix]['slot'];d['picks'][ix]={'recipe_id':recipe_id,'portions':portions,'slot':slot};found=True
    if not found:raise KetoError('День не найден')
    return build_plan(catalog,profile,days)

def find_recipes(catalog: dict, profile: dict, available_food_ids: list | None=None, max_minutes: int | None=None, limit=8) -> list:
    limit=integer(limit,'limit',1,50);available=set(available_food_ids or [])
    if available-set(catalog['foods']):raise KetoError('Неизвестные продукты в запасах')
    settings=validate_settings(profile.get('settings',{}),catalog)
    minutes=max_minutes if max_minutes is not None else settings['max_active_minutes']
    minutes=integer(minutes,'max_minutes',5,180)
    rows=[]
    for rid,r in catalog['recipes'].items():
        calc=calculate_recipe(catalog,rid)
        if calc['active_minutes']>minutes or check_recipe(profile,calc):continue
        ids={x['food_id'] for x in calc['ingredients']}
        missing=sorted(ids-available) if available_food_ids is not None else []
        rows.append({'recipe_id':rid,'name_ru':r['name_ru'],'active_minutes':r['active_minutes'],
            'missing_food_ids':missing,'matched_pantry_ingredients':len(ids&available),
            'note':'Подбор рецептов, не утверждение суточного рациона.'})
    return sorted(rows,key=lambda x:(len(x['missing_food_ids']),-x['matched_pantry_ingredients'],x['active_minutes'],x['recipe_id']))[:limit]

def parse_state_document(text: str) -> dict:
    if not isinstance(text,str) or len(text.encode('utf-8'))>2_000_000:raise KetoError('Нужна архивация журнала; превышен лимит документа')
    try:state=json.loads(text)
    except (ValueError,TypeError):raise KetoError('Системный документ повреждён; не переписывать') from None
    if not isinstance(state,dict) or state.get('kind')!='keto_state' or state.get('schema_version')!=SCHEMA_VERSION:raise KetoError('Не тот документ состояния')
    required={'state_revision','owner_account_id','subject_id','profile','diary','feedback','checklists','plans','events','event_receipts','change_proposals','integration_receipts','custom_foods','custom_recipes'}
    if required-set(state):raise KetoError('Состояние неполное; запись запрещена')
    integer(state['state_revision'],'state_revision',0,1000000000)
    for key in ('owner_account_id','subject_id'):
        if not clean_text(state[key],key,200):raise KetoError('Пустой идентификатор')
    profile=state['profile']
    if not isinstance(profile,dict) or profile.get('owner_account_id')!=state['owner_account_id'] or profile.get('subject_id')!=state['subject_id']:raise SafetyError('Несогласованный владелец/субъект')
    consent=profile.get('consent',{})
    for key in ('storage','health_data','media_storage'):strict_bool(consent.get(key),key)
    if not isinstance(profile.get('screening'),dict):raise KetoError('Нет скрининга')
    if set(profile['screening'])!=set(SCREEN_FIELDS):raise KetoError('Неполный скрининг; нужно восстановление')
    if not isinstance(profile.get('allergies'),list) or not isinstance(profile.get('medications'),list):raise KetoError('Неверные медицинские поля')
    screen_profile(profile);validate_settings(profile.get('settings',{}));validate_baseline(profile.get('baseline',{}))
    if profile.get('targets') is not None:validate_targets(profile['targets'])
    for key in ('diary','feedback','events','change_proposals','integration_receipts'):
        if not isinstance(state[key],list):raise KetoError('Неверная коллекция '+key)
    if not isinstance(state.get('measurements',[]),list):raise KetoError('Неверная коллекция измерений')
    for record in state.get('measurements',[]):
        if not isinstance(record,dict) or not record.get('measurement_id') or not record.get('recorded_at'):raise KetoError('Неверное измерение')
        normalized=validate_measurement_session({key:value for key,value in record.items() if key not in ('measurement_id','recorded_at','updated_at')})
        record.update(normalized)
    if len({record['measurement_id'] for record in state.get('measurements',[])})!=len(state.get('measurements',[])):raise KetoError('Дубли измерений')
    for key in ('checklists','plans','event_receipts','custom_foods','custom_recipes'):
        if not isinstance(state[key],dict):raise KetoError('Неверный словарь '+key)
    return state

def document_write_request(old_text: str, new_state: dict, revision_id: str, expected_state_hash: str, tab_id: str | None=None) -> dict:
    old=parse_state_document(old_text)
    if digest(old)!=expected_state_hash:raise ConflictError('Документ изменился после чтения')
    if not revision_id:raise ConflictError('Нет revisionId: небезопасная запись запрещена')
    if new_state.get('owner_account_id')!=old.get('owner_account_id') or new_state.get('subject_id')!=old.get('subject_id'):raise SafetyError('Нельзя сменить владельца через сохранение')
    if new_state.get('state_revision')!=old['state_revision']+1:raise ConflictError('Неверная последовательность ревизий')
    # Google Docs body starts at UTF-16 index 1; preserve mandatory final paragraph newline.
    old_body=old_text[:-1] if old_text.endswith('\n') else old_text
    end=1+len(old_body.encode('utf-16-le'))//2
    requests=[]
    if end>1:
        rg={'startIndex':1,'endIndex':end}
        if tab_id:rg['tabId']=tab_id
        requests.append({'deleteContentRange':{'range':rg}})
    loc={'index':1}
    if tab_id:loc['tabId']=tab_id
    requests.append({'insertText':{'location':loc,'text':canonical(new_state)}})
    return {'requests':requests,'write_control':{'requiredRevisionId':revision_id}}

def local_time_to_utc(when: str, zone: str, fold: int | None=None) -> datetime:
    naive=datetime.fromisoformat(when)
    if naive.tzinfo is not None:raise KetoError('Нужно локальное время без offset и отдельная зона IANA')
    tz=ZoneInfo(zone);choices=[]
    for f in (0,1):
        aware=naive.replace(tzinfo=tz,fold=f)
        if aware.astimezone(timezone.utc).astimezone(tz).replace(tzinfo=None)==naive:
            choices.append(aware)
    if not choices:raise KetoError('Несуществующее время перехода на летнее время')
    ambiguous=len({x.utcoffset() for x in choices})>1
    if ambiguous and fold not in (0,1):raise KetoError('Двусмысленное время: нужно уточнить переход часов')
    return naive.replace(tzinfo=tz,fold=fold or 0).astimezone(timezone.utc)

def ics_escape(text: str) -> str:
    return text.replace('\\','\\\\').replace(';','\\;').replace(',','\\,').replace('\r','').replace('\n','\\n')

def fold_ical(line: str) -> str:
    parts=[];cur=''
    for ch in line:
        if len((cur+ch).encode())>73:parts.append(cur);cur=' '+ch
        else:cur+=ch
    parts.append(cur);return '\r\n'.join(parts)

def make_ics(title: str, when: str, zone: str, duration_minutes=15, fold=None, event_key=None) -> str:
    from datetime import timedelta
    title=clean_text(title,'title',160);start=local_time_to_utc(when,zone,fold)
    dur=integer(duration_minutes,'duration_minutes',5,240)
    if event_key is not None and not re.fullmatch(r'[A-Za-z0-9_-]{1,100}',str(event_key)):raise KetoError('Неверный event_key')
    uid=(event_key or digest([title,when,zone]))[:64]+'@keto-companion.local'
    lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//KETO Companion//RU','CALSCALE:GREGORIAN','BEGIN:VEVENT',
       'UID:'+uid,'DTSTAMP:'+datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ'),
       'DTSTART:'+start.strftime('%Y%m%dT%H%M%SZ'),'DTEND:'+(start+timedelta(minutes=dur)).strftime('%Y%m%dT%H%M%SZ'),
       'SUMMARY:'+ics_escape(title),'DESCRIPTION:Личная отметка. Не медицинское наблюдение.','STATUS:CONFIRMED','END:VEVENT','END:VCALENDAR']
    return '\r\n'.join(fold_ical(x) for x in lines)+'\r\n'

def review_label(label: dict) -> dict:
    allowed={'food_name','country','basis','serving_g','carbohydrate_g','fiber_g','polyols_g','confirmed_from_label'}
    if not isinstance(label,dict) or set(label)-allowed:raise KetoError('Неизвестные поля этикетки')
    if label.get('confirmed_from_label') is not True:raise SafetyError('Сначала подтвердить читаемые цифры этикетки')
    carb=number(label.get('carbohydrate_g'),'carbohydrate_g',0)
    fiber=None if label.get('fiber_g') is None else number(label['fiber_g'],'fiber_g',0)
    basis=label.get('basis')
    if basis=='total_includes_fiber':
        if fiber is not None and fiber>carb:raise KetoError('Клетчатка превышает total carbohydrate')
        net=carb-fiber if fiber is not None else None
    elif basis=='available_excludes_fiber':net=carb
    else:raise KetoError('Неясная система маркировки: нельзя автоматически вычитать клетчатку')
    if label.get('polyols_g') is not None:number(label['polyols_g'],'polyols',0)
    return {'reported_carbohydrate_g':float(carb),'net_estimate_g':None if net is None else float(net),
            'polyol_policy':'not_subtracted','basis':basis,'note':'Только разбор этикетки; это не автоматически подтверждённый новый продукт в каталоге.'}

def evidence_allowed(source: dict) -> bool:
    return source.get('status')=='included' and bool(source.get('url'))

def validate_custom_food(food: dict) -> dict:
    """User-confirmed label; only per-100g edible data, never infer missing micros."""
    allowed={'food_id','name_ru','state','allergens','label_confirmed','source_ref','carb_basis','nutrient_status','provenance','source_review_confirmed','recipe_eligible','declared_carbohydrate','declared_label',*NUTRIENTS}
    if not isinstance(food,dict) or set(food)-allowed:raise KetoError('Неизвестные поля продукта')
    if not re.fullmatch(r'U[A-Za-z0-9_-]{8,60}',str(food.get('food_id',''))):raise KetoError('Нужен личный food_id с префиксом U')
    provenance=food.get('provenance')
    if provenance is None:
        if food.get('label_confirmed') is not True or not food.get('source_ref'):raise SafetyError('Нужны подтверждённая этикетка и ссылка на источник')
        if 'source_review_confirmed' in food or 'recipe_eligible' in food:raise SafetyError('Некорректные атрибуты источника')
        source_type='user_confirmed_label'
    elif isinstance(provenance,dict) and provenance.get('type')=='usda_reference':
        if set(provenance)!={'type','candidate_id','release_hash'} or not re.fullmatch(r'USDA[0-9]+',str(provenance.get('candidate_id',''))) or not re.fullmatch(r'[a-f0-9]{64}',str(provenance.get('release_hash',''))):raise KetoError('Неверное происхождение USDA')
        if food.get('source_review_confirmed') is not True or food.get('recipe_eligible') is not False or 'label_confirmed' in food:raise SafetyError('Нужна проверка источника; этикетка не подтверждена')
        if food.get('source_ref')!='https://fdc.nal.usda.gov/food-details/'+provenance['candidate_id'][4:]+'/nutrients':raise KetoError('Ссылка не соответствует источнику')
        source_type='usda_reference'
    elif isinstance(provenance,dict) and provenance=={'type':'user_confirmed_label'}:
        if food.get('label_confirmed') is not True or not food.get('source_ref'):raise SafetyError('Нужна подтверждённая этикетка')
        if 'recipe_eligible' in food or 'source_review_confirmed' in food:raise SafetyError('Некорректные атрибуты этикетки')
        source_type='user_confirmed_label'
    elif isinstance(provenance,dict) and provenance.get('type')=='shop_label':
        if set(provenance)!={'type','provider','barcode','license'} or provenance['provider'] not in ('personal_label','open_food_facts'):raise KetoError('Неверное происхождение этикетки')
        if provenance['provider']=='personal_label':
            if provenance['barcode'] is not None or provenance['license'] is not None or food.get('source_ref')!='Личная этикетка':raise KetoError('Неверное происхождение этикетки')
        else:
            code=provenance['barcode']
            if not isinstance(code,str) or not re.fullmatch(r'(?:[0-9]{8}|[0-9]{12,14})',code) or (10-sum(int(c)*(3 if i%2==0 else 1) for i,c in enumerate(reversed(code[:-1])))%10)%10!=int(code[-1]) or provenance['license']!='ODbL' or food.get('source_ref')!='https://world.openfoodfacts.org/product/'+code:raise KetoError('Неверное происхождение Open Food Facts')
        if food.get('label_confirmed') is not True or food.get('recipe_eligible') is not False or 'source_review_confirmed' in food:raise SafetyError('Нужна проверка этикетки')
        declared=food.get('declared_carbohydrate')
        if declared is not None:
            if not isinstance(declared,dict) or set(declared)!={'value','basis'} or declared['basis'] not in ('available_excludes_fiber','unknown'):raise KetoError('Неверное значение углеводов')
            number(declared['value'],'declared_carbohydrate',0,100)
        label=food.get('declared_label')
        if not isinstance(label,dict) or set(label)!={'basis','mass_g','energy_kcal','protein_g','fat_g','carbohydrate_g','fiber_g','carbohydrate_basis'} or label['basis'] not in ('per100g','per100ml','perserving') or label['carbohydrate_basis'] not in ('total_includes_fiber','available_excludes_fiber','unknown'):raise KetoError('Неверная основа этикетки')
        if isinstance(label['mass_g'],bool) or not isinstance(label['mass_g'],(int,float)):raise KetoError('Неверная масса этикетки')
        if label['carbohydrate_basis']=='total_includes_fiber' and declared is not None:raise KetoError('Противоречивые углеводы этикетки')
        mass=number(label['mass_g'],'mass_g',0.001,10000)
        if label['basis']=='per100g' and mass!=100:raise KetoError('Неверная масса 100 г')
        for src,dst in [('energy_kcal','energy_kcal'),('protein_g','protein_g'),('fat_g','fat_g'),('fiber_g','fiber_g'),('carbohydrate_g','carbohydrate_total_g')]:
            value=label[src]; canonical=food.get(dst)
            if value is not None and (isinstance(value,bool) or not isinstance(value,(int,float))):raise KetoError('Неверное значение этикетки')
            if src=='carbohydrate_g' and label['carbohydrate_basis']!='total_includes_fiber':
                if canonical is not None or (value is None and declared is not None):raise KetoError('Нельзя считать доступные углеводы общими')
                if value is not None and (declared is None or declared['basis']!=label['carbohydrate_basis'] or abs(float(number(value,src,0,10000)*100/mass)-float(number(declared['value'],src,0,100)))>1e-8):raise KetoError('Неверные указанные углеводы')
            elif (value is None)!=(canonical is None) or (value is not None and abs(float(number(value,src,0,10000)*100/mass)-float(number(canonical,dst,0,1000)))>1e-8):raise KetoError('Значение не соответствует основе этикетки')
        source_type='shop_label'
    else:raise KetoError('Неверное происхождение продукта')
    if source_type!='shop_label' and ('declared_carbohydrate' in food or 'declared_label' in food):raise KetoError('Неверное происхождение углеводов')
    if food.get('nutrient_status','complete') not in ('complete','partial'):raise KetoError('Неверный статус нутриентов')
    if food.get('carb_basis')!='total_includes_fiber':raise KetoError('Нужна явная нормализация total carbohydrate; не вычитать клетчатку дважды')
    if food.get('state') not in {'raw','dry','ready_to_eat','ready_to_cook','cooked','cooked_roasted','cooked_dry_heat','cooked_boiled','canned','canned_drained'}:raise KetoError('Неизвестное состояние продукта')
    if not isinstance(food.get('allergens'),list):raise SafetyError('Нужна проверка аллергенов по упаковке')
    out=copy.deepcopy(food);out['name_ru']=clean_text(out.get('name_ru'),'name_ru',200)
    out['allergens']=sorted({normal_allergen(a) for a in out['allergens']})
    for k in NUTRIENTS:
        out[k]=None if out.get(k) is None else float(number(out[k],k,0))
    missing_core=any(out[k] is None for k in CORE)
    if out.get('nutrient_status','complete')=='complete' and missing_core:raise KetoError('Не заполнены базовые нутриенты на 100 г')
    if out.get('nutrient_status')=='partial' and not missing_core:raise KetoError('Полный базовый состав нельзя обозначить как partial')
    if out['fiber_g'] is not None and out['carbohydrate_total_g'] is not None and out['fiber_g']>out['carbohydrate_total_g']:raise KetoError('fiber > total carbs')
    if (out['energy_kcal'] is not None and out['energy_kcal']>1000) or any(out[k]>100 for k in ['protein_g','fat_g','carbohydrate_total_g','fiber_g','saturated_fat_g'] if out[k] is not None):raise KetoError('Нереалистичные значения на 100 г')
    out.update(source_url=out.pop('source_ref'),source_type=source_type,fdc_id=int(provenance['candidate_id'][4:]) if source_type=='usda_reference' else None)
    if source_type in ('usda_reference','shop_label'):out['group']=None
    return out

def validate_custom_recipe(recipe: dict, catalog: dict) -> dict:
    allowed={'recipe_id','name_ru','category','protein_family','base_servings','active_minutes','ingredients','steps_ru','source_ref','confirmed','usage'}
    if not isinstance(recipe,dict) or set(recipe)-allowed:raise KetoError('Неизвестные поля рецепта')
    if not re.fullmatch(r'R[A-Za-z0-9_-]{8,60}',str(recipe.get('recipe_id',''))):raise KetoError('Нужен личный recipe_id с префиксом R')
    if recipe.get('confirmed') is not True:raise SafetyError('Рецепт сначала подтвердить')
    if recipe.get('category') not in ('breakfast','main','side','component'):raise KetoError('Неизвестная категория')
    out=copy.deepcopy(recipe)
    if 'usage' in out and out['usage']!='observational':raise KetoError('Неизвестное назначение блюда')
    if out.get('usage')=='observational' and 'source_ref' in out:raise KetoError('Для собственного блюда источник не указывается')
    out['base_servings']=float(number(out.get('base_servings'), 'base_servings',0.1,30))
    out['active_minutes']=integer(out.get('active_minutes'),'active_minutes',1,360)
    for k in ('name_ru','protein_family','steps_ru'):out[k]=clean_text(out.get(k),k,5000 if k=='steps_ru' else 200)
    c=calculate_ingredients(out.get('ingredients'),catalog['foods'])
    if out.get('usage')!='observational' and c['eligibility_reasons']:raise SafetyError('Продукт источника ещё не проверен для рецептов')
    out['allergens']=c['allergens'];out['kitchen_tested']=False;out['clinical_validated']=False
    return out

def merge_personal_catalog(base: dict, state: dict) -> dict:
    out=copy.deepcopy(base)
    for k in ('foods','recipes'):
        personal=state.get('custom_'+k,{})
        if set(personal)&set(base[k]):raise ConflictError('Личные записи не могут перезаписать базовые ID')
        out[k].update(personal)
    if state.get('custom_foods') or state.get('custom_recipes'):
        out['catalog_hash']=digest([base['catalog_hash'],state.get('custom_foods',{}),state.get('custom_recipes',{})])
    return out

def journal_summary(state: dict) -> dict:
    entries=state.get('diary',[])
    result={'entries':len(entries),'dates_logged':len({e['date'] for e in entries}),'missing_days_are_not_zero':True}
    for field in ('energy_1_5','hunger_1_5','sleep_hours'):
        vals=[float(number(e[field],field,0)) for e in entries if e.get(field) is not None]
        result[field]={'count':len(vals),'mean':round(sum(vals)/len(vals),2) if vals else None}
    weights=sorted([(e['date'],float(number(e['weight_kg'],'weight_kg',20,400))) for e in entries if e.get('weight_kg') is not None])
    result['weight']={'measurements':len(weights),'first':weights[0] if weights else None,'last':weights[-1] if weights else None,
                      'delta_kg':round(weights[-1][1]-weights[0][1],2) if len({x[0] for x in weights})>=2 else None}
    result['interpretation']='Описание записей, не диагноз и не основание автоматически менять калорийность.'
    return result

def quote_shopping(items: list, prices: dict) -> dict:
    total=Decimal(0);missing=[];currency=None
    for i in items:
        p=prices.get(i['food_id'])
        if not p or p.get('state')!=i['state'] or not p.get('observed_date'):
            missing.append(i['food_id']);continue
        date.fromisoformat(p['observed_date'])
        if currency and currency!=p.get('currency'):raise KetoError('Нельзя суммировать разные валюты без курса')
        currency=p.get('currency')
        if not currency:raise KetoError('Нет валюты')
        total+=number(p['price'],'price',0)*number(i['grams_edible'],'grams',0)/number(p['quantity_g'],'quantity_g',0.001)
    return {'known_subtotal':round(float(total),2),'currency':currency,'complete':not missing,'missing_food_ids':missing,
            'note':'Стоимость съедобной массы; фасовка, отходы и изменение цены не учтены.'}

def main():
    ap=argparse.ArgumentParser();ap.add_argument('command',choices=['catalog-info','recipe','screen','plan','import-csv','import-json','energy','suggest'])
    ap.add_argument('--data');ap.add_argument('--profile');ap.add_argument('--input');ap.add_argument('--recipe-id');ap.add_argument('--portions',default='1');ap.add_argument('--start');ap.add_argument('--days',type=int,default=7);ap.add_argument('--out')
    args=ap.parse_args();catalog=load_catalog(args.data)
    profile=json.loads(Path(args.profile).read_text()) if args.profile else None
    if args.command=='catalog-info':result={'foods':len(catalog['foods']),'recipes':len(catalog['recipes']),'catalog_hash':catalog['catalog_hash'],'engine_version':ENGINE_VERSION}
    elif args.command=='recipe':result=calculate_recipe(catalog,args.recipe_id,args.portions)
    elif args.command=='screen':result=screen_profile(profile)
    elif args.command=='plan':result=build_plan(catalog,profile,json.loads(Path(args.input).read_text()))
    elif args.command=='import-csv':result=import_plan_csv(Path(args.input).read_text(),catalog,profile)
    elif args.command=='import-json':result=import_plan_json(Path(args.input).read_text(),catalog,profile)
    elif args.command=='energy':result=estimate_energy(profile)
    else:result=suggest_plan(catalog,profile,args.start,args.days)
    txt=json.dumps(result,ensure_ascii=False,indent=2,allow_nan=False)
    if args.out:Path(args.out).write_text(txt)
    else:print(txt)
if __name__=='__main__':
    try:main()
    except (KetoError,ValueError,KeyError,TypeError) as e:
        print(json.dumps({'error':str(e),'action':'stop_and_clarify_no_silent_defaults'},ensure_ascii=False),file=sys.stderr);sys.exit(2)
