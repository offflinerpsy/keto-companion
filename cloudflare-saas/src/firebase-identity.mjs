import {importX509,jwtVerify} from '../vendor/jose-6.2.15/jose.mjs';
// Fixed Firebase public certificate endpoint; Cache-Control max-age governs reuse.
const CERTS='https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com';
const PROJECT='keto-companion-auth-261107';
let cached=null,until=0;
export async function firebaseClaims(token,{readBounded,email,fail,now}){
 try{
  if(typeof token!=='string'||token.length>16000)throw Error();const parts=token.split('.');if(parts.length!==3)throw Error();
  const h=JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(parts[0].replaceAll('-','+').replaceAll('_','/')+'='.repeat((4-parts[0].length%4)%4)),c=>c.charCodeAt(0))));
  if(h.alg!=='RS256'||typeof h.kid!=='string'||!h.kid||h.kid.length>200)throw Error();
  if(!cached||Date.now()>=until){const r=await fetch(CERTS);if(!r.ok)throw Error();const data=JSON.parse(new TextDecoder().decode(await readBounded(r,65536)));if(!data||typeof data!=='object'||Array.isArray(data))throw Error();const ttl=Number((r.headers.get('cache-control')||'').match(/(?:^|,)\s*max-age=(\d+)/i)?.[1]||0);const age=Number(r.headers.get('age')||0);cached=data;until=Date.now()+Math.max(0,Math.min(ttl,3600)-(Number.isFinite(age)&&age>0?age:0))*1000;}
  if(!Object.hasOwn(cached,h.kid)||typeof cached[h.kid]!=='string')throw Error();const key=await importX509(cached[h.kid],'RS256');const {payload:c}=await jwtVerify(token,key,{algorithms:['RS256'],issuer:'https://securetoken.google.com/'+PROJECT,audience:PROJECT});
  const t=now(),ids=c.firebase?.identities?.['google.com'];
  if(c.aud!==PROJECT||!Number.isInteger(c.exp)||c.exp<=t||!Number.isInteger(c.iat)||c.iat>t+30||c.exp<=c.iat||!Number.isInteger(c.auth_time)||c.auth_time>t+30||c.auth_time<t-330||c.auth_time>c.iat+30||typeof c.sub!=='string'||!c.sub||c.sub.length>128||c.email_verified!==true||c.firebase?.sign_in_provider!=='google.com'||!Array.isArray(ids)||ids.length!==1||typeof ids[0]!=='string'||!ids[0].trim()||ids[0].length>255)throw Error();
  return {sub:ids[0],email:email(c.email)};
 }catch{fail(401,'GOOGLE_LOGIN_FAILED')}
}
