CREATE INDEX IF NOT EXISTS sessions_expiry ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS oauth_attempts_expiry ON oauth_attempts(expires_at);
CREATE INDEX IF NOT EXISTS invites_created ON invites(created_at DESC);
CREATE INDEX IF NOT EXISTS jobs_user_status_created ON jobs(user_id,status,created_at);
CREATE INDEX IF NOT EXISTS dev_jobs_active_expiry ON dev_jobs(expires_at) WHERE state<>'expired';
CREATE INDEX IF NOT EXISTS dev_jobs_owner_session_created ON dev_jobs(owner_id,session_hash,created_at DESC);
CREATE INDEX IF NOT EXISTS dev_events_job ON dev_events(job_id);
CREATE INDEX IF NOT EXISTS shop_public_cache_expiry ON shop_public_cache(expires_at);
