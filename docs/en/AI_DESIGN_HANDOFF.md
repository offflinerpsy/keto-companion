# AI design handoff: KETO Companion

Task SPEC-AUDIT-07, baseline `ee4b42707e138f677fb32e9dfb4602a26c1b5b63`, 2026-11-08.
This is an implementation brief for another designer/agent, based on actual source.
It is not a screenshot-based visual acceptance or a deployment instruction.
Read [spec start](../spec/README.md), [screen map](../spec/SCREEN_MAP.md),
[design system](../spec/DESIGN_SYSTEM.md) and [selector inventory](../spec/UI_CONTRACTS.md).
The Russian handoff is [equally scoped](../ru/AI_DESIGN_HANDOFF.md).

## Your editable source

| Source | What to edit there | Preserve |
| --- | --- | --- |
| [index.html](../../cloudflare-saas/public/index.html) | Shell, static page sections, forms, dialogs and labels | IDs, data-page, field names, required flags and form ownership |
| [app.css](../../cloudflare-saas/public/app.css) | Tokens, layout, responsive styles and component states | Safe areas, internal scrolling, focus, hidden and warning semantics |
| [app.js](../../cloudflare-saas/public/app.js) | Existing core UI renderers and event wiring | call/accept/setState/clearScreen/epoch, action names and revisions |
| [setup-ui.js](../../cloudflare-saas/public/setup-ui.js) | Guided composition, target explanations and knowledge presentation | Stage values, preview hash lifecycle, form-linked moved fields |
| [setup-controls.js](../../cloudflare-saas/public/setup-controls.js) | Numeric input/slider presentation | Parsing, untouched emptiness, bounds, destroy behavior |
| [kitchen-ui.js](../../cloudflare-saas/public/kitchen-ui.js) | Studio, pantry controls, candidates, memory | Server IDs, mode/equipment keys, fraction basis and confirmation insertion |
| [mobile-ui.js](../../cloudflare-saas/public/mobile-ui.js) | Voice/photo/topic/reminder/PDF surfaces and viewport | Recorder cleanup, editable drafts, two-click sharing, session guards |
| [media.js](../../cloudflare-saas/public/media.js) | Media status presentation if necessary | Generation cancellation, track release, file/type/size checks |
| [routes.js](../../cloudflare-saas/public/routes.js) | Existing route presentation integration only | Route keys, bounded history, dialog entries and Back/Forward |

Do not edit generated `public/style.css`, `public/app.bundle.js`,
`public/knowledge-data.js`, `src/embedded-assets.mjs`, `dist/**` or
`artifacts/files_manifest.json` as independent sources.
[build.cjs](../../cloudflare-saas/build.cjs) generates them from maintained modules,
pinned vendor assets and the public Firebase configuration file.
`style.css = pinned noUiSlider CSS + app.css`.
The app bundle is esbuild ESM; generated Worker assets are packaged for standalone and modular delivery.
Build may update several generated files; review that expected diff as a unit.

[service/static](../../service/static/index.html) is the separate legacy Azure/plugin UI.
Do not copy it over the SaaS UI or merge its authentication behavior into this redesign.
Do not change runtime calculations, clinical rules, identity, cloud bindings or CI for a visual task.

## Screen and navigation map

The bottom bar has exactly four primary destinations: Chat, Menu, Diary, More.
More opens recipes, memory, reminders, setup, targets, knowledge, sources, settings and admin.
Admin is visible only for the current admin session; API enforcement remains server-owned.

The router uses hashes, not a new framework:

- chat → conversation, topic controls, photo/voice composer and proposal context.
- today → draft/saved menu, ingredient detail, shopping, PDF/export/import.
- diary → date/note form and own saved entries.
- more → secondary navigation and public help/privacy/delete links.
- recipes → Recipe Studio first, reference cookbook in secondary details.
- memory → confirmed preferences, favorites, pantry provenance and specific forget controls.
- reminders → explicit local-time/zone form, saved reminders and calendar export.
- settings → appearance/cooking choices, history, revoke/logout/delete.
- sources → personal rights-attested material and manual recipe preparation.
- admin → membership/invite metadata only.
- knowledge → included references, product assumptions and excluded-source disclosure.
- targets → saved targets, explained preview, differences, manual target editing.
- setup-consent/about/restrictions/targets → one guided page with four visible-stage slots.

`setup` is an alias resolved from saved guidance stage; `onboarding` maps to restrictions.
Initial routing resumes incomplete setup except an explicit recipes entry.
Primary-tab transitions replace history entries; secondary routes push them.
Reference recipe dialogs use the same route with a history dialog marker.
Preserve browser Back/Forward, `#nav-back`, `ketoDepth`, `ketoOrigin` and `ketoDialog` behavior.
Topic/help/source-recipe dialogs are not all router-backed; do not assume they are.

