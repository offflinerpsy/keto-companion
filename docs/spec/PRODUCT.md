# Product specification

> Current specification: **0.6.2-audit-pilot**, reconciled with runtime commit `e3f648d5313b68202336cda775ff7279556a2569`. The independent review examined 0.6.1; SA07-01…04 are historical findings corrected in 0.6.2. Read [current corrections](CURRENT_CORRECTIONS.md) for exact source, regression evidence and remaining acceptance gates.

## Purpose

KETO Companion helps an invited adult organize food choices, understand preliminary
energy estimates, prepare recipes and shopping, and keep a private food diary.
The current interface speaks Russian and is built as a mobile-first web app.
Its practical region is Belarus; that is a kitchen policy context, not an account geography guarantee.

## Personas and authority

- **Invited member**: signs in with their own Google account, accepts an email-bound invitation,
  gives their own consent, and manages their own health-related data.
- **Owner/admin**: invites, revokes invitations, suspends/restores members and sees usage metadata.
  Admin authority does not confer another member's diary, source or profile access.
- **Reference-only reader after membership**: can browse reference recipes without granting personal processing/storage consent.
- **Person with reported clinical restrictions**: may use general functions; personal strict planning remains gated.
- **Legacy plugin user**: belongs to the separate Entra/Azure identity contour; no automatic SaaS migration.

Sources: [Worker membership](../../cloudflare-saas/src/worker.mjs),
[screening](../../library/skills/keto-companion/scripts/keto_core.py),
[legacy auth](../../service/entra.py).

## Non-goals

The app does not diagnose, prescribe treatment, change medicines, measure metabolism,
prove ketosis, validate an appliance, or certify clinical safety.
It does not promise weight change, complete micronutrient intake, unlimited memory,
unlimited model use, free processing or a tested kitchen result.
It does not automatically synchronize Google services, send Telegram messages,
read closed Instagram content, or deliver background WebPush.
A public web page does not mean the ChatGPT plugin is publicly published.

## Functional requirements

### FR-01 — Membership and isolation

Google authentication must be verified before session creation.
A non-owner must possess a current invitation for the same email and explicitly claim it.
An active session resolves the subject; request bodies must not choose another owner.
Acceptance: a second synthetic member cannot access the first member's sources or private state;
suspension invalidates access and prevents an in-flight result from committing.
Implemented in Worker/Firebase/compute; related tests in `worker.test.mjs`.

### FR-02 — Explicit personal consent

Processing, storage and health acknowledgement are separate booleans.
The user's own confirmation is required; a spouse's approval does not substitute.
Revocation stops new personal processing and clears conversational state in the service flow.
Stored diary deletion remains a separate operation.
Acceptance: a late model response cannot commit after consent revision changes.
See [security](SECURITY_PRIVACY.md) for revocation endpoint differences.

### FR-03 — Guided onboarding

The four stages are consent, baseline/about, restrictions and targets.
Unknown medical answers remain unknown; selecting no coefficient does not invent one.
Saved answers resume the relevant stage.
Acceptance: untouched fields do not submit slider defaults, and changing baseline requires a new proposal.
Both editors preserve all 16 canonical allergens and any stored legacy value until explicit removal and confirmation. Baseline finding SA07-04 is fixed and regression-tested.

### FR-04 — Preliminary guidance

The server calculates an explained starter-v1 estimate only inside its pilot scope.
A preview neither saves targets nor accepts a menu.
Manual targets remain until an explicit replacement and retain manual provenance.
Acceptance: stale preview hashes are rejected, male/female product floors are enforced,
and a mode/goal change makes starter targets stale.

### FR-05 — Reference cookbook

Reference recipes expose edible grams, ingredient state, preparation and calculated nutrients.
Search and explicit food/time filters preserve allergies and exclusions.
A recipe reference is not an accepted day plan.
Acceptance: unknown foods are rejected and partial matches disclose differences.
Inspected base catalogue: 85 food rows and 72 recipe rows.

### FR-06 — Three kitchen modes

`pantry_only` uses only named stock; `pantry_plus` limits distinct missing food IDs;
`inspiration` can suggest without stock.
Quantity is optional and must be weighed when unknown.
Acceptance: a known shortage cannot be hidden; unknown quantity is disclosed rather than fabricated.
Viewing, selecting or saving a draft does not decrement pantry stock.

### FR-07 — Meal, day and equipment

Kitchen accepts breakfast/lunch/dinner/snack/day, 1–6 servings and 5–120 minutes per dish.
Seven equipment choices map to 18 allowed methods.
Multicooker means non-pressure steaming only; appliance instructions govern water/loading.
Acceptance: a method incompatible with equipment, raw-food safety or time is rejected.
A day with unmet inventory/nutrient checks remains partial and cannot be accepted.

### FR-08 — Grounded new recipes

The recipe model selects known IDs, amounts and allowed methods.
The server supplies steps and recalculates nutrition; a model cannot supply trusted nutrient totals.
Rejected/unavailable generation falls back to labelled, validated templates without automatic retry.
Acceptance: unknown IDs, invented title/method, hidden oil and duplicate candidates are rejected.
No kitchen-test claim may appear.

