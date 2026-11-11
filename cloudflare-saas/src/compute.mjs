// Authenticated callers only; all user identities originate from the session.
const te=new TextEncoder();const now=()=>Math.floor(Date.now()/1000);
const b64=b=>{let s='';for(const x of new Uint8Array(b))s+=String.fromCharCode(x);return btoa(s).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'')};
const nonce=()=>b64(crypto.getRandomValues(new Uint8Array(32)));
const hex=b=>Array.from(new Uint8Array(b),x=>x.toString(16).padStart(2,'0')).join('');
const hash=async x=>hex(await crypto.subtle.digest('SHA-256',typeof x==='string'?te.encode(x):x));
export const OPS={keto_label_extract:'label_extract',keto_kitchen:'kitchen',keto_guidance:'guidance',keto_topics:'topics',keto_reminders:'reminders',keto_transcribe:'transcribe',keto_open:'open',keto_recipes:'recipes',keto_consent:'consent',keto_propose_change:'propose',keto_apply_proposal:'apply',keto_menu:'menu',keto_chat:'chat',keto_export:'export',keto_import_menu:'import_menu'};
export const bridgeConfigured=env=>Boolean(env.KETO_EDGE_BRIDGE_URL&&((typeof env.KETO_EDGE_SIGNING_JWK==='string'&&env.KETO_EDGE_SIGNING_JWK.length>50)||(typeof env.KETO_EDGE_BRIDGE_SECRET==='string'&&env.KETO_EDGE_BRIDGE_SECRET.length>=32)));
const INTAKE_VALIDATION_MESSAGES=Object.freeze({
 INTAKE_TIME_AMBIGUOUS:'Выбранное время встречается дважды при переводе часов. В «Уточнении времени» выберите первое или второе время.',
 INTAKE_TIME_NONEXISTENT:'Такого местного времени нет из-за перевода часов. Выберите другое время еды.',
 INTAKE_STALE:'Дневник, профиль или расчёт изменились. Обновите записи и подготовьте новое предложение.',
 INTAKE_ENTRY_NOT_FOUND:'Запись больше не найдена в вашем дневнике. Обновите список и выберите запись заново.',
 INTAKE_SOURCE_NOT_FOUND:'Блюдо или продукт больше не найдены. Выберите доступную еду заново.',
 INTAKE_SOURCE_MISMATCH:'Этот вариант блюда устарел или относится к другой теме. Откройте его в исходной теме либо подберите новый.',
 INTAKE_AMOUNT_BASIS:'Проверьте количество и единицу: для блюда — порции или доля всего блюда, для продукта — граммы. Готовая масса блюда не вычисляется из сырого веса.',
 INTAKE_TIME_MISMATCH:'Дата, время или часовой пояс еды не совпадают. Проверьте их и уточнение перевода часов.',
 INTAKE_TIMEZONE_REQUIRED:'Для времени еды нужен подтверждённый часовой пояс. Укажите его в профиле.'
});
function intakeValidationScope(subject,operation,state,args){
 if(operation==='kitchen')return ['intake','intake_preview','diary_history'].includes(args?.action);
 const owner=state?.core,proposal=state?.pending?.[args?.proposal_id];
 return operation==='apply'&&owner?.owner_account_id===subject&&owner?.subject_id===subject&&['kitchen.intake','kitchen.diary','kitchen.own_dish_diary','diary.add','diary.update','diary.repeat','diary.delete'].includes(proposal?.type);
}
async function intakeValidationCode(response){
 const reader=response.body?.getReader();if(!reader)return null;let size=0,parts=[];
 try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>4096){await reader.cancel();return null}parts.push(value)}
  const bytes=new Uint8Array(size);let offset=0;for(const part of parts){bytes.set(part,offset);offset+=part.length}
  const body=JSON.parse(new TextDecoder().decode(bytes)),code=body?.validation_code;
  return body?.error==='BRIDGE_REJECTED'&&typeof code==='string'&&Object.hasOwn(INTAKE_VALIDATION_MESSAGES,code)?code:null;
 }catch{return null}
}
export async function bridgeCall(env,subject,operation,state,args){
 if(!bridgeConfigured(env))throw Error('BRIDGE_NOT_CONFIGURED');
 let url;try{url=new URL(env.KETO_EDGE_BRIDGE_URL)}catch{throw Error('BRIDGE_NOT_CONFIGURED')};
 if(url.protocol!=='https:'||url.pathname!=='/internal/keto/compute'||url.search||url.hash||url.username||url.password)throw Error('BRIDGE_NOT_CONFIGURED');
 const body=te.encode(JSON.stringify({subject,operation,state,arguments:args}));if(body.length>1500000)throw Error('PAYLOAD_TOO_LARGE');
 const stamp=String(now()),n=nonce(),message=['POST',url.pathname,stamp,n,await hash(body)].join('\n');
 let signature;
 if(env.KETO_EDGE_SIGNING_JWK){
  if(env.KETO_EDGE_BRIDGE_SECRET)throw Error('BRIDGE_NOT_CONFIGURED');
  let jwk;try{jwk=JSON.parse(env.KETO_EDGE_SIGNING_JWK)}catch{throw Error('BRIDGE_NOT_CONFIGURED')}
  if(jwk.kty!=='OKP'||jwk.crv!=='Ed25519'||typeof jwk.d!=='string'||typeof jwk.x!=='string')throw Error('BRIDGE_NOT_CONFIGURED');
  const key=await crypto.subtle.importKey('jwk',jwk,{name:'Ed25519'},false,['sign']);signature=hex(await crypto.subtle.sign('Ed25519',key,te.encode(message)));
 }else{
  const key=await crypto.subtle.importKey('raw',te.encode(env.KETO_EDGE_BRIDGE_SECRET),{name:'HMAC',hash:'SHA-256'},false,['sign']);signature=hex(await crypto.subtle.sign('HMAC',key,te.encode(message)));
 }
 const r=await fetch(url.href,{method:'POST',headers:{'content-type':'application/json','x-keto-timestamp':stamp,'x-keto-nonce':n,'x-keto-signature':signature},body,signal:AbortSignal.timeout(55000)});
 if(!r.ok){
  const error=Error(r.status===422?'BRIDGE_REJECTED':'BRIDGE_UNAVAILABLE');
  if(r.status===422&&intakeValidationScope(subject,operation,state,args)){const code=await intakeValidationCode(r);if(code)error.intakeValidationCode=code}
  throw error;
 }
 const reader=r.body?.getReader();let nbytes=0,parts=[];if(!reader)throw Error('BRIDGE_UNAVAILABLE');while(true){let {done,value}=await reader.read();if(done)break;nbytes+=value.length;if(nbytes>2000000){await reader.cancel();throw Error('BRIDGE_UNAVAILABLE')}parts.push(value)}const bytes=new Uint8Array(nbytes);let pos=0;for(const p of parts){bytes.set(p,pos);pos+=p.length}
 let out;try{out=JSON.parse(new TextDecoder().decode(bytes))}catch{throw Error('BRIDGE_UNAVAILABLE')};if(!out||typeof out.response!=='object'||!('state' in out))throw Error('BRIDGE_UNAVAILABLE');return out;
}
const urgent=message=>typeof message==='string'&&/(сильная боль в груди|сильно болит грудь|задыхаюсь|теряю сознание|не могу дышать|непрекращающаяся рвота)/i.test(message)&&!/(что делать если|если бы|нет сильной|не задыхаюсь|это цитата)/i.test(message);
const urgentText='При таких выраженных симптомах нужна срочная медицинская помощь. Не ждите ответа чата и не объясняйте это адаптацией к кето. Обратитесь в местную экстренную службу.';
export async function consentChange(env,u,x){
 const t=now();
 await env.DB.batch([env.DB.prepare('INSERT INTO consents(user_id,storage,health,processing,updated_at,consent_revision) VALUES(?,?,?,?,?,1) ON CONFLICT(user_id) DO UPDATE SET storage=excluded.storage,health=excluded.health,processing=excluded.processing,updated_at=excluded.updated_at,consent_revision=consents.consent_revision+1').bind(u.id,+x.storage,+x.health,+x.processing,t),env.DB.prepare('UPDATE private_state SET revision=revision+1,lock_id=NULL,lock_until=NULL,updated_at=? WHERE user_id=?').bind(t,u.id),env.DB.prepare("UPDATE jobs SET response_json=NULL,status='failed',finished_at=COALESCE(finished_at,?) WHERE user_id=? AND status IN ('pending','completed')").bind(t,u.id)]);
}
export async function handleTool(req,env,h){
 const name=new URL(req.url).pathname.slice('/api/tools/'.length),operation=OPS[name];if(!operation)h.fail(404,'NOT_FOUND');
 const {u,raw}=await h.auth(req,env,{write:true});const args=await h.bodyJson(req,1500000);
 if(Object.hasOwn(args,'subject')||Object.hasOwn(args,'owner_id')||Object.hasOwn(args,'source_context'))h.fail(400,'INVALID_BODY');
 if(operation==='label_extract'){
  const keys=Object.keys(args);const raw=args.image_data_url;
  if(keys.some(k=>!['request_id','image_data_url','note','thread_id'].includes(k))||typeof args.request_id!=='string'||!/^[A-Za-z0-9_-]{8,100}$/.test(args.request_id)||typeof raw!=='string'||!/^data:image\/(?:png|jpeg|webp|gif);base64,(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(raw)||raw.length>1333380||raw.endsWith(',')||('note' in args&&(typeof args.note!=='string'||args.note.length>500))||('thread_id' in args&&(typeof args.thread_id!=='string'||args.thread_id.length>80)))h.fail(400,'INVALID_BODY');
 }
 if(operation==='consent'&&(!['processing','storage','health','confirmed'].every(k=>typeof args[k]==='boolean')||args.confirmed!==true))h.fail(400,'INVALID_BODY');
 if(operation==='chat'&&urgent(args.message)){
  let warning='';try{
   let allowed=await h.dbfirst(env,'SELECT storage,health FROM consents WHERE user_id=?',u.id);let state=allowed?.storage&&allowed?.health?await h.dbfirst(env,'SELECT payload,revision FROM private_state WHERE user_id=?',u.id):null,doc=state&&JSON.parse(state.payload);
   if(doc?.core){doc.holds=[...new Set([...(doc.holds||[]),'urgent'])].sort();doc.revision++;for(const p of Object.values(doc.core.plans||{}))p.status='blocked_safety_review';const t=now();let result=await h.dbrun(env,'UPDATE private_state SET payload=?,revision=revision+1,lock_id=NULL,lock_until=NULL,updated_at=? WHERE user_id=? AND revision=?',JSON.stringify(doc),t,u.id,state.revision);if(result.meta.changes!==1)warning=' Ограничение не удалось сохранить; не используйте прежнее меню.';else await h.dbrun(env,"UPDATE jobs SET response_json=NULL,status='failed',finished_at=COALESCE(finished_at,?) WHERE user_id=? AND status IN ('pending','completed')",t,u.id)}
  }catch{warning=' Ограничение не удалось сохранить; не используйте прежнее меню.'}
  return h.json({message:urgentText+warning,intent:'safety',safety_hold:['urgent'],model_called:false});
 }
 let callArgs={...args};
 if(operation==='propose'&&args.event_type==='catalog.recipe.add'){
  const sourceId=callArgs.source_id;delete callArgs.source_id;if(typeof sourceId!=='string'||!sourceId||sourceId.length>100||!callArgs.payload||typeof callArgs.payload!=='object')h.fail(400,'INVALID_BODY');
  const src=await h.dbfirst(env,"SELECT id,title,author,source_url,status FROM sources WHERE id=? AND user_id=? AND status IN ('draft','reviewed','personal_recipe')",sourceId,u.id);if(!src)h.fail(404,'SOURCE_NOT_AVAILABLE');
  callArgs.payload={...callArgs.payload,confirmed:true,source_ref:JSON.stringify({source_id:src.id,title:src.title,author:src.author,url:src.source_url})};
 }
 if(operation==='chat'&&Object.hasOwn(callArgs,'source_id')){
  const sourceId=callArgs.source_id;delete callArgs.source_id;if(typeof sourceId!=='string'||sourceId.length>100)h.fail(400,'INVALID_BODY');
  const src=await h.dbfirst(env,'SELECT title,author,source_url,excerpt,object_key,mime,status FROM sources WHERE id=? AND user_id=?',sourceId,u.id);
  if(!src||src.status==='needs_content')h.fail(404,'SOURCE_NOT_AVAILABLE');
  if(typeof callArgs.message!=='string'||callArgs.message.length>6000)h.fail(400,'INVALID_BODY');
  callArgs.source_context={title:src.title,author:src.author,url:src.source_url,text:src.excerpt};
  if(src.mime==='image/jpeg'&&src.object_key){if(callArgs.image_data_url)h.fail(400,'INVALID_BODY');const obj=await env.UPLOADS.get(src.object_key);if(!obj)h.fail(404,'SOURCE_NOT_AVAILABLE');const bytes=await h.readBounded(new Response(obj.body),1000000);let encoded=b64(bytes).replaceAll('-','+').replaceAll('_','/');encoded+='='.repeat((4-encoded.length%4)%4);callArgs.image_data_url='data:image/jpeg;base64,'+encoded}
 }
 const transient=operation==='transcribe'||(operation==='export'&&args.format==='pdf');
 const requestId=(['chat','transcribe','label_extract'].includes(operation)||(operation==='kitchen'&&args.action==='generate'))?args.request_id:(req.headers.get('x-request-id')||crypto.randomUUID());if(typeof requestId!=='string'||!/^[A-Za-z0-9_-]{8,100}$/.test(requestId))h.fail(400,'INVALID_REQUEST_ID');
 const requestHash=await hash(JSON.stringify({name,args})),sessionHash=await h.sha(raw),date=new Date().toISOString().slice(0,10),t=now(),lock=crypto.randomUUID();
 let existing=await h.dbfirst(env,'SELECT request_hash,status,response_json,consent_revision FROM jobs WHERE user_id=? AND request_id=?',u.id,requestId);
 if(existing){if(existing.request_hash!==requestHash)h.fail(409,'REQUEST_ID_MISMATCH');if(existing.status==='completed'){if(transient||!existing.response_json)h.fail(409,'ALREADY_PROCESSED');const [c,curRow]=await Promise.all([h.dbfirst(env,'SELECT consent_revision FROM consents WHERE user_id=?',u.id),h.dbfirst(env,'SELECT payload,revision FROM private_state WHERE user_id=?',u.id)]);if((c?.consent_revision||0)!==existing.consent_revision)h.fail(409,'CONSENT_CHANGED');const replayed=JSON.parse(existing.response_json);if(curRow?.payload){try{const live=JSON.parse(curRow.payload);if(Array.isArray(live?.holds)&&live.holds.length&&(!Array.isArray(replayed?.state?.holds)||live.holds.some(x=>!replayed.state.holds.includes(x))))h.fail(409,'STATE_CHANGED');if(replayed?.state&&Number.isInteger(live?.revision)&&Number.isInteger(replayed.state.revision)&&replayed.state.revision<live.revision)delete replayed.state}catch(e){if(e instanceof h.Fail)throw e}}return h.json(replayed,operation==='label_extract'&&replayed.error_code?422:200)}h.fail(409,existing.status==='pending'?'REQUEST_PENDING':'REQUEST_FAILED')}
 if(operation==='consent'&&(!args.storage||!args.health||!args.processing))await consentChange(env,u,args);
 await h.dbrun(env,"INSERT INTO private_state(user_id,revision,payload,updated_at) VALUES(?,0,'{}',?) ON CONFLICT(user_id) DO NOTHING",u.id,t);
 // Reserve all potentially paid chat requests; refund only after a verified no-model result.
 // A user phrase such as 'рассчитай ужин' may invoke recipe design before local guidance.
 const paid=['chat','transcribe','label_extract'].includes(operation)||(operation==='kitchen'&&args.action==='generate')?1:0;
 const db=env.DB,stmts=[
  db.prepare("UPDATE jobs SET status='failed',finished_at=? WHERE user_id=? AND status='pending' AND EXISTS(SELECT 1 FROM private_state WHERE user_id=? AND lock_until<=?)").bind(t,u.id,u.id,t),
  db.prepare("INSERT INTO jobs(user_id,request_id,request_hash,status,revision,created_at,consent_revision) SELECT ?,?,?,'pending',s.revision,?,COALESCE(c.consent_revision,0) FROM private_state s JOIN users u ON u.id=s.user_id JOIN sessions z ON z.user_id=u.id AND z.token_hash=? AND z.expires_at>? LEFT JOIN consents c ON c.user_id=u.id WHERE s.user_id=? AND u.status='active' AND (s.lock_id IS NULL OR s.lock_until<=?) AND (?=0 OR (c.storage=1 AND c.health=1 AND c.processing=1 AND COALESCE((SELECT requests FROM usage WHERE user_id=? AND day=?),0)<30 AND COALESCE((SELECT requests FROM global_usage WHERE day=?),0)<500)) AND (? IN ('open','recipes','consent','export','guidance') OR (c.storage=1 AND c.health=1)) ON CONFLICT(user_id,request_id) DO NOTHING").bind(u.id,requestId,requestHash,t,sessionHash,t,u.id,t,paid,u.id,date,date,operation),
  db.prepare("UPDATE private_state SET lock_id=?,lock_until=? WHERE user_id=? AND (lock_id IS NULL OR lock_until<=?) AND EXISTS(SELECT 1 FROM jobs WHERE user_id=? AND request_id=? AND status='pending' AND request_hash=?)").bind(lock,t+180,u.id,t,u.id,requestId,requestHash)
 ];
 if(paid){stmts.push(db.prepare("INSERT INTO usage(user_id,day,requests) SELECT ?,?,1 WHERE EXISTS(SELECT 1 FROM private_state WHERE user_id=? AND lock_id=?) ON CONFLICT(user_id,day) DO UPDATE SET requests=requests+1").bind(u.id,date,u.id,lock));stmts.push(db.prepare("INSERT INTO global_usage(day,requests) SELECT ?,1 WHERE EXISTS(SELECT 1 FROM private_state WHERE user_id=? AND lock_id=?) ON CONFLICT(day) DO UPDATE SET requests=requests+1").bind(date,u.id,lock));}
 const reserve=await db.batch(stmts);if(reserve[1].meta.changes!==1||reserve[2].meta.changes!==1){existing=await h.dbfirst(env,'SELECT request_hash,status FROM jobs WHERE user_id=? AND request_id=?',u.id,requestId);if(existing)h.fail(409,existing.request_hash!==requestHash?'REQUEST_ID_MISMATCH':'REQUEST_PENDING');h.fail(409,'BUSY_OR_CONSENT_OR_LIMIT')}
 let saved=await h.dbfirst(env,'SELECT revision,payload FROM private_state WHERE user_id=? AND lock_id=?',u.id,lock);let job=await h.dbfirst(env,'SELECT consent_revision FROM jobs WHERE user_id=? AND request_id=?',u.id,requestId);
 try{
  let doc=JSON.parse(saved.payload);if(!doc.core)doc=null;
  let recipeSource=null;if(operation==='apply'&&args.approved===true){const proposal=doc?.pending?.[args.proposal_id];if(proposal?.type==='catalog.recipe.add'){try{recipeSource=JSON.parse(proposal.payload.source_ref).source_id}catch{}}}
  const out=await bridgeCall(env,u.id,operation,operation==='transcribe'?null:doc,callArgs);
  if(transient)out.state=doc;
  if(out.response?.error_code&&!transient&&!(operation==='label_extract'&&out.response.model_called===false))throw Error('BRIDGE_UNAVAILABLE');
  let payload=JSON.stringify(out.state||{}),answer=JSON.stringify(transient?{already_processed:true}:out.response);if(te.encode(payload).length>1500000||te.encode(answer).length>1500000)throw Error('PAYLOAD_TOO_LARGE');
  const newRevision=saved.revision+1;
  let completion=[db.prepare("UPDATE private_state SET payload=?,revision=revision+1,updated_at=? WHERE user_id=? AND lock_id=? AND revision=? AND EXISTS(SELECT 1 FROM users WHERE id=? AND status='active') AND EXISTS(SELECT 1 FROM sessions WHERE user_id=? AND token_hash=? AND expires_at>?) AND COALESCE((SELECT consent_revision FROM consents WHERE user_id=?),0)=?").bind(payload,now(),u.id,lock,saved.revision,u.id,u.id,sessionHash,now(),u.id,job.consent_revision)];
  if(operation==='consent')completion.push(db.prepare("INSERT INTO consents(user_id,storage,health,processing,updated_at,consent_revision) SELECT ?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM private_state WHERE user_id=? AND lock_id=? AND revision=?) ON CONFLICT(user_id) DO UPDATE SET storage=excluded.storage,health=excluded.health,processing=excluded.processing,updated_at=excluded.updated_at,consent_revision=excluded.consent_revision").bind(u.id,+args.storage,+args.health,+args.processing,now(),job.consent_revision+1,u.id,lock,newRevision));
  completion.push(db.prepare("UPDATE jobs SET status='completed',response_json=?,finished_at=?,consent_revision=? WHERE user_id=? AND request_id=? AND status='pending' AND EXISTS(SELECT 1 FROM private_state WHERE user_id=? AND lock_id=? AND revision=?)").bind(answer,now(),job.consent_revision+(operation==='consent'?1:0),u.id,requestId,u.id,lock,newRevision));
  if((operation==='topics'&&['delete','clear'].includes(args.action))||(operation==='apply'&&args.approved===true&&['profile.update','settings.update','settings.rollback','configuration','targets.update','guidance.setup','guidance.targets','kitchen.forget','kitchen.remember','kitchen.pantry'].includes(doc?.pending?.[args.proposal_id]?.type)))completion.push(db.prepare("UPDATE jobs SET response_json=NULL,status='failed' WHERE user_id=? AND request_id<>? AND status='completed' AND EXISTS(SELECT 1 FROM private_state WHERE user_id=? AND lock_id=? AND revision=?)").bind(u.id,requestId,u.id,lock,newRevision));
  if(recipeSource&&out.response?.receipt?.type==='catalog.recipe.add')completion.push(db.prepare("UPDATE sources SET status='personal_recipe' WHERE id=? AND user_id=? AND status IN ('draft','reviewed','personal_recipe') AND EXISTS(SELECT 1 FROM private_state WHERE user_id=? AND lock_id=? AND revision=?)").bind(recipeSource,u.id,u.id,lock,newRevision));
  if(paid&&out.response.model_called===false){completion.push(db.prepare("UPDATE usage SET requests=requests-1 WHERE user_id=? AND day=? AND requests>0 AND EXISTS(SELECT 1 FROM jobs WHERE user_id=? AND request_id=? AND status='completed')").bind(u.id,date,u.id,requestId));completion.push(db.prepare("UPDATE global_usage SET requests=requests-1 WHERE day=? AND requests>0 AND EXISTS(SELECT 1 FROM jobs WHERE user_id=? AND request_id=? AND status='completed')").bind(date,u.id,requestId));}
  completion.push(db.prepare('UPDATE private_state SET lock_id=NULL,lock_until=NULL WHERE user_id=? AND lock_id=?').bind(u.id,lock));
  const done=await db.batch(completion);if(done[0].meta.changes!==1){await h.dbrun(env,"UPDATE jobs SET status='failed',finished_at=? WHERE user_id=? AND request_id=? AND status='pending'",now(),u.id,requestId);h.fail(409,'STATE_CHANGED')}
  return h.json(out.response,out.response.error_code?422:200);
 }catch(e){
  await db.batch([db.prepare("UPDATE jobs SET status='failed',finished_at=? WHERE user_id=? AND request_id=? AND status='pending'").bind(now(),u.id,requestId),db.prepare('UPDATE private_state SET lock_id=NULL,lock_until=NULL WHERE user_id=? AND lock_id=?').bind(u.id,lock)]);
  if(e instanceof h.Fail)throw e;if(Object.hasOwn(INTAKE_VALIDATION_MESSAGES,e.intakeValidationCode))return h.json({error:e.intakeValidationCode,message:INTAKE_VALIDATION_MESSAGES[e.intakeValidationCode]},422);if(e.message==='BRIDGE_REJECTED')h.fail(422,'VALIDATION_FAILED');h.fail(503,e.message==='BRIDGE_NOT_CONFIGURED'?'BRIDGE_NOT_CONFIGURED':'COMPUTE_UNAVAILABLE');
 }
}
