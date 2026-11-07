"""Verify tracked content and pinned build hashes; never print suspected secrets."""
from __future__ import annotations
from pathlib import Path
import hashlib,json,re,subprocess,sys
ROOT=Path(__file__).resolve().parents[1]
def main()->int:
    p=subprocess.run(['git','ls-files','-z','--cached','--others','--exclude-standard'],cwd=ROOT,capture_output=True,check=True)
    names=sorted(set(x for x in p.stdout.decode().split('\0') if x))
    errors=[]
    forbidden={'.private','.venv','node_modules','__pycache__','.pytest_cache','plugin-source'}
    patterns={
        'private_key_material':re.compile(r'-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----'),
        'github_credential':re.compile(r'\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{50,})\b'),
        'azure_storage_key':re.compile(r'AccountKey=[A-Za-z0-9+/]{40,}={0,2}'),
        'signed_download_url':re.compile(r'https?://[^\s"<>]+[?&](?:sig|X-Amz-Signature|X-Goog-Signature)=[A-Za-z0-9%+/]{24,}'),
        'google_oauth_client_secret':re.compile(r'\bGOCSPX-[A-Za-z0-9_-]{20,}\b'),
        'openai_secret':re.compile(r'\bsk-(?:proj-|svcacct-)[A-Za-z0-9_-]{40,}\b'),
    }
    for name in names:
        path=Path(name)
        if any(x in forbidden for x in path.parts) or path.suffix in {'.pem','.key','.pfx','.p12','.sqlite','.db','.log','.pid'} or path.name.startswith('.env') and path.name!='.env.example':
            errors.append({'path':name,'rule':'forbidden_path'});continue
        full=ROOT/path
        if not full.exists():errors.append({'path':name,'rule':'tracked_missing'});continue
        if full.is_symlink():errors.append({'path':name,'rule':'symlink_not_allowed'});continue
        data=full.read_bytes()
        if len(data)>8_000_000:errors.append({'path':name,'rule':'unexpected_large_file'})
        try:text=data.decode('utf-8')
        except UnicodeDecodeError:continue
        for rule,regex in patterns.items():
            if regex.search(text):errors.append({'path':name,'rule':rule})
    manifest=json.loads((ROOT/'artifacts/files_manifest.json').read_text())
    for item in manifest['files']:
        path=ROOT/item['path']
        if not path.is_file() or hashlib.sha256(path.read_bytes()).hexdigest()!=item['sha256']:
            errors.append({'path':item['path'],'rule':'artifact_hash_mismatch'})
    output={'checked_files':len(names),'build_artifacts':len(manifest['files']),'passed':not errors,'findings':errors,'scope':'High-confidence patterns and path allowlist, not exhaustive secret detection or clinical/security validation'}
    print(json.dumps(output,ensure_ascii=False,indent=2))
    return 1 if errors else 0
if __name__=='__main__':sys.exit(main())
