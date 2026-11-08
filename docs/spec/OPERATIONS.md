# Operations and recoverability

> Current specification: **0.6.2-audit-pilot**, reconciled with runtime commit `e3f648d5313b68202336cda775ff7279556a2569`. The independent review examined 0.6.1; SA07-01…04 are historical findings corrected in 0.6.2. Read [current corrections](CURRENT_CORRECTIONS.md) for exact source, regression evidence and remaining acceptance gates.

This runbook describes source entry points and safe checks.
It grants no authority to deploy, install, read credentials or change production.
SPEC-AUDIT-07 performed none of those operations.

## Local environment

Repository uses Python service and Node/esbuild frontend packaging.
Pinned Python dependencies are in [requirements.txt](../../requirements.txt)
and [requirements-dev.txt](../../requirements-dev.txt).
Cloudflare package test command is in [package.json](../../cloudflare-saas/package.json).
The builder loads the existing `ui-sdk/node_modules/esbuild`, not an auto-installed CLI.
Firebase, jose and noUiSlider are vendored at pinned versions.
Do not replace them through an unbounded dependency refresh during recovery.

Observed reviewer executables: Node v26.3.1 and Python 3.12.12 in the existing venv.
These versions describe this probe host, not deployed Azure/Worker compatibility.
Review probes use no persistent store and no app startup.

## Read-first recovery

1. Read [AGENTS](../../AGENTS.md) and the same task's [RECOVERY_STATE](../../qa/RECOVERY_STATE.json).
2. Confirm task stage, exact owned paths, dirty-tree boundary and existing job/effect state.
3. Do not start a duplicate Codex/check/server when an owned job is still pending.
4. Use bounded synchronous checks and return result/hash/count rather than full logs.
5. Update only the authorized handoff; parent owns recovery/status in this review.
6. Stop at the current acceptance criteria.

Historical patch scripts named in AGENTS are explicitly non-idempotent.
Do not run them as recovery or restore old plugin source over current source.

## Generated asset pipeline

[build.cjs](../../cloudflare-saas/build.cjs) performs:

1. Regenerate knowledge-data from local included evidence and starter sources.
2. Concatenate vendor noUiSlider CSS with maintained app.css into style.css.
3. Bundle public/app.js and imports into public/app.bundle.js with pinned Firebase aliases.
4. Load 13 static asset entries, including public Firebase config from qa.
5. Generate embedded-assets.mjs and standalone Worker bundle.
6. Copy distribution assets and produce modular Worker with separately packaged text modules.
7. Write files_manifest with SHA-256/bytes/module metadata and SQL migration entries.

Both generated bundle and static asset manifest must match maintained source.
PNG assets in modular packaging are represented as base64 text and decoded by wrapper code.
Do not assume dist asset text is a directly served PNG without the wrapper contract.
Worker/mobile/package metadata is aligned at 0.6.2-audit-pilot. The legacy protocol identifier remains 0.2.1; exact artifact hashes and deployment receipts, not the label alone, establish the target.

## Check commands

Commands below belong to the implementing parent or authorized operator:

```sh
node --version
.venv/bin/python --version
node --test cloudflare-saas/tests/*.test.mjs
.venv/bin/python -m pytest -q tests library/skills/keto-companion/tests
node tests/test_ui_no_browser.cjs
node tests/test_oauth_ui.cjs
node cloudflare-saas/build.cjs
python3 scripts/verify_repository.py
git diff --check
```

Use focused subsets for an isolated change, then required project checks once on final source.
A build mutates generated artifacts and is outside a documentation-only write boundary.
Never run browser scripts when the task forbids browser clients.
Do not launch local servers as incidental validation for pure schema/document work.

## PDF runtime assets

[prepare_pdf_fonts.py](../../scripts/prepare_pdf_fonts.py) accepts directory and optional download flag.
It verifies pinned NotoSans-Regular/Bold SHA-256 hashes.
Without download, missing/mismatched fonts fail explicitly.
[mobile_exports](../../service/mobile_exports.py) searches runtime-fonts then .runtime-fonts.
Fonts are runtime-only and excluded from ordinary source delivery.
Missing fonts cause PDF_UNAVAILABLE through the bridge rather than a fabricated PDF success.
Parent must prepare/package them for runtime and full PDF CI checks.

## Configuration names only

Worker bindings/configuration:

- DB, UPLOADS, ASSETS where applicable.
- PUBLIC_ORIGIN, OWNER_GOOGLE_EMAIL, SESSION_HMAC_KEY.
- AUTH_PROVIDER, FIREBASE_PUBLIC_CONFIG_JSON.
- GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET for explicit direct Google only.
- KETO_EDGE_BRIDGE_URL.
- KETO_EDGE_SIGNING_JWK or KETO_EDGE_BRIDGE_SECRET, exactly one mode.

