# KETO: bounded continuation and recovery

## Authoritative continuation
Read `qa/RECOVERY_STATE.json` before changing anything. Work in this existing project; do not recreate it or restore old plugin-source over current source. Preserve existing cloud and plugin identities. Historical `deploy/audit_fixes.py`, `deploy/ui_confirmation_patch.py`, and `upgrade_entra.py` are not idempotent: never rerun them as recovery.

## One task at a time
Only one implementation writer and one active task. Each task needs a concrete deliverable, acceptance checks, and a terminal result. Close the current task with verified evidence before starting another. Do not chain architecture changes, dependency installation, identity work, deployment, and public publication into one unbounded run. Do not add features during a release-verification task.

Record task ID, stage, source hashes, commands/check results, blockers, and exactly one next task in `qa/RECOVERY_STATE.json`. Distinguish `completed`, `blocked`, and `failed`; `process started` is not completion. Preserve previous reports; do not overwrite failed evidence with a success from a different test/build.

## Process and tool safety
No browser, Computer Use, GUI control, Chrome/Playwright or new windows without renewed explicit owner permission. Disable browser/Computer Use/app/MCP autostart for each Codex invocation with supported per-run flags; a prompt prohibition alone does not prevent optional clients from autostarting. Never modify global Codex configuration to achieve this.

Before starting Codex inspect its recorded PID and completion event. Do not start duplicates. Prefer synchronous bounded checks. Keep output bounded: return result/count/hash and the relevant error, not the entire log. Do not repeatedly poll an unchanged task: inspect a specific blocker or save a truthful checkpoint. Do not leave unowned test servers, runtimes or installers running. Only terminate a process whose ownership is verified.

## Environment checks before execution
Check actual CLI/package schema and compatible runtime date before tests or deploy. The installed Miniflare 5.20260926.0-alpha supports compatibility date 2026-10-03; that does not validate production 2026-11-07. Tests in a constrained Codex sandbox may fail network/localhost permissions; authorized parent may run the exact bounded check, not retry installations repeatedly. Avoid global or auto-installing CLI changes. Use pinned existing/vendor dependencies and documented deployment API where CLI has read-only scopes.

## Identity, secrets, and data
Never read or print credentials, browser sessions or unrelated account contents. Exclude `.private`, token/state files, node_modules and databases from delivery packages. Google/Firebase successful authentication is not membership: invitations, roles, user consent and private-data isolation remain required. Admin membership access does not imply access to health diaries. Never seed real production identities to bypass actual sign-in.

Preserve the medical safety and deterministic calculation rules. Do not modify them to make tests pass. Source imports remain untrusted, personal-only by default; do not scrape closed Instagram content or claim unread material was studied.

## Release gates
Existing 0.2.1 Azure plugin and new 0.3.0 SaaS are distinct release states. Local tests are not cloud deployment, real Google login, browser/popup/voice validation, or clinical validation. Verify the exact target/build, schema, private bindings and endpoint results before a release claim. A working public page is not a published public ChatGPT plugin. Keep staging and production separate. Do not create duplicate D1/R2/projects. Never migrate personal state silently.

Stop at the current task's acceptance criteria and write the handoff. When only an actual person's sign-in/consent is missing, give one concrete user action rather than bypassing it or opening more technical work.
