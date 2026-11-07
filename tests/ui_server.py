import os,sys,hashlib
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
os.environ['KETO_AZURE_AUTH']='cli';os.environ['AZURE_CLI']='/opt/homebrew/bin/az';os.environ['AZURE_OPENAI_ENDPOINT']='https://offflinerpsy-4097-resource.openai.azure.com';os.environ['AZURE_OPENAI_DEPLOYMENT']='keto-terra-61';os.environ['KETO_ENV']='test';os.environ.pop('KETO_AUTH_MODE',None)
from service.app import create_app
from service.domain import Service
from service.brain import AzureBrain
from service.store import SQLiteStore
svc=Service(SQLiteStore('qa/browser-synthetic.sqlite'),AzureBrain())
keys=[('ui-one','synthetic_local_browser_test_only_123456789'),('ui-two','synthetic_second_browser_test_only_123456789')]
for sub,key in keys:
 _,v=svc.store.read(sub)
 if v is not None:svc.store.delete(sub,v)
app=create_app(svc,[{'subject':sub,'kind':'demo','sha256':hashlib.sha256(key.encode()).hexdigest()} for sub,key in keys],'local_test_signing_not_production','http://127.0.0.1:8821',testing=True)
