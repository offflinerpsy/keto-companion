"""Read-only/invalid-login HTTP checks. No real Google identity or browser."""
from pathlib import Path
import hashlib,json,datetime,sys
import httpx
BASE="https://keto-companion-saas-staging.offflinerpsy.workers.dev"
current=json.loads(Path("docs/CURRENT_STATUS.json").read_text())
expected_compute=current["staging"]["compute_connected"]
checks=[]
def check(name,ok,**detail):
 checks.append({"name":name,"passed":bool(ok),**detail})
 if not ok:raise AssertionError(name)
report={"task":"KETO-RELEASE-002","scope":"Real Cloudflare HTTP; no browser, real Google login, clinical validation or paid model call","checks":checks,"source_commit":current["staging"]["source_commit"]}
try:
 with httpx.Client(timeout=25,follow_redirects=False) as client:
  manifest=json.loads(Path("artifacts/files_manifest.json").read_text())
  routes={"assets/index.html":"/","assets/app.bundle.js":"/app.bundle.js","assets/style.css":"/style.css","assets/help.html":"/help","assets/privacy.html":"/privacy","assets/delete.html":"/delete"}
  for f in manifest["files"]:
   if f.get("module_name") not in routes:continue
   r=client.get(BASE+routes[f["module_name"]]);check("served_"+f["module_name"],r.status_code==200 and hashlib.sha256(r.content).hexdigest()==f["sha256"],status=r.status_code,sha256=hashlib.sha256(r.content).hexdigest())
  r=client.get(BASE+"/");check("CSP_and_no_store",r.headers.get("cache-control")=="no-store" and "frame-ancestors 'none'" in r.headers.get("content-security-policy","") and r.headers.get("x-content-type-options")=="nosniff")
  r=client.get(BASE+"/health");d=r.json();check("health_firebase_and_private_storage",r.status_code==200 and d["capabilities"]["firebase_google"] is True and d["capabilities"]["storage"] is True);report["health"]=d
  check("compute_status_honest",d["capabilities"]["compute"] is expected_compute)
  r=client.get(BASE+"/auth/config");d=r.json();check("Google_public_config",r.status_code==200 and d["provider"]=="firebase_google" and d["firebase"]["projectId"]=="keto-companion-auth-261107" and "clientSecret" not in json.dumps(d))
  for path in ["/api/session","/api/admin/summary","/api/sources","/api/export"]:
   r=client.get(BASE+path);check("unauthenticated_"+path,r.status_code==401,status=r.status_code)
  for path in ["/api/tools/keto_chat","/api/tools/keto_menu","/api/personal/delete"]:
   r=client.post(BASE+path,json={},headers={"Origin":BASE});check("unauthenticated_"+path,r.status_code==401,status=r.status_code)
  r=client.post(BASE+"/auth/google/start",json={},headers={"Origin":BASE});check("direct_Google_mode_disabled",r.status_code==404)
  r=client.post(BASE+"/auth/firebase/start",json={},headers={"Origin":"https://foreign.invalid"});check("foreign_origin_refused",r.status_code==403)
  r=client.post(BASE+"/auth/firebase/start",json={},headers={"Origin":BASE});check("firebase_challenge_issued",r.status_code==200);transaction=r.json()["transaction"]
  cookie=r.headers.get("set-cookie","");check("challenge_cookie_secure","HttpOnly" in cookie and "Secure" in cookie and "SameSite=Lax" in cookie)
  r=client.post(BASE+"/auth/firebase/complete",json={"transaction":transaction,"token":"synthetic-invalid-token"},headers={"Origin":BASE});check("invalid_firebase_token_refused",r.status_code==401)
  r=client.post(BASE+"/auth/firebase/complete",json={"transaction":transaction,"token":"synthetic-invalid-token"},headers={"Origin":BASE});check("challenge_replay_refused",r.status_code==400)
  r=client.get(BASE+"/api/session");check("failed_login_created_no_session",r.status_code==401)
except Exception as e:report["error"]=type(e).__name__+": "+str(e)[:250]
report.update({"checked_at":datetime.datetime.now(datetime.timezone.utc).isoformat(),"passed":all(x["passed"] for x in checks) and "error" not in report,"total":len(checks)})
Path("docs/evidence/STAGING_HTTP_LATEST.json").write_text(json.dumps(report,ensure_ascii=False,indent=2)+"\n")
print(json.dumps({"passed":report["passed"],"checks":len(checks),"error":report.get("error"),"health":report.get("health")},ensure_ascii=False))
if not report["passed"]:sys.exit(1)
