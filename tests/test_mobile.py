"""Synthetic mobile release checks. No cloud, real identities or browser."""
import base64,copy,io,math,shutil,subprocess,wave
from datetime import datetime,timezone
from pathlib import Path
import pytest
from service.domain import Service,k
from service.store import SQLiteStore,Conflict
from service.mobile import next_due,validate_reminder
from service.speech import AudioTranscriber,SpeechError,decode_audio
from test_service import FakeBrain,parsed,consent,event,healthy
@pytest.fixture
def mobile(tmp_path):return Service(SQLiteStore(tmp_path/'mobile.db'),FakeBrain())
def topic_action(s,action,**kw):return s.topics('synthetic-one',action,confirmed=True,expected_revision=s.opened('synthetic-one')['state']['revision'],**kw)
def reminder_action(s,action,**kw):return s.reminders('synthetic-one',action,confirmed=True,expected_revision=s.opened('synthetic-one')['state']['revision'],**kw)
VALUES={'title':'Записать день','time':'20:00','timezone':'Europe/Minsk','days_of_week':[0,1,2,3,4,5,6],'enabled':True}
def test_topic_migration_and_context(mobile):
 consent(mobile);mobile.chat('synthetic-one','Основная тема','main_req_001');topic_action(mobile,'create',title='Покупки');tid=mobile.opened('synthetic-one')['state']['active_thread'];contexts=[]
 def infer(message,context,image=None):contexts.append(context);return parsed()
 mobile.brain.infer=infer;mobile.chat('synthetic-one','Отдельная тема','topic_req_001',thread_id=tid);assert not contexts[-1]['recent_chat'];mobile.chat('synthetic-one','Продолжим','topic_req_002',thread_id=tid);assert contexts[-1]['recent_chat'][0]['text']=='Отдельная тема';assert all(x['text']!='Основная тема' for x in contexts[-1]['recent_chat'])
 reopened=Service(mobile.store,mobile.brain).opened('synthetic-one')['state'];assert reopened['active_thread']==tid;assert len(reopened['topics'])==2
 with pytest.raises(Conflict):mobile.chat('synthetic-one','Отдельная тема','topic_req_001',thread_id='main')
 mobile.consent('another-subject',True,True,True,True)
 with pytest.raises(ValueError):mobile.chat('another-subject','x','topic_other_1',thread_id=tid)
 topic_action(mobile,'delete',thread_id=tid);assert mobile.opened('synthetic-one')['state']['active_thread']=='main'
def test_topic_limits_and_explicit_confirmation(mobile):
 consent(mobile)
 with pytest.raises(ValueError):mobile.topics('synthetic-one','create',title='x')
 for i in range(11):topic_action(mobile,'create',title=str(i))
 with pytest.raises(ValueError):topic_action(mobile,'create',title='too many')
 with pytest.raises(ValueError):topic_action(mobile,'delete',thread_id='main')
def test_shared_preference_survives_topic_delete(mobile):
 consent(mobile);event(mobile,'settings.update',{'disliked_food_ids':['F171477']});topic_action(mobile,'create',title='Завтраки');tid=mobile.opened('synthetic-one')['state']['active_thread'];topic_action(mobile,'delete',thread_id=tid);assert mobile.opened('synthetic-one')['state']['profile']['settings']['disliked_food_ids']==['F171477']
@pytest.mark.parametrize('text',['Яйца и кабачок, без курицы, 15 минут','Хочу яичное с цукини. Не хочу курицу, максимум 15 минут','Курица надоела сегодня, хочу яйца с кабачком за 15 минут'])
def test_temporary_recipe_filters(mobile,text):
 consent(mobile);mobile.brain.result=parsed('recipes',query='яйца кабачок курица');r=mobile.chat('synthetic-one',text,'filter_req_01');assert r['recipes'];assert len(r['recipes'])<=4
 for recipe in r['recipes']:
  ids={i['food_id'] for i in recipe['ingredients']};assert not ids&{'F171477','F171060'};assert recipe['active_minutes']<=15
  if recipe.get('match')=='exact':assert {'F171287','F169291'}<=ids
  else:assert recipe['match']=='partial' and 'Частичное совпадение' in recipe['fit_note']
 assert r['state']['profile']['settings']['disliked_food_ids']==[]
