"""Auditable starter policy v1. All canonical arithmetic stays on the server."""
import copy,hashlib,json
from datetime import datetime,timezone
from decimal import Decimal,ROUND_HALF_UP,ROUND_FLOOR,ROUND_CEILING
POLICY='starter-v1'
ACTIVITY={'sitting':(1.4,'В основном сидя: ориентировочно 1,4'),'light':(1.6,'Есть ходьба/лёгкая активность: ориентировочно 1,6'),'active':(1.8,'Активный день: ориентировочно 1,8')}
GOALS={'maintain','loss','gain'};MODES={'starter':100,'keto':50}
SOURCES=['ENGINE01','S_ENERGY','START_PROTEIN','S11','START_ENERGY_2013','START_USDA_DRI']
BASE_FIELDS=['age_years','height_cm','weight_kg','equation_category','activity_factor','activity_note','measured_at']
def number(x):
    if isinstance(x,bool) or x is None:raise ValueError('Нужно число, не пустое поле')
    try:v=Decimal(str(x).strip().replace(',','.'))
    except Exception:raise ValueError('Введите число, например 72,5') from None
    if not v.is_finite():raise ValueError('Нужно конечное число')
    return float(v)
def choices_valid(x):
    if not isinstance(x,dict) or set(x)!={'goal','mode'} or x['goal'] not in GOALS or x['mode'] not in MODES:raise ValueError('Выберите цель и режим питания')
    return copy.deepcopy(x)
def baseline_valid(values,k):
    if not isinstance(values,dict) or set(values)!={'age_years','height_cm','weight_kg','equation_category','activity','measured_at'}:raise ValueError('Заполните исходные данные без подстановок')
    if values['activity'] not in ACTIVITY:raise ValueError('Выберите описание активности')
    factor,note=ACTIVITY[values['activity']]
    b={key:number(values[key]) for key in ['age_years','height_cm','weight_kg']};b.update(equation_category=values['equation_category'],activity_factor=factor,activity_note=note,measured_at=values['measured_at'])
    measured=datetime.fromisoformat(b['measured_at'].replace('Z','+00:00'))
    if measured.tzinfo is None:measured=measured.replace(tzinfo=timezone.utc)
    if measured>datetime.now(timezone.utc):raise ValueError('Дата измерения не может быть в будущем')
    return k.validate_baseline(b)
def fingerprint(d):
    p=d['core']['profile'];data={key:p.get(key) for key in ['baseline','screening','medications','allergies']};data['subject']=d['core']['owner_account_id'];data['choices']=d.get('guidance_choices',{});data['holds']=d.get('holds',[])
    return hashlib.sha256(json.dumps(data,sort_keys=True,ensure_ascii=False,separators=(',',':')).encode()).hexdigest()
