/** Native Cloudflare Builds release: only this private KETO staging Worker. */
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const account='0609100baf768271ea2811c9a9ee2b16',worker='keto-companion-saas-staging';
const token=process.env.CLOUDFLARE_API_TOKEN;
if(!token)throw Error('Cloudflare Builds deployment credential is missing');
if(process.env.CLOUDFLARE_ACCOUNT_ID&&process.env.CLOUDFLARE_ACCOUNT_ID!==account)throw Error('Unexpected Cloudflare account');
const commit=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const manifest=JSON.parse(readFileSync('artifacts/files_manifest.json','utf8'));
const modules=manifest.files.filter(f=>f.module_name&&f.module_name!=='worker.mjs');
if(modules.length!==8)throw Error('Unexpected release module count');
for(const file of modules){const bytes=readFileSync(file.path);if(bytes.length!==file.bytes||createHash('sha256').update(bytes).digest('hex')!==file.sha256)throw Error('Release checksum mismatch: '+file.path)}
const auth=JSON.parse(readFileSync('qa/firebase-public-config.json','utf8'));
if(auth.projectId!=='keto-companion-auth-261107')throw Error('Unexpected identity project');
async function api(method,path,body){const response=await fetch('https://api.cloudflare.com/client/v4'+path,{method,headers:{Authorization:'Bearer '+token,...(body instanceof FormData?{}:{'Content-Type':'application/json'})},body:body===undefined?undefined:body instanceof FormData?body:JSON.stringify(body)});const data=await response.json();if(!response.ok||data.success===false)throw Error('Cloudflare '+method+' '+path+' failed ('+response.status+'): '+JSON.stringify(data.errors));return data.result}
const path='/accounts/'+account+'/workers/scripts/'+worker;
const secrets=await api('GET',path+'/secrets');if(!secrets.some(x=>x.name==='SESSION_HMAC_KEY'))throw Error('Staging session secret not provisioned');
const metadata={main_module:'worker-modules.mjs',compatibility_date:'2026-11-07',keep_bindings:['secret_text'],bindings:[{type:'d1',name:'DB',database_id:'981e963a-d4c1-4db0-b9a7-bf62eb0fede4'},{type:'r2_bucket',name:'UPLOADS',bucket_name:'keto-companion-private-staging'},{type:'plain_text',name:'PUBLIC_ORIGIN',text:'https://keto-companion-saas-staging.offflinerpsy.workers.dev'},{type:'plain_text',name:'OWNER_GOOGLE_EMAIL',text:'offflinerpsy@gmail.com'},{type:'plain_text',name:'AUTH_PROVIDER',text:'firebase_google'},{type:'plain_text',name:'FIREBASE_PUBLIC_CONFIG_JSON',text:JSON.stringify(auth)}],observability:{enabled:false},logpush:false,tags:['keto','staging','commit:'+commit]};
if(secrets.some(x=>x.name==='KETO_EDGE_SIGNING_JWK'))metadata.bindings.push({type:'plain_text',name:'KETO_EDGE_BRIDGE_URL',text:'https://keto-companion-ay-20261107.azurewebsites.net/internal/keto/compute'});
const form=new FormData();form.append('metadata',new Blob([JSON.stringify(metadata)],{type:'application/json'}));for(const f of modules)form.append(f.module_name,new Blob([readFileSync(f.path)],{type:f.mime}),f.module_name);
const deployed=await api('PUT',path,form);await api('POST',path+'/subdomain',{enabled:true,previews_enabled:false});
console.log(JSON.stringify({task:'KETO-RELEASE-002',worker,account,commit,version_id:deployed.deployment_id,tag:deployed.tag,main_module_sha256:modules.find(x=>x.module_name==='worker-modules.mjs').sha256,modules:modules.length,compute_configured:secrets.some(x=>x.name==='KETO_EDGE_SIGNING_JWK'),private_source:true}));
