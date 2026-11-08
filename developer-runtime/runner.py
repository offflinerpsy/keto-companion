"""Trusted root-owned HTTP runner; candidate code executes only as uid/gid 1000.
No secrets, network, model-selected commands or persistent workspaces.
"""
from __future__ import annotations
import hashlib,json,os,re,selectors,shutil,signal,subprocess,tarfile,tempfile,threading,time
from http.server import BaseHTTPRequestHandler,ThreadingHTTPServer
from pathlib import Path
BASE=Path('/opt/keto');ALLOWED=('cloudflare-saas/public/app.css','cloudflare-saas/public/help.html','cloudflare-saas/public/developer-extension.js')
STAGES=(('syntax',['node','--check','cloudflare-saas/public/developer-extension.js']),('build',['node','cloudflare-saas/build.cjs']),('product',['node','--test','cloudflare-saas/tests/static.test.mjs','cloudflare-saas/tests/developer-policy.test.mjs']),('python',['/opt/venv/bin/python','-m','pytest','-q','tests/test_developer.py']))
LOCK=threading.Lock();CANCELLED=set();PROCESSES={};GUARD=threading.Lock()
def digest(data):return hashlib.sha256(data).hexdigest()
def canonical_files(files):return json.dumps([{k:f[k] for k in ('path','before_sha256','content')} for f in files],ensure_ascii=False,separators=(',',':')).encode()
def validate_job(job,manifest,source):
    if not isinstance(job,dict) or set(job)!={'job_id','baseline','patch_hash','files'} or not re.fullmatch(r'[0-9a-f-]{36}',job['job_id']) or job['baseline']!=manifest['baseline']:raise ValueError('BASELINE_MISMATCH')
    files=job['files']
    if not isinstance(files,list) or not 1<=len(files)<=3 or digest(canonical_files(files))!=job['patch_hash']:raise ValueError('PATCH_HASH_MISMATCH')
    seen=set();size=0
    for f in files:
        if set(f)!={'path','before_sha256','content'} or f['path'] not in ALLOWED or f['path'] in seen or not isinstance(f['content'],str) or '\0' in f['content']:raise ValueError('PROTECTED_SCOPE')
        seen.add(f['path']);target=source/f['path']
        if target.is_symlink() or any(p.is_symlink() for p in target.parents) or not target.is_file() or digest(target.read_bytes())!=f['before_sha256']:raise ValueError('BEFORE_HASH_MISMATCH')
        size+=len(f['content'].encode())
    if size>60000:raise ValueError('PATCH_TOO_LARGE')
def prepare_workspace(source,work,job,manifest):
    validate_job(job,manifest,source)
    # Verify protected source against the build manifest, never a candidate manifest.
    expected=digest(json.dumps(manifest['files'],separators=(',',':')).encode())
    if expected!=manifest['baseline']:raise ValueError('MANIFEST_MISMATCH')
    for entry in manifest['files']:
        p=source/entry['path']
        if p.is_symlink() or digest(p.read_bytes())!=entry['sha256']:raise ValueError('IMAGE_SOURCE_MISMATCH')
    shutil.copytree(source,work,symlinks=False)
    for current,dirs,files in os.walk(work):
        os.chmod(current,0o755)
        for name in files:os.chmod(Path(current)/name,0o444)
    for f in job['files']:
        p=work/f['path'];p.chmod(0o644);p.write_text(f['content']);p.chmod(0o444)
    # Only fixed generated outputs are writable. Protected parent directories stay root-owned.
    for name in ('cloudflare-saas/public/style.css','cloudflare-saas/public/app.bundle.js','cloudflare-saas/public/knowledge-data.js','cloudflare-saas/public/knowledge.html','cloudflare-saas/src/embedded-assets.mjs'):
        p=work/name;p.touch(exist_ok=True);p.chmod(0o666)
    for name in ('cloudflare-saas/dist','artifacts','cloudflare-saas/generated'):
        p=work/name;p.mkdir(exist_ok=True,parents=True);os.chmod(p,0o777)
    (work/'cloudflare-saas/generated/developer-snapshot.mjs').write_text('export const developerSnapshot=null;\n')
    # Dependencies are installed once at image build time, never per job.
    (work/'ui-sdk/node_modules').symlink_to('/opt/keto/node_modules')
    (work/'node_modules').symlink_to('/opt/keto/node_modules')
    return work

