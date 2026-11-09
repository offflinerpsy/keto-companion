# KETO: existing-compute release runbook

Status: reviewed instructions only; this reviewer performed no deployment, trigger mutation, credential access, or family-data operation. Root is the sole implementation and release writer. Final source and runtime digests must come from the completed candidate, including C12; values below are resource identities, not claims of a new release.

## Targets and authority

| Resource | Existing identity |
| --- | --- |
| Azure subscription | `c446448a-67ca-4c67-9f95-e74b41f3c247` |
| Azure resource group / app | `rg-keto-companion` / `keto-companion-ay-20261107` |
| Azure compute endpoint | `https://keto-companion-ay-20261107.azurewebsites.net/internal/keto/compute` |
| Cloudflare account | `0609100baf768271ea2811c9a9ee2b16` |
| Main Worker / script tag | `keto-companion-saas-staging` / `35d20e3e19a74997aa077809e9839e38` |
| Native trigger | `88639670-f75a-46f5-ae89-85a2d8387a7c` |
| Developer Worker / existing application | `keto-companion-developer-runner` / `a0328d47-d862-4cc2-be96-42e925e4e3ab` |
| Family staging origin | `https://keto-companion-saas-staging.offflinerpsy.workers.dev` |

The authenticated originating Browser Cloud Shell is available; root verified the subscription and Azure CLI 2.91.0. The app is `functionapp,linux`, attached to `WestEuropeLinuxDynamicPlan`; confirm the referenced plan SKU by metadata only if needed. Do not rely on app-container SSH for a dynamic plan. No new resource, identity, shell storage, credential, GitHub Actions workflow, or service is needed.

## 1. Freeze the candidate and the adoption digest

Finish all source/test changes, including the agreed static-size assertion correction and the additive status digest, before generating the final developer snapshot. Commit every deployment source, including newly added Python modules; `git diff --name-only HEAD` and the deployment script's untracked-source check must be empty. Check tracked inventory as well as diff: untracked `service/intake.py` would not appear in an ordinary baseline diff.

Use a fixed reviewed list of deployed Python paths covering the changed domain and transport. Essential current paths are `service/app.py`, `service/domain.py`, `service/intake.py`, `service/kitchen.py`, and `library/skills/keto-companion/scripts/keto_core.py`. Include `service/edge_bridge.py`, `function_app.py`, and any additional C12 module used by the new behavior. Freeze this list in the reviewed source; do not discover it by walking the deployment filesystem.

Recommended deterministic framing: SHA-256 over ASCII `keto-runtime-code-v1` followed by LF, then, for each relative POSIX path in ascending order, UTF-8 path, NUL, lowercase ASCII SHA-256 of that file's exact bytes, and LF. Compute once during `create_app` initialization. A missing or unreadable listed file must fail initialization; do not skip files or replace the result with an environment value. Return only `runtime_code_sha256` in the existing `/status` response, with `Cache-Control: no-store`. No source, absolute path, environment dump, request input, or personal state is exposed.

Calculate the expected value using the identical fixed framing against members of the exact deployment ZIP. Do not substitute the working tree digest. The expected digest is release evidence outside the hashed application source, so there is no self-reference.

## 2. Accept the changed Cloudflare runtime before changing its pin

Keep `ops/approved-runtime.json` unchanged while the candidate image is built. The ordinary equality assertion correctly fails until the new runtime is actually accepted.

Through the existing Cloudflare connector, use `PATCH /accounts/0609100baf768271ea2811c9a9ee2b16/builds/triggers/88639670-f75a-46f5-ae89-85a2d8387a7c` to install only the previously reviewed temporary new-image commands:

- Build: `python scripts/cloudflare_ci.py && node --test ops/runtime-acceptance-http.test.mjs && node --test --test-name-pattern='^(operator promotion is disabled without explicit native release flag|operator helper never publishes app or replaces image before isolated acceptance|exact pinned application detail wins over stale collection and retains all guards)$' ops/promotion.test.mjs`.
- Deploy: `KETO_NATIVE_RUNNER_RELEASE=1 KETO_APPROVED_ROLLOUT=1 .venv/bin/python scripts/deploy_developer_native.py`.

Retain the existing repository, root, branch filters, secrets, Node/Python versions, and all other trigger settings. This phase does not deploy the main Worker.

