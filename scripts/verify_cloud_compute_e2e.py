"""Real staged Cloudflare -> Azure verification with two synthetic members only.
The local fixture holds short-lived synthetic session tokens; never print it.
This is NOT a Google sign-in, browser, voice or clinical test.
"""
from pathlib import Path
import json,datetime,uuid,io,base64,time
import httpx
from PIL import Image
ROOT=Path(__file__).resolve().parents[1];BASE='https://keto-companion-saas-staging.offflinerpsy.workers.dev'
fixtures=json.loads((ROOT/'.private/staging-e2e-fixtures.json').read_text());assert [x['id'] for x in fixtures]==['qa_compute_20261107_a','qa_compute_20261107_b']
checks=[];sources=[];clients=[];state=None
report={'task':'KETO-COMPUTE-004','scope':'Live staging HTTP and real Azure Terra. Synthetic membership/session fixtures; NOT actual Google login, browser, voice or clinical validation','source_commit':'5c48f40d939d22c535674c9455e21003d36b2b15','checks':checks}
def save():
 (ROOT/'qa/cloud-compute-progress.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
def check(name,ok,**detail):
 checks.append({'name':name,'passed':bool(ok),**detail});save();print(name,bool(ok),flush=True)
 if not ok:raise AssertionError(name)
def request(index,path,payload=None,expected=200):
 client,csrf=clients[index];r=client.get(BASE+path) if payload is None else client.post(BASE+path,json=payload,headers={'Origin':BASE,'x-csrf-token':csrf,'x-request-id':'qa_'+uuid.uuid4().hex})
 if r.status_code!=expected:raise RuntimeError(path+' status '+str(r.status_code)+' '+r.text[:100])
 return r.json()
def tool(name,payload,index=0):return request(index,'/api/tools/'+name,payload)
def change(kind,payload):
 global state
 p=tool('keto_propose_change',{'event_type':kind,'payload':payload,'expected_revision':state['revision']})
 a=tool('keto_apply_proposal',{'proposal_id':p['proposal']['id'],'expected_revision':p['state']['revision'],'approved':True});state=a['state'];return a
try:
 for f in fixtures:
  c=httpx.Client(timeout=90,follow_redirects=False);c.cookies.set('keto_session',f['token'],domain='keto-companion-saas-staging.offflinerpsy.workers.dev',path='/');r=c.get(BASE+'/api/session');assert r.status_code==200;clients.append((c,r.json()['csrf']))
 check('two_synthetic_member_sessions',True)
 d=tool('keto_open',{});state=d['state'];check('Cloudflare_signed_Azure_open',state['profile']['subject_id']==fixtures[0]['id'])
 state=tool('keto_consent',{'processing':True,'storage':True,'health':True,'confirmed':True})['state'];check('explicit_consent_saved',state['processing_consent'] and state['profile']['consent']['storage'])
 request(0,'/api/tools/keto_menu',{'start':'2026-11-08','days':1},expected=422);check('incomplete_profile_blocks_menu',True)
 args={'message':'Объясни простыми словами, как пользоваться помощником: с чего начать и где меню и дневник. Ничего не изменяй.','request_id':'qa_live_help_20261107_01'}
 started=time.monotonic();reply=tool('keto_chat',args);state=reply['state'];check('real_Azure_Terra_response',reply.get('model_called') is True and bool(reply.get('message')),seconds=round(time.monotonic()-started,2));report['synthetic_help_reply']=reply.get('message');report['model_usage']=reply.get('model_usage')
 duplicate=tool('keto_chat',args);check('duplicate_returns_saved_reply',duplicate==reply)
 request(0,'/api/tools/keto_chat',{**args,'message':'different'},expected=409);check('reused_id_with_different_payload_refused',True)
 change('configuration',{'ui':{'text_size':'large'},'settings':{}});check('confirmed_UI_preferences_persist',tool('keto_open',{})['state']['ui']['text_size']=='large')
 change('diary.add',{'date':'2026-11-07','note':'QA_ONLY_CROSS_CLOUD_MARKER','intake_status':'unquantified'});check('diary_saved',len(state['diary'])==1)
 other=tool('keto_open',{},1);check('second_user_cannot_see_diary',not other['state']['diary'] and 'QA_ONLY_CROSS_CLOUD_MARKER' not in json.dumps(other))
 recipes=tool('keto_recipes',{'query':'яйца','limit':3});check('catalog_recipes_available',len(recipes.get('recipes',[]))>0)
 keys=['adult','pregnant','breastfeeding','type1_diabetes','sglt2','hypoglycemia_medication','kidney_disease','liver_pancreas_gallbladder_disease','metabolic_contraindication','eating_disorder_risk','other_clinical_restrictions','medications_reviewed','allergies_reviewed'];screening={k:False for k in keys};screening.update(adult=True,medications_reviewed=True,allergies_reviewed=True)
 change('profile.update',{'screening':screening,'timezone':'Europe/Minsk'})
 change('targets.update',{'status':'agreed','agreed_at':'2026-11-07T00:00:00Z','basis_note':'SYNTHETIC TEST ONLY, NOT A PERSONAL PRESCRIPTION','energy_min_kcal':1700,'energy_max_kcal':1900,'protein_min_g':85,'protein_max_g':180,'carb_basis':'net_estimate','carb_max_g':40,'fiber_min_g':25,'saturated_fat_max_pct':10})
 menu=tool('keto_menu',{'start':'2026-11-08','days':1});check('calculated_synthetic_menu_and_shopping',len(menu['plan']['days'])==1 and len(menu['shopping'])>0)
 change('plan.accept',menu['plan']);opened=tool('keto_open',{});state=opened['state'];check('accepted_menu_persists',len(state['plans'])==1 and len(opened['shopping'])>0)
 for fmt in ['json','csv','html']:
  out=tool('keto_export',{'format':fmt});check('export_'+fmt,bool(out.get('text')) and bool(out.get('filename')))
 link=request(0,'/api/sources',{'title':'QA Instagram link','author':'synthetic','url':'https://www.instagram.com/p/synthetic_test_only/','text':'','rights_attested':True},expected=201);sources.append(link['id']);check('Instagram_link_not_falsely_read',link['status']=='needs_content')
 other_sources=request(1,'/api/sources');check('source_private_between_users',link['id'] not in json.dumps(other_sources))
 image=Image.new('RGB',(32,32),(127,127,127));exif=Image.Exif();exif[270]='SYNTHETIC_PRIVATE_METADATA';buf=io.BytesIO();image.save(buf,format='JPEG',exif=exif)
 upload=request(0,'/api/sources',{'title':'QA image metadata','author':'synthetic','text':'Technical image test, not a recipe','rights_attested':True,'upload':{'mime':'image/jpeg','data':base64.urlsafe_b64encode(buf.getvalue()).decode().rstrip('=')}},expected=201);sources.append(upload['id'])
 r=clients[0][0].get(BASE+'/api/sources/file',params={'id':upload['id']});check('R2_upload_sanitized_without_EXIF',r.status_code==200 and not Image.open(io.BytesIO(r.content)).getexif())
 r=clients[1][0].get(BASE+'/api/sources/file',params={'id':upload['id']});check('other_member_cannot_download_image',r.status_code==404)
except Exception as e:report['error']=type(e).__name__+': '+str(e)[:250]
finally:
 cleanup=[]
 for sid in sources:
  try:request(0,'/api/sources/delete',{'id':sid});cleanup.append({'id':sid,'removed':True})
  except Exception:cleanup.append({'id':sid,'removed':False})
 report['source_cleanup']=cleanup
 for c,_ in clients:c.close()
 report['passed']=all(x['passed'] for x in checks) and 'error' not in report and all(x['removed'] for x in cleanup)
 report['completed_at']=datetime.datetime.now(datetime.timezone.utc).isoformat();report['total_checks']=len(checks);report['fixture_database_cleanup_pending']=True
 (ROOT/'docs/evidence/CLOUD_COMPUTE_E2E.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n');save();print(json.dumps({'passed':report['passed'],'checks':len(checks),'error':report.get('error'),'sources_removed':all(x['removed'] for x in cleanup)},ensure_ascii=False),flush=True)
