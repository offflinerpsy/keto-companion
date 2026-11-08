"""Synthetic source/bridge/runtime checks; no real model or cloud calls."""
import base64,hashlib,importlib.util,io,json,os,sys
from pathlib import Path
import pytest
from PIL import Image
from service.developer import ALLOWED,DeveloperDesigner,validate_context
from service.brain import AzureBrain,BrainUnavailable
from service.edge_bridge import EdgeBridge,BridgeError,PATH
from service.app import TOOL_MAP,image_clean
from service.store import SQLiteStore
from test_edge_bridge import signed,payload,KEY
ROOT=Path(__file__).resolve().parents[1]
def context():return {'task':'Increase help spacing','baseline':'a'*64,'max_output_tokens':5000,'sources':[{'path':p,'sha256':hashlib.sha256(b'original\n').hexdigest(),'content':'original\n'} for p in ALLOWED]}
def response(patch):return {'status':'completed','usage':{'input_tokens':5,'output_tokens':10},'output':[{'content':[{'type':'output_text','text':json.dumps(patch)}]}]}
def patch():return {'summary':'Spacing','notes':'Not published','files':[{'path':ALLOWED[0],'before_sha256':hashlib.sha256(b'original\n').hexdigest(),'content':'changed\n'}]}
def test_developer_payload_exact_source_no_state_and_one_call():
    calls=[]
    def transport(p):calls.append(p);return response(patch())
    result=DeveloperDesigner(transport).propose(context());assert result['patch']==patch() and len(calls)==1
    p=calls[0];assert p['model']=='gpt-6.1-sol' and p['reasoning']=={'effort':'high'} and p['store'] is False and p['max_output_tokens']==5000
    assert json.loads(p['input'][0]['content'][0]['text'])==context()
@pytest.mark.parametrize('mutate',[lambda c:c.update(state={'diary':'private'}),lambda c:c.update(task='x'*2001),lambda c:c.update(max_output_tokens=5001),lambda c:c['sources'][0].update(path='service/domain.py'),lambda c:c['sources'][0].update(sha256='wrong')])
def test_developer_rejects_private_context_and_invalid_source_before_paid_call(mutate):
    c=context();mutate(c);calls=[]
    with pytest.raises(ValueError):DeveloperDesigner(lambda p:calls.append(p)).propose(c)
    assert calls==[]
@pytest.mark.parametrize('mutate',[lambda p:p['files'][0].update(path='../app.css'),lambda p:p['files'][0].update(before_sha256='wrong'),lambda p:p['files'][0].update(content='x'*60001),lambda p:p.update(files=[]),lambda p:p.update(passed=True)])
def test_model_output_cannot_expand_scope_or_claim_test_success(mutate):
    p=patch();mutate(p)
    with pytest.raises(BrainUnavailable):DeveloperDesigner(lambda _:response(p)).propose(context())
def test_signed_developer_operation_requires_none_state(tmp_path):
    bridge=EdgeBridge(KEY,SQLiteStore(tmp_path/'nonces.db'),None,TOOL_MAP,image_clean,developer=DeveloperDesigner(lambda _:response(patch())))
    def execute(body,nonce):
        h=signed(body,nonce);return bridge.execute('POST',PATH,h['x-keto-timestamp'],h['x-keto-nonce'],h['x-keto-signature'],body)
    assert execute(payload('developer_patch',None,context()),'D'*43)['state'] is None
    with pytest.raises(BridgeError):execute(payload('developer_patch',{'private':'must not send'},context()),'E'*43)
