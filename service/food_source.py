"""Local, read-only USDA SR Legacy reference. Never a personal catalog itself."""
import base64
import functools
import gzip
import hashlib
import json
import re
from pathlib import Path

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
    q=query.strip().casefold().replace('ё','е');offset=0
    signature=hashlib.sha256(('rank-v2\0'+release_hash+'\0'+q+'\0'+str(limit)+'\0'+'|'.join(sorted(seed_ids))).encode()).hexdigest()
    if cursor is not None:
        try:
            if not isinstance(cursor,str) or len(cursor)>512:raise ValueError()
            value=json.loads(base64.urlsafe_b64decode(cursor+'='*(-len(cursor)%4)))
            if set(value)!={'s','o'} or value['s']!=signature or type(value['o']) is not int or value['o']<0:raise ValueError()
            offset=value['o']
        except Exception:raise ValueError('Курсор поиска неверен или устарел') from None
    terms=[q]+[v.casefold() for k,vs in meta['query_synonyms_ru_to_en'].items() if q and q in k.casefold().replace('ё','е') for v in vs]
    def contains(term, value):
        value=value.casefold().replace('ё','е')
        # "сырой" describes preparation, not cheese; retain сырный/сырники.
        if term=='сыр':return bool(re.search(r'(?<!\w)сыр(?:\b|н\w*)',value))
        return term in value
    def rank(r):
        name=str(r.get('name_en') or '').casefold().replace('ё','е')
        ru=str(r.get('name_ru_unofficial') or '').casefold().replace('ё','е')
        category=' '.join(str(r.get(k) or '') for k in ('source_category','category_ru')).casefold().replace('ё','е')
        if not q:return (0,name,r['fdc_id'])
        if not any(contains(t,' '.join((name,ru,category))) for t in terms):return None
        primary=any(name.startswith(t) or ru.startswith(t) for t in terms if t and (t!='сыр' or contains(t,ru)))
        # USDA names begin "Cheese, ..." and treat cottage cheese as cheese.
        if q in ('сыр','cheese') and name.startswith(('cheese,','cottage cheese')):primary=True
        named=any(contains(t,name) or contains(t,ru) for t in terms)
        cheese_primary=q in ('сыр','cheese') and name.startswith(('cheese,','cottage cheese'))
        return (-1 if cheese_primary else 0 if primary else 1 if named else 2,name,r['fdc_id'])
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
    return {'candidates':[{k:r[k] for k in fields} for r in page], 'total':len(hits),'next_cursor':nxt,'release_hash':release_hash,'model_called':False}
