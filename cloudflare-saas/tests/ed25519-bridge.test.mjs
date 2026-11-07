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
