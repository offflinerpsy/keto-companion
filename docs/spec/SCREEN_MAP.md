# Screen map

Source: [index](../../cloudflare-saas/public/index.html),
[router](../../cloudflare-saas/public/routes.js),
[app](../../cloudflare-saas/public/app.js),
[setup](../../cloudflare-saas/public/setup-ui.js),
[kitchen](../../cloudflare-saas/public/kitchen-ui.js),
[mobile](../../cloudflare-saas/public/mobile-ui.js).
Exact static selectors are in [UI_CONTRACTS](UI_CONTRACTS.md).

## Route and shell model

Hash routes are client navigation; Worker does not serve a separate private HTML page per route.
Canonical routes: chat, today, diary, more, recipes, settings, sources, reminders,
admin, targets, knowledge, memory and setup-consent/about/restrictions/targets.
`setup` resolves to the saved stage; `onboarding` resolves to setup-restrictions.
The static onboarding page is moved into a setup slot and loses its `data-page` at initialization.
All four setup routes display `[data-page=setup]`, with one slot visible.

Main tabs replace each other in history; secondary screens push history entries.
Back uses actual history depth, otherwise a defined parent fallback.
Reference recipe dialog creates a dialog history entry on the same route.
Help/topic/source-recipe dialogs have their own close controls; do not assume identical history behavior.
An unrecognized hash falls back to the current supported entry route.
First-run routing prioritizes unfinished setup unless the requested route is recipes.

## Shell and login

| Surface | Sections/actions | States |
| --- | --- | --- |
| Header | Brand, Back, connection, Help, Refresh | Back hidden on primary tabs; narrow/short status hidden |
| Login | Google sign-in, invitation claim, switch account | Missing setup, cancelled/blocked popup, uninvited email, pending member |
| Deletion recovery | Receipt field, continue action, status | Missing code, pending cleanup, complete; no health content |
| Workspace | Four tabs; content; safety holds; toast; proposals | Hidden until own session/state; screen reset on session/consent boundary |
| More | Secondary destinations and public document links | Admin entry shown only for admin; API remains authoritative |

Persistent proposal host `#proposals` is a single moving node.
It can be inserted in chat/setup/targets/kitchen/memory or after the originating form.
Do not duplicate it into every screen or replace it while callbacks still refer to it.

## Chat — #chat

Entries: primary Chat, suggestion, source Discuss, explicit conversation action.
Hosts: topic bar, `#messages`, `#chat-extras`, `#chat-confirmations`, composer, suggestions.
Actions: create/select/edit topic; text send; attach/remove photo; record/stop/cancel dictation;
open recipes; fill prompt draft; continue onboarding; apply/cancel proposed change.

Empty: assistant introduction with relevant next choices.
Loading: pending bubble “Разбираюсь…”, send/mic busy restrictions.
Error: unfinished-message bubble retains failure; do not claim a saved reply.
Confirmation: proposal appears in the chat insertion context, then apply/cancel.
Safety: urgent response can bypass an already busy chat and mark plans held.
Voice transcript is inserted into the text field and still requires Send.
Photo-only submit uses a neutral clarification request; no assumed exact composition.

## Setup consent — #setup-consent

Entry: first run, Continue setup, saved consent stage.
Host: `#setup-consent-slot` contains the moved `#consent-panel`.
Three required checkboxes and an explicit submit govern personal processing/storage/health.
Reference recipes remain an exit path without personal consent.
Stage progress and explanation indicate the four steps.
Failure: saved values remain; missing consent must not silently become true.
Back fallback leads to recipes.

## Setup about — #setup-about

Baseline form: optional name, zone, age, height, weight, measurement date,
equation coefficient, activity, goal and mode.
Explicit helpers: measured today; use device timezone; step buttons; weight slider.
The slider handle can have a visual start while the untouched input remains empty.
Submit prepares `guidance.setup`, shown in `#setup-confirmations`.
Do not set numeric defaults from illustrative designs.
Back fallback leads to consent.

## Setup restrictions — #setup-restrictions

Contains moved `[data-page=onboarding]` source markup, now within `#setup-restrictions-slot`.
Form: display name, timezone, free-text goal, medication names, allergy checkboxes,
one screening question at a time, previous/next, explicit prepare-save.
Question answer values unknown/yes/no map to null/true/false.
The first unanswered or unreviewed field determines the resumed question.
Submit compares changed fields and prepares `profile.update`.
SA07-04: current checkbox subset can drop a previously saved unlisted allergen.
Do not hide or recode this gap as a successful simplified questionnaire.

## Setup targets — #setup-targets

This route's setup panel points to the separate targets screen and knowledge explanation.
It is the fourth guided stage, not an automatic target apply.
The stage can remain incomplete until a valid target proposal is confirmed.
Back fallback leads to restrictions.

## Targets — #targets

Saved targets panel, explicit Calculate button, preview, apply-preview button,
shared confirmation slot and manual-target details form.
The energy-review surface is dynamically inserted after target preview.
Its two inputs remain associated with targets-form through explicit form attributes.

Preview success: explained calculation, source IDs, uncertainty, assumptions,
catalogue feasibility note and replacement differences.
Preview unavailable: human reasons and route back to the needed setup step.
Loading: awaited action; no automatic target save.
Edited preview fields clear lastPreview/apply button to avoid applying a stale automatic candidate.
Manual edits are labelled user-edited; validation/floors remain server-owned.
Apply preview first prepares a confirmation card; it does not directly accept a menu.

## Knowledge — #knowledge

Entry: More, setup rationale, targets rationale.
Host `#knowledge-cards` contains generated explanations, included references,
product assumptions and excluded-source disclosure.
Links open official sources with noopener/noreferrer.
Empty/error of a new source should not be filled with fabricated summaries.
This is a static curated explanation view, not full-text retrieval over newly fetched pages.

