import test from 'node:test';import assert from 'node:assert/strict';import {createRecipePageCalls} from '../public/recipe-page-calls.js';
import {createAuthSession} from '../public/auth-session.js';
const tick=()=>new Promise(resolve=>setImmediate(resolve));
test('delayed automatic read and immediate user action run sequentially; stale session never executes',async()=>{
 let finish,session=1;const events=[];const caller=createRecipePageCalls({epoch:()=>session,call:async(name)=>{events.push('start '+name);if(name==='recipes')await new Promise(r=>finish=r);events.push('end '+name);return name}});
 const automatic=caller.invoke('recipes');await tick();const user=caller.invoke('parse');await tick();assert.deepEqual(events,['start recipes']);finish();await automatic;await user;assert.deepEqual(events,['start recipes','end recipes','start parse','end parse']);
 const blocker=caller.invoke('recipes');await tick();const stale=caller.invoke('generate');session=2;finish();await blocker;await assert.rejects(stale,/Сеанс изменился/);assert(!events.includes('start generate'));
});
test('aborted queued request never reaches protected service',async()=>{let finish;const calls=[];const caller=createRecipePageCalls({epoch:()=>1,call:async(name)=>{calls.push(name);if(name==='first')await new Promise(r=>finish=r)}});const first=caller.invoke('first');await tick();const controller=new AbortController(),next=caller.invoke('second',{}, {signal:controller.signal});controller.abort();finish();await first;await assert.rejects(next,{name:'AbortError'});assert.deepEqual(calls,['first'])});

test('new account starts without awaiting a hung transport from the old account',async()=>{
 let finish,session=1;const events=[];const queue=createRecipePageCalls({epoch:()=>session,call:async name=>{events.push(name);if(name==='old')await new Promise(resolve=>finish=resolve);return name}});
 const old=queue.invoke('old');await tick();session=2;assert.equal(await queue.invoke('new-open'),'new-open');assert.deepEqual(events,['old','new-open']);finish();await old;
});

test('a lost generation response releases the queue and bootstrap retry without replaying generation',async()=>{
 const requests=[];let generationSignal,finishGeneration;
 const queue=createRecipePageCalls({epoch:()=>1,timeoutMs:20,call:async(name,args,options)=>{
  requests.push({name,args});if(name==='keto_kitchen'){generationSignal=options.signal;return new Promise(resolve=>finishGeneration=resolve)}
  return {state:{revision:7}};
 }});
 const generation=queue.invoke('keto_kitchen',{action:'generate',request_id:'synthetic-uncertain-one'});
 const rejection=assert.rejects(generation,error=>error.code==='NETWORK_TIMEOUT'&&/не повторён/.test(error.message));
 const opened=[],identity={user:{role:'admin',status:'active'},csrf:'synthetic'};
 const auth=createAuthSession({api:async path=>path==='/auth/config'?{provider:'direct_google'}:identity,authenticate:()=>{throw Error('must not sign in again')},loadWorkspace:signal=>queue.invoke('keto_open',{}, {signal}),openWorkspace:data=>opened.push(data),identityChanged(){},view(){},workspaceTimeoutMs:5});
 await auth.start();assert.equal(auth.phase,'workspace-error');assert.equal(auth.identity,identity);
 await rejection;assert.equal(generationSignal.aborted,true);
 await auth.retry();assert.equal(auth.phase,'ready');assert.equal(opened.length,1);
 assert.deepEqual(requests.map(x=>x.name),['keto_kitchen','keto_open']);
 assert.equal(requests[0].args.request_id,'synthetic-uncertain-one');
 finishGeneration({state:{revision:6}});await tick();assert.equal(opened[0].state.revision,7);
});
