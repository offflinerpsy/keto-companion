-- Explicitly reviewed technical intake, isolated from private health documents.
CREATE TABLE bug_reports (
 number INTEGER PRIMARY KEY AUTOINCREMENT,
 user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 client_id TEXT NOT NULL,
 payload_hash TEXT NOT NULL,
 description TEXT NOT NULL,
 block_id TEXT NOT NULL,
 context_json TEXT NOT NULL,
 status TEXT NOT NULL DEFAULT 'new' CHECK(status IN ('new','in_progress','ready_to_verify','closed')),
 revision INTEGER NOT NULL DEFAULT 1,
 fix_version TEXT NOT NULL DEFAULT '',
 evidence TEXT NOT NULL DEFAULT '',
 issue_url TEXT NOT NULL DEFAULT '',
 history_json TEXT NOT NULL DEFAULT '[]',
 created_at INTEGER NOT NULL,
 updated_at INTEGER NOT NULL,
 UNIQUE(user_id,client_id)
);
CREATE INDEX bug_reports_owner_number ON bug_reports(user_id,number DESC);
