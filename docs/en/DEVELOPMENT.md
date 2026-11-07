# Development and tests

Prerequisites: Python 3.12, Node.js 26 and OpenSSL. Run commands from the repository root. Use an isolated environment; do not change global Codex configuration.

```sh
python3.12 -m venv .venv
.venv/bin/python -m pip install -r requirements-dev.txt
npm ci --prefix ui-sdk --ignore-scripts
.venv/bin/python scripts/verify_repository.py
.venv/bin/python -m pytest -q tests/test_service.py tests/test_oauth_bridge.py tests/test_edge_candidate.py tests/test_edge_bridge.py library/skills/keto-companion/tests/test_core.py
node --test cloudflare-saas/tests/*.test.mjs
node tests/test_ui_no_browser.cjs
node tests/test_oauth_ui.cjs
node cloudflare-saas/build.cjs
.venv/bin/python scripts/verify_repository.py
```

Node tests call `.venv/bin/python` for the synthetic bridge. Firebase and JOSE are pinned vendor modules with licenses and provenance. `ui-sdk/package-lock.json` locks build dependencies. The build uses public Firebase browser configuration, not server credentials.

CI runs synthetic checks only. Paid inference, human authorization, browser tests and cloud deployment are excluded. Do not automatically execute `tests/live_model_eval.py` or `tests/browser_journey.py`.

`qa/recovery-firebase-runtime.cjs` was run on the Mac with Miniflare 5.20260926.0-alpha; its installed-package path is machine-specific. Its tested compatibility date is 2026-10-03, not the target cloud date 2026-11-07. Do not alter production compatibility to conceal a test mismatch.
