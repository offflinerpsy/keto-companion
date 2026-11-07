// Recovery acceptance test: latest exact build, actual local workerd/D1/R2.
// External Google certificate endpoint is replaced by a synthetic certificate.
// No browser, real Google login, model call, production data, or cloud mutation.
const mfPackage=require('/opt/homebrew/lib/node_modules/cf/node_modules/miniflare');
const {Miniflare}=mfPackage;
const NodeResponse=mfPackage.Response||globalThis.Response;
const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const crypto=require('node:crypto'),{spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..'),origin='https://keto.test';
const project='keto-companion-auth-261107';
const certURL='https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com';
const checks=[];let mf,temp,certificateFetches=0,blockedEgress=0;
const digest=x=>crypto.createHash('sha256').update(x).digest('hex');
function check(name,condition,details){checks.push({name,passed:!!condition,...(details?{details}:{})});if(!condition)throw Error(name);}
function safeCookie(r){const value=r.headers.get('set-cookie');if(!value)throw Error('Missing session cookie');return value.split(';')[0];}
(async()=>{try{
 const manifest=JSON.parse(fs.readFileSync(path.join(root,'artifacts/files_manifest.json')));
 for(const item of manifest.files){const bytes=fs.readFileSync(path.join(root,item.path));if(bytes.length!==item.bytes||digest(bytes)!==item.sha256)throw Error('Artifact hash mismatch: '+item.path);}
 check('latest_artifact_manifest_verified',true,{files:manifest.files.length});
 const modules={};for(const item of manifest.files){if(item.module_name&&item.module_name!=='worker.mjs')modules[item.module_name]={type:item.module_type,contents:fs.readFileSync(path.join(root,item.path),'utf8')};}
 const kp=crypto.generateKeyPairSync('rsa',{modulusLength:2048});temp=fs.mkdtempSync(path.join(os.tmpdir(),'keto-recovery-synthetic-'));
 const keyPath=path.join(temp,'key.pem'),certPath=path.join(temp,'cert.pem');
 fs.writeFileSync(keyPath,kp.privateKey.export({type:'pkcs8',format:'pem'}),{mode:0o600});
 const made=spawnSync('/usr/bin/openssl',['req','-new','-x509','-key',keyPath,'-out',certPath,'-days','1','-subj','/CN=keto-recovery-synthetic.invalid'],{encoding:'utf8',timeout:10000});
 if(made.status!==0)throw Error('Synthetic certificate fixture failed');const cert=fs.readFileSync(certPath,'utf8');
 const fields={AUTH_PROVIDER:'firebase_google',PUBLIC_ORIGIN:origin,OWNER_GOOGLE_EMAIL:'offflinerpsy@gmail.com',SESSION_HMAC_KEY:'synthetic-local-recovery-only-not-production-credential',FIREBASE_PUBLIC_CONFIG_JSON:JSON.stringify({apiKey:'synthetic-public',projectId:project,authDomain:project+'.firebaseapp.com',appId:'synthetic-app',clientSecret:'MUST_NOT_LEAK'})};
 const env=Object.fromEntries(Object.entries(fields).map(([k,v])=>[k,{type:'json',value:v}]));env.DB={type:'d1',id:'keto-recovery-synthetic'};env.UPLOADS={type:'r2',name:'keto-recovery-private'};
 mf=new Miniflare({telemetry:{enabled:false},cf:false,workers:[{config:{name:'keto-recovery',compatibilityDate:'2026-10-03',manifest:{mainModule:'worker-modules.mjs',modules},env},dev:{outboundService:{type:'fetcher',handler:async req=>{if(req.url!==certURL){blockedEgress++;return new NodeResponse('Unexpected test egress',{status:502});}certificateFetches++;return new NodeResponse(JSON.stringify({synthetic:cert}),{headers:{'content-type':'application/json','cache-control':'public, max-age=60'}});}}}}]});
 const db=await mf.getD1Database('DB'),bucket=await mf.getR2Bucket('UPLOADS');
 for(const name of fs.readdirSync(path.join(root,'cloudflare-saas/migrations')).filter(x=>x.endsWith('.sql')).sort())await db.exec(fs.readFileSync(path.join(root,'cloudflare-saas/migrations',name),'utf8'));
 check('current_four_migrations_in_real_D1_runtime',true);
 let ipSeq=10;
 async function request(route,{method='GET',body,cookie,csrf,requestOrigin=origin,ip}={}){const headers={'CF-Connecting-IP':ip||'192.0.2.'+(ipSeq++%200+10)};if(cookie)headers.cookie=cookie;if(csrf)headers['x-csrf-token']=csrf;if(method==='POST'){headers.Origin=requestOrigin;headers['content-type']='application/json';}return mf.dispatchFetch(origin+route,{method,headers,...(body!==undefined?{body:JSON.stringify(body)}:{})});}
 function token({email='offflinerpsy@gmail.com',googleSub='synthetic-owner-google',overrides={}}={}){const t=Math.floor(Date.now()/1000);const c={iss:'https://securetoken.google.com/'+project,aud:project,iat:t,exp:t+3600,auth_time:t,sub:'synthetic-firebase-'+googleSub,email,email_verified:true,firebase:{sign_in_provider:'google.com',identities:{'google.com':[googleSub]}},...overrides};const enc=x=>Buffer.from(JSON.stringify(x)).toString('base64url');const input=enc({alg:'RS256',kid:'synthetic'})+'.'+enc(c);return input+'.'+crypto.sign('RSA-SHA256',Buffer.from(input),kp.privateKey).toString('base64url');}
 async function start(invite=''){const r=await request('/auth/firebase/start',{method:'POST',body:{invite}});if(r.status!==200)throw Error('Challenge failed: '+r.status+' '+await r.text());return {cookie:safeCookie(r),transaction:(await r.json()).transaction};}
 async function complete(ch,t,requestOrigin=origin){return request('/auth/firebase/complete',{method:'POST',cookie:ch.cookie,body:{transaction:ch.transaction,token:t},requestOrigin});}
 async function session(cookie){const r=await request('/api/session',{cookie});if(r.status!==200)throw Error('Session failed');return r.json();}
 let r=await request('/');check('modular_static_page_served',r.status===200&&(await r.text()).includes('KETO'));
 r=await request('/app.bundle.js');check('served_client_matches_manifest',r.status===200&&digest(Buffer.from(await r.arrayBuffer()))===manifest.files.find(x=>x.module_name==='assets/app.bundle.js').sha256);
 r=await request('/health');let d=await r.json();check('firebase_enabled_compute_unconfigured_truthfully',r.status===200&&d.capabilities.firebase_google===true&&d.capabilities.compute===false);
 r=await request('/auth/config');d=await r.json();check('public_config_whitelisted',r.status===200&&d.provider==='firebase_google'&&!JSON.stringify(d).includes('MUST_NOT_LEAK')&&!JSON.stringify(d).includes('SESSION_HMAC'));
 r=await request('/api/session');check('anonymous_session_refused',r.status===401);
 r=await request('/auth/google/start',{method:'POST',body:{}});check('legacy_direct_login_not_implicitly_enabled',r.status===404);
 const ownerChallenge=await start();r=await complete(ownerChallenge,token());check('signed_Firebase_owner_exchange',r.status===200);const owner=safeCookie(r),ownerSession=await session(owner);
 check('owner_admin_from_verified_identity',ownerSession.user.role==='admin'&&ownerSession.user.status==='active');
 r=await complete(ownerChallenge,token());check('challenge_single_use',r.status===400);
 const invalid=await start();r=await complete(invalid,token({overrides:{aud:'other-project'}}));check('foreign_audience_refused',r.status===401);
 const forged=await start();let signed=token();signed=signed.slice(0,-16)+'A'.repeat(16);r=await complete(forged,signed);check('invalid_signature_refused',r.status===401);
 const wrongOrigin=await start();r=await complete(wrongOrigin,token(),'https://untrusted.invalid');check('foreign_origin_refused',r.status===403);
 const outsider=await start();r=await complete(outsider,token({email:'outsider@example.invalid',googleSub:'outsider'}));check('uninvited_identity_refused',r.status===403);
 r=await request('/api/admin/invites',{method:'POST',cookie:owner,body:{email:'member@example.invalid'}});check('admin_write_requires_csrf',r.status===403);
 r=await request('/api/admin/invites',{method:'POST',cookie:owner,csrf:ownerSession.csrf,body:{email:'member@example.invalid'}});d=await r.json();check('admin_invite_created_in_D1',r.status===200&&typeof d.link==='string');const invite=new URL(d.link).searchParams.get('invite');
 const wrongInvite=await start(invite);r=await complete(wrongInvite,token({email:'wrong@example.invalid',googleSub:'wrong-member'}));check('invite_email_binding_enforced',r.status===403);
 const memberChallenge=await start(invite);r=await complete(memberChallenge,token({email:'member@example.invalid',googleSub:'synthetic-member-google'}));check('invited_Firebase_exchange',r.status===200);const member=safeCookie(r);let memberSession=await session(member);check('invite_requires_explicit_acceptance',memberSession.user.status==='pending');
 r=await request('/api/invites/claim',{method:'POST',cookie:member,csrf:memberSession.csrf,body:{token:invite}});check('invite_acceptance_atomic',r.status===200);memberSession=await session(member);check('invited_member_active',memberSession.user.status==='active'&&memberSession.user.role==='member');
 r=await request('/api/invites/claim',{method:'POST',cookie:member,csrf:memberSession.csrf,body:{token:invite}});check('invite_reuse_refused',r.status===409);
 r=await request('/api/admin/summary',{cookie:member});check('member_cannot_open_admin',r.status===403);
 const row=await db.prepare('SELECT id FROM users WHERE google_sub=?').bind('synthetic-member-google').first();const ownerRow=await db.prepare('SELECT id FROM users WHERE google_sub=?').bind('synthetic-owner-google').first();
 const key='private/'+row.id+'/synthetic-note.txt';await bucket.put(key,'SYNTHETIC PRIVATE SOURCE');
 await db.prepare('INSERT INTO sources(id,user_id,title,author,source_url,access_method,content_hash,excerpt,object_key,mime,status,rights_attested,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)').bind('synthetic-source',row.id,'Synthetic source','','','upload','','SYNTHETIC PRIVATE SOURCE',key,'text/plain','draft',1,Math.floor(Date.now()/1000)).run();
 r=await request('/api/sources/file?id=synthetic-source',{cookie:owner});check('admin_does_not_inherit_member_private_file_access',r.status===404);
 r=await request('/api/sources/file?id=synthetic-source',{cookie:member});check('member_reads_own_R2_object',r.status===200&&(await r.text())==='SYNTHETIC PRIVATE SOURCE');
 r=await request('/api/admin/summary',{cookie:owner});d=await r.json();check('admin_summary_counts_not_content',r.status===200&&d.active===2&&!JSON.stringify(d).includes('SYNTHETIC PRIVATE SOURCE'));
 r=await request('/api/admin/members/status',{method:'POST',cookie:owner,csrf:ownerSession.csrf,body:{id:row.id,status:'suspended'}});check('admin_can_suspend_member',r.status===200);
 r=await request('/api/session',{cookie:member});check('suspension_revokes_existing_session',r.status===401);
 check('no_unapproved_network_egress',blockedEgress===0,{certificate_fixture_requests:certificateFetches});
 }catch(e){checks.push({name:'test_execution_error',passed:false,error:String(e).slice(0,1400)});}finally{
 if(mf){try{await mf.dispose();}catch(e){checks.push({name:'runtime_cleanup',passed:false,error:String(e).slice(0,300)});}}
 if(temp)fs.rmSync(temp,{recursive:true,force:true});
 const manifest=JSON.parse(fs.readFileSync(path.join(root,'artifacts/files_manifest.json')));
 const report={task_id:'KETO-RECOVERY-001',date:new Date().toISOString(),status:checks.every(x=>x.passed)?'passed':'failed',scope:'Latest exact modular build on local workerd with D1/R2. Firebase signature verification uses synthetic signed identities and certificate mock only. No browser, real Google sign-in, Azure inference, cloud release or clinical validation.',runtime_version:require('/opt/homebrew/lib/node_modules/cf/node_modules/miniflare/package.json').version,compatibility_date:'2026-10-03',production_date_not_tested:'2026-11-07',worker_sha256:manifest.files.find(x=>x.module_name==='worker-modules.mjs').sha256,checks,total_checks:checks.length,passed_checks:checks.filter(x=>x.passed).length,temporary_keys_removed:true,runtime_disposed:true};
 fs.writeFileSync(path.join(root,'qa/recovery-firebase-runtime.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));if(report.status!=='passed')process.exitCode=1;
}})();
