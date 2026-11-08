# Security, privacy and review boundaries

> Current specification: **0.6.2-audit-pilot**, reconciled with runtime commit `e3f648d5313b68202336cda775ff7279556a2569`. The independent review examined 0.6.1; SA07-01…04 are historical findings corrected in 0.6.2. Read [current corrections](CURRENT_CORRECTIONS.md) for exact source, regression evidence and remaining acceptance gates.

This is source inspection, not a penetration test or legal/clinical certification.
No real account, session store, credential file, cloud resource or user diary was read.

## Trust and identity

[Worker](../../cloudflare-saas/src/worker.mjs) derives identity from a verified session.
[FIREBASE verifier](../../cloudflare-saas/src/firebase-identity.mjs) checks RS256 signature,
fixed project issuer/audience, verified email, Google provider, recent auth_time,
issued/expiry time and exactly one Google identity.
Certificate fetch is fixed to Google's public endpoint with bounded response/cache lifetime.
Browser challenge binds transaction to cookie and consumes it once.
Direct Google uses state, nonce, PKCE and fixed callback under configured origin.
The owner bootstrap email is a fixed source/config identity; it is not permission to view family diaries.

## Membership and roles

Non-owner membership requires email-bound invitation and explicit claim.
Pending sessions can read session/claim/logout, not private active-member tools.
Suspended users fail auth; suspension removes sessions.
Admin routes check role server-side and only return membership/activity/request metadata.
Every source query is owner-scoped.
Body subject/owner/source-context forgery is rejected before bridge execution.
UI-hidden admin navigation is supplementary presentation, not access control.

## Browser request protection

Session cookies are Secure/HttpOnly/SameSite=Lax on the Worker.
Writes require exact Origin plus HMAC-derived CSRF tied to the raw session.
Cookie duplicate parsing refuses ambiguous duplicate session values.
Static assets receive a restrictive CSP, no-store, no-referrer and nosniff.
Firebase popup policy is same-origin-allow-popups; approved identity domains are allowlisted.
Do not widen CSP/connect/frame origins as a routine layout fix.
DOM text content is used for ordinary dynamic text rather than executing source markup.
No claim is made that these controls exclude all XSS or browser-extension threats.

## Consent and concurrent revocation

[compute](../../cloudflare-saas/src/compute.mjs) snapshots consent revision when reserving work.
Commit requires active membership, same session not expired, same lock/revision and same consent revision.
Revocation increments consent/private-state revisions, clears lock and fails pending jobs.
Urgent safety path also invalidates conflicting work.
A late model result cannot simply overwrite a changed current state.

Two consent routes differ:

- `keto_consent` calls domain consent and updates service document semantics through bridge.
- `/api/consent` directly updates D1 flags/invalidation; it does not itself rewrite wrapper flags/history.

Do not treat those responses as identical full-state render contracts.
Revocation stops new use; it does not promise erasure of old diary, exports or provider records.

## State and confirmations

[Domain](../../service/domain.py) prepares bounded, expiring proposals.
Apply checks expected revision/base revision and revalidates payload against present conditions.
[Core](../../library/skills/keto-companion/scripts/keto_core.py) checks owner, consent,
event identity/hash and revision before copying/appling an event.
A current profile/catalogue must match a plan before acceptance.
Do not move apply into a model response handler or auto-confirm on navigation.

Legacy UI confirmation capabilities are single-use hashes with a five-minute lifetime,
kept out of model-visible structured data through metadata.
They protect a compliant model/UI boundary, not a compromised host or the owner scripting their account.
SaaS session/CSRF and signed bridge are a different authority path.

## Replay and uncertain effects

Worker jobs bind user/request ID to exact serialized request hash.
Pending/failed attempts do not automatically trigger a second compute call.
Transient audio/PDF results are not replayed from stored contents.
Bridge signs method/path/timestamp/nonce/body hash and reserves nonce metadata once.
Exactly one Ed25519/HMAC mode is accepted; timestamp skew is bounded to 60 seconds.
Replay reservation and private-state commit are different boundaries.
A failed commit can follow successful upstream model work; keep it uncertain rather than retry blindly.
SA07-02 was a baseline cost-admission defect and is now closed by conservative pre-dispatch quota reservation.

