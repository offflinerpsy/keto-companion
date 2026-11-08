# Tranquil Dawn

KETO uses a warm cream canvas, spruce buttons, soft cards and restrained pastel accents. Existing saved `ivory-plum` and `light` preferences select this light appearance; `dark` selects an application-specific dark adaptation. Open **More → Settings and data** to choose the appearance, large text or card density. Appearance changes continue to require the existing confirmation.

Login and Menu include a quiet photographic welcome area. The same-origin photograph is supplied and packaged by the release owner. Chat keeps its working space, with photo, image-link and microphone controls beside Send. Each icon has an accessible label.

Menu shows saved profile/target status and counts of pantry positions and diary records after all personal-data permissions are accepted. Missing data stays unknown. The progress list describes four steps in preparing a personal menu; it does not measure health or food intake. Recipe, diary, source and developer changes keep their original confirmation controls.

[Implementation choices and limits](../design/IMPLEMENTATION.md) · [Machine-readable tokens](../design/DESIGN_TOKENS.json) · [Focused verification receipt](../../qa/TRANQUIL_DAWN_RESULT.json).

Source, Cloudflare CI and isolated runtime evidence are tracked in the release receipt; physical iPhone and clinical acceptance remain separate.

## Release behavior and exact boundaries

The supplied design is adapted to the existing private nutrition application, not to a mock biometrics dashboard. The source document is preserved in `docs/design/DESIGN.md`; its conflicting typography/container suggestions are resolved explicitly in IMPLEMENTATION.md. No sleep, steps, calorie intake or “health score” is invented for a decorative card. The progress is only preparation/checklist state.

The public client uses cream canvas, spruce primary controls, pastel card accents,22px cards, local system-font fallbacks, safe-area padding and clear unknown states. Favicon SVG/ICO,16/32/48px images,180px Apple and192/512px install icons are included. Photo provenance is kept separately.

A real deployed-client browser check caught missing invocation of the overview renderer that isolated helper tests missed; the actual state-render path now has a regression. The same browser pass verified image paste/drop, image-only drafts, member/owner developer-entry visibility, dialog bounds and39screen layouts across five viewports. Exact final acceptance is in the current release receipt, not inferred from historical results.

Developer mode is owner-only and disabled until explicitly enabled for a limited period. It changes only the three allowlisted UI source files, runs an isolated fixed trusted suite in Cloudflare and produces a private preview/diff. It cannot publish itself, change nutrition/authentication rules or access family records. Native CI runs independently of GitHub Actions.

Current deployed summary/readback checks pass. See `../evidence/TRANQUIL_BROWSER_FINAL.json`:75interactions,39screen layouts, no overlaps/uncaught errors in tested Chromium fixtures. Personal-mode chat-space measurements are recorded separately from the larger synthetic demo banner. These are not physical Safari or live family-profile tests.
