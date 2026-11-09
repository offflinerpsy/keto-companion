"""Synthetic intake lifecycle; no live providers or real user records."""
import copy
from datetime import datetime
from zoneinfo import ZoneInfo
import pytest
from fastapi.testclient import TestClient
from service.domain import Service,k
from service.store import SQLiteStore,Conflict
from service.app import create_app
from test_service import FakeBrain,healthy,event,AUTH,login
from test_kitchen import generate

SUBJECT='synthetic-one'
DAY='2026-01-03'

@pytest.fixture
def svc(tmp_path,monkeypatch):
    monkeypatch.delenv('AZURE_OPENAI_ENDPOINT',raising=False)
    value=Service(SQLiteStore(tmp_path/'intake.db'),FakeBrain());healthy(value)
    return value


def request(svc,action='intake',**values):
    rev=svc.opened(SUBJECT)['state']['revision']
    return svc.kitchen(SUBJECT,action,values=values,expected_revision=rev)


def confirm(svc,result):
    return svc.apply(SUBJECT,result['proposal']['id'],result['state']['revision'],True)


def recipe(svc,**extra):
    return dict(operation='add',recipe_id=next(iter(svc.base['recipes'])),amount={'value':1,'unit':'portion'},date=DAY,**extra)


def history(svc,**values):
    return svc.kitchen(SUBJECT,'diary_history',values=values)


def personal_food(svc,partial=False):
    food={'food_id':'Uintake12345','name_ru':'Личная этикетка','state':'raw','allergens':[],
          'label_confirmed':True,'source_ref':'synthetic:label','carb_basis':'total_includes_fiber',
          'energy_kcal':100,'protein_g':5,'fat_g':5,'carbohydrate_total_g':10,'fiber_g':None if partial else 3,
          'nutrient_status':'partial' if partial else 'complete'}
    event(svc,'catalog.food.add',food)
    return food['food_id']


def own_dish(svc):
    food=next(iter(svc.base['foods'].values()))
    values={'recipe_id':'Rintakeown123','name_ru':'Своя порция','category':'main','base_servings':4,
            'active_minutes':5,'ingredients':[{'food_id':food['food_id'],'state':food['state'],'grams_edible':400}],'steps_ru':'Смешать'}
    rev=svc.opened(SUBJECT)['state']['revision']
    confirm(svc,svc.kitchen(SUBJECT,'own_dish_save',values=values,expected_revision=rev))
    return values['recipe_id']


@pytest.mark.parametrize('source',['catalog','generated','own_dish','product'])
def test_four_sources_preview_then_confirm_exact_intake(svc,source):
    values=recipe(svc,time='12:35',meal='lunch')
    if source=='generated':values['recipe_id']=generate(svc)['recipes'][0]['recipe_id']
    if source=='own_dish':values['recipe_id']=own_dish(svc);values['amount']={'value':.5,'unit':'batch'}
    if source=='product':values.pop('recipe_id');values.update(food_id=personal_food(svc),amount={'value':125,'unit':'g'})
    before,_=svc.load(SUBJECT);preview=request(svc,'intake_preview',**values)
    assert svc.load(SUBJECT)[0]==before
    pending=request(svc,**values,preview_hash=preview['preview_hash'])
    assert not pending['state']['diary']
    assert pending['proposal']['preview_hash']==preview['preview_hash']
    result=confirm(svc,pending);row=result['entry']
    assert result['entry_id']==row['entry_id']==result['receipt']['entry_id']
    assert row['date']==DAY and row['eaten_at']=='2026-01-03T12:35:00+03:00'
    assert row['recorded_at']!=row['eaten_at'] and row['meal']=='lunch'
    assert row['nutrition']==preview['preview']['calculation']['nutrition']
    assert row['nutrition_snapshot']['source']['name_ru']==row['name_ru']
    assert result['diary_summary']['date']==DAY and result['diary_summary']['entry_count']==1
    assert svc.load(SUBJECT)[0]['kitchen']['pantry']==before['kitchen']['pantry']
    assert svc.load(SUBJECT)[0]['core']['custom_recipes']==before['core']['custom_recipes']
    assert svc.brain.calls==0


