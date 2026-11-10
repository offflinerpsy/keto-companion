import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync,readdirSync} from 'node:fs';
import vm from 'node:vm';
import {webcrypto,generateKeyPairSync,createSign,createHash} from 'node:crypto';
import standaloneWorker from '../dist/worker.mjs';
import sourceWorker from '../src/worker.mjs';
import * as authSessionModule from '../public/auth-session.js';
import {createFoodPicker} from '../public/food-picker.js';
import {setupChatActions} from '../public/chat-actions.js';
import {setupIntake,intakeReviewNodes} from '../public/intake-ui.js';
import {createScrollMemory,chatScrollPosition,createDialogController} from '../public/shell-ui.js';
import {mainTab,MAIN_ROUTES} from '../public/routes.js';
import {createRecipePageCalls} from '../public/recipe-page-calls.js';
import {renderTodayPlan} from '../public/today-plan.js';
import {setupKitchen,sourceImportPreview,kitchenActionLabels} from '../public/kitchen-ui.js';

const origin='https://pilot.example.test';
class FullD1{
 constructor(){this.db=new DatabaseSync(':memory:');for(const f of readdirSync('cloudflare-saas/migrations').filter(f=>f.endsWith('.sql')).sort())this.db.exec(readFileSync('cloudflare-saas/migrations/'+f,'utf8'))}
 prepare(sql){const db=this.db;return {bind(...args){const stmt=db.prepare(sql);return {first:()=>stmt.get(...args)??null,all:()=>({results:stmt.all(...args)}),run:()=>({meta:{changes:Number(stmt.run(...args).changes)}})}}}}
 batch(stmts){this.db.exec('BEGIN');try{const r=stmts.map(x=>x.run());this.db.exec('COMMIT');return r}catch(e){this.db.exec('ROLLBACK');throw e}}
}
class Bucket{constructor(){this.objects=new Map()}async put(k,v){this.objects.set(k,new Uint8Array(v))}async get(k){const b=this.objects.get(k);return b?{body:b}:null}async delete(k){for(const key of Array.isArray(k)?k:[k])this.objects.delete(key)}async list({prefix,limit}){return {objects:[...this.objects.keys()].filter(k=>k.startsWith(prefix)).slice(0,limit).map(key=>({key})),truncated:false}}}
function makeEnv(){return {AUTH_PROVIDER:'direct_google',DB:new FullD1(),UPLOADS:new Bucket(),ASSETS:{fetch:async r=>standaloneWorker.fetch(r,{})},PUBLIC_ORIGIN:origin,OWNER_GOOGLE_EMAIL:'offflinerpsy@gmail.com',GOOGLE_CLIENT_ID:'synthetic-client',GOOGLE_CLIENT_SECRET:'synthetic-secret',SESSION_HMAC_KEY:'synthetic-hmac-secret-1234567890123456789',KETO_EDGE_BRIDGE_URL:'https://bridge.example.test/internal/keto/compute',KETO_EDGE_BRIDGE_SECRET:'synthetic-edge-secret-not-a-real-production-key'}}
const kp=generateKeyPairSync('rsa',{modulusLength:2048}),jwk={...kp.publicKey.export({format:'jwk'}),kid:'synthetic',alg:'RS256'};
const b64=x=>Buffer.from(typeof x==='string'?x:JSON.stringify(x)).toString('base64url');
function jwt(nonce,email='offflinerpsy@gmail.com',sub='owner-sub'){const claim={iss:'https://accounts.google.com',aud:'synthetic-client',exp:Math.floor(Date.now()/1000)+3600,sub,email,email_verified:true,nonce};const input=b64({alg:'RS256',kid:'synthetic'})+'.'+b64(claim);const s=createSign('RSA-SHA256');s.update(input);return input+'.'+s.sign(kp.privateKey).toString('base64url')}
async function req(e,path,{method='GET',body,cookie,csrf}={}){const h={};if(cookie)h.cookie=cookie;if(csrf)h['x-csrf-token']=csrf;if(method==='POST'){h.origin=origin;h['content-type']='application/json'}return sourceWorker.fetch(new Request(origin+path,{method,headers:h,...(body!==undefined?{body:JSON.stringify(body)}:{})}),e)}
async function loginOwner(e){const s=await req(e,'/auth/google/start',{method:'POST',body:{}});const u=new URL((await s.json()).authorization_url),state=u.searchParams.get('state'),nonce=u.searchParams.get('nonce'),authCookie=s.headers.get('set-cookie').split(';')[0];const prev=globalThis.fetch;globalThis.fetch=async target=>{if(String(target)==='https://oauth2.googleapis.com/token')return new Response(JSON.stringify({id_token:jwt(nonce)}),{status:200});if(String(target)==='https://www.googleapis.com/oauth2/v3/certs')return new Response(JSON.stringify({keys:[jwk]}),{status:200});throw Error('unexpected '+target)};try{const cb=await req(e,'/auth/google/callback?'+new URLSearchParams({state,code:'c'}),{cookie:authCookie});return cb.headers.get('set-cookie').split(';')[0]}finally{globalThis.fetch=prev}}

