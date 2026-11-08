#!/usr/bin/env python3
"""Trusted native Cloudflare Builds gate; no GitHub Actions dependency.
Runs only committed owner-reviewed source, not developer-generated arbitrary code.
Generated patches belong in the separate network-denied test container.
"""
from pathlib import Path
import json,os,subprocess,sys,time
ROOT=Path(__file__).resolve().parents[1]
SAFE={k:v for k,v in os.environ.items() if k in ('PATH','HOME','LANG','LC_ALL','TMPDIR','SSL_CERT_FILE','SSL_CERT_DIR')}
SAFE.update(KETO_ENV='test',KETO_AUTH_MODE='local_test',KETO_LOCAL_DB='/tmp/keto-cloudflare-ci.sqlite',PYTHONDONTWRITEBYTECODE='1',PYTHONUTF8='1')
START=time.monotonic();CHECKS=[]
def run(label,args,limit=240):
    print('KETO_GATE_START '+label,flush=True)
    result=subprocess.run(args,cwd=ROOT,env=SAFE,timeout=limit,check=False)
    CHECKS.append({'name':label,'exit':result.returncode})
    if result.returncode:raise SystemExit(result.returncode)
    print('KETO_GATE_PASSED '+label,flush=True)
def main():
    run('python_env',[sys.executable,'-m','venv','.venv'],60)
    py=str(ROOT/'.venv/bin/python')
    run('python_dependencies',[py,'-m','pip','install','--disable-pip-version-check','-r','requirements-dev.txt'],240)
    run('node_dependencies',['npm','ci','--prefix','ui-sdk','--ignore-scripts','--no-fund'],120)
    run('runtime_fonts',[py,'scripts/prepare_pdf_fonts.py','--download'],90)
    run('all_python',[py,'-m','pytest','-q','tests','library/skills/keto-companion/tests'],240)
    node_tests=sorted(str(x.relative_to(ROOT)) for x in (ROOT/'cloudflare-saas/tests').glob('*.test.mjs'))
    run('all_node',['node','--test',*node_tests],240)
    run('legacy_ui',['node','tests/test_ui_no_browser.cjs'],60)
    run('legacy_oauth_ui',['node','tests/test_oauth_ui.cjs'],60)
    run('contracts',[py,'scripts/export_contracts.py','--check'],60)
    run('specification',[py,'scripts/verify_specification.py'],60)
    run('web_build',['node','cloudflare-saas/build.cjs'],60)
    run('legacy_build',['node','scripts/build_legacy_ui.cjs'],60)
    run('hygiene',[py,'scripts/verify_repository.py'],60)
    run('generated_assets_match',['git','diff','--exit-code','--','artifacts/files_manifest.json','cloudflare-saas/public/app.bundle.js','cloudflare-saas/public/style.css','cloudflare-saas/public/knowledge.html','cloudflare-saas/src/embedded-assets.mjs','cloudflare-saas/dist','service/static/app.bundle.js'],30)
    print('CLOUDFLARE_FULL_GATE_PASSED '+json.dumps({'checks':CHECKS,'seconds':round(time.monotonic()-START,2),'scope':'trusted reviewed source; no real data or paid model calls','github_actions_required':False}),flush=True)
if __name__=='__main__':main()
