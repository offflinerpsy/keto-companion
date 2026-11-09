import {test} from 'node:test';import assert from 'node:assert/strict';
import {validGTIN,candidate,lookup} from '../src/shop-lookup.mjs';
test('GTIN checksum and provider candidates preserve unknown carbohydrate basis',()=>{
 assert.equal(validGTIN('3017620422003'),true);assert.equal(validGTIN('3017620422004'),false);assert.equal(validGTIN('123'),false);
 const c=candidate({product_name:'Example',nutriments:{carbohydrates_100g:10,fiber_100g:2,'energy-kcal_100g':30}},'3017620422003');
 assert.equal(c.carbohydrate_basis,'unknown');assert.equal(c.basis,'unknown');assert.equal(c.nutrients.length,3);assert.equal(c.provenance.license,'ODbL');assert.equal(c.allergen_statement_text,null);
});
test('cache avoids upstream and malformed codes are rejected',async()=>{
 let calls=0;const h={fail:(status,code)=>{throw Error(code)},dbfirst:async()=>({payload:'{"review_candidate":null}'})};
 assert.deepEqual(await lookup('3017620422003',{},h,()=>{calls++}),{review_candidate:null});assert.equal(calls,0);
 await assert.rejects(()=>lookup('3017620422004',{},h),/INVALID_BARCODE/);
});
test('bounded OFF request caches attributed candidate and honors 429 backoff',async()=>{
 const {DatabaseSync}=await import('node:sqlite');const {readFileSync}=await import('node:fs');const db=new DatabaseSync(':memory:');db.exec(readFileSync(new URL('../migrations/0008_shop_lookup.sql',import.meta.url),'utf8'));
 const h={fail:(s,c)=>{throw Error(c)},dbfirst:async(_e,sql,...a)=>db.prepare(sql).get(...a)||null,dbrun:async(_e,sql,...a)=>({meta:{changes:Number(db.prepare(sql).run(...a).changes)}}),readBounded:async(r,max)=>{const b=new Uint8Array(await r.arrayBuffer());if(b.length>max)throw Error('limit');return b}};
 let calls=0;const fetcher=async(url,opts)=>{calls++;assert.match(url,/^https:\/\/world\.openfoodfacts\.org\/api\/v2\/product\/3017620422003\?/);assert.equal(opts.redirect,'error');return new Response(JSON.stringify({status:1,code:'3017620422003',product:{product_name:'Example',nutriments:{carbohydrates_100g:12}}}))};
 const first=await lookup('3017620422003',{},h,fetcher);assert.equal(first.review_candidate.provenance.license,'ODbL');assert.deepEqual(await lookup('3017620422003',{},h,fetcher),first);assert.equal(calls,1);
 db.prepare('DELETE FROM shop_public_cache').run();await assert.rejects(()=>lookup('3017620422003',{},h,async()=>new Response('',{status:429})),/PROVIDER_BACKOFF/);await assert.rejects(()=>lookup('3017620422003',{},h,fetcher),/PROVIDER_BACKOFF/);assert.equal(calls,1);
});
test('shared provider throttle and oversized responses fail closed',async()=>{
 const {DatabaseSync}=await import('node:sqlite');const {readFileSync}=await import('node:fs');const db=new DatabaseSync(':memory:');db.exec(readFileSync(new URL('../migrations/0008_shop_lookup.sql',import.meta.url),'utf8'));const h={fail:(_s,c)=>{throw Error(c)},dbfirst:async(_e,sql,...a)=>db.prepare(sql).get(...a)||null,dbrun:async(_e,sql,...a)=>({meta:{changes:Number(db.prepare(sql).run(...a).changes)}}),readBounded:async(r,max)=>{const b=new Uint8Array(await r.arrayBuffer());if(b.length>max)throw Error('limit');return b}};const t=Math.floor(Date.now()/1000);for(let i=0;i<15;i++)db.prepare('INSERT INTO shop_provider_requests(requested_at) VALUES(?)').run(t);let calls=0;await assert.rejects(()=>lookup('3017620422003',{},h,()=>{calls++}),/PROVIDER_THROTTLED/);assert.equal(calls,0);db.prepare('DELETE FROM shop_provider_requests').run();await assert.rejects(()=>lookup('3017620422003',{},h,async()=>new Response('x'.repeat(262145))),/PROVIDER_RESPONSE_TOO_LARGE/);
});
test('validated 404 not found is negatively cached; contradictory 404 fails',async()=>{
 const {DatabaseSync}=await import('node:sqlite');const {readFileSync}=await import('node:fs');const db=new DatabaseSync(':memory:');db.exec(readFileSync(new URL('../migrations/0008_shop_lookup.sql',import.meta.url),'utf8'));const h={fail:(_s,c)=>{throw Error(c)},dbfirst:async(_e,sql,...a)=>db.prepare(sql).get(...a)||null,dbrun:async(_e,sql,...a)=>({meta:{changes:Number(db.prepare(sql).run(...a).changes)}}),readBounded:async(r)=>new Uint8Array(await r.arrayBuffer())};let calls=0;const fetcher=async()=>{calls++;return new Response(JSON.stringify({status:0,code:'3017620422003'}),{status:404})};assert.deepEqual(await lookup('3017620422003',{},h,fetcher),{review_candidate:null});assert.deepEqual(await lookup('3017620422003',{},h,fetcher),{review_candidate:null});assert.equal(calls,1);db.prepare('DELETE FROM shop_public_cache').run();await assert.rejects(()=>lookup('3017620422003',{},h,async()=>new Response(JSON.stringify({status:1,product:{code:'3017620422003'}}),{status:404})),/PROVIDER_INVALID_RESPONSE/);
});
