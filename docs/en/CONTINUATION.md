# Developer and agent handoff

Read `AGENTS.md`, `docs/CURRENT_STATUS.json` and the active GitHub issue first. Verify branch/commit and evidence. Historical reports do not override current state.

Use this repository, one implementation writer and one active task. Make a focused branch, small explanatory commits, evidence and a pull request. Do not combine feature development, identity configuration and public publication in one task. No force-push, visibility changes or browser clients without renewed authorization.

Recovery evidence: `docs/evidence/RECOVERY_STATE.json`, a historical snapshot. Current status is separate. Local `qa/RECOVERY_STATE.json` contains machine-specific operational details and must not become an unbounded GitHub trace.

The next approved stage is KETO-RELEASE-002: deploy the pinned staging build without adding features. Acceptance: receipt, matching hashes, public pages, protected private routes, truthful Azure compute status. Choose the next task only after closing this one.
