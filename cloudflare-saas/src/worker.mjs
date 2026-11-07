import {firebaseClaims} from './firebase-identity.mjs';
import {beginDeletion,deletionStatus} from './deletion.mjs';
import {handleTool,consentChange,bridgeCall,bridgeConfigured} from './compute.mjs';
// Isolated invitation-only pilot. No clinical computation is enabled here.
const OWNER='offflinerpsy@gmail.com', OAUTH_TTL=600, SESSION_TTL=7*86400, INVITE_TTL=72*3600;
const te=new TextEncoder(), td=new TextDecoder();
const now=()=>Math.floor(Date.now()/1000);
const b64=b=>{let s='';for(const x of new Uint8Array(b))s+=String.fromCharCode(x);return btoa(s).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'')};
const un64=s=>Uint8Array.from(atob(s.replaceAll('-','+').replaceAll('_','/')+'='.repeat((4-s.length%4)%4)),x=>x.charCodeAt(0));
const random=(n=32)=>b64(crypto.getRandomValues(new Uint8Array(n)));
const sha=async x=>b64(await crypto.subtle.digest('SHA-256',typeof x==='string'?te.encode(x):x));
class Fail extends Error{constructor(status,code){super(code);this.status=status;this.code=code}}
const fail=(status,code)=>{throw new Fail(status,code)};
const json=(data,status=200,extra={})=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','referrer-policy':'no-referrer','x-content-type-options':'nosniff',...extra}});
function firebasePublic(env){
 let c;try{c=JSON.parse(env.FIREBASE_PUBLIC_CONFIG_JSON)}catch{fail(503,'SETUP_REQUIRED')}
 if(!c||c.projectId!=='keto-companion-auth-261107'||c.authDomain!=='keto-companion-auth-261107.firebaseapp.com'||typeof c.apiKey!=='string'||!c.apiKey||typeof c.appId!=='string'||!c.appId)fail(503,'SETUP_REQUIRED');
 return {apiKey:c.apiKey,authDomain:c.authDomain,projectId:c.projectId,appId:c.appId,...(typeof c.messagingSenderId==='string'?{messagingSenderId:c.messagingSenderId}:{})};
}
function config(env){
 if(!env.DB||!env.UPLOADS||!env.PUBLIC_ORIGIN||!env.SESSION_HMAC_KEY||env.SESSION_HMAC_KEY.length<32||env.OWNER_GOOGLE_EMAIL?.toLowerCase()!==OWNER)fail(503,'SETUP_REQUIRED');
 let u;try{u=new URL(env.PUBLIC_ORIGIN)}catch{fail(503,'SETUP_REQUIRED')};if(u.origin!==env.PUBLIC_ORIGIN||u.protocol!=='https:')fail(503,'SETUP_REQUIRED');
 if(env.AUTH_PROVIDER==='firebase_google')firebasePublic(env);else if(env.AUTH_PROVIDER==='direct_google'){if(!env.GOOGLE_CLIENT_ID||!env.GOOGLE_CLIENT_SECRET)fail(503,'SETUP_REQUIRED')}else fail(503,'SETUP_REQUIRED');
}
function cookie(req,key){const pairs=(req.headers.get('cookie')||'').split(';').map(x=>x.trim().split('='));const found=pairs.filter(x=>x[0]===key);return found.length===1?found[0].slice(1).join('='):''}
const cookieSet=(name,value,maxAge)=>`${name}=${value}; Path=/; Max-Age=${maxAge}; Secure; HttpOnly; SameSite=Lax`;
async function readBounded(req,max){
 const size=Number(req.headers.get('content-length')||0);if(!Number.isFinite(size)||size<0||size>max)fail(413,'TOO_LARGE');
 if(!req.body)return new Uint8Array();let chunks=[],n=0;const r=req.body.getReader();
 while(true){const {value,done}=await r.read();if(done)break;n+=value.length;if(n>max){await r.cancel();fail(413,'TOO_LARGE')}chunks.push(value)}
 let out=new Uint8Array(n),i=0;for(const x of chunks){out.set(x,i);i+=x.length}return out;
}
async function bodyJson(req,max=8192){if(!/^application\/json(?:\s*;|$)/i.test(req.headers.get('content-type')||''))fail(415,'CONTENT_TYPE');let value;try{value=JSON.parse(td.decode(await readBounded(req,max)))}catch(e){if(e instanceof Fail)throw e;fail(400,'INVALID_BODY')};if(!value||Array.isArray(value)||typeof value!=='object')fail(400,'INVALID_BODY');return value}
function origin(req,env){if(req.headers.get('origin')!==env.PUBLIC_ORIGIN)fail(403,'ORIGIN');}
const dbfirst=(env,sql,...a)=>env.DB.prepare(sql).bind(...a).first();
const dbrun=(env,sql,...a)=>env.DB.prepare(sql).bind(...a).run();
const dball=async(env,sql,...a)=>(await env.DB.prepare(sql).bind(...a).all()).results;
async function csrfValue(env,raw){let k=await crypto.subtle.importKey('raw',te.encode(env.SESSION_HMAC_KEY),{name:'HMAC',hash:'SHA-256'},false,['sign']);return b64(await crypto.subtle.sign('HMAC',k,te.encode('csrf:'+raw)))}
async function auth(req,env,{pending=false,admin=false,write=false}={}){
 const raw=cookie(req,'keto_session');if(!/^[A-Za-z0-9_-]{43}$/.test(raw))fail(401,'SIGN_IN');
 const u=await dbfirst(env,'SELECT u.id,u.google_sub,u.email,u.role,u.status,u.joined_at,u.last_active FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>?',await sha(raw),now());
 if(!u||u.status==='suspended'||(!pending&&u.status!=='active'))fail(401,'SIGN_IN');if(admin&&u.role!=='admin')fail(403,'FORBIDDEN');
 if(write){origin(req,env);const value=req.headers.get('x-csrf-token')||'';let sig;try{sig=un64(value)}catch{fail(403,'CSRF')};const k=await crypto.subtle.importKey('raw',te.encode(env.SESSION_HMAC_KEY),{name:'HMAC',hash:'SHA-256'},false,['verify']);if(!await crypto.subtle.verify('HMAC',k,sig,te.encode('csrf:'+raw)))fail(403,'CSRF')}
 return {u,raw};
}
function limited(s,max,required=false){if(typeof s!=='string'||s.length>max||(required&&!s.trim()))fail(400,'INVALID_INPUT');return s.trim()}
function email(s){s=limited(s,254,true).toLowerCase();if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s))fail(400,'INVALID_EMAIL');return s}
function cleanUrl(s){if(!s)return '';let u;try{u=new URL(limited(s,1500))}catch{fail(400,'INVALID_URL')};if(!['https:','http:'].includes(u.protocol)||u.username||u.password)fail(400,'INVALID_URL');u.hash='';for(const k of [...u.searchParams.keys()])if(/^utm_|^(fbclid|igsh|gclid)$/i.test(k))u.searchParams.delete(k);return u.href}
async function providerJson(response,max=65536){if(!response.ok)fail(401,'GOOGLE_LOGIN_FAILED');try{return JSON.parse(td.decode(await readBounded(response,max)))}catch(e){if(e instanceof Fail)throw e;fail(401,'GOOGLE_LOGIN_FAILED')}}
async function googleClaims(idToken,nonceHash,env){
 try{
  if(typeof idToken!=='string'||idToken.length>16000)throw Error();let a=idToken.split('.');if(a.length!==3)throw Error();
  const head=JSON.parse(td.decode(un64(a[0]))),claim=JSON.parse(td.decode(un64(a[1])));if(head.alg!=='RS256'||typeof head.kid!=='string'||head.kid.length>200)throw Error();
  const jwks=await providerJson(await fetch('https://www.googleapis.com/oauth2/v3/certs'),65536);const key=jwks.keys?.find(k=>k.kid===head.kid&&k.kty==='RSA'&&(!k.alg||k.alg==='RS256'));if(!key)throw Error();
  const imported=await crypto.subtle.importKey('jwk',key,{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['verify']);if(!await crypto.subtle.verify('RSASSA-PKCS1-v1_5',imported,un64(a[2]),te.encode(a[0]+'.'+a[1])))throw Error();
  if(!['https://accounts.google.com','accounts.google.com'].includes(claim.iss)||claim.aud!==env.GOOGLE_CLIENT_ID||!Number.isInteger(claim.exp)||claim.exp<=now()||typeof claim.nonce!=='string'||await sha(claim.nonce)!==nonceHash||claim.email_verified!==true||typeof claim.sub!=='string'||!claim.sub||claim.sub.length>255)throw Error();
  return {sub:claim.sub,email:email(claim.email)};
 }catch(e){if(e instanceof Fail&&e.code==='GOOGLE_LOGIN_FAILED')throw e;fail(401,'GOOGLE_LOGIN_FAILED')}
}
async function oauthStart(req,env){
 origin(req,env);const x=await bodyJson(req);if(Object.keys(x).some(k=>k!=='invite'))fail(400,'INVALID_BODY');const inv=x.invite||'';if(inv&&!/^[A-Za-z0-9_-]{43}$/.test(inv))fail(400,'INVALID_INVITE');
 const state=random(),nonce=random(),verifier=random(),expires=now()+OAUTH_TTL;
 await dbrun(env,'DELETE FROM oauth_attempts WHERE expires_at<=?',now());
 const q=await dbrun(env,'INSERT INTO oauth_attempts(state_hash,verifier,nonce_hash,invite_hash,expires_at) SELECT ?,?,?,?,? WHERE (SELECT COUNT(*) FROM oauth_attempts)<1000',await sha(state),verifier,await sha(nonce),inv?await sha(inv):null,expires);if(q.meta.changes!==1)fail(503,'LOGIN_BUSY');
 const u=new URL('https://accounts.google.com/o/oauth2/v2/auth');for(const [k,v] of Object.entries({client_id:env.GOOGLE_CLIENT_ID,redirect_uri:env.PUBLIC_ORIGIN+'/auth/google/callback',response_type:'code',scope:'openid email profile',prompt:'select_account',state,nonce,code_challenge:await sha(verifier),code_challenge_method:'S256'}))u.searchParams.set(k,v);
 return json({authorization_url:u.href},200,{'set-cookie':cookieSet('keto_oauth_state',state,OAUTH_TTL)});
}
async function oauthCallback(req,env){
 const u=new URL(req.url);if(u.searchParams.getAll('state').length!==1||u.searchParams.getAll('code').length!==1)fail(400,'INVALID_CALLBACK');const state=u.searchParams.get('state'),code=u.searchParams.get('code');if(!/^[A-Za-z0-9_-]{43}$/.test(state||'')||cookie(req,'keto_oauth_state')!==state||!code||code.length>4096)fail(400,'INVALID_CALLBACK');
 const attempt=await dbfirst(env,'DELETE FROM oauth_attempts WHERE state_hash=? AND expires_at>? RETURNING verifier,nonce_hash,invite_hash',await sha(state),now());if(!attempt)fail(400,'INVALID_CALLBACK');
 const form=new URLSearchParams({code,client_id:env.GOOGLE_CLIENT_ID,client_secret:env.GOOGLE_CLIENT_SECRET,redirect_uri:env.PUBLIC_ORIGIN+'/auth/google/callback',grant_type:'authorization_code',code_verifier:attempt.verifier});
 const tokens=await providerJson(await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body:form}),32768);const g=await googleClaims(tokens.id_token,attempt.nonce_hash,env);
 return finishIdentity(env,g,attempt,false);
}
async function finishIdentity(env,g,attempt,firebase){
 const id='u_'+await sha(g.sub);let user=await dbfirst(env,'SELECT id,status,role,email FROM users WHERE id=? AND google_sub=?',id,g.sub);
 if(!user){
  const owner=g.email===OWNER;let inv=null;if(!owner&&attempt.invite_hash)inv=await dbfirst(env,'SELECT id FROM invites WHERE token_hash=? AND email=? AND expires_at>? AND revoked_at IS NULL AND claimed_by IS NULL',attempt.invite_hash,g.email,now());
  if(!owner&&!inv)fail(403,'INVITATION_REQUIRED');
  await dbrun(env,'INSERT INTO users(id,google_sub,email,role,status,joined_at,last_active) VALUES(?,?,?,?,?,?,?) ON CONFLICT(id) DO NOTHING',id,g.sub,g.email,owner?'admin':'member',owner?'active':'pending',now(),now());
  user=await dbfirst(env,'SELECT id,status,role,email FROM users WHERE id=? AND google_sub=?',id,g.sub);
 }
 if(!user||user.status==='suspended'||user.email!==g.email)fail(403,'SIGN_IN_BLOCKED');
 if(user.status==='pending'){
  const inv=attempt.invite_hash&&await dbfirst(env,'SELECT id FROM invites WHERE token_hash=? AND email=? AND expires_at>? AND revoked_at IS NULL AND claimed_by IS NULL',attempt.invite_hash,g.email,now());if(!inv)fail(403,'INVITATION_REQUIRED');
 }
 await dbrun(env,'DELETE FROM sessions WHERE expires_at<=?',now());const raw=random();const saved=await dbrun(env,'INSERT INTO sessions(token_hash,user_id,expires_at,created_at) SELECT ?,?,?,? WHERE (SELECT COUNT(*) FROM sessions WHERE user_id=? AND expires_at>?)<10',await sha(raw),id,now()+SESSION_TTL,now(),id,now());if(saved.meta.changes!==1)fail(503,'SESSION_LIMIT');await dbrun(env,'UPDATE users SET last_active=? WHERE id=?',now(),id);
 return firebase?json({ok:true},200,{'set-cookie':cookieSet('keto_session',raw,SESSION_TTL)}):new Response(null,{status:303,headers:{location:env.PUBLIC_ORIGIN+'/', 'set-cookie':cookieSet('keto_session',raw,SESSION_TTL),'cache-control':'no-store','referrer-policy':'no-referrer'}});
}
async function firebaseStart(req,env){
 origin(req,env);const x=await bodyJson(req);if(Object.keys(x).some(k=>k!=='invite'))fail(400,'INVALID_BODY');const inv=x.invite||'';if(inv&&!/^[A-Za-z0-9_-]{43}$/.test(inv))fail(400,'INVALID_INVITE');
 const ip=req.headers.get('CF-Connecting-IP');if(!ip||ip.length>64||!/^[0-9a-fA-F:.]+$/.test(ip))fail(503,'LOGIN_UNAVAILABLE');
 const key=await crypto.subtle.importKey('raw',te.encode(env.SESSION_HMAC_KEY),{name:'HMAC',hash:'SHA-256'},false,['sign']);const ipHash=b64(await crypto.subtle.sign('HMAC',key,te.encode('firebase-ip:'+ip)));const transaction=random(),browser=random(),t=now();
 await dbrun(env,'DELETE FROM firebase_challenges WHERE expires_at<=?',t);
 const saved=await dbrun(env,'INSERT INTO firebase_challenges(transaction_hash,cookie_hash,invite_hash,ip_hash,created_at,expires_at) SELECT ?,?,?,?,?,? WHERE (SELECT COUNT(*) FROM firebase_challenges)<1000 AND (SELECT COUNT(*) FROM firebase_challenges WHERE ip_hash=?)<10',await sha(transaction),await sha(browser),inv?await sha(inv):null,ipHash,t,t+300,ipHash);
 if(saved.meta.changes!==1)fail(429,'LOGIN_BUSY');return json({transaction},200,{'set-cookie':cookieSet('keto_firebase',browser,300)});
}
async function firebaseComplete(req,env){
 origin(req,env);const x=await bodyJson(req,16384);if(Object.keys(x).sort().join()!=='token,transaction'||typeof x.token!=='string'||!/^[A-Za-z0-9_-]{43}$/.test(x.transaction||''))fail(400,'INVALID_BODY');const browser=cookie(req,'keto_firebase');if(!/^[A-Za-z0-9_-]{43}$/.test(browser))fail(400,'INVALID_CHALLENGE');
 const attempt=await dbfirst(env,'UPDATE firebase_challenges SET consumed_at=? WHERE transaction_hash=? AND cookie_hash=? AND expires_at>? AND consumed_at IS NULL RETURNING invite_hash',now(),await sha(x.transaction),await sha(browser),now());if(!attempt)fail(400,'INVALID_CHALLENGE');
 const g=await firebaseClaims(x.token,{readBounded,email,fail,now});return finishIdentity(env,g,attempt,true);
}

