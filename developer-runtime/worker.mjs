import {Container} from '@cloudflare/containers';
import {WorkerEntrypoint} from 'cloudflare:workers';
export class KetoTester extends Container {
 defaultPort=8080;sleepAfter='5m';enableInternet=false;
 async executeJob(job){
  await this.ctx.blockConcurrencyWhile(async()=>{if(await this.ctx.storage.get('jobState'))throw Error('RUNNER_REPLAY_OR_CANCELLED');await this.ctx.storage.put('jobState','running')});
  try{
   await this.startAndWaitForPorts({startOptions:{enableInternet:false},ports:8080,cancellationOptions:{instanceGetTimeoutMS:60000,portReadyTimeoutMS:15000}});
   if(await this.ctx.storage.get('jobState')!=='running')throw Error('RUNNER_CANCELLED');
   const response=await this.containerFetch(new Request('http://container/run',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(job),signal:AbortSignal.timeout(250000)}));
   const reader=response.body.getReader();let length=0,parts=[];while(true){const {value,done}=await reader.read();if(done)break;length+=value.length;if(length>100000){await reader.cancel();throw Error('RUNNER_RESPONSE_LIMIT')}parts.push(value)}
   if(!response.ok||await this.ctx.storage.get('jobState')!=='running')throw Error('RUNNER_FAILED_OR_CANCELLED');
   const bytes=new Uint8Array(length);let at=0;for(const part of parts){bytes.set(part,at);at+=part.length}return JSON.parse(new TextDecoder().decode(bytes));
  }finally{if(await this.ctx.storage.get('jobState')==='running')await this.ctx.storage.put('jobState','finished');await this.destroy()}
 }
 async cancelJob(){await this.ctx.storage.put('jobState','cancelled');await this.destroy();return {cancelled:true}}
}

const idOK=id=>typeof id==='string'&&/^[a-f0-9-]{36}$/.test(id);
export class DeveloperRunner extends WorkerEntrypoint {
 async metadata(){return {baseline:this.env.DEVELOPER_BASELINE,image_digest:this.env.DEVELOPER_IMAGE_DIGEST}}
 async run(job){
  if(!idOK(job?.job_id)||job.baseline!==this.env.DEVELOPER_BASELINE||!/^sha256:[a-f0-9]{64}$/.test(this.env.DEVELOPER_IMAGE_DIGEST||''))throw Error('RUNNER_BASELINE_MISMATCH');
  const stub=this.env.KETO_TESTER.getByName(job.job_id);
  const result=await stub.executeJob(job);return {...result,image_digest:this.env.DEVELOPER_IMAGE_DIGEST};
 }
 async cancel(jobId){if(!idOK(jobId))throw Error('JOB_ID');const stub=this.env.KETO_TESTER.getByName(jobId);return stub.cancelJob()}
 async fetch(){return new Response('Not Found',{status:404})}
}
export default {fetch(){return new Response('Not Found',{status:404})}};
