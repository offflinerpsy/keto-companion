# KETO Companion — English guide

This private project provides personal nutrition planning. The primary product is an invitation-only family web app. The owner invites members; each signs in with their own Google identity, provides separate consent, and accesses only their own records. The standalone website does not require a ChatGPT subscription; infrastructure and inference costs belong to the operator. The existing private plugin is a separate client.

## Repository map

`cloudflare-saas/`: website, Cloudflare server, D1 migrations, tests and pinned deployment artifacts. `service/`: existing Azure Python service and stateless compute bridge. `library/`: foods, recipes, scientific references and deterministic nutrition calculations. `plugin/`: current private plugin export without its obsolete nested server snapshot. `docs/evidence/`: selected reports without credentials or personal diaries. `scripts/`: repository hygiene and build-manifest verification.

## Implemented in source

Google/Firebase sign-in, administrator/member roles, single-use email-bound invitations; chat, diary, menu and shopping calculations; explicit change approval; private recipe inspiration; image sanitization; export and resumable deletion. Administrative membership and usage access does not grant access to another member's private diary.

An Instagram URL does not authorize reading private posts. A user may supply permitted text or images. Such material remains a private inspiration source; it does not silently become clinical evidence or part of a shared knowledge base.

## Current state

Use `docs/CURRENT_STATUS.json` and linked GitHub issues, not outdated report version numbers. Source implementation, local tests, deployed endpoints, actual Google sign-in and clinical assessment are separate acceptance stages. Synthetic identity tests do not constitute a real person's login.

See [development](docs/en/DEVELOPMENT.md), [deployment](docs/en/DEPLOYMENT.md), and [continuation](docs/en/CONTINUATION.md). Do not introduce personal data until identity and consent behavior are verified. The assistant does not prescribe medication, provide continuous clinical monitoring, or guarantee error-free model output.

## First sign-in to the live pilot

Site: https://keto-companion-saas-staging.offflinerpsy.workers.dev/ . The owner signs in with `offflinerpsy@gmail.com`; administrator role is granted only after that identity is verified. Use the Administrator section to create an email-bound invitation and copy its link. Each member signs in with their own Google account and separately accepts the invitation and consents. First acceptance requires only owner login and seeing the dashboard, not real health data.

The deployed Cloudflare → Azure Terra path passed 20 end-to-end checks using two synthetic members; fixtures and images were removed. This does not verify an actual Google login or clinical suitability. Native ChatGPT voice, Gmail/Calendar synchronization, and closed Instagram access are not enabled.

## Mobile update 0.4.0

Chat-first layout with four bottom tabs, dictation into an editable draft, images, and separate conversation topics. Accepted menus export as PDF for the system share sheet. Reminders persist in the app; closed-page notifications require manually importing the ICS into Calendar. Contextual hints explain settings and personal fields. Technical JSON/CSV actions remain under Advanced.

Source checks, deployed asset hashes and mobile-component rendering are verified. Physical iPhone Safari microphone, native sharing and Calendar import remain acceptance gates. Exact scope and limitations: `docs/evidence/MOBILE_RELEASE_RECEIPT.json`.