## DOM ownership and safe restructuring

`setupGuidance` moves `#consent-panel` into `#setup-consent-slot`.
It moves the original onboarding section into `#setup-restrictions-slot` and removes data-page.
It moves energy inputs out of the manual form into `#energy-review` while preserving
`form="targets-form"`; FormData must still include them.
It appends the existing onboarding button into suggestions.
Changing the initial markup must preserve these initialization operations or replace them coherently.
Do not leave two nodes with the same ID after creating a polished layout.

`#proposals` is one shared node, moved to the origin of the proposed action.
Chat uses `#chat-confirmations`; setup uses `#setup-confirmations`;
target preview uses `#target-confirmations`; studio/memory append to their current surface.
Generic proposals insert after the active form or a page heading.
Keep focus/scroll on the visible proposal after insertion.
A hidden orphan proposal host is a functional failure even when the server staged the change.

## Stable contract identifiers

Consult [UI_CONTRACTS](../spec/UI_CONTRACTS.md) for all static IDs/names/test IDs.
The following groups are particularly sensitive:

- Session/shell: app, login, workspace, content, connection, nav, nav-back, toast, holds, proposals.
- Consent: consent-form, c-processing, c-storage, c-health.
- Chat: chat-form, message, send, messages, chat-extras, chat-confirmations, topic-picker.
- Media: photo, photo-preview, photo-preview-image, photo-remove, mic-button,
  voice-controls, voice-stop, voice-cancel, voice-status, voice-timer.
- Setup: baseline-form, baseline-age/height/weight/measured/category/zone/name,
  setup-progress/stage and the four setup slots.
- Target input names: energy_min_kcal, energy_max_kcal, protein_min_g, protein_max_g,
  carb_basis, carb_max_g, fiber_min_g, saturated_fat_max_pct, basis_note.
- Target hosts: target-preview, saved-targets, manual-targets, apply-targets,
  calculate-guidance, energy-review, energy-slider, target-confirmations.
- Kitchen dynamic IDs: kitchen-product, kitchen-food-list, kitchen-free,
  kitchen-meal/servings/time/missing/equipment/cuisine/avoid and kitchen-memory.
- Kitchen test IDs: kitchen-composer, mode-*, pantry-chips, product-questions,
  kitchen-generate/status/results/candidate/day/confirmation and memory-fact.
- Sources/admin: source-form, source-list, source-recipe-form, sr-* inputs,
  invite-form, invite-link, admin-summary, admin-tab.
- Deletion/session cleanup: revoke, logout, delete-data, deletion-code, deletion-status.

`data-view` names navigate; `data-page` names select hosts.
`data-testid` anchors synthetic/UI verification.
Input `name` is part of FormData, not a display label.
Changing text labels is generally safe; changing mode/action/route/equipment keys is a contract change.
Do not translate or prettify enum values such as pantry_only, no_cook or net_estimate.

## Callback and state contracts

`call(name,args,options)` POSTs the current session CSRF and rejects stale screen epochs.
`accept(data)` takes returned state, optional shopping/message and guidance post-apply behavior.
`setState(next)` checks owner/consent boundaries before rendering.
`clearScreen()` increments the epoch and clears private DOM/media/dialog/candidate caches.
`run(fn)` turns errors into an existing human-readable notification.
`setView(next,options)` resolves aliases through the existing router.
`renderState()` redraws appearance, own state, proposals, diary, topics and saved menu.

Module setup callbacks are injected; preserve their names and meaning:
`$`, `el`, `getState`, `call`, `accept`, `run`, `notify`, `setView`, `epoch`.
Mobile also receives `setImage/getImage`.
Kitchen returns render/load/reset/card/show/dayCard.
Guidance returns initial/render/resolve/afterApplied/reset.
Mobile returns render/reset/resetPhoto/recording/setChatBusy.
Do not bypass `accept` with optimistic “saved” values after an HTTP request starts.

## Visual geometry and modes

Current tokens and exact values are in [DESIGN_SYSTEM](../spec/DESIGN_SYSTEM.md).
Use the existing 17px system font, 48px standard controls, 44px compact/icon minimums,
20px panel radius, 18px main padding and 20px panel padding as the initial constraints.
Default palette is ivory/plum; dark/light are saved preferences.
Large mode is 1.2rem; compact changes spacing; simple hides secondary decorative labels.
Nutrition visibility affects display only.