def test_unknown_food_ids_never_invented(mobile):
 with pytest.raises(ValueError):mobile.catalog('synthetic-one','',include_food_ids=['Fmadeup'])
 consent(mobile);mobile.brain.result=parsed('recipes',changes=[{'key':'recipe.include_food_ids','json_value':'["Fmadeup"]'}])
 with pytest.raises(ValueError):mobile.chat('synthetic-one','что-то','bad_food_001')
def test_hard_allergy_and_followup_choice(mobile):
 consent(mobile);mobile.brain.result=parsed('recipes',query='');r=mobile.chat('synthetic-one','Что приготовить?','choices_req_1');assert len(r['recipes'])==4;second=r['recipes'][1]['recipe_id'];mobile.brain.result=parsed('other');r=mobile.chat('synthetic-one','второй вариант','choices_req_2');assert r['recipes'][0]['recipe_id']==second
 event(mobile,'profile.update',{'allergies':['egg']});assert not mobile.catalog('synthetic-one','',include_food_ids=['F171287'])['recipes']
def test_pdf_actual_cyrillic_private_and_gated(mobile,tmp_path):
 healthy(mobile);plan=mobile.menu('synthetic-one','2026-11-08',3)['plan']
 with pytest.raises(ValueError):mobile.export('synthetic-one','pdf')
 event(mobile,'plan.accept',plan);event(mobile,'diary.add',{'date':'2026-11-08','note':'СЕКРЕТНЫЙ_ДНЕВНИК','intake_status':'unquantified'})
 # Diary changes do not change the profile hash or accepted plan.
 data=mobile.export('synthetic-one','pdf');raw=base64.b64decode(data['base64']);assert raw.startswith(b'%PDF-');assert len(raw)<900000
 if shutil.which('pdftotext'):
  p=tmp_path/'synthetic-menu.pdf';p.write_bytes(raw);text=subprocess.run(['pdftotext',str(p),'-'],capture_output=True,check=True).stdout.decode();assert 'Моё меню' in text and 'Список покупок' in text;assert 'СЕКРЕТНЫЙ_ДНЕВНИК' not in text;assert 1<len(text.split('\f'))<=31
 event(mobile,'profile.update',{'allergies':['egg']})
 with pytest.raises(ValueError):mobile.export('synthetic-one','pdf')
def test_pdf_missing_fonts_explicit(mobile,tmp_path,monkeypatch):
 import service.domain as domain
 healthy(mobile);event(mobile,'plan.accept',mobile.menu('synthetic-one','2026-11-08',1)['plan']);monkeypatch.setattr(domain,'ROOT',tmp_path)
 with pytest.raises(ValueError,match='FONT_UNAVAILABLE'):mobile.export('synthetic-one','pdf')
def test_reminders_ownership_edit_complete_and_ics(mobile):
 consent(mobile);r=reminder_action(mobile,'create',values=VALUES);item=r['state']['reminders'][0];assert item['next_due']
 ics=mobile.reminders('synthetic-one','ics',reminder_id=item['id'])['text'];assert 'BEGIN:VTIMEZONE' in ics and 'BEGIN:VALARM' in ics and 'RRULE:' in ics;assert 'TZID=Europe/Minsk' in ics
 with pytest.raises(ValueError):mobile.reminders('other-person','ics',reminder_id=item['id'])
 r=reminder_action(mobile,'complete',reminder_id=item['id']);assert r['state']['reminders'][0]['last_completed'];reminder_action(mobile,'delete',reminder_id=item['id']);assert not mobile.opened('synthetic-one')['state']['reminders']
@pytest.mark.parametrize('values',[dict(VALUES,title='x\nBEGIN:VEVENT'),dict(VALUES,timezone='bad/zone'),dict(VALUES,time='25:00'),dict(VALUES,days_of_week=[7]),dict(VALUES,days_of_week=[1,1])])
def test_reminder_bad_values(values):
 with pytest.raises(ValueError):validate_reminder(values)
def test_reminder_dst():
 r=validate_reminder(dict(VALUES,time='02:30',timezone='America/New_York',days_of_week=[6]));due=next_due(r,datetime(2027,3,14,5,tzinfo=timezone.utc));assert due.startswith('2027-03-21T02:30') # March 14 02:30 does not exist.
 r=validate_reminder(dict(VALUES,time='01:30',timezone='America/New_York',days_of_week=[6]));due=next_due(r,datetime(2027,11,7,4,tzinfo=timezone.utc));assert due.endswith('-04:00')
