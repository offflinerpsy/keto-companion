/** Trusted release acceptance only. No real identity, profile, database or media.
 * A short-lived token stays inside native CI and authorizes one fixed synthetic job.
 * Candidate tests execute in the real private Cloudflare Container, network disabled.
 */
import {readFileSync,writeFileSync} from 'node:fs';
import {randomBytes,randomUUID,createHash} from 'node:crypto';
const account='0609100baf768271ea2811c9a9ee2b16';
const release=JSON.parse(readFileSync('developer-runtime/release.json','utf8'));
const manifest=JSON.parse(readFileSync('developer-runtime/build/manifest.json','utf8'));
if(release.account!==account||release.baseline!==manifest.baseline)throw Error('Acceptance baseline mismatch');
const authorization=process.env.CLOUDFLARE_API_TOKEN;if(!authorization)throw Error('Native release authorization unavailable');
const source=manifest.sources.find(x=>x.path==='cloudflare-saas/public/help.html');
const files=[{path:source.path,before_sha256:source.sha256,content:source.content+'\n<!-- Cloudflare Container synthetic release acceptance -->\n'}];
const patchHash=createHash('sha256').update(JSON.stringify(files)).digest('hex');
const job={job_id:randomUUID(),baseline:manifest.baseline,patch_hash:patchHash,files};
const name='keto-developer-check-'+randomBytes(5).toString('hex'),secret=randomBytes(32).toString('hex');
const scriptPath='/accounts/'+account+'/workers/scripts/'+name;
async function api(method,path,body){const response=await fetch('https://api.cloudflare.com/client/v4'+path,{method,headers:{Authorization:'Bearer '+authorization,...(body instanceof FormData?{}:{'Content-Type':'application/json'})},body:body===undefined?undefined:body instanceof FormData?body:JSON.stringify(body)});if(response.status===204)return null;const data=await response.json();if(!response.ok||data.success===false)throw Error('Cloudflare acceptance operation failed '+method+' HTTP'+response.status);return data.result}
let uploaded=false,cleanup=false,result;
try{
 const metadata={main_module:'check.mjs',compatibility_date:'2026-11-07',bindings:[{type:'service',name:'RUNNER',service:release.worker,entrypoint:'DeveloperRunner'},{type:'secret_text',name:'CHECK_TOKEN',text:secret}],observability:{enabled:false},logpush:false};
 const expires=Date.now()+360000;
 const code=`const job=${JSON.stringify(job)};export default{async fetch(req,env){if(Date.now()>${expires}||req.method!=='POST'||req.headers.get('Authorization')!=='Bearer '+env.CHECK_TOKEN)return new Response('Not Found',{status:404});try{const r=await env.RUNNER.run(job);return Response.json(r,{headers:{'Cache-Control':'no-store'}})}catch(e){return Response.json({status:'failed',error:String(e).slice(0,400)},{status:502,headers:{'Cache-Control':'no-store'}})}}};`;
 const form=new FormData();form.append('metadata',new Blob([JSON.stringify(metadata)],{type:'application/json'}));form.append('check.mjs',new Blob([code],{type:'application/javascript+module'}),'check.mjs');
 await api('PUT',scriptPath,form);uploaded=true;await api('POST',scriptPath+'/subdomain',{enabled:true,previews_enabled:false});
 const subdomain=(await api('GET','/accounts/'+account+'/workers/subdomain')).subdomain;
 // Propagation is not a test retry; only one POST can invoke the fixed job ID.
 await new Promise(resolve=>setTimeout(resolve,5000));
 const response=await fetch('https://'+name+'.'+subdomain+'.workers.dev/',{method:'POST',headers:{Authorization:'Bearer '+secret},signal:AbortSignal.timeout(310000)});
 result=await response.json();
 if(!response.ok||result.status!=='passed'||result.exit_code!==0||result.baseline!==manifest.baseline||result.patch_hash!==patchHash||result.image_digest!==release.image_digest)throw Error('Cloud Container acceptance failed: '+JSON.stringify({http:response.status,status:result.status,error:result.error}).slice(0,450));
 const stages=['syntax','build','product','python'];
 if(result.stages?.length!==stages.length||!result.stages.every((s,i)=>s.name===stages[i]&&s.exit_code===0&&(i<2||Number.isInteger(s.passed_count)&&s.passed_count>0)))throw Error('Cloud Container acceptance stages invalid');
}finally{
 if(uploaded){await api('DELETE',scriptPath);cleanup=true}
}
const receipt={task:'CF-DEV-MEDIA-08',scope:'actual private Cloudflare Container through service RPC; one fixed synthetic UI patch, no family session or app data',baseline:manifest.baseline,patch_hash:patchHash,image_digest:release.image_digest,status:result.status,exit_code:result.exit_code,stages:result.stages.map(({log,...rest})=>rest),temporary_probe_deleted:cleanup,no_credentials_returned:true,no_database_or_R2_binding:true,actual_owner_UI_tested:false};
writeFileSync('docs/evidence/CF_DEV_CLOUD_RUNTIME_ACCEPTANCE.json',JSON.stringify(receipt,null,2)+'\n');
console.log('KETO_CLOUD_CONTAINER_ACCEPTED '+JSON.stringify(receipt));
