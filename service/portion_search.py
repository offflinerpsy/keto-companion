"""Bounded independent-portion fallback; never relaxes nutrient or allergy targets.
The primary catalogue search uses a common factor. This fallback searches the
same recipes with individual 0.65–1.65 factors, then rechecks core calculations.
"""
from __future__ import annotations
import random,time
from collections import Counter,defaultdict
from datetime import date,timedelta


def _solve_vectors(energy,protein,carbohydrate,fiber,sat,targets,low,high,iterations):
    e_sum=sum(energy)
    if e_sum<=0:return None
    if e_sum*low>targets['energy_max_kcal'] or e_sum*high<targets['energy_min_kcal']:return None
    p_sum=sum(protein)
    if p_sum*low>targets['protein_max_g'] or p_sum*high<targets['protein_min_g']:return None
    if sum(carbohydrate)*low>targets['carb_max_g'] or sum(fiber)*high<targets['fiber_min_g']:return None
    sat_pct=targets['saturated_fat_max_pct']/100.0
    matrices=(
        (energy,targets['energy_max_kcal']),
        ([-x for x in energy],-targets['energy_min_kcal']),
        (protein,targets['protein_max_g']),
        ([-x for x in protein],-targets['protein_min_g']),
        (carbohydrate,targets['carb_max_g']),
        ([-x for x in fiber],-targets['fiber_min_g']),
        ([9*s-sat_pct*e for s,e in zip(sat,energy)],0.0),
    )
    rows=[]
    for row,bound in matrices:
        norm=sum(x*x for x in row)
        if norm==0:
            if bound<0:return None
            continue
        # Tighten slightly for 3-decimal rounding; never enlarge the allowed region.
        bound-=.0006*sum(abs(x) for x in row)+1e-6
        if sum(x*(low if x>=0 else high) for x in row)>bound:return None
        rows.append((row,bound,norm))
    start=max(low,min(high,(targets['energy_min_kcal']+targets['energy_max_kcal'])/(2*e_sum)))
    n=len(energy)
    factors=[start]*n
    for _ in range(iterations):
        for row,bound,norm in rows:
            dot=0.0
            for i in range(n):dot+=row[i]*factors[i]
            excess=dot-bound
            if excess>0:
                step=excess/norm
                for i in range(n):factors[i]-=step*row[i]
        for i in range(n):
            v=factors[i]
            if v<low:factors[i]=low
            elif v>high:factors[i]=high
        if all(sum(row[i]*factors[i] for i in range(n))<=bound+1e-8 for row,bound,_ in rows):
            return [round(p,3) for p in factors]
    return None


def fit_portions(calculations,targets,*,low=.65,high=1.65,iterations=120):
    carb='carbohydrate_total_g' if targets['carb_basis']=='total' else 'net_carbohydrate_g'
    def vector(key):
        values=[c['nutrition'].get(key) for c in calculations]
        return values if all(isinstance(v,(float,int)) and not isinstance(v,bool) for v in values) else None
    energy,protein,carbohydrate,fiber,sat=[vector(key) for key in ('energy_kcal','protein_g',carb,'fiber_g','saturated_fat_g')]
    if any(x is None for x in (energy,protein,carbohydrate,fiber,sat)):return None
    return _solve_vectors(energy,protein,carbohydrate,fiber,sat,targets,low,high,iterations)


def fit_plan(k,catalog,profile,start_date,days=1,seed=83,attempts=2000,deadline_seconds=8):
    if not k.screen_profile(profile)['can_plan']:raise k.SafetyError('Сначала завершите проверку ограничений')
    settings=k.validate_settings(profile.get('settings',{}),catalog);targets=k.validate_targets(profile.get('targets'))
    days=k.integer(days,'days',1,7);start=date.fromisoformat(start_date)
    avoid=set(settings['excluded_food_ids']+settings['disliked_food_ids']);calcs={};pools=defaultdict(list)
    carb_key='carbohydrate_total_g' if targets['carb_basis']=='total' else 'net_carbohydrate_g'
    vecs={}
    for rid,recipe in catalog['recipes'].items():
        c=k.calculate_recipe(catalog,rid)
        if k.check_recipe(profile,c) or c['active_minutes']>settings['max_active_minutes']:continue
        if avoid&{i['food_id'] for i in c['ingredients']}:continue
        calcs[rid]=c;pools[recipe['category']].append(rid)
        n=c['nutrition']
        vals=(n.get('energy_kcal'),n.get('protein_g'),n.get(carb_key),n.get('fiber_g'),n.get('saturated_fat_g'))
        vecs[rid]=vals if all(isinstance(v,(float,int)) and not isinstance(v,bool) for v in vals) else None
    extra=sum([pools[x] for x in ('addon','snack','side','component')],[])
    rng=random.Random(seed);selected=[];previous=set();end=time.monotonic()+deadline_seconds
    all_nutrient_keys=k.NUTRIENTS+(k.DERIVED,)
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
            vlist=[vecs[r] for r in ids]
            if any(v is None for v in vlist):continue
            factors=_solve_vectors([v[0] for v in vlist],[v[1] for v in vlist],[v[2] for v in vlist],[v[3] for v in vlist],[v[4] for v in vlist],targets,.65,1.65,120)
            if factors is None:continue
            nutrients={key:None if any(calcs[r]['nutrition'][key] is None for r in ids) else sum(calcs[r]['nutrition'][key]*f for r,f in zip(ids,factors)) for key in all_nutrient_keys}
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
