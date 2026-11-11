"""C25 loopback synthetic acceptance. Real HTTP/domain/calculator; NO live providers.
Run: .venv/bin/python tests/browser/c25_server.py
Public recipe fixture captured from an actual Azure web-search response. OFF response
is a deterministic provider-shaped fixture using publicly observed TEOS values.
"""
import argparse,json,asyncio
from pathlib import Path
from fastapi import Request
from fastapi.staticfiles import StaticFiles
import intake_server as base
from service.recipe_discovery import RecipeDiscovery

app=base.app
mount=app.router.routes.pop()
assert getattr(mount,'name',None)=='synthetic-ui'
parser=argparse.ArgumentParser();parser.add_argument('--recipe-json',type=Path,default=base.ROOT/'tests/fixtures/c25_salad_recipe.json');options=parser.parse_args() if __name__=='__main__' else parser.parse_args([]);capture=json.loads(options.recipe_json.read_text());recipes=capture.get('recipes',[]) if isinstance(capture,dict) else capture
for recipe in recipes:recipe.pop('retrieval_status',None)
search_calls=[]
def public_provider(payload):
 search_calls.append(payload['input'][0]['content'][0]['text'])
 return {'status':'completed','usage':{'input_tokens':100,'output_tokens':100},'tool_usage':{'web_search':{'num_requests':1}},'output':[{'type':'web_search_call','status':'completed','action':{'type':'search','sources':[{'url':r['source_url']} for r in recipes]}},{'type':'message','content':[{'type':'output_text','text':json.dumps({'recipes':recipes},ensure_ascii=False)}]}]}
base.service.recipe_discovery=RecipeDiscovery(public_provider)

@app.post('/api/shop/search')
async def search(request:Request):
 args=await request.json()
 if request.headers.get('x-csrf-token')!=base.CSRF:return base.JSONResponse({'error':'CSRF'},403)
 if not isinstance(args.get('query'),str):return base.JSONResponse({'error':'INVALID_SEARCH'},400)
 return {'hits':[{'code':'4810268031793','name':'Синтетический TEOS 2% · публичные данные','brand':'Савушкин','countries':['en:belarus','en:russia']}]}

@app.post('/api/shop/barcode')
async def barcode(request:Request):
 args=await request.json()
 if request.headers.get('x-csrf-token')!=base.CSRF:return base.JSONResponse({'error':'CSRF'},403)
 return {'review_candidate':{'readability':'partial','name':'Йогурт греческий Савушкин TEOS 2%','brand':'Савушкин','barcode':args.get('barcode'),'basis':'unknown','serving_mass':None,'serving_unit':None,'nutrients':[{'name':key,'value':value,'unit':unit,'column':'100 g/ml (provider; verify label)'} for key,value,unit in [('Energy',66.8,'kcal'),('Protein',8,'g'),('Fat',2,'g'),('Carbohydrates',4.2,'g')]],'carbohydrate_basis':'unknown','carbohydrate_caption':None,'ingredients_text':None,'allergen_statement_text':None,'unresolved_fields':['Синтетический режим: выберите основу, состояние, аллергены по тестовой этикетке; клетчатка неизвестна'],'reshoot_hint':None,'provenance':{'provider':'Open Food Facts','license':'ODbL','url':'https://world.openfoodfacts.org/product/4810268031793'}}}

@app.get('/__test__/c25')
def receipt():return {'synthetic_only':True,'live_provider_calls':0,'public_query_calls':search_calls,'captured_recipe_source':recipes[0]['source_url']}

app.mount('/',StaticFiles(directory=base.ROOT/'cloudflare-saas/public',html=True),name='synthetic-ui')
if __name__=='__main__':
 import uvicorn
 try:uvicorn.run(app,host='127.0.0.1',port=8898,log_level='warning')
 finally:base.client.close();base.temporary.cleanup()
