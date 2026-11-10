"""Regressions for C19 cross-boundary correctness, security and performance audit."""
from __future__ import annotations
from datetime import datetime as real_datetime
import hashlib, hmac, json, subprocess, sys, time
from pathlib import Path
import pytest
from fastapi.testclient import TestClient
import service.domain as domain_mod
import service.kitchen as kitchen_mod
from service.app import create_app, TOOL_MAP, image_clean
from service.domain import Service, k, new_document
from service.edge_bridge import EdgeBridge, PATH
from service.portion_search import fit_portions
from service.store import SQLiteStore
from test_service import FakeBrain, consent, healthy, event, parsed

KEY = 'synthetic-edge-secret-not-a-real-production-key'
ROOT = Path(__file__).resolve().parents[1]

def signed_bridge(body: bytes, nonce: str, stamp: int | None = None) -> dict[str, str]:
    ts = str(int(time.time()) if stamp is None else stamp)
    material = '\n'.join(['POST', PATH, ts, nonce, hashlib.sha256(body).hexdigest()]).encode()
    sig = hmac.new(KEY.encode(), material, hashlib.sha256).hexdigest()
    return {'x-keto-timestamp': ts, 'x-keto-nonce': nonce, 'x-keto-signature': sig}

def test_edge_bridge_preserves_recipe_pagination_and_category(tmp_path):
    personal = SQLiteStore(tmp_path / 'personal.db')
    replay = SQLiteStore(tmp_path / 'replay.db')
    app = create_app(Service(personal, FakeBrain()), [], public_url='http://testserver', testing=True, edge_secret=KEY, edge_replay_store=replay)
    with TestClient(app) as client:
        p1 = json.dumps({'subject': 'synthetic-one', 'operation': 'recipes', 'state': None, 'arguments': {'limit': 12, 'offset': 0}}).encode()
        p2 = json.dumps({'subject': 'synthetic-one', 'operation': 'recipes', 'state': None, 'arguments': {'limit': 12, 'offset': 12}}).encode()
        pc = json.dumps({'subject': 'synthetic-one', 'operation': 'recipes', 'state': None, 'arguments': {'limit': 24, 'offset': 0, 'category': 'component'}}).encode()
        r1 = client.post(PATH, content=p1, headers=signed_bridge(p1, 'A' * 43)).json()['response']
        r2 = client.post(PATH, content=p2, headers=signed_bridge(p2, 'B' * 43)).json()['response']
        rc = client.post(PATH, content=pc, headers=signed_bridge(pc, 'C' * 43)).json()['response']
        assert r1['offset'] == 0 and r2['offset'] == 12
        ids1 = {r['recipe_id'] for r in r1['recipes']}
        ids2 = {r['recipe_id'] for r in r2['recipes']}
        assert ids1 and ids2 and ids1.isdisjoint(ids2)
        assert rc['recipes'] and all(r['category'] == 'component' for r in rc['recipes'])

def test_second_option_resolves_recipes_above_72_threshold(tmp_path):
    brain = FakeBrain()
    svc = Service(SQLiteStore(tmp_path / 'second.db'), brain)
    consent(svc)
    healthy(svc)
    brain.result = dict(parsed('recipes'), query='суп')
    first = svc.chat('synthetic-one', 'Найди суп', 'req_soup_0001')
    ids = [r['recipe_id'] for r in first['recipes']]
    assert len(ids) >= 2 and any(int(rid[1:]) > 32 for rid in ids[:2] if rid.startswith('M'))
    brain.result = dict(parsed('recipes'), query='')
    second = svc.chat('synthetic-one', 'Покажи второй вариант', 'req_soup_0002')
    assert [r['recipe_id'] for r in second['recipes']] == [ids[1]]

