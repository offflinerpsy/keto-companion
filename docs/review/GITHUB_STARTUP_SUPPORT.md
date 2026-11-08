# Hosted GitHub Actions startup blocker

Private repo: offflinerpsy/keto-companion. Actions enabled; allowed actions all. Both original and corrected workflows pass actionlint1.7.12.

Reproducible runs:
- Full main workflow: https://github.com/offflinerpsy/keto-companion/actions/runs/42481679949
- Corrected full workflow: https://github.com/offflinerpsy/keto-companion/actions/runs/42482082477
- Minimal echo-only registered workflow: https://github.com/offflinerpsy/keto-companion/actions/runs/42482759954

All returned startup_failure before jobs; job count0, no step logs, no billable runner job recorded by the timing endpoint. Minimal probe uses ubuntu-24.04, a one-minute timeout, permissions{}, no checkout, no action dependencies, no application or secrets. Repository is private, active, not archived/disabled.

Request: identify the repository/account startup restriction and restore hosted jobs. Exact platform cause is not available through the run/check-suite/job APIs used. Do not infer exhausted billing quota from this evidence; do not make the repo public or silently enable paid usage. No self-hosted runner was registered.

After resolution: manually run Full synthetic verification on main, require actual jobs and JUnit reports. Merely accepting workflow_dispatch or a source lint pass is not successful execution. API receipt: docs/evidence/SPEC_AUDIT_GITHUB_EXECUTION.json.

Official reference: https://docs.github.com/en/actions/how-tos/get-support . Included/private usage is plan-limited, not unlimited free review: https://docs.github.com/en/actions/concepts/billing-and-usage .
