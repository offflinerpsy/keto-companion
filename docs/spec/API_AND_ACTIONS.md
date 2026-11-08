# API and actions

> Current specification: **0.6.2-audit-pilot**, reconciled with runtime commit `e3f648d5313b68202336cda775ff7279556a2569`. The independent review examined 0.6.1; SA07-01…04 are historical findings corrected in 0.6.2. Read [current corrections](CURRENT_CORRECTIONS.md) for exact source, regression evidence and remaining acceptance gates.

This is a source-backed action inventory, not a generated OpenAPI/JSON Schema export.
Exact tool input schemas live in [service/app.py](../../service/app.py).
Worker mapping lives in [compute.mjs](../../cloudflare-saas/src/compute.mjs).
Parent exports machine contracts separately.

## Worker HTTP conventions

Authenticated routes resolve identity from `keto_session`, never from a body subject.
Writes require exact Origin and session-derived `X-CSRF-Token`.
Bodies are bounded JSON objects; unknown fields are rejected on narrow endpoints.
Responses are JSON with no-store, no-referrer and nosniff headers.
Worker errors use `{error: CODE}` and an HTTP status; bridge validation details are not echoed.
A 503 is not proof that a paid upstream effect did not occur.

## Public and authentication routes

| Method | Path | Inputs/result | Gate |
| --- | --- | --- | --- |
| GET | `/health` | Version/build/capability booleans | Public; configured is not verified |
| GET | `/`, `/help`, `/privacy`, `/delete` | Static document | Public, no private state |
| GET | `/app.bundle.js`, `/style.css`, `/manifest.webmanifest`, `/icon.svg`, PNG icons | Static assets | Explicit allowlist |
| GET | `/auth/config` | Provider and allowlisted Firebase public config | Config must validate |
| POST | `/auth/firebase/start` | Optional invite → transaction + challenge cookie | Exact Origin; CF IP and challenge quotas |
| POST | `/auth/firebase/complete` | token + transaction → session cookie | Browser-bound challenge, verified Firebase Google identity |
| POST | `/auth/google/start` | Optional invite → authorization URL | Explicit direct_google configuration |
| GET | `/auth/google/callback` | Single code/state → redirect/session | PKCE, state cookie, nonce and verified OIDC |

No arbitrary source URL is fetched through these endpoints.
Public Firebase configuration is not an authorization credential or membership proof.

## Membership, sources and privacy

| Method | Path | Inputs/result | Role/confirmation |
| --- | --- | --- | --- |
| GET | `/api/session` | Own role/status/email, CSRF, versions/capabilities | Pending or active authenticated member |
| POST | `/api/logout` | Empty object → ok, cookie cleared | Authenticated; pending allowed |
| POST | `/api/invites/claim` | token → active membership | Pending account; email/expiry/single claim checked |
| GET | `/api/admin/summary` | Counts, max 200 members/invites, usage metadata | Admin only; no health payload |
| POST | `/api/admin/invites` | email → one-time link + expiry | Admin; explicit form submit |
| POST | `/api/admin/invites/revoke` | invitation id → ok | Admin; unclaimed invitation only |
| POST | `/api/admin/members/status` | member id + active/suspended → ok | Admin; cannot edit admin or deleting account |
| POST | `/api/consent` | storage/health/processing booleans → ok | Direct flag/revision invalidation; distinct from service consent tool |
| GET | `/api/sources` | Own latest 100 metadata/excerpts | Active member |
| POST | `/api/sources` | title, optional author/url/text/upload, rights_attested=true | Storage consent; explicit upload form |
| POST | `/api/sources/review` | id, reviewed=true → ok | Own draft source |
| GET | `/api/sources/file?id=…` | Private attachment | Own source only |
| POST | `/api/sources/delete` | id → ok | Own source; R2 then D1 |
| GET | `/api/export` | Raw cloud export with state payload, flags and source metadata | Own active member; uploaded file bytes excluded |
| POST | `/api/personal/delete` | confirm=`DELETE_MY_DATA` → receipt, 202 | Explicit destructive phrase; revokes sessions |
| POST | `/api/deletion/status` | receipt → status | Exact Origin; receipt capability, no current session required |
| POST | `/api/deletion/continue` | receipt → status/reason | Same capability; bounded cleanup |

