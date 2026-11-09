"""Contract regression for previously omitted container-enablement metadata."""
from pathlib import Path
import re,json
ROOT=Path(__file__).resolve().parents[1]
def test_worker_upload_declares_container_class_before_application_creation():
    source=(ROOT/'scripts/deploy_developer_runtime.mjs').read_text()
    assert "containers:[{class_name:'KetoTester'}]" in source
    assert "class_name:'KetoTester'" in source
    assert "if(!current)metadata.migrations=" in source
    assert "deleted_classes" not in source
    assert "enabled:false,previews_enabled:false" in source
    cfg=json.loads((ROOT/'developer-runtime/api-deployment.json').read_text())
    assert cfg['worker_upload_containers']==[{'class_name':'KetoTester'}]
def test_runtime_still_blocks_egress_and_new_personal_bindings():
    source=(ROOT/'developer-runtime/worker.mjs').read_text()
    assert 'enableInternet=false' in source and 'enableInternet:false' in source
    deployment=(ROOT/'scripts/deploy_developer_runtime.mjs').read_text()
    assert not any("type:'"+kind+"'" in deployment for kind in ['d1','r2_bucket','secret_text'])

def rollout_fixture(monkeypatch):
    import importlib.util
    spec=importlib.util.spec_from_file_location('native_release',ROOT/'scripts/deploy_developer_native.py');module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
    pin=json.loads((ROOT/'ops/approved-runtime.json').read_text());image='registry.cloudflare.com/'+module.ACCOUNT+'/keto-developer-runner@'+pin['image_digest'];existing={'id':pin['application_id'],'name':module.NAME,'configuration':{'image':image},'max_instances':1,'scheduling_policy':'default'}
    return module,pin,existing,'registry.cloudflare.com/'+module.ACCOUNT+'/keto-developer-runner@sha256:'+'a'*64

def test_rollout_requires_separate_exact_old_image_approval(monkeypatch):
    import pytest
    module,pin,existing,target=rollout_fixture(monkeypatch);monkeypatch.delenv('KETO_APPROVED_ROLLOUT',raising=False)
    with pytest.raises(RuntimeError,match='EXPLICIT_CURRENT_IMAGE'):module.approved_rollout(existing,pin,target,[])
    monkeypatch.setenv('KETO_APPROVED_ROLLOUT','1');request=module.approved_rollout(existing,pin,target,[{'status':{'state':'inactive'}}]);assert request['target_configuration']=={'image':target};assert request['step_percentage']==100
    existing['configuration']['image']='different'
    with pytest.raises(RuntimeError,match='EXPLICIT_CURRENT_IMAGE'):module.approved_rollout(existing,pin,target,[])

def test_rollout_never_interrupts_active_or_unknown_instances(monkeypatch):
    import pytest
    module,pin,existing,target=rollout_fixture(monkeypatch);monkeypatch.setenv('KETO_APPROVED_ROLLOUT','1')
    for state in ['running','starting','unknown']:
        with pytest.raises(RuntimeError,match='ACTIVE_JOB_NOT_INTERRUPTED'):module.approved_rollout(existing,pin,target,[{'status':{'state':state}}])

def test_pinned_application_uses_exact_detail_not_stale_collection(monkeypatch):
    import copy,pytest
    module,pin,detail,target=rollout_fixture(monkeypatch)
    prefix='/accounts/'+module.ACCOUNT+'/containers/applications'
    stale=copy.deepcopy(detail);stale['configuration']['image']='registry.cloudflare.com/'+module.ACCOUNT+'/keto-developer-runner@sha256:'+'1'*64
    paths=[]
    def request(method,path):
        paths.append((method,path))
        if path==prefix:return [stale]
        if path==prefix+'/'+pin['application_id']:return copy.deepcopy(detail)
        raise AssertionError('unexpected API request')
    resolved=module.resolve_application(prefix,pin,request)
    assert resolved==detail and paths==[('GET',prefix+'/'+pin['application_id'])]
    monkeypatch.setenv('KETO_APPROVED_ROLLOUT','1')
    assert module.approved_rollout(resolved,pin,target,[])['target_configuration']=={'image':target}
    for patch in [{'id':'other'},{'name':'other'},{'max_instances':2},{'scheduling_policy':'other'},{'configuration':{'image':stale['configuration']['image']}},{'configuration':{'image':detail['configuration']['image'],'environment_variables':[{'name':'x'}]}},{'configuration':{'image':detail['configuration']['image'],'authorized_keys':['x']}}]:
        bad={**detail,**patch}
        with pytest.raises(RuntimeError,match='EXPLICIT_CURRENT_IMAGE_APPROVAL_REQUIRED'):module.resolve_application(prefix,pin,lambda *_:bad)
    calls=[]
    def failed(*args):calls.append(args);raise RuntimeError('detail unavailable')
    with pytest.raises(RuntimeError,match='detail unavailable'):module.resolve_application(prefix,pin,failed)
    assert calls==[('GET',prefix+'/'+pin['application_id'])]
    with pytest.raises(RuntimeError,match='EXPLICIT_CURRENT_IMAGE_APPROVAL_REQUIRED'):module.resolve_application(prefix,{**pin,'application_id':'../bad'},failed)

def test_unpinned_bootstrap_only_when_no_existing_application(monkeypatch):
    import pytest
    module,_,existing,_=rollout_fixture(monkeypatch);prefix='/accounts/'+module.ACCOUNT+'/containers/applications'
    assert module.resolve_application(prefix,None,lambda *_:[]) is None
    with pytest.raises(RuntimeError,match='EXISTING_APPLICATION_REQUIRES_PIN'):module.resolve_application(prefix,None,lambda *_:[existing])


def test_native_acceptance_stage_uses_guarded_wrapper():
    import ast
    tree=ast.parse((ROOT/'scripts/deploy_developer_native.py').read_text())
    stages=[node for node in ast.walk(tree) if isinstance(node,ast.Call)
            and isinstance(node.func,ast.Name) and node.func.id=='run'
            and node.args and isinstance(node.args[0],ast.Constant)
            and node.args[0].value=='cloud_container_acceptance']
    assert len(stages)==1
    stage=stages[0]
    assert ast.literal_eval(stage.args[1])==['node','ops/run_guarded_runtime_acceptance.mjs']
    assert {kw.arg:ast.literal_eval(kw.value) for kw in stage.keywords}=={'timeout':390}
