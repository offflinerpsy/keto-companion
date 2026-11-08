import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
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
