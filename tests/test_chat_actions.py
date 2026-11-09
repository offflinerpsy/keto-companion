"""Message-owned actions, immutable intake origins and conversation lifetime."""
import copy,json,time
import pytest
from service.domain import Service
from service.store import SQLiteStore,Conflict
from service.chat_actions import TYPES
from test_service import FakeBrain,consent,healthy,event,parsed
from test_mobile import topic_action
from test_kitchen import generate

SUBJECT='synthetic-one'
MEAL='Есть яйца, кабачок и шампиньоны; ужин за 20 минут без покупок'

@pytest.fixture
def svc(tmp_path,monkeypatch):
    monkeypatch.delenv('AZURE_OPENAI_ENDPOINT',raising=False)
    return Service(SQLiteStore(tmp_path/'actions.db'),FakeBrain())

def assistant(result):return next(m for m in reversed(result['state']['chat']) if m['role']=='assistant')

def resolve(svc,message,index=0,**extra):
    return svc.kitchen(SUBJECT,'chat_action',thread_id=message['thread_id'],
                       values={'message_id':message['id'],'action_id':message['actions'][index]['id'],**extra},
                       expected_revision=svc.opened(SUBJECT)['state']['revision'])

def chat(svc,text=MEAL,rid='chat_actions_001',tid='main'):
    return svc.chat(SUBJECT,text,rid,thread_id=tid)

def intake_values(source):
    return {'operation':'add','recipe_id':source['recipe_id'],'origin':source['origin'],
            'amount':{'value':1,'unit':'portion'},'date':'2026-11-09',**({'generation_id':source['generation_id']} if source.get('generation_id') else {})}

def intake(svc,source,action='intake',**changes):
    return svc.kitchen(SUBJECT,action,thread_id=source['thread_id'],values={**intake_values(source),**changes},
                       expected_revision=svc.opened(SUBJECT)['state']['revision'])

@pytest.mark.parametrize('path',['normal','catalog','fast'])
def test_actions_survive_reload_and_replay_without_duplicate_turn(svc,path):
    consent(svc)
    if path=='catalog':svc.brain.result=parsed('recipes')
    text=MEAL if path=='fast' else 'Что приготовить?' if path=='catalog' else 'Помоги начать'
    result=chat(svc,text);message=assistant(result);before=svc.load(SUBJECT)
    assert message['id']==result['message_id'] and message['thread_id']==result['response_thread_id']=='main'
    assert 1<=len(message['actions'])<=3
    assert all(a['type'] in TYPES and a['issued_revision']==result['state']['revision'] for a in message['actions'])
    assert len(json.dumps(message['actions'],ensure_ascii=False).encode())<2500
    reopened=Service(svc.store,svc.brain).opened(SUBJECT)
    assert assistant(reopened)==message
    replay=chat(svc,text)
    assert replay['replayed'] and not replay['model_called'] and replay['message_id']==message['id']
    assert assistant(replay)==message and svc.load(SUBJECT)==before

@pytest.mark.parametrize('text',['Хочу поесть','Я голодна!','Проголодался','Хочу есть'])
def test_hunger_modes_are_durable_local_navigation_not_generation(svc,text):
    consent(svc);before=svc.load(SUBJECT)[0];result=chat(svc,text)
    message=assistant(result)
    assert [a['target']['mode'] for a in message['actions']]==['pantry_only','pantry_plus','inspiration']
    assert not result['model_called'] and svc.brain.calls==0
    for i in range(3):
        state=svc.load(SUBJECT);resolved=resolve(svc,message,i)
        assert resolved['command']=={'type':'choose_meal_mode','mode':message['actions'][i]['target']['mode']}
        assert not resolved['model_called'] and svc.load(SUBJECT)==state
    after=svc.load(SUBJECT)[0]
    assert after['kitchen']==before['kitchen'] and after['core']==before['core'] and after['pending']==before['pending']


def test_hunger_does_not_bypass_consent_clinical_or_source_paths(svc):
    assert chat(svc,'Хочу поесть')['requires_consent']
    assert svc.store.read(SUBJECT)==(None,None)
    consent(svc)
    assert chat(svc,'Я не могу дышать, хочу поесть','urgent_hunger_01')['safety_hold']==['urgent']
    assert not svc.brain.calls
    result=svc.chat(SUBJECT,'Хочу поесть','quoted_hunger_01',source={'text':'untrusted quote'})
    assert svc.brain.calls==1 and not result.get('meal_modes')


