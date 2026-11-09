import test from 'node:test';import assert from 'node:assert/strict';import {createRecipePageCalls} from '../public/recipe-page-calls.js';
const tick=()=>new Promise(resolve=>setImmediate(resolve));
test('delayed automatic read and immediate user action run sequentially; stale session never executes',async()=>{
 let finish,session=1;const events=[];const caller=createRecipePageCalls({epoch:()=>session,call:async(name)=>{events.push('start '+name);if(name==='recipes')await new Promise(r=>finish=r);events.push('end '+name);return name}});
 const automatic=caller.invoke('recipes');await tick();const user=caller.invoke('parse');await tick();assert.deepEqual(events,['start recipes']);finish();await automatic;await user;assert.deepEqual(events,['start recipes','end recipes','start parse','end parse']);
 const blocker=caller.invoke('recipes');await tick();const stale=caller.invoke('generate');session=2;finish();await blocker;await assert.rejects(stale,/Сеанс изменился/);assert(!events.includes('start generate'));
});
test('aborted queued request never reaches protected service',async()=>{let finish;const calls=[];const caller=createRecipePageCalls({epoch:()=>1,call:async(name)=>{calls.push(name);if(name==='first')await new Promise(r=>finish=r)}});const first=caller.invoke('first');await tick();const controller=new AbortController(),next=caller.invoke('second',{}, {signal:controller.signal});controller.abort();finish();await first;await assert.rejects(next,{name:'AbortError'});assert.deepEqual(calls,['first'])});
