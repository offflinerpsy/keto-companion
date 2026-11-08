import {bridgeCall,bridgeConfigured} from './compute.mjs';
import {developerSnapshot as snapshot} from '../generated/developer-snapshot.mjs';
import {technicalTask,validatePatch,unifiedDiff,privatePreview,PREVIEW_CSP,validTestReceipt} from './developer-policy.mjs';
const now=()=>Math.floor(Date.now()/1000),key=(id,part)=>`developer/${id}/${part}`;
const PARTS=['task','patch','diff','preview'];
async function purge(env,id){for(const part of PARTS)await env.UPLOADS.delete(key(id,part));}
export async function expireDeveloper(env){
 if(!env.DB||!env.UPLOADS)return;
 const rows=(await env.DB.prepare("SELECT id FROM dev_jobs WHERE expires_at<=? AND state<>'expired' LIMIT 30").bind(now()).all()).results;
 for(const row of rows){await purge(env,row.id);await env.DB.prepare("UPDATE dev_jobs SET state='expired',revision=revision+1 WHERE id=? AND expires_at<=?").bind(row.id,now()).run();try{await env.DEVELOPER_RUNNER?.cancel(row.id)}catch{}}
 await env.DB.prepare('UPDATE dev_settings SET active_job=NULL,lease_until=0 WHERE lease_until<=?').bind(now()).run();
}
export async function developerReadiness(env){
 if(!snapshot||!bridgeConfigured(env)||!env.DEVELOPER_RUNNER||!env.UPLOADS||env.DEVELOPER_BASELINE!==snapshot.baseline||!/^sha256:[a-f0-9]{64}$/.test(env.DEVELOPER_IMAGE_DIGEST||''))return {available:false,reason:'DEVELOPER_NOT_CONFIGURED'};
 try{const m=await env.DEVELOPER_RUNNER.metadata();if(m.baseline!==snapshot.baseline||m.image_digest!==env.DEVELOPER_IMAGE_DIGEST)return {available:false,reason:'RUNNER_BASELINE_MISMATCH'};return {available:true,status:'configured_unverified',baseline:snapshot.baseline,image_digest:m.image_digest}}catch{return {available:false,reason:'RUNNER_UNAVAILABLE'}}
}
export async function handleDeveloper(req,env,h){
 const path=new URL(req.url).pathname.slice('/api/developer'.length),write=req.method==='POST';
 // Authenticate even unknown developer routes. A member cannot probe job IDs.
 const {u,raw}=await h.auth(req,env,{admin:true,write});const sessionHash=await h.sha(raw);
 await expireDeveloper(env);
 const get=(sql,...args)=>h.dbfirst(env,sql,...args),run=(sql,...args)=>h.dbrun(env,sql,...args);
 const settings=()=>get('SELECT * FROM dev_settings WHERE id=1');
 const event=async(id,action)=>run('INSERT INTO dev_events(id,job_id,action,created_at) VALUES(?,?,?,?)',crypto.randomUUID(),id,action,now());
 const alive=async job=>get("SELECT j.id FROM dev_jobs j JOIN dev_settings s ON s.id=1 JOIN users u ON u.id=j.owner_id JOIN sessions z ON z.user_id=u.id WHERE j.id=? AND j.owner_id=? AND j.session_hash=? AND z.token_hash=? AND z.expires_at>? AND u.role='admin' AND u.status='active' AND s.enabled_until>? AND s.epoch=j.settings_epoch AND s.active_job=j.id AND s.lease_until>? AND j.expires_at>? AND j.cancelled_at IS NULL AND j.state IN ('draft','generating','generated','testing','tested')",job.id,u.id,sessionHash,sessionHash,now(),now(),now(),now());
 const load=async id=>{if(typeof id!=='string'||!/^[a-f0-9-]{36}$/.test(id))h.fail(400,'INVALID_JOB');const j=await get('SELECT * FROM dev_jobs WHERE id=? AND owner_id=? AND session_hash=?',id,u.id,sessionHash);if(!j)h.fail(404,'JOB_NOT_FOUND');return j};
 const finish=async(job,from,to,extra={})=>{
  if(!await alive(job))h.fail(409,'DEVELOPER_CANCELLED_OR_EXPIRED');
  const r=await run("UPDATE dev_jobs SET state=?,revision=revision+1,patch_hash=COALESCE(?,patch_hash),result_json=COALESCE(?,result_json) WHERE id=? AND state=? AND revision=? AND cancelled_at IS NULL AND settings_epoch=(SELECT epoch FROM dev_settings WHERE id=1 AND enabled_until>? AND active_job=dev_jobs.id AND lease_until>?) AND EXISTS(SELECT 1 FROM sessions z JOIN users u ON u.id=z.user_id WHERE z.token_hash=dev_jobs.session_hash AND z.user_id=dev_jobs.owner_id AND z.expires_at>? AND u.status='active' AND u.role='admin')",to,extra.patch_hash??null,extra.result_json??null,job.id,from,job.revision,now(),now(),now());
  if(r.meta.changes!==1)h.fail(409,'DEVELOPER_STATE_CHANGED');await event(job.id,to);
 };
 if(path===''&&req.method==='GET'){
  const s=await settings(),ready=await developerReadiness(env),jobs=(await env.DB.prepare('SELECT id,state,baseline,patch_hash,result_json,error_code,created_at,expires_at FROM dev_jobs WHERE owner_id=? AND session_hash=? ORDER BY created_at DESC LIMIT 10').bind(u.id,sessionHash).all()).results;
  return h.json({readiness:ready,enabled_until:s.enabled_until,max_jobs_day:s.max_jobs_day,jobs,publication:'separate_verified_release',editable:snapshot?.sources.map(x=>x.path)||[]});
 }
 if(path==='/enable'&&write){
  const x=await h.bodyJson(req);if(Object.keys(x).join()!=='hours'||!Number.isInteger(x.hours)||x.hours<1||x.hours>24)h.fail(400,'INVALID_BODY');
  if(!(await developerReadiness(env)).available)h.fail(503,'DEVELOPER_NOT_CONFIGURED');
  await run('UPDATE dev_settings SET enabled_until=?,capabilities=? WHERE id=1',now()+x.hours*3600,JSON.stringify({generation:true,tests:true,private_preview:true,publication:false}));await event(null,'enabled');return h.json({ok:true});
 }
 if(path==='/disable'&&write){
  const x=await h.bodyJson(req);if(Object.keys(x).length)h.fail(400,'INVALID_BODY');
  await env.DB.batch([env.DB.prepare('UPDATE dev_settings SET enabled_until=0,epoch=epoch+1,active_job=NULL,lease_until=0 WHERE id=1').bind(),env.DB.prepare("UPDATE dev_jobs SET state='cancelled',cancelled_at=?,revision=revision+1 WHERE state IN ('draft','generating','generated','testing','tested')").bind(now())]);
  const jobs=(await env.DB.prepare("SELECT id FROM dev_jobs WHERE state='cancelled'").bind().all()).results;for(const j of jobs){try{await env.DEVELOPER_RUNNER?.cancel(j.id)}catch{}await purge(env,j.id)}await event(null,'disabled');return h.json({ok:true});
 }
 if(path==='/jobs'&&write){
  const x=await h.bodyJson(req,10000);if(Object.keys(x).sort().join()!=='request_id,task,technical_only'||x.technical_only!==true||typeof x.request_id!=='string'||!/^[A-Za-z0-9_-]{8,100}$/.test(x.request_id))h.fail(400,'TECHNICAL_TASK_REQUIRED');
  let task;try{task=technicalTask(x.task)}catch{h.fail(400,'TECHNICAL_TASK_REQUIRED')}
  if(!(await developerReadiness(env)).available)h.fail(503,'DEVELOPER_NOT_CONFIGURED');
  const replay=await get('SELECT id FROM dev_jobs WHERE owner_id=? AND request_id=?',u.id,x.request_id);if(replay)h.fail(409,'DEVELOPER_REPLAY');
  const id=crypto.randomUUID(),s=await settings(),t=now(),expires=Math.min(t+3600,s.enabled_until);
  const out=await env.DB.batch([
   env.DB.prepare('UPDATE dev_settings SET active_job=?,lease_until=? WHERE id=1 AND enabled_until>? AND (active_job IS NULL OR lease_until<=?)').bind(id,expires,t,t),
   env.DB.prepare("INSERT INTO dev_jobs(id,owner_id,session_hash,request_id,request_hash,baseline,build_hash,state,settings_epoch,lease_until,created_at,expires_at) SELECT ?,?,?,?,?,?,?,'draft',epoch,?,?,? FROM dev_settings WHERE id=1 AND active_job=? AND enabled_until>?").bind(id,u.id,sessionHash,x.request_id,await h.sha(task),snapshot.baseline,snapshot.baseline,expires,t,expires,id,t)
  ]);if(out[0].meta.changes!==1||out[1].meta.changes!==1)h.fail(409,'DEVELOPER_BUSY_OR_DISABLED');
  try{await env.UPLOADS.put(key(id,'task'),task);const j=await load(id);if(!await alive(j))throw Error();await event(id,'draft');return h.json({id,state:'draft',task,request_hash:await h.sha(task),baseline:snapshot.baseline},201)}catch{await purge(env,id);h.fail(409,'DEVELOPER_STATE_CHANGED')}
 }
 if(path==='/job'&&req.method==='GET'){
  const j=await load(new URL(req.url).searchParams.get('id'));if(!await alive(j))h.fail(409,'DEVELOPER_CANCELLED_OR_EXPIRED');
  const part=j.state==='draft'?'task':'diff',obj=await env.UPLOADS.get(key(j.id,part));return h.json({id:j.id,state:j.state,request_hash:j.request_hash,task:j.state==='draft'?await obj?.text():undefined,diff_text:j.state!=='draft'?await obj?.text():undefined});
 }
 if(path.startsWith('/artifact/')&&req.method==='GET'){
  const url=new URL(req.url),part=path.split('/').at(-1);if(!['diff','preview'].includes(part))h.fail(404,'NOT_FOUND');const j=await load(url.searchParams.get('id'));if(j.state!=='tested'||!await alive(j))h.fail(409,'PATCH_NOT_TESTED');
  const obj=await env.UPLOADS.get(key(j.id,part));if(!obj)h.fail(404,'NOT_FOUND');
  return new Response(obj.body,{headers:{'Content-Type':part==='diff'?'text/x-diff; charset=utf-8':'text/html; charset=utf-8','Content-Disposition':part==='diff'?`attachment; filename="keto-${j.id}.diff"`:'inline','Cache-Control':'no-store','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff',...(part==='preview'?{'Content-Security-Policy':PREVIEW_CSP+"; sandbox allow-scripts"}:{} )}});
 }
 if(['/generate','/test','/cancel','/release-lock'].includes(path)&&write){
  const x=await h.bodyJson(req);if(Object.keys(x).sort().join()!==(path==='/generate'?'approved_hash,id':'id'))h.fail(400,'INVALID_BODY');let j=await load(x.id);
  if(path==='/cancel'||path==='/release-lock'){
   await run("UPDATE dev_jobs SET state='cancelled',cancelled_at=?,revision=revision+1 WHERE id=?",now(),j.id);await run('UPDATE dev_settings SET active_job=NULL,lease_until=0 WHERE id=1 AND active_job=?',j.id);try{await env.DEVELOPER_RUNNER?.cancel(j.id)}catch{}await purge(env,j.id);await event(j.id,'cancelled');return h.json({state:'cancelled'});
  }
  if(!await alive(j))h.fail(409,'DEVELOPER_CANCELLED_OR_EXPIRED');
  if(!(await developerReadiness(env)).available||j.baseline!==snapshot.baseline)h.fail(503,'DEVELOPER_NOT_CONFIGURED');
  try{
   if(path==='/generate'){
    if(j.state!=='draft'||x.approved_hash!==j.request_hash)h.fail(409,'DEVELOPER_REPLAY_OR_UNAPPROVED');
    const task=await (await env.UPLOADS.get(key(j.id,'task')))?.text();if(await h.sha(task||'')!==j.request_hash)throw Error('TASK_MISMATCH');
    // Reservation and state transition are one D1 statement, before any paid call.
    const reserved=await run("UPDATE dev_jobs SET state='generating',revision=revision+1,model_reserved=1 WHERE id=? AND state='draft' AND revision=? AND model_reserved=0 AND cancelled_at IS NULL AND EXISTS(SELECT 1 FROM dev_settings s WHERE s.id=1 AND s.active_job=dev_jobs.id AND s.epoch=dev_jobs.settings_epoch AND s.enabled_until>?) AND (SELECT COUNT(*) FROM dev_jobs WHERE model_reserved=1 AND created_at>=?)<(SELECT max_jobs_day FROM dev_settings WHERE id=1)",j.id,j.revision,now(),Math.floor(now()/86400)*86400);
    if(reserved.meta.changes!==1)h.fail(409,'DEVELOPER_QUOTA_OR_REPLAY');j=await load(j.id);if(!await alive(j))h.fail(409,'DEVELOPER_CANCELLED_OR_EXPIRED');
    const out=await bridgeCall(env,u.id,'developer_patch',null,{task,baseline:snapshot.baseline,sources:snapshot.sources,max_output_tokens:5000});
    if(out.state!==null)throw Error('PRIVATE_CONTEXT_REJECTED');const validated=await validatePatch(out.response.patch,snapshot);
    if(!await alive(j))throw Error('DEVELOPER_CANCELLED_OR_EXPIRED');
    await env.UPLOADS.put(key(j.id,'patch'),JSON.stringify(validated.patch));await env.UPLOADS.put(key(j.id,'diff'),unifiedDiff(validated.patch,snapshot));
    await finish(j,'generating','generated',{patch_hash:validated.patch_hash,result_json:JSON.stringify({usage:out.response.usage||{},model:'gpt-6.1-sol',reasoning:'high',publication:false})});
    return h.json({id:j.id,state:'generated',summary:validated.patch.summary,notes:validated.patch.notes,patch_hash:validated.patch_hash,diff:unifiedDiff(validated.patch,snapshot),publication:false});
   }
   if(j.state!=='generated')h.fail(409,'DEVELOPER_REPLAY');
   await finish(j,'generated','testing');j=await load(j.id);
   const patch=JSON.parse(await (await env.UPLOADS.get(key(j.id,'patch'))).text()),validated=await validatePatch(patch,snapshot);if(validated.patch_hash!==j.patch_hash)throw Error('PATCH_HASH_MISMATCH');
   const result=await env.DEVELOPER_RUNNER.run({job_id:j.id,baseline:j.baseline,patch_hash:j.patch_hash,files:patch.files});
   if(!validTestReceipt(result,j,env.DEVELOPER_IMAGE_DIGEST))throw Error('RUNNER_TESTS_FAILED');
   if(!await alive(j))throw Error('DEVELOPER_CANCELLED_OR_EXPIRED');await env.UPLOADS.put(key(j.id,'preview'),privatePreview(patch,snapshot));
   const receipt={baseline:j.baseline,patch_hash:j.patch_hash,image_digest:result.image_digest,exit_code:result.exit_code,stages:result.stages,publication:false};await finish(j,'testing','tested',{result_json:JSON.stringify(receipt)});
   return h.json({id:j.id,state:'tested',receipt,preview:'/api/developer/artifact/preview?id='+j.id,diff:'/api/developer/artifact/diff?id='+j.id,publication:false});
  }catch(e){
   if(!(e instanceof h.Fail)){await run("UPDATE dev_jobs SET state='failed',revision=revision+1,error_code='GENERATION_OR_TEST_FAILED' WHERE id=? AND state IN ('draft','generating','generated','testing')",j.id);await event(j.id,'failed')}
   const current=await load(j.id);if(['failed','cancelled','expired'].includes(current.state)){await purge(env,j.id);await run('UPDATE dev_settings SET active_job=NULL,lease_until=0 WHERE id=1 AND active_job=?',j.id)}
   if(e instanceof h.Fail)throw e;h.fail(422,'DEVELOPER_GENERATION_OR_TEST_FAILED');
  }
 }
 h.fail(404,'NOT_FOUND'); // No publish, execute or arbitrary command endpoint.
}
