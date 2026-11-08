# Design system and layout contract

> Current specification: **0.6.2-audit-pilot**, reconciled with runtime commit `e3f648d5313b68202336cda775ff7279556a2569`. The independent review examined 0.6.1; SA07-01…04 are historical findings corrected in 0.6.2. Read [current corrections](CURRENT_CORRECTIONS.md) for exact source, regression evidence and remaining acceptance gates.

Maintained styles: [public/app.css](../../cloudflare-saas/public/app.css).
Maintained markup: [public/index.html](../../cloudflare-saas/public/index.html).
Generated `style.css` prepends pinned noUiSlider CSS; edit `app.css`, then use the build.
This document records CSS intent. No screenshot/contrast/device acceptance was run here.

## Theme tokens

| Token | Default | Dark override | Light override |
| --- | --- | --- | --- |
| --bg | #f7f3f6 | #211c24 | #f4f5f8 |
| --paper | #fff | #302936 | #fff |
| --ink | #312b33 | #f7eff6 | inherited |
| --muted | #655c68 | #cbbdcb | inherited |
| --accent | #6b4265 | #ddb4d5 | inherited |
| --soft | #f0e7ee | #463449 | #eceaf4 |
| --line | #ded4df | #64556a | inherited |
| --warn | #8b322f | #ffc0b5 | inherited |
| --radius | 20px | inherited | inherited |

Default font: `-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif`.
Root font is 17px with line-height 1.5.
`body.large` uses 1.2rem; text sizes remain relative to that choice.
Heading line-height is 1.25; h1/h2/h3 are 1.7/1.35/1.12em.
Controls inherit the font and use at least 16px input text to avoid small-input zoom behavior.
No external display font is part of the web UI.
PDF uses separately prepared Noto Sans assets, not this web font stack.

## Control geometry

- General controls: minimum height 48px, border 1px, input radius 12px.
- Buttons: radius 14px, padding 10px 15px, weight 600.
- Standard inputs: padding 12px; labels use 7px gap and 14px bottom margin.
- Checkbox/radio actual glyph controls: 24px, inside a labelled hit area.
- Header icon controls: at least 44px square.
- Microphone/topic-edit controls: fixed 48px basis/minimum width.
- More navigation rows: at least 56px high, radius 16px, 15px padding.
- Number controls: 48px / flexible input / 48px columns with 8px gap.
- noUiSlider handles: 44px square, 2px accent border and explicit focus ring.
- Primary buttons: accent background and paper text.
- Disabled controls: opacity .55; preserve readable purpose and error explanation.

These are exact current values, not a blanket claim of WCAG conformance.
Contrast must be measured for the final combinations, especially dark primary buttons,
muted/error text, disabled states and the hard-coded kitchen selected-mode wash.

## Spacing and surfaces

App width cap is 1,100px, pages 900px, chat 850px and login 600px.
Main content padding is 18px; panels/cards typically use 20px.
Comfortable surfaces have 12px vertical margins and token radius.
Compact panel/recipe-card padding is 14px.
Buttons wrap in rows with 8px gap and 150px flexible basis.
Settings grid uses min(100%,250px); recipe grid similarly uses 250px minimum cards.
Kitchen result grid uses 300px minimum cards and becomes single-column on mobile.
Kitchen form gap is 14px; control grid gap 16px; modes have 12px gap.
Pantry chips use 14px padding, 12px gap and a flexible 220px basis.
Avoid adding a new spacing system without reconciling these existing rules.

## App shell, safe area and keyboard

`#app` is a flex column with height `var(--viewport-height,100dvh)` and hidden overflow.
It translates by `--viewport-offset` from visualViewport offsetTop.
Header includes safe-area top inset plus 9px and 16px horizontal padding.
Workspace gives content the remaining height with `min-height:0`.
Bottom nav follows content by flex order and includes bottom/side safe-area insets.
Content scrolls internally; body/html do not scroll in the main app.
Public standalone help/privacy/delete pages use a separate body rule allowing page scroll.