test('scheduled handler is exported in bundled Worker and purges expired developer artifacts and stale caches',async()=>{
 assert.equal(typeof standaloneWorker.scheduled,'function');
 const modularSource=readFileSync('cloudflare-saas/dist/worker-modules.mjs','utf8');
 assert.match(modularSource,/scheduled\s*\(/);
 const e=makeEnv(),now=Math.floor(Date.now()/1000);
 e.DB.db.prepare("INSERT INTO users(id,google_sub,email,role,status,joined_at,last_active) VALUES('u1','sub1','offflinerpsy@gmail.com','admin','active',1,1)").run();
 e.DB.db.prepare("INSERT INTO sessions(token_hash,user_id,expires_at,created_at) VALUES('exp_sess','u1',?,1)").run(now-10);
 e.DB.db.prepare("INSERT INTO shop_public_cache(barcode,payload,expires_at) VALUES('3017620422003','{}',?)").run(now-10);
 e.DB.db.prepare("INSERT INTO jobs(user_id,request_id,request_hash,status,revision,created_at,response_json) VALUES('u1','old_job','h','completed',1,?,?)").run(now-8*86400,JSON.stringify({ok:true}));
 e.DB.db.prepare("INSERT INTO dev_jobs(id,owner_id,session_hash,request_id,request_hash,baseline,build_hash,state,settings_epoch,lease_until,created_at,expires_at) VALUES('job-1','u1','sh','r1','rh','b','b','draft',0,1,1,?)").run(now-5);
 await e.UPLOADS.put('developer/job-1/task',new Uint8Array([1,2,3]));
 const waits=[];await standaloneWorker.scheduled({},e,{waitUntil:p=>waits.push(p)});await Promise.all(waits);
 assert.equal(e.UPLOADS.objects.has('developer/job-1/task'),false);
 assert.equal(e.DB.db.prepare("SELECT state FROM dev_jobs WHERE id='job-1'").get().state,'expired');
 assert.equal(e.DB.db.prepare("SELECT COUNT(*) n FROM sessions WHERE token_hash='exp_sess'").get().n,0);
 assert.equal(e.DB.db.prepare("SELECT COUNT(*) n FROM shop_public_cache").get().n,0);
 const oldJob=e.DB.db.prepare("SELECT status,response_json FROM jobs WHERE request_id='old_job'").get();
 assert.equal(oldJob.status,'completed');assert.equal(oldJob.response_json,null);
});

test('personal deletion cleans developer jobs, events, active lease and R2 parts before reporting complete',async()=>{
 const e=makeEnv(),cookie=await loginOwner(e);
 const sess=await (await req(e,'/api/session',{cookie})).json();
 const uid=e.DB.db.prepare("SELECT id FROM users WHERE email='offflinerpsy@gmail.com'").get().id;
 const jobId='11111111-2222-3333-4444-555555555555',now=Math.floor(Date.now()/1000);
 e.DB.db.prepare("UPDATE dev_settings SET enabled_until=?,active_job=?,lease_until=? WHERE id=1").run(now+3600,jobId,now+3600);
 e.DB.db.prepare("INSERT INTO dev_jobs(id,owner_id,session_hash,request_id,request_hash,baseline,build_hash,state,settings_epoch,lease_until,created_at,expires_at) VALUES(?,?,'sh','req1','rh','b','b','draft',0,?,?,?)").run(jobId,uid,now+3600,now,now+3600);
 e.DB.db.prepare("INSERT INTO dev_events(id,job_id,action,created_at) VALUES('ev1',?,'draft',?)").run(jobId,now);
 for(const part of ['task','patch','diff','preview'])await e.UPLOADS.put('developer/'+jobId+'/'+part,new Uint8Array([9]));
 const delStart=await req(e,'/api/personal/delete',{method:'POST',cookie,csrf:sess.csrf,body:{confirm:'DELETE_MY_DATA'}});
 assert.equal(delStart.status,202);const {receipt}=await delStart.json();
 let step=await req(e,'/api/deletion/continue',{method:'POST',body:{receipt}}),stepBody=await step.json();
 if(stepBody.status==='pending'){step=await req(e,'/api/deletion/continue',{method:'POST',body:{receipt}});stepBody=await step.json();}
 assert.equal(step.status,200);assert.equal(stepBody.status,'complete');
 assert.equal(e.UPLOADS.objects.size,0);
 assert.equal(e.DB.db.prepare('SELECT COUNT(*) n FROM dev_jobs').get().n,0);
 assert.equal(e.DB.db.prepare('SELECT COUNT(*) n FROM dev_events WHERE job_id IS NOT NULL').get().n,0);
 assert.equal(e.DB.db.prepare('SELECT active_job FROM dev_settings WHERE id=1').get().active_job,null);
});

test('urgent clinical hold invalidates completed job replays so pre-hold snapshots cannot return',async()=>{
 const e=makeEnv(),cookie=await loginOwner(e);
 const sess=await (await req(e,'/api/session',{cookie})).json();
 const prev=globalThis.fetch;
 globalThis.fetch=async(_url,init)=>{const data=JSON.parse(new TextDecoder().decode(init.body));return new Response(JSON.stringify({response:{recipes:[{recipe_id:'B01',name_ru:'Омлет'}],state:{revision:2,holds:[]},model_called:false},state:{core:{owner_account_id:data.subject,subject_id:data.subject,plans:{},profile:{consent:{storage:true,health_data:true}}},holds:[],revision:2,processing_consent:true}}),{status:200})};
 try{
  await req(e,'/api/consent',{method:'POST',cookie,csrf:sess.csrf,body:{storage:true,health:true,processing:true}});
  const first=await req(e,'/api/tools/keto_kitchen',{method:'POST',cookie,csrf:sess.csrf,body:{action:'generate',request_id:'replay_hold_check_01',spec:{mode:'inspiration'}}});
  assert.equal(first.status,200);
  const urgent=await req(e,'/api/tools/keto_chat',{method:'POST',cookie,csrf:sess.csrf,body:{message:'У меня сильная боль в груди и задыхаюсь',request_id:'urgent_hold_0001'}});
  assert.equal(urgent.status,200);assert.deepEqual((await urgent.json()).safety_hold,['urgent']);
  const replay=await req(e,'/api/tools/keto_kitchen',{method:'POST',cookie,csrf:sess.csrf,body:{action:'generate',request_id:'replay_hold_check_01',spec:{mode:'inspiration'}}});
  assert.equal(replay.status,409);
 }finally{globalThis.fetch=prev}
});

test('static bundle assets emit ETag and return 304 on If-None-Match while HTML stays no-store',async()=>{
 const htmlRes=await standaloneWorker.fetch(new Request(origin+'/'),{});
 assert.equal(htmlRes.status,200);assert.equal(htmlRes.headers.get('cache-control'),'no-store');
 const jsRes=await standaloneWorker.fetch(new Request(origin+'/app.bundle.js'),{});
 assert.equal(jsRes.status,200);assert.equal(jsRes.headers.get('cache-control'),'no-cache');
 const etag=jsRes.headers.get('etag');assert.ok(etag&&etag.startsWith('"'));
 const cached=await standaloneWorker.fetch(new Request(origin+'/app.bundle.js',{headers:{'If-None-Match':etag}}),{});
 assert.equal(cached.status,304);assert.equal((await cached.text()),'');
});

test('frontend setState prevents stale revision rollback and resetScroll wins over deferred scroll restore',()=>{
 class El{constructor(tag='div'){this.tag=tag;this.hidden=false;this.value='';this.scrollTop=0;this.dataset={};this.children=[];this.textContent='';this.open=false;this.classList={toggle(){},add(){},remove(){}};this.attributes={}}addEventListener(n,fn){(this.listeners??={})[n]=fn}prepend(...v){this.children.unshift(...v)}dispatchEvent(){}focus(){}querySelector(){return null}setAttribute(k,v){this.attributes[k]=v}replaceChildren(...v){this.children=v;this.textContent=''}append(...v){this.children.push(...v)}reset(){}showModal(){this.open=true}close(){this.open=false}scrollIntoView(){}querySelectorAll(){return []}}
 const nodes={},frames=[],document={body:new El(),getElementById:id=>(nodes[id]??=new El()),createElement:t=>new El(t),querySelectorAll:()=>[],querySelector:()=>null};
 let appSrc=readFileSync('cloudflare-saas/public/app.js','utf8');
 const stubs={createFoodPicker:'createFoodPicker',setupChatActions:'setupChatActions',setupIntake:'setupIntake',intakeReviewNodes:'intakeReviewNodes',createScrollMemory:'createScrollMemory',chatScrollPosition:'chatScrollPosition',createDialogController:'createDialogController',mainTab:'mainTab',MAIN_ROUTES:'MAIN_ROUTES',createRecipePageCalls:'createRecipePageCalls',renderTodayPlan:'renderTodayPlan',setupShop:'()=>({reset(){},afterApplied(){},leave(){}})',createRecipeLibrary:'()=>({load:async()=>true,next:async()=>{},invalidate(){}})',setupOwnDish:'()=>({reset(){},update(){},savedReceipt(){},afterApplied(){}})',sourceImportPreview:'sourceImportPreview',setupDeveloper:'()=>({reset(){},identity(){},load(){}})',mountDeveloperExtension:'()=>{}',setupMobile:'()=>({reset(){},render(){},resetPhoto(){},setChatBusy(){},resizeComposer(){},changingTopic(){return false},leave(){}})',setupGuidance:'()=>({reset(){},render(){},afterApplied(){},resolve(x){return x}})',createRouter:'({render})=>{let cur="";return {get current(){return cur},reset(){cur=""},go(r){if(cur===r)return;cur=r;render(r,{reason:"user",origin:"more",depth:0})},back(){},openDialog(){},dismissDialog(){}}}',setupKitchen:'setupKitchen',kitchenActionLabels:'kitchenActionLabels',firebaseLogin:'()=>{}'};
 for(const name of Object.keys(authSessionModule))stubs[name]='authSessionModule.'+name;
 appSrc=appSrc.replace(/^import \{([^}]+)\} from '[^']+';$/gm,(_,names)=>names.split(',').map(n=>stubs[n]===n?'':'const '+n+'='+stubs[n]+';').join('')).replace('run(start);','')+'\nrenderState=()=>{kitchen.render()};globalThis.api={setState,markSafetyHold,setView,renderView,intake,getState:()=>state};';
 const ctx={authSessionModule,createFoodPicker,setupChatActions,setupIntake,intakeReviewNodes,createScrollMemory,chatScrollPosition,createDialogController,mainTab,MAIN_ROUTES,createRecipePageCalls,renderTodayPlan,sourceImportPreview,setupKitchen,kitchenActionLabels,document,window:{},history:{},location:{href:origin+'/'},sessionStorage:{getItem:()=>null},requestAnimationFrame:fn=>frames.push(fn),URL,FormData,Blob,Response,crypto:webcrypto,Date,Intl,setTimeout,clearTimeout,console};
 vm.createContext(ctx);vm.runInContext(appSrc,ctx);
 const base={processing_consent:true,revision:10,holds:[],active_thread:'main',profile:{owner_account_id:'u1',consent:{storage:true,health_data:true},allergies:['mustard','celery','mollusc','lupin','sulfite','crustacean_shellfish','coconut'],settings:{favorites:[],disliked_food_ids:[]}},kitchen:{pantry:[],preferences:[],legacy_disliked:[],favorites_details:[],memory_limits:'ok'}};
 ctx.api.setState(base);
 const walk=n=>[n.textContent||'',...(n.children||[]).map(walk)].join(' ');
 const memText=walk(nodes['kitchen-memory']);
 for(const ru of ['горчица','сельдерей','моллюски','люпин','сульфиты','ракообразные','кокос'])assert(memText.includes(ru),ru);
 assert(!memText.includes('неизвестный аллерген'));
 ctx.api.setState({...base,revision:12,holds:['urgent']});
 ctx.api.setState({...base,revision:11,holds:[]});
 assert.equal(ctx.api.getState().revision,12);assert.deepEqual(ctx.api.getState().holds,['urgent']);
 ctx.api.setView('diary');while(frames.length)frames.shift()();
 nodes.content.scrollTop=650;ctx.api.setView('recipes');while(frames.length)frames.shift()();
 ctx.api.intake.afterApplied({receipt:{id:'p1',type:'kitchen.intake',revision:13},entry:{entry_id:'e1',date:'2026-11-10',name_ru:'Омлет',amount:{value:1,unit:'portion'}},diary_summary:{date:'2026-11-10',entries:1}});
 while(frames.length)frames.shift()();
 assert.equal(nodes.content.scrollTop,0);
});

