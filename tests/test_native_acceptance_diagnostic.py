import json
from scripts.deploy_developer_native import acceptance_diagnostic


def test_native_failure_preserves_bounded_effect_state_without_raw_credentials():
    state={'run_id':'acf59876-4392-46ea-82db-508090eea120','job_id':'b32abdf7-29f1-473c-806f-932043b7605e','probe_name':'keto-developer-check-1234567890','upload':'delivered_unverified','readiness':'known_handler_shape','post':'possibly_delivered','post_count':1,'cleanup':'delivered_unverified','outcome':'verifier_failed','authorization':'private-sentinel','events':[{'method':'POST','status':502,'type':'non_json','body':'private-sentinel'}]}
    result=acceptance_diagnostic('Error: private-sentinel\nKETO_ACCEPTANCE_HTTP '+json.dumps(state))
    assert result['post']=='possibly_delivered'
    assert result['job_id']==state['job_id']
    assert result['events']==[{'method':'POST','status':502,'type':'non_json'}]
    assert 'private-sentinel' not in json.dumps(result)


def test_native_failure_uses_last_valid_structured_state_and_rejects_unknown_text():
    result=acceptance_diagnostic('KETO_ACCEPTANCE_HTTP '+json.dumps({'post':'not_delivered'})+'\nKETO_ACCEPTANCE_HTTP '+json.dumps({'post':'secret-value','probe_name':'private-sentinel','events':[{'method':'secret','status':'secret','type':'secret'}]})+'\nKETO_ACCEPTANCE_HTTP malformed')
    assert result['post'] is None
    assert 'probe_name' not in result
    assert result['events']==[{'method':'other','status':0,'type':'other'}]
    assert acceptance_diagnostic('Error: private-sentinel')=={'outcome':'diagnostic_unavailable'}
