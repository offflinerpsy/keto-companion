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
