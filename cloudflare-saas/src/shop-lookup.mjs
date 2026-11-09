// The only upstream is Open Food Facts; responses are untrusted review candidates.
const now=()=>Math.floor(Date.now()/1000);
export function validGTIN(s){
 if(typeof s!=='string'||!/^\d+$/.test(s)||![8,12,13,14].includes(s.length))return false;
 let sum=0;for(let i=s.length-2,j=0;i>=0;i--,j++)sum+=Number(s[i])*(j%2?1:3);
 return (10-sum%10)%10===Number(s.at(-1));
}
const short=(v,n)=>typeof v==='string'?v.slice(0,n):null;
export function candidate(product,barcode){
 const n=product?.nutriments||{};const rows=[];
 for(const [key,label,unit] of [['energy-kcal_100g','Energy','kcal'],['proteins_100g','Protein','g'],['fat_100g','Fat','g'],['carbohydrates_100g','Carbohydrates','g'],['fiber_100g','Fiber','g']]){
  const value=n[key];if(typeof value==='number'&&Number.isFinite(value)&&value>=0&&value<=1000000)rows.push({name:label,value,unit,column:'100 g/ml (provider; verify label)'})
 }
 return {readability:'partial',name:short(product?.product_name,200),brand:short(product?.brands,120),barcode,basis:'unknown',serving_mass:null,serving_unit:null,nutrients:rows,carbohydrate_basis:'unknown',carbohydrate_caption:null,ingredients_text:short(product?.ingredients_text,3000),allergen_statement_text:null,unresolved_fields:['Проверьте состав и аллергены на упаковке','Основа углеводов не установлена'],reshoot_hint:null,provenance:{provider:'Open Food Facts',license:'ODbL',url:'https://world.openfoodfacts.org/product/'+barcode}};
}
export async function lookup(barcode,env,h,fetcher=fetch){
 if(!validGTIN(barcode))h.fail(400,'INVALID_BARCODE');const t=now();
 let cached=await h.dbfirst(env,'SELECT payload FROM shop_public_cache WHERE barcode=? AND expires_at>?',barcode,t);if(cached)return JSON.parse(cached.payload);
 const paused=await h.dbfirst(env,'SELECT until_at FROM shop_provider_backoff WHERE provider=? AND until_at>?','off',t);if(paused)h.fail(503,'PROVIDER_BACKOFF');
 await h.dbrun(env,'DELETE FROM shop_provider_requests WHERE requested_at<=?',t-60);
 const reservation=await h.dbrun(env,'INSERT INTO shop_provider_requests(requested_at) SELECT ? WHERE (SELECT COUNT(*) FROM shop_provider_requests WHERE requested_at>?)<15',t,t-60);
 if(reservation.meta.changes!==1)h.fail(429,'PROVIDER_THROTTLED');
 let r;try{r=await fetcher('https://world.openfoodfacts.org/api/v2/product/'+barcode+'?fields=code,product_name,brands,ingredients_text,nutriments',{headers:{'User-Agent':'KetoCompanion/0.7 (https://github.com/offflinerpsy/keto-companion)','Accept':'application/json'},redirect:'error',signal:AbortSignal.timeout(8000)})}catch{h.fail(503,'PROVIDER_UNAVAILABLE')}
 if(r.status===429||r.status===503){await h.dbrun(env,'INSERT INTO shop_provider_backoff(provider,until_at) VALUES(?,?) ON CONFLICT(provider) DO UPDATE SET until_at=MAX(until_at,excluded.until_at)','off',t+60);h.fail(503,'PROVIDER_BACKOFF')}
 if(!r.ok&&r.status!==404)h.fail(503,'PROVIDER_UNAVAILABLE');let bytes;try{bytes=await h.readBounded(r,262144)}catch{h.fail(503,'PROVIDER_RESPONSE_TOO_LARGE')}
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
