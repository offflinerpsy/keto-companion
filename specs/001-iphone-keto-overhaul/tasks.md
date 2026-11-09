# Tasks: AGR-306 usable KETO on iPhone

Input: spec.md, plan.md, research.md, data-model.md, contracts/flows.md. One writer; root integrates with the same issue/handoff. Tests below cover changed user behavior, not implementation mirrors. Existing auth/safety checks are retained.

## Setup
- [x] T001 Bind current project, canonical AGR-306 and owner scope in qa/RECOVERY_STATE.json and the same task handoff.
- [x] T002 Initialize local-only SpecKit1.2.5 and record requirements/plan/research/contracts in specs/001-iphone-keto-overhaul/.
- [x] T003 Accept Sol product/nutrition reviews and Terra public-data/license research into specs/001-iphone-keto-overhaul/research.md.

## Foundation and core loop
- [x] T004 [US1] Fix named food selection, stable catalog reachability, parse loading/result/unresolved feedback and quantity preservation in cloudflare-saas/public/kitchen-ui.js and service/kitchen.py.
- [x] T005 [US1] Render typed Russian pantry/dish/diary confirmations with names/known or unknown mass and action-specific CTAs; mount on originating visible surface in cloudflare-saas/public/app.js and kitchen-ui.js.
- [x] T006 [US1] Make empty portions/time +/- work from explicit defaults, clamp/validate and restore safe defaults on reset; remove cuisine field in cloudflare-saas/public/kitchen-ui.js.
- [x] T007 [US4] Reconcile one system-font/type/spacing/color scale, compact radios in >=44px rows, strong active navigation, page identity and useful hero in cloudflare-saas/public/app.css and index.html.
- [x] T008 [US4] Add explicit help close/back/focus lifecycle without dropping drafts or reopening keyboard unexpectedly in cloudflare-saas/public/app.js, routes.js and mobile-ui.js.
- [x] T009 [US1] Show named/quantified diary receipts and clear only confirmed unchanged submitted drafts in cloudflare-saas/public/app.js; retain note-only unknown-intake semantics.
- [x] T010 [US1] Extend existing focused UI/domain regressions for T004–T009 in cloudflare-saas/tests and tests/test_kitchen.py; execute once per changed output and return actual counts.

## Discovery and builder
- [x] T011 [US1] Make eligible reference recipes count/filter/continuation/diversity explicit in service/domain.py and cloudflare-saas/public/app.js.
- [x] T012 [US1] Implement a named-ingredient own-dish builder with whole-batch/per-portion calculation, explicit observational status, confirmed save and factual consumed-portion diary flow in cloudflare-saas/public/kitchen-ui.js, app.js and the owning domain boundary. Preserve exact-plan eligibility checks.
- [x] T013 [US2] Add bounded attributed external food/barcode lookup with required provider limits/cache/error states and source separation in cloudflare-saas/src and tests.

## Nutrition and shop
- [x] T014 [US3] Extend optional food/candidate provenance and GI status plus deterministic compatible-input GL/portion calculator in canonical library and service; preserve old documents and unknowns.
- [x] T015 [US2] Add Azure structured label candidate extraction using existing model/provider, image sanitation, ownership/consent/quota/idempotency and no auto-save in service and Worker bridge boundaries.
- [x] T016 [US2] Implement iPhone camera/barcode/photo/manual candidate review→confirmed food/pantry→next recommendation in cloudflare-saas/public and existing tool contracts.
- [x] T017 [US3] Add typed ketone/glucose measurement entry, correction/export and measured-only calculator outputs in canonical library/service and mobile UI.
- [x] T018 [US1] Resolve pantry quantity-unknown shopping semantics in service/kitchen.py; preserve audited method eligibility for imported foods and offer the observational own-dish path without automatic role assignment. No false exact shortfall or auto-safe classification.

## Integration and acceptance
- [x] T019 Complete focused numeric/privacy/UX tests and generated contracts/docs/build consistency in existing tests/scripts; independent Sol source/product review and exact isolated mobile screenshot checks.
- [x] T020 Run reviewed source/full CI + actual matching runtime acceptance and deploy only existing private family target; reconcile exact bindings/identity/data and restore ordinary controls using ops/scripts.
- [ ] T021 Notify owner technical work ready, then test actual iPhone17ProMax through connected Mirroring with scoped foreground window; record camera/keyboard/help/food/dish/diary outcomes in same receipt.
- [ ] T022 Close accepted issue/source/handoff with exact deployed/runtime receipts and owner-device limits in docs/CURRENT_STATUS.json and qa/RECOVERY_STATE.json.

## Dependencies and execution
T001–T003 accepted. T004–T010 one coherent first increment; root verifies before T011+. T011–T018 serial implementation packets integrate on the same state; source/data research and reviews may run in parallel without writes. T019 before T020; T021 only at final technical readiness. Do not end the owner task at a partially helpful increment; checkpoint and continue the next authorized phase. Physical device absence is a final owner-only dependency, not permission to fabricate PASS.

Owner-requested audit 2026-11-09: T020 accepted by actual C8 build `8b737ad0-055c-462b-91cc-4102f23a59ba` on `473ab8f`, independent live-control receipt in the same task verification folder. The latest owner request resumes implementation with reuse of open-source scanners and Russia/Belarus food discovery. T021/T022 remain open; retain previous C8 evidence as an earlier accepted stage.

## Resumed product refinement
- [x] T023 [US2] Integrate pinned, self-hosted Quagga2 camera barcode capture with explicit start, EAN validation, single lookup, late-permission/cancel/navigation cleanup and manual/photo fallback; progressive shop capture/result/review/save states, Russian OFF name/source context and preserved Azure/review/CAS contracts. Retain upstream notices; verify real decoder fixture and lifecycle boundaries.
- [x] T024 [US1] Make reviewed everyday foods and precise Russian/state-aware search primary for Russia/Belarus use; keep USDA supplementary, distinguish local package identity from generic composition and retain sources/unknowns. Test representative local queries without inventing nutrient values or importing unlicensed tables.
- [x] T025 [US4] Apply accepted audit first-screen/navigation/type/copy/loading fixes on existing UI, review changed source independently, verify fresh 440/390 mobile pixels and complete meaningful regression/generated/full/native release gates for this integrated candidate. Preserve earlier receipts and leave physical T021 separate.

C9 wrap-up: native new-image build c296da43 and ordinary build 7ce93b5a both succeeded; final release/device receipt `docs/evidence/AGR_306_C9_RELEASE_DEVICE.json`. T025 technical gates accepted. T021 remains partial: actual connected iPhone Chrome nav/library/native selection/help/steppers checked; software keyboard, hardware camera/voice and navigation-scroll observation remain. No new implementation cycle under the owner wrap-up request.
