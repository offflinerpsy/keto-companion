"""Small versioned state store. Private Blob storage in Azure; SQLite for local tests.
A write is conditional on an exact version; neither backend silently loses changes.
"""
from __future__ import annotations
import json, os, re, sqlite3, threading
from pathlib import Path

class Conflict(Exception): pass

def encode(value):
    raw=json.dumps(value,ensure_ascii=False,allow_nan=False,separators=(',',':')).encode()
    if len(raw)>2_000_000: raise ValueError('Хранилище заполнено: сначала выгрузите и архивируйте историю.')
    return raw

def safe_key(key):
    if not re.fullmatch(r'[A-Za-z0-9_-]{1,100}',key): raise ValueError('Неверный идентификатор')
    return key

class SQLiteStore:
    def __init__(self,path):
        self.path=str(path); self.lock=threading.RLock()
        Path(path).parent.mkdir(parents=True,exist_ok=True)
        with self.connect() as c:
            c.execute('CREATE TABLE IF NOT EXISTS documents (id TEXT PRIMARY KEY, version INTEGER NOT NULL, value TEXT NOT NULL)')
    def connect(self):
        return sqlite3.connect(self.path,timeout=10)
    def read(self,key):
        with self.connect() as c:r=c.execute('SELECT version,value FROM documents WHERE id=?',(safe_key(key),)).fetchone()
        return (json.loads(r[1]),r[0]) if r else (None,None)
    def write(self,key,value,version):
        raw=encode(value).decode(); key=safe_key(key)
        with self.lock,self.connect() as c:
            c.execute('BEGIN IMMEDIATE')
            old=c.execute('SELECT version FROM documents WHERE id=?',(key,)).fetchone()
            if (old[0] if old else None)!=version: raise Conflict('Состояние изменилось. Обновите экран и повторите действие.')
            new=(version or 0)+1
            c.execute('INSERT INTO documents VALUES (?,?,?) ON CONFLICT(id) DO UPDATE SET version=excluded.version,value=excluded.value',(key,new,raw))
            return new
    def delete(self,key,version):
        with self.lock,self.connect() as c:
            cursor=c.execute('DELETE FROM documents WHERE id=? AND version=?',(safe_key(key),version))
            if cursor.rowcount!=1:raise Conflict('Состояние изменилось')

class BlobStore:
    def __init__(self,account_url,container='keto-private'):
        from azure.identity import DefaultAzureCredential
        from azure.storage.blob import BlobServiceClient
        self.client=BlobServiceClient(account_url,credential=DefaultAzureCredential(exclude_interactive_browser_credential=True)).get_container_client(container)
    def read(self,key):
        from azure.core.exceptions import ResourceNotFoundError
        try:
            d=self.client.get_blob_client(safe_key(key)+'.json').download_blob(max_concurrency=1)
            return json.loads(d.readall()),d.properties.etag
        except ResourceNotFoundError:return None,None
    def write(self,key,value,version):
        from azure.core import MatchConditions
        from azure.core.exceptions import ResourceExistsError,ResourceModifiedError
        from azure.storage.blob import ContentSettings
        b=self.client.get_blob_client(safe_key(key)+'.json')
        kw={'overwrite':version is not None,'content_settings':ContentSettings(content_type='application/json')}
        if version is not None:kw.update(etag=version,match_condition=MatchConditions.IfNotModified)
        try:return b.upload_blob(encode(value),**kw)['etag']
        except (ResourceExistsError,ResourceModifiedError) as e:raise Conflict('Состояние изменилось. Обновите экран.') from e
    def prune_edge_replay(self,now):
        # Only this dedicated prefix is inspected; conditional ETags protect newer data.
        count=0
        for item in self.client.list_blobs(name_starts_with='edge_replay_'):
            count+=1
            if count>32:break
            name=item.name
            if not re.fullmatch(r'edge_replay_[0-9a-f]{64}\.json',name):continue
            try:
                key=name[:-5];doc,version=self.read(key)
                if doc and set(doc)=={'nonce_hash','expires_at'} and doc['expires_at']<=now:self.delete(key,version)
            except Exception:continue
    def delete(self,key,version):
        from azure.core import MatchConditions
        from azure.core.exceptions import ResourceModifiedError
        try:self.client.delete_blob(safe_key(key)+'.json',etag=version,match_condition=MatchConditions.IfNotModified)
        except ResourceModifiedError as e:raise Conflict('Состояние изменилось') from e

def from_env():
    if os.getenv('KETO_STORAGE_URL'):return BlobStore(os.environ['KETO_STORAGE_URL'])
    if os.getenv('KETO_ENV','').strip().lower()=='production' or os.getenv('WEBSITE_INSTANCE_ID'):raise RuntimeError('Production requires durable private storage')
    return SQLiteStore(os.getenv('KETO_LOCAL_DB','/tmp/keto-companion/local.sqlite'))