def round10(x):return int((Decimal(str(x))/10).quantize(Decimal(1),rounding=ROUND_HALF_UP)*10)
def outward(x,rounding):return int((Decimal(str(x))/5).to_integral_value(rounding=rounding)*5)
def preview(d,k):
    p=d['core']['profile'];b=p.get('baseline',{});c=d.get('guidance_choices',{});screen=k.screen_profile(p);reasons=[];missing=[f for f in BASE_FIELDS if b.get(f) in (None,'')]
    if not p.get('timezone'):missing.append('timezone')
    if c.get('goal') not in GOALS:missing.append('goal')
    if c.get('mode') not in MODES:missing.append('mode')
    if not d.get('processing_consent') or not p['consent']['storage'] or not p['consent']['health_data']:reasons.append('consent_required')
    if not screen['can_plan']:reasons+=screen['reasons']
    if d.get('holds'):reasons+=['hold:'+x for x in d['holds']]
    if b.get('equation_category') not in (None,'female','male'):reasons.append('equation_coefficient_required')
    if b.get('age_years') is not None and not 19<=number(b['age_years'])<=78:reasons.append('age_outside_19_78')
    bmi=None
    if b.get('height_cm') and b.get('weight_kg'):
        bmi_decimal=Decimal(str(b['weight_kg']))/(Decimal(str(b['height_cm']))/100)**2;bmi=float(bmi_decimal)
        if not Decimal('18.5')<=bmi_decimal<35:reasons.append('bmi_outside_pilot_scope')
        if c.get('goal')=='loss' and bmi_decimal<20:reasons.append('loss_requires_bmi_20')
    if c.get('goal')=='gain':reasons.append('gain_needs_individual_plan')
    if b.get('activity_factor') is not None and b['activity_factor'] not in (1.4,1.6,1.8):reasons.append('activity_choice_required')
    result={'policy_version':POLICY,'timestamp':datetime.now(timezone.utc).isoformat(),'fingerprint':fingerprint(d),'source_ids':SOURCES,'missing':missing,'reasons':sorted(set(reasons)),'bmi':round(bmi,3) if bmi else None,'candidate':None,'warnings':['Предварительные ориентиры, не назначение и не одобрение специалиста.','Область пилота — продуктовая граница, не диагноз и не доказательство опасности за её пределами.','Жиры поступают из продуктов; не нужно отдельно есть масло или назначать себе электролиты/добавки.'],'review':[]}
    meta=d.get('targets_provenance',{});measured=b.get('measured_at')
    if measured:
        try:
            dt=datetime.fromisoformat(measured.replace('Z','+00:00'));dt=dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)
            if (datetime.now(timezone.utc)-dt).days>=30:result['review'].append('measurement_older_than_30_days_product_rule')
        except ValueError:result['missing'].append('valid_measured_at')
    if meta.get('weight_kg') and b.get('weight_kg') and abs(b['weight_kg']/meta['weight_kg']-1)>=.05:result['review'].append('weight_change_5_percent_product_rule')
    if result['missing'] or result['reasons']:return result
    estimate=k.estimate_energy(p);maintenance=estimate['maintenance_estimate_kcal'];m=Decimal(maintenance);deduction=min(Decimal(300),m*Decimal('.10')) if c['goal']=='loss' else Decimal(0);center=m-deduction
    lower,upper=round10(center*Decimal('.95')),round10(center*Decimal('1.05'));floor=1200 if b['equation_category']=='female' else 1500
    result['calculation']={**estimate,'bmi':bmi,'loss_product_deduction_kcal':float(deduction),'center_kcal':float(center),'maintenance_uncertainty_kcal':[round10(m*Decimal('.9')),round10(m*Decimal('1.1'))],'uncertainty_note':'±10% — допущение интерфейса, не статистический доверительный интервал','lower_intake_product_floor':floor,'equation':'10 × вес(кг) + 6,25 × рост(см) − 5 × возраст + (5 male / −161 female)','rounding':'Energy to nearest 10, half up; protein outward to 5 g; fiber nearest whole g, half up','activity_note':b['activity_note']}
    if lower<floor:result['reasons'].append('lower_bound_below_product_floor_choose_maintain_or_review');return result
    candidate={'energy_min_kcal':lower,'energy_max_kcal':upper,'protein_min_g':outward(Decimal(str(b['weight_kg']))*Decimal('1.2'),ROUND_FLOOR),'protein_max_g':outward(Decimal(str(b['weight_kg']))*Decimal('1.6'),ROUND_CEILING),'carb_basis':'total','carb_max_g':MODES[c['mode']],'fiber_min_g':int((center*14/1000).quantize(Decimal(1),rounding=ROUND_HALF_UP)),'saturated_fat_max_pct':10}
    # Existing core validation remains the final numerical boundary.
    try:k.validate_targets(dict(candidate,status='agreed',agreed_at=result['timestamp'],basis_note=POLICY))
    except k.KetoError:result['reasons'].append('outside_existing_target_bounds');return result
    result['candidate']=candidate;result['preview_hash']=hashlib.sha256(json.dumps([POLICY,result['fingerprint'],candidate],sort_keys=True).encode()).hexdigest()
    return result

def status(d,k):
    p=d['core']['profile'];v=preview(d,k);consent=d.get('processing_consent') and p['consent']['storage'] and p['consent']['health_data'];screen=k.screen_profile(p)
    stale=d.get('targets_provenance',{}).get('source')=='starter_policy' and d['targets_provenance'].get('fingerprint')!=fingerprint(d)
    if not consent:stage='consent'
    elif v['missing']:stage='about'
    elif not screen['can_plan'] or d['holds']:stage='restrictions'
    elif not p.get('targets') or stale:stage='targets'
    else:stage='ready'
    return {'stage':stage,'stages':['consent','about','restrictions','targets'],'ready':stage=='ready','missing':v['missing'],'reasons':v['reasons'],'review':v['review'],'choices':copy.deepcopy(d.get('guidance_choices',{})),'targets_stale':stale,'energy_floor':1500 if p.get('baseline',{}).get('equation_category')=='male' else 1200,'provenance':copy.deepcopy(d.get('targets_provenance',{'source':'external_or_manual'})) if p.get('targets') else None}