def test_resolver_checks_message_thread_user_exact_fields_and_revision(svc):
    consent(svc);message=assistant(chat(svc,'Помоги начать'))
    with pytest.raises(ValueError):resolve(svc,message,target={'view':'https://bad.example'})
    with pytest.raises(Conflict):svc.kitchen(SUBJECT,'chat_action',thread_id='main',values={'message_id':message['id'],'action_id':'a1'},expected_revision=0)
    svc.consent('other-subject',True,True,True,True)
    with pytest.raises(ValueError):svc.kitchen('other-subject','chat_action',thread_id='main',values={'message_id':message['id'],'action_id':'a1'},expected_revision=1)
    topic_action(svc,'create',title='Другая');tid=svc.opened(SUBJECT)['state']['active_thread']
    with pytest.raises(ValueError):svc.kitchen(SUBJECT,'chat_action',thread_id=tid,values={'message_id':message['id'],'action_id':'a1'},expected_revision=svc.opened(SUBJECT)['state']['revision'])
    topic_action(svc,'select',thread_id='main')
    assert resolve(svc,message)['command']['view']=='setup'


def test_generated_reference_never_retargets_selected_recipe_or_generation(svc):
    consent(svc);result=chat(svc);message=assistant(result);target=message['actions'][0]['target']
    rev=result['state']['revision'];other=result['recipes'][1]['recipe_id']
    svc.kitchen(SUBJECT,'select',thread_id='main',recipe_id=other,expected_revision=rev)
    resolved=resolve(svc,message)
    assert resolved['command']['recipe']['recipe_id']==target['recipe_id']!=other
    assert resolved['command']['source']['generation_id']==target['generation_id']
    assert resolved['command']['source']['name_ru']
    generated=generate(svc,request_id='new_generation_01',spec=result['spec'])
    assert target['recipe_id'] in [r['recipe_id'] for r in generated['recipes']]
    unavailable=resolve(svc,message)
    assert unavailable['command'] is None and unavailable['action']['status']=='unavailable'
    assert assistant(svc.opened(SUBJECT))['actions'][0]['status']=='unavailable'


def test_catalog_target_stays_open_after_topic_navigation(svc):
    consent(svc);svc.brain.result=parsed('recipes');message=assistant(chat(svc,'Что приготовить?'))
    topic_action(svc,'create',title='Ещё');topic_action(svc,'select',thread_id='main')
    result=resolve(svc,message)
    assert result['command']['source']['kind']=='catalog_recipe'
    assert result['action']['issued_revision']<result['revision']


def test_half_recipe_opens_shared_intake_without_preparing_or_applying(svc):
    healthy(svc);result=chat(svc);rid=result['recipes'][0]['recipe_id']
    svc.kitchen(SUBJECT,'select',thread_id='main',recipe_id=rid,expected_revision=result['state']['revision'])
    before=svc.load(SUBJECT)[0]
    reply=chat(svc,'Запиши половину порции','half_intake_chat')
    resolved=resolve(svc,assistant(reply))
    assert resolved['command']['type']=='open_intake'
    assert resolved['command']['source']['recipe_id']==rid
    assert resolved['command']['suggested_amount']=={'value':.5,'unit':'portion'}
    assert not reply.get('proposal') and svc.load(SUBJECT)[0]['pending']==before['pending']
    assert svc.load(SUBJECT)[0]['core']==before['core']
    ambiguous=chat(svc,'Запиши половину','half_unknown_01')
    assert 'suggested_amount' not in resolve(svc,assistant(ambiguous))['command']


def test_intake_origin_survives_preview_prepare_apply_and_never_changes_recipe(svc):
    healthy(svc);message=assistant(chat(svc));source=resolve(svc,message)['command']['source']
    before=svc.load(SUBJECT)
    preview=intake(svc,source,'intake_preview')
    assert svc.load(SUBJECT)==before
    proposal=intake(svc,source,preview_hash=preview['preview_hash'])['proposal']
    assert proposal['payload']['origin']==source['origin']
    with pytest.raises(ValueError):intake(svc,source,recipe_id=next(iter(svc.base['recipes'])))
    result=svc.apply(SUBJECT,proposal['id'],svc.opened(SUBJECT)['state']['revision'],True)
    assert result['entry']['recipe_id']==source['recipe_id']
    assert 'origin' not in result['entry']


