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
