# QA and release gates

> Current specification: **0.6.2-audit-pilot**, reconciled with runtime commit `e3f648d5313b68202336cda775ff7279556a2569`. The independent review examined 0.6.1; SA07-01…04 are historical findings corrected in 0.6.2. Read [current corrections](CURRENT_CORRECTIONS.md) for exact source, regression evidence and remaining acceptance gates.

## Independent baseline review: what it did

SPEC-AUDIT-07 inspected maintained source, migrations, frontend modules and workflow.
It ran four short, synthetic in-memory reproducers, with no network/model/GUI/browser/cloud.
It did not run full pytest/Node suites or build generated assets; parent owns those checks/fixes.
See [review probes](review_probes.py), [findings](../../qa/SPEC_AUDIT_FINDINGS.json)
and [completion receipt](../../qa/SPEC_AUDIT_DONE.json).
Four reproduced inconsistencies are not an exhaustive bug count.
No test pass establishes absence of bugs or clinical readiness.

## Checked-in test inventory

[TEST_INVENTORY](TEST_INVENTORY.md) enumerates discovered Python test functions
and named Node tests from source; it is not execution coverage.
[Requirement matrix](requirement_matrix.json) links relevant files by FR ID.

| Area | Existing tests | What they address | Remaining boundary |
| --- | --- | --- | --- |
| Domain/core | test_service.py; core tests | Consent, proposals, CAS, arithmetic, screening, imports, exports | Clinical validity and arbitrary input space |
| Legacy OAuth | test_oauth_bridge.py; test_oauth_ui.cjs | PKCE, replay, rotation, revocation, transport/UI behavior | Actual ChatGPT/Entra sign-in and hosted resource |
| Signed bridge | test_edge_candidate/bridge/ed25519.py; ed25519-bridge.test.mjs | Envelope validation, signatures, replay, memory state | Exact deployed verifier/bindings |
| Worker | worker.test.mjs | Membership, invites, source isolation, consent races, quotas, deletion | Real D1/R2/runtime and person login |
| Planning | test_planning.py; test_portion_search.py | Scope, rounding, stale targets, search constraints | Actual user needs and acceptable diet variety |
| Kitchen | test_kitchen.py; parent/release/appliances suites | Ingredient parsing, inventory, methods, confirmations, memory | Sensory/cooking/device/manual checks |
| Mobile | test_mobile.py; parent review | Topics, audio fixtures, PDF, calendar, cleanup | Real microphone, keyboard, file share and device |
| Frontend modules | static/setup/kitchen/media/firebase-flow Node tests | Source contracts, router, sliders, injected media/SDK behavior | Pixels, focus and browser APIs in actual browser |
| Browser scripts | tests/browser/*.spec.mjs and browser_journey.py | Prepared journey/viewport scenarios | Not executed here; authorized parent only |

A test named for an appliance validates a synthetic method/steps path,
not cooking in a physical appliance.
A test containing a fake provider validates integration logic, not a live provider model result.
A source-string assertion is weaker than DOM execution or screenshot evidence.

## Reproducers from this review

```sh
PYTHONDONTWRITEBYTECODE=1 .venv/bin/python docs/spec/review_probes.py
```

The module uses MemoryStore, synthetic values and a fake offline designer.
It never reads environment credentials, starts app clients or creates a database.
Assertions capture baseline defects; after a fix, the parent should invert the relevant expectation
in an actual regression test rather than preserve the defect as desired behavior.

| Finding | Reproduction level | Observed result |
| --- | --- | --- |
| SA07-01 | Actual service/generation/card with synthetic unquantified diary | remaining=40, logged=0 despite one unknown meal |
| SA07-02 | Worker predicate verbatim + actual chat dispatcher/fake designer | Worker paid classification=0 while designer attempted once |
| SA07-03 | Actual kitchen_card/shopping functions with saved-day representation | Batch needs 100g egg +120g zucchini; saved shopping empty |
| SA07-04 | Actual source-derived checkbox projection + domain propose/apply | Saved mustard allergy becomes empty after profile form projection |

SA07-02 is not a full Worker quota-cap E2E.
SA07-03 is not a complete accepted-day E2E.
SA07-04 is not rendered DOM/browser evidence.
These distinctions are retained in findings JSON so parent can reproduce at the next boundary.

## CI gap at baseline (fixed in current workflow)

[ci.yml](../../.github/workflows/ci.yml) explicitly selects only:

- tests/test_service.py
- tests/test_oauth_bridge.py
- tests/test_edge_candidate.py
- tests/test_edge_bridge.py
- library/skills/keto-companion/tests/test_core.py

Its Node wildcard includes current Worker module tests, plus two legacy JS checks.
Its Python list omits planning, portion search, mobile/parent, kitchen/parent/release/appliance
and Ed25519 Python suites.
It does not prepare the runtime PDF fonts before running a complete mobile/PDF suite.
Parent is fixing CI separately; this review did not edit or dispatch workflows.
A parent change can supersede this baseline description and requires its own receipt.

A GitHub-hosted startup failure is reported in the task packet.
No server-side startup logs were fetched here; exact root cause remains unknown.
Do not attribute it to billing without evidence.
The prior Codex GitHub review usage limit is a separate known limitation,
not evidence for the hosted-job startup cause or a local-review result.

## Parent local checks

Use existing pinned dependencies and inspect current package/runtime schema first.
Do not automatically install or upgrade tools as a retry.
Suggested full regression for parent, not run by this reviewer:

```sh
.venv/bin/python -m pytest -q tests library/skills/keto-companion/tests
node --test cloudflare-saas/tests/*.test.mjs
node tests/test_ui_no_browser.cjs
node tests/test_oauth_ui.cjs
node cloudflare-saas/build.cjs
python3 scripts/verify_repository.py
git diff --check
```

PDF checks need pinned Noto Sans in runtime-fonts or .runtime-fonts.
The font preparation helper validates existing hashes without download;
its `--download` flag is a separate network operation, not part of this review.
Linux-only anonymous-RAM MP4 behavior cannot be accepted from Mac execution alone.
Sandbox localhost/network refusal is an environment result, not automatically a code defect.

## Release gates with distinct evidence

| Gate | Needed evidence | State in this review |
| --- | --- | --- |
| Source spec | Actual-source docs, matrix, source hashes and bounded findings | Completed locally |
| Focused repro | Exact command/result, synthetic scope | Four executed |
| Full regression | Same build/revision, real command results | Parent-owned, not run |
| CI start/execution | Exact run/job logs and check conclusion | Not queried; startup cause unknown |
| Build integrity | Generated asset hashes + manifest check | Not rebuilt here |
| Runtime compatibility | Actual requested compatibility date in target runtime | Unverified here |
| Staging deployment | Exact Worker/Azure source hashes, schema and bindings | Task reports family staging only; no live refresh |
| Real Google entry | Intended person/account, invitation claim and consent | Not performed here |
| Browser/popup/media | Actual authorized browser behavior/screenshots | Not performed here |
| Physical device | iOS/Android keyboard, recording, photo, share, calendar | Not performed here |
| Cooking | Intended appliance manual and safe actual preparation | Not performed here |
| Clinical | Qualified assessment of intended user's circumstances | Not performed here |
| Public plugin | Separate platform publication/acceptance receipt | Not established |

Installed Miniflare `5.20260926.0-alpha` is reported to support compatibility date 2026-10-03.
That does not validate target 2026-11-07.
Do not silently lower target compatibility date and label the original target verified.
This documentation task did not launch a runtime.

## Human/device checklist

Use synthetic fixture evidence for engineering screenshots; real-person checks remain private.

1. Intended person signs in with the correct Google account and invitation.
2. They see and give their own consent; reference-only route remains understandable.
3. Existing allergies survive a form round trip, including non-checkbox options after parent fix.
4. Empty/unknown medical fields are not read as no.
5. Baseline and target proposal differences are understandable before apply.
6. Recipe amount/state, one portion vs batch and incomplete nutrient warnings are readable.
7. Device manual confirms selected mode; pressure cooking is not inferred.
8. Dictation is editable and never auto-sent; cancellation stops microphone capture.
9. Short viewport/keyboard leaves text/actions accessible.
10. PDF contains Cyrillic/grams/state and shares only after the second click.
11. Imported calendar time/zone/notification permission is verified in the calendar.
12. Logout/revoke/account boundary clears prior private display.

These are acceptance requirements, not completed user actions.
When only a real person's sign-in/consent remains, provide that one action;
do not create more technical work or seed a production identity to bypass it.

## Current implementation-owner acceptance

All four baseline defects were reproduced before correction, then covered by new regressions. Current full local execution: **502 Python passed, 1 platform-specific skip; 93 Node passed**, plus both legacy UI/authorization scripts. The new tests include actual editor-function execution in a minimal DOM, Worker quota-at-cap behavior, a complete two-serving day and known/unknown diary totals. This is not a full browser/device or clinical test. See [local test receipt](../evidence/SPEC_AUDIT_LOCAL_TESTS.json).

The current workflow now selects all suites, prepares fonts, validates machine contracts and these docs, and checks both rebuilt clients for drift. GitHub-hosted runs, including a one-command no-application probe, still stop before jobs. See [exact evidence](../evidence/SPEC_AUDIT_GITHUB_EXECUTION.json). No GitHub-hosted pass or successful Codex GitHub review is asserted.

Run `python scripts/verify_specification.py` and `.venv/bin/python scripts/export_contracts.py --check` after changing documentation or contracts. Baseline reproduction code should not be used as a desired-behavior test; current regressions are in `tests/test_spec_audit_regressions.py` and `cloudflare-saas/tests/allergy-editor.test.mjs`.
