# KETO Companion

## Current 0.7.1 pilot

The supplied Tranquil Dawn design is live. Owner-only bounded development produces a tested private preview/diff, not self-publication. Chat accepts image paste, drop and explicitly loaded public image links. Full regression and exact isolated candidate acceptance run in **Cloudflare**, without GitHub Actions. [RU quick guide](docs/ru/START_071.md) · [EN quick guide](docs/en/START_071.md) · [exact release evidence](docs/evidence/CF_DEV_MEDIA_08_RELEASE_RECEIPT.json).


**Private family pilot · mobile-first web app · explicit consent · deterministic nutrition calculations.**

[English](README.en.md) · [Русский](README.ru.md) · [Live staging](https://keto-companion-saas-staging.offflinerpsy.workers.dev/)

> Nutrition-planning software, not a physician, medical clearance, autonomous monitoring or a guarantee that every recipe is suitable. Review [current status](docs/CURRENT_STATUS.json) before use or modification.

## Start by role

| Role | Entry point |
| --- | --- |
| Product owner / engineer | [Canonical specification](docs/spec/README.md) |
| Russian reader | [Russian specification index](docs/spec/RU_INDEX.md) |
| Design / frontend AI | [English design handoff](docs/en/AI_DESIGN_HANDOFF.md) · [Русская передача дизайна](docs/ru/AI_DESIGN_HANDOFF.md) |
| Backend / AI engineer | [Architecture](docs/spec/ARCHITECTURE.md) · [API/actions](docs/spec/API_AND_ACTIONS.md) · [AI and memory](docs/spec/AI_AND_MEMORY.md) |
| QA / reviewer | [QA and release gates](docs/spec/QA_RELEASE.md) · [Review resolutions](docs/review/SPEC_AUDIT_RESOLUTIONS.md) |
| Machine consumer | [Generated API, UI and database contracts](docs/contracts/) · [Requirement matrix](docs/spec/requirement_matrix.json) |
| Continuing agent | [AGENTS.md](AGENTS.md) · [Current checkpoint](docs/CURRENT_STATUS.json) |

## What the product contains

A Google-sign-in, invitation-only web workspace with four primary tabs: **Chat, Menu, Diary, More**. Guided onboarding and explicit target approval precede personalized menu generation. Chat and Recipe Studio share confirmed preferences, pantry, topics, calculated recipes and diary actions. Dictation creates an editable draft; images do not establish exact food weights. Accepted menus export to PDF; reminders export to Calendar via ICS, not automatic background push.

The recipe engine uses **85 USDA food records**, **72 reference recipes**, and **18 controlled cooking-method families**. Generated combinations are calculated drafts, not a claim of kitchen testing. Local manufacturer label references remain partial. Food composition, energy, portions and shopping are calculated by code rather than invented by the language model.

## System and source ownership

| Source | Responsibility |
| --- | --- |
| `cloudflare-saas/public/` | Maintained web UI source; `app.css` is authored, `style.css` and bundles are generated |
| `cloudflare-saas/src/` | Worker authentication, invitations, D1/R2 state, quotas, compute dispatch, deletion |
| `service/` | Azure compute, model routing, deterministic orchestration, proposals and legacy Entra/MCP client |
| `library/` | Food/reference/evidence data and deterministic core |
| `plugin/` | Historical private plugin export; not the primary Google-family web client |
| `docs/spec/`, `docs/contracts/` | Human specification and regenerated source-derived contracts |
| `docs/evidence/` | Dated, scoped receipts; historical passes are not current release approval |

Cloudflare stores the web app's private records. The signed Azure bridge processes bounded requests transiently; the legacy Azure/Entra client's persistence is separate. Terra handles ordinary dialogue, Sol with high reasoning proposes bounded recipe compositions, and transcription uses the existing speech deployment. No unlimited memory or free-compute promise is made.

## Verification status

The complete workflow is [Full synthetic verification](.github/workflows/ci.yml). It discovers all Python and Node product suites, prepares checksum-pinned PDF fonts, checks source contracts and detects generated-asset drift. No cloud credentials, paid model calls, real users or deployments are supplied to CI.

**Historical GitHub Actions startup failure is not a current release blocker: Cloudflare now runs the full trusted gate.** This is not a passing CI badge and not a failed product test. Exact run IDs and boundaries: [GitHub execution evidence](docs/evidence/SPEC_AUDIT_GITHUB_EXECUTION.json). Existing GitHub Codex review usage is exhausted; independent local source review and reproducible regression evidence are recorded separately. No paid upgrade was enabled.

## Development rules

Read `AGENTS.md` first. Keep the repository private; never commit credentials, cookies, health records, database snapshots, raw agent traces or font binaries. Use synthetic fixtures. Do not silently change nutrition constraints, consent, ownership or calculation code during a visual redesign. No browser automation on the owner's Mac without renewed explicit authorization.

Original code remains private. Third-party code keeps its existing license: [THIRD_PARTY.md](THIRD_PARTY.md).