def test_accept_day_locks_proposed_date_across_midnight(tmp_path, monkeypatch):
    svc = Service(SQLiteStore(tmp_path / 'day.db'), FakeBrain())
    consent(svc)
    healthy(svc)
    targets = {
        'energy_min_kcal': 1200, 'energy_max_kcal': 3800,
        'protein_min_g': 40, 'protein_max_g': 260,
        'carb_basis': 'total', 'carb_max_g': 120,
        'fiber_min_g': 0, 'saturated_fat_max_pct': 30,
        'status': 'agreed', 'agreed_at': '2026-11-10T20:00:00Z', 'basis_note': 'synthetic test'
    }
    event(svc, 'targets.update', targets)
    spec = {'mode': 'inspiration', 'meal': 'day', 'time_budget': 40, 'equipment': 'pan', 'servings': 1, 'pantry': []}
    gen = svc.kitchen('synthetic-one', 'generate', spec=spec, request_id='day_midnight_01')
    assert gen['day']['status'] == 'calculated_draft'
    current_iso = ['2026-11-10T23:59:30+03:00']
    class ClockDateTime(real_datetime):
        @classmethod
        def now(cls, tz=None):
            dt = real_datetime.fromisoformat(current_iso[0])
            return dt.astimezone(tz) if tz else dt.replace(tzinfo=None)
    monkeypatch.setattr(domain_mod, 'datetime', ClockDateTime)
    monkeypatch.setattr(kitchen_mod, 'datetime', ClockDateTime)
    rev = svc.opened('synthetic-one')['state']['revision']
    prop = svc.kitchen('synthetic-one', 'accept_day', recipe_id=gen['recipes'][0]['recipe_id'], expected_revision=rev)
    assert prop['proposal']['preview']['date'] == '2026-11-10'
    current_iso[0] = '2026-11-11T00:02:10+03:00'
    applied = svc.apply('synthetic-one', prop['proposal']['id'], prop['state']['revision'], True)
    assert applied['state']['plans'][-1]['days'][0]['date'] == '2026-11-10'

def test_kitchen_generate_replay_refused_under_clinical_hold(tmp_path):
    svc = Service(SQLiteStore(tmp_path / 'hold.db'), FakeBrain())
    consent(svc)
    spec = {'mode': 'inspiration', 'meal': 'dinner', 'time_budget': 25, 'equipment': 'pan', 'servings': 1, 'pantry': []}
    ok = svc.kitchen('synthetic-one', 'generate', spec=spec, request_id='gen_hold_replay_01')
    assert len(ok['recipes']) == 3
    d, v = svc.load('synthetic-one')
    d['holds'] = ['urgent']
    svc.save('synthetic-one', d, v)
    with pytest.raises(k.SafetyError):
        svc.kitchen('synthetic-one', 'generate', spec=spec, request_id='gen_hold_replay_01')

def test_fit_portions_accepts_valid_zero_fiber_constraint():
    calcs = [
        {'nutrition': {'energy_kcal': 600.0, 'protein_g': 45.0, 'carbohydrate_total_g': 2.0, 'net_carbohydrate_g': 2.0, 'fiber_g': 0.0, 'saturated_fat_g': 4.0}},
        {'nutrition': {'energy_kcal': 700.0, 'protein_g': 50.0, 'carbohydrate_total_g': 3.0, 'net_carbohydrate_g': 3.0, 'fiber_g': 0.0, 'saturated_fat_g': 5.0}},
        {'nutrition': {'energy_kcal': 500.0, 'protein_g': 35.0, 'carbohydrate_total_g': 1.0, 'net_carbohydrate_g': 1.0, 'fiber_g': 0.0, 'saturated_fat_g': 3.0}},
    ]
    targets = {
        'energy_min_kcal': 1600, 'energy_max_kcal': 2000,
        'protein_min_g': 100, 'protein_max_g': 160,
        'carb_basis': 'total', 'carb_max_g': 30,
        'fiber_min_g': 0, 'saturated_fat_max_pct': 20,
    }
    factors = fit_portions(calcs, targets)
    assert factors is not None and len(factors) == 3