## Recipes / Recipe Studio — #recipes

Entry: Chat shortcut, More, reference exit from setup, target infeasibility path.
Main host `#kitchen-studio` contains the generated studio form/results.
The reference library is a secondary `<details data-testid=recipe-library>` with search/cards.
Keep these experiences visually distinct: new candidates vs existing reference catalogue.

Studio sections:

1. Three mode cards with stable values pantry_only/pantry_plus/inspiration.
2. Exact food lookup/datalist and Add.
3. Free-form product parser and explicit unresolved-product choices.
4. Pantry chips with state, optional grams and remove.
5. Save pantry / load saved pantry controls.
6. Meal, batch servings, time, missing-item limit, equipment, cuisine and temporary avoid.
7. Generate action, status and result grid.
8. Optional day card with aggregate shopping/issues/accept-day action.

Candidate card sections:

- Label/origin, dish name, time and total servings.
- Equipment note and Why fits details.
- Light/side warning where relevant.
- Per-portion and whole-batch nutrient displays.
- Per-portion grams; expandable whole-batch grams.
- Canonical preparation steps.
- Missing-only shopping with unknown-quantity disclosure.
- Source references and limitations.
- Select for chat; save; favorite; half-portion/half-batch diary; rating.

Empty pantry: explain inspiration mode; do not invent stock.
Unknown product: require a precise choice/label or explicit continue-without action.
Loading: “Проверяю продукты и способы готовки…”, generate disabled.
Fallback: clearly labelled templates, no paid model success claim.
Partial day: visible issues; no accept action until full checks pass.
All save-family actions insert the same proposal host near the result surface.

## Memory — #memory

Host `#kitchen-memory` is rendered from the current own snapshot.
Shows confirmed preference rows with origin/time, legacy dislikes, favorites,
pantry confirmation, explicit dislike input and links to allergies/targets/pantry.
Forget and favorite removal prepare proposals; they do not clear all state.
Empty facts: explain the bounded canonical memory instead of claiming total recall.
Topic deletion does not remove the shared facts shown here.
Unknown historical date must remain unknown.

## Menu — #today

Entry: primary Menu; successful chat menu can navigate here.
Sections: gate/explanation, recipe/target links, start date/day count,
draft or saved plan, preparation links, shopping, PDF and other exports/import.
Draft has Choose this menu; saved plan has accepted/stale state.
A profile change invalidates the draft; hold blocks the old menu display.
No feasible menu: explicit constraint explanation and reference-recipe path.
PDF preparation then share/download are distinct states.
Do not show an export as successful before actual file construction returns.

## Diary — #diary

Entry: primary Diary or daily-summary action.
Form: explicit date and note, prepare proposal.
List: newest first from last 60 snapshot records, date, note and delete action.
Empty: invitation to add a note without mandatory weight/calories.
Delete is a proposal, not immediate disappearance.
Current compact diary display is not a complete nutrient visualization.
Do not fill unrecorded days with zero intake.

## Reminders — #reminders

Entry: More or chat route hint.
Templates: daily note / weekly menu; neither saves without form submit.
Fields: hidden current ID, title, local time, IANA zone, weekdays or date, enabled.
List: due/enabled/completed state; Complete, Edit, Delete, Add to calendar.
Error: invalid/missing time/date/zone is an explicit validation result.
Empty: choose template or fill form.
ICS disabled without an enabled future occurrence.
Delete confirmation explains imported calendar event remains separate.
The minute refresh is visual while open, not a background notification engine.

## Settings — #settings

Appearance theme/text/density/home/simple/nutrition display and cooking settings.
Save prepares one atomic configuration proposal for changed UI/settings.
History provides rollback proposals to prior appearance values.
Other controls: continue onboarding, revoke, logout, destructive data deletion.
Revoke uses explicit confirmation; delete requires typed УДАЛИТЬ.
Clear-screen logic belongs to session/consent handling, not visual layout experimentation.

## Personal sources — #sources

Form: title, author, URL, text, JPEG/PNG/text upload and rights acknowledgement.
List: own source title/provenance/status/excerpt; optional file download.
Actions: delete; discuss; prepare recipe; mark draft reviewed.
URL-only needs_content rows have no discuss/recipe controls until actual content exists.
Discuss attaches the selected source to the next chat message; it is not auto-sent.
Source recipe dialog collects exact known IDs/grams/states and requires a later proposal apply.
No source fetch, Instagram scraping or clinical evidence approval occurs here.

## Admin — #admin

Admin-only entry/API displays aggregate counts, member metadata/usage and invitations.
Invite form produces a one-time link; user must handle its delivery.
Suspend/restore member and revoke unclaimed invitation are direct explicit controls.
No health diary, private source excerpt or another user's export belongs on this screen.
Hidden nav is only presentation; server role checks remain mandatory.

## Dialogs

| ID | Entry | Contents and closure |
| --- | --- | --- |
| recipe-dialog | Reference/plan recipe detail | Ingredients, state, grams, steps, safety note, feedback proposal; router-backed close/Back |
| topic-dialog | Topic edit | Title rename, clear, delete, close; main delete disabled |
| source-recipe-dialog | Source prepare recipe | Name/category/servings/time/ingredient rows/steps; close or prepare proposal |
| help-dialog | Header Help | Searchable local FAQ and close |

Preserve native dialog semantics, labels, focus visibility and scroll.
Real assistive-technology focus-return behavior remains an acceptance check.

## Public pages and manifest

`/help`, `/privacy`, `/delete` are standalone public documents served by Worker allowlist.
PWA manifest and icons describe an installable-looking web surface.
No service-worker/background WebPush behavior is established by the manifest.
These public pages do not expose a logged-in person's data.
