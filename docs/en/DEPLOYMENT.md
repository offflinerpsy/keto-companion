# Release from a pinned commit only

1. Create one GitHub issue with scope and acceptance criteria, then a `release/...` branch. Read `docs/CURRENT_STATUS.json`, inspect existing resources and test evidence; do not duplicate D1/R2.
2. Pin the commit SHA and `artifacts/files_manifest.json`. Deploy exactly those bytes. This stage is staging only, not production.
3. Compare migrations with `schema_migrations`; never blindly repeat ALTER TABLE. Staging must use its own D1/R2, not production records.
4. Upload `worker-modules.mjs` and listed TEXT modules through Cloudflare's documented multipart API. Module names must match imports. Do not add a new Wrangler project; this workspace uses cf and the API.
5. Configure DB/UPLOADS and public settings. `SESSION_HMAC_KEY` is a secret binding only. Do not claim compute integration before a separate successful HMAC/managed-identity cloud test.
6. Verify build hashes, `/health`, `/auth/config`, anonymous rejection by private routes, and R2 privacy. Record a sanitized receipt and checks linked to the commit. Close the issue and merge only after verification.

Detailed configuration: `cloudflare-saas/DEPLOYMENT_GUIDE_RU.md`; staging plan: `deploy/cloudflare-staging.json`. Deployment is not proof of a person's Google login, popup/voice compatibility or clinical suitability.

On failure, retain the verified checkpoint. Do not change production or roll back data without a separate plan. Code rollback does not roll back D1/R2. Do not bypass real consent or authentication by seeding production test accounts.
