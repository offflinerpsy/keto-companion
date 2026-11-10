# C16: visible food, stable phone forms and confirmed assistant context

Owner direction: iPhone 17 Pro (not Max), Chrome, authenticated; three supplied
1206px-wide screenshots. The implementation target is 402 CSS pixels at DPR3.
The reference screenshots are defect evidence, not a requirement to preserve
their spacing. The later explicit reference is https://animate-ui.com/.

## Product decisions

The diary opens at a meaningful day even before a profile timezone is confirmed.
Device time is a labelled viewing fallback, never an implicit profile change.
Writing an intake still uses the confirmed profile timezone and reviewed server
proposal. Catalogue/recipe drafts retain their fields across explicit timezone
confirmation; invalidated generated kitchen drafts require a fresh selection.

Daily nutrition precedes a meal map with names, portions, times, and nutrient
amounts. The map groups breakfast, lunch, dinner, snack and unspecified meals.
Current agreed targets are shown as ranges or ceilings; no new norm is guessed.
Fat has an actual intake but no invented target. Stale or paused targets are not
used for progress; incomplete nutrients display a known subtotal, not zero.
The whole-day server sum includes entries outside the current page.

A durable server receipt supplies the saved entry and updated daily total before
history refresh. Failed reads retain those facts and offer retry. An entry outside
the first page stays pinned without shifting the pagination offset. Deletion and
idempotent deletion replay return an authoritative updated summary. Read and write
requests share one account queue; consent revocation and urgent messages retain
priority, and a new session never waits behind an abandoned old session.

Saving a recipe/product to the catalogue shows a separate “Записать порцию” action.
Selection or catalogue save does not silently count as consumption. Discussion of
a day adds its date to a chat draft, preserving existing text; it does not send it.

The assistant receives persisted profile facts, dated measurements, confirmed
preferences and the requested day's server-calculated totals/comparison. It sees
at most ten meal names, while the total covers all entries. Raw diary notes,
pending facts, account identifiers and forgotten preferences do not become new
profile memory. Empty history means unknown consumption. Existing private D1
ownership, confirmation, deletion and consent mechanisms remain authoritative.

## Phone geometry and input behavior

Native date/time controls have explicit border-box/intrinsic width constraints,
16px minimum text, and normalized WebKit appearance. Dialog width and horizontal
overflow are bounded; vertical scrolling remains available. Native close/dismiss,
focus return and the visualViewport handler remain in charge.

An empty optional time exposed a separate WebKit editor defect: submission emitted
`invalid` for that input even while its public `validity.valid` was true. The explicit
clear action resets the segmented native editor through a synchronous type reset;
it does not disable required/date/amount validation or server checks.

The date navigator retains its native picker with a visible localized label; the
native value becomes visible on keyboard focus. Time uses an explicit associated
label and a separate named clear button. The sticky review button has dedicated
scroll padding; expanded notes and the final DST selector are tested above it.

## Animate UI adoption

Pinned upstream `22a9236ae107328f8564edb7e3299375da3247af`, v2.4.3. The official
plain-markup/CSS route fits this existing application. The adapted components are
native Dialog, native Accordion/Collapsible and a Check success mark; press scales
follow the same tokens. Exact sources and complete license are in
[the vendor notice](../../cloudflare-saas/vendor/animate-ui/README.md).

Dialog appearance uses the short 220ms soft curve and a .96-to-1 scale. Closing
stays synchronous so navigation, confirmation and focus do not wait on decoration.
The official 350ms native details recipe is feature-detected, with ordinary details
as fallback. Blur and the lower mask are omitted to keep form content and focus
outlines clear. The upstream Check path draws for 300ms only after durable save.
Reduced motion keeps every control and final mark visible and disables movement,
stroke animation and pseudo-element transitions. No animation changes nutrient
numbers, no drag gesture is added, and no application scroll wrapper is transformed.

## Sources used

- [Animate UI introduction](https://animate-ui.com/docs)
- [Animate UI skills / plain markup](https://animate-ui.com/docs/skills)
- [Official disclosure recipe](https://github.com/imskyleen/animate-ui/blob/22a9236ae107328f8564edb7e3299375da3247af/skills/animate-ui/references/recipes/disclosure.md)
- [MyFitnessPal Today](https://support.myfitnesspal.com/hc/en-us/articles/39985611667341-Your-Today-tab)
- [Cronometer diary display](https://support.cronometer.com/hc/en-us/articles/360020863072-Mobile-Display)
- [MacroFactor nutrition overview](https://help.macrofactorapp.com/en/articles/139-view-a-summary-of-your-nutrient-intake-with-the-nutrition-overview)
- MDN temporal-input/overflow documentation and Playwright mobile emulation docs,
  retrieved through Context7 during C16. Emulation is not a physical iPhone test.

Competitor material informed the order of summary and meals, grouped entries and
visible targets. KETO keeps its own source-derived calculations and explicit
confirmation; it does not copy a competitor's medical norms or brand assets.
