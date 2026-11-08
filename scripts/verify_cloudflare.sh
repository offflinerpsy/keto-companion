#!/bin/sh
# Parent-owned gate performs sanitized Python 3.12 / Node 26 tests and builds.
# No deploy follows a nonzero gate exit.
set -eu
exec "${KETO_GATE_PYTHON:-python3}" scripts/cloudflare_ci.py
