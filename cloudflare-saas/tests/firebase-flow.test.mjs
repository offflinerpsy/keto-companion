import test from 'node:test';import assert from 'node:assert/strict';import {firebaseFlow} from '../public/firebase-flow.js';
import {AuthError} from '../public/auth-session.js';
function mock(popup){const calls=[];class GoogleAuthProvider{setCustomParameters(x){calls.push(['prompt',x.prompt])}}const sdk={getApps:()=>[],initializeApp:()=>({}),getAuthInstance:()=>({}),GoogleAuthProvider,signInWithPopup:()=>{calls.push(['popup']);return popup()},signOut:async()=>calls.push(['signout'])};return {sdk,calls}}
test('Firebase popup starts synchronously on click, exchanges only in body, then signs out',async()=>{const {sdk,calls}=mock(async()=>({user:{getIdToken:async()=>'synthetic-id-token'}}));const request=async(path,body)=>{calls.push([path,body]);return path.endsWith('start')?{transaction:'synthetic'}:{ok:true}};const task=firebaseFlow(sdk,{},'synthetic-invite',request);assert.equal(calls[2][0],'popup');await task;assert.equal(calls[3][0],'/auth/firebase/complete');assert.equal(calls[3][1].token,'synthetic-id-token');assert.equal(calls.at(-1)[0],'signout')});
for(const [code,message] of [['auth/popup-closed-by-user',/отменён/],['auth/popup-blocked',/заблокировал/]])test('Firebase popup '+code+' is clear and cleaned',async()=>{const {sdk,calls}=mock(async()=>{throw {code}});await assert.rejects(firebaseFlow(sdk,{},'',async()=>({transaction:'x'})),message);assert.equal(calls.at(-1)[0],'signout');assert(!calls.some(x=>x[0]==='/auth/firebase/complete'))});
test('closed popup settles even when the challenge transport never responds',async()=>{
 let signal;const {sdk}=mock(async()=>{throw {code:'auth/popup-closed-by-user'}});
 await assert.rejects(firebaseFlow(sdk,{},'',(_path,_body,options)=>{signal=options.signal;return new Promise(()=>{})}),error=>error.code==='auth/popup-closed-by-user');assert.equal(signal.aborted,true);
});
test('a late popup after failed challenge never exchanges a token or signs out a newer attempt',async()=>{
 let resolvePopup,current=true,exchanges=0;const {sdk,calls}=mock(()=>new Promise(resolve=>resolvePopup=resolve));
 await assert.rejects(firebaseFlow(sdk,{},'',async path=>{if(path.endsWith('complete'))exchanges++;throw new AuthError('LOGIN_BUSY',{status:429})},{isCurrent:()=>current}),error=>error.code==='LOGIN_BUSY');
 const cleanups=calls.filter(x=>x[0]==='signout').length;current=false;resolvePopup({user:{getIdToken:async()=>'synthetic'}});await Promise.resolve();await Promise.resolve();assert.equal(exchanges,0);assert.equal(calls.filter(x=>x[0]==='signout').length,cleanups);
});
test('challenge timeout is bounded and no complete is sent',async()=>{
 let exchanges=0;const {sdk}=mock(async()=>({user:{getIdToken:async()=>'synthetic'}}));await assert.rejects(firebaseFlow(sdk,{},'',async path=>{if(path.endsWith('complete'))exchanges++;return new Promise(()=>{})},{requestTimeoutMs:1}),error=>error.code==='NETWORK_TIMEOUT'&&!error.ambiguous);assert.equal(exchanges,0);
});
test('uncertain complete response is marked for server-session verification',async()=>{
 let completes=0;const {sdk}=mock(async()=>({user:{getIdToken:async()=>'synthetic'}}));await assert.rejects(firebaseFlow(sdk,{},'',async path=>{if(path.endsWith('start'))return {transaction:'synthetic'};completes++;throw new AuthError('NETWORK_ERROR')}),error=>error.ambiguous&&error.code==='NETWORK_ERROR');assert.equal(completes,1);
});
test('abort during token retrieval prevents a late server exchange',async()=>{
 const abort=new AbortController();let resolveToken,entered,exchanges=0;const arrived=new Promise(resolve=>entered=resolve),{sdk}=mock(async()=>({user:{getIdToken:()=>{entered();return new Promise(resolve=>resolveToken=resolve)}}}));
 const flow=firebaseFlow(sdk,{},'',async path=>{if(path.endsWith('complete'))exchanges++;return {transaction:'synthetic'}},{signal:abort.signal});await arrived;abort.abort();await assert.rejects(flow,error=>error.code==='CANCELLED');resolveToken('synthetic');await Promise.resolve();await Promise.resolve();assert.equal(exchanges,0);
});