async function handle(req,env){
 const url=new URL(req.url),path=url.pathname,method=req.method;
 if(path==='/health'&&method==='GET'){let ready=false;try{config(env);ready=true}catch{}return json({version:'0.3.0-internal-pilot',build:'firebase-identity',capabilities:{firebase_google:ready&&env.AUTH_PROVIDER==='firebase_google',direct_google:ready&&env.AUTH_PROVIDER==='direct_google',storage:!!env.DB&&!!env.UPLOADS,compute:bridgeConfigured(env)}})}
 if(method==='GET'&&['/','/help','/privacy','/delete','/app.bundle.js','/style.css'].includes(path)){if(!env.ASSETS)fail(503,'SETUP_REQUIRED');const asset=({'/help':'/help.html','/privacy':'/privacy.html','/delete':'/delete.html'})[path];const r=await env.ASSETS.fetch(asset?new Request(new URL(asset,req.url),req):req);const h=new Headers(r.headers);h.set('Content-Security-Policy',"default-src 'self'; script-src 'self' https://apis.google.com; style-src 'self'; connect-src 'self' https://identitytoolkit.googleapis.com https://securetoken.googleapis.com; frame-src https://keto-companion-auth-261107.firebaseapp.com; object-src 'none'; base-uri 'none'; frame-ancestors 'none'");h.set('Cross-Origin-Opener-Policy','same-origin-allow-popups');h.set('Cache-Control','no-store');h.set('Referrer-Policy','no-referrer');h.set('X-Content-Type-Options','nosniff');return new Response(r.body,{status:r.status,headers:h})}
 if(path==='/auth/config'&&method==='GET'){config(env);return json(env.AUTH_PROVIDER==='firebase_google'?{provider:'firebase_google',firebase:firebasePublic(env)}:{provider:'direct_google'})}
 config(env);
 if(path==='/auth/firebase/start'&&method==='POST'&&env.AUTH_PROVIDER==='firebase_google')return firebaseStart(req,env);
 if(path==='/auth/firebase/complete'&&method==='POST'&&env.AUTH_PROVIDER==='firebase_google')return firebaseComplete(req,env);
 if(path==='/auth/google/start'&&method==='POST'&&env.AUTH_PROVIDER==='direct_google')return oauthStart(req,env);
 if(path==='/auth/google/callback'&&method==='GET'&&env.AUTH_PROVIDER==='direct_google')return oauthCallback(req,env);
 if(path==='/api/session'&&method==='GET'){const {u,raw}=await auth(req,env,{pending:true});return json({user:{role:u.role,status:u.status,email:u.email},csrf:await csrfValue(env,raw),version:'0.3.0-internal-pilot',capabilities:{chat:bridgeConfigured(env)?'configured_unverified':'not_configured',compute:bridgeConfigured(env)?'configured_unverified':'not_configured',google_integrations:false,instagram_fetch:false,plugin:'existing Azure only'}})}
 if(path==='/api/logout'&&method==='POST'){const {raw}=await auth(req,env,{pending:true,write:true});await dbrun(env,'DELETE FROM sessions WHERE token_hash=?',await sha(raw));return json({ok:true},200,{'set-cookie':cookieSet('keto_session','',0)})}
 if(path==='/api/invites/claim'&&method==='POST'){
  const {u}=await auth(req,env,{pending:true,write:true});if(u.status!=='pending')fail(409,'INVITE_NOT_AVAILABLE');const x=await bodyJson(req);if(Object.keys(x).join()!=='token'||!/^[A-Za-z0-9_-]{43}$/.test(x.token||''))fail(400,'INVALID_INVITE');let t=now();
  const results=await env.DB.batch([env.DB.prepare('UPDATE invites SET claimed_by=?,claimed_at=? WHERE token_hash=? AND email=? AND expires_at>? AND revoked_at IS NULL AND claimed_by IS NULL AND EXISTS (SELECT 1 FROM users WHERE id=? AND status=\'pending\')').bind(u.id,t,await sha(x.token),u.email,t,u.id),env.DB.prepare("UPDATE users SET status='active',joined_at=? WHERE id=? AND status='pending' AND EXISTS (SELECT 1 FROM invites WHERE token_hash=? AND claimed_by=? AND claimed_at=?)").bind(t,u.id,await sha(x.token),u.id,t)]);
  if(results[0].meta.changes!==1||results[1].meta.changes!==1)fail(409,'INVITE_NOT_AVAILABLE');return json({ok:true});
 }
 if(path==='/api/admin/summary'&&method==='GET'){
  await auth(req,env,{admin:true});const counts=await dbfirst(env,"SELECT SUM(CASE WHEN status='active' THEN 1 ELSE 0 END) active FROM users");const pending=await dbfirst(env,'SELECT SUM(CASE WHEN expires_at>? THEN 1 ELSE 0 END) pending,SUM(CASE WHEN expires_at<=? THEN 1 ELSE 0 END) expired FROM invites WHERE revoked_at IS NULL AND claimed_by IS NULL',now(),now());const members=await dball(env,'SELECT u.id,u.email,u.role,u.status,u.joined_at,u.last_active,COALESCE(SUM(usage.requests),0) requests FROM users u LEFT JOIN usage ON usage.user_id=u.id GROUP BY u.id ORDER BY u.joined_at LIMIT 200');const invites=await dball(env,'SELECT id,email,expires_at,revoked_at,claimed_by,created_at FROM invites ORDER BY created_at DESC LIMIT 200');return json({active:counts.active||0,pending:pending.pending||0,expired:pending.expired||0,members,invites});
 }
 if(path==='/api/admin/invites'&&method==='POST'){
  const {u}=await auth(req,env,{admin:true,write:true});const x=await bodyJson(req);if(Object.keys(x).join()!=='email')fail(400,'INVALID_BODY');const address=email(x.email),token=random(),id=crypto.randomUUID();await dbrun(env,'INSERT INTO invites(id,token_hash,email,expires_at,created_at,created_by) VALUES(?,?,?,?,?,?)',id,await sha(token),address,now()+INVITE_TTL,now(),u.id);await dbrun(env,'INSERT INTO audit(id,actor_id,action,target_id,created_at) VALUES(?,?,?,?,?)',crypto.randomUUID(),u.id,'invite.create',id,now());return json({id,link:env.PUBLIC_ORIGIN+'/?invite='+token,expires_in:INVITE_TTL});
 }
 if(path==='/api/admin/invites/revoke'&&method==='POST'){
  const {u}=await auth(req,env,{admin:true,write:true});const x=await bodyJson(req);if(Object.keys(x).join()!=='id')fail(400,'INVALID_BODY');let id=limited(x.id,100,true);let r=await dbrun(env,'UPDATE invites SET revoked_at=? WHERE id=? AND revoked_at IS NULL AND claimed_by IS NULL',now(),id);if(r.meta.changes!==1)fail(404,'NOT_FOUND');await dbrun(env,'INSERT INTO audit(id,actor_id,action,target_id,created_at) VALUES(?,?,?,?,?)',crypto.randomUUID(),u.id,'invite.revoke',id,now());return json({ok:true});
 }
 if(path==='/api/admin/members/status'&&method==='POST'){
  const {u}=await auth(req,env,{admin:true,write:true});const x=await bodyJson(req);if(!x.id||!['active','suspended'].includes(x.status)||Object.keys(x).length!==2)fail(400,'INVALID_BODY');let results=await env.DB.batch([env.DB.prepare("UPDATE users SET status=? WHERE id=? AND role='member' AND status IN ('active','suspended') AND NOT EXISTS(SELECT 1 FROM deletion_jobs WHERE user_id=users.id)").bind(x.status,x.id),env.DB.prepare("DELETE FROM sessions WHERE user_id=? AND EXISTS (SELECT 1 FROM users WHERE id=? AND status='suspended')").bind(x.id,x.id)]);if(results[0].meta.changes!==1)fail(404,'NOT_FOUND');await dbrun(env,'INSERT INTO audit(id,actor_id,action,target_id,created_at) VALUES(?,?,?,?,?)',crypto.randomUUID(),u.id,'member.'+x.status,x.id,now());return json({ok:true});
 }
 if(path==='/api/consent'&&method==='POST'){
  const {u}=await auth(req,env,{write:true});const x=await bodyJson(req);if(Object.keys(x).sort().join()!=='health,processing,storage'||Object.values(x).some(v=>typeof v!=='boolean'))fail(400,'INVALID_BODY');await consentChange(env,u,x);return json({ok:true});
 }
 if(path==='/api/sources'&&method==='GET'){
  const {u}=await auth(req,env);return json({sources:await dball(env,'SELECT id,title,author,source_url,access_method,content_hash,excerpt,mime,status,created_at FROM sources WHERE user_id=? ORDER BY created_at DESC LIMIT 100',u.id)});
 }
 if(path==='/api/sources'&&method==='POST'){
  const {u,raw}=await auth(req,env,{write:true});const consent=await dbfirst(env,'SELECT storage FROM consents WHERE user_id=?',u.id);if(!consent?.storage)fail(403,'CONSENT_REQUIRED');const x=await bodyJson(req,750000);if(Object.keys(x).some(k=>!['title','author','url','text','rights_attested','upload'].includes(k))||x.rights_attested!==true)fail(400,'INVALID_BODY');
  const title=limited(x.title,140,true),author=limited(x.author||'',140),source=cleanUrl(x.url||'');let excerpt=limited(x.text||'',2000),key=null,mime=null,bytes=null,hash=null,reservation=null,putStarted=false,committed=false;const sessionHash=await sha(raw);
  try{
   if(x.upload){
    if(typeof x.upload!=='object'||Object.keys(x.upload).sort().join()!=='data,mime'||!['image/jpeg','image/png','text/plain'].includes(x.upload.mime)||typeof x.upload.data!=='string'||x.upload.data.length>700000)fail(400,'INVALID_UPLOAD');try{bytes=un64(x.upload.data)}catch{fail(400,'INVALID_UPLOAD')};if(!bytes.length||bytes.length>512000)fail(413,'TOO_LARGE');mime=x.upload.mime;
    if(mime==='text/plain'){if(bytes.length>4000)fail(413,'TOO_LARGE');try{let text=new TextDecoder('utf-8',{fatal:true}).decode(bytes);if(!excerpt)excerpt=text.slice(0,2000)}catch{fail(400,'INVALID_UPLOAD')}}
    key='private/'+u.id+'/'+random();reservation=crypto.randomUUID();
    let reserved=await dbrun(env,"INSERT INTO upload_reservations(id,user_id,object_key,status,created_at) SELECT ?,?,?,'pending',? WHERE EXISTS(SELECT 1 FROM users WHERE id=? AND status='active') AND EXISTS(SELECT 1 FROM sessions WHERE token_hash=? AND user_id=? AND expires_at>?) AND EXISTS(SELECT 1 FROM consents WHERE user_id=? AND storage=1) AND (SELECT COUNT(*) FROM sources WHERE user_id=?)<100",reservation,u.id,key,now(),u.id,sessionHash,u.id,now(),u.id,u.id);if(reserved.meta.changes!==1)fail(403,'SOURCE_NOT_SAVED');
    if(mime!=='text/plain'){
     let encoded=b64(bytes);encoded=encoded.replaceAll('-','+').replaceAll('_','/');encoded+='='.repeat((4-encoded.length%4)%4);
     let result;try{result=await bridgeCall(env,u.id,'sanitize_image',null,{image_data_url:'data:'+mime+';base64,'+encoded})}catch(e){if(e.message==='BRIDGE_REJECTED')fail(400,'INVALID_UPLOAD');fail(503,'IMAGE_PROCESSING_UNAVAILABLE')}
     const clean=result.response.image_data_url;if(typeof clean!=='string'||!clean.startsWith('data:image/jpeg;base64,'))fail(503,'IMAGE_PROCESSING_UNAVAILABLE');try{bytes=un64(clean.split(',')[1])}catch{fail(503,'IMAGE_PROCESSING_UNAVAILABLE')}mime='image/jpeg';if(!bytes.length||bytes.length>1000000)fail(413,'TOO_LARGE');
    }
    const active=await dbfirst(env,"SELECT u.id FROM users u JOIN sessions s ON s.user_id=u.id JOIN consents c ON c.user_id=u.id WHERE u.id=? AND u.status='active' AND s.token_hash=? AND s.expires_at>? AND c.storage=1",u.id,sessionHash,now());if(!active)fail(403,'SOURCE_NOT_SAVED');
    hash=await sha(bytes);putStarted=true;await env.UPLOADS.put(key,bytes,{httpMetadata:{contentType:mime}});
   }
   if(!hash&&excerpt)hash=await sha(excerpt);if(!source&&!excerpt&&!bytes)fail(400,'CONTENT_REQUIRED');const id=crypto.randomUUID(),status=(excerpt||bytes)?'draft':'needs_content';
   const saved=await dbrun(env,"INSERT INTO sources(id,user_id,title,author,source_url,access_method,content_hash,excerpt,object_key,mime,status,rights_attested,created_at) SELECT ?,?,?,?,?,?,?,?,?,?,?,?,? WHERE EXISTS (SELECT 1 FROM users WHERE id=? AND status='active') AND EXISTS (SELECT 1 FROM sessions WHERE token_hash=? AND user_id=? AND expires_at>?) AND EXISTS (SELECT 1 FROM consents WHERE user_id=? AND storage=1) AND (SELECT COUNT(*) FROM sources WHERE user_id=?)<100",id,u.id,title,author,source,bytes?'upload':excerpt?'pasted':'link',hash,excerpt,key,mime,status,1,now(),u.id,sessionHash,u.id,now(),u.id,u.id);if(saved.meta.changes!==1)fail(403,'SOURCE_NOT_SAVED');committed=true;
   if(reservation){try{await dbrun(env,'DELETE FROM upload_reservations WHERE id=? AND user_id=?',reservation,u.id)}catch{}}return json({id,status},201);
  }catch(e){if(reservation&&!committed){if(putStarted){try{await env.UPLOADS.delete(key);await dbrun(env,'DELETE FROM upload_reservations WHERE id=? AND user_id=?',reservation,u.id)}catch{await dbrun(env,"UPDATE upload_reservations SET status='cleanup' WHERE id=? AND user_id=?",reservation,u.id)}}else await dbrun(env,'DELETE FROM upload_reservations WHERE id=? AND user_id=?',reservation,u.id)}throw e}
 }
 if(path==='/api/sources/review'&&method==='POST'){
  const {u}=await auth(req,env,{write:true});const x=await bodyJson(req);if(Object.keys(x).sort().join()!=='id,reviewed'||x.reviewed!==true)fail(400,'INVALID_BODY');const r=await dbrun(env,"UPDATE sources SET status='reviewed' WHERE id=? AND user_id=? AND status='draft'",limited(x.id,100,true),u.id);if(r.meta.changes!==1)fail(404,'NOT_FOUND');return json({ok:true});
 }
 if(path==='/api/sources/file'&&method==='GET'){
  const {u}=await auth(req,env);const id=limited(url.searchParams.get('id')||'',100,true);const item=await dbfirst(env,'SELECT object_key,mime FROM sources WHERE id=? AND user_id=?',id,u.id);if(!item?.object_key)fail(404,'NOT_FOUND');const object=await env.UPLOADS.get(item.object_key);if(!object)fail(404,'NOT_FOUND');return new Response(object.body,{headers:{'content-type':item.mime,'content-disposition':'attachment','cache-control':'no-store','x-content-type-options':'nosniff'}});
 }
 if(path==='/api/sources/delete'&&method==='POST'){
  const {u}=await auth(req,env,{write:true});const x=await bodyJson(req);if(Object.keys(x).join()!=='id')fail(400,'INVALID_BODY');const s=await dbfirst(env,'SELECT object_key FROM sources WHERE id=? AND user_id=?',limited(x.id,100,true),u.id);if(!s)fail(404,'NOT_FOUND');if(s.object_key)await env.UPLOADS.delete(s.object_key);await dbrun(env,'DELETE FROM sources WHERE id=? AND user_id=?',x.id,u.id);return json({ok:true});
 }
 if(path==='/api/export'&&method==='GET'){
  const {u}=await auth(req,env);const state=await dbfirst(env,'SELECT revision,payload FROM private_state WHERE user_id=?',u.id);const consent=await dbfirst(env,'SELECT storage,health,processing,updated_at FROM consents WHERE user_id=?',u.id);const sources=await dball(env,'SELECT id,title,author,source_url,access_method,content_hash,excerpt,mime,status,created_at FROM sources WHERE user_id=?',u.id);return json({schema:'keto-cloudflare-export-v1',state,consent,sources,note:'Uploaded files are not included in this JSON.'});
 }
 if(path==='/api/personal/delete'&&method==='POST')return beginDeletion(req,env,{auth,bodyJson,json,fail});
 if(path==='/api/deletion/status'&&method==='POST')return deletionStatus(req,env,{origin,bodyJson,json,fail,dbfirst,dball,dbrun},false);
 if(path==='/api/deletion/continue'&&method==='POST')return deletionStatus(req,env,{origin,bodyJson,json,fail,dbfirst,dball,dbrun},true);
 if(path.startsWith('/api/tools/')&&method==='POST')return handleTool(req,env,{auth,bodyJson,readBounded,json,dbfirst,dbrun,sha,fail,Fail});
 if(path==='/api/compute'||path==='/api/chat')fail(503,'COMPUTE_NOT_CONFIGURED');
 fail(404,'NOT_FOUND');
}
export default {async fetch(req,env){try{return await handle(req,env)}catch(e){return json({error:e instanceof Fail?e.code:'SERVICE_UNAVAILABLE'},e instanceof Fail?e.status:503)}}};