def fixed_command(command,work,deadline,job_id):
    env={'PATH':'/opt/venv/bin:/usr/local/bin:/usr/bin:/bin','HOME':str(work.parent/'scratch'),'TMPDIR':str(work.parent/'scratch'),'KETO_LOCAL_DB':str(work.parent/'scratch/local.sqlite'),'LANG':'C.UTF-8','PYTHONDONTWRITEBYTECODE':'1','PYTEST_ADDOPTS':'-p no:cacheprovider','KETO_ENV':'test','KETO_AUTH_MODE':'local_test','KETO_PDF_FONT_DIR':'/opt/fonts','KETO_TEST_PYTHON':'/opt/venv/bin/python','KETO_DEVELOPER_SNAPSHOT_SKIP':'1'}
    p=subprocess.Popen(command,cwd=work,env=env,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,start_new_session=True,user=1000,group=1000,umask=0o077)
    with GUARD:PROCESSES[job_id]=p
    selector=selectors.DefaultSelector();selector.register(p.stdout,selectors.EVENT_READ);output=bytearray();timed_out=False;cancelled=False
    try:
        while True:
            with GUARD:cancelled=job_id in CANCELLED
            if cancelled or time.monotonic()>=deadline:
                timed_out=not cancelled
                try:os.killpg(p.pid,signal.SIGKILL)
                except ProcessLookupError:pass
                break
            ready=selector.select(min(.1,max(0,deadline-time.monotonic())))
            for stream,_ in ready:
                chunk=os.read(stream.fileobj.fileno(),4096)
                if chunk:
                    if len(output)<16000:output.extend(chunk[:16000-len(output)])
                else:selector.unregister(stream.fileobj)
            if p.poll() is not None and not selector.get_map():break
        p.wait(timeout=5)
        text=output.decode('utf-8',errors='replace')
        count=re.search(r'(\d+) passed',text) or re.search(r'(?:# |ℹ )pass (\d+)',text)
        return {'exit_code':124 if timed_out else 130 if cancelled else p.returncode,'passed_count':int(count[1]) if count else None,'log':text,'truncated':len(output)>=16000}
    finally:
        # Kill descendants even when a test exits leaving a child behind.
        try:os.killpg(p.pid,signal.SIGKILL)
        except ProcessLookupError:pass
        selector.close();p.stdout.close()
        with GUARD:PROCESSES.pop(job_id,None)
def execute(job,base=BASE):
    if not LOCK.acquire(blocking=False):raise ValueError('RUNNER_BUSY')
    job_id=job.get('job_id','');deadline=time.monotonic()+240
    try:
        with GUARD:
            if job_id in CANCELLED:raise ValueError('CANCELLED')
        manifest=json.loads((base/'manifest.json').read_text())
        with tempfile.TemporaryDirectory(prefix='keto-dev-') as temp:
            os.chmod(temp,0o755);scratch=Path(temp)/'scratch';scratch.mkdir(mode=0o700);os.chown(scratch,1000,1000);work=Path(temp)/'workspace';prepare_workspace(base/'source',work,job,manifest);stages=[]
            for name,command in STAGES:
                result=fixed_command(command,work,deadline,job_id);stages.append({'name':name,**result})
                if result['exit_code']!=0:break
            code=stages[-1]['exit_code'];return {'status':'passed' if code==0 and len(stages)==len(STAGES) else 'failed','baseline':job['baseline'],'patch_hash':job['patch_hash'],'exit_code':code,'stages':stages}
    finally:
        LOCK.release()
        # Cancellation tombstones are bounded to this container lifetime.
        with GUARD:
            if len(CANCELLED)>1000:CANCELLED.clear()
class Handler(BaseHTTPRequestHandler):
    def log_message(self,*args):pass
    def do_POST(self):
        try:
            size=int(self.headers.get('content-length','0'))
            if not 0<size<=300000:raise ValueError('BODY_LIMIT')
            job=json.loads(self.rfile.read(size))
            if self.path=='/cancel':
                job_id=job.get('job_id','')
                if not re.fullmatch(r'[a-f0-9-]{36}',job_id):raise ValueError('JOB_ID')
                with GUARD:
                    CANCELLED.add(job_id);p=PROCESSES.get(job_id)
                    if p:
                        try:os.killpg(p.pid,signal.SIGKILL)
                        except ProcessLookupError:pass
                out={'cancelled':True}
            elif self.path=='/run':out=execute(job)
            else:self.send_error(404);return
            body=json.dumps(out).encode();self.send_response(200)
        except Exception as exc:
            body=json.dumps({'status':'failed','error':str(exc) if isinstance(exc,ValueError) else 'RUNNER_FAILED'}).encode();self.send_response(422)
        self.send_header('Content-Type','application/json');self.send_header('Content-Length',str(len(body)));self.end_headers();self.wfile.write(body)
if __name__=='__main__':ThreadingHTTPServer(('0.0.0.0',8080),Handler).serve_forever()
