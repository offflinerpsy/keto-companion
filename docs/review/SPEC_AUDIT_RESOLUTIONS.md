# SPEC-AUDIT-07 — reviewed defects and release decisions

Review baseline: `ee4b42707e138f677fb32e9dfb4602a26c1b5b63` (0.6.1). Corrections target **0.6.2-audit-pilot**. This document records the implementation owner's independent reproduction and corrections; the original reviewer findings remain unchanged as historical evidence.

## Functional findings

| ID | Severity / impact | Verified baseline defect | Correction | Regression evidence |
| --- | --- | --- | --- | --- |
| SA07-04 | P1 — health restriction preservation | The engine accepted 16 allergen identifiers, while both editors rendered only 11. Saving another field could propose removal of an existing unrendered allergy. | Both clients render all supported allergens plus any existing unknown/legacy value. Removing one requires an explicit unchecked box and normal confirmation. | `tests/test_spec_audit_regressions.py`; `cloudflare-saas/tests/allergy-editor.test.mjs` executes the real editor function in a minimal DOM. |
| SA07-01 | P2 — misleading nutrition budget | An unquantified diary entry was excluded from the budget calculation, leaving an apparently known full carbohydrate remainder. | An unknown entry makes the remaining allowance and per-meal allocation unknown. The known subtotal is exposed separately, with an explanation. | `test_unquantified_meal_never_becomes_zero_carbohydrate`, `test_known_subtotal_remains_separate_from_unknown_total`. |
| SA07-03 | P2 — household shopping undercount | A saved plan described one person's intake but deducted pantry stock for the whole batch, potentially returning no purchases for a multi-person recipe. | Accepted kitchen plans retain household servings. Shopping scales edible quantities for the whole batch before subtracting pantry stock. Personal nutrient totals stay unscaled. Older plans infer only a consistent saved recipe batch size; ambiguity is not guessed. | Explicit and legacy batch shopping tests, complete two-serving day acceptance, ordinary single-person regression. |
| SA07-02 | P2 — cost-control bypass | Worker treated any “рассчитай” message as free local guidance even though the service could route it to paid recipe generation first. | All potentially paid chat requests reserve quota before compute. A verified `model_called=false` result refunds it. The dedicated deterministic guidance API remains model-free. | Two new Worker→synthetic-Python/bridge tests check quota denial, before-call reservation and verified refund. |

**Evidence before correction:** [baseline reproducers](../evidence/SPEC_AUDIT_BASELINE_REPRO.json). These reproductions used synthetic local state, not private family records. The original baseline probe script intentionally describes old failures; it is not a passing current regression suite.

## Additional engineering corrections

- Removed unused `@openai/mcp-extensions` from build dependencies. Its nested Zod version was covered by GHSA-mrhx-c7xc-m3w5. No application source imported this package. npm audit reported two high-severity dependency entries before and zero after removal; this is a dependency-graph result, not proof that all project code is vulnerability-free.
- Made GET/DELETE `/mcp` OpenAPI operation IDs explicit and distinct. Previously set iteration made exported schemas nondeterministic. Repeated contract generation now produces identical output.
- Reconciled explanatory text: the stateless web compute bridge no longer claims local SQLite/Azure persistence for web user data; Google login is not described as granting Drive/Gmail/Calendar access; dictation is an editable draft rather than continuous voice.
- Expanded CI from a selected old subset to all current Python and Node suites, checksummed runtime PDF fonts, both UI builds, generated contract checks, documentation checks and generated-file drift detection. Artifact upload is restricted to synthetic JUnit results and short retention.
- Rebuilt both independently maintained clients. A frontend-only edit to the SaaS does not automatically update the legacy Entra/MCP bundle.

## Hosted GitHub execution — blocked, not passed

Actual manual runs of both the full workflow and a registered-path one-command `echo` probe returned `startup_failure` before any job. The minimal probe does not check out the repository, install dependencies, use actions or call external services. Local actionlint validation passes. GitHub API did not supply a specific root cause; billing is **not** asserted as the cause.

See [exact run IDs and evidence](../evidence/SPEC_AUDIT_GITHUB_EXECUTION.json). Payment settings, repository visibility and account security were not changed. No self-hosted runner was registered on the owner's computer. Existing GitHub Codex code-review quota was exhausted; this review was performed by a separate local reviewer and independently reproduced by the implementation owner, not by pretending the GitHub bot completed a review.

## Release decision and remaining gates

The corrections may be deployed to the existing **private family staging** after full synthetic regression and exact asset verification. That is not a general-public launch or unconditional approval for clinical use.

Before relying on the application as the spouse's routine helper:

1. Restore actual GitHub-hosted job execution and run the full workflow; do not replace an execution failure with a green badge.
2. Complete the bounded real-account/device acceptance: consent and existing allergies survive revisiting the profile; menu/shopping quantities match the selected household size; microphone, PDF sharing and Calendar import work on the actual device.
3. Have medical limitations and nutrition targets reviewed by an appropriate qualified professional when the user's circumstances require it. Automated tests do not diagnose, validate keto suitability, or establish micronutrient completeness.

Kitchen trials for generated dishes, exact household appliance models, true Safari interaction and unknown security flaws remain outside the synthetic evidence. No new personal data or food targets were written during this review.

## For the next AI agent

Read [the specification](../spec/README.md), this resolution document, [generated contracts](../contracts/), and [current status](../CURRENT_STATUS.json) in that order. Historical findings describe the review baseline; current regression tests describe corrected behavior. Never remove safety constraints or confirmations merely to make a redesign or test pass.