def test_actual_image_only_multimodal_bridge_payload(tmp_path):
    captured=[]
    output={'intent':'help','reply_ru':'Уточните состав и массу.','query':'','changes':[],'safety_signals':['none'],'days':1,'diary_note':''}
    brain=AzureBrain(transport=lambda p:(captured.append(p) or response(output)))
    bridge=EdgeBridge(KEY,SQLiteStore(tmp_path/'nonce.db'),brain,TOOL_MAP,image_clean)
    def run(op,state,args,nonce):
        b=payload(op,state,args);h=signed(b,nonce);return bridge.execute('POST',PATH,h['x-keto-timestamp'],h['x-keto-nonce'],h['x-keto-signature'],b)
    state=run('consent',None,{'processing':True,'storage':True,'health':True,'confirmed':True},'F'*43)['state']
    raw=io.BytesIO();Image.new('RGB',(2,2),'white').save(raw,format='PNG');image='data:image/png;base64,'+base64.b64encode(raw.getvalue()).decode()
    out=run('chat',state,{'message':'Помоги обсудить это фото; состав и массу нужно уточнить.','request_id':'synthetic-photo-only','image_data_url':image},'G'*43)
    content=captured[0]['input'][0]['content'];assert len(captured)==1 and content[1]['type']=='input_image' and content[1]['image_url'].startswith('data:image/jpeg;base64,');assert out['response']['model_called'] is True

def runner():
    spec=importlib.util.spec_from_file_location('trusted_runner',ROOT/'developer-runtime/runner.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m);return m

def test_runner_revalidates_hash_path_symlink_and_fixed_commands(tmp_path):
    r=runner();source=tmp_path/'source';target=source/ALLOWED[0];target.parent.mkdir(parents=True);target.write_text('original\n')
    files=patch()['files'];job={'job_id':'a'*8+'-aaaa-aaaa-aaaa-'+'a'*12,'baseline':'b'*64,'files':files,'patch_hash':r.digest(r.canonical_files(files))};manifest={'baseline':job['baseline']}
    r.validate_job(job,manifest,source)
    target.unlink();target.symlink_to(tmp_path/'other')
    with pytest.raises(ValueError):r.validate_job(job,manifest,source)
    target.unlink();target.write_text('tampered')
    with pytest.raises(ValueError):r.validate_job(job,manifest,source)
    assert [name for name,_ in r.STAGES]==['syntax','build','product','python']
    assert all(isinstance(cmd,list) and cmd[0] in ('node','/opt/venv/bin/python') for _,cmd in r.STAGES)
def test_snapshot_allowlist_and_deterministic_archive(tmp_path,monkeypatch):
    spec=importlib.util.spec_from_file_location('snapshot_builder',ROOT/'scripts/prepare_developer_snapshot.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
    for name in ['.private/key.json','qa/health.json','service/../.private/x.json','cloudflare-saas/node_modules/x.js','service/local.settings.json','deliverables/source.tar.gz','service/private.sqlite','cloudflare-saas/generated/x.mjs']:assert not m.permitted(name)
    assert m.permitted('service/domain.py')
    from types import SimpleNamespace
    inputs=[*ALLOWED,'service/domain.py','tests/test_developer.py']
    monkeypatch.setattr(m.subprocess,'run',lambda *a,**kw:SimpleNamespace(stdout=('\0'.join(inputs)+'\0').encode()))
    a=m.prepare(tmp_path/'a',tmp_path/'generated.mjs');b=m.prepare(tmp_path/'b',tmp_path/'generated.mjs');assert a==b
    import tarfile
    with tarfile.open(tmp_path/'a/source.tar.gz') as archive:
        names=archive.getnames();assert all(m.permitted(n) or n=='qa/firebase-public-config.json' for n in names);assert not any(x.issym() or x.islnk() for x in archive.getmembers())

@pytest.mark.parametrize('format,mime',[('WEBP','image/webp'),('GIF','image/gif')])
def test_uploaded_webp_gif_decodes_to_single_jpeg_without_metadata(format,mime):
    b=io.BytesIO();frames=[Image.new('RGB',(12,8),'red'),Image.new('RGB',(12,8),'blue')]
    if format=='GIF':frames[0].save(b,format='GIF',save_all=True,append_images=frames[1:],duration=100,loop=0)
    else:frames[0].save(b,format='WEBP')
    out=image_clean('data:'+mime+';base64,'+base64.b64encode(b.getvalue()).decode())
    decoded=Image.open(io.BytesIO(base64.b64decode(out.split(',',1)[1])))
    assert decoded.format=='JPEG' and decoded.size==(12,8) and not decoded.getexif()
    assert not getattr(decoded,'is_animated',False)
    red,green,blue=decoded.getpixel((0,0));assert red>200 and blue<50