def ensure_current(d):
    meta=d.get('targets_provenance',{})
    if meta.get('source')=='starter_policy' and meta.get('fingerprint')!=fingerprint(d):raise ValueError('Ориентиры устарели после изменения исходных данных. Откройте «Ваш план питания» и подтвердите новые.')

class PlanningService:
    def guidance(self,subject,action='status',values=None,preview_hash=None,kind='personal'):
        from .domain import k,storage_consent
        from .store import Conflict
        d,v=self.load(subject,kind)
        if action=='status':return {'guidance':status(d,k),'state':self.snapshot(d)}
        if action=='preview':
            result=preview(d,k)
            if result.get('candidate'):
                profile=copy.deepcopy(d['core']['profile']);profile['targets']=dict(result['candidate'],status='agreed',agreed_at=result['timestamp'],basis_note='SYNTHETIC FEASIBILITY PREVIEW ONLY; not saved')
                catalogue=k.merge_personal_catalog(self.base,d['core']);start=datetime.now(timezone.utc).date().isoformat()
                try:plan=k.suggest_plan(catalogue,profile,start,days=1,attempts=1500)
                except k.KetoError:
                    from .portion_search import fit_plan
                    plan=fit_plan(k,catalogue,profile,start,days=1,deadline_seconds=3)
                result['catalogue_check']={'days_tested':1,'feasible':plan is not None,'targets_unchanged':True,'note':'Найдено меню на один день с текущими ограничениями; это не гарантия разнообразия на неделю.' if plan else 'Текущий ограниченный каталог пока не дал меню с этими ориентирами. Это ограничение поиска, не диагноз. Можно выбрать другой режим явно или продолжить со справочными рецептами.'}
            return {'preview':result,'guidance':status(d,k)}
        if not storage_consent(d) or not d['processing_consent']:raise ValueError('Сначала дайте согласие на обработку и хранение')
        if action=='baseline':payload=setup_valid(values,k);p=self._prepare(d,'guidance.setup',payload)
        elif action=='propose':
            proposed=preview(d,k)
            if not proposed['candidate']:raise ValueError('Сначала завершите исходные данные и ограничения; автоматические ориентиры сейчас недоступны')
            if preview_hash!=proposed['preview_hash']:raise Conflict('Предпросмотр устарел. Пересчитайте по сохранённым ответам.')
            p=self._prepare(d,'guidance.targets',{'preview_hash':preview_hash,'candidate':proposed['candidate'],'before':p_baseline_targets(d)})
        else:raise ValueError('Неизвестное действие ориентиров')
        self.save(subject,d,v);return {'proposal':p,'state':self.snapshot(d),'message':'Проверьте карточку и подтвердите. Сохранённые ориентиры пока не менялись.'}
def p_baseline_targets(d):return copy.deepcopy(d['core']['profile'].get('targets'))
def setup_valid(values,k):
    if not isinstance(values,dict) or set(values)-{'baseline','choices','timezone','display_name'} or not {'baseline','choices','timezone'}<=set(values):raise ValueError('Неверные исходные данные')
    from zoneinfo import ZoneInfo
    ZoneInfo(values['timezone']);out={'baseline':baseline_valid(values['baseline'],k),'choices':choices_valid(values['choices']),'timezone':values['timezone']}
    if values.get('display_name'):out['display_name']=k.clean_text(values['display_name'],'display_name',80)
    return out

def canonical_setup_valid(value,k):
    if not isinstance(value,dict) or set(value)-{'baseline','choices','timezone','display_name'}:raise ValueError('Неверное сохранение исходных данных')
    b=k.validate_baseline(value['baseline']);activity=next((name for name,(factor,note) in ACTIVITY.items() if b.get('activity_factor')==factor and b.get('activity_note')==note),None)
    if activity is None:raise ValueError('Нужно выбрать объяснённую активность')
    original={key:b.get(key) for key in ['age_years','height_cm','weight_kg','equation_category','measured_at']};original['activity']=activity
    return setup_valid(dict(value,baseline=original),k)
