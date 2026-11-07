CREATE TABLE global_usage (day TEXT PRIMARY KEY, requests INTEGER NOT NULL DEFAULT 0 CHECK(requests>=0));
INSERT INTO global_usage(day,requests) SELECT day,SUM(requests) FROM usage GROUP BY day;