These are actual Worker paths from [worker](../../cloudflare-saas/src/worker.mjs)
and [deletion](../../cloudflare-saas/src/deletion.mjs).
`/api/compute` and `/api/chat` explicitly return COMPUTE_NOT_CONFIGURED;
the supported web computation transport is `/api/tools/<name>`.

## Tool action contract

All Worker tool requests are POST to `/api/tools/<name>` with own CSRF/session.
Operation-specific schema validation happens in the signed bridge before domain invocation.
`subject`, `owner_id` and forged `source_context` arguments are rejected by Worker.
Do not fabricate a complete response schema from the examples below.

| Tool | Important inputs | Result shape/purpose | Mutation/confirmation |
| --- | --- | --- | --- |
| keto_open | none | state, message, optional shopping | Read; Worker may initialize state/job metadata |
| keto_recipes | query, limit 1–72, include/exclude IDs, max_minutes | recipes, personalized, note | Reference read |
| keto_consent | processing/storage/health booleans; confirmed=true | state/message | Immediate explicit consent command |
| keto_guidance | action status/preview/baseline/propose; values or preview_hash | guidance/preview or proposal | baseline and propose prepare confirmation |
| keto_propose_change | event_type, payload, expected_revision | proposal/state | Stages change; does not apply |
| keto_apply_proposal | proposal_id, expected_revision, approved | receipt/state or cancelled message | True applies after revalidation; false cancels |
| keto_menu | start ISO date, days 1–7 | plan/shopping or reference_only outcome | Draft computation, not acceptance |
| keto_chat | message ≤6000, request_id, optional thread/image | intent/message/state and optional cards/proposal | May save conversation; durable facts need separate apply |
| keto_kitchen | action plus action-specific fields | state/spec/cards/day/proposal | See action table |
| keto_topics | action, thread_id/title, confirmed, expected_revision | state/message | Explicit confirmed command |
| keto_reminders | action, reminder_id/values, confirmed, expected_revision | state or ICS | Explicit confirmed command |
| keto_transcribe | audio_base64, MIME, request_id | text or error_code | Transient; editable draft only |
| keto_export | format json/csv/html/pdf | filename, MIME, text or base64 | Read/private export |
| keto_import_menu | content, format json/csv, expected_revision | plan.accept proposal/state | Recompute first, then separate apply |

## Kitchen actions

| Action | Additional arguments | Effect |
| --- | --- | --- |
| foods | query | Up to 40 exact known food matches + parsed hints; no model |
| parse | query | Proposed pantry identities/questions; no automatic stock save |
| status / memory | thread_id optional | Canonical facts + current topic candidates |
| generate | spec, request_id, thread_id, expected_revision optional | Reserve request, design/validate 1–3 candidates and topic group |
| select | recipe_id, thread_id, expected_revision | Working selection only; not diary/menu approval |
| pantry | values.items, expected_revision | kitchen.pantry proposal |
| remember | values.food_ids/text, expected_revision | kitchen.remember proposal; updates shared dislikes only on apply |
| forget | values.fact_id, expected_revision | kitchen.forget proposal |
| save / favorite | recipe_id/thread_id/expected_revision | Personal recipe or favorite proposal |
| rate | recipe_id, values.rating 1–5, thread/revision | Rating proposal |
| diary | recipe_id, values.fraction and basis portion/batch | Quantity preview and diary proposal |
| accept_day | candidate recipe_id, thread/revision | Revalidate complete day; proposal then apply |

A `spec` contains only mode, meal, servings, time_budget, cuisine, equipment,
avoid, pantry and max_missing_items. Limits are documented in [PRODUCT](PRODUCT.md).
Server defaults exist; UI defaults are not personal confirmed facts.

