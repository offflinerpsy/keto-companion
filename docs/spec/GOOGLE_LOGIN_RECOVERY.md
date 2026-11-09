# Google login recovery · AGR-305

The owner reported iPhone Chrome login stopping at Firebase's helper with a missing-initial-state/sessionStorage message. That is an observed failure. Cross-origin storage partitioning is a plausible cause, not a device-verified diagnosis. The current Firebase project, Google provider identity, invitation membership and application sessions remain authoritative.

## Requirements and plan

Use Firebase's documented [transparent helper proxy option](https://firebase.google.com/docs/auth/web/redirect-best-practices#option-3-proxy-auth-requests-to-firebaseappcom). Keep existing popup/redirect selection and browser persistence behavior. Do not switch providers, weaken invitations or replace the server's one-time browser challenge, Google subject verification, session cookies or CSRF.

The implementation exposes only the known handler/iframe and their helper scripts, uses a fixed project upstream, bounds request/response sizes and time, never forwards application cookies or authorization, and preserves Firebase helper CSP rather than applying the application's iframe-denying policy. Responses are not cached. No generic upstream URL or arbitrary redirect is accepted.

AuthDomain activation is separately guarded by `FIREBASE_AUTH_HELPER_MODE=same-origin`. Until enabled, public auth configuration retains the existing Firebase-hosted authDomain. Constrained helper routes are available for configured Firebase mode so deployment can be checked before changing OAuth settings or authDomain. When enabled, the emitted authDomain is derived exclusively from the validated configured HTTPS application origin. The stored Firebase public project configuration remains fixed; arbitrary externally supplied authDomain is rejected.

Tasks:

- Implement fixed helper proxy and guarded config/router integration.
- Verify the actual router with synthetic upstream responses, including default behavior, guard/config validation, helper HTML/scripts, header isolation, methods/bounds and upstream failures/redirects.
- Before activation, confirm the app host is a Firebase authorized domain and the existing Google OAuth client permits the exact `https://<app-host>/__/auth/handler` redirect URI. These are distinct settings. Confirm actual helper bootstrap paths match the constrained path list.
- Release through the existing reviewed source/image pipeline; do not infer deployment from local tests.
- Verify a real owner login on the affected iPhone Chrome, reaching the server-issued application session. Keep pending invitation claim, member activation and clinical/device acceptance separate.

## Acceptance and remaining evidence

Focused synthetic tests establish proxy/router behavior only. No credentials, real authorization URLs, state values or personal records belong in fixtures or evidence. Actual OAuth client redirect registration, deployed configuration, real owner login and physical-device success are pending until independently checked by the coordinator. Existing direct-Google configuration is not a fallback for this change.

The new Worker module/tests and this specification alter protected source snapshot inputs. Regenerate the source snapshot, generated bundles and artifact inventory through existing tools; reconcile the new baseline with the trusted runtime image/pin before release. The candidate UI patch allowlist remains the same three files; this proxy cannot be changed through developer-mode generation. Root owns all generated artifacts and release operations.

## Current release evidence

The coordinator saved and independently reopened the existing Google OAuth client, verified that Google accepts the exact staging callback, and released the reviewed source through native Cloudflare CI and actual isolated Container acceptance. The same-origin mode is active; the prior twelve bindings are unchanged. The ordinary deployment helper preserves this activation. See the [release receipt](../evidence/GOOGLE_LOGIN_RECOVERY_RECEIPT.json). The existing desktop session exposes the administrator members entry; it was not logged out or used as proof of fresh iPhone reauthentication. Model inference remains in Azure. Final owner iPhone acceptance remains pending.