Start exactly the reviewed committed candidate using `POST` to the same trigger path plus `/builds`, with only `commit_hash` set to that SHA. Do not use `seed_repo` overrides or a floating branch. Record the returned build UUID immediately.

Read `GET /accounts/<account>/builds/builds/<build-uuid>` until terminal. Require `status=stopped`, `build_outcome=success`, exact commit, and expected effective commands. From bounded acceptance log markers, require `KETO_NATIVE_RUNNER_READY`, the real accepted baseline/digest/application ID, all four stages (syntax/build/product/python) successful, positive product/Python test counts, and temporary-probe deletion. Inspect the exact existing application detail and runner settings independently. A started build, accepted rollout, or pushed digest is not acceptance. If cloud effect is uncertain, inspect the recorded operation; do not start a second image build blindly.

Restore the ordinary trigger commands after this phase. Update `ops/approved-runtime.json` only from the actual accepted evidence; commit the pin and receipt. Call this final release commit R. Verify the protected source baseline remains identical to the accepted candidate. If source changed, the image acceptance is stale.

## 3. Adopt the exact reviewed ZIP in the existing Azure app

Use the source allowlist in `scripts/deploy_azure_compute.py`: committed `service/**` and `library/**` excluding caches, bytecode, databases and `server` directories, the pinned `runtime-fonts/**`, and root `function_app.py`, `host.json`, `requirements.txt`. Exclude credentials, `.private`, local dependencies, and personal state. `host.json` must be at ZIP root. Prepare the two pinned fonts through the existing font preparation step; preserve their checked hashes.

Build from R, record R, ZIP SHA-256, byte count/member inventory, and expected runtime-code digest. The legacy static bundle hash is an additional asset check; it is not proof that Python changed.

Transfer the archive and a small public settings JSON to the existing Cloud Shell through its supported Manage files → Upload interface if the browser can supply the reviewed local file. Cloud scratch and the user's browser-local filesystem are distinct: do not assume a scratch path is uploadable. If documented browser upload cannot supply bytes, a reviewed quoted-heredoc base64 transfer into the existing terminal is a bounded fallback; decode and compare the full SHA-256 before use. Do not publish the source ZIP or provision storage to transfer it. Cloud Shell's ephemeral files disappear when the session ends.

The settings JSON contains only `KETO_SOURCE_COMMIT=R` and the already-reviewed public Ed25519 JWK from `docs/evidence/AZURE_EDGE_PUBLIC_KEY.json`. It must not contain `d` or any private credential. Preserve existing model/reasoning and all other app settings. Use existing CLI operations, with the explicit subscription on each call:

- `az functionapp config appsettings set --subscription c446448a-67ca-4c67-9f95-e74b41f3c247 -g rg-keto-companion -n keto-companion-ay-20261107 --settings @<public-settings.json> -o none`.
- `az functionapp deployment source config-zip --subscription c446448a-67ca-4c67-9f95-e74b41f3c247 -g rg-keto-companion -n keto-companion-ay-20261107 --src <verified.zip> --build-remote true --timeout 600 --only-show-errors --query '{id:id,status:status,complete:complete}' -o json`.

Record the deployment ID and require status 4 plus complete true. The current Python helper records but does not assert these fields; the release gate must assert them. Its hardcoded `/opt/homebrew/bin/az` is not portable; direct existing CLI operations above avoid requiring a full Git checkout in Cloud Shell. Do not read app-setting collections or enable debug output.

Request the existing Azure `/status` with cache bypass and compare `source_commit=R`, `runtime_code_sha256` against the exact ZIP, `edge_signature=Ed25519`, `authentication_required=true`, and `medical_monitoring=false`. Observe the response's no-store policy. The startup digest is the adoption check: environment source SHA alone is insufficient because settings are written before ZIP deployment.

## 4. Ordinary full promotion and final readback

The restored native commands must be exactly:

- Build: `python scripts/cloudflare_ci.py && node --test ops/*.test.mjs`.
- Deploy: `KETO_PINNED_RUNNER_RELEASE=1 node ops/promote_existing_runtime.mjs && node scripts/deploy_cloudflare_staging.mjs`.

Start the same existing trigger with `commit_hash=R`. Require complete native source CI, the full ops suite including pin equality, actual pinned-runtime acceptance, and main-Worker deployment. Require terminal build success and exact source/commands, then read back:

