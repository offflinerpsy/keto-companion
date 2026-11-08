# Tranquil Dawn in KETO

Task: **CF-DEV-MEDIA-08**, bounded UI continuation. The supplied [style reference](DESIGN.md) is authoritative for this change. Existing behavior and the [design handoff](../en/AI_DESIGN_HANDOFF.md) remain authoritative for forms, consent, safety and media/developer actions.

The source now applies warm cream, spruce interaction colors, white cards, botanical pastels and soft ambient elevation across the existing application. It does not introduce a framework, router, remote font, health score or new personal-data store. This is a source implementation with focused synthetic checks, not a claim of pixel fidelity, deployed behavior or clinical validation.

## Reference and adaptations

| Reference | Source implementation | Reason or boundary |
| --- | --- | --- |
| Cream `#FAF9F6`, spruce `#0E3B36`, charcoal `#1A2421`, mint `#F0F7F5`, slate `#6C7A76`, four accent colors | Exact source-named CSS tokens in `app.css`, mirrored in [DESIGN_TOKENS.json](DESIGN_TOKENS.json); existing `--bg`, `--paper`, `--ink`, `--muted`, `--accent`, `--soft` aliases | Existing components retain their vocabulary. Slate remains the source token. Small secondary text uses `#5E6F68`: source slate on cream has approximately 4.26:1 contrast; the adaptation exceeds 4.5:1. |
| Plus Jakarta Sans and permitted substitutes | Locally available font stack: Plus Jakarta Sans, Inter, SF Pro Display, Urbanist, system sans | No font request, download or redistribution; actual face depends on the device. |
| Type table body 14px, quick start 15px | Source scale tokens retain quick-start 15px body and 17px body-lg; rendered application body and inputs use 17px, help 14–15px with 1.5 line height | Explicit accessibility choice. Table heading sizes 17/20/24/28px are retained. |
| 4px unit; cards 22px, hero 24px, input 12px; pill buttons | Named spacing/radius tokens, shared card and form styles, ambient `0 8px 24px rgba(0,30,20,.04)` | No decorative diagonal arrows. Warnings and proposal borders retain their semantic emphasis. |
| Reference page 428px versus quick start 390px | 428px content token for mobile where practical, 20px gutters (16px at narrow widths), existing 900px page / 850px chat desktop workspace | Desktop keeps usable width; mobile controls can use available space. |
| Four narrow metric columns | Four status cards at desktop width, 2×2 on narrow screens and with large text | Real saved statuses and counts, no unsupported biometric figures or nutrient claims. |
| 42px hero CTA | Minimum 48px button, selector and slider-handle targets; labelled check/radio controls have 48px rows | Touch accessibility takes precedence over the illustrative 42px height. |
| Coastal photograph and English wellness slogan | Decorative same-origin `/tranquil-dawn.webp` on login and Menu; Russian meal-planning copy on a 96% cream surface | Parent supplies and packages the photograph, license and provenance. No hero in fixed chat chrome; no remote/authenticated image URL. |
| Notification badge | No badge added | No unread-count source exists. |
| Daily plan ring with example “3/3” | Native labelled progress bar and explicit four-step list, derived from the current accepted state | No hardcoded completion or health score. |
| Light theme | Default and saved `light` use Tranquil Dawn; saved `dark` remains an explicit dark adaptation with contrasting text/buttons | Dark colors are an application adaptation, not part of the supplied light reference. Saved `ivory-plum` enum is retained and displayed as “Tranquil Dawn”. |

## Applied surfaces

- Login and invitation controls keep Google/invite/deletion status messages and existing authentication actions.
- Header and four bottom tabs use compact icon controls with accessible labels. The existing navigation and route keys remain in place.
- Chat retains its scroll container, confirmations, photo preview, dictation Stop/Cancel and recovery messages. Photo and link actions share the composer toolbar. Short-height layouts reduce static explanatory chrome, preserving error/status content and the existing attachment actions.
- Guided onboarding, numeric controls, screening and targets share the new surfaces; original input ownership and required/validation fields remain intact.
- Recipe Studio, recipe cards, pantry, diary, menu, shopping, memory, settings, source/import dialogs and the developer technical form/diff/preview receive the shared tokens and geometry.
- Developer confirmation text, technical-only attestation, Stop control, isolated preview and media epoch guards are preserved. No medical rule, calculation, data import or backend policy changed.

## Overview state contract

`tranquilSummary(next)` and `renderTranquilSummary(next)` live in the existing `app.js`; no additional module or request is needed. The summary renders only inside Menu. Before reading targets, pantry, diary or plans, it requires `processing_consent`, `profile.consent.storage` and `profile.consent.health_data` to be explicitly true.

The cards show the saved screening status, saved target status, number of saved pantry positions and number of diary records. Missing arrays display “Нет данных”; an actual empty array displays zero records, never zero intake. Unquantified diary records remain records without invented nutrients. There is no daily nutrient overview because that would require an explicit accepted date/plan selection contract.

Progress has four labelled conditions: accepted permissions; screening allows planning with an explicitly empty hold list; saved targets with explicit `targets_stale=false` and no holds; a saved `user_accepted` menu with days and the current integer profile revision, valid screening and target status. Draft, stale, blocked, missing and revision-mismatched menus do not complete the last step. This tracks preparation of a personal menu, not medical assessment or the amount of food eaten.

Rendering follows `setState`/`renderState`. `clearScreen` clears and hides the overview. Existing owner-change, consent-revocation and response-epoch guards remain responsible for invalidation. The new renderer reads neither browser storage nor private endpoints and never writes health data.

## Verification and parent handoff

Focused tests cover exact source tokens, explicit dark compatibility and contrast, baseline DOM IDs/form contracts, route controls, same-origin hero scope, real/unknown summary data, draft/stale menu rejection, consent-before-read, account cleanup and late-response rejection. Existing setup, kitchen, allergy, media, chat-image and developer UI regressions are included in the bounded run. See [the result receipt](../../qa/TRANQUIL_DAWN_RESULT.json) for exact commands and hashes.

No browser, cloud operation, installation, Git write or subagent was used. Browser geometry is unverified: the CSS retains dedicated chat flex scrolling and short-height rules, but screenshots must establish the requested 440×540 large-text / 956×440 minimum useful chat area and overflow behavior. Parent owns generated builds, photo packaging, isolated visual/device QA, complete suites and release. The source writer does not edit `RECOVERY_STATE.json` or claim a public release.

Next action: parent integrates these UI sources with the supplied photograph in its existing release build and verifies that exact build using the authorized isolated visual/release checks.
