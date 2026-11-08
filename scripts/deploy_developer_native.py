"""Trusted owner-reviewed Cloudflare Builds release only, never candidate generated code.
Uses the existing native CI authorization through the official cf CLI. Does not
export registry credentials, send them to the model, or move them onto the Mac.
No new API tokens/permissions are created here. Failure stops the release.
"""
from pathlib import Path
import hashlib,json,os,re,shutil,subprocess,tempfile,time,uuid,urllib.request,urllib.error
ROOT=Path(__file__).resolve().parents[1]
ACCOUNT='0609100baf768271ea2811c9a9ee2b16'
NAME='keto-companion-developer-runner'
NODE='node:26.3.1-bookworm-slim@sha256:9898bb74f4ee319780e87819df703b3633113bc3422f151fd11155cf974a2749'
PYTHON='python:3.12.12-slim-bookworm@sha256:593bd06efe90efa80dc4eee3948be7c0fde4134606dd40d8dd8dbcade98e669c'
def run(stage,args,timeout=120,input=None,env=None):
    print('KETO_NATIVE_RUNNER '+stage,flush=True)
    result=subprocess.run(args,cwd=ROOT,input=input,capture_output=True,text=True,timeout=timeout,env=env)
    if result.returncode:
        # Logs may contain deployment credentials. Keep them inside the ephemeral build.
        (ROOT/'qa').mkdir(exist_ok=True)
        (ROOT/'qa'/('native-runner-'+stage+'.log')).write_text(result.stdout+'\n'+result.stderr)
        raise RuntimeError(stage+' failed, exit='+str(result.returncode)+'; no credentials exported')
    return result.stdout

def api(method,path,body=None):
    token=os.environ.get('CLOUDFLARE_API_TOKEN')
    if not token:raise RuntimeError('Existing native Cloudflare authorization required')
    request=urllib.request.Request('https://api.cloudflare.com/client/v4'+path,method=method,data=None if body is None else json.dumps(body).encode(),headers={'Authorization':'Bearer '+token,'Content-Type':'application/json'})
    try:
        with urllib.request.urlopen(request,timeout=30) as response:data=json.load(response)
    except urllib.error.HTTPError as e:raise RuntimeError('Cloudflare operation failed '+method+' HTTP'+str(e.code)) from None
    if data.get('success') is False:raise RuntimeError('Cloudflare operation unsuccessful')
    return data['result']
