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
        if stage in ('image_build','network_none_acceptance'):
            # This stage receives a credential-free environment and a sanitized context.
            # Expose only its dependency/compiler diagnostics, never auth-stage output.
            diagnostic=(result.stdout+'\n'+result.stderr)[-7000:]
            diagnostic=re.sub(r'(?i)(token|password|authorization|secret)([=: ]+)[^\s]+',r'\1\2[redacted]',diagnostic)
            print('KETO_SAFE_STAGE_DIAGNOSTIC '+stage+' '+diagnostic,flush=True)
        elif stage=='official_registry_push':
            output=(result.stdout+'\n'+result.stderr).lower()
            reason='authorization_or_permission' if any(x in output for x in ['unauthorized','permission','forbidden','authentication','403','401']) else 'registry_transport_or_cli'
            print('KETO_REGISTRY_FAILURE_CLASS '+reason,flush=True)
        raise RuntimeError(stage+' failed, exit='+str(result.returncode)+'; no credentials exported')
    return result.stdout

def api(method,path,body=None):
    token=os.environ.get('CLOUDFLARE_API_TOKEN')
    if not token:raise RuntimeError('Existing native Cloudflare authorization required')
    request=urllib.request.Request('https://api.cloudflare.com/client/v4'+path,method=method,data=None if body is None else json.dumps(body).encode(),headers={'Authorization':'Bearer '+token,'Content-Type':'application/json'})
    try:
        with urllib.request.urlopen(request,timeout=30) as response:data=json.load(response)
    except urllib.error.HTTPError as e:
        # Only public numeric codes and uppercase reason identifiers; never dump auth/input.
        try:
            payload=json.loads(e.read(8192));errors=payload.get('errors',[])
            codes=[x.get('code') for x in errors if isinstance(x.get('code'),int)]
            reasons=sorted(set(re.findall(r'\b[A-Z][A-Z0-9_]{5,100}\b',' '.join(str(x.get('message','')) for x in errors))))
        except (ValueError,TypeError,AttributeError):codes=[];reasons=[]
        raise RuntimeError('Cloudflare operation failed '+method+' HTTP'+str(e.code)+' codes='+str(codes)+' reasons='+','.join(reasons)) from None
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
        fonts=next((p for p in [ROOT/'runtime-fonts',ROOT/'.runtime-fonts'] if (p/'NotoSans-Regular.ttf').is_file() and (p/'NotoSans-Bold.ttf').is_file()),None)
        if fonts is None:raise RuntimeError('Verified runtime fonts must be prepared by the CI stage')
        shutil.copytree(fonts,context/'.runtime-fonts')
        safe={k:v for k,v in os.environ.items() if k in ('PATH','HOME','LANG','LC_ALL','TMPDIR','DOCKER_HOST','DOCKER_CONTEXT')}
        # Trusted pinned dependency build needs the CI host network for nested-Docker DNS.
        # Candidate code is NOT part of Dockerfile instructions and still runs --network=none.
        run('image_build',['docker','build','--network=host','--platform','linux/amd64','--provenance=false','--build-arg','NODE_IMAGE='+NODE,'--build-arg','PYTHON_IMAGE='+PYTHON,'-f',str(context/'developer-runtime/Dockerfile'),'-t',tag,str(context)],timeout=900,env=safe)
        # Cloudflare Builds can build images but its nested cgroup runtime cannot launch
        # Docker containers. Execute the acceptance in actual Cloudflare Containers below.
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
    run('cloud_container_acceptance',['node','scripts/verify_developer_cloud_runtime.mjs'],timeout=390)
    result=json.loads((ROOT/'docs/evidence/CF_DEV_CLOUD_RUNTIME_ACCEPTANCE.json').read_text())
    if result['baseline']!=baseline or result['image_digest']!=digest or result['status']!='passed' or not result['temporary_probe_deleted']:raise RuntimeError('Cloud runtime acceptance incomplete')
    receipt={'task':'CF-DEV-MEDIA-08','baseline':baseline,'image_digest':digest,'application_id':app['id'],'max_instances':1,'network_policy':'Container class enableInternet=false; no egress exceptions','stages':[{k:v for k,v in s.items() if k!='log'} for s in result['stages']],'private_credentials_transported_to_agent':False,'publication_broker':False,'runtime_user_flow_tested':False,'actual_cloud_container_acceptance':True,'temporary_probe_deleted':result['temporary_probe_deleted']}
    (ROOT/'docs/evidence/CF_NATIVE_DEVELOPER_IMAGE.json').write_text(json.dumps(receipt,indent=2)+'\n')
    print('KETO_NATIVE_RUNNER_READY '+json.dumps(receipt),flush=True)
if __name__=='__main__':main()
