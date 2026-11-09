"""Installed-code evidence is independent of environment labels and ZIP metadata."""
import hashlib
import io
import zipfile
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
import service.app as runtime
from service.domain import Service,VERSION
from service.store import SQLiteStore
from test_service import FakeBrain


@pytest.fixture
def installed_sources(tmp_path):
    root=tmp_path/'installed'
    source=Path(runtime.__file__).resolve().parents[1]
    for relative in runtime.RUNTIME_CODE_FILES:
        path=root/relative
        path.parent.mkdir(parents=True,exist_ok=True)
        path.write_bytes((source/relative).read_bytes())
    return root


def test_exact_zip_members_match_installed_digest(installed_sources):
    # Deployment verification reads the ZIP, not a working-tree label. Reverse
    # member order and unrelated metadata must not change the framed digest.
    assert runtime.RUNTIME_CODE_FILES==tuple(sorted(set(runtime.RUNTIME_CODE_FILES)))
    stream=io.BytesIO()
    with zipfile.ZipFile(stream,'w',zipfile.ZIP_DEFLATED) as archive:
        for relative in reversed(runtime.RUNTIME_CODE_FILES):
            info=zipfile.ZipInfo(relative,date_time=(2020,1,1,0,0,0))
            archive.writestr(info,(installed_sources/relative).read_bytes())
        archive.writestr('public-release-label.json',b'{"source_commit":"not-proof-of-installed-code"}')
    with zipfile.ZipFile(io.BytesIO(stream.getvalue())) as archive:
        framing=b'keto-runtime-code-v1\n'+b''.join(
            name.encode('utf-8')+b'\0'+hashlib.sha256(archive.read(name)).hexdigest().encode('ascii')+b'\n'
            for name in sorted(runtime.RUNTIME_CODE_FILES)
        )
    assert runtime.runtime_code_sha256(installed_sources)==hashlib.sha256(framing).hexdigest()


def test_every_listed_source_changes_digest_and_unlisted_state_does_not(installed_sources):
    initial=runtime.runtime_code_sha256(installed_sources)
    for relative in runtime.RUNTIME_CODE_FILES:
        path=installed_sources/relative
        original=path.read_bytes()
        path.write_bytes(original+b'\n# synthetic deployment change\n')
        assert runtime.runtime_code_sha256(installed_sources)!=initial,relative
        path.write_bytes(original)
    (installed_sources/'private-state.json').write_text('{"synthetic":"never part of this digest"}')
    assert runtime.runtime_code_sha256(installed_sources)==initial


def test_missing_critical_source_fails_create_app(installed_sources,monkeypatch):
    calculate=runtime.runtime_code_sha256
    monkeypatch.setattr(runtime,'runtime_code_sha256',lambda:calculate(installed_sources))
    (installed_sources/'service/intake.py').unlink()
    with pytest.raises(FileNotFoundError):
        runtime.create_app(testing=True)


def test_status_caches_startup_bytes_not_environment_or_later_disk(installed_sources,tmp_path,monkeypatch):
    calculate=runtime.runtime_code_sha256
    expected=calculate(installed_sources)
    calls=[]
    def startup_digest():
        calls.append(True)
        return calculate(installed_sources)
    monkeypatch.setattr(runtime,'runtime_code_sha256',startup_digest)
    monkeypatch.setenv('KETO_RUNTIME_CODE_SHA256','0'*64)
    monkeypatch.setenv('KETO_SOURCE_COMMIT','synthetic-release-label')
    # Keep these tests local and independent of any bridge environment.
    monkeypatch.delenv('KETO_EDGE_PUBLIC_JWK',raising=False)
    monkeypatch.delenv('KETO_EDGE_BRIDGE_SECRET',raising=False)
    svc=Service(SQLiteStore(tmp_path/'local.db'),FakeBrain())
    app=runtime.create_app(svc,[],public_url='http://testserver',testing=True)
    assert len(calls)==1
    with TestClient(app) as client:
        response=client.get('/status')
        assert response.status_code==200
        assert response.headers['cache-control']=='no-store'
        value=response.json()
        assert value=={
            'service':'KETO Companion','version':VERSION,'transport':'HTTP + MCP',
            'authentication_required':True,'medical_monitoring':False,
            'source_commit':'synthetic-release-label','runtime_code_sha256':expected,
            'edge_signature':'disabled',
        }
        assert client.get('/api/session').status_code==401
        path=installed_sources/'service/chat_actions.py'
        path.write_bytes(path.read_bytes()+b'\n# synthetic next release\n')
        assert calculate(installed_sources)!=expected
        assert client.get('/status?cache_bypass=synthetic').json()['runtime_code_sha256']==expected
        assert len(calls)==1
    second=runtime.create_app(svc,[],public_url='http://testserver',testing=True)
    with TestClient(second) as client:
        assert client.get('/status').json()['runtime_code_sha256']==calculate(installed_sources)
        assert len(calls)==2
    assert svc.store.read('synthetic-one')==(None,None)
