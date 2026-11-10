"""Local, read-only USDA SR Legacy reference. Never a personal catalog itself."""
import base64
import functools
import gzip
import hashlib
import json
from pathlib import Path
from . import food_search

DATA = Path(__file__).resolve().parents[1] / 'library/skills/keto-menu/data/usda-reference'

@functools.lru_cache(maxsize=1)
def catalog():
    raw=(DATA/'usda-sr-legacy-normalized.json.gz').read_bytes()
    meta_raw=(DATA/'usda-ru-search-metadata.json').read_bytes()
    release_hash=hashlib.sha256(raw+meta_raw).hexdigest()
    rows=json.loads(gzip.decompress(raw));meta=json.loads(meta_raw)
    overrides={r['fdc_id']:r['name_ru_unofficial'] for r in meta['food_name_overrides']}
    by_id={}
    for r in rows:
        r=dict(r);r['candidate_id']='USDA'+str(r['fdc_id']);r.pop('food_id',None)
        r['name_ru_unofficial']=overrides.get(r['fdc_id']);r['category_ru']=meta['category_ru'].get(r['source_category'])
        r['carb_basis']='total_includes_fiber';r['gi_status']='unknown';r['release_hash']=release_hash
        by_id[r['candidate_id']]=r
    if len(by_id)!=len(rows):raise ValueError('Дубли источника USDA')
    return by_id,meta,release_hash

def candidate(candidate_id, seed_ids=()):
    rows,_,_=catalog();r=rows.get(candidate_id)
    if not r or 'F'+str(r['fdc_id']) in seed_ids:raise ValueError('Запись источника недоступна или уже есть в справочнике')
    return dict(r)

def search(query, cursor, limit, seed_ids=()):
    rows,meta,release_hash=catalog()
    if not isinstance(query,str) or len(query)>200:raise ValueError('Неверный запрос')
    if isinstance(limit,bool) or not isinstance(limit,int) or not 1<=limit<=50:raise ValueError('Лимит: 1–50')
    search_query=food_search.compile_query(query);q=search_query.text;offset=0
    signature=hashlib.sha256((food_search.VERSION+'\0'+release_hash+'\0'+q+'\0'+str(limit)+'\0'+'|'.join(sorted(seed_ids))).encode()).hexdigest()
    if cursor is not None:
        try:
            if not isinstance(cursor,str) or len(cursor)>512:raise ValueError()
            value=json.loads(base64.urlsafe_b64decode(cursor+'='*(-len(cursor)%4)))
            if set(value)!={'s','o'} or value['s']!=signature or type(value['o']) is not int or value['o']<0:raise ValueError()
            offset=value['o']
        except Exception:raise ValueError('Курсор поиска неверен или устарел') from None
    def rank(r):
        name=food_search.normalize(r.get('name_en') or '')
        score=food_search.food_score(search_query,r)
        if score is None:return None
        # Primary products precede dishes that mention them as an ingredient.
        primary=bool(search_query.required and search_query.score(name.split(',')[0]) is not None)
        cheese=search_query.required==('cheese',) and name.startswith('cheese,')
        derivative=cheese and bool(set(food_search.words(name))&{'imitation','processed','spread','food','cottage','sauce','dressing'})
        return (-int(cheese),int(derivative),-int(primary),-score,name,r['fdc_id'])
    hits=[]
    for r in rows.values():
        if 'F'+str(r['fdc_id']) in seed_ids:continue
        order=rank(r)
        if order is not None:hits.append((order,r))
    hits=[r for _,r in sorted(hits,key=lambda x:x[0])]
    if offset>len(hits):raise ValueError('Курсор поиска вне диапазона')
    page=hits[offset:offset+limit];n=offset+len(page)
    nxt=base64.urlsafe_b64encode(json.dumps({'s':signature,'o':n},separators=(',',':')).encode()).decode().rstrip('=') if n<len(hits) else None
    fields=('candidate_id','fdc_id','name_en','name_ru_unofficial','category_ru','source_url','state','allergens','release_hash')
    return {'candidates':[{k:r[k] for k in fields} for r in page], 'total':len(hits),'next_cursor':nxt,'release_hash':release_hash,'search':food_search.search_info(search_query),'model_called':False}