Keep max widths 1100 app / 900 page / 850 chat; desktop padding becomes 24px at 850px.
Kitchen modes/controls become one column at 600px; setup progress becomes 2×2.
At 400px, proposal definitions collapse to one column and topic controls can wrap.
Short-height CSS at 650px reduces header/composer size while retaining controls.

Use `--viewport-height` and `--viewport-offset` with the visualViewport adapter.
Keep safe-area insets on header, nav and composer.
Preserve `min-height:0` through nested flex containers so chat-scroll receives usable space.
Do not fix the composer to the window or reintroduce body scrolling into the app shell.
Keyboard-open hides bottom nav and reduces composer detail.
No visual claim about iPhone/Safari follows from these CSS rules alone.

## States that must remain visible

- Google sign-in pending, cancelled, popup blocked, uninvited and wrong account.
- First-run unknown answers and disabled/unavailable automatic targets.
- No recipes or fewer than three candidates; infeasible day with actual issues.
- Labelled template fallback when recipe generation fails/rejects.
- Pending chat/recording/recognition with explicit stop/cancel and recoverable error.
- Source needs_content vs draft vs reviewed vs personal_recipe.
- Expired or stale proposal with Apply disabled and Cancel available.
- Safety hold and stale-menu warning.
- PDF preparing, ready, share/download and failure; calendar import limitation.
- Empty diary/memory/reminders and unknown nutrient/quantity/provenance date.

Never replace an error with an attractive success card or suppress a warning to fit mobile.

## Accessibility and acceptance sizes

Preserve real form controls, label associations, fieldsets, native dialogs, skip link,
status/live regions, aria-current, aria-pressed and visible keyboard focus.
Verify touch areas, contrast and focus order using actual output.
Respect prefers-reduced-motion; do not add essential information through animation alone.

Capture synthetic before/after at 375×956, 390×956, 440×956,
440×540, 956×440 landscape and 1280px desktop (record the chosen desktop height).
Repeat important flows in large/dark/simple modes, with keyboard-like reduced height.
Test long Russian text, unknown values, multiple proposals, empty stock and safety holds.
Screenshots establish pixels; DOM tests establish semantics; neither substitutes for the other.
No Mac browser/GUI may be used without renewed explicit authorization.
An isolated authorized parent preview can provide the required screenshot evidence.

## Do not change

- Authentication, membership, admin/private isolation, CSRF and signing.
- Consent gates, proposal apply/cancel, revision checks, expiry and idempotency IDs.
- Clinical screening, holds, arithmetic, targets, food states or catalogue values.
- Clear-screen location/epoch semantics at session or consent transitions.
- Fraction distinction between portion and batch.
- Unknown values into zero/default; photo guesses into measured grams.
- Source rights, untrusted-source status or URL-only needs_content behavior.
- Bounded memory into “remembers everything”; calendar export into background push.
- Model/deployment/budget choices, private bindings, generated release identities.
- Admin page into a family medical-record viewer.

Known source defects are tracked as SA07-01..04 in
[findings](../../qa/SPEC_AUDIT_FINDINGS.json); parent owns fixes.
A redesign must not silently work around them by inventing data or changing backend rules.

## Staged implementation checklist

1. Read current task boundary/status and preserve unrelated dirty files.
2. Pick one screen/layout objective and list maintained modules to edit.
3. Record synthetic before-state selectors, viewport and current visual evidence if authorized.
4. Make a small reversible source change; preserve action keys and callbacks.
5. Confirm shared proposals stay visible at the originating form/chat/studio/memory.
6. Confirm form ownership, input names, unknown states and keyboard order.
7. Build generated assets once after source is ready.
8. Run focused existing static/setup/kitchen/media tests relevant to the change.
9. Run parent-required checks; obtain synthetic screenshot evidence through an authorized route.
10. Compare exact build hashes and record remaining visual/device gaps.
11. Commit only small reviewable changes when the implementing task authorizes commits.
12. Stop at that task's acceptance boundary; do not deploy or add a framework as incidental cleanup.

Commands for the parent/implementer, not executed by this documentation review:

```sh
node --test cloudflare-saas/tests/static.test.mjs cloudflare-saas/tests/setup.test.mjs cloudflare-saas/tests/kitchen.test.mjs cloudflare-saas/tests/media.test.mjs
node cloudflare-saas/build.cjs
python3 scripts/verify_repository.py
git diff --check
```

If source behavior changes, add a meaningful regression at its owning boundary.
Do not run browser scripts, install packages or alter cloud configuration just to obtain a design mockup.
