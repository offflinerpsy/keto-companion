# Current specification corrections — 0.6.2

Runtime source: `e3f648d5313b68202336cda775ff7279556a2569`.
Independent reviewed baseline: `ee4b42707e138f677fb32e9dfb4602a26c1b5b63`.
Immutable independent documentation snapshot: `055938ef42b1ba15e2ef568de17e8e01f883a31f`.

This page takes precedence over historical baseline descriptions elsewhere in the specification. It does not override executable source or schema validation. The original finding and reviewer-completion JSON remain unmodified so that evidence provenance is preserved.

## Corrected behavior

| Area | Current contract | Preserve during redesign |
| --- | --- | --- |
| Allergy editor | All 16 supported identifiers and any already-stored legacy value are rendered. Existing values survive an unrelated edit. | Do not project the stored set into a smaller visible subset. Explicit uncheck and confirmation is the only removal path in this form. |
| Diary completeness | An unquantified/unresolved current-day record makes `remaining_g`, `confirmed_logged_g` and `meal_assumption_g` unknown. `known_subtotal_g` and `diary_complete_for_budget` explain what is known. | Show unknown as unknown, never zero or a full remaining allowance. Absence of records is not proof of no intake. |
| Household shopping | `kitchen.plan_servings[plan_id]` stores household servings. Plan nutrient amounts remain per-person; shopping scales ingredients before pantry subtraction. | Do not multiply personal calories or subtract whole-batch stock from one-person need. Historical plans infer only a consistent stored recipe batch size. |
| Paid admission | Every potentially paid chat request reserves member/global request allowance before dispatch. Only a trusted `model_called=false` response refunds it. | User text cannot declare itself free. Deterministic guidance buttons remain separate model-free operations. |
| Runtime descriptions | Web compute MemoryStore explicitly reports caller-private persistence with transient Azure computation. | Google sign-in is not Gmail/Drive/Calendar permission. Dictation is not continuous voice. |
| OpenAPI | GET and DELETE `/mcp` have distinct stable operation IDs; both remain unsupported405 endpoints. | Do not reintroduce nondeterministic multi-method IDs in generated contracts. |
| Dependencies | Unused `@openai/mcp-extensions` and its vulnerable nested dependency were removed; actual build dependencies pinned. | Do not restore an unused package because a historical skill/example mentioned it. |

Detailed reproductions, severity and test mapping: [review resolutions](../review/SPEC_AUDIT_RESOLUTIONS.md).

## Executed validation

- Full local synthetic Python suite: **502 passed, 1 skipped**. The skip is the existing Linux-specific RAM-audio-descriptor test on macOS. One JUnit-format warning is recorded, not hidden.
- Full synthetic Node suite: **93 passed**, plus separate legacy UI and OAuth UI checks.
- Actual allergy editor functions executed with a minimal DOM, including stored legacy values. This is not a rendered-browser or real-user test.
- Worker quota-at-cap and refund cases, mixed known/unknown diary cases, and a complete two-serving accepted day passed new regressions.
- Consecutive public and legacy UI rebuilds produced identical output hashes.
- Six generated API/UI/data contracts pass drift checks. The documentation checker validates required files, source/test paths, local links and route-name inventory; it does not prove semantic completeness.
- npm lockfile advisory scan: two high-severity entries before removal, zero after. OSV lookup for 14 directly pinned Python packages found no listed advisories at check time. Neither result scans every transitive/vendored/source vulnerability or guarantees security.

Exact scope: [local tests](../evidence/SPEC_AUDIT_LOCAL_TESTS.json), [npm advisories](../evidence/SPEC_AUDIT_NPM_ADVISORIES.json), [Python advisories](../evidence/SPEC_AUDIT_PYTHON_ADVISORIES.json).

## GitHub execution is not green

Manual full-workflow run and an isolated one-command echo workflow both returned `startup_failure` before any jobs. No application tests ran on GitHub-hosted runners. Local workflow syntax validation passes. The API does not explain the exact cause, so billing is not claimed as the cause.

[Evidence with run links](../evidence/SPEC_AUDIT_GITHUB_EXECUTION.json). No payment upgrade, public visibility or self-hosted runner was enabled. GitHub Codex review quota was separately exhausted; the independent local source review is not mislabelled as a successful GitHub bot review.

## Release and acceptance boundary

Corrections are released only to the existing private family staging after local regression and source-hash verification. Hosted CI restoration, real-account/device acceptance, physical appliance cooking trials and clinical suitability remain separate. Do not interpret a staging release or completed specification as unconditional approval to rely on the assistant medically.

The product specification and design handoff are maintained documents. Historical line numbers and baseline manifests intentionally refer to the old review commit. Use source symbols and [regenerated contracts](../contracts/) to locate current behavior.