def wav_data(seconds=1,silent=False):
 import struct
 buf=io.BytesIO()
 with wave.open(buf,'wb') as w:w.setnchannels(1);w.setsampwidth(2);w.setframerate(16000);w.writeframes(b''.join(struct.pack('<h',0 if silent else int(5000*math.sin(i*2*math.pi*440/16000))) for i in range(int(16000*seconds))))
 return buf.getvalue()
def test_real_ffmpeg_signal_silence_and_duration():
 assert decode_audio(wav_data()).startswith(b'RIFF')
 for raw in [wav_data(silent=True),wav_data(60.5),b'bad audio']:
  with pytest.raises(SpeechError):decode_audio(raw)
def test_transcriber_fixed_metadata_and_limit():
 calls=[];transcriber=AudioTranscriber(decoder=lambda x:b'WAV',transport=lambda audio,fields:(calls.append((audio,fields)) or {'text':'Синтетический текст'}));assert transcriber.transcribe(base64.b64encode(b'audio').decode(),'audio/mp4')=='Синтетический текст';assert calls[0][1]=={'model':'gpt-transcribe','language':'ru','response_format':'json'}
 for mime,data in [('audio/ogg','YQ=='),('audio/wav','bad!'),('audio/mp4',base64.b64encode(b'a'*1000001).decode())]:
  with pytest.raises(SpeechError):transcriber.transcribe(data,mime)
def test_transcript_receipt_never_stores_audio_or_text(mobile):
 consent(mobile);mobile.transcriber=AudioTranscriber(decoder=lambda x:b'wav',transport=lambda *x:{'text':'СЕКРЕТНЫЙ_ТРАНСКРИПТ'});data=base64.b64encode(b'RAW_AUDIO_SYNTHETIC').decode();r=mobile.transcribe('synthetic-one',data,'audio/mp4','speech_req_001');assert r['text']=='СЕКРЕТНЫЙ_ТРАНСКРИПТ';doc,_=mobile.store.read('synthetic-one');assert 'СЕКРЕТНЫЙ_ТРАНСКРИПТ' not in str(doc) and data not in str(doc);assert doc['audio_usage']['calls']==1
 with pytest.raises(Conflict):mobile.transcribe('synthetic-one',data,'audio/mp4','speech_req_001')
def test_transcription_consent_revocation(mobile):
 consent(mobile)
 def transport(*x):mobile.consent('synthetic-one',False,False,False,True);return {'text':'discard'}
 mobile.transcriber=AudioTranscriber(decoder=lambda x:b'wav',transport=transport)
 with pytest.raises(Conflict):mobile.transcribe('synthetic-one','YQ==','audio/mp4','speech_revoke_1')
def test_speech_provider_failure_and_decode_no_paid_call(mobile):
 consent(mobile);mobile.transcriber=AudioTranscriber(decoder=lambda x:(_ for _ in ()).throw(SpeechError('AUDIO_SILENT')),transport=lambda *x:pytest.fail('provider should not be called'));r=mobile.transcribe('synthetic-one','YQ==','audio/mp4','speech_silent_1');assert r['model_called'] is False
 mobile.transcriber=AudioTranscriber(decoder=lambda x:b'wav',transport=lambda *x:(_ for _ in ()).throw(RuntimeError()));r=mobile.transcribe('synthetic-one','YQ==','audio/mp4','speech_failure1');assert r['error_code']=='AUDIO_PROVIDER' and r['model_called']
def test_topic_delete_removes_request_replies_and_memory_cap(mobile):
 consent(mobile);topic_action(mobile,'create',title='Удаляемая');tid=mobile.opened('synthetic-one')['state']['active_thread'];mobile.chat('synthetic-one','текст этой темы','topic_delete_001',thread_id=tid);topic_action(mobile,'delete',thread_id=tid);d,v=mobile.load('synthetic-one');assert 'topic_delete_001' not in d['requests'];assert tid not in d['topics']
 d['topics']['main']['messages']=[{'text':'т'*6000,'role':'user','at':str(i)} for i in range(60)];mobile.save('synthetic-one',d,v);d,_=mobile.load('synthetic-one');assert len(str(d['topics']).encode())<210000

def test_reminder_oneoff_future_and_early_completion(mobile):
 consent(mobile);r=reminder_action(mobile,'create',values=dict(VALUES,days_of_week=[],date='2030-11-07'));assert r['state']['reminders'][0]['next_due'].startswith('2030-11-07');r=reminder_action(mobile,'create',values=VALUES);item=r['state']['reminders'][-1];completed=reminder_action(mobile,'complete',reminder_id=item['id']);new=next(x for x in completed['state']['reminders'] if x['id']==item['id']);assert new['next_due']>item['next_due']
