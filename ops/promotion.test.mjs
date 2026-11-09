import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {readPinnedApplication} from './runtime-app-pin.mjs';
test('operator promotion is disabled without explicit native release flag',()=>{
 const env=Object.fromEntries(Object.entries(process.env).filter(([k])=>!k.startsWith('CLOUDFLARE_')&&!k.startsWith('KETO_')));
 const r=spawnSync(process.execPath,['ops/promote_existing_runtime.mjs'],{encoding:'utf8',env,timeout:5000});
 assert.notEqual(r.status,0);assert.match(r.stderr,/OWNER_REVIEWED_RELEASE_REQUIRED/);
});
test('runtime pin matches exact current snapshot and has one-instance bound',()=>{
 const pin=JSON.parse(readFileSync('ops/approved-runtime.json','utf8'));
 const snapshot=JSON.parse(readFileSync('developer-runtime/build/manifest.json','utf8'));
 assert.equal(pin.baseline,snapshot.baseline);assert.equal(pin.max_instances,1);assert.match(pin.image_digest,/^sha256:[a-f0-9]{64}$/);
});
test('operator helper never publishes app or replaces image before isolated acceptance',()=>{
 const source=readFileSync('ops/promote_existing_runtime.mjs','utf8');
 assert(source.includes('NEW_BASELINE_REQUIRES_REVIEWED_IMAGE_RELEASE'));
 assert(source.includes("spawnSync('node',['scripts/verify_developer_cloud_runtime.mjs']"));
 assert(source.includes('receipt.temporary_probe_deleted!==true'));
 assert(!source.includes('deploy_cloudflare_staging.mjs'));
 assert(!/method:\s*['"](?:POST|PUT|PATCH|DELETE)['"]/.test(source));
});

test('exact pinned application detail wins over stale collection and retains all guards',async()=>{
 const pin={account:'account',worker:'runner',application_id:'a0328d47-d862-4cc2-be96-42e925e4e3ab',image_digest:'sha256:'+'c'.repeat(64)};
 const image='registry.cloudflare.com/account/keto-developer-runner@'+pin.image_digest;
 const correct={id:pin.application_id,name:pin.worker,max_instances:1,scheduling_policy:'default',configuration:{image,environment_variables:[],authorized_keys:[]}};
 const stale={...correct,configuration:{...correct.configuration,image:'registry.cloudflare.com/account/keto-developer-runner@sha256:'+'1'.repeat(64)}};let paths=[];
 const get=async path=>{paths.push(path);if(path.startsWith('/containers/applications?'))return [stale];if(path==='/containers/applications/'+pin.application_id)return correct;throw Error('unexpected path')};
 assert.equal((await readPinnedApplication(get,pin)).image,image);assert.deepEqual(paths,['/containers/applications/'+pin.application_id]);
 await assert.rejects(()=>readPinnedApplication(get,{...pin,application_id:'invalid/../../other'}),/LIVE_CONTAINER_PIN_MISMATCH/);
 for(const bad of [null,{...correct,id:'other'},{...correct,name:'other'},{...correct,max_instances:2},{...correct,scheduling_policy:undefined},{...correct,scheduling_policy:'regional'},{...correct,configuration:{...correct.configuration,image:stale.configuration.image}},{...correct,configuration:{...correct.configuration,environment_variables:[{name:'secret'}]}},{...correct,configuration:{...correct.configuration,authorized_keys:['key']}}])await assert.rejects(()=>readPinnedApplication(async()=>bad,pin),/LIVE_CONTAINER_PIN_MISMATCH/);
});
