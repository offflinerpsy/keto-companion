# User flows and acceptance transitions

> Current specification: **0.6.2-audit-pilot**, reconciled with runtime commit `e3f648d5313b68202336cda775ff7279556a2569`. The independent review examined 0.6.1; SA07-01…04 are historical findings corrected in 0.6.2. Read [current corrections](CURRENT_CORRECTIONS.md) for exact source, regression evidence and remaining acceptance gates.

Source UI: [app](../../cloudflare-saas/public/app.js),
[setup](../../cloudflare-saas/public/setup-ui.js),
[kitchen](../../cloudflare-saas/public/kitchen-ui.js),
[mobile](../../cloudflare-saas/public/mobile-ui.js).
Server authority: [domain](../../service/domain.py), [Worker](../../cloudflare-saas/src/worker.mjs).

## FLOW-01 — Invitation to first personal plan

1. Admin creates an email-bound invitation and receives a link once.
2. Intended person opens the link and signs in with their own Google account.
3. Verified identity creates pending membership; explicit claim activates it.
4. Person checks their own processing/storage/health consents.
5. About stage collects explicit baseline, timezone, coefficient, activity, goal and mode.
6. Save prepares a baseline proposal; person reviews and applies it.
7. Restrictions stage collects explicit answers, medication list and allergies.
8. Profile proposal is reviewed/applied; unknowns remain unknown.
9. Targets screen calculates a preview with explanations, provenance and feasibility note.
10. Apply targets prepares another proposal; confirming saves working targets.
11. Menu calculation creates a draft; only Choose menu → proposal → Apply accepts it.

At any stage, reference recipes remain a supported alternative.
A blocker must explain its actual reason; the flow must not substitute demo calories.
An infeasible catalogue result does not weaken constraints.
Allergy editor round trips preserve every supported and stored value; see the SA07-04 regression in current corrections.

## FLOW-02 — Text, dictation and photo discussion

Text send binds a request ID to content and topic.
The UI shows pending state, then accepts the returned snapshot or a truthful error.
Intent can return a recipe, explanation, route hint or proposed change.
No model phrase alone means a personal fact was applied.

Dictation:

1. User starts recording and grants site microphone access if needed.
2. Recorder captures MP4/WebM, at most 60 seconds/1 MB.
3. Stop releases media tracks and starts recognition; Cancel aborts delivery.
4. Backend validates signal/container, then calls the fixed transcription route if valid.
5. Text is appended to the editable draft.
6. User corrects it and separately clicks Send.

Photo:

1. User selects/pastes an image; client prepares a bounded JPEG preview.
2. Photo remains local until message send; Remove clears it.
3. Backend reencodes accepted JPEG/PNG and drops original metadata.
4. Model may discuss visible content; grams/oil/allergens still require explicit clarification.

If session/consent changes, epoch guards discard late UI delivery and clear private display.
Cancellation is not proof of upstream billing cancellation.

## FLOW-03 — Kitchen to saved recipe, diary and PDF

1. Open Recipe Studio; select pantry mode explicitly.
2. Add exact foods or parse text and resolve ambiguous state/quantity/identity.
3. Optionally save pantry through proposal/apply; request-local pantry may differ.
4. Choose meal/day, servings, time and one equipment option.
5. Generate uses server methods, permitted IDs and constraints.
6. View per-portion/batch grams, missing stock, steps, sources and fallback label.
7. Select for chat changes working selection only.
8. Save recipe/favorite prepares a proposal; apply saves it.
9. Half-portion or half-batch diary action previews exact scaled ingredients.
10. Apply logs confirmed intake; it does not automatically decrement pantry.
11. For a full day, every aggregate check must pass before accept-day proposal.
12. Apply saves recipes and the current accepted day plan.
13. Prepare PDF revalidates current plan and generates the private file.
14. Share PDF is a second user gesture to the system sheet; Telegram delivery is not verified.

Incomplete diary entries now make the remaining carbohydrate allowance unknown (SA07-01 fixed). Saved shopping uses household batch size separately from personal nutrient totals (SA07-03 fixed).
Do not resolve either by hiding unknowns or changing clinical targets.

## FLOW-04 — Temporary wish to persistent memory

“Without chicken today” changes request filters only.
“Remember I dislike chicken” can prepare a canonical preference proposal.
Apply records the explicit fact and shared dislike IDs.
Another topic then respects that canonical preference.
Memory page shows the fact and its explicit-confirmation origin/time where available.
Forget proposes a particular fact removal; Apply removes only its owned contribution.
Old historical quotes are filtered and cannot authorize restoring the preference.
Clearing/deleting a topic preserves shared preferences and profile.

## FLOW-05 — Topics and browser navigation

Create/select/delete/clear topic asks about discarding unsent text/photo when relevant.
Recorder is cancelled before a discarding topic transition.
Topic commands include confirmed=true and the current service revision.
Candidate IDs stay associated with their existing topic group.
Main topic can be cleared but not deleted.
Primary tabs replace history; nested screens and reference recipe dialog add history.
Browser Back closes the reference dialog or returns to the actual parent entry.
No topic content belongs in route query parameters or public URLs.

## FLOW-06 — Personal source to discussion/recipe

1. User pastes ordinary text or supplies an allowed file/URL and rights acknowledgement.
2. URL alone is needs_content; no fetching/reading claim.
3. Actual text/image creates a private draft source.
4. Discuss attaches that own source to the next message, which user sends separately.
5. Worker resolves source content/provenance and prevents forged source_context.
6. Source enters the model context as untrusted material.
7. Prepare recipe opens a manual known-ID/grams/state form.
8. Server validates allergens/nutrients and creates a catalogue recipe proposal tied to source.
9. Apply saves the personal recipe; source can become personal_recipe.
10. Source deletion removes source file/metadata; previously saved recipe is a separate object.

An external source is not a profile assertion or new validated clinical guideline.
No closed Instagram scraping is implemented or authorized by this flow.

## FLOW-07 — Reminders and calendar

Choose a template or fill title, time, zone and date/weekdays.
Saving is an explicit confirmed command, with revision checking.
App stores the reminder and next due time; UI marks overdue while open.
Calendar action downloads ICS with timezone and bounded recurrence.
User imports it and verifies time/notification permission in the calendar application.
Editing/completing/deleting in KETO does not silently update that imported event.

## FLOW-08 — Admin and member suspension

Admin sees membership/invite counts and activity/request metadata.
Creating an invite does not send it to anyone automatically.
Revocation prevents a still-unclaimed invitation from being used.
Suspension removes sessions and makes compute commit checks fail.
Restoration permits fresh authorized sign-in; deleting accounts cannot be restored this way.
Admin cannot open another member's private sources, diary or health export through this API.

## FLOW-09 — Revoke, export and delete

Revocation asks explicitly and stops processing/new personal records.
It is distinct from deleting previously saved diary data.
A personal JSON copy is distinct from an accepted-menu export.
Stale/held plans cannot be exported as current PDF/CSV/HTML.

Deletion:

1. User types the required destructive phrase.
2. Worker suspends membership, revokes sessions and returns a deletion receipt.
3. UI clears private state and shows recovery status/code.
4. User/authorized operator continues cleanup using that same receipt.
5. Pending uploads and R2 failures produce truthful pending status, not a false complete.
6. Active data deletion completes with separate backup/version-retention caveat.

Do not replay a lost deletion start; reconcile the existing same-target receipt.
No production deletion was attempted in this review.
