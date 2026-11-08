/** Trusted native Cloudflare Builds only. No candidate code or user content executes here. */
import {readFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
const account='0609100baf768271ea2811c9a9ee2b16',name='keto-companion-developer-runner';
const path='/accounts/'+account+'/workers/scripts/'+name;
const cfg=JSON.parse(readFileSync('developer-runtime/release.json','utf8'));
if(cfg.account!==account||cfg.worker!==name||!/^[a-f0-9]{64}$/.test(cfg.baseline)||!/^sha256:[a-f0-9]{64}$/.test(cfg.image_digest)||!cfg.image.startsWith('registry.cloudflare.com/'+account+'/keto-developer-runner@')||!cfg.image.endsWith(cfg.image_digest))throw Error('Invalid isolated runner release descriptor');
const source=readFileSync('developer-runtime/dist/worker.mjs');
if(createHash('sha256').update(source).digest('hex')!==cfg.worker_sha256)throw Error('Isolated runner artifact checksum mismatch');
const token=process.env.CLOUDFLARE_API_TOKEN;
if(!token||process.env.CLOUDFLARE_ACCOUNT_ID&&process.env.CLOUDFLARE_ACCOUNT_ID!==account)throw Error('Native build authorization unavailable');
async function api(method,url,body,missing=false){const r=await fetch('https://api.cloudflare.com/client/v4'+url,{method,headers:{Authorization:'Bearer '+token,...(body instanceof FormData?{}:{'Content-Type':'application/json'})},body:body===undefined?undefined:body instanceof FormData?body:JSON.stringify(body)});if(missing&&r.status===404)return null;const d=await r.json();if(!r.ok||d.success===false)throw Error('Isolated worker operation failed '+method+' '+r.status);return d.result}
const current=await api('GET',path+'/settings',undefined,true);
const metadata={main_module:'worker.mjs',compatibility_date:'2026-11-07',compatibility_flags:['nodejs_compat'],containers:[{class_name:'KetoTester'}],bindings:[{type:'durable_object_namespace',name:'KETO_TESTER',class_name:'KetoTester'},{type:'plain_text',name:'DEVELOPER_BASELINE',text:cfg.baseline},{type:'plain_text',name:'DEVELOPER_IMAGE_DIGEST',text:cfg.image_digest}],observability:{enabled:false},logpush:false,tags:['keto','developer-isolated','baseline:'+cfg.baseline]};
if(!current)metadata.migrations={new_tag:'keto-tester-v1',new_sqlite_classes:['KetoTester']};
const form=new FormData();form.append('metadata',new Blob([JSON.stringify(metadata)],{type:'application/json'}));form.append('worker.mjs',new Blob([source],{type:'application/javascript+module'}),'worker.mjs');
const deployed=await api('PUT',path,form);await api('POST',path+'/subdomain',{enabled:false,previews_enabled:false});
console.log(JSON.stringify({task:'CF-DEV-MEDIA-08',worker:name,version_id:deployed.deployment_id,baseline:cfg.baseline,image_digest:cfg.image_digest,external_http_enabled:false,personal_bindings:[],public_model_or_repository_credentials:[],container_application_provisioning:'separate authenticated step; no hidden claim'}));
