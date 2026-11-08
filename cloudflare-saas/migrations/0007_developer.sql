CREATE TABLE dev_settings (
 id INTEGER PRIMARY KEY CHECK(id=1), enabled_until INTEGER NOT NULL DEFAULT 0,
 max_jobs_day INTEGER NOT NULL DEFAULT 3 CHECK(max_jobs_day BETWEEN 1 AND 3),
 max_output_tokens INTEGER NOT NULL DEFAULT 5000 CHECK(max_output_tokens BETWEEN 1 AND 5000),
 capabilities TEXT NOT NULL DEFAULT '{}', epoch INTEGER NOT NULL DEFAULT 0,
 active_job TEXT, lease_until INTEGER NOT NULL DEFAULT 0
);
INSERT INTO dev_settings(id) VALUES(1);
CREATE TABLE dev_jobs (
 id TEXT PRIMARY KEY, owner_id TEXT NOT NULL REFERENCES users(id), session_hash TEXT NOT NULL,
 request_id TEXT NOT NULL, request_hash TEXT NOT NULL, baseline TEXT NOT NULL, build_hash TEXT NOT NULL,
 state TEXT NOT NULL CHECK(state IN ('draft','generating','generated','testing','tested','failed','cancelled','expired')),
 revision INTEGER NOT NULL DEFAULT 0, settings_epoch INTEGER NOT NULL, lease_until INTEGER NOT NULL,
 model_reserved INTEGER NOT NULL DEFAULT 0, patch_hash TEXT, result_json TEXT, error_code TEXT,
 created_at INTEGER NOT NULL, expires_at INTEGER NOT NULL, cancelled_at INTEGER,
 UNIQUE(owner_id,request_id)
);
CREATE INDEX dev_jobs_quota ON dev_jobs(created_at,model_reserved);
CREATE TABLE dev_events(id TEXT PRIMARY KEY, job_id TEXT, action TEXT NOT NULL, created_at INTEGER NOT NULL);