def test_date_only_dst_and_explicit_timezone(svc):
    first=confirm(svc,request(svc,**recipe(svc)))['entry']
    assert 'eaten_at' not in first and first['timezone']=='Europe/Minsk'
    for extra in ({'date':'2026-1-3'},{'date':'2026-02-31'}, {'time':'25:00'},
                  {'date':'2026-03-08','time':'02:30','timezone':'America/New_York'},
                  {'date':'2026-11-01','time':'01:30','timezone':'America/New_York'}):
        with pytest.raises(ValueError):request(svc,**{**recipe(svc),**extra})
    values={**recipe(svc),'date':'2026-11-01','time':'01:30','timezone':'America/New_York','time_fold':1}
    row=confirm(svc,request(svc,**values))['entry']
    assert row['eaten_at']=='2026-11-01T01:30:00-05:00'
    with pytest.raises(ValueError):event(svc,'diary.add',{'date':DAY,'timezone':'Europe/Minsk','eaten_at':'2026-01-04T00:00:00+03:00'})


def test_snapshot_edit_and_new_record_catalog_change(svc):
    saved=confirm(svc,request(svc,**recipe(svc,time='13:20')))['entry']
    rid=saved['recipe_id'];fid=svc.base['recipes'][rid]['ingredients'][0]['food_id']
    svc.base=copy.deepcopy(svc.base);svc.base['foods'][fid]['energy_kcal']+=1000;svc.base['recipes'][rid]['name_ru']='Новое имя'
    old=history(svc,entry_id=saved['entry_id'])['entries'][0]
    assert old['name_ru']==saved['name_ru'] and old['nutrition']==saved['nutrition']
    moved=confirm(svc,request(svc,operation='update',entry_id=saved['entry_id'],date='2026-01-04',note='Исправлено'))['entry']
    assert moved['nutrition_snapshot']==saved['nutrition_snapshot'] and moved['recorded_at']==saved['recorded_at']
    assert moved['entry_id']==saved['entry_id'] and moved['eaten_at']=='2026-01-04T13:20:00+03:00' and moved['updated_at']
    scaled=confirm(svc,request(svc,operation='update',entry_id=saved['entry_id'],amount={'value':.5,'unit':'portion'}))['entry']
    assert scaled['nutrition']['energy_kcal']==pytest.approx(saved['nutrition']['energy_kcal']/2)
    assert history(svc,date=DAY)['summary']['empty'] and history(svc,date='2026-01-04')['summary']['entry_count']==1
    fresh=request(svc,'intake_preview',**recipe(svc))['preview']['entry']
    assert fresh['name_ru']=='Новое имя' and fresh['nutrition_snapshot']['source']['composition_hash']!=saved['nutrition_snapshot']['source']['composition_hash']


def test_observational_intake_preserves_allergen_warning_after_source_changes(svc):
    values=recipe(svc);calculation=k.calculate_recipe(svc.base,values['recipe_id'],1)
    assert calculation['allergens']
    allergen=calculation['allergens'][0]
    event(svc,'profile.update',{'allergies':[allergen]})
    pending=request(svc,**values)
    assert 'allergen:'+allergen in pending['proposal']['preview']['issues']
    saved=confirm(svc,pending)['entry']
    assert allergen in saved['nutrition_snapshot']['allergens']
    svc.base=copy.deepcopy(svc.base)
    for food in svc.base['foods'].values():food['allergens']=[]
    repeated=request(svc,operation='repeat',entry_id=saved['entry_id'],date='2026-01-04')
    assert 'allergen:'+allergen in repeated['proposal']['preview']['issues']


