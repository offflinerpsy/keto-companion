import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../src/worker.mjs';

const origin='https://pilot.example.test',host='keto-companion-auth-261107.firebaseapp.com';
function env(extra={}){return {AUTH_PROVIDER:'firebase_google',DB:{},UPLOADS:{},PUBLIC_ORIGIN:origin,OWNER_GOOGLE_EMAIL:'offflinerpsy@gmail.com',SESSION_HMAC_KEY:'synthetic-only-hmac-key-longer-than-32',FIREBASE_PUBLIC_CONFIG_JSON:JSON.stringify({projectId:'keto-companion-auth-261107',authDomain:host,apiKey:'synthetic-public-key',appId:'synthetic-app',notPublic:'do-not-project'}),...extra}}
function request(path,options={}){return new Request(origin+path,options)}
async function upstream(fn,run){const previous=globalThis.fetch;globalThis.fetch=fn;try{return await run()}finally{globalThis.fetch=previous}}
const readConfig=async e=>(await worker.fetch(request('/auth/config'),e)).json();

test('authDomain remains Firebase by default and only exact opt-in emits validated app hostname',async()=>{
 const defaults=await readConfig(env());assert.equal(defaults.firebase.authDomain,host);assert.equal(defaults.firebase.notPublic,undefined);
 const enabled=await readConfig(env({FIREBASE_AUTH_HELPER_MODE:'same-origin'}));assert.equal(enabled.firebase.authDomain,'pilot.example.test');assert.equal(enabled.firebase.projectId,defaults.firebase.projectId);
 for(const e of [env({FIREBASE_AUTH_HELPER_MODE:'typo'}),env({FIREBASE_AUTH_HELPER_MODE:'same-origin',PUBLIC_ORIGIN:'http://pilot.example.test'}),env({FIREBASE_AUTH_HELPER_MODE:'same-origin',PUBLIC_ORIGIN:origin+'/path'}),env({FIREBASE_AUTH_HELPER_MODE:'same-origin',PUBLIC_ORIGIN:'https://pilot.example.test:444'}),env({FIREBASE_AUTH_HELPER_MODE:'same-origin',FIREBASE_PUBLIC_CONFIG_JSON:JSON.stringify({projectId:'keto-companion-auth-261107',authDomain:'evil.example',apiKey:'synthetic',appId:'synthetic'})})]){
  const r=await worker.fetch(request('/auth/config'),e);assert.equal(r.status,503);assert.equal((await r.json()).error,'SETUP_REQUIRED');
 }
});

test('configured Firebase helper routes can be probed before authDomain activation; direct Google cannot proxy',async()=>{
 let calls=0;await upstream(async()=>{calls++;return new Response('helper',{headers:{'content-type':'text/html'}})},async()=>{
  assert.equal((await worker.fetch(request('/__/auth/handler'),env())).status,200);
  assert.equal((await readConfig(env())).firebase.authDomain,host);
  const e=env({AUTH_PROVIDER:'direct_google',GOOGLE_CLIENT_ID:'synthetic',GOOGLE_CLIENT_SECRET:'synthetic'});
  assert.equal((await worker.fetch(request('/__/auth/handler'),e)).status,404);
 });assert.equal(calls,1);
});

test('handler, iframe and known scripts use fixed upstream, preserve query and isolate request headers',async()=>{
 const paths=['handler','iframe','handler.js','iframe.js','experiments.js'];let calls=0;
 await upstream(async(url,init)=>{
  calls++;assert.equal(url,'https://'+host+'/__/auth/'+paths[calls-1]+'?synthetic=one%2Ftwo');
  assert.equal(init.method,'GET');assert.equal(init.redirect,'manual');assert.equal(init.credentials,'omit');assert.equal(init.referrerPolicy,'no-referrer');assert(init.signal instanceof AbortSignal);
  assert.deepEqual([...init.headers.keys()].sort(),['accept','accept-language']);assert.equal(init.headers.get('accept-language'),'ru');
  return new Response('helper-body',{headers:{'content-type':calls>2?'text/javascript':'text/html','content-security-policy':"script-src 'self' https://apis.google.com",'set-cookie':'keto_session=overwrite','cache-control':'public, max-age=3600','access-control-allow-origin':'*'}});
 },async()=>{
  for(const path of paths){const r=await worker.fetch(request('/__/auth/'+path+'?synthetic=one%2Ftwo',{headers:{accept:'text/html','accept-language':'ru',cookie:'keto_session=synthetic; keto_firebase=synthetic',authorization:'Bearer synthetic',origin,referer:origin+'/?private=synthetic','x-csrf-token':'synthetic'}}),env());
   assert.equal(r.status,200);assert.equal(await r.text(),'helper-body');assert.equal(r.headers.get('cache-control'),'no-store');assert.equal(r.headers.get('referrer-policy'),'no-referrer');assert.equal(r.headers.get('x-content-type-options'),'nosniff');assert.equal(r.headers.get('set-cookie'),null);assert.equal(r.headers.get('access-control-allow-origin'),null);assert.equal(r.headers.get('content-security-policy'),"script-src 'self' https://apis.google.com");assert(!r.headers.get('content-security-policy').includes('frame-ancestors'));
  }
 });assert.equal(calls,paths.length);
});

