import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {bridgeCall} from '../src/compute.mjs';
test('Web Crypto Ed25519 signature is accepted by actual Python verifier',async()=>{
 const pair=await crypto.subtle.generateKey({name:'Ed25519'},true,['sign','verify']);const priv=await crypto.subtle.exportKey('jwk',pair.privateKey),pub=await crypto.subtle.exportKey('jwk',pair.publicKey);const original=globalThis.fetch;
 globalThis.fetch=async(url,init)=>{assert.equal(String(url),'https://bridge.example.test/internal/keto/compute');const h=init.headers;assert.equal(h['x-keto-signature'].length,128);
 const code=`import sys,json,tempfile
from pathlib import Path
sys.path.insert(0,'tests')
from service.edge_bridge import EdgeBridge,PATH
from service.store import SQLiteStore
from service.app import TOOL_MAP,image_clean
from test_service import FakeBrain
d=json.load(sys.stdin)
with tempfile.TemporaryDirectory() as folder:
 b=EdgeBridge(None,SQLiteStore(Path(folder)/'n.db'),FakeBrain(),TOOL_MAP,image_clean,public_jwk=d['public'])
 print(json.dumps(b.execute('POST',PATH,d['stamp'],d['nonce'],d['signature'],d['body'].encode())))`;
 const input={public:pub,stamp:h['x-keto-timestamp'],nonce:h['x-keto-nonce'],signature:h['x-keto-signature'],body:new TextDecoder().decode(init.body)};const r=spawnSync('.venv/bin/python',['-c',code],{input:JSON.stringify(input),encoding:'utf8'});assert.equal(r.status,0,r.stderr);return new Response(r.stdout,{headers:{'content-type':'application/json'}})};
 try{const result=await bridgeCall({KETO_EDGE_SIGNING_JWK:JSON.stringify(priv),KETO_EDGE_BRIDGE_URL:'https://bridge.example.test/internal/keto/compute'},'synthetic-cross-language','open',null,{});assert.equal(result.response.state.profile.subject_id,'synthetic-cross-language')}finally{globalThis.fetch=original}
});

test('bridge recognizes only closed intake codes in scoped bounded 422 responses',async()=>{
 const env={KETO_EDGE_BRIDGE_SECRET:'synthetic-intake-error-secret-1234567890',KETO_EDGE_BRIDGE_URL:'https://bridge.example.test/internal/keto/compute'},original=globalThis.fetch;
 const state={core:{owner_account_id:'synthetic',subject_id:'synthetic'},pending:{p:{type:'kitchen.intake'}}};
 const cases=[
  ['kitchen',{action:'intake'},state,422,{error:'BRIDGE_REJECTED',validation_code:'INTAKE_TIME_AMBIGUOUS',message:'PRIVATE_UPSTREAM_TEXT'},'INTAKE_TIME_AMBIGUOUS'],
  ['kitchen',{action:'intake_preview'},state,422,{error:'BRIDGE_REJECTED',validation_code:'INTAKE_TIME_NONEXISTENT'},'INTAKE_TIME_NONEXISTENT'],
  ['kitchen',{action:'diary_history'},state,422,{error:'BRIDGE_REJECTED',validation_code:'INTAKE_STALE'},'INTAKE_STALE'],
  ['apply',{proposal_id:'p'},state,422,{error:'BRIDGE_REJECTED',validation_code:'INTAKE_STALE'},'INTAKE_STALE'],
  ['apply',{proposal_id:'p'},{...state,core:{owner_account_id:'other',subject_id:'other'}},422,{error:'BRIDGE_REJECTED',validation_code:'INTAKE_STALE'},undefined],
  ['chat',{},state,422,{error:'BRIDGE_REJECTED',validation_code:'INTAKE_TIME_AMBIGUOUS'},undefined],
  ['kitchen',{action:'generate'},state,422,{error:'BRIDGE_REJECTED',validation_code:'INTAKE_TIME_AMBIGUOUS'},undefined],
  ['kitchen',{action:'intake'},state,422,{error:'BRIDGE_REJECTED',validation_code:'PRIVATE_CODE',message:'PRIVATE_UPSTREAM_TEXT'},undefined],
  ['kitchen',{action:'intake'},state,401,{error:'BRIDGE_REJECTED',validation_code:'INTAKE_TIME_AMBIGUOUS'},undefined],
  ['kitchen',{action:'intake'},state,422,{error:'BRIDGE_REJECTED',validation_code:'INTAKE_TIME_AMBIGUOUS',message:'X'.repeat(4096)},undefined],
 ];
 try{for(const [operation,args,doc,status,body,expected]of cases){globalThis.fetch=async()=>new Response(JSON.stringify(body),{status});await assert.rejects(()=>bridgeCall(env,'synthetic',operation,doc,args),error=>{assert.equal(error.intakeValidationCode,expected);assert.equal(error.message,status===422?'BRIDGE_REJECTED':'BRIDGE_UNAVAILABLE');assert.ok(!String(error).includes('PRIVATE'));return true})}
  globalThis.fetch=async()=>new Response('private malformed body',{status:422});await assert.rejects(()=>bridgeCall(env,'synthetic','kitchen',state,{action:'intake'}),error=>error.message==='BRIDGE_REJECTED'&&error.intakeValidationCode===undefined);
 }finally{globalThis.fetch=original}
});