def test_delete_preview_identifies_owned_record_and_does_not_delete_early(svc):
    row=confirm(svc,request(svc,**recipe(svc,time='12:35')))['entry']
    revision=svc.opened(SUBJECT)['state']['revision']
    pending=svc.propose(SUBJECT,'diary.delete',{'entry_id':row['entry_id']},revision)
    preview=pending['proposal']['preview']['entry']
    assert preview['entry_id']==row['entry_id'] and preview['name_ru']==row['name_ru']
    assert preview['date']==DAY and preview['amount']==row['amount']
    assert history(svc)['total']==1
    confirm(svc,pending)
    assert history(svc)['total']==0


def test_generated_repeat_survives_topic_clear_and_does_not_reuse_time(svc):
    generated=generate(svc);rid=generated['recipes'][0]['recipe_id']
    row=confirm(svc,request(svc,**{**recipe(svc,time='18:40'),'recipe_id':rid}))['entry']
    rev=svc.opened(SUBJECT)['state']['revision'];svc.topics(SUBJECT,'clear',thread_id='main',confirmed=True,expected_revision=rev)
    assert not svc.load(SUBJECT)[0]['kitchen']['drafts'] and rid not in svc.load(SUBJECT)[0]['core']['custom_recipes']
    draft=request(svc,operation='repeat',entry_id=row['entry_id'],date='2026-01-10',amount={'value':.25,'unit':'batch'})
    assert len(svc.load(SUBJECT)[0]['core']['diary'])==1
    repeated=confirm(svc,draft)['entry']
    assert repeated['entry_id']!=row['entry_id'] and repeated['date']=='2026-01-10' and 'eaten_at' not in repeated
    assert repeated['nutrition_snapshot']==row['nutrition_snapshot'] and repeated['portions']==.5
    assert history(svc,entry_id=row['entry_id'])['entries'][0]['eaten_at']==row['eaten_at']


def test_history_full_day_before_paging_old_entry_edit_and_stale_page(svc):
    values=recipe(svc);d,version=svc.load(SUBJECT)
    for i in range(75):
        payload={'recipe_id':values['recipe_id'],'portions':1,'date':DAY,'intake_status':'confirmed'}
        d['core']=k.apply_event(d['core'],{'event_id':f'history_{i:08}','type':'diary.add','payload':payload,'confirmed':True},d['core']['state_revision'],SUBJECT,svc.base)
    d['revision']+=1;svc.save(SUBJECT,d,version)
    state=svc.opened(SUBJECT)['state'];assert len(state['diary'])==60 and state['diary_total']==75
    pages=[history(svc,date=DAY,offset=offset,limit=20) for offset in (0,20,40,60)]
    ids=[r['entry_id'] for page in pages for r in page['entries']]
    assert len(ids)==len(set(ids))==75 and pages[-1]['has_more'] is False
    assert all(page['summary']['entry_count']==75 for page in pages)
    assert pages[0]['summary']['nutrition']['energy_kcal']==pytest.approx(75*pages[0]['entries'][0]['nutrition']['energy_kcal'])
    old='history_00000000';confirm(svc,request(svc,operation='update',entry_id=old,note='Старая запись'))
    assert history(svc,entry_id=old)['entries'][0]['note']=='Старая запись'
    with pytest.raises(Conflict):svc.kitchen(SUBJECT,'diary_history',values={'offset':20},expected_revision=state['revision'])


