# KETO mobile interface — AGR-306

## Approved continuation — 2026-11-09

The owner approved the independent product review and resumed implementation through the existing private-family release. [The delivery contract](PRODUCT_DELIVERY_2026_11_09.md) now controls navigation and task flow: Chat / Diary / Recipes / Products; Today remains a nested meal plan; one consumed-food editor; contextual chat actions; compact system-style forms. Prior C9 technical receipts remain historical evidence, not acceptance of the newly requested product.

The current owner brief replaces the earlier Tranquil Dawn direction with a practical Russian interface for iPhone. The existing vanilla application, router, saved theme values and private state stay in place. Source changes are under review; release and physical iPhone acceptance are separate stages.

## Current design rules

| Element | Current implementation |
| --- | --- |
| Typography | `-apple-system, BlinkMacSystemFont, system-ui, sans-serif`; 17 px body, one heading scale, explicit large-text setting. No downloaded Apple font files. |
| Light surfaces | Neutral `#F2F2F7` canvas, white cards, `#1C1C1E` text, `#50545B` secondary text. |
| Interaction | Blue `#005FCC`, pale blue selection surface `#EAF2FF`, visible selected navigation and keyboard focus. Color supports a label or selected state. |
| Dark surfaces | Explicit saved dark theme; neutral dark backgrounds, light text and blue controls with contrasting button text. |
| Controls | At least 48 px touch controls in the current adaptation; compact radio glyphs aligned with the first line of the label. Numeric steppers have visible starting values and work when a field is empty. |
| Food search | Human names and preparation state, bounded named results, visible continuation, source review before import. Internal product IDs remain machine keys. |
| Confirmations | Russian action and subject, named ingredients, known mass or “масса не указана”, visible cancellation and saved receipt. No raw payload fields. |
| Help | Explicit close, browser-back lifecycle and focus on the close control when opened; preserve the current draft. |
| Imagery | No decorative photo hero in Menu or login. The legacy packaged photograph is not required in the current interface. |

The historical variable names remain for compatibility. [DESIGN_TOKENS.json](DESIGN_TOKENS.json) mirrors their current base values in `cloudflare-saas/public/app.css`; the names do not imply green interaction colors or a downloaded font.

## Data and interaction boundaries

Menu summaries require explicit processing, storage and health-data consent before reading private state. An unquantified food record or incomplete nutrient field remains unknown. Household quantities and a person's consumed portions use separate calculations. Measurements are distinct from food intake.

A USDA or label result is a candidate until reviewed. Confirming a personal food does not approve a cooking method or exact meal plan. The own-dish calculation shows stated quantities, known contributions and missing fields; observational compositions remain separate from checked planning eligibility.

## Acceptance

Focused tests cover selection and delayed replies, quantities, typed confirmations, diary draft handling, steppers, route state and help lifecycle. Root verified the first core increment in the browser at actual 440 and 390 CSS px, including immediate 200 g input and empty-field steppers. New search, own-dish and shop surfaces require their own integrated screenshots and checks after implementation. See [the active feature specification](../../specs/001-iphone-keto-overhaul/spec.md) and [AGR-306](https://linear.app/agregator/issue/AGR-306/keto-polnocennye-scenarii-pitaniya-i-pokupki-na-iphone) for scope and acceptance status.

## C15 detail pass — 2026-11-09

The owner requested refined spacing, typography, controls and icons after using C14. The current source uses 14 px cards, 12 px controls, medium-weight secondary labels, and a local 30-symbol SVG mask set in `cloudflare-saas/public/ui-icons.css`. Build concatenation preserves the existing single CSS asset. Mobile date/time fields stack, quantity fields align at their lower edge, own-dish results and ingredients have explicit gaps, and disclosures retain visible open/closed chevrons. The full review and acceptance boundaries are recorded in [C15 UI result](../evidence/AGR_306_C15_UI_RESULT_RU.md) and [C15 source acceptance](../evidence/AGR_306_C15_UI_ACCEPTANCE.json).

## C16 diary and motion — 2026-11-10

[C16 design decisions](C16_DIARY_AND_MOTION.md) cover the owner’s iPhone 17 Pro input overflow, visible saved meals, complete-day nutrition and confirmed assistant memory. Animate UI v2.4.3 supplies pinned motion tokens, a native disclosure recipe and the success Check path through its documented plain-markup adaptation. [Source acceptance](../evidence/AGR_306_C16_SOURCE_ACCEPTANCE.json) records 22 Chromium/WebKit scenarios, 639 Python and 260 Node tests. Physical iPhone acceptance remains separate from synthetic browser evidence.