def test_intake_origin_revalidated_at_apply_after_generation_replaced(svc):
    healthy(svc);source=resolve(svc,assistant(chat(svc)))['command']['source']
    prepared=intake(svc,source)
    generate(svc,request_id='replace_origin_01')
    with pytest.raises(ValueError):intake(svc,source,'intake_preview')
    with pytest.raises(Conflict):svc.apply(SUBJECT,prepared['proposal']['id'],svc.opened(SUBJECT)['state']['revision'],True)
    assert not svc.load(SUBJECT)[0]['core']['diary']


@pytest.mark.parametrize('operation',['clear','delete'])
def test_inflight_normal_reply_cannot_resurrect_cleared_or_deleted_topic(svc,operation):
    consent(svc);topic_action(svc,'create',title='Исходная');tid=svc.opened(SUBJECT)['state']['active_thread']
    svc.brain.hook=lambda:topic_action(svc,operation,thread_id=tid)
    with pytest.raises((ValueError,Conflict)):chat(svc,'Продолжим','normal_lifetime_01',tid)
    d,_=svc.load(SUBJECT)
    assert tid not in d['topics'] if operation=='delete' else not d['topics'][tid]['messages']
    assert 'normal_lifetime_01' not in d['requests']


def test_inflight_normal_reply_preserves_new_active_topic(svc):
    consent(svc);topic_action(svc,'create',title='Исходная');tid=svc.opened(SUBJECT)['state']['active_thread']
    svc.brain.hook=lambda:topic_action(svc,'select',thread_id='main')
    result=chat(svc,'Продолжим','normal_selection_01',tid)
    assert result['state']['active_thread']=='main' and result['response_thread_id']==tid
    d,_=svc.load(SUBJECT);assert len(d['topics'][tid]['messages'])==2 and not d['topics']['main']['messages']


@pytest.mark.parametrize('operation',['select','clear','delete'])
def test_fast_reply_respects_topic_changes_after_generation(svc,monkeypatch,operation):
    consent(svc);topic_action(svc,'create',title='Исходная');tid=svc.opened(SUBJECT)['state']['active_thread'];original=svc.kitchen
    def changed(*args,**kwargs):
        result=original(*args,**kwargs)
        if len(args)>1 and args[1]=='generate':topic_action(svc,operation,thread_id='main' if operation=='select' else tid)
        return result
    monkeypatch.setattr(svc,'kitchen',changed)
    if operation=='select':
        result=chat(svc,tid=tid)
        assert result['state']['active_thread']=='main' and result['response_thread_id']==tid
        assert len(svc.load(SUBJECT)[0]['topics'][tid]['messages'])==2
    else:
        with pytest.raises((ValueError,Conflict)):chat(svc,tid=tid)
        d,_=svc.load(SUBJECT)
        assert tid not in d['topics'] if operation=='delete' else not d['topics'][tid]['messages']
        assert 'chat_actions_001' not in d['requests']


def test_clear_invalidates_actions_but_preserves_pending_safety_review_and_confirmed_memory(svc):
    consent(svc);event(svc,'settings.update',{'disliked_food_ids':['F171477']})
    other=svc.propose(SUBJECT,'ui',{'text_size':'large'},svc.opened(SUBJECT)['state']['revision'])['proposal']
    result=chat(svc,'Запомни, что не люблю яйца','pending_origin_01');pid=result['proposal']['id'];message=assistant(result)
    assert resolve(svc,message)['command']['proposal_id']==pid
    topic_action(svc,'clear',thread_id='main');d,_=svc.load(SUBJECT)
    assert pid in d['pending'] and other['id'] in d['pending']
    with pytest.raises(Conflict):svc.apply(SUBJECT,pid,d['revision'],True)
    assert d['core']['profile']['settings']['disliked_food_ids']==['F171477']
    with pytest.raises(ValueError):resolve(svc,message)