## Sources, SSRF and injection

Source URLs are normalized, tracking parameters stripped and only http/https accepted without userinfo.
The source import path stores URLs; it does not fetch arbitrary user destinations.
Thus it does not implement a general URL-fetching SSRF surface there.
Bridge URL is operator configured, requires HTTPS and exact internal pathname without credentials/query/hash.
That is a trusted operational setting, not arbitrary user input.

JPEG/PNG uploads pass through server sanitation before R2 write.
Text/file/excerpt/body size checks are separate.
Rights acknowledgement is required; source status is not clinical evidence approval.
Discussion resolves an owned nonempty source; browser cannot supply its own privileged source_context.
Model output still passes server action/ingredient/target validation.
Do not claim all prompt injection is solved; selected malicious tests cover limited cases.

## Private uploads and deletion races

R2 uses private owner prefixes; metadata/file reads require owner session.
Upload reservations and rechecks protect against consent/session changes before commit.
Failed puts/metadata saves attempt owned-object cleanup or retain cleanup reservations.
Deletion waits for unresolved upload reservations and retries bounded object-prefix cleanup.
A stale ambiguous pending upload can block deletion; that is an operational reconciliation state.
A successful deletion response does not establish immediate backup/object-version erasure.

## Audio, images and files

[Speech](../../service/speech.py) decodes audio with fixed protocol/format allowlists,
mono 16kHz PCM, one thread, decode timeout and duration/signal checks.
Linux uses an anonymous RAM file for seekable MP4; Mac uses a pipe fallback.
No raw recording is intentionally saved by this path.
Worker audio jobs retain only already-processed markers, not transcript/audio bytes.
Provider processing and infrastructure retention are separate unverified concerns.

Chat images are reencoded without original EXIF through Pillow; source uploads can be retained privately.
Do not conflate transient chat-photo handling with explicit source storage.
PDF is generated in memory; response bytes are not persisted in Worker job cache.
Downloaded/shared files leave the app's direct revocation boundary.
Calendar files similarly persist in the user's selected external calendar.

## Legacy auth and OAuth

[Entra](../../service/entra.py) validates tenant/client/issuer/signature/scope and invited object mapping.
[OAuth bridge](../../service/oauth_bridge.py) is opt-in with durable CAS grant state.
It uses a fixed client/redirect/resource/scope, PKCE S256 and encrypted transient handles.
Code redemption/refresh rotation are atomic; replayed known refresh revokes family.
Per-subject/global grant and rotation limits are explicit.
Authentication rechecks exact current Entra object/subject mapping.
These are separate from Google/Firebase SaaS membership and must not be merged silently.

## Historical defects and remaining review risks

- SA07-04 baseline: UI omitted some saved allergens; corrected and tested in both clients.
- SA07-02 baseline: mixed wording avoided paid admission; corrected and verified at quota cap.
- SA07-01 baseline: incomplete diary overstated known remainder; corrected to unknown with separate subtotal.
- SA07-03 baseline: batch/per-person shopping mismatch; corrected with household-serving metadata.
- Full document/event growth remains finite; no automatic indefinite archive is implemented.
- Runtime compatibility, real Google session, popup/media, physical device and clinical behavior are unverified here.
- CI startup failure cause is not established; no billing/security conclusion follows from it.

## Release evidence needed

Use two synthetic identities for isolation and an admin metadata-only check.
Exercise revocation/suspension/expiry during an actual controlled compute boundary.
Verify exact deployment hash, private bindings and schema before interpreting endpoint results.
Obtain real-person consent/sign-in on the intended device; never seed production identities to bypass it.
Prepare synthetic screenshots only; keep real health data out of public review artifacts.
