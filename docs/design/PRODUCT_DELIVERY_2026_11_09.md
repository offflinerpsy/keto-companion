# KETO: approved everyday product delivery

Owner authorization: 2026-11-09, implementation, verification and release to the existing private-family target. This replaces the preceding advisory pause. Preserve the existing stack, providers, identities and data boundaries.

Baseline: `e755bb5934cdb3ecbc8d0233dfdbae42c8b76729`; canonical issue [AGR-306](https://linear.app/agregator/issue/AGR-306/keto-polnocennye-scenarii-pitaniya-i-pokupki-na-iphone), existing PR 20 and branch `codex/iphone-keto-overhaul`. The complete Russian review is [owner-approved product review](https://chatgpt.com/library?file_id=libfile_e699eed803f481918ac0bffbec01d32a&account_id=personal).

## Product contract

- Four roots: **Чат / Дневник / Рецепты / Продукты**. Chat is the ready-profile default. Profile/settings is a header destination. Keep `#today` and saved `home=today` as the nested **Моё меню** route under Recipes.
- One intake flow for catalog/generated/own recipes and products: **Записать съеденное → quantity/basis → actual eating day/time → calculated review → Добавить в дневник → receipt, entry and affected-day totals**.
- Saved recipe, planned meal, stock quantity and actual eaten portion are independent facts. No automatic stock subtraction or diary write from merely selecting a recipe.
- Chat owns most of the viewport, has one compact composer and message-specific contextual actions. Pending confirmations remain reachable without occupying the conversation; closing a dialog is different from cancelling a server proposal.
- Diary supports selected dates, real history beyond the last-60 snapshot, edit/repeat, and immutable server calculation for new records. Legacy missing time/snapshot remains explicitly missing.
- Grocery uses existing C9 barcode camera, label photo, search and manual fallback through method → facts → review → save/use. Unknown mass/basis, allergens and nutrients remain honest.

## Sequential stages

1. **C10 shell**: compact four-tab navigation, controls, scoped proposals, dialog/back lifecycle and scroll preservation. Verify 440×956 and 390×844, Normal/Large and dark, topic/identity changes, pending state and existing navigation.
2. **C11 intake/history**: backward-compatible server-owned nutrition snapshot, eating date/time, one editor, selected-day totals and full paged history; edit/repeat and exact confirmation receipt. Start with one real catalog recipe and real synthetic-user persistence.
3. **C12 chat actions**: server-validated closed action types attached to messages/thread/object/revision, restored with history; route to the same intake editor. Text/voice remain editable and never silently save.
4. **C13 all food sources**: generated and own dishes, products/calculator and grocery continuation use the same intake contract; preserve existing eligibility and source protections.
5. **C14 acceptance/release**: domain, transport and rendered UI verification, full source CI, exact protected-runtime acceptance, existing Azure compute deployment and existing private-family Cloudflare release. Report physical-device limitations separately.

## Non-negotiable verification

Quantity basis distinguishes 0.5 serving from 0.5 batch; no raw-to-cooked yield guess. Unknown nutrient ≠ zero. Date/time belongs to the confirmed timezone and differs from recorded_at. Snapshot survives catalog/topic changes. Edit preserves ID; repeat creates a new confirmed record. Day summaries include rows beyond a displayed page. Cancel does not apply nutrition/menu/stock changes, though proposal bookkeeping may change. Stale revision, double tap, ownership and one-time ui_confirmation remain enforced. Consent/allergies/holds and plan eligibility remain authoritative.

Use the existing 17px system font, neutral surfaces and blue accent; preserve Large. One primary action per stage, 48px primary touch targets, 16px screen gutters, compact lists. Existing licensed SVGs are reused. No new framework, provider, animation system, broad catalog research or medical algorithm is part of this delivery.

## Execution and evidence

One authoritative writer and one active implementation stage. Isolated candidate files are reviewed before integration. Independent reviewers use GPT-6 Astra with maximum reasoning; no lower-model delegation. Keep commands/results, exact source hashes, blockers and one next stage in qa/RECOVERY_STATE.json. Preserve earlier failures and device PARTIAL evidence.

Only a deployed matching revision plus the relevant passing checks establishes technical release. Screenshots and synthetic tests do not establish spouse/device or clinical acceptance.
