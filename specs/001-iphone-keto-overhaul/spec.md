# Feature Specification: usable KETO on iPhone

**Feature Branch**: `codex/iphone-keto-overhaul`
**Created**:2026-11-09
**Status**: Accepted implementation baseline
**Canonical issue**: AGR-306
**Input**: Owner's dictated spouse-first usability overhaul in this chat. Final physical iPhone17ProMax test is deferred until the owner connects Mirroring; technical work proceeds now.

## User Scenarios & Testing

### User Story1 — choose, cook and record food (Priority:P1)
A Russian-speaking person chooses named foods, understands available quantities, prepares a meal/day, confirms a meaningful change and sees exactly what was saved.
**Independent test**: add named broccoli with unknown mass and cheese with known mass; parse, review pantry, cancel then save; choose two servings and cooking time with the first +/- tap; choose a dish and record the consumed fraction. Each step has visible status and no internal codes.
**Acceptance scenarios**: all85 current local foods and72 reference recipes are reachable, including search synonyms and preparation state; no silent result cap. Unknown mass reads «масса не указана». Proposals show human names, Russian fields and action-specific buttons; stale/expired actions stay blocked. Diary confirmation is visible on the current screen and a saved entry is identifiable.

### User Story2 — inspect a product in the shop (Priority:P1)
The person scans a barcode or photographs a label, reviews the exact candidate and saves it to personal foods/pantry before receiving an appropriate next recommendation.
**Independent test**: a known barcode and readable synthetic label produce attributed, editable candidates; cancel changes nothing, confirm saves once, missing/allergen/basis ambiguity stays explicit, quota/network failure preserves the draft. Camera denied/unsupported and unknown barcode offer photo/manual routes.

### User Story3 — understand nutrition and measurements (Priority:P1)
Foods expose nutrient basis, source and GI status; portions and available carbohydrate determine usable calculations. Ketone/glucose values come from explicit measurements.
**Independent test**: independently known arithmetic fixtures prove per100g/serving, EU/US carbohydrate semantics and GL when GI is actually sourced; missing values remain incomplete. Measured values retain type/unit/time and can be corrected without inventing ketosis.

### User Story4 — predictable iPhone use (Priority:P1)
Every screen has a clear title and active navigation; type, controls and dialogs follow familiar platform patterns. Design supports tasks rather than covering content.
**Independent test**:440x956 and390x844 layouts, large text and landscape show no horizontal overflow, compact radio glyphs inside >=44px rows, readable selected tabs, reachable modal close/action with keyboard. Final actual iPhone test uses Mirroring after technical gates.

### Edge Cases
Unknown food/state/quantity; same names with different preparation/brand; old search response arriving late; unresolved label carbohydrate basis/fiber/allergens; photo blur; barcode not found; rate limit/offline; cancelled camera; stale/revoked/expired proposals; changed session while work runs; empty numeric input; meal batch versus consumed personal fraction; unquantified diary and missing GI/ketone data.

## Requirements

### Functional Requirements
- FR-001: Basic flows use Russian food/action labels, never require learning internal IDs or expose raw payload keys.
- FR-002: Every prepare/save/parse/search action shows pending/result/error; invalid input cannot silently do nothing or trigger a paid generation.
- FR-003: Steppers work from empty input using explicit portions/time defaults; onboarding body measurements remain blank until supplied.
- FR-004: Search results disclose scope/count/continuation and reach all eligible records; reference browsing avoids incidental single-family first screens.
- FR-005: The dish builder selects named ingredients, amount/state, portions and steps; previews personal versus whole-batch nutrition and saves through confirmation.
- FR-006: GI requires source/preparation and explicit unknown status; never infer GI from macros/photo or assume missing is zero. GL is calculated only from compatible known inputs.
- FR-007: Barcode/product/label results are untrusted candidates with source, completeness and confirmation; preserve allergens and refuse invented nutrients/weights.
- FR-008: Add actual measured ketones/glucose and usable deterministic tools; do not present an inferred medical ketosis state from food.
- FR-009: Shop recommendations reuse confirmed stock/preferences/targets and expose missing quantities; unknown inventory never becomes a precise shopping amount.
- FR-010: Use system typography and lawfully reusable icons; clear active state, compact controls, explicit close and retained drafts; remove cuisine-style control and obsolete hero overlay.
- FR-011: Preserve auth, account isolation, existing Azure model routing, consent, safety holds, revisions/CAS, unknown values and serving semantics. No new paid account/key assumed.
- FR-012: Prioritize Russian/Belarus everyday foods and local packaged products. Barcode capture must use a pinned, self-hosted open-source decoder with notices and camera cleanup. Open Food Facts supplies attributed untrusted local-brand candidates; the existing reviewed generic catalog is primary for everyday ingredients, with precise Russian aliases and USDA as an explicitly named supplementary reference. Do not invent local nutrient values or treat a public website as an open data license.

### Key Entities
Food; FoodCandidate; Source/provenance; GI observation; PantryItem; Dish/servings; Consumption; Measurement; Proposal; ShoppingRequirement. Confirmed versus candidate and per-person versus batch are distinct.

## Success Criteria
- SC-001: The named-food→saved-pantry→dish→diary flow completes without internal codes, raw English keys, or silent actions.
- SC-002: All eligible local foods/recipes can be reached; a barcode/photo has a useful review/manual outcome even when external data is missing.
- SC-003: First +/- tap changes an empty portions/time control; invalid actions show a nearby error and do not consume a model call.
- SC-004: Every shown number has a defined basis; unknown GI/nutrients/measurement is visibly unknown; deterministic examples match independent calculations.
- SC-005: Technical tests and exact mobile screenshots pass, then the owner can complete pantry/shop/recipe/diary/help tasks on the actual iPhone without guidance.