Azure service/configuration:

- KETO_ENV, KETO_STORAGE_URL, KETO_LOCAL_DB, KETO_PUBLIC_URL, KETO_SESSION_SECRET.
- KETO_AUTH_MODE, KETO_ENTRA_TENANT_ID, KETO_ENTRA_CLIENT_ID, KETO_ENTRA_USERS.
- KETO_AUTH_RECORDS for local/test legacy mode.
- KETO_OAUTH_BRIDGE_ENABLED, KETO_OAUTH_BRIDGE_KEY.
- KETO_EDGE_PUBLIC_JWK or KETO_EDGE_BRIDGE_SECRET.
- AZURE_OPENAI_ENDPOINT, AZURE_OPENAI_DEPLOYMENT, KETO_AZURE_AUTH, AZURE_CLI.
- KETO_RECIPE_DEPLOYMENT, KETO_RECIPE_REASONING, KETO_RECIPE_MAX_OUTPUT_TOKENS.
- AZURE_TRANSCRIBE_DEPLOYMENT, AZURE_TRANSCRIBE_API_VERSION.
- KETO_DAILY_REQUEST_LIMIT, KETO_SOURCE_COMMIT.

Names are not credentials. Never print values, copy auth stores or put signing keys into artifacts.
Managed identity tokens remain in SDK/process.
Legacy CLI model mode can create a temporary request file; signed bridge rejects that chat mode.
The app defaults and supported auth path must be verified against the exact target before release.

## Deployment source entry points

[scripts/deploy_cloudflare_staging.mjs](../../scripts/deploy_cloudflare_staging.mjs)
checks module hashes and uses the existing staging Worker/API/bindings.
Its metadata requests compatibility date 2026-11-07.
It preserves secret bindings and references existing D1/private R2 identities.
It is an operational script with external effects, not a harmless build command.

[scripts/deploy_azure_compute.py](../../scripts/deploy_azure_compute.py)
checks runtime font hashes, packages source and targets the existing Azure compute app.
Its receipt records source commit/archive hash and no personal-state migration.
Do not execute it merely because Azure login succeeded.

Reported staging origin is a public identifier from source:
`https://keto-companion-saas-staging.offflinerpsy.workers.dev`.
The internal bridge's hostname is deployment configuration, not a new browser/API client route.
No target was read or changed in this review.

## Release verification sequence

1. Freeze final source/artifact hashes and identify intended staging target.
2. Run full required local/CI checks with fonts and compatible runtime.
3. Verify exact D1 schema, R2 privacy and private bridge binding names on the existing resources.
4. Deploy only through the task-authorized route; record request/target/delivery state.
5. Read back exact version/hash/endpoint behavior without disclosing private contents.
6. Verify synthetic membership isolation, revocation and source/export behavior on that build.
7. Obtain intended person's actual sign-in/consent and physical-device acceptance separately.
8. Record any remaining clinical/public-plugin gates explicitly.

A configured capability flag is not model execution proof.
A successful public GET is not confirmation of private bindings or real login.
Old cloud receipts do not prove this exact source build was deployed.

## Rollback and partial failures

Prefer an identified previously accepted artifact/version for the same existing target.
Record target fingerprint and current version before a rollback effect.
Do not guess a version, recreate resources or migrate personal data silently.
Schema compatibility must be assessed before changing code against current D1 state.
This review did not validate a rollback command or a rollback target.

| Symptom | Preserve | Next bounded diagnostic |
| --- | --- | --- |
| Pending/failed compute | Same request ID/hash/status and conservative usage | Reconcile job/response; do not automatically retry upstream |
| STATE_CHANGED | New consent/session/revision | Reload own state; discard stale proposal/output |
| PDF_UNAVAILABLE | Current accepted menu and error | Check font hashes/size; use allowed CSV alternative |
| Upload uncertain | Reservation/object target and cleanup status | Reconcile exact object/row before delete/retry |
| Deletion pending | Same receipt and owner prefix | Continue bounded cleanup; inspect specific in-flight reservation |
| Source link needs_content | URL/provenance | Obtain actual authorized text/image; no fake read claim |
| CI startup failure | Exact run/job/error | Parent obtains startup logs; cause currently unknown |
| Runtime date mismatch | Requested/tested dates | Use supported runtime verification; do not relabel old date |
| Real login/2FA/CAPTCHA | Drafts and exact account boundary | Required person's one native action |

Do not terminate another task's runtime or clear global settings to make a check appear clean.
Do not package .private, token/state files, databases, node_modules or real user data.
