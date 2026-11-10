# C18 — dependable sign-in and workspace recovery

## Incident and evidence

The owner reports Google sign-in returning to the login button on iPhone 17 Pro Chrome. C17's browser fixtures started with an already active synthetic session; public HTTP checks did not cover fresh Google-to-workspace navigation. That acceptance gap is explicitly corrected here.

The exact prepatch `start()` function was exercised with a positive control and a failing bootstrap. A verified active admin followed by a failed workspace load was reset to anonymous UI. See `../evidence/AGR_306_C18_PREPATCH.json`.

The published C17 app also completed a fresh, ordinary owner Google login in connected desktop Chrome: explicit logout, existing Google account chooser, workspace, then owner-only controls. No console errors were observed. Read-only admin session metadata showed six active sessions before that fresh login, below the existing cap. The particular iPhone failure was not reproduced, and is not attributed to a provider outage or the cap without evidence.

## Decisions

- Keep the pinned Firebase SDK, same-origin auth helper and temporary Firebase persistence. Do not change provider, membership or owner role policy. Only a verified server session supplies active membership and admin role.
- Separate Google exchange, server-session verification and workspace loading. A workspace failure preserves verified identity and offers another load; a temporary session failure offers verification. Only an explicit `401 SIGN_IN` clears identity.
- Start the popup synchronously from the click. One outstanding attempt blocks duplicate actions. Challenge and popup failures settle promptly; late results cannot exchange a token or clear a newer attempt.
- Auth HTTP requests have a 15-second deadline, workspace loading 30 seconds, the interactive Google attempt 120 seconds and SDK cleanup two seconds. Expired/cancelled requests abort; mutation requests are not automatically replayed.
- An uncertain session exchange or invitation claim is followed by a session readback. One-use challenges and invitation rules are preserved.
- Invalidate the ordinary request epoch when leaving the ready workspace. Logout, expiry, account changes and confirmed deletion cannot be undone by a late private response. Successful deletion exposes its receipt and a working sign-in action.
- Browser storage failure uses current-page memory with authoritative writes and deletion tombstones. It cannot abort startup or restore an obsolete invitation in the current page.
- Verified reauthentication rotates only the presented live session belonging to the same verified subject. Rotation, bounded insertion and last-active metadata share one D1 transaction. Keep the ten-device cap; do not evict other devices or change roles.
- Recovery shows human-readable status and optional safe phase/code/HTTP status. Never log provider messages, tokens, cookies, emails or private payloads as diagnostics.
- Keep the existing Worker size gate. Emit the modular Worker as UTF-8 instead of escaped ASCII, which reduces bytes without removing checks or changing string values.

## Verification boundaries

Controller and provider flow tests cover duplicate actions, deadlines, late responses, lost exchange/claim responses, storage denial, session expiry and deletion reset. Worker tests use synthetic signed identities and an actual SQLite transaction adapter, including cap, CSRF, role isolation, foreign cookies, concurrent rotation and injected metadata failure. Browser tests execute the built app in Chromium and WebKit with synthetic HTTP responses; product write scenarios remain in isolated fixture databases.

The physical iPhone is not represented as tested by Playwright. Fresh real desktop Google sign-in is separate from browser fixtures. Admin identity survives a workspace outage; full member administration becomes visible when the workspace recovers. C18 does not claim a separate administration surface during compute outage.

No family diary/profile/consent records are modified for testing. Python/Azure compute is unchanged; the existing exact C17 backend remains in place. Publish the accepted frontend/Worker through the existing native and ordinary Cloudflare gates, then verify the served assets and a fresh ordinary Google login.

## Primary documentation

Context7 was consulted for current Firebase session/popup guidance. Decisions were checked against the official documentation:

- [Firebase server session cookies](https://firebase.google.com/docs/auth/admin/manage-cookies): temporary client auth, token exchange and client SDK cleanup.
- [Firebase browser storage and helper proxy](https://firebase.google.com/docs/auth/web/redirect-best-practices): popup and transparent same-origin helper behavior.
- [Playwright browser boundaries](https://playwright.dev/docs/browsers): patched WebKit is not the physical iPhone browser.
- [esbuild charset](https://esbuild.github.io/api/#charset): explicit UTF-8 output.

Release receipts record completed checks and exact commits; this design note does not substitute for those results.
