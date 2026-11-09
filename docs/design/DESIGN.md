# Tranquil Dawn — Style Reference

> Historical reference: AGR-306 supersedes this visual direction. Current colors, system typography and task surfaces are described in [IMPLEMENTATION.md](IMPLEMENTATION.md) and [DESIGN_TOKENS.json](DESIGN_TOKENS.json). The coastal hero and wellness slogans are not current product requirements.

> a serene morning ritual grounding wellness metrics in soft coastal light and airy pastel cards.

**Theme:** light

Set on an airy, warm-white base (#FAF9F6), this wellness mobile dashboard balances contemplative breathing room with precise biometric tracking. Deep spruce teal (#0E3B36) anchors primary interaction points and headings, while high-saturation accents are strictly avoided in favor of muted botanical pastels (sage, seafoam, peach, and slate lavender). The typographic hierarchy relies on a clean, modern geometric sans, shifting gracefully from uppercase tracked eyebrows (11px, 1.2px tracking) to punchy metric figures (22px bold). Component containers sport generous corner radii (20px to 24px) paired with ultra-diffuse ambient shadows (blur 20px, opacity 0.04) that float effortlessly. High-definition photographic warmth in the hero card grounds the digital interface in tangible real-world calm. The layout immediately draws the eye to the coastal sunrise banner before smoothly distributing attention across the four daily health metric pillars.

## Tokens — Colors

| Name | Value | Token | Role |
|------|------|------|------|
| Canvas Warm Cream | `#FAF9F6` | `--color-canvas-warm-cream` | Global application background setting a calm, soft-touch ambient tone |
| Card Surface White | `#FFFFFF` | `--color-card-surface-white` | Background for floating metric tiles and interactive cards |
| Mint Glaze Surface | `#F0F7F5` | `--color-mint-glaze-surface` | Background fill for the daily progress summary card |
| Spruce Teal | `#0E3B36` | `--color-spruce-teal` | Dominant brand hue for high-contrast CTA pill button and key headlines |
| Deep Charcoal | `#1A2421` | `--color-deep-charcoal` | Primary typography for headers, metrics, and navigation elements |
| Slate Neutral | `#6C7A76` | `--color-slate-neutral` | Secondary descriptors, target totals, and subtle icon strokes |
| Verdant Mint | `#43A08A` | `--color-verdant-mint` | Daily plan progress ring and activity progress bar fills |
| Muted Peach | `#F09E81` | `--color-muted-peach` | Nutrition metric icon tint and active calorie progress indicator |
| Dusk Indigo | `#4F659C` | `--color-dusk-indigo` | Sleep duration progress bar and night tracking icon background |
| Coral Alert | `#E06A4E` | `--color-coral-alert` | Unread notification badge count on the top navigation bar |

## Tokens — Typography

### Plus Jakarta Sans — Unified typography driving all titles, numeric data, and navigation labels

- **Substitute:** Inter, SF Pro Display, Urbanist
- **Weights:** 400, 500, 600, 700
- **Sizes:** 11px, 13px, 15px, 17px, 20px, 24px, 28px
- **Line height:** 1.1-1.5
- **Letter spacing:** -0.02em at display, 0.08em at uppercase captions

### Type Scale

| Role | Size | Line Height | Letter Spacing | Token |
|------|------|------|------|------|
| caption | 11px | 1.3 | 0.8px | `--text-caption` |
| body-sm | 12px | 1.4 | 0.1px | `--text-body-sm` |
| body | 14px | 1.5 | 0px | `--text-body` |
| body-lg | 15px | 1.4 | -0.1px | `--text-body-lg` |
| subheading | 17px | 1.3 | -0.2px | `--text-subheading` |
| heading | 20px | 1.25 | -0.3px | `--text-heading` |
| heading-lg | 24px | 1.2 | -0.4px | `--text-heading-lg` |
| display | 28px | 1.15 | -0.5px | `--text-display` |

## Tokens — Spacing & Shape

**Base unit:** 4px

**Density:** comfortable

### Spacing Scale

| Name | Value | Token |
|------|------|------|
| 4 | 4px | `--spacing-4` |
| 8 | 8px | `--spacing-8` |
| 12 | 12px | `--spacing-12` |
| 16 | 16px | `--spacing-16` |
| 20 | 20px | `--spacing-20` |
| 24 | 24px | `--spacing-24` |
| 28 | 28px | `--spacing-28` |
| 36 | 36px | `--spacing-36` |

### Border Radius

| Element | Value |
|------|------|
| cards | 22px |
| buttons | 999px |
| inputs | 12px |
| links | 4px |

### Layout

- **Page max-width:** 428px
- **Section gap:** 24px
- **Card padding:** 16px
- **Element gap:** 10px

## Surfaces

| Level | Name | Value | Purpose |
|------|------|------|------|
| 0 | Base Atmosphere | `#FAF9F6` | Soft, low-stimulation overall canvas background behind all content containers |
| 1 | Floating Card | `#FFFFFF` | High-clarity elevated containers for metric data with soft ambient drop shadow |
| 2 | Tinted Milestone | `#F0F7F5` | Low-contrast tinted surface isolating secondary summaries like the daily task plan |

## Components

### Top App Bar
**Role:** Application navigation and state indicator

A 56px high transparent flex bar with a hamburger menu icon on the left, a centered 19px semi-bold 'Wellness' screen title in #1A2421, and a minimalist bell icon on the right with an overlapping 16px coral badge (#E06A4E) displaying unread counts in white 10px bold text.

### Hero Focus Card
**Role:** Inspirational daily commitment banner

A 24px rounded image card containing a tranquil ocean sunrise photograph with soft vignette. Contains uppercase tracked eyebrow 'DAILY FOCUS' in #1A2421, a 26px bold heading 'Breathe. Move. Thrive.', a two-line muted body copy, and a 42px high deep spruce pill button (#0E3B36) with right arrow icon.

### Section Header Row
**Role:** Content categorization and expansion link

Flex row spanning full width with a 19px semi-bold title 'Today’s Overview' aligned left in #1A2421 and a 13px medium link 'See all' aligned right in muted spruce (#1B5349).

### Metric Quick-Card
**Role:** Single-stat biometric snapshot column

A white card (20px border radius, 14px padding) with a 48px circular pastel-tinted icon container at top, a 12px muted category label, a 20px bold primary value, a 12px secondary goal ratio, and a 5px high rounded dual-tone progress track at the bottom.

### Progress Track
**Role:** Linear visual feedback on goal completion

A horizontal bar 5px tall with 999px pill ends, composed of an active colored segment (e.g. #247B6D) transitioning into a faint, 15% opacity pastel background track representing the remaining goal.

### Daily Plan Banner
**Role:** Interactive milestone overview widget

A light mint (#F0F7F5) container with 24px border radius, containing left-aligned task copy (eyebrow with check icon, 18px bold title, body note) and a right-aligned 76px diameter SVG ring progress indicator featuring an 8px stroke and center text '3/3 Completed'.

## Do's and Don'ts

### Do

- Use generous 20px to 24px border radii on all card-level containers to retain organic softness.
- Rely on deep spruce teal (#0E3B36) instead of pure black for primary call-to-action buttons.
- Pair each metric category with its own desaturated pastel identity for effortless scanning.
- Keep shadows extremely subtle (opacity <= 0.05, blur >= 16px) to maintain a flat, modern calm.
- Ensure metric numbers use prominent bold weights (600-700) juxtaposed against light body labels.
- Use 999px rounded pill outlines for small tags, progress meters, and primary action buttons.

### Don't

- Never use harsh neon or highly saturated accent tones that disrupt the tranquil atmosphere.
- Avoid solid dark borders or dividing hair lines between metric overview cards.
- Do not use sharp 0px or small 4px border radii on any major layout element.
- Never center-align body copy or metric values within data cards.
- Avoid loud, busy stock photography; restrict imagery to calm, natural light and horizon scenes.
- Do not substitute pure black (#000000) for body text; use softened charcoal (#1A2421).

## Signature Element

The signature element is the harmony between the coastal dawn hero banner and the four pastel-coded biometric pillars below it. Each metric card distills a vital sign into an icon badge, bold stat, and dual-tone pastel bar, effortlessly transforming clinical health numbers into an emotionally comforting ritual.

## Elevation

Elevation is achieved through ambient softness rather than dramatic lighting layers. Metric cards use a single diffuse drop shadow (0px 8px 24px rgba(0, 30, 20, 0.04)) directly against the warm cream canvas. Layering remains exceptionally shallow, preserving an approachable, distraction-free digital sheet feel.

## Imagery

Photography is strictly atmospheric, warm, and natural, focusing on open horizons, tranquil morning beaches, and soft dawn sunlight. High-contrast athletic scenes, gym interiors, or synthetic 3D renders are off-brand and prohibited.

## Layout

The mobile view is arranged as a single vertical scroll framed by 20px horizontal screen margins. The flow initiates with a compact app header, opens into a personalized greeting, anchors attention with a high-impact horizontal photographic banner, and transitions into a 4-column metric grid. It concludes with a broader task milestone card, establishing an intuitive top-to-bottom rhythm from aspiration down to task execution.

## Typography Voice

The typography speaks with calm, grounded authority through Plus Jakarta Sans. Its wide apertures, clean geometric circularity, and balanced ascenders convey approachability without sacrificing diagnostic clarity. When replacing, choose humanized geometric sans serifs like Inter or Urbanist rather than mechanical grotesques like Arial.

## Similar Styles

- **Headspace** — Shared use of warm canvas tones and comforting, non-aggressive card geometry.
- **Apple Health** — Clear category-based micro-dashboards with individual progress bars and metric values.
- **Oura** — Sophisticated blend of natural photography, subtle pastels, and refined wellness reporting.

## Agent Prompt Guide

**Quick Color Reference**

- Text: #1A2421
- Background: #FAF9F6
- Elevated surface: #FFFFFF
- Border: #F0F7F5
- Primary action: #0E3B36

**Example Component Prompts**

1. **Hero Focus Card**: Create a 350px wide, 24px rounded card with an ocean sunrise background image, containing dark charcoal bold title 'Breathe. Move. Thrive.', tracked uppercase subtitle 'DAILY FOCUS', and a deep spruce (#0E3B36) pill CTA button labeled 'Start your day' with an arrow icon.

2. **Metric Quick-Card**: Build an 80px wide white health metric card with 20px rounded corners, featuring a 44px round pastel icon badge at top, a 12px secondary label, a 20px bold figure '6,245', target text '/ 10,000 steps', and a 5px high teal progress bar at the bottom.

3. **Daily Plan Banner**: Construct a full-width card with background #F0F7F5, 24px border radius, padding 20px, left-side text stack 'Let’s keep building momentum.', and a right-aligned 72px diameter circular progress ring with stroke #43A08A enclosing center text '3/3 Completed'.

## Quick Start

### CSS Custom Properties

```css
:root {
  /* Colors */
  --color-canvas-warm-cream: #FAF9F6;
  --color-card-surface-white: #FFFFFF;
  --color-mint-glaze-surface: #F0F7F5;
  --color-spruce-teal: #0E3B36;
  --color-deep-charcoal: #1A2421;
  --color-slate-neutral: #6C7A76;
  --color-verdant-mint: #43A08A;
  --color-muted-peach: #F09E81;
  --color-dusk-indigo: #4F659C;
  --color-coral-alert: #E06A4E;

  /* Typography — Font Families */
  --font-plus-jakarta-sans: '"Plus Jakarta Sans"', Inter, "SF Pro Display", Urbanist, ui-sans-serif, system-ui, sans-serif;

  /* Typography — Scale */
  --text-caption: 11px;
  --leading-caption: 1.1;
  --text-body-sm: 13px;
  --leading-body-sm: 1.1;
  --text-body: 15px;
  --leading-body: 1.1;
  --text-body-lg: 17px;
  --leading-body-lg: 1.1;
  --text-subheading: 20px;
  --leading-subheading: 1.1;
  --text-heading: 24px;
  --leading-heading: 1.1;
  --text-display: 28px;
  --leading-display: 1.1;

  /* Spacing & Shape */
  --space-unit: 4px;
  --container: 390px;
  --section-padding: 24px;
  --grid-gap: 12px;
  --radius: 22px;
  --radius-pill: 999px;
}
```

### Tailwind v4

```css
@theme {
  /* Colors */
  --color-canvas-warm-cream: #FAF9F6;
  --color-card-surface-white: #FFFFFF;
  --color-mint-glaze-surface: #F0F7F5;
  --color-spruce-teal: #0E3B36;
  --color-deep-charcoal: #1A2421;
  --color-slate-neutral: #6C7A76;
  --color-verdant-mint: #43A08A;
  --color-muted-peach: #F09E81;
  --color-dusk-indigo: #4F659C;
  --color-coral-alert: #E06A4E;

  /* Typography */
  --font-plus-jakarta-sans: '"Plus Jakarta Sans"', Inter, "SF Pro Display", Urbanist, ui-sans-serif, system-ui, sans-serif;

  /* Typography — Scale */
  --text-caption: 11px;
  --leading-caption: 1.1;
  --text-body-sm: 13px;
  --leading-body-sm: 1.1;
  --text-body: 15px;
  --leading-body: 1.1;
  --text-body-lg: 17px;
  --leading-body-lg: 1.1;
  --text-subheading: 20px;
  --leading-subheading: 1.1;
  --text-heading: 24px;
  --leading-heading: 1.1;
  --text-display: 28px;
  --leading-display: 1.1;

  /* Spacing & Shape */
  --spacing: 4px;
  --container-page: 390px;
  --radius-card: 22px;
  --radius-pill: 999px;
}
```
