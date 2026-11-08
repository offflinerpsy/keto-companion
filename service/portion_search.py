"""Bounded independent-portion fallback; never relaxes nutrient or allergy targets.
The primary catalogue search uses a common factor. This fallback searches the
same recipes with individual 0.65–1.65 factors, then rechecks core calculations.
"""
from __future__ import annotations
import random,time
from collections import Counter,defaultdict
from datetime import date,timedelta


def fit_portions(calculations,targets,*,low=.65,high=1.65,iterations=120):
    carb='carbohydrate_total_g' if targets['carb_basis']=='total' else 'net_carbohydrate_g'
    def vector(key):
        values=[c['nutrition'].get(key) for c in calculations]
        return values if all(isinstance(v,(float,int)) and not isinstance(v,bool) for v in values) else None
    energy,protein,carbohydrate,fiber,sat=[vector(key) for key in ('energy_kcal','protein_g',carb,'fiber_g','saturated_fat_g')]
    if any(x is None for x in (energy,protein,carbohydrate,fiber,sat)):return None
    matrices=[(energy,targets['energy_max_kcal']),([-x for x in energy],-targets['energy_min_kcal']),(protein,targets['protein_max_g']),([-x for x in protein],-targets['protein_min_g']),(carbohydrate,targets['carb_max_g']),([-x for x in fiber],-targets['fiber_min_g']),([9*s-targets['saturated_fat_max_pct']/100*e for s,e in zip(sat,energy)],0)]
    rows=[]
    for row,bound in matrices:
        # Tighten slightly for 3-decimal rounding; never enlarge the allowed region.
        bound-=.0006*sum(abs(x) for x in row)+1e-6
        if sum(x*(low if x>=0 else high) for x in row)>bound:return None
        norm=sum(x*x for x in row)
        if norm==0:
            if bound<0:return None
        else:rows.append((row,bound,norm))
    if sum(energy)<=0:return None
    start=max(low,min(high,(targets['energy_min_kcal']+targets['energy_max_kcal'])/(2*sum(energy))))
    factors=[start]*len(calculations)
    for _ in range(iterations):
        for row,bound,norm in rows:
            excess=sum(a*p for a,p in zip(row,factors))-bound
            if excess>0:factors=[p-excess*a/norm for p,a in zip(factors,row)]
        factors=[max(low,min(high,p)) for p in factors]
        if all(sum(a*p for a,p in zip(row,factors))<=bound+1e-8 for row,bound,_ in rows):return [round(p,3) for p in factors]
    return None


def fit_plan(k,catalog,profile,start_date,days=1,seed=83,attempts=2000,deadline_seconds=8):
    if not k.screen_profile(profile)['can_plan']:raise k.SafetyError('Сначала завершите проверку ограничений')
    settings=k.validate_settings(profile.get('settings',{}),catalog);targets=k.validate_targets(profile.get('targets'))
    days=k.integer(days,'days',1,7);start=date.fromisoformat(start_date)
    avoid=set(settings['excluded_food_ids']+settings['disliked_food_ids']);calcs={};pools=defaultdict(list)
    for rid,recipe in catalog['recipes'].items():
        c=k.calculate_recipe(catalog,rid)
        if k.check_recipe(profile,c) or c['active_minutes']>settings['max_active_minutes']:continue
        if avoid&{i['food_id'] for i in c['ingredients']}:continue
        calcs[rid]=c;pools[recipe['category']].append(rid)
    extra=sum([pools[x] for x in ('addon','snack','side','component')],[])
    rng=random.Random(seed);selected=[];previous=set();end=time.monotonic()+deadline_seconds
    for ix in range(days):
        counts=Counter(p['recipe_id'] for d in selected[max(0,ix-6):] for p in d['picks'])
        def allowed(ids):return [x for x in ids if counts[x]<settings['max_recipe_repeats_per_week'] and x not in previous]
        breakfasts=allowed(pools['breakfast']);mains=allowed(pools['main']);addons=allowed(extra)
        if not breakfasts or len(mains)<2 or (settings['meals_per_day']==4 and not addons):return None
        found=None
        for _ in range(attempts):
            if time.monotonic()>end:return None
            ids=[rng.choice(breakfasts),*rng.sample(mains,2)]
            if catalog['recipes'][ids[1]]['protein_family']==catalog['recipes'][ids[2]]['protein_family']:continue
            if addons and (settings['meals_per_day']==4 or rng.random()<.85):ids.append(rng.choice(addons))
            factors=fit_portions([calcs[r] for r in ids],targets)
            if factors is None:continue
            nutrients={key:None if any(calcs[r]['nutrition'][key] is None for r in ids) else sum(calcs[r]['nutrition'][key]*f for r,f in zip(ids,factors)) for key in k.NUTRIENTS+(k.DERIVED,)}
            if k.target_issues(nutrients,targets):continue
            slots=['breakfast','lunch','dinner','extra']
            if settings['meals_per_day']==2:slots=['lunch','lunch','dinner','dinner']
            elif settings['meals_per_day']==3:slots=['breakfast','lunch','dinner','dinner']
            found={'date':(start+timedelta(days=ix)).isoformat(),'picks':[{'recipe_id':rid,'portions':factor,'slot':slots[j]} for j,(rid,factor) in enumerate(zip(ids,factors))]};break
        if found is None:return None
        selected.append(found);previous=set(ids)
    plan=k.build_plan(catalog,profile,selected)
    plan['planner_note']='Bounded independent-portion fallback; unchanged targets, allergies and 0.65–1.65 bounds. No global-optimum or clinical claim.'
    return plan
