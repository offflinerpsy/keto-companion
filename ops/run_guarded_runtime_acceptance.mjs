/** Native CI entry: preserve the trusted verifier, with bounded HTTP evidence. */
import {mkdirSync,writeFileSync,renameSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
import {runGuardedTerminal} from './runtime-acceptance-http.mjs';
const runId=randomUUID(),receiptPath='qa/runtime-acceptance-http-'+runId+'.json';
function persist(state){mkdirSync('qa',{recursive:true});const data=JSON.stringify({run_id:runId,...state});writeFileSync(receiptPath+'.tmp',data+'\n',{mode:0o600});renameSync(receiptPath+'.tmp',receiptPath);console.log('KETO_ACCEPTANCE_HTTP '+data)}
if(!await runGuardedTerminal({fetcher:globalThis.fetch,persist,importVerifier:()=>import('../scripts/verify_developer_cloud_runtime.mjs')}))process.exitCode=1;
