# KETO Companion: source specification

> Current specification: **0.6.2-audit-pilot**, reconciled with runtime commit `e3f648d5313b68202336cda775ff7279556a2569`. The independent review examined 0.6.1; SA07-01…04 are historical findings corrected in 0.6.2. Read [current corrections](CURRENT_CORRECTIONS.md) for exact source, regression evidence and remaining acceptance gates.

SPEC-AUDIT-07 · independent source review · 2026-11-08.
Baseline: `ee4b42707e138f677fb32e9dfb4602a26c1b5b63` (`release0.6.1`).
This is the maintained specification, reconciled by the implementation owner after the independent baseline review. It is not clinical or unconditional family release approval.
The parent changed runtime/CI while documentation was being written. All defect
observations remain pinned to the baseline; those fixes were not re-audited.
Read [source snapshot status](SOURCE_STATUS.md) and
[baseline hashes](BASELINE_SOURCE_MANIFEST.json) before applying a finding to the current tree.

## Start here

| Reader | Reading path | Deliverable boundary |
| --- | --- | --- |
| Product owner | PRODUCT → USER_FLOWS → ROADMAP_AND_GAPS → QA_RELEASE | Evaluate behavior and remaining acceptance |
| Backend engineer | ARCHITECTURE → DATA_MODEL → API_AND_ACTIONS → SECURITY_PRIVACY | Preserve identity, state and calculations |
| Designer or frontend AI | AI design handoff → SCREEN_MAP → DESIGN_SYSTEM → UI_CONTRACTS | Edit source UI without changing clinical or auth logic |
| QA engineer or QA AI | QA_RELEASE → requirement matrix → review probes → findings | Reproduce specific behavior; distinguish synthetic from device evidence |
| Russian reader | RU_INDEX → RU design handoff | Full navigation and implementation-safe design brief |

- [Product requirements](PRODUCT.md)
- [Architecture and sequences](ARCHITECTURE.md)
- [Data model and lifecycle](DATA_MODEL.md)
- [API and actions](API_AND_ACTIONS.md)
- [AI and memory](AI_AND_MEMORY.md)
- [Nutrition rules](NUTRITION_RULES.md)
- [Design system](DESIGN_SYSTEM.md)
- [Screen map](SCREEN_MAP.md)
- [User flows](USER_FLOWS.md)
- [Security and privacy](SECURITY_PRIVACY.md)
- [QA and release](QA_RELEASE.md)
- [Operations](OPERATIONS.md)
- [Roadmap and gaps](ROADMAP_AND_GAPS.md)
- [Russian index and glossary](RU_INDEX.md)
- [English design handoff](../en/AI_DESIGN_HANDOFF.md)
- [Russian design handoff](../ru/AI_DESIGN_HANDOFF.md)
- [Requirement matrix](requirement_matrix.json)
- [Exact UI selector inventory](UI_CONTRACTS.md)
- [Test inventory](TEST_INVENTORY.md)
- [Reproducible review probes](review_probes.py)
- [Independent findings](../../qa/SPEC_AUDIT_FINDINGS.json)
- [Review completion receipt](../../qa/SPEC_AUDIT_DONE.json)
- [Source snapshot and concurrent parent work](SOURCE_STATUS.md)

## Authority and evidence

1. Current owner/task restrictions set authorization; this review writes assigned files only.
2. Actual maintained source establishes implemented behavior.
3. Schemas in source establish accepted inputs, subject to runtime validation.
4. Tests establish intended checked examples; their presence does not prove a current pass.
5. A deployment receipt establishes its exact target/build/time only.
6. Historical reports locate prior evidence; they do not establish current cloud state.
7. This specification interprets source; a discrepancy must be resolved against source and recorded.

The assigned task is [SPEC_AUDIT_07_TASK](../../qa/SPEC_AUDIT_07_TASK.md).
The parent owns [RECOVERY_STATE](../../qa/RECOVERY_STATE.json), CI and fixes.
No new backlog, cloud resource, issue or runtime was created by this review.

## Status vocabulary

- **Implemented/source**: a concrete source path exists and was inspected.
- **Synthetic reproduced**: the named local probe exercised a specific behavior.
- **Related test**: a checked-in test addresses part of a requirement; no coverage guarantee.
- **Reported staging**: task context says only family staging is released; not refreshed here.
- **Unverified**: no corresponding live, visual, physical-device or clinical evidence in this pass.
- **Gap**: missing behavior or acceptance, not necessarily a code defect.
- **Finding**: actionable source-backed inconsistency with an explicit reproduction scope.

## Version boundaries

| Layer | Source value | Interpretation |
| --- | --- | --- |
| Worker health/session; mobile snapshot | `0.6.2-audit-pilot` | Current app behavior identifier |
| Python service `VERSION` | `0.2.1` | Legacy service/plugin identity retained |
| npm package/build manifest text | `0.6.2-audit-pilot` | Aligned source metadata; exact deployment receipts remain authoritative |
| Example configuration | `0.5.0-guided-pilot` | Example metadata, not target proof |
| Core engine/schema | `0.1.0` / `1` | Deterministic engine and core state |
| Service document | schema `2` | Wrapper around core state |
| Kitchen policy | `kitchen-v1.1` | Seven equipment choices, 18 methods |
| Data handoff | `0.1.1+verified-food-extension-2026-11-08` | Parent recovery label; catalogue hash is authoritative for calculations |

Sources: [worker](../../cloudflare-saas/src/worker.mjs),
[domain](../../service/domain.py), [build](../../cloudflare-saas/build.cjs),
[core](../../library/skills/keto-companion/scripts/keto_core.py),
[policy](../../service/data/kitchen_policy.json).

## Review outcome

Four actionable findings were independently recorded; none is labelled P0.
They concern allergy editor preservation, request accounting, incomplete diary budgets
and batch shopping. See exact severity, evidence and confidence in findings JSON.
Full local regression and staging fixes are recorded in [current corrections](CURRENT_CORRECTIONS.md). Hosted GitHub startup, real-device and clinical acceptance remain separate gates.
Do not interpret document completion as absence of defects or permission to release.

## Source-derived machine contracts

[Generated contracts](../contracts/) contain API schemas, deterministic OpenAPI, D1 columns/relations, route/control inventories and kitchen limits. `scripts/export_contracts.py --check` detects drift. [Review resolutions](../review/SPEC_AUDIT_RESOLUTIONS.md) and [GitHub execution evidence](../evidence/SPEC_AUDIT_GITHUB_EXECUTION.json) distinguish current corrections from historical findings.
