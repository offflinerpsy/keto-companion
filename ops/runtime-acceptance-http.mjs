/** Scoped interception of the trusted acceptance verifier; never logs request content. */
const API='https://api.cloudflare.com/client/v4';
const ACCOUNT='0609100baf768271ea2811c9a9ee2b16';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const NAME=/^keto-developer-check-[0-9a-f]{10}$/;
const jsonType=r=>/^application\/(?:[\w.+-]*\+)?json(?:\s*;|$)/i.test(r.headers.get('content-type')||'');
async function bounded(response,limit){const reader=response.body?.getReader();if(!reader)throw Error('ACCEPTANCE_HTTP_EMPTY');let chunks=[],size=0;try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>limit)throw Error('ACCEPTANCE_HTTP_TOO_LARGE');chunks.push(value)}}catch(e){await reader.cancel().catch(()=>{});throw e}const out=new Uint8Array(size);let pos=0;for(const b of chunks){out.set(b,pos);pos+=b.length}return new TextDecoder().decode(out)}
function safeStatus(r){return Number.isInteger(r.status)&&r.status>=100&&r.status<=599?r.status:0}
export function createAcceptanceGuard({fetcher,record,settle=()=>new Promise(resolve=>setTimeout(resolve,10000))}){
 let firstFailure=null,subdomain=null;const state={probe_name:null,job_id:null,upload:'not_delivered',readiness:null,post:'not_delivered',post_count:0,cleanup:'not_attempted',events:[]};
 function event(method,r,kind){state.events.push({method,status:safeStatus(r),type:kind});record(state)}
 async function jsonResponse(r,method){if(r.status===204)return;if(!jsonType(r)){event(method,r,'non_json');throw Error('ACCEPTANCE_HTTP_NON_JSON_'+method+'_'+safeStatus(r))}try{JSON.parse(await bounded(r.clone(),2000000))}catch{event(method,r,'invalid_json');throw Error('ACCEPTANCE_HTTP_INVALID_JSON_'+method+'_'+safeStatus(r))}}
 async function guardedFetchInner(input,init={}){
  const url=typeof input==='string'?input:input instanceof URL?input.href:input.url,method=String(init.method||'GET').toUpperCase();
  if(url.startsWith(API+'/accounts/'+ACCOUNT+'/workers/scripts/')&&method==='PUT'){
   const path=new URL(url).pathname,match=path.match(new RegExp('^/client/v4/accounts/'+ACCOUNT+'/workers/scripts/(keto-developer-check-[0-9a-f]{10})$'));
   if(!match||state.probe_name||!(init.body instanceof FormData))throw Error('ACCEPTANCE_PROBE_ID_INVALID');
   const code=init.body.get('check.mjs');if(!code||typeof code.text!=='function'||code.size>1500000)throw Error('ACCEPTANCE_PROBE_ID_INVALID');const text=await code.text(),prefix='const job=',end=text.lastIndexOf(';export default');if(!text.startsWith(prefix)||end<0)throw Error('ACCEPTANCE_PROBE_ID_INVALID');let job;try{job=JSON.parse(text.slice(prefix.length,end))}catch{throw Error('ACCEPTANCE_PROBE_ID_INVALID')}
   if(!UUID.test(job?.job_id||'')||!NAME.test(match[1]))throw Error('ACCEPTANCE_PROBE_ID_INVALID');state.probe_name=match[1];state.job_id=job.job_id;state.upload='possibly_delivered';record(state);
   let r;try{r=await fetcher(input,init)}catch{record(state);throw Error('ACCEPTANCE_API_NETWORK_PUT')}if(r.ok)state.upload='delivered_unverified';event(method,r,jsonType(r)?'json':'non_json');await jsonResponse(r,method);return r;
  }
  const parsed=new URL(url);const publicProbe=state.probe_name&&subdomain&&parsed.protocol==='https:'&&parsed.hostname===state.probe_name+'.'+subdomain+'.workers.dev'&&parsed.pathname==='/'&&!parsed.search&&!parsed.hash&&!parsed.port&&!parsed.username&&!parsed.password;
  if(publicProbe&&method==='POST'){
   if(state.post_count||!state.job_id||state.upload!=='delivered_unverified')throw Error('ACCEPTANCE_PROBE_POST_FORBIDDEN');
   let ready;try{await settle();ready=await fetcher(url,{method:'GET',redirect:'manual',signal:AbortSignal.timeout(10000)})}catch{state.readiness='network_failure';record(state);throw Error('ACCEPTANCE_READINESS_NETWORK')}
   const ct=ready.headers.get('content-type')||'';let body='';try{body=await bounded(ready,4096)}catch{state.readiness='invalid';event('GET',ready,'invalid');throw Error('ACCEPTANCE_READINESS_INVALID')}
   if(ready.status!==404||!/^text\/plain(?:\s*;|$)/i.test(ct)||body!=='Not Found'){state.readiness='refused_or_mismatch';event('GET',ready,'mismatch');throw Error('ACCEPTANCE_READINESS_MISMATCH_'+safeStatus(ready))}
   state.readiness='known_handler_shape';event('GET',ready,'known_handler_shape');state.post_count=1;state.post='possibly_delivered';record(state);
   let r;try{r=await fetcher(input,{...init,redirect:'manual'})}catch{record(state);throw Error('ACCEPTANCE_POST_UNCERTAIN')}
   state.post='delivered_unverified';event('POST',r,jsonType(r)?'json':'non_json');await jsonResponse(r,'POST');const result=JSON.parse(await bounded(r.clone(),2000000));const hash=x=>typeof x==='string'&&/^[a-f0-9]{64}$/.test(x)?x:null;state.post_result={status:['passed','failed'].includes(result?.status)?result.status:'other',baseline:hash(result?.baseline),patch_hash:hash(result?.patch_hash),image_digest:typeof result?.image_digest==='string'&&/^sha256:[a-f0-9]{64}$/.test(result.image_digest)?result.image_digest:null,exit_code:Number.isInteger(result?.exit_code)?result.exit_code:null,stages:Array.isArray(result?.stages)?result.stages.slice(0,8).map(x=>({name:['syntax','build','product','python'].includes(x?.name)?x.name:'other',exit_code:Number.isInteger(x?.exit_code)?x.exit_code:null,passed_count:Number.isInteger(x?.passed_count)?x.passed_count:null})):[]};record(state);return r;
  }
  if(url.startsWith(API+'/') ){
   const isDelete=state.probe_name&&method==='DELETE'&&parsed.pathname==='/client/v4/accounts/'+ACCOUNT+'/workers/scripts/'+state.probe_name;
   if(isDelete){state.cleanup='possibly_delivered';record(state)}
   let r;try{r=await fetcher(input,init)}catch{if(isDelete)event(method,{status:0},'network_failure');throw Error('ACCEPTANCE_API_NETWORK_'+method)}
   if(isDelete)state.cleanup=r.ok?'delivered_unverified':'failed';event(method,r,r.status===204?'empty':jsonType(r)?'json':'non_json');try{await jsonResponse(r,method)}catch(e){if(isDelete){state.cleanup='response_unverified';record(state)}throw e}if(isDelete&&r.status!==204){const d=JSON.parse(await bounded(r.clone(),2000000));if(d?.success===false){state.cleanup='failed';record(state)}}if(method==='GET'&&parsed.pathname==='/client/v4/accounts/'+ACCOUNT+'/workers/subdomain'){let d;try{d=JSON.parse(await bounded(r.clone(),2000000))}catch{throw Error('ACCEPTANCE_SUBDOMAIN_INVALID')}if(!r.ok||d?.success===false||typeof d?.result?.subdomain!=='string'||!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(d.result.subdomain))throw Error('ACCEPTANCE_SUBDOMAIN_INVALID');subdomain=d.result.subdomain}return r;
  }
  throw Error('ACCEPTANCE_UNEXPECTED_HTTP_TARGET');
 }
 async function guardedFetch(...args){try{return await guardedFetchInner(...args)}catch(e){if(!firstFailure)firstFailure=e;throw e}}
 return {fetch:guardedFetch,state,get firstFailure(){return firstFailure}};
}

export async function runGuardedVerifier({fetcher,persist,importVerifier,settle}){
 const original=globalThis.fetch,guard=createAcceptanceGuard({fetcher,record:persist,settle});globalThis.fetch=guard.fetch;let failure;try{await importVerifier();if(guard.state.post!=='delivered_unverified'||guard.state.cleanup!=='delivered_unverified')throw Error('ACCEPTANCE_EFFECT_UNVERIFIED');guard.state.outcome='verifier_passed'}catch(e){failure=guard.firstFailure||e;guard.state.outcome='verifier_failed'}finally{globalThis.fetch=original;try{persist(guard.state)}catch(e){if(!failure)failure=e}}if(failure)throw failure;return guard.state;
}


// Terminal output is intentionally independent of verifier exception text.
export async function runGuardedTerminal(options,report=message=>console.error(message)){
 try{await runGuardedVerifier(options);return true}catch{report('KETO_GUARDED_ACCEPTANCE_FAILED');return false}
}
