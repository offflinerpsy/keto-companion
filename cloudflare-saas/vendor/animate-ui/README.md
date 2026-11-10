# Animate UI adaptations in KETO

Upstream: https://github.com/imskyleen/animate-ui

Pinned source: `22a9236ae107328f8564edb7e3299375da3247af` (v2.4.3).
Copyright (c) 2025 Elliot Sutton. See [LICENSE.md](LICENSE.md) for the complete
**MIT + Commons Clause License Condition**. These adapted parts are used within
the KETO application, not redistributed as a standalone component collection.

## Used sources

- `skills/animate-ui/references/tokens.md`: soft/out/draw/color curves, menu,
  overlay, disclosure, check, fade and swap durations; press and choice scales.
- `skills/animate-ui/references/recipes/modal.md`: centered overlay and reduced
  motion. KETO uses the shorter 220 ms menu gate and scale .96 (the toast token)
  for a frequently used phone form. It omits tilt, blur and overshoot. Native
  dialog close, Escape, route changes and focus restoration remain synchronous.
- `skills/animate-ui/references/recipes/disclosure.md`: native `<details>` CSS,
  `interpolate-size: allow-keywords`, `::details-content`, 350 ms soft transitions
  and discrete content visibility. This is feature-detected. Blur and the bottom
  mask are omitted so form text and focus rings remain clear. Unsupported engines
  retain ordinary native disclosure behavior.
- `apps/v2/registry/icons/check/index.tsx`: exact SVG path `m4 12 5 5L20 6`.
- `packages/react/src/internal/item-indicator.tsx`: 300 ms draw without the
  checkbox delay, applied to that check after a durable server receipt.

Implementation: `cloudflare-saas/public/app.css` and `intake-ui.js`. There is no
React, Motion runtime, remote stylesheet, runtime CDN or global CLI installation.
Keyboard/native form semantics remain browser-owned. Reduced motion disables
movement, drawing and pseudo-element transitions; the saved mark remains visible.
