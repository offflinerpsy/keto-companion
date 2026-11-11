// The only upstream is Open Food Facts; responses are untrusted review candidates.
const now=()=>Math.floor(Date.now()/1000);
export function validGTIN(s){
 if(typeof s!=='string'||!/^\d+$/.test(s)||![8,12,13,14].includes(s.length))return false;
 let sum=0;for(let i=s.length-2,j=0;i>=0;i--,j++)sum+=Number(s[i])*(j%2?1:3);
 return (10-sum%10)%10===Number(s.at(-1));
}
const short=(v,n)=>typeof v==='string'?v.slice(0,n):null;
const preferred=(localized,fallback,n)=>short(typeof localized==='string'&&localized.trim()?localized:fallback,n);
export function candidate(product,barcode){
 const n=product?.nutriments||{};const rows=[];
 for(const [key,label,unit] of [['energy-kcal_100g','Energy','kcal'],['proteins_100g','Protein','g'],['fat_100g','Fat','g'],['carbohydrates_100g','Carbohydrates','g'],['fiber_100g','Fiber','g']]){
  const value=n[key];if(typeof value==='number'&&Number.isFinite(value)&&value>=0&&value<=1000000)rows.push({name:label,value,unit,column:'100 g/ml (provider; verify label)'})
 }
 return {readability:'partial',name:preferred(product?.product_name_ru,product?.product_name,200),brand:short(product?.brands,120),barcode,basis:'unknown',serving_mass:null,serving_unit:null,nutrients:rows,carbohydrate_basis:'unknown',carbohydrate_caption:null,ingredients_text:preferred(product?.ingredients_text_ru,product?.ingredients_text,3000),allergen_statement_text:null,unresolved_fields:['Проверьте состав и аллергены на упаковке','Основа углеводов не установлена'],reshoot_hint:null,provenance:{provider:'Open Food Facts',license:'ODbL',url:'https://world.openfoodfacts.org/product/'+barcode}};
}
export async function lookup(barcode,env,h,fetcher=fetch){
 if(!validGTIN(barcode))h.fail(400,'INVALID_BARCODE');const t=now();
 let cached=await h.dbfirst(env,'SELECT payload FROM shop_public_cache WHERE barcode=? AND expires_at>?',barcode,t);if(cached)return JSON.parse(cached.payload);
 const paused=await h.dbfirst(env,'SELECT until_at FROM shop_provider_backoff WHERE provider=? AND until_at>?','off',t);if(paused)h.fail(503,'PROVIDER_BACKOFF');
 await h.dbrun(env,'DELETE FROM shop_provider_requests WHERE requested_at<=?',t-60);
 await h.dbrun(env,'DELETE FROM shop_public_cache WHERE barcode IN (SELECT barcode FROM shop_public_cache WHERE expires_at<=? LIMIT 32)',t);
 const reservation=await h.dbrun(env,'INSERT INTO shop_provider_requests(requested_at) SELECT ? WHERE (SELECT COUNT(*) FROM shop_provider_requests WHERE requested_at>?)<15',t,t-60);
 if(reservation.meta.changes!==1)h.fail(429,'PROVIDER_THROTTLED');
 let r;try{r=await fetcher('https://world.openfoodfacts.org/api/v2/product/'+barcode+'?fields=code,product_name,product_name_ru,brands,ingredients_text,ingredients_text_ru,nutriments',{headers:{'User-Agent':'KetoCompanion/0.7 (https://github.com/offflinerpsy/keto-companion)','Accept':'application/json'},redirect:'manual',signal:AbortSignal.timeout(8000)})}catch(error){h.fail(503,['AbortError','TimeoutError'].includes(error?.name)?'PROVIDER_TIMEOUT':'PROVIDER_NETWORK_ERROR')}
 if(r.status===429||r.status===503){await h.dbrun(env,'INSERT INTO shop_provider_backoff(provider,until_at) VALUES(?,?) ON CONFLICT(provider) DO UPDATE SET until_at=MAX(until_at,excluded.until_at)','off',t+60);h.fail(503,'PROVIDER_BACKOFF')}
 if(!r.ok&&r.status!==404)h.fail(503,Number.isInteger(r.status)&&r.status>=300&&r.status<=599?'PROVIDER_HTTP_'+r.status:'PROVIDER_HTTP_ERROR');let bytes;try{bytes=await h.readBounded(r,262144)}catch{h.fail(503,'PROVIDER_RESPONSE_TOO_LARGE')}
 let d;try{d=JSON.parse(new TextDecoder().decode(bytes))}catch{h.fail(503,'PROVIDER_INVALID_RESPONSE')}
 if(!d||![0,1].includes(d.status)||(r.status===404&&d.status!==0)||(d.status===1&&(!d.product||String(d.code||d.product.code)!==barcode))||(d.status===0&&(d.product||String(d.code)!==barcode)))h.fail(503,'PROVIDER_INVALID_RESPONSE');
 const result=d.status===1?{review_candidate:candidate(d.product,barcode)}:{review_candidate:null};
 await h.dbrun(env,'INSERT INTO shop_public_cache(barcode,payload,expires_at) VALUES(?,?,?) ON CONFLICT(barcode) DO UPDATE SET payload=excluded.payload,expires_at=excluded.expires_at',barcode,JSON.stringify(result),t+(d.status===1?86400:300));return result;
}
export async function handleShopLookup(req,env,h){
 const {u,raw}=await h.auth(req,env,{write:true});const x=await h.bodyJson(req,2000);if(Object.keys(x).join()!=='barcode')h.fail(400,'INVALID_BODY');
 const session=await h.sha(raw);const allowed=()=>h.dbfirst(env,"SELECT c.consent_revision FROM consents c JOIN users u ON u.id=c.user_id JOIN sessions s ON s.user_id=u.id WHERE c.user_id=? AND c.storage=1 AND c.health=1 AND u.status='active' AND s.token_hash=? AND s.expires_at>?",u.id,session,now());const before=await allowed();if(!before)h.fail(403,'CONSENT_REQUIRED');
 const result=await lookup(x.barcode,env,h);const after=await allowed();if(!after||before.consent_revision!==after.consent_revision)h.fail(409,'CONSENT_CHANGED');return h.json(result);
}