def test_partial_and_empty_summary_keep_unknowns_and_budget(svc):
    today=datetime.now(ZoneInfo('Europe/Minsk')).date().isoformat()
    empty=history(svc,date=today)['summary'];assert empty['empty'] and empty['nutrition'] is None
    assert all(x['known_subtotal'] is None and not x['complete'] for x in empty['coverage'].values())
    assert all(card['budget']['remaining_g'] is None for card in generate(svc)['recipes'])
    fid=personal_food(svc,partial=True)
    row=confirm(svc,request(svc,operation='add',food_id=fid,amount={'value':50,'unit':'g'},date=today))['entry']
    assert row['nutrition']['fiber_g'] is None and row['nutrition'][k.DERIVED] is None and not row['complete']
    event(svc,'diary.add',{'date':today,'note':'Без количества','intake_status':'unquantified'})
    summary=history(svc,date=today)['summary']
    assert summary['entry_count']==2 and summary['known_entries']==1 and summary['unquantified_entries']==1 and summary['incomplete_entries']==2
    assert summary['coverage']['energy_kcal']['known_subtotal']==50 and not summary['coverage']['energy_kcal']['complete']
    assert all(card['budget']['remaining_g'] is None for card in svc.kitchen(SUBJECT,'status')['recipes'])


def test_server_fields_quantity_basis_and_foreign_entry_rejected(svc):
    saved=confirm(svc,request(svc,**recipe(svc)))['entry']
    for field in ('nutrition_snapshot','nutrition','coverage','recorded_at','entry_id'):
        with pytest.raises(ValueError):request(svc,**{**recipe(svc),field:{}})
        with pytest.raises(ValueError):event(svc,'diary.update',{'entry_id':saved['entry_id'],'changes':{field:{}}})
    for amount in ({'value':False,'unit':'portion'},{'value':0,'unit':'portion'},{'value':'NaN','unit':'portion'},{'value':100,'unit':'g'},{'value':1,'unit':'ml'}):
        with pytest.raises(ValueError):request(svc,**{**recipe(svc),'amount':amount})
    own=own_dish(svc)
    half=request(svc,'intake_preview',**{**recipe(svc),'recipe_id':own,'amount':{'value':.5,'unit':'portion'}})['preview']['entry']
    batch=request(svc,'intake_preview',**{**recipe(svc),'recipe_id':own,'amount':{'value':.5,'unit':'batch'}})['preview']['entry']
    assert half['portions']==.5 and batch['portions']==2
    svc.consent('synthetic-other',True,True,True,True)
    other,version=svc.load('synthetic-other');other['core']['profile']['timezone']='Europe/Minsk';svc.save('synthetic-other',other,version)
    for action,values in [('diary_history',{'entry_id':saved['entry_id']}),('intake',{'operation':'repeat','entry_id':saved['entry_id'],'date':DAY})]:
        with pytest.raises(ValueError):svc.kitchen('synthetic-other',action,values=values,expected_revision=1)


def test_pending_digest_cas_expiry_cancel_and_repeat_apply(svc):
    values=recipe(svc);preview=request(svc,'intake_preview',**values)
    with pytest.raises(Conflict):request(svc,**{**values,'amount':{'value':.5,'unit':'portion'}},preview_hash=preview['preview_hash'])
    pending=request(svc,**values);rid=values['recipe_id'];fid=svc.base['recipes'][rid]['ingredients'][0]['food_id']
    svc.base=copy.deepcopy(svc.base);svc.base['foods'][fid]['energy_kcal']+=1
    with pytest.raises(Conflict):confirm(svc,pending)
    svc.apply(SUBJECT,pending['proposal']['id'],pending['state']['revision'],False)
    pending=request(svc,**values)
    with pytest.raises(Conflict):svc.apply(SUBJECT,pending['proposal']['id'],pending['state']['revision']+1,True)
    result=confirm(svc,pending)
    assert svc.apply(SUBJECT,pending['proposal']['id'],pending['state']['revision'],True)['receipt']==result['receipt']
    assert len(svc.load(SUBJECT)[0]['core']['diary'])==1
    expired=request(svc,**values);d,version=svc.load(SUBJECT);d['pending'][expired['proposal']['id']]['expires_at']=0;svc.save(SUBJECT,d,version)
    with pytest.raises(ValueError):confirm(svc,expired)
    svc.consent(SUBJECT,False,False,False,True)
    with pytest.raises(ValueError):request(svc,**values)