test('POST handler transparently forwards only bounded form bytes and content type',async()=>{
 await upstream(async(url,init)=>{assert.equal(url,'https://'+host+'/__/auth/handler?synthetic=callback');assert.equal(init.method,'POST');assert.equal(new TextDecoder().decode(init.body),'synthetic=form%20value');assert.deepEqual([...init.headers.keys()],['content-type']);return new Response('done')},async()=>{
  const r=await worker.fetch(request('/__/auth/handler?synthetic=callback',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded;charset=UTF-8',cookie:'keto_session=synthetic',authorization:'synthetic'},body:'synthetic=form%20value'}),env());assert.equal(r.status,200);
 });
});

test('unknown paths, other origin, methods, JSON POST, oversized body and query cannot invoke upstream',async()=>{
 let calls=0;await upstream(async()=>{calls++;throw Error('must not fetch')},async()=>{
  for(const path of ['/__/auth/','/__/auth/unknown','/__/auth/handler/extra','/__/auth/%68andler','/__/auth/https://evil.example','/__/auth/handler.js.map'])assert.equal((await worker.fetch(request(path),env())).status,404);
  assert.equal((await worker.fetch(new Request('https://evil.example/__/auth/handler'),env())).status,404);
  for(const method of ['PUT','DELETE','PATCH','HEAD','OPTIONS'])assert.equal((await worker.fetch(request('/__/auth/handler',{method}),env())).status,405);
  assert.equal((await worker.fetch(request('/__/auth/iframe',{method:'POST',body:'synthetic'}),env())).status,405);
  assert.equal((await worker.fetch(request('/__/auth/handler',{method:'POST',headers:{'content-type':'application/json'},body:'{}'}),env())).status,415);
  assert.equal((await worker.fetch(request('/__/auth/handler',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body:'x'.repeat(65537)}),env())).status,413);
  assert.equal((await worker.fetch(request('/__/auth/handler?x='+'x'.repeat(16384)),env())).status,414);
 });assert.equal(calls,0);
});

test('redirects are never followed by proxy; helper redirects stay same-origin and OAuth destinations are narrow',async()=>{
 const cases=[['/__/auth/iframe?synthetic=redirect',302,origin+'/__/auth/iframe?synthetic=redirect'],['https://'+host+'/__/auth/handler?synthetic=next',303,origin+'/__/auth/handler?synthetic=next'],[origin+'/?synthetic=return',302,origin+'/?synthetic=return'],['https://accounts.google.com/o/oauth2/v2/auth?synthetic=login',302,'https://accounts.google.com/o/oauth2/v2/auth?synthetic=login'],['https://evil.example/',502,null],['https://accounts.google.com/url?synthetic=evil',502,null],['https://'+host+'/unrelated',502,null],['http://accounts.google.com/o/oauth2/auth',502,null],['https://user@accounts.google.com/o/oauth2/auth',502,null],['https://accounts.google.com:444/o/oauth2/auth',502,null]];
 for(const [location,status,target]of cases){let calls=0;await upstream(async(url,init)=>{calls++;assert.equal(init.redirect,'manual');return new Response(null,{status:status===303?303:302,headers:{location,'set-cookie':'synthetic=discard'}})},async()=>{const r=await worker.fetch(request('/__/auth/handler'),env());assert.equal(r.status,status,location);assert.equal(r.headers.get('location'),target);assert.equal(r.headers.get('set-cookie'),null)});assert.equal(calls,1)}
});

test('upstream timeout, network/error/oversize responses and invalid redirects fail without internal detail',async()=>{
 const failures=[async()=>{throw new DOMException('synthetic timeout','TimeoutError')},async()=>{throw Error('synthetic internal URL')},async()=>new Response('upstream detail',{status:500}),async()=>new Response('x'.repeat(2000001)),async()=>new Response('x',{headers:{'content-length':'2000001'}}),async()=>new Response(null,{status:302})];
 for(const fn of failures)await upstream(fn,async()=>{const r=await worker.fetch(request('/__/auth/iframe'),env());assert.equal(r.status,502);assert.deepEqual(await r.json(),{error:'FIREBASE_HELPER_UNAVAILABLE'});assert.equal(r.headers.get('cache-control'),'no-store')});
});