// Explicit name search returns identifiers only; choosing a hit performs the separate barcode review.
export async function searchProducts(query,wide,env,h,fetcher=fetch){
 if(typeof query!=='string'||query.trim().length<2||query.trim().length>80||typeof wide!=='boolean'||/[\u0000-\u001f\u007f]/u.test(query))h.fail(400,'INVALID_SEARCH');
 const term=query.trim();const literal='"'+term.replace(/\\/g,'\\\\').replace(/"/g,'\\"')+'"';
 const q=literal+(wide?'':' AND (countries_tags:"en:russia" OR countries_tags:"en:belarus")');
 const key='search:'+await h.sha(JSON.stringify([term,wide]));const t=now();
 const cached=await h.dbfirst(env,'SELECT payload FROM shop_public_cache WHERE barcode=? AND expires_at>?',key,t);if(cached)return JSON.parse(cached.payload);
 if(await h.dbfirst(env,'SELECT until_at FROM shop_provider_backoff WHERE provider=? AND until_at>?','off',t))h.fail(503,'PROVIDER_BACKOFF');
 await h.dbrun(env,'DELETE FROM shop_provider_requests WHERE requested_at<=?',t-60);
 await h.dbrun(env,'DELETE FROM shop_public_cache WHERE barcode IN (SELECT barcode FROM shop_public_cache WHERE expires_at<=? LIMIT 32)',t);
 const reservation=await h.dbrun(env,'INSERT INTO shop_provider_requests(requested_at) SELECT ? WHERE (SELECT COUNT(*) FROM shop_provider_requests WHERE requested_at>?)<8',t,t-60);if(reservation.meta.changes!==1)h.fail(429,'PROVIDER_THROTTLED');
 let r;try{r=await fetcher('https://search.openfoodfacts.org/search',{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json','User-Agent':'KetoCompanion/0.7 (https://github.com/offflinerpsy/keto-companion)'},body:JSON.stringify({q,langs:['ru','en'],page:1,page_size:10,fields:['code','product_name','product_name_ru','brands','countries_tags']}),redirect:'manual',signal:AbortSignal.timeout(8000)})}catch(e){h.fail(503,['AbortError','TimeoutError'].includes(e?.name)?'PROVIDER_TIMEOUT':'PROVIDER_NETWORK_ERROR')}
 if(r.status===429||r.status===503){await h.dbrun(env,'INSERT INTO shop_provider_backoff(provider,until_at) VALUES(?,?) ON CONFLICT(provider) DO UPDATE SET until_at=MAX(until_at,excluded.until_at)','off',t+60);h.fail(503,'PROVIDER_BACKOFF')}
 if(!r.ok)h.fail(503,'PROVIDER_HTTP_ERROR');let d;try{d=JSON.parse(new TextDecoder().decode(await h.readBounded(r,262144)))}catch{h.fail(503,'PROVIDER_INVALID_RESPONSE')}
 if(!d||!Array.isArray(d.hits)||d.hits.length>10)h.fail(503,'PROVIDER_INVALID_RESPONSE');
 const hits=d.hits.filter(x=>x&&validGTIN(x.code)).map(x=>({code:x.code,name:preferred(x.product_name_ru,x.product_name,200)||'Название не указано',brand:Array.isArray(x.brands)?x.brands.filter(v=>typeof v==='string').map(v=>v.slice(0,120)).slice(0,4).join(', '):short(x.brands,120),countries:Array.isArray(x.countries_tags)?x.countries_tags.filter(v=>v==='en:russia'||v==='en:belarus').slice(0,2):[]}));
 const result={hits};await h.dbrun(env,'INSERT INTO shop_public_cache(barcode,payload,expires_at) VALUES(?,?,?) ON CONFLICT(barcode) DO UPDATE SET payload=excluded.payload,expires_at=excluded.expires_at',key,JSON.stringify(result),t+(hits.length?3600:300));return result;
}
export async function handleShopSearch(req,env,h){
 const {u,raw}=await h.auth(req,env,{write:true});const x=await h.bodyJson(req,2000);if(Object.keys(x).sort().join()!=='query,wide')h.fail(400,'INVALID_BODY');
 const session=await h.sha(raw);const allowed=()=>h.dbfirst(env,"SELECT c.consent_revision FROM consents c JOIN users u ON u.id=c.user_id JOIN sessions s ON s.user_id=u.id WHERE c.user_id=? AND c.storage=1 AND c.health=1 AND u.status='active' AND s.token_hash=? AND s.expires_at>?",u.id,session,now());const before=await allowed();if(!before)h.fail(403,'CONSENT_REQUIRED');const result=await searchProducts(x.query,x.wide,env,h);const after=await allowed();if(!after||before.consent_revision!==after.consent_revision)h.fail(409,'CONSENT_CHANGED');return h.json(result);
}