def test_streaming_body_limit_rejects_oversized_chunked_payload(tmp_path):
    code = 'synthetic_test_access_code_never_production_123456789'
    auth = [{'subject': 'synthetic-one', 'sha256': hashlib.sha256(code.encode()).hexdigest(), 'kind': 'demo'}]
    svc = Service(SQLiteStore(tmp_path / 'stream.db'), FakeBrain())
    app = create_app(svc, auth, 'test_signing_secret', 'http://testserver', testing=True)
    with TestClient(app) as client:
        login = client.post('/api/login', json={'access_code': code})
        assert login.status_code == 200
        csrf = login.json()['csrf']
        def chunks():
            for _ in range(18):
                yield b'a' * 100_000
        r = client.post('/api/tools/keto_open', content=chunks(), headers={'x-csrf-token': csrf, 'content-type': 'application/json'})
        assert r.status_code == 413

def test_edge_bridge_throttles_replay_pruning_off_hot_path(tmp_path):
    class CountingStore(SQLiteStore):
        def __init__(self, path):
            super().__init__(path)
            self.prune_calls = 0
        def prune_edge_replay(self, now):
            self.prune_calls += 1
    store = CountingStore(tmp_path / 'prune.db')
    now_val = [1_760_000_000]
    bridge = EdgeBridge(KEY, store, FakeBrain(), TOOL_MAP, image_clean, clock=lambda: now_val[0])
    for idx, ch in enumerate(('D', 'E', 'F')):
        body = json.dumps({'subject': 'synthetic-one', 'operation': 'open', 'state': None, 'arguments': {}}).encode()
        hdr = signed_bridge(body, ch * 43, stamp=now_val[0])
        bridge.execute('POST', PATH, hdr['x-keto-timestamp'], hdr['x-keto-nonce'], hdr['x-keto-signature'], body)
        now_val[0] += 10
    assert store.prune_calls == 1
    now_val[0] += 60
    body = json.dumps({'subject': 'synthetic-one', 'operation': 'open', 'state': None, 'arguments': {}}).encode()
    hdr = signed_bridge(body, 'G' * 43, stamp=now_val[0])
    bridge.execute('POST', PATH, hdr['x-keto-timestamp'], hdr['x-keto-nonce'], hdr['x-keto-signature'], body)
    assert store.prune_calls == 2

def test_self_check_passes_current_library():
    p = subprocess.run([sys.executable, 'library/skills/keto-companion/scripts/self_check.py'], cwd=ROOT, capture_output=True, text=True, check=True)
    data = json.loads(p.stdout)
    assert data['status'] == 'passed' and data['foods'] == 85 and data['recipes'] == 108

def test_catalog_cache_isolates_mutations_and_recomputes_modified_nutrients():
    c1 = k.load_catalog()
    base_b01 = k.calculate_recipe(c1, 'B01')
    fid = c1['recipes']['B01']['ingredients'][0]['food_id']
    c1['foods'][fid]['energy_kcal'] = float(c1['foods'][fid]['energy_kcal']) + 1000.0
    c1['foods'][fid]['allergens'].append('mustard')
    mutated_b01 = k.calculate_recipe(c1, 'B01')
    assert mutated_b01['nutrition']['energy_kcal'] > base_b01['nutrition']['energy_kcal'] + 50
    assert 'mustard' in mutated_b01['allergens']
    c1['foods'][fid]['fiber_g'] = None
    missing_fiber = k.calculate_recipe(c1, 'B01')
    assert missing_fiber['nutrition']['fiber_g'] is None and missing_fiber['coverage']['fiber_g']['complete'] is False
    c2 = k.load_catalog()
    assert 'mustard' not in c2['foods'][fid]['allergens'] and c2['foods'][fid]['fiber_g'] is not None
    merged = k.merge_personal_catalog(c2, {})
    merged['foods'][fid]['allergens'].append('celery')
    assert 'celery' not in c2['foods'][fid]['allergens']