### FR-09 — Proposal and confirmation

Profile, targets, diary, preferences and kitchen saves produce visible proposals.
Applying requires the same revision, unexpired proposal and successful revalidation.
Cancellation must leave the underlying values unchanged.
Acceptance: replaying an applied proposal returns its receipt without a second mutation.
Topic/reminder actions use explicit confirmed commands rather than this same proposal object.

### FR-10 — Diary and fractions

Free text can be stored without fabricated grams/calories.
Kitchen distinguishes half a portion from half of a whole batch.
Daily summaries count quantified entries and disclose unquantified ones.
Acceptance: quantities are calculated on the server after confirmation.
Incomplete diary intake makes the remaining carbohydrate allowance unknown; known subtotal is separate. Baseline SA07-01 is fixed.

### FR-11 — Confirmed shared preferences

Confirmed dislikes apply across topics; temporary exclusions stay within the request.
The memory page lists canonical facts with origin where available and supports forgetting.
Acceptance: forgetting removes the owned exclusion without removing another fact's exclusion;
old quotes cannot restore deleted preferences.

### FR-12 — Bounded topics and retrieval

Up to 12 topics retain 60 messages each and at most 200 KB message history in aggregate.
Recent context uses eight messages; older own quotes are bounded to five snippets of 500 characters.
Deletion/clear removes topic caches but preserves shared profile/preferences.
Acceptance: another topic cannot accidentally select a candidate from the current one.
This is lexical retrieval over local records, not a full-text medical knowledge service.

### FR-13 — Dictation

Microphone recording is user started, lasts at most 60 seconds and yields an editable draft.
Cancellation/visibility changes stop tracks and ignore late transcript delivery.
Acceptance: no auto-send, no raw audio/transcript persisted in Worker jobs.
Device microphone and real provider behavior remain separate acceptance gates.

### FR-14 — Photos and personal sources

Chat images are compressed and server-reencoded; photo content does not establish exact grams.
Sources require rights acknowledgement and remain personal, owner-scoped and untrusted.
A URL-only record is `needs_content`; the app does not fetch arbitrary source URLs.
Acceptance: an ordinary supplied excerpt survives as actual discussion context,
and source instructions cannot write canonical profile/preferences.

### FR-15 — Export, share and import

Accepted current menus support PDF/CSV/HTML; JSON supports a personal data copy.
PDF preparation and system share are two user gestures.
CSV/JSON menu import recomputes trusted catalogue ingredients and requires confirmation.
Acceptance: stale/held plans cannot produce an accepted-plan export;
file sharing does not claim Telegram delivery.
Batch-derived shopping uses saved household servings before subtracting pantry stock; nutrient plans remain per person. Baseline SA07-03 is fixed.

### FR-16 — Reminders

A reminder has a local time, IANA zone, date or weekdays and an enabled state.
The app shows saved reminders; notification delivery requires manual calendar import.
ICS recurrence is bounded to 730 days; app edits do not update imported events automatically.
Acceptance: invalid times, unsupported combinations and missing future dates are rejected.

### FR-17 — Deletion and quotas

Deletion revokes sessions immediately and returns a receipt for continued cleanup.
Private R2 objects and D1 active data are cleaned in bounded steps.
Model requests have per-user/global Worker accounting and service limits.
Acceptance: uncertain upstream effects are not replayed with the same request ID.
All potentially paid chat requests now reserve Worker quota before compute, with refund only on a trusted no-model result. Baseline SA07-02 is fixed.

### FR-18 — Interface and navigation

Four primary tabs are Chat, Menu, Diary and More.
Secondary screens preserve browser Back/Forward and a labelled in-app Back.
Large text, dark/light, compact and simple modes must retain essential content and gates.
Acceptance: source/UI tests plus fresh synthetic screenshots at the required viewports;
this review did not execute visual acceptance.

### FR-19 — Separate releases and operations

Maintain existing plugin/cloud identities; never recreate resources as recovery.
Build generated assets from maintained source and record exact hashes.
Acceptance: source, CI, staging deploy, real sign-in, device and clinical evidence are distinct.
Only family staging is reported released in the task context; no live claim was refreshed here.

## Product invariants

- INV-01: membership ≠ authentication ≠ personal consent.
- INV-02: admin metadata ≠ access to another person's medical records.
- INV-03: a preview, selected recipe or drafted day ≠ a confirmed saved event.
- INV-04: unknown quantity/nutrient/answer ≠ zero/no/default.
- INV-05: model text and external source text never own arithmetic or permissions.
- INV-06: a changed profile/catalogue invalidates earlier plan approval.
- INV-07: durable personal facts and bounded historical quotes have different authority.
- INV-08: local test completion ≠ device, cloud, clinical or public-plugin acceptance.

See [requirement matrix](requirement_matrix.json) for source/test links by ID.