@pytest.mark.parametrize('state',['cancelled','expired','completed','stale'])
def test_proposal_action_status_is_current_and_resolver_never_applies(svc,state):
    consent(svc);result=chat(svc,'Запомни, что не люблю яйца','proposal_state_01');message=assistant(result);pid=result['proposal']['id']
    if state in ('cancelled','completed'):svc.apply(SUBJECT,pid,result['state']['revision'],state=='completed')
    elif state=='expired':
        d,v=svc.load(SUBJECT);d['pending'][pid]['expires_at']=time.time()-1;svc.save(SUBJECT,d,v)
    else:topic_action(svc,'rename',thread_id='main',title='Новое название')
    before=svc.load(SUBJECT);resolved=resolve(svc,message)
    assert resolved['command'] is None and resolved['action']['status']==('unavailable' if state=='cancelled' else state)
    assert svc.load(SUBJECT)==before


def test_compaction_keeps_stable_action_ids_and_bounded_state(svc):
    consent(svc);message=assistant(chat(svc,'Хочу поесть'))
    d,v=svc.load(SUBJECT)
    for i in range(11):
        tid='synthetic_topic_'+str(i)
        d['topics'][tid]={'id':tid,'title':tid,'epoch':0,'choices':[],
                          'messages':[{'role':'user','text':'я'*5000,'at':'2000-01-01'} for _ in range(60)]}
    svc.save(SUBJECT,d,v);d,_=svc.load(SUBJECT)
    assert sum(len(json.dumps(t['messages'],ensure_ascii=False).encode()) for t in d['topics'].values())<=200000
    assert len(json.dumps(d,ensure_ascii=False).encode())<1400000
    assert assistant(svc.opened(SUBJECT))['id']==message['id']
    assert resolve(svc,message)['command']['mode']=='pantry_only'
    assert not any('recipe' in a or 'ingredients' in a for a in d['topics']['main']['messages'][-1]['actions'])


def test_generation_binding_also_protects_ordinary_generated_editor(svc):
    healthy(svc);result=generate(svc);card=result['recipes'][0]
    values={'operation':'add','recipe_id':card['recipe_id'],'generation_id':card['generation_id'],
            'amount':{'value':1,'unit':'portion'},'date':'2026-11-09'}
    before=svc.load(SUBJECT)
    svc.kitchen(SUBJECT,'intake_preview',thread_id='main',values=values)
    assert svc.load(SUBJECT)==before
    assert svc.kitchen(SUBJECT,'status')['recipes'][0]['generation_id']==card['generation_id']
    generate(svc,request_id='same_recipe_new_set')
    with pytest.raises(ValueError,match='Подбор изменился'):svc.kitchen(SUBJECT,'intake_preview',thread_id='main',values=values)


def test_origin_guard_runs_again_on_apply_even_without_revision_change(svc):
    healthy(svc);source=resolve(svc,assistant(chat(svc)))['command']['source'];prepared=intake(svc,source)
    d,v=svc.load(SUBJECT);d['topics']['main']['kitchen']['generation_id']='synthetic_replacement';svc.save(SUBJECT,d,v)
    with pytest.raises(ValueError):svc.apply(SUBJECT,prepared['proposal']['id'],d['revision'],True)
    assert not svc.load(SUBJECT)[0]['core']['diary']


def test_replay_survives_dispatcher_change_without_duplicate_or_model_call(svc):
    consent(svc);initial=chat(svc,'Второй вариант','dispatch_replay_01');message=assistant(initial)
    chat(svc,rid='dispatch_group_01');before=svc.load(SUBJECT);calls=svc.brain.calls
    replay=chat(svc,'Второй вариант','dispatch_replay_01')
    assert replay['replayed'] and replay['message_id']==message['id']
    assert svc.load(SUBJECT)==before and svc.brain.calls==calls


def test_legacy_fast_request_hash_remains_replayable_without_migration_write(svc):
    from service.domain import k
    consent(svc);message=assistant(chat(svc,'Хочу поесть'));d,v=svc.load(SUBJECT)
    legacy=k.digest(['Хочу поесть','main']);d['requests']['chat_actions_001']['hash']=legacy
    d['topics']['main']['messages'][-1]['request_hash']=legacy;svc.save(SUBJECT,d,v);before=svc.load(SUBJECT)
    result=chat(svc,'Хочу поесть')
    assert result['replayed'] and result['message_id']==message['id'] and svc.load(SUBJECT)==before


