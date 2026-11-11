import {REPORT_BLOCKS,REPORT_ROUTES,REPORT_ERRORS} from '../public/bug-report-contract.js';
const now=()=>Math.floor(Date.now()/1000),clientID=/^[a-zA-Z0-9_-]{16,80}$/;
const columns='number,client_id,description,block_id,context_json,status,revision,fix_version,evidence,issue_url,history_json,created_at,updated_at';
const present=r=>({...r,context:JSON.parse(r.context_json),history:JSON.parse(r.history_json),context_json:undefined,history_json:undefined});
function text(x,max,required,h){if(typeof x!=='string'||x.length>max||(required&&!x.trim())||/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(x))h.fail(400,'INVALID_REPORT');return x.trim()}
function keys(x,list,h){if(!x||Array.isArray(x)||typeof x!=='object'||Object.keys(x).sort().join()!==list.split(',').sort().join())h.fail(400,'INVALID_REPORT')}
export function validateReport(x,h){
 keys(x,'client_id,description,block_id,context,technical_only',h);
 if(typeof x.client_id!=='string'||!clientID.test(x.client_id)||typeof x.block_id!=='string'||!Object.hasOwn(REPORT_BLOCKS,x.block_id)||x.technical_only!==true)h.fail(400,'INVALID_REPORT');
 const description=text(x.description,4000,true,h),c=x.context;keys(c,'route,version,viewport,error_code',h);keys(c.viewport,'width,height',h);
 if(!REPORT_ROUTES.includes(c.route)||typeof c.version!=='string'||! /^[a-zA-Z0-9._-]{1,80}$/.test(c.version)||![c.viewport.width,c.viewport.height].every(v=>Number.isInteger(v)&&v>0&&v<=10000)||!(c.error_code===''||REPORT_ERRORS.includes(c.error_code)))h.fail(400,'INVALID_REPORT');
 return {client_id:x.client_id,description,block_id:x.block_id,context:{route:c.route,version:c.version,viewport:{width:c.viewport.width,height:c.viewport.height},error_code:c.error_code}};
}
export async function handleBugReports(req,env,h){
 const url=new URL(req.url),path=url.pathname,admin=path.startsWith('/api/admin/bug-reports'),write=req.method==='POST';
 const {u}=await h.auth(req,env,{admin,write});
 const get=(sql,...a)=>h.dbfirst(env,sql,...a),run=(sql,...a)=>h.dbrun(env,sql,...a);
 if(req.method==='GET'&&(path==='/api/bug-reports'||path==='/api/admin/bug-reports')){
  if([...url.searchParams.keys()].some(k=>!['before','client_id'].includes(k)))h.fail(400,'INVALID_REPORT');
  const id=url.searchParams.get('client_id');if(id!==null){if(admin||!clientID.test(id))h.fail(400,'INVALID_REPORT');const r=await get(`SELECT ${columns} FROM bug_reports WHERE user_id=? AND client_id=?`,u.id,id);return h.json({report:r?present(r):null})}
  const before=url.searchParams.get('before')||'2147483647';if(!/^[1-9][0-9]{0,9}$/.test(before))h.fail(400,'INVALID_REPORT');
  const rows=await h.dball(env,`SELECT ${columns} FROM bug_reports WHERE ${admin?'':'user_id=? AND '}number<? ORDER BY number DESC LIMIT 31`,...(admin?[]:[u.id]),Number(before));
  return h.json({reports:rows.slice(0,30).map(present),next_before:rows.length>30?rows[29].number:null});
 }
 if(path==='/api/bug-reports'&&write){
  const x=validateReport(await h.bodyJson(req,18000),h),payload=JSON.stringify(x),hash=await h.sha(payload),t=now();
  // One statement enforces admission and idempotency across concurrent submissions.
  await run("INSERT INTO bug_reports(user_id,client_id,payload_hash,description,block_id,context_json,history_json,created_at,updated_at) SELECT ?,?,?,?,?,?,?,?,? WHERE (SELECT COUNT(*) FROM bug_reports WHERE user_id=? AND created_at>?)<100 ON CONFLICT(user_id,client_id) DO NOTHING",u.id,x.client_id,hash,x.description,x.block_id,JSON.stringify(x.context),JSON.stringify([{status:'new',at:t,actor:'reporter'}]),t,t,u.id,t-86400);
  const row=await get(`SELECT ${columns},payload_hash FROM bug_reports WHERE user_id=? AND client_id=?`,u.id,x.client_id);if(!row)h.fail(429,'REPORT_LIMIT');if(row.payload_hash!==hash)h.fail(409,'REPORT_ID_CONFLICT');delete row.payload_hash;return h.json({report:present(row)},201);
 }
 if(write&&path===(admin?'/api/admin/bug-reports/update':'/api/bug-reports/verify')){
  const x=await h.bodyJson(req,12000);keys(x,admin?'number,revision,status,fix_version,evidence,issue_url':'number,revision,resolved',h);
  if(!Number.isSafeInteger(x.number)||x.number<1||!Number.isSafeInteger(x.revision)||x.revision<1)h.fail(400,'INVALID_REPORT');
  const row=await get(`SELECT ${columns} FROM bug_reports WHERE number=?${admin?'':' AND user_id=?'}`,x.number,...(admin?[]:[u.id]));if(!row)h.fail(404,'NOT_FOUND');if(row.revision!==x.revision)h.fail(409,'REPORT_CHANGED');
  let status,fix=row.fix_version,evidence=row.evidence,issue=row.issue_url;
  if(admin){
   if(!['new','in_progress','ready_to_verify'].includes(x.status)||row.status==='closed')h.fail(409,'REPORT_TRANSITION');status=x.status;fix=text(x.fix_version,100,status==='ready_to_verify',h);evidence=text(x.evidence,2000,status==='ready_to_verify',h);issue=text(x.issue_url,300,false,h);
   if(issue&&!/^https:\/\/linear\.app\/[a-zA-Z0-9/_-]+$/.test(issue))h.fail(400,'INVALID_ISSUE_URL');
  }else{if(typeof x.resolved!=='boolean'||!['ready_to_verify','closed'].includes(row.status)||(x.resolved&&row.status!=='ready_to_verify'))h.fail(409,'REPORT_TRANSITION');status=x.resolved?'closed':'in_progress'}
  const t=now(),event=JSON.stringify({status,at:t,actor:admin?'admin':'reporter',fix_version:fix,evidence,issue_url:issue});
  const result=await run("UPDATE bug_reports SET status=?,fix_version=?,evidence=?,issue_url=?,revision=revision+1,updated_at=?,history_json=json_insert(history_json,'$[#]',json(?)) WHERE number=? AND revision=?",status,fix,evidence,issue,t,event,x.number,x.revision);
  if(result.meta.changes!==1)h.fail(409,'REPORT_CHANGED');return h.json({report:present(await get(`SELECT ${columns} FROM bug_reports WHERE number=?`,x.number))});
 }
 h.fail(404,'NOT_FOUND');
}