def main():
    if os.environ.get('KETO_NATIVE_RUNNER_RELEASE')!='1':raise RuntimeError('Explicit owner-reviewed release switch required')
    if os.environ.get('CLOUDFLARE_ACCOUNT_ID',ACCOUNT)!=ACCOUNT:raise RuntimeError('Unexpected account')
    run('docker_available',['docker','version','--format','{{.Server.Version}}'],20)
    manifest=json.loads((ROOT/'developer-runtime/build/manifest.json').read_text())
    baseline=manifest['baseline'];tag='keto-developer-runner:'+baseline[:16]
    with tempfile.TemporaryDirectory(prefix='keto-native-image-') as td:
        context=Path(td)/'context';context.mkdir()
        for relative in ['requirements.txt','requirements-dev.txt','ui-sdk/package.json','ui-sdk/package-lock.json','developer-runtime/build/source.tar.gz','developer-runtime/build/manifest.json','developer-runtime/runner.py','developer-runtime/Dockerfile']:
            target=context/relative;target.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(ROOT/relative,target)
        shutil.copytree(ROOT/'.runtime-fonts',context/'.runtime-fonts')
        safe={k:v for k,v in os.environ.items() if k in ('PATH','HOME','LANG','LC_ALL','TMPDIR','DOCKER_HOST','DOCKER_CONTEXT')}
        run('image_build',['docker','build','--platform','linux/amd64','--provenance=false','--build-arg','NODE_IMAGE='+NODE,'--build-arg','PYTHON_IMAGE='+PYTHON,'-f',str(context/'developer-runtime/Dockerfile'),'-t',tag,str(context)],timeout=900,env=safe)
        original=next(x for x in manifest['sources'] if x['path'].endswith('help.html'))
        files=[{'path':original['path'],'before_sha256':original['sha256'],'content':original['content']+'\n<!-- synthetic Cloudflare isolated acceptance -->\n'}]
        patch_hash=hashlib.sha256(json.dumps(files,ensure_ascii=False,separators=(',',':')).encode()).hexdigest()
        job={'job_id':str(uuid.uuid4()),'baseline':baseline,'patch_hash':patch_hash,'files':files}
        program="import sys,json,importlib.util;spec=importlib.util.spec_from_file_location('runner','/opt/trusted/runner.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m);print(json.dumps(m.execute(json.load(sys.stdin))))"
        command=['docker','run','--rm','--platform','linux/amd64','--network','none','--read-only','--cap-drop','ALL']
        for cap in ['CHOWN','SETUID','SETGID','KILL','DAC_OVERRIDE','FOWNER']:command+=['--cap-add',cap]
        command+=['--security-opt','no-new-privileges','--memory','2g','--cpus','2','--pids-limit','128','--tmpfs','/tmp:rw,nosuid,nodev,size=768m','-i','--entrypoint','/opt/venv/bin/python',tag,'-I','-c',program]
        result=json.loads(run('network_none_acceptance',command,timeout=270,input=json.dumps(job),env=safe))
        assert result['status']=='passed' and result['baseline']==baseline and result['patch_hash']==patch_hash and [s['name'] for s in result['stages']]==['syntax','build','product','python'] and all(s['exit_code']==0 for s in result['stages'])
        for stage in result['stages']:
            if stage['name'] in ('product','python'):assert stage['passed_count']>0
        # Official CLI handles the normal private registry push entirely inside CI.
        # No manual credential endpoint, credential relay, decryption or new token.
        authenv={**safe,'CLOUDFLARE_API_TOKEN':os.environ['CLOUDFLARE_API_TOKEN'],'CLOUDFLARE_ACCOUNT_ID':ACCOUNT,'CI':'true','DOCKER_CONFIG':str(Path(td)/'docker-auth')}
        Path(authenv['DOCKER_CONFIG']).mkdir(mode=0o700)
        run('official_registry_push',['npm','exec','--yes','--package=cf@1.0.0-beta.5','--','cf','containers','push','--tag',tag],timeout=600,env=authenv)
        reference='registry.cloudflare.com/'+ACCOUNT+'/'+tag
        digests=json.loads(run('image_digest',['docker','image','inspect',reference,'--format','{{json .RepoDigests}}'],20,env=authenv))
        image=next(x for x in digests if x.startswith('registry.cloudflare.com/'+ACCOUNT+'/keto-developer-runner@sha256:'))
        digest=image.rsplit('@',1)[1];assert re.fullmatch(r'sha256:[a-f0-9]{64}',digest)
    artifact=ROOT/'developer-runtime/dist/worker.mjs'
    release={'account':ACCOUNT,'worker':NAME,'baseline':baseline,'image':image,'image_digest':digest,'worker_sha256':hashlib.sha256(artifact.read_bytes()).hexdigest(),'max_instances':1,'instance_type':'standard-1','accepted_network':'none'}
    (ROOT/'developer-runtime/release.json').write_text(json.dumps(release,indent=2)+'\n')
    run('service_worker_deploy',['node','scripts/deploy_developer_runtime.mjs'],90)
    prefix='/accounts/'+ACCOUNT+'/containers/applications';apps=api('GET',prefix)
    if isinstance(apps,dict):apps=apps.get('applications',apps.get('items',[]))
    existing=next((x for x in apps if x.get('name')==NAME),None)
    if existing:
        if existing.get('configuration',{}).get('image')!=image:raise RuntimeError('Existing container image differs; explicit rollout required, not silently overwritten')
        if existing.get('max_instances')!=1:raise RuntimeError('Existing runtime bounds mismatch')
        app=existing
    else:
        app=api('POST',prefix,{'name':NAME,'scheduling_policy':'default','instances':0,'max_instances':1,'durable_objects':{'script_name':NAME,'class_name':'KetoTester'},'configuration':{'image':image,'instance_type':'standard-1'},'observability':{'logs':{'enabled':False}}})
    receipt={'task':'CF-DEV-MEDIA-08','baseline':baseline,'image_digest':digest,'application_id':app['id'],'max_instances':1,'network_policy':'Container class enableInternet=false; no egress exceptions','stages':[{k:v for k,v in s.items() if k!='log'} for s in result['stages']],'private_credentials_transported_to_agent':False,'publication_broker':False,'runtime_user_flow_tested':False}
    (ROOT/'docs/evidence/CF_NATIVE_DEVELOPER_IMAGE.json').write_text(json.dumps(receipt,indent=2)+'\n')
    print('KETO_NATIVE_RUNNER_READY '+json.dumps(receipt),flush=True)
if __name__=='__main__':main()
