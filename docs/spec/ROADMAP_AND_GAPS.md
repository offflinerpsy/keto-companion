# Roadmap and gaps

> Current specification: **0.6.2-audit-pilot**, reconciled with runtime commit `e3f648d5313b68202336cda775ff7279556a2569`. The independent review examined 0.6.1; SA07-01…04 are historical findings corrected in 0.6.2. Read [current corrections](CURRENT_CORRECTIONS.md) for exact source, regression evidence and remaining acceptance gates.

This is a gap register for the same task, not a second product backlog.
Parent owns issue status, prioritization, fixes and release acceptance.
Source baseline is `ee4b42707e138f677fb32e9dfb4602a26c1b5b63`.

## Baseline findings (corrected in 0.6.2)

| ID | Severity | Concrete gap | Required next evidence |
| --- | --- | --- | --- |
| SA07-04 | P1 | Allergy checkbox round trip can remove saved unlisted allergens | Parent regression for all canonical allergens and unrelated profile edits |
| SA07-02 | P1 | Local-keyword chat classification can omit Worker paid/global admission before kitchen designer attempt | Worker E2E at cap with mixed calorie/kitchen text |
| SA07-01 | P2 | Remaining-carb display appears known despite unquantified diary entries | Explicit incomplete-intake budget behavior and regression |
| SA07-03 | P2 | Saved shopping subtracts batch pantry from per-person plan needs | Accepted multi-serving-day shopping/export regression |

See [findings JSON](../../qa/SPEC_AUDIT_FINDINGS.json) for actual file:line,
reproducers, scope, confidence and recommendations.
No P0 finding was established in this bounded pass; that is not a no-P0 guarantee.

## Release blockers and acceptance still open

- Four baseline corrections and full local regression are complete; real GitHub-hosted execution remains blocked.
- Current CI selects all suites, prepares pinned fonts and checks docs/contracts/generated builds; it must actually execute in GitHub before claiming hosted CI success.
- Reported hosted startup failure has no established cause; billing attribution is unsupported.
- Exact staging deployment hashes are separately verified by the implementation owner; the independent review did not itself perform deployment.
- Requested runtime date 2026-11-07 is not established by older Miniflare/date evidence.
- Intended person's real Google login, invitation claim and own consent remain separate checks.
- Popup, microphone, HEIC decoding, mobile keyboard, PDF share and calendar import need actual client/device evidence.
- Appliance modes must be checked against the intended device manual; recipes are not kitchen tested.
- Clinical suitability is not established by software tests or the included-source registry.
- Public ChatGPT plugin publication/acceptance is a separate release state.

Task context reports only family staging released.
This review does not widen that to public availability or current-build verification.

## Implemented with practical limits

| Capability | Present behavior | Limit that must stay explicit |
| --- | --- | --- |
| Guidance | Explained starter-v1 candidate | Pilot scope, assumptions, separate confirmation |
| Menu search | Catalogue + bounded portion fallback | No global optimum or guaranteed week variety |
| Kitchen | Three modes, seven equipment choices, 18 methods | Limited known ingredients/methods and no physical appliance test |
| Inventory | Known stock and shortage calculation | Unknown grams need weighing; no automatic depletion |
| Memory | Confirmed facts + bounded own quotes | Not unlimited recall; lexical filtering |
| Sources | Personal text/images/provenance | URL-only is unread; no closed social scraping |
| Dictation | Audio → editable text | Device/provider/signal limits; not a live voice conversation |
| PDF share | Private file + system sheet | No automatic Telegram sending/delivery receipt |
| Calendar | Explicit ICS import | No auto-sync; two-year recurrence bound |
| Admin | Member/invite/usage metadata | No health-record access |
| Deletion | Receipt and bounded active-data cleanup | Partial failures/backups require separate policy |

## Not implemented or not established

No background WebPush, automated Google Drive/Gmail/Calendar synchronization,
automatic external message sending, source-web scraping, unrestricted model switching,
automatic clinical approval, measured expenditure, diagnostic interpretation,
full-text medical RAG, unlimited archival memory or general-purpose code self-modification
is implemented as a verified product capability.

Some settings/core helpers reference future or legacy integration concepts.
Their presence does not establish a complete visible feature or external effect.
No new feature is proposed as necessary to complete this review.

## Design improvements within existing behavior

The handoffs permit staged layout/readability work while preserving contracts.
Useful next design acceptance areas are short-height chat space, long Russian labels,
visible proposal placement, unknown-value presentation and clear reference-vs-generated recipes.
A new framework/router or broad animation system is not required by the source.
Screenshots must be synthetic and use an explicitly authorized route.
Do not begin that implementation as part of this completed documentation pass.

## Metadata drift

Worker/mobile/package version0.6.2 coexists with the intentionally retained legacy service/plugin0.2.1 and older example0.5.0 labels.
These are different source identifiers; an operator should use exact artifact hashes/target readback.
Catalogue version string in core is older than the data handoff label; hash the actual files.
Parent may consolidate metadata aliases separately without overwriting historical receipts.

## One next action

Restore GitHub-hosted job startup using the recorded minimal/full run IDs, then rerun the full workflow. Do not bypass identity, safety checks or billing controls. After that, continue the existing bounded owner/device acceptance rather than opening parallel implementation tasks.
