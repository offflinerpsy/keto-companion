const te=new TextEncoder();const now=()=>Math.floor(Date.now()/1000);
const b64=b=>{let s='';for(const x of new Uint8Array(b))s+=String.fromCharCode(x);return btoa(s).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'')};
const random=()=>b64(crypto.getRandomValues(new Uint8Array(32)));
const hash=async s=>b64(await crypto.subtle.digest('SHA-256',te.encode(s)));
export async function beginDeletion(req,env,h){
 const {u}=await h.auth(req,env,{write:true});const data=await h.bodyJson(req);if(data.confirm!=='DELETE_MY_DATA'||Object.keys(data).length!==1)h.fail(400,'INVALID_BODY');
 const receipt=random(),stamp=now(),db=env.DB,receiptHash=await hash(receipt);
 const stmts=[db.prepare("INSERT INTO deletion_jobs(user_id,receipt_hash,status,created_at,updated_at) SELECT ?,?,'pending',?,? WHERE NOT EXISTS(SELECT 1 FROM deletion_jobs WHERE user_id=?)").bind(u.id,receiptHash,stamp,stamp,u.id),db.prepare("UPDATE users SET status='suspended' WHERE id=? AND EXISTS(SELECT 1 FROM deletion_jobs WHERE user_id=? AND receipt_hash=?)").bind(u.id,u.id,receiptHash),db.prepare('DELETE FROM sessions WHERE user_id=? AND EXISTS(SELECT 1 FROM deletion_jobs WHERE user_id=? AND receipt_hash=?)').bind(u.id,u.id,receiptHash),db.prepare('UPDATE private_state SET revision=revision+1,lock_id=NULL,lock_until=NULL WHERE user_id=?').bind(u.id),db.prepare("UPDATE jobs SET status='failed',finished_at=? WHERE user_id=? AND status='pending'").bind(stamp,u.id)];
 try{if(await db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='dev_jobs'").bind().first()){stmts.push(db.prepare("UPDATE dev_jobs SET state='cancelled',cancelled_at=COALESCE(cancelled_at,?),revision=revision+1 WHERE owner_id=? AND state IN ('draft','generating','generated','testing','tested')").bind(stamp,u.id),db.prepare('UPDATE dev_settings SET enabled_until=0,epoch=epoch+1,active_job=NULL,lease_until=0 WHERE active_job IN (SELECT id FROM dev_jobs WHERE owner_id=?)').bind(u.id))}}catch{}
 let r=await db.batch(stmts);
 if(r[0].meta.changes!==1)h.fail(409,'DELETION_PENDING');return h.json({status:'pending',receipt,message:'Удаление запрошено. Сохраните код для проверки и продолжения; резервные копии удаляются по отдельной политике.'},202,{'set-cookie':'keto_session=; Path=/; Max-Age=0; Secure; HttpOnly; SameSite=Lax'});
}
export async function deletionStatus(req,env,h,run){
 h.origin(req,env);const x=await h.bodyJson(req);if(Object.keys(x).join()!=='receipt'||typeof x.receipt!=='string'||!/^[A-Za-z0-9_-]{43}$/.test(x.receipt))h.fail(400,'INVALID_BODY');
 const d=await h.dbfirst(env,'SELECT user_id,status FROM deletion_jobs WHERE receipt_hash=?',await hash(x.receipt));if(!d)h.fail(404,'NOT_FOUND');
 if(d.status==='complete'||!run)return h.json({status:d.status});
 try{
  const reservations=await h.dball(env,'SELECT id,object_key,status FROM upload_reservations WHERE user_id=? LIMIT 100',d.user_id);
  for(const r of reservations){if(r.status==='pending'&&await h.dbfirst(env,'SELECT id FROM sources WHERE user_id=? AND object_key=?',d.user_id,r.object_key))await h.dbrun(env,'DELETE FROM upload_reservations WHERE id=? AND user_id=?',r.id,d.user_id);if(r.status==='cleanup'){await env.UPLOADS.delete(r.object_key);await h.dbrun(env,'DELETE FROM upload_reservations WHERE id=? AND user_id=? AND status=\'cleanup\'',r.id,d.user_id)}}
  const still=await h.dbfirst(env,'SELECT COUNT(*) n FROM upload_reservations WHERE user_id=?',d.user_id);if(still.n)return h.json({status:'pending',reason:'UPLOAD_IN_FLIGHT'});
  const prefix='private/'+d.user_id+'/',page=await env.UPLOADS.list({prefix,limit:100});
  const keys=(page.objects||[]).map(x=>x.key).filter(k=>k.startsWith(prefix));if(keys.length){await env.UPLOADS.delete(keys);return h.json({status:'pending',reason:'CLEANING_OBJECTS'})}if(page.truncated)return h.json({status:'pending',reason:'CLEANING_OBJECTS'});
  const devTable=await h.dbfirst(env,"SELECT name FROM sqlite_master WHERE type='table' AND name='dev_jobs'");
  if(devTable){
   const devJobs=await h.dball(env,'SELECT id,state FROM dev_jobs WHERE owner_id=? LIMIT 25',d.user_id);
   if(devJobs.length){
    let settling=false;
    for(const j of devJobs){
     try{await env.DEVELOPER_RUNNER?.cancel(j.id)}catch{}
     const devPrefix='developer/'+j.id+'/',listed=await env.UPLOADS.list({prefix:devPrefix,limit:100});
     const devKeys=(listed.objects||[]).map(x=>x.key).filter(k=>k.startsWith(devPrefix));
     if(!['cancelled','expired','failed'].includes(j.state)){
      await env.DB.batch([env.DB.prepare("UPDATE dev_jobs SET state='cancelled',cancelled_at=COALESCE(cancelled_at,?),revision=revision+1 WHERE id=? AND owner_id=?").bind(now(),j.id,d.user_id),env.DB.prepare('UPDATE dev_settings SET enabled_until=0,epoch=epoch+1,active_job=NULL,lease_until=0 WHERE active_job=?').bind(j.id)]);
      settling=true;
     }
     if(devKeys.length||listed.truncated){
      await env.UPLOADS.delete(devKeys.length?devKeys:['task','patch','diff','preview'].map(part=>devPrefix+part));
      settling=true;
     }else if(['cancelled','expired','failed'].includes(j.state)){
      await env.DB.batch([env.DB.prepare('UPDATE dev_settings SET enabled_until=0,epoch=epoch+1,active_job=NULL,lease_until=0 WHERE active_job=?').bind(j.id),env.DB.prepare('DELETE FROM dev_events WHERE job_id=?').bind(j.id),env.DB.prepare('DELETE FROM dev_jobs WHERE id=? AND owner_id=?').bind(j.id,d.user_id)]);
     }
    }
    if(settling||devJobs.length===25)return h.json({status:'pending',reason:'CLEANING_OBJECTS'});
   }
  }
  const db=env.DB,t=now();await db.batch([
   db.prepare("UPDATE invites SET email='' WHERE email=(SELECT email FROM users WHERE id=?)").bind(d.user_id),db.prepare('UPDATE invites SET claimed_by=NULL WHERE claimed_by=?').bind(d.user_id),
   db.prepare('DELETE FROM bug_reports WHERE user_id=?').bind(d.user_id),db.prepare('DELETE FROM sources WHERE user_id=?').bind(d.user_id),db.prepare('DELETE FROM private_state WHERE user_id=?').bind(d.user_id),db.prepare('DELETE FROM consents WHERE user_id=?').bind(d.user_id),db.prepare('DELETE FROM usage WHERE user_id=?').bind(d.user_id),db.prepare('DELETE FROM jobs WHERE user_id=?').bind(d.user_id),db.prepare('DELETE FROM sessions WHERE user_id=?').bind(d.user_id),db.prepare('DELETE FROM audit WHERE actor_id=? OR target_id=?').bind(d.user_id,d.user_id),
   db.prepare("UPDATE users SET google_sub=?,email='',joined_at=0,last_active=0,status='suspended' WHERE id=?").bind('deleted:'+d.user_id,d.user_id),db.prepare("UPDATE deletion_jobs SET status='complete',updated_at=? WHERE user_id=?").bind(t,d.user_id)]);
  return h.json({status:'complete',message:'Активные данные удалены. Резервные копии и версии хранилища подчиняются отдельной политике.'});
 }catch{return h.json({status:'pending',reason:'CLEANUP_RETRY'},202)}
}