def test_legacy_history_never_fabricates_snapshot_or_time(svc):
    d,version=svc.load(SUBJECT);rid=next(iter(svc.base['recipes']))
    legacy={'entry_id':'legacy_00001','recorded_at':'2020-01-02T03:04:05Z','date':DAY,'recipe_id':rid,'portions':1,'intake_status':'confirmed'}
    d['core']['diary'].append(legacy);svc.save(SUBJECT,d,version)
    row=history(svc,entry_id=legacy['entry_id'])['entries'][0]
    assert row['legacy_estimate'] and 'nutrition_snapshot' not in row and 'eaten_at' not in row
    confirm(svc,request(svc,operation='update',entry_id=legacy['entry_id'],note='Уточнение'))
    row=history(svc,entry_id=legacy['entry_id'])['entries'][0]
    assert 'nutrition_snapshot' not in row and 'eaten_at' not in row and row['recorded_at']==legacy['recorded_at']


def test_apply_transport_requires_one_use_ui_confirmation(svc):
    app=create_app(svc,AUTH,'synthetic-intake-secret','http://testserver',testing=True)
    with TestClient(app) as client:
        headers=login(client)
        prepared=client.post('/api/tools/keto_kitchen',headers=headers,json={'action':'intake','values':recipe(svc),'expected_revision':svc.opened(SUBJECT)['state']['revision']})
        assert prepared.status_code==200
        result=prepared.json();args={'proposal_id':result['proposal']['id'],'expected_revision':result['state']['revision'],'approved':True}
        assert client.post('/api/tools/keto_apply_proposal',headers=headers,json=args).status_code==422
        token=client.post('/api/tools/keto_open',headers=headers,json={}).json()['_ui_confirmation']
        saved=client.post('/api/tools/keto_apply_proposal',headers=headers,json={**args,'ui_confirmation':token})
        assert saved.status_code==200 and saved.json()['entry_id']
        assert client.post('/api/tools/keto_apply_proposal',headers=headers,json={**args,'ui_confirmation':token}).status_code==422
        assert len(svc.load(SUBJECT)[0]['core']['diary'])==1


def test_time_edit_requires_fresh_overlap_choice_and_note_preserves_seconds(svc):
    row=confirm(svc,request(svc,**{**recipe(svc),'date':'2026-10-31','time':'01:30','timezone':'America/New_York'}))['entry']
    with pytest.raises(ValueError,match='Двусмысленное время'):
        request(svc,operation='update',entry_id=row['entry_id'],date='2026-11-01')
    changed=confirm(svc,request(svc,operation='update',entry_id=row['entry_id'],date='2026-11-01',time_fold=1))['entry']
    assert changed['eaten_at']=='2026-11-01T01:30:00-05:00'
    precise=event(svc,'diary.add',{'date':DAY,'timezone':'Europe/Minsk','eaten_at':'2026-01-03T12:34:56+03:00','note':'Точная запись','intake_status':'unquantified'})['entry']
    noted=confirm(svc,request(svc,operation='update',entry_id=precise['entry_id'],note='Только текст'))['entry']
    assert noted['eaten_at']==precise['eaten_at']
    repeated=confirm(svc,request(svc,operation='repeat',entry_id=precise['entry_id'],date='2026-01-04'))['entry']
    assert repeated['note']=='Только текст' and repeated['calculation'] is None and 'eaten_at' not in repeated


def test_legacy_source_only_correction_preserves_quantity(svc):
    first,second=list(svc.base['recipes'])[:2]
    saved=event(svc,'diary.add',{'date':DAY,'recipe_id':first,'portions':1,'intake_status':'confirmed'})['entry']
    same=event(svc,'diary.update',{'entry_id':saved['entry_id'],'changes':{'recipe_id':first}})['entry']
    assert same['portions']==1 and same['nutrition_snapshot']==saved['nutrition_snapshot']
    changed=event(svc,'diary.update',{'entry_id':saved['entry_id'],'changes':{'recipe_id':second}})['entry']
    assert changed['recipe_id']==second and changed['portions']==1 and changed['nutrition'] is not None
    assert changed['nutrition_snapshot']['source']['id']==second
    assert changed['nutrition_snapshot']['source']['composition_hash']!=saved['nutrition_snapshot']['source']['composition_hash']