test('legacy client renders pantry preview items without crashing and wires openIntake fallback',()=>{
 class El{constructor(tag='div'){this.tag=tag;this.hidden=false;this.value='';this.dataset={};this.children=[];this.textContent='';this.open=false;this.classList={toggle(){}};this.attributes={}}addEventListener(n,fn){(this.listeners??={})[n]=fn}setAttribute(k,v){this.attributes[k]=v}replaceChildren(...v){this.children=v;this.textContent=''}append(...v){this.children.push(...v)}focus(){this.focused=true}querySelectorAll(){return []}}
 const nodes={},document={body:new El(),getElementById:id=>(nodes[id]??=new El()),createElement:t=>new El(t),querySelectorAll:()=>[],querySelector:()=>null};
 let legacySrc=readFileSync('service/static/app.js','utf8').replace(/^import [^\n]+\n/gm,'').replace('run(start);','')+'\nglobalThis.legacy={renderProposals,kitchen,setSynthetic(s){state=s},getView:()=>view};';
 const ctx={App:class{},PublicClientApplication:class{},InteractionRequiredAuthError:class extends Error{},setupKitchen,kitchenActionLabels,document,window:{parent:null},history:{replaceState(){}},location:{href:origin+'/'},sessionStorage:{getItem:()=>null,removeItem(){}},URL,FormData,Blob,crypto:webcrypto,Date,Intl,setTimeout,clearTimeout,console};
 ctx.window=ctx;
 vm.createContext(ctx);vm.runInContext(legacySrc,ctx);
 ctx.legacy.setSynthetic({revision:3,pending:[{id:'p1',type:'kitchen.pantry',base_revision:3,payload:{items:[{food_id:'F1',state:'raw',grams:250}]},preview:{items:[{food_id:'F1',name_ru:'Авокадо',state:'raw',grams:250}]}}]});
 ctx.legacy.renderProposals();
 const walk=n=>[n.textContent||'',...(n.children||[]).map(walk)].join(' ');
 assert.match(walk(nodes.proposals),/Авокадо — 250 г/);
 const card=ctx.legacy.kitchen.card({recipe_id:'B01',name_ru:'Омлет с сыром',servings:1,active_minutes:10,steps_ru:'Приготовить',ingredients:[{food_id:'F1',name_ru:'Яйца',grams_edible:100,state:'raw'}],nutrition:{energy_kcal:220,protein_g:14,carbohydrate_total_g:2,fiber_g:0}});
 const intakeBtn=walk(card);
 assert.match(intakeBtn,/Записать съеденное/);
});
