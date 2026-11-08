# KETO Companion — English guide

## Current release 0.7.1

Tranquil Dawn, intentional chat image paste/drop/URL loading, and owner-only tested private developer preview/diff are implemented. No arbitrary production self-modification or closed social-account access is claimed. Full trusted CI and candidate acceptance now run in Cloudflare, not GitHub Actions. [Quick guide](docs/en/START_071.md) · [release evidence](docs/evidence/CF_DEV_MEDIA_08_RELEASE_RECEIPT.json).


## Product

The primary product is a private family web app, not a publicly released ChatGPT plugin. A member signs in with Google, accepts an invitation and gives their own processing/storage consent. A ChatGPT subscription is not required for this standalone app. Infrastructure/model usage belongs to the owner; credits and billing balance are not assumed unlimited or free.

Start with the [canonical specification](docs/spec/README.md). For design changes, read the [AI design handoff](docs/en/AI_DESIGN_HANDOFF.md), [screen map](docs/spec/SCREEN_MAP.md), [design system](docs/spec/DESIGN_SYSTEM.md), and [machine-readable UI contracts](docs/contracts/ui-contracts.json).

## Normal flow

1. Sign in and accept membership. Complete **consent → about you → restrictions → preliminary targets**. Administrator profiles follow the same nutrition gates.
2. Use **Chat** or **What shall we cook?**. Choose pantry-only, bounded shopping or inspiration. Select meal/day, time, servings and equipment. Unclear food identity/state/quantity requires clarification.
3. Review calculated candidates. Save pantry, recipes, preferences and diary entries only through explicit previews/confirmation. “Half a portion” and “half the batch” differ.
4. Read **Menu**, **Diary**, and **What I remember**. Export an accepted menu as PDF; use the system share sheet. Calendar notifications require manual ICS import and permission.

Temporary likes/dislikes do not become permanent facts silently. Memory is confirmed structured data plus bounded own-history/source retrieval, not unlimited recall. Public evidence, food numbers and personal inspiration remain different data classes. Private Instagram content is not fetched automatically.

## Appliances and safety boundary

Supported request choices include pan, stove, oven, multicooker, air fryer, waffle iron and no-heat preparation. Multicooker methods currently support non-pressure steaming only where the specific manual permits it. Device models, capacity and kitchen trials remain unverified. [Appliance details](docs/en/APPLIANCES.md).

The assistant does not diagnose, change medicines, certify nutrition adequacy or provide continuous monitoring. Missing nutrient values are not zero. Partial diary records cannot establish a remaining daily carbohydrate allowance. Personal targets, allergy flags and consent remain authoritative.

## Engineering and verification

Use [development instructions](docs/en/DEVELOPMENT.md), [operations](docs/spec/OPERATIONS.md) and [QA gates](docs/spec/QA_RELEASE.md). Current truth is [CURRENT_STATUS.json](docs/CURRENT_STATUS.json), source and the newest applicable receipt, not a historical test count.

Historical GitHub-hosted startup was blocked; current release uses verified Cloudflare native CI; [evidence](docs/evidence/SPEC_AUDIT_GITHUB_EXECUTION.json). Local deterministic tests, source review, deployment verification, real Google sign-in, physical iPhone testing and clinical review are distinct scopes. See [review resolutions](docs/review/SPEC_AUDIT_RESOLUTIONS.md) before handing the pilot to a family member.
