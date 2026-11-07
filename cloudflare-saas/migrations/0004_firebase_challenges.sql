CREATE TABLE firebase_challenges (transaction_hash TEXT PRIMARY KEY, cookie_hash TEXT NOT NULL, invite_hash TEXT, ip_hash TEXT NOT NULL, created_at INTEGER NOT NULL, expires_at INTEGER NOT NULL, consumed_at INTEGER);
CREATE INDEX firebase_challenges_expiry ON firebase_challenges(expires_at);
CREATE INDEX firebase_challenges_ip ON firebase_challenges(ip_hash,created_at);