def test_remember_dislike_is_proposed_and_only_confirmed_values_persist(mobile):
 consent(mobile);mobile.brain.result=parsed('preferences',changes=[{'key':'settings.disliked_food_ids','json_value':'["F171477","F171060"]'}]);r=mobile.chat('synthetic-one','Запомни, что не люблю курицу','remember_req_01');assert r['proposal'];assert not r['state']['profile']['settings']['disliked_food_ids'];mobile.apply('synthetic-one',r['proposal']['id'],r['state']['revision'],True);topic_action(mobile,'create',title='Другая тема');assert set(mobile.opened('synthetic-one')['state']['profile']['settings']['disliked_food_ids'])=={fid for fid,f in mobile.base['foods'].items() if 'курин' in f['name_ru'].lower() or 'куриц' in f['name_ru'].lower()}

def test_temporary_boredom_cannot_propose_permanent_exclusion(mobile):
 consent(mobile);mobile.brain.result=parsed('preferences',changes=[{'key':'settings.excluded_food_ids','json_value':'["F171477"]'}]);r=mobile.chat('synthetic-one','Сегодня курица надоела','temporary_req_01');assert not r.get('proposal');assert not r['state']['profile']['settings']['excluded_food_ids']

def test_ics_utf8_folding_and_injection(mobile):
 from icalendar import Calendar
 consent(mobile);r=reminder_action(mobile,'create',values=dict(VALUES,title='Дневник '+('питания '*12)));item=r['state']['reminders'][0];text=mobile.reminders('synthetic-one','ics',reminder_id=item['id'])['text'];calendar=Calendar.from_ical(text);events=calendar.walk('VEVENT');assert len(events)==1;assert str(events[0]['SUMMARY'])==item['title'];assert all(len(line.encode())<=75 for line in text.split('\r\n'))

def test_legacy_mcp_cannot_execute_unadvertised_mobile_actions(tmp_path):
 from fastapi.testclient import TestClient
 from service.app import create_app
 from test_service import AUTH,KEY,rpc
 svc=Service(SQLiteStore(tmp_path/'legacy.db'),FakeBrain())
 with TestClient(create_app(svc,AUTH,'synthetic-secret','http://testserver',testing=True)) as client:
  result=rpc(client,'tools/call',{'name':'keto_topics','arguments':{'action':'create','title':'Should not create','confirmed':True,'expected_revision':0}}).json()['result'];assert result['isError']
 assert len(svc.opened('synthetic-one')['state']['topics'])==1
@pytest.mark.parametrize('container,codec',[('mp4','aac'),('webm','libopus')])
def test_actual_supported_audio_container_decoding(container,codec):
 import imageio_ffmpeg
 command=[imageio_ffmpeg.get_ffmpeg_exe(),'-nostdin','-hide_banner','-loglevel','error','-protocol_whitelist','pipe','-i','pipe:0','-c:a',codec]
 if container=='mp4':command+=['-movflags','frag_keyframe+empty_moov']
 command+=['-f',container,'pipe:1'];result=subprocess.run(command,input=wav_data(),capture_output=True,timeout=10);assert result.returncode==0;assert len(result.stdout)<1000000;assert decode_audio(result.stdout).startswith(b'RIFF')
def test_pdf_bridge_omits_duplicate_personal_state_to_keep_response_bounded(mobile,tmp_path):
 import json,time,hmac,hashlib
 from service.edge_bridge import EdgeBridge,PATH
 from service.app import TOOL_MAP,image_clean
 healthy(mobile);event(mobile,'plan.accept',mobile.menu('synthetic-one','2026-11-08',1)['plan']);doc,_=mobile.load('synthetic-one');secret='synthetic-bridge-secret-01234567890123456789';bridge=EdgeBridge(secret,SQLiteStore(tmp_path/'replay.db'),mobile.brain,TOOL_MAP,image_clean);body=json.dumps({'subject':'synthetic-one','operation':'export','state':doc,'arguments':{'format':'pdf'}}).encode();stamp=str(int(time.time()));nonce='A'*43;signature=hmac.new(secret.encode(),'\n'.join(['POST',PATH,stamp,nonce,hashlib.sha256(body).hexdigest()]).encode(),hashlib.sha256).hexdigest();result=bridge.execute('POST',PATH,stamp,nonce,signature,body);assert result['state'] is None;assert result['response']['mime']=='application/pdf';assert len(json.dumps(result).encode())<2000000