[mobile-ui.js](../../cloudflare-saas/public/mobile-ui.js) tracks visualViewport resize/scroll.
When an editable control is focused and viewport shrinks by more than 100px,
`keyboard-open` hides bottom navigation and reduces composer bottom padding.
Do not replace this with a fixed screen height or an arbitrary keyboard offset.
Real iOS/Android keyboard behavior remains unverified.

## Chat layout

The chat view gives `#content` a non-scrolling flex layout.
`.chat-scroll` owns scrolling for messages/extras/confirmations.
Composer is a flex-none footer of the chat card, not fixed to the desktop viewport.
Textarea is 66–140px tall normally; message bubbles are at most 92% wide.
Assistant bubble uses paper/line; user bubble uses accent/paper.
Suggestion buttons wrap; they insert a draft rather than sending automatically.
Photo preview is 72px square and removable before send.
Status regions hide when empty to preserve useful message height.

## Breakpoints

| Condition | Current behavior |
| --- | --- |
| width ≥850px | Header/content padding 24px; nav capped at 600px; chat inline borders |
| width ≤600px | Kitchen mode/control grids become one column; header status hides; setup progress becomes 2×2 |
| width ≤400px | Topic bar wraps, header padding 10px, proposal definitions one column, bubbles up to 98% |
| height ≤650px | Compact header/composer; textarea 44px minimum/52px height/90px max; 44px compact actions; footnote hidden |
| prefers-reduced-motion | No animation/transition; scroll behavior auto through CSS override |

Required acceptance sizes are 375px and 390px mobile widths, 440×956,
440×540, landscape 956×440 and 1280px desktop.
For unspecified heights in width-only checks use a documented test height, e.g. 956px.
Test normal and large text, dark and simple mode; do not treat one screenshot as all states.

## Components and dialogs

- `.panel`, `.source`, `.member`, `.diary-entry`, `.menu-day`: bordered paper surfaces.
- `.notice`: soft surface for state/explanation; `.danger` changes to warn color.
- `.proposal`: 2px accent border, 18px radius/padding, visible apply/cancel controls.
- Proposal definition list is 1:2 columns, one column on narrow width.
- Recipe reference cards are buttons; generated kitchen candidates are articles with explicit actions.
- `.ingredient-list`: food names, state and grams, never decoration replacing text.
- Native `<dialog>`: radius 24px, width min(680px,100%−24px), 22px padding,
  viewport-height minus 40px maximum and internal scroll.
- Backdrop color is #241b2966.
- Toast is static/in-flow, not a floating overlay that hides form actions.
- Memory rows expose each saved fact's source/time when known and a specific forget action.

## Accessibility contract

Preserve skip link, labelled nav, `#content tabindex=-1`, real buttons/forms,
labels/fieldsets/legends, live status regions and native dialogs.
Focus-visible outline is 3px accent with 3px offset; sliders use 5px offset.
Dynamic numeric fields use spinbutton role and min/max/now plus labelled step buttons.
Moving target energy inputs must preserve `form="targets-form"` ownership.
Screening has an explicit unknown choice and explanatory help relationship.
Microphone uses accessible label and pressed state; recording status is announced.
Do not hide warnings merely because simple mode is selected.
Current simple mode hides eyebrow labels; compact mode changes spacing.
Nutrition hiding is a display setting, not a calculation change.

## Design direction and prohibited changes

The app should feel like a calm native-looking web utility; it is not UIKit.
Use existing semantic HTML and small source changes.
No decorative up-right arrows, stock wellness promises or ornamental progress scores.
Do not add a router/framework, heavy animation library or external font just for a redesign.
Do not convert controls into unlabelled icons or visually imply a clinical clearance state.
Screenshots must use synthetic data and exact viewports; browser execution requires explicit authorization.
