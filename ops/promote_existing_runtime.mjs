/** Trusted Cloudflare Builds only: bind a tested immutable runtime, never generated code. */
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {readPinnedApplication} from './runtime-app-pin.mjs';
const pin=JSON.parse(readFileSync('ops/approved-runtime.json','utf8'));
const manifest=JSON.parse(readFileSync('developer-runtime/build/manifest.json','utf8'));
if(process.env.KETO_PINNED_RUNNER_RELEASE!=='1'||pin.account!=='0609100baf768271ea2811c9a9ee2b16'||pin.worker!=='keto-companion-developer-runner'||pin.max_instances!==1)throw Error('OWNER_REVIEWED_RELEASE_REQUIRED');
if(manifest.baseline!==pin.baseline)throw Error('NEW_BASELINE_REQUIRES_REVIEWED_IMAGE_RELEASE');
if(!/^sha256:[a-f0-9]{64}$/.test(pin.image_digest)||!process.env.CLOUDFLARE_API_TOKEN)throw Error('NATIVE_RELEASE_NOT_CONFIGURED');
async function get(path){
 const response=await fetch('https://api.cloudflare.com/client/v4/accounts/'+pin.account+path,{headers:{Authorization:'Bearer '+process.env.CLOUDFLARE_API_TOKEN},signal:AbortSignal.timeout(20000)});
 const data=await response.json();if(!response.ok||data.success===false)throw Error('NATIVE_READ_FAILED_HTTP_'+response.status);return data.result;
}
const settings=await get('/workers/scripts/'+pin.worker+'/settings');
const values=Object.fromEntries(settings.bindings.filter(x=>x.type==='plain_text').map(x=>[x.name,x.text]));
if(values.DEVELOPER_BASELINE!==pin.baseline||values.DEVELOPER_IMAGE_DIGEST!==pin.image_digest)throw Error('LIVE_RUNNER_PIN_MISMATCH');
if(settings.bindings.some(x=>!['plain_text','durable_object_namespace'].includes(x.type)))throw Error('RUNTIME_BINDING_SCOPE_WIDENED');
const {image}=await readPinnedApplication(get,pin);
const release={account:pin.account,worker:pin.worker,baseline:pin.baseline,image,image_digest:pin.image_digest,worker_sha256:createHash('sha256').update(readFileSync('developer-runtime/dist/worker.mjs')).digest('hex'),max_instances:1,instance_type:pin.instance_type};
writeFileSync('developer-runtime/release.json',JSON.stringify(release,null,2)+'\n');
// This probe uses a fixed synthetic patch and never an owner/member data record.
// It deletes its temporary, token-gated bridge in finally and emits no credentials.
const test=spawnSync('node',['ops/run_guarded_runtime_acceptance.mjs'],{stdio:'inherit',timeout:390000,env:process.env});
if(test.error||test.status!==0)throw Error('PINNED_RUNTIME_ACCEPTANCE_FAILED');
const receipt=JSON.parse(readFileSync('docs/evidence/CF_DEV_CLOUD_RUNTIME_ACCEPTANCE.json','utf8'));
if(receipt.status!=='passed'||receipt.baseline!==pin.baseline||receipt.image_digest!==pin.image_digest||receipt.temporary_probe_deleted!==true)throw Error('PINNED_RUNTIME_RECEIPT_MISMATCH');
console.log('KETO_PINNED_RUNTIME_READY '+JSON.stringify({baseline:pin.baseline,image_digest:pin.image_digest,application_id:pin.application_id,max_instances:1,actual_cloud_container_acceptance:true,temporary_probe_deleted:true,rebuild:false,publication_broker:false}));
