import test from 'node:test';
import assert from 'node:assert/strict';
import {AuthError,authJson,authMessage,authDiagnostic,bounded,transientStorage,createAuthSession} from '../public/auth-session.js';
const active={user:{role:'admin',status:'active',email:'synthetic@example.test'},csrf:'synthetic-csrf'};
const missing=()=>new AuthError('SIGN_IN',{status:401});
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b});return {promise,resolve,reject}};
function harness(overrides={}){
 const h={user:active,opened:[],identities:[],views:[],requests:[],google:0,load:async()=>({state:{synthetic:true}}),...overrides};
 h.controller=createAuthSession({
  api:async(path,options)=>{h.requests.push(path);if(h.api)return h.api(path,options);if(path==='/auth/config')return {provider:'firebase_google',firebase:{}};if(path==='/api/logout'){h.user=null;return {ok:true}};if(path==='/api/invites/claim'){h.user=active;return {ok:true}};if(!h.user)throw missing();return h.user},
  authenticate:(...args)=>{h.google++;return h.authenticate?.(...args)},loadWorkspace:(...args)=>h.load(...args),openWorkspace:data=>{h.opened.push(data);h.open?.(data)},identityChanged:value=>h.identities.push(value),view:value=>h.views.push(value),timeoutMs:100,workspaceTimeoutMs:100
 });return h;
}
test('verified admin survives bootstrap 503 and recovers without a new Google login',async()=>{
 const h=harness({load:async()=>{throw new AuthError('COMPUTE_UNAVAILABLE',{status:503})}});await h.controller.start();
 assert.equal(h.controller.phase,'workspace-error');assert.equal(h.controller.identity.user.role,'admin');assert.equal(h.identities.at(-1),active);assert.equal(h.opened.length,0);
 h.load=async()=>({state:{synthetic:true}});await h.controller.retry();assert.equal(h.controller.phase,'ready');assert.equal(h.google,0);assert.equal(h.opened.length,1);assert.equal(h.requests.filter(x=>x==='/api/session').length,2);
});
test('workspace bootstrap accepts a 40-second bridge response without discarding verified sign-in',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});const gate=deferred(),opened=[];
 const auth=createAuthSession({api:async path=>path==='/auth/config'?{provider:'direct_google'}:active,authenticate:()=>{throw Error('unexpected Google login')},loadWorkspace:()=>gate.promise,openWorkspace:data=>opened.push(data),identityChanged(){},view(){}});
 const opening=auth.start();await new Promise(setImmediate);assert.equal(auth.phase,'loading');
 t.mock.timers.tick(40000);await new Promise(setImmediate);assert.equal(auth.phase,'loading');
 gate.resolve({state:{synthetic:true}});await opening;assert.equal(auth.phase,'ready');assert.equal(auth.identity,active);assert.equal(opened.length,1);
});
test('missing session and temporarily unavailable session are different states',async()=>{
 const h=harness({user:null});await h.controller.start();assert.equal(h.controller.phase,'signed-out');assert.equal(h.controller.identity,null);
 h.api=async path=>{if(path==='/auth/config')return {provider:'direct_google'};throw new AuthError('SERVER_UNAVAILABLE',{status:503})};await h.controller.start();assert.equal(h.controller.phase,'session-error');assert.equal(h.google,0);assert.equal(h.opened.length,0);
});
test('public config outage does not block an existing server session',async()=>{
 const h=harness({api:async path=>{if(path==='/auth/config')throw new AuthError('NETWORK_ERROR');return active}});await h.controller.start();assert.equal(h.controller.phase,'ready');assert.equal(h.opened.length,1);
});
test('pending membership cannot load workspace; explicit claim is followed by server verification',async()=>{
 const h=harness({user:{...active,user:{...active.user,role:'member',status:'pending'}}});await h.controller.start();assert.equal(h.controller.phase,'pending');assert.equal(h.opened.length,0);assert.equal(h.controller.identity.user.role,'member');await h.controller.claim('synthetic-invite');assert.equal(h.controller.phase,'ready');assert(h.requests.includes('/api/invites/claim'));
});
test('server member role and reload do not depend on Firebase persistence',async()=>{
 const h=harness({user:{...active,user:{...active.user,role:'member'}}});await h.controller.start();await h.controller.start();assert.equal(h.controller.identity.user.role,'member');assert.equal(h.controller.phase,'ready');assert.equal(h.google,0);
});
test('double click shares one attempt and starts authentication synchronously',async()=>{
 const gate=deferred(),h=harness({user:null,authenticate:()=>gate.promise});await h.controller.start();const first=h.controller.login('synthetic-invite');assert.equal(h.google,1);assert.equal(h.controller.phase,'signing-in');assert.equal(h.controller.login(),first);h.user=active;gate.resolve();await first;assert.equal(h.google,1);assert.equal(h.controller.phase,'ready');
});
test('provider cancellation returns an actionable sign-in state without an automatic retry',async()=>{
 const h=harness({user:null,authenticate:async()=>{throw new AuthError('auth/popup-closed-by-user')}});await h.controller.start();await h.controller.login();assert.equal(h.controller.phase,'signed-out');assert.equal(h.google,1);assert.match(authMessage(h.views.at(-1).error),/отменён/);
});
test('lost complete response checks the server cookie instead of replaying the consumed challenge',async()=>{
 const h=harness({user:null});h.authenticate=async()=>{h.user=active;throw new AuthError('NETWORK_ERROR',{ambiguous:true})};await h.controller.start();await h.controller.login();assert.equal(h.controller.phase,'ready');assert.equal(h.google,1);assert.equal(h.requests.filter(x=>x==='/api/session').length,2);
});
test('successful provider with missing application cookie explains recovery and does not loop',async()=>{
 const h=harness({user:null,authenticate:async()=>{}});await h.controller.start();await h.controller.login();assert.equal(h.controller.phase,'signed-out');assert.equal(h.views.at(-1).error.code,'SESSION_NOT_SAVED');assert.equal(h.google,1);assert.equal(h.opened.length,0);
});
test('an old delayed session error cannot clear a newer verified session',async()=>{
 const gate=deferred();let reads=0;const h=harness({api:async path=>path==='/auth/config'?{provider:'direct_google'}:++reads===1?gate.promise:active});const old=h.controller.start();const newer=h.controller.start();await newer;gate.reject(missing());await old;assert.equal(h.controller.phase,'ready');assert.equal(h.controller.identity,active);assert.equal(h.identities.includes(null),false);
});
test('late workspace response cannot reopen private UI after successful logout',async()=>{
 const gate=deferred(),entered=deferred(),h=harness({load:()=>{entered.resolve();return gate.promise}});const opening=h.controller.start();await entered.promise;await h.controller.logout();gate.resolve({state:{private:'synthetic'}});await opening;assert.equal(h.controller.phase,'signed-out');assert.equal(h.controller.identity,null);assert.equal(h.opened.length,0);assert.equal(h.identities.at(-1),null);
});
test('confirmed session expiry during bootstrap requires login; rendering failure preserves identity',async()=>{
 const h=harness({load:async()=>{throw missing()}});await h.controller.start();assert.equal(h.controller.phase,'signed-out');assert.equal(h.controller.identity,null);
 const render=harness({open:()=>{throw Error('synthetic rendering failure')}});await render.controller.start();assert.equal(render.controller.phase,'workspace-error');assert.equal(render.controller.identity,active);
});
test('logout failure is explicit and retry does not claim that the server session was removed',async()=>{
 const h=harness();await h.controller.start();h.api=async path=>{if(path==='/api/logout')throw new AuthError('NETWORK_ERROR');return active};await h.controller.logout();assert.equal(h.controller.phase,'logout-error');assert.equal(h.controller.identity,active);assert.equal(h.identities.includes(null),false);h.api=null;await h.controller.logout();assert.equal(h.controller.phase,'signed-out');
});
test('bounded requests reject a non-cooperating transport and abort it',async()=>{
 let signal;await assert.rejects(bounded(value=>{signal=value;return new Promise(()=>{})},{timeoutMs:1}),error=>error.code==='NETWORK_TIMEOUT');assert.equal(signal.aborted,true);
});
test('auth transport includes same-origin cookies and preserves only safe machine errors',async()=>{
 let sent;await assert.rejects(authJson(async(path,init)=>{sent=init;return new Response(JSON.stringify({error:'SESSION_LIMIT',detail:'NEVER_EXPOSE_PROVIDER_TOKEN'}),{status:503})},'/auth/firebase/complete',{method:'POST',body:{token:'synthetic'},csrf:'synthetic'}),error=>error.code==='SESSION_LIMIT'&&error.status===503&&!error.message.includes('NEVER_EXPOSE'));
 assert.equal(sent.credentials,'same-origin');assert.equal(sent.headers['X-CSRF-Token'],'synthetic');assert.equal(sent.cache,'no-store');
 await assert.rejects(authJson(async()=>new Response('not json',{status:502}),'/api/session'),error=>error.code==='INVALID_RESPONSE'&&error.status===502);
 assert.equal(authDiagnostic('session-error',{code:'secret@example.test/token',status:502,message:'PRIVATE'}),'session-error · REQUEST_FAILED · 502');
});
test('unavailable browser storage retains invitation in memory and never blocks boot',()=>{
 const store=transientStorage(()=>{throw Error('SecurityError')});store.setItem('keto_invite','synthetic-invite');assert.equal(store.getItem('keto_invite'),'synthetic-invite');store.removeItem('keto_invite');assert.equal(store.getItem('keto_invite'),null);
});
test('failed storage writes and removal cannot resurrect a previous invitation',()=>{
 const store=transientStorage(()=>({getItem:()=> 'old-invite',setItem(){throw Error('QuotaExceeded')},removeItem(){throw Error('SecurityError')}}));store.setItem('keto_invite','new-invite');assert.equal(store.getItem('keto_invite'),'new-invite');store.removeItem('keto_invite');assert.equal(store.getItem('keto_invite'),null);
});
test('confirmed deletion invalidates the controller and allows a new deliberate sign-in',async()=>{
 const h=harness();await h.controller.start();h.user=null;h.controller.signedOut();assert.equal(h.controller.phase,'signed-out');assert.equal(h.controller.identity,null);h.authenticate=async()=>{h.user=active};await h.controller.login();assert.equal(h.controller.phase,'ready');assert.equal(h.google,1);
});
test('a lost invitation claim response verifies active membership without claiming twice',async()=>{
 const h=harness({user:{...active,user:{...active.user,role:'member',status:'pending'}}});let claims=0;h.api=async path=>{if(path==='/auth/config')return {provider:'firebase_google'};if(path==='/api/invites/claim'){claims++;h.user={...active,user:{...active.user,role:'member'}};throw new AuthError('NETWORK_ERROR')}return h.user};await h.controller.start();await h.controller.claim('synthetic-invite');assert.equal(h.controller.phase,'ready');assert.equal(h.controller.identity.user.role,'member');assert.equal(claims,1);
});