## Assumptions
Private family use; Russian default; spouse iPhone17ProMax primary, existing desktop remains usable. Existing accounts and infrastructure. iOS conventions are a reference, not redistribution permission for Apple fonts/assets. General GI coverage cannot be guaranteed for every branded product; sourced values and missing status are mandatory. No framework rewrite or speculative service split.

## C21 — observed loading regression (2026-11-11)
Owner reports pantry proposal stuck at checking products, workspace retry after successful Google login, and actual phone UI differing from previews. Preserve the current design; fix demonstrated failures. Acceptance: a failed/stalled request terminates visibly, cannot indefinitely block workspace retry, and is never automatically replayed; rendered actual mobile UI and loaded assets are checked separately from synthetic previews. Physical-device mismatch remains unverified until the exact page or screenshots are supplied.

## C24 — contextual technical bug reports (2026-11-11)
A signed-in active member opens «Сообщить об ошибке» from the top menu, chooses a known visible block or taps it without triggering its action, and reviews a technical description before explicit submission. The selected block can be highlighted. Phone keyboard dictation supplies editable text; no paid transcription request is started. The review contains only the manually supplied text, safe route/block IDs, app version, bounded viewport and allowlisted error code. No query/hash, DOM contents, profile, diary, chat, photo or automatic screenshot is attached. Screenshot upload is omitted in this first increment.

The authenticated D1 inbox assigns durable KETO-number/status receipts. Members list only their own reports; administrator intake reads reports only. Immutable same-client-ID submissions are idempotent; uncertain delivery is checked by that ID before any explicit retry. The already-reviewed submitted minimal payload persists per account in session storage until confirmed, so a reload can restore the original payload and retry the same ID after a missing receipt. Drafts before submission stay in memory. Legacy ID-only pending records disclose that the original text cannot be recovered. Late send/check results cannot update another identity after reset. The report version identifies the rendered client revision 0.7.1-C24, independent of the static server label. A per-member atomic daily limit bounds intake. Lists have cursor continuation. Admin triage uses new/in_progress/ready_to_verify, optional existing Linear issue URL, and fix version plus concrete verification evidence for ready_to_verify. Only the original reporter explicitly verifies to close; reporter can reopen. Revision conflicts preserve current state. Canonical engineering tasks remain in Linear; this intake does not claim automatic issue creation. Reviewed technical descriptions are visible to the administrator, and account deletion removes them.

Acceptance: real handler/schema tests demonstrate own/admin isolation, strict context rejection, race-safe deduplication/conflicting-ID refusal, immutable uncertain-send reconciliation, revision/transition/evidence gates and deletion. Root separately checks actual rendered mobile lifecycle and release; physical microphone/keyboard acceptance remains an owner-device check.


## C25 — usable online recipes and regional ingredients (owner continuation 2026-11-11)

The owner rejects a research-only result and a small fixed recipe library as the app's discovery limit. A person must be able to ask for a dish or ingredient, receive newly found public recipes with identifiable sources, review exact ingredients/amounts/yield, calculate a portion, save the personal dish and explicitly record eating it. Existing saved recipes remain useful alongside online discovery.

- FR-C25-1: A visible action in Recipes performs external recipe search for the submitted public food query. The result is sourced from an actual search call; completed searches show source links and result status. Search failure or timeout is reported clearly and never relabeled as a sourced result. Repeated uncertain paid requests are reconciled, not replayed. The user may continue using saved recipes while discovery is pending.
- FR-C25-2: A found recipe carries source title/URL, retrieval time and imported status into ingredient review and the saved personal dish. Selection alone does not save a recipe or log intake. Source text is untrusted; its instructions cannot change permissions, calculation rules or personal data. No automatic claim of keto suitability or source nutrient accuracy.
- FR-C25-3: The review editor retains all stated ingredients, amounts, units, servings and cooking steps. Food/state matches are suggested from real catalog data and remain editable. Unknown or ambiguous grams/state/servings are explicit questions; pieces/cups/finished yield are not silently converted. Nutrition is calculated from confirmed ingredient data; no model-invented nutrient or GI values. A recipe with unresolved quantities cannot be presented as a complete calculation.
- FR-C25-4: Normal ingredient selection offers Russia/Belarus packaged-product search using the entered query, alongside ordinary saved foods and the clearly labeled USDA reference. Exact package review and personal-product confirmation can return that product to the originating dish/portion picker while preserving draft title, ingredients and steps. Cancelled/stale/account-changed origins cannot receive products. Regional misses expose wider-country/manual alternatives.
- FR-C25-5: Known available carbohydrate survives regional product → whole dish → portion → saved recipe → intake snapshot/history independently of unknown total/net values. Mixed known/unknown coverage shows its known subtotal and incompleteness; missing is not zero and fiber is never subtracted twice.

Acceptance: an actual existing Azure search returns attributable recipes outside the built-in108; at least one recipe is reviewed, calculated and saved in an isolated synthetic account, then its explicit eaten portion appears in history with source/amount semantics. A regional search starts from a partly filled dish and returns a reviewed product without losing the draft. A product declaring3.2g available carbohydrate per100g at200g gives6.4g batch/3.2g per two-serving portion/1.6g for half a portion while total remains unknown. Replay, incomplete quantity, prompt-injection, source mismatch, stale-origin and owner isolation checks cover their real boundaries. Published mobile UI and cloud/backend identities must be verified separately from local checks; physical iPhone observation remains distinct.
