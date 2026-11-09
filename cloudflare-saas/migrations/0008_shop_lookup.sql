CREATE TABLE IF NOT EXISTS shop_public_cache (barcode TEXT PRIMARY KEY, payload TEXT NOT NULL, expires_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS shop_provider_requests (id INTEGER PRIMARY KEY AUTOINCREMENT, requested_at INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS shop_provider_requests_time ON shop_provider_requests(requested_at);
CREATE TABLE IF NOT EXISTS shop_provider_backoff (provider TEXT PRIMARY KEY, until_at INTEGER NOT NULL);
