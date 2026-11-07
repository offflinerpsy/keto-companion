ALTER TABLE private_state ADD COLUMN lock_id TEXT;
ALTER TABLE private_state ADD COLUMN lock_until INTEGER;
ALTER TABLE consents ADD COLUMN consent_revision INTEGER NOT NULL DEFAULT 0;
ALTER TABLE jobs ADD COLUMN response_json TEXT;
ALTER TABLE jobs ADD COLUMN consent_revision INTEGER NOT NULL DEFAULT 0;
ALTER TABLE jobs ADD COLUMN finished_at INTEGER;
CREATE TABLE deletion_jobs (user_id TEXT PRIMARY KEY REFERENCES users(id), receipt_hash TEXT NOT NULL UNIQUE, status TEXT NOT NULL CHECK(status IN ('pending','complete')), created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL);
CREATE TABLE upload_reservations (id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),object_key TEXT NOT NULL UNIQUE,status TEXT NOT NULL CHECK(status IN ('pending','cleanup')),created_at INTEGER NOT NULL);
CREATE INDEX upload_reservations_owner ON upload_reservations(user_id,status);