| GET route, under `/accounts/<account>` | Required evidence |
| --- | --- |
| `/builds/workers/<script-tag>/triggers` | Restored ordinary commands; no image-rollout flags; original branch/path controls |
| `/workers/scripts/keto-companion-saas-staging/settings` | `commit:R`, compatibility date `2026-11-07`, intended binding identities below |
| `/workers/scripts/keto-companion-saas-staging/deployments` | Current active deployment matches the recorded release |
| `/workers/scripts/keto-companion-saas-staging` | If the connector supports raw multipart response, hash module bytes against `artifacts/files_manifest.json`; otherwise retain exact build/deploy receipt plus served-asset hashes, without claiming raw code-download verification |
| `/workers/scripts/keto-companion-developer-runner/settings` | Accepted baseline/digest and only expected plain-text/DO bindings; no app DB/R2 or secrets |
| `/containers/applications/a0328d47-d862-4cc2-be96-42e925e4e3ab` | Same app, actual accepted image digest, max_instances 1, default scheduling, empty environment variables and authorized keys |
| `/workers/scripts` | Recorded temporary acceptance probe absent; return only relevant names |

Main bindings: D1 `981e963a-d4c1-4db0-b9a7-bf62eb0fede4`; R2 `keto-companion-private-staging`; developer service `keto-companion-developer-runner`, entrypoint `DeveloperRunner`; accepted baseline/image digest; public origin above; Firebase project `keto-companion-auth-261107`; auth provider `firebase_google`; helper `same-origin`; Azure bridge URL above. Check the presence/type of `SESSION_HMAC_KEY` and `KETO_EDGE_SIGNING_JWK` only, never their values. Logging/observability stays disabled as in the existing deploy script.

Check served staging asset hashes against R's manifest, the existing public health response, and bounded existing unauthenticated-route rejection checks. Do not write family data. No broad additional test campaign is required after the accepted source/HTTP/SQLite/browser checks, native full suite, actual isolated runtime acceptance, and these deployment gates pass.

## What this proves and the remaining boundary

There is no ready existing public/protected synthetic compute diagnostic. The main `/health` reports bridge binding presence only. `/api/tools/*` requires the actual session/CSRF and derives its identity internally; it rejects caller-supplied subject/owner IDs. The historical `scripts/verify_cloud_compute_e2e.py` requires private synthetic session fixtures that `docs/evidence/COMPUTE_RELEASE_RECEIPT.json` records as cleaned up; do not revive it blindly or use a family session with substituted identity.

The startup code digest proves that a newly serving status implementation observed exactly the reviewed installed Python files at initialization. It complements the completed deployment receipt and proves adoption beyond an environment label. It does not claim a new live signed Cloudflare → Azure → D1 C11/C12 transaction. Synthetic domain behavior is established by the accepted local real-HTTP/SQLite checks and protected runtime tests. Retain that precise distinction in the release receipt; it does not require new diagnostics, accounts, services, or family-data writes.

Source references: `scripts/deploy_azure_compute.py`, `scripts/deploy_developer_native.py`, `scripts/deploy_cloudflare_staging.mjs`, `scripts/cloudflare_ci.py`, `ops/promote_existing_runtime.mjs`, `ops/promotion.test.mjs`, `ops/runtime-acceptance-http.test.mjs`, `service/app.py`, `service/edge_bridge.py`, `cloudflare-saas/src/compute.mjs`, `tests/test_intake.py`, and `docs/evidence/COMPUTE_RELEASE_RECEIPT.json` in the existing repository. Cloudflare API request schemas were inspected through the installed connector; no network mutation was performed by this reviewer.

Official platform references: [Cloud Shell file transfer](https://learn.microsoft.com/en-us/azure/cloud-shell/use-the-shell-window), [Azure config-zip CLI](https://learn.microsoft.com/en-us/cli/azure/functionapp/deployment/source?view=azure-cli-latest), [Functions ZIP layout](https://learn.microsoft.com/en-us/azure/azure-functions/deployment-zip-push), [Functions plan feature matrix](https://learn.microsoft.com/en-us/azure/azure-functions/functions-how-to-use-azure-function-app-settings), [App-container terminal limitations](https://learn.microsoft.com/en-us/azure/app-service/configure-linux-open-ssh-session). The latter explicitly distinguishes app and Kudu containers and says detached exec acceptance is not completion evidence.