def test_revoke_then_restore_consent_during_inference_does_not_restore_old_turn(svc):
    consent(svc)
    def changed():
        svc.consent(SUBJECT,False,False,False,True);consent(svc)
    svc.brain.hook=changed
    with pytest.raises(Conflict):chat(svc,'Продолжим','revoked_turn_01')
    assert not svc.opened(SUBJECT)['state']['chat']


def test_model_routed_kitchen_generation_uses_same_durable_actions(svc):
    consent(svc)
    svc.brain.result=parsed('kitchen',changes=[{'key':'kitchen.spec','json_value':json.dumps({'mode':'inspiration','meal':'dinner','equipment':'pan','time_budget':20,'servings':1})}])
    result=chat(svc,'Нужна идея','model_kitchen_actions')
    message=assistant(result)
    assert result['intent']=='kitchen' and svc.brain.calls==1 and result['model_called']
    assert len(message['actions'])==len(result['recipes'])==3
    assert all(a['target']['generation_id']==result['recipes'][0]['generation_id'] for a in message['actions'])
    assert resolve(svc,message)['command']['recipe']['recipe_id']==result['recipes'][0]['recipe_id']


@pytest.mark.parametrize('match',['exact','partial'])
def test_catalog_match_explanation_survives_reload_and_resolve(svc,match):
    consent(svc)
    changes=[] if match=='exact' else [{'key':'recipe.include_food_ids','json_value':json.dumps(list(svc.base['foods'])[:8])}]
    svc.brain.result=parsed('recipes',changes=changes)
    result=chat(svc,'Подбери рецепт','catalog_fit_note_01');message=assistant(result)
    assert result['recipes'] and all(r['match']==match for r in result['recipes'])
    for index,action in enumerate(message['actions']):
        original=result['recipes'][index]
        assert action['match']==match and action['fit_note']==original['fit_note']
        assert not {'ingredients','nutrition','whole_batch'}&set(action)
        restored=assistant(Service(svc.store,svc.brain).opened(SUBJECT))
        assert restored['actions'][index]['fit_note']==original['fit_note']
        card=resolve(svc,restored,index)['command']['recipe']
        assert card['match']==match and card['fit_note']==original['fit_note']
        assert card['nutrition']==original['nutrition']


def test_catalog_explanation_metadata_is_bounded_without_storing_calculations(svc):
    consent(svc);d,_=svc.load(SUBJECT);recipe=svc.catalog(SUBJECT)['recipes'][0]
    recipe.update(match='partial',fit_note='Причина: '+'я'*2000)
    actions=svc.chat_actions(d,'main',{'recipes':[recipe]})
    assert len(actions[0]['fit_note'])==600 and actions[0]['fit_note'].endswith('…')
    assert not {'ingredients','nutrition','whole_batch'}&set(actions[0])
    assert len(json.dumps(actions,ensure_ascii=False).encode())<2000


@pytest.mark.parametrize('path',['fast','normal'])
def test_empty_recipe_questions_restore_safe_navigation_without_generation(svc,path):
    consent(svc)
    if path=='normal':svc.brain.result=parsed('kitchen',changes=[{'key':'kitchen.spec','json_value':json.dumps({'mode':'pantry_only','pantry':[]})}])
    text='Нужна идея' if path=='normal' else 'Нужен ужин только из кладовой без покупок'
    result=chat(svc,text,'empty_recipe_actions');assert result['recipes']==[] and result['questions']
    message=assistant(Service(svc.store,svc.brain).opened(SUBJECT))
    assert len(message['actions'])==1 and message['actions'][0]['target']=={'view':'recipes'}
    before=svc.load(SUBJECT);calls=svc.brain.calls;resolved=resolve(svc,message)
    assert resolved['command']=={'type':'navigate','view':'recipes'} and not resolved['model_called']
    assert svc.load(SUBJECT)==before and svc.brain.calls==calls
    assert not before[0]['kitchen']['drafts'] and not before[0]['kitchen']['requests']
