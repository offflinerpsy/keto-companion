"""Shared intake adapters over the existing proposal, CAS and diary event paths."""
import copy, uuid
from .store import Conflict
from .kitchen import core, init
from .mobile import topic


class IntakeService:
    def diary_row(self,entry,cat):
        k=core();calc=k.diary_calculation(entry,cat);snapshot=entry.get('nutrition_snapshot')
        source=snapshot['source'] if snapshot else {}
        current=cat['recipes'].get(entry.get('recipe_id')) or cat['foods'].get(entry.get('food_id')) or {}
        name=source.get('name_ru') or current.get('name_ru') or entry.get('note') or 'Запись без уточнённого состава'
        return {**copy.deepcopy(entry),'name_ru':name,'source_mode':source.get('kind') or ('legacy_estimate' if calc else 'unquantified'),
                'calculation':calc,'nutrition':calc['nutrition'] if calc else None,
                'coverage':calc['coverage'] if calc else None,'legacy_estimate':bool(calc and calc.get('legacy_estimate')),
                'complete':bool(calc) and all(calc['nutrition'][n] is not None for n in k.NUTRIENTS+(k.DERIVED,))}

    def intake_event(self,d,payload):
        k=core()
        allowed={'operation','recipe_id','food_id','entry_id','amount','date','time','time_fold','timezone','meal','note','thread_id','origin','generation_id'}
        if not isinstance(payload,dict) or set(payload)-allowed:raise ValueError('Неверные поля съеденного')
        for key in ('recipe_id','food_id','entry_id','thread_id','generation_id'):
            if key in payload and (not isinstance(payload[key],str) or not payload[key] or len(payload[key])>100):raise ValueError('Неверный идентификатор еды или записи')
        if 'origin' in payload:self.chat_intake_origin(d,payload)
        operation=payload.get('operation','add')
        if operation not in ('add','update','repeat'):raise ValueError('Неизвестное действие дневника')
        if not d.get('processing_consent'):raise ValueError('Сначала разрешите обработку личных данных')
        profile_zone=d['core']['profile'].get('timezone')
        cat=self.kitchen_catalog(d);previous=None
        if operation=='add':
            if not profile_zone:raise ValueError('Подтвердите часовой пояс в профиле')
            if 'entry_id' in payload or bool(payload.get('recipe_id'))==bool(payload.get('food_id')) or not {'date','amount'}<=set(payload):raise ValueError('Выберите еду, количество и дату')
            rid=payload.get('recipe_id')
            if 'generation_id' in payload:
                group=topic(d,payload.get('thread_id') or d['active_thread']).get('kitchen',{})
                if payload['generation_id']!=group.get('generation_id') or rid not in group.get('candidate_ids',[]) or rid not in init(d)['drafts']:raise ValueError('Подбор изменился. Выберите рецепт заново.')
            if rid and rid not in cat['recipes']:
                tid=payload.get('thread_id') or d['active_thread'];group=topic(d,tid).get('kitchen',{})
                if rid not in group.get('candidate_ids',[]) or rid not in init(d)['drafts']:raise ValueError('Черновик не принадлежит выбранной теме или устарел')
                self.kitchen_card(d,rid,group['spec'])
                recipe=init(d)['drafts'][rid]['recipe'];calc=k.calculate_ingredients(recipe['ingredients'],cat['foods'])
                if d['holds'] or d['core']['profile']['screening'].get('allergies_reviewed') is not True or k.check_recipe(d['core']['profile'],calc):raise k.SafetyError('Сначала проверьте ограничения и полноту состава; пока это справочная идея')
                cat['recipes'][rid]=recipe
            entry={key:copy.deepcopy(value) for key,value in payload.items() if key not in ('operation','thread_id','origin','generation_id')}
            entry.update(intake_status='confirmed',timezone=payload.get('timezone') or profile_zone)
            kind='diary.add'
        else:
            if set(payload)&{'recipe_id','food_id','generation_id'} or not payload.get('entry_id'):raise ValueError('Выберите существующую запись')
            previous=next((e for e in d['core']['diary'] if e['entry_id']==payload['entry_id']),None)
            if previous is None:raise ValueError('Запись не найдена в вашем дневнике')
            if operation=='repeat' and 'date' not in payload:raise ValueError('Выберите дату повторной записи')
            changes={key:copy.deepcopy(value) for key,value in payload.items() if key not in ('operation','entry_id','thread_id','origin')}
            if operation=='repeat' or ('time' in changes and changes['time'] is not None and not previous.get('timezone')):
                zone=previous.get('timezone') or profile_zone
                if zone:changes.setdefault('timezone',zone)
            entry={'entry_id':previous['entry_id'],'changes':changes};kind='diary.'+operation
        reviewed=entry if operation=='add' else entry['changes']
        if 'meal' in reviewed and reviewed['meal'] not in ('breakfast','lunch','dinner','snack',''):raise ValueError('Выберите приём пищи')
        return kind,entry,cat,previous

    def intake_preview(self,d,payload):
        kind,value,cat,previous=self.intake_event(d,payload)
        return self.diary_event_preview(d,kind,value,cat,previous)

    def diary_event_preview(self,d,kind,value,cat,previous=None):
        k=core()
        if previous is None and kind in ('diary.update','diary.repeat','diary.delete'):
            previous=next((e for e in d['core']['diary'] if e['entry_id']==value.get('entry_id')),None)
        after=k.apply_event(d['core'],{'event_id':'preview_'+uuid.uuid4().hex,'type':kind,'payload':value,'confirmed':True},d['core']['state_revision'],d['core']['owner_account_id'],cat)
        entry=previous if kind=='diary.delete' else next(e for e in after['diary'] if e['entry_id']==value['entry_id']) if kind=='diary.update' else after['diary'][-1]
        row=self.diary_row(entry,cat);row.pop('updated_at',None)
        if kind not in ('diary.update','diary.delete'):
            row.pop('entry_id',None);row.pop('recorded_at',None)
        calculation=row['calculation']
        allergens=(entry.get('nutrition_snapshot') or {}).get('allergens')
        if allergens is None and not entry.get('nutrition_snapshot') and calculation:allergens=calculation.get('allergens')
        hits={k.normal_allergen(a) for a in d['core']['profile'].get('allergies',[])} & set(allergens or [])
        allergy_issues=['allergen:'+','.join(sorted(hits))] if hits else []
        if allergens is None and d['core']['profile'].get('allergies'):allergy_issues.append('allergens_unknown')
        preview={'entry':row,'calculation':calculation,
                 'issues':allergy_issues+['missing_nutrition:'+n for n in k.NUTRIENTS+(k.DERIVED,) if calculation and calculation['nutrition'][n] is None],
                 'legacy_estimate':row['legacy_estimate'] or bool(previous and not previous.get('nutrition_snapshot') and calculation),
                 'profile_timezone':d['core']['profile'].get('timezone')}
        preview['preview_hash']=k.digest(preview)
        preview['reviewed_at']=k.utc_now()
        return preview

    def legacy_intake_payload(self,d,action,payload):
        return {**{key:payload[key] for key in ('recipe_id','date','time','time_fold','timezone','meal','thread_id') if key in payload},
                'operation':'add','amount':{'value':payload['fraction'],'unit':payload['basis']},
                'note':'Подтверждённая доля собственного блюда' if action=='own_dish_diary' else 'Подтверждённая доля '+('всего блюда' if payload['basis']=='batch' else 'порции')}

    def intake_apply(self,d,payload,proposal_id):
        k=core();kind,value,cat,_=self.intake_event(d,payload)
        d['core']=k.apply_event(d['core'],{'event_id':'intake_'+proposal_id,'type':kind,'payload':value,'confirmed':True},d['core']['state_revision'],d['core']['owner_account_id'],cat)

    def diary_history(self,d,values=None,expected_revision=None):
        k=core();values={} if values is None else values
        if not isinstance(values,dict) or set(values)-{'date','entry_id','offset','limit'}:raise ValueError('Неверные параметры истории')
        if expected_revision is not None and expected_revision!=d['revision']:raise Conflict('Дневник изменился; обновите историю')
        offset=k.integer(values.get('offset',0),'offset',0,1000000);limit=k.integer(values.get('limit',30),'limit',1,100)
        day=values.get('date')
        if day is not None:k.diary_date(day)
        rows=d['core']['diary'];cat=self.kitchen_catalog(d)
        if 'entry_id' in values:
            if not isinstance(values['entry_id'],str):raise ValueError('Неверная запись')
            rows=[e for e in rows if e['entry_id']==values['entry_id']]
            if not rows:raise ValueError('Запись не найдена в вашем дневнике')
        if day is not None:rows=[e for e in rows if e.get('date')==day]
        rows=sorted(rows,key=lambda e:(e['date'],e.get('time') or '',e['entry_id']),reverse=True)
        return {'entries':[self.diary_row(e,cat) for e in rows[offset:offset+limit]],'total':len(rows),'offset':offset,
                'has_more':offset+limit<len(rows),'revision':d['revision'],
                'summary':k.diary_summary(d['core']['diary'],cat,day) if day is not None else None,'model_called':False}
