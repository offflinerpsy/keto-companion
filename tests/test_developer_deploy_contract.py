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