## Generic event families

Source: [domain](../../service/domain.py), [core](../../library/skills/keto-companion/scripts/keto_core.py).

- `profile.update`: known profile fields, nullable screening and explicit allergies/medications.
- `targets.update`: agreed target structure with provenance note and timestamp.
- `diary.add/update/delete`: validated date, bounded observations, optional recipe/fraction.
- `settings.update/rollback`: allowlisted settings or a known historical event.
- `catalog.food.add`: personal normalized label data.
- `catalog.recipe.add`: known ingredient recipe; Worker requires an owned source_id for this web path.
- `plan.accept`: profile/catalogue match plus full recalculation.
- `checklist.set`, `feedback.add`: confirmed checklist/rating data.
- `ui`, `ui.rollback`, `configuration`: validated service UI changes and optional settings together.
- `guidance.setup/targets`: canonical baseline or current preview with fingerprint.
- `kitchen.*`: the action families above.
- `feature.request`: records a request for development, never an implemented feature.

Not every core event is exposed as a generic domain event.
`consent.set` is rejected by generic proposals and must use the consent action.

## Confirmation and idempotency

A proposal contains id/type/payload/base_revision/expires_at/status and optional preview.
Expiry is 1,800 seconds; application checks service revision and current safety again.
A receipt replay is bounded by receipt retention, not an eternal exactly-once guarantee.
Worker request IDs bind to the request hash; a changed body with the same ID is rejected.
Chat, transcription and generation require supplied IDs; other requests may use `X-Request-ID`
or a generated server ID.
Completed normal jobs can replay their cached response if consent revision is unchanged.
Pending jobs return REQUEST_PENDING; failed jobs do not automatically rerun.
Audio and PDF are transient: completed replay returns ALREADY_PROCESSED, not saved bytes/text.
Request counters conservatively retain uncertain attempts; `model_called=false` can refund admission.
SA07-02 documented a baseline accounting gap, now closed by conservative chat reservation and verified no-model refund.

## Signed internal bridge

`POST /internal/keto/compute` receives subject, operation, state and arguments.
Headers carry timestamp, nonce and signature over method/path/time/nonce/body hash.
Exactly one Ed25519 or HMAC mode must be configured; time skew is bounded to 60 seconds.
Nonce metadata is reserved once before execution.
The bridge validates operation schema and core ownership, uses MemoryStore, and returns response/state.
`sanitize_image` and `transcribe` are special transient operations.
Do not call this internal endpoint from a redesign client or expose its signing material.

## Separate legacy HTTP/MCP API

[service/app.py](../../service/app.py) implements `/status`, `/api/auth-config`,
`/api/login`, `/api/session`, `/api/logout`, `/api/tools/{name}`, `/static/*`, and `/mcp`.
Entra bearer verification is distinct from local-test cookie/access-code routes.
Legacy `keto_apply_proposal`, `keto_consent` and `keto_delete_profile` require a
short-lived single-use `ui_confirmation` capability issued through `keto_open` metadata.
The signed SaaS bridge removes that legacy-only schema property and relies on its web session/CSRF.
Never transplant that omission into the legacy MCP host.

Legacy-only UI tools include `keto_settings_read`, `keto_settings_update` and `keto_delete_profile`.
The native settings editor applies validated appearance choices from an explicit UI action.
The Worker does not map those names as public SaaS tool routes.

Optional OAuth server routes are authorize/request/complete/token/revoke and well-known metadata.
PKCE S256, fixed client/redirect/resource/scope and Entra allowlist checks apply.
Refresh rotation remembers up to 16 rotations and revokes the family on known reuse.
MCP supports JSON-RPC POST; GET/DELETE are 405, not an event-stream service.
Mobile HTTP tools guidance/topics/reminders/transcribe are excluded from legacy MCP advertisement/calls.
No actual MCP client was started by this review.
