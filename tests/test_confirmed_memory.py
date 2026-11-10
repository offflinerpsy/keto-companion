"""Confirmed own-account context, read-only consumption answers and incomplete totals."""
import copy
import pytest
from service.domain import Service,k
from service.store import SQLiteStore
from service.kitchen import confirmed_profile_memory,diary_query
from test_service import FakeBrain,healthy,event,parsed

@pytest.fixture
def svc(tmp_path):
    service=Service(SQLiteStore(tmp_path/'memory.sqlite'),FakeBrain());healthy(service)
    return service

def add(svc,day='2026-01-03',note=False):
    if note:event(svc,'diary.add',{'date':day,'note':'Количество не помню','intake_status':'unquantified'})
    else:event(svc,'diary.add',{'date':day,'recipe_id':'B01','portions':.5,'time':'12:40','timezone':'Europe/Minsk','intake_status':'confirmed'})

def test_local_memory_uses_confirmed_profile_and_ignores_pending(svc):
    event(svc,'profile.update',{'display_name':'Синтетическая Анна','goal':'Готовить дома'})
    d,_=svc.load('synthetic-one');svc.propose('synthetic-one','profile.update',{'display_name':'Неподтверждённое имя'},d['revision'])
    result=svc.chat('synthetic-one','Что ты обо мне помнишь?','memory_profile_001')
    assert 'Синтетическая Анна' in result['message'] and 'Готовить дома' in result['message']
    assert 'Неподтверждённое' not in result['message'] and 'Europe/Minsk' in result['message']
    assert result['model_called'] is False and svc.brain.calls==0

def test_model_receives_only_current_own_confirmed_profile_and_selected_day(svc):
    event(svc,'profile.update',{'display_name':'Синтетическая Анна'})
    add(svc);captured=[]
    def infer(message,context,image=None):captured.append(copy.deepcopy(context));return parsed('other',reply_ru='Обсуждаем сохранённый день.')
    svc.brain.infer=infer
    before=copy.deepcopy(svc.load('synthetic-one')[0]['core']['diary'])
    result=svc.chat('synthetic-one','Обсудим мой дневник за 2026-01-03 и следующий приём пищи','memory_context_001')
    ctx=captured[0];memory=ctx['confirmed_profile'];day=ctx['confirmed_diary']
    assert memory['display_name']=='Синтетическая Анна' and memory['targets']['carb_basis']=='net_estimate'
    assert not {'owner_account_id','subject_id','medications','screening','pending'}&memory.keys()
    assert day['date']=='2026-01-03' and day['entry_count']==1 and day['entries'][0]['time']=='12:40'
    assert 'net_carbohydrate_g' in day['target_comparison'] and not result.get('proposal')
    assert svc.load('synthetic-one')[0]['core']['diary']==before
    svc.consent('synthetic-two',True,True,True,True)
    other,_=svc.load('synthetic-two');other_context=svc.kitchen_context(other,'Обсудим дневник за 2026-01-03','main')
    assert not other_context['confirmed_profile'].get('display_name') and other_context['confirmed_diary']['entry_count']==0

def test_full_day_sum_precedes_context_limit_and_partial_values_remain_partial(svc):
    for _ in range(11):add(svc)
    add(svc,note=True)
    d,_=svc.load('synthetic-one');ctx=svc.confirmed_diary_context(d,'Дневник за 2026-01-03')
    assert len(ctx['entries'])==10 and ctx['entry_count']==12 and ctx['omitted_entries']==2
    expected=k.diary_summary(d['core']['diary'],svc.kitchen_catalog(d),'2026-01-03')
    assert ctx['summary']==expected and ctx['target_comparison']['energy_kcal']['status']=='incomplete'
    assert 'to_upper' not in ctx['target_comparison']['energy_kcal']
    answer=svc.chat('synthetic-one','Сколько калорий съела за 2026-01-03?','memory_day_001')
    assert 'известная часть' in answer['message'] and 'г жиров' in answer['message']
    assert answer['daily_summary']==expected and not answer.get('proposal') and svc.brain.calls==0

def test_daily_consumption_is_not_a_request_for_calorie_targets(svc):
    assert diary_query('Сколько калорий сегодня?')
    assert diary_query('Что я сегодня ела?')
    assert not diary_query('Сколько мне нужно калорий сегодня?')
    result=svc.chat('synthetic-one','Сколько калорий сегодня?','memory_today_001')
    assert result.get('daily_summary') and 'нет записей' in result['message'] and svc.brain.calls==0

def test_absent_timezone_and_stale_targets_are_explicit(svc):
    d,_=svc.load('synthetic-one');d['core']['profile'].pop('timezone',None)
    assert svc.confirmed_diary_context(d,'Что я сегодня ела?')['date'] is None
    assert svc.confirmed_diary_context(d,'Дневник за 2026-01-03')['date']=='2026-01-03'
    d['targets_provenance']={'source':'starter_policy','fingerprint':'old-synthetic-fingerprint'}
    memory=confirmed_profile_memory(d)
    assert memory['targets_stale'] is True and memory['targets']['status']=='agreed'
    assert 'устарели' in svc.memory_reply(d)

def test_forgotten_preference_not_restored_by_profile_context(svc):
    r=svc.chat('synthetic-one','Запомни, не люблю рыбу','memory_remember_001')
    svc.apply('synthetic-one',r['proposal']['id'],r['state']['revision'],True)
    r=svc.chat('synthetic-one','Забудь это предпочтение','memory_forget_001')
    svc.apply('synthetic-one',r['proposal']['id'],r['state']['revision'],True)
    d,_=svc.load('synthetic-one');ctx=svc.kitchen_context(d,'не люблю рыбу','main')
    assert ctx['confirmed_kitchen']['preferences']==[] and ctx['own_historical_quotes']==[]
    assert 'Не люблю: рыбу' not in svc.memory_reply(d)


def test_manual_targets_pause_comparison_on_clinical_hold(svc):
    add(svc);d,_=svc.load('synthetic-one');d['holds']=['clinician_review']
    context=svc.confirmed_diary_context(d,'Дневник за 2026-01-03')
    memory=confirmed_profile_memory(d)
    assert memory['targets']['status']=='agreed' and memory['planning_paused'] is True
    assert context['target_comparison']=={}


def test_unquantified_note_does_not_enter_canonical_food_memory(svc):
    event(svc,'diary.add',{'date':'2026-01-03','note':'Не люблю рыбу. '*180,'intake_status':'unquantified'})
    d,_=svc.load('synthetic-one');context=svc.confirmed_diary_context(d,'Дневник за 2026-01-03')
    assert context['entries'][0]['name_ru']=='Заметка без уточнённого состава'
    assert 'Не люблю' not in str(context) and 'note' not in context['entries'][0]