def test_old_note_can_be_corrected_and_repeated_without_inventing_timezone(svc):
    d,version=svc.load(SUBJECT);d['core']['profile']['timezone']=None
    d['core']['diary'].append({'entry_id':'legacy_note_001','recorded_at':'2020-01-02T00:00:00Z','date':DAY,'note':'Без количества','intake_status':'unquantified'})
    svc.save(SUBJECT,d,version)
    row=confirm(svc,request(svc,operation='update',entry_id='legacy_note_001',note='Исправленный текст'))['entry']
    assert 'timezone' not in row and 'eaten_at' not in row and row['calculation'] is None
    repeated=confirm(svc,request(svc,operation='repeat',entry_id=row['entry_id'],date='2026-01-04'))['entry']
    assert repeated['date']=='2026-01-04' and 'timezone' not in repeated and repeated['calculation'] is None


def test_available_carbohydrate_label_is_never_relabelled_net_or_total(svc):
    food={'food_id':'Uavailable123','name_ru':'Этикетка доступных углеводов','state':'raw','allergens':[],
          'label_confirmed':True,'source_ref':'Личная этикетка','carb_basis':'total_includes_fiber','recipe_eligible':False,
          'provenance':{'type':'shop_label','provider':'personal_label','barcode':None,'license':None},
          'energy_kcal':100,'protein_g':5,'fat_g':5,'carbohydrate_total_g':None,'fiber_g':3,'nutrient_status':'partial',
          'declared_carbohydrate':{'value':10,'basis':'available_excludes_fiber'},
          'declared_label':{'basis':'per100g','mass_g':100,'energy_kcal':100,'protein_g':5,'fat_g':5,'carbohydrate_g':10,'fiber_g':3,'carbohydrate_basis':'available_excludes_fiber'}}
    event(svc,'catalog.food.add',food)
    row=confirm(svc,request(svc,operation='add',food_id=food['food_id'],date=DAY,amount={'value':150,'unit':'g'}))['entry']
    assert row['calculation']['available_carbohydrate_g']==15
    assert row['nutrition']['carbohydrate_total_g'] is None and row['nutrition'][k.DERIVED] is None
    assert row['coverage'][k.DERIVED]['known_subtotal'] is None
    summary=history(svc,date=DAY)['summary']
    assert summary['coverage'][k.DERIVED]['known_subtotal'] is None and not summary['coverage'][k.DERIVED]['complete']


def test_clear_fields_and_generated_thread_ownership(svc):
    generated=generate(svc);rid=generated['recipes'][0]['recipe_id'];rev=svc.opened(SUBJECT)['state']['revision']
    other=svc.topics(SUBJECT,'create',title='Другая тема',confirmed=True,expected_revision=rev)['state']
    with pytest.raises(ValueError,match='Черновик'):
        svc.kitchen(SUBJECT,'intake',thread_id=other['active_thread'],values={**recipe(svc),'recipe_id':rid},expected_revision=other['revision'])
    pending=svc.kitchen(SUBJECT,'intake',thread_id='main',values={**recipe(svc,time='18:20',meal='dinner',note='Текст'),'recipe_id':rid},expected_revision=other['revision'])
    row=confirm(svc,pending)['entry']
    cleared=confirm(svc,request(svc,operation='update',entry_id=row['entry_id'],meal='',note='',time=None))['entry']
    assert cleared['meal']=='' and cleared['note']=='' and 'eaten_at' not in cleared and 'time_fold' not in cleared
    assert cleared['nutrition_snapshot']==row['nutrition_snapshot']
