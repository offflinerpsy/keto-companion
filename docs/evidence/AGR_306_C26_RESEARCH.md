# AGR-306 / C26: barcode and package-label workflow

Research date: 2026-11-11. Scope: public primary-source research and a narrow local scanner identity check. No browser/device test, dependency change, OCR/provider execution, or source edit performed. Exa search/fetch and Context7 were used; Firecrawl was not used.

## Recommended bounded implementation

Retain the vendored **Quagga2 1.13.0** and existing plain JavaScript/CSS design. Use one product-add flow with three entry methods: camera barcode, typed barcode/name, and package-label photo. A barcode is a catalog lookup key, not a source of nutrition. Show a usable label/manual alternative immediately and after any catalog miss, scan failure, unsupported browser, permission failure, or bounded timeout. Preserve already entered data across those transitions.

Do not migrate the application to React, replace the scanner simply because iPhone scanning failed, or add another component framework during this repair. First verify the existing stream/decode lifecycle and visible fallback at the exact iPhone viewport. The matching modern upstream scanner remains the same 1.13.0 version found locally.

### Scanner facts and limits

- Local identity: `cloudflare-saas/public/shop-scanner.js` loads `/quagga-1.13.0.min.js`; current readers are `ean_reader`, `ean_8_reader`, `upc_reader`. Its bundled header includes the MIT notice.
- [Quagga2 upstream](https://github.com/ericblade/quagga2) supports script-tag/plain-JavaScript use, live camera scanning and still-image decoding. Listed linear formats include EAN/EAN-8/UPC-A and Code 128. License: **MIT**. The [published package](https://www.npmjs.com/package/@ericblade/quagga2) reports 1.13.0, updated 2026-10-21. Upstream activity was observed in October 2026; this is maintenance evidence, not an iPhone acceptance result.
- [Exact 1.13.0 source](https://github.com/ericblade/quagga2/blob/1.13.0/src/quagga.js) confirms `decodeSingle(config, optionalCallback)` returns a Promise. One generated documentation page says `void`; prefer the pinned implementation when evaluating the existing `await`. Do not introduce a callback-only rewrite based on that outdated signature.
- [Static-image documentation](https://github.com/ericblade/quagga2/blob/1.13.0/docs/tutorials/static-image.md): uploaded images/data URLs can be decoded without `getUserMedia`. `decodeSingle` defaults to an 800px longest-side image; result coordinates use that scaled space. Barcode-photo decoding is distinct from nutrition-label extraction.
- [MDN Barcode Detection API](https://developer.mozilla.org/en-US/docs/Web/API/Barcode_Detection_API) marks native `BarcodeDetector` experimental, secure-context-only and not Baseline. [Current compatibility](https://caniuse.com/mdn-api_barcodedetector) lists iOS Safari as disabled by default. It can be feature-detected as an optional optimization later; it should not be the required iPhone path.
- [MDN getUserMedia](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia): HTTPS and browser permission are required; permission denial, missing camera and hardware/constraint failures differ. A permission Promise may stay pending indefinitely if ignored. Therefore provide a close/alternative action even while permission is pending, and ensure a late stream resolution after close is released.
- Start with EAN/UPC for consumer-pack catalog lookup. A QR/Data Matrix/retailer sticker is not automatically a product GTIN. Extending decoder formats does not establish product identity or database coverage.

## Retail stickers, manufacturer codes and multiple codes

[GS1 fresh-food POS guideline](https://ref.gs1.org/guidelines/fresh-foods/) explains that many variable-measure stickers encode a 12/13-digit **Restricted Circulation Number (RCN)** containing weight or price. RCNs are not GTINs and are unique only in their defined national/company/industry environment. [GS1 RCN change notice](https://www.gs1.org/docs/barcodes/GSCN-23-006-RCN.pdf) explicitly discusses prefixes 02 and 20–29 for restricted applications and separates RCN from GTIN with AI (01).

Practical recommendations (product decisions, not GS1 guarantees):

1. Tell the user to try the manufacturer's EAN/UPC on the original package. For an overlaid shop sticker, explain that its code may work only in that shop.
2. When two codes exist, let the user target one and retry the other; keep the selected decoded string visible. Do not silently pick the first barcode across a whole package as authoritative.
3. Keep leading zeros; preserve raw decoded value and symbology as separate facts. Validate the relevant GTIN check digit/length before calling a global catalog. A valid check digit establishes only structural validity, not an existing/accurate product record.
4. Treat likely RCN/prefix patterns as an explanation and fallback cue, not a universal weight parser. Do not infer grams/price from the digits without that retailer's documented scheme.
5. A miss should say the product was not found in this catalog, then offer the nutrition-label photo and manual entry. Do not say the physical barcode is invalid merely because Open Food Facts has no match.
6. Do not infer manufacturer geography or nutrition from a GS1 prefix. Do not claim complete RU/BY coverage; no coverage measurement was performed here.

## Package photo: separate ingredients and nutrition

The official [EEC TR TS 022/2011 landing page](https://eec.eaeunion.org/comission/department/deptexreg/tr/PischevkaMarkirovka.php) links the [regulation PDF](https://eec.eaeunion.org/upload/medialibrary/9db/TrTsPishevkaMarkirovka.pdf). In the published PDF, section 4.9 distinguishes energy, protein, fat and carbohydrate quantities; values may be per **100g**, **100ml**, and/or a **portion with its quantity stated**. Nutrients use grams (or multiples/submultiples); energy uses joules/calories (or multiples/submultiples). This is a useful extraction contract, not a claim that every product has every field: the regulation contains exemptions/thresholds. Amendment/consolidated legal status was not audited.

Section 4.9(15) describes carbohydrate quantities excluding dietary fiber and including sugar alcohols. For clearly identified EAEU label values, automatically subtracting fiber again would be wrong. Preserve the project's explicit carbohydrate basis; ambiguous imported/OFF data remains unknown until resolved. Do not infer the basis solely from barcode prefix or interface language. Do not improvise a universal polyol deduction.

Recommended extraction contract:

- Ask for **the nutrition table** and, if needed, a second photo of **ingredients/name**. A single clear photo may contain both. Ingredients/composition text is not a quantitative macro table and cannot establish reliable protein/fat/carbohydrate grams.
- Return an editable draft with the evidence image visible. Separate detected name/brand/code, ingredients, nutrition values, unit, basis, serving amount, and unresolved fields. Preserve source/provenance.
- Require an explicit basis selection when 100g/100ml/portion columns are ambiguous; never select the first numerical column silently. Preserve raw text and decimal comma semantics.
- Keep kcal and kJ distinct; convert only identified units using existing deterministic calculations. Never interpret kJ as kcal.
- Keep missing numbers unknown, not zero. Missing fiber/sugar/polyols must not silently become measured zero or invented values.
- For per-portion nutrition require a quantity/unit. Do not equate ml and g without a supported density; do not equate whole-pack weight and serving weight.
- Show the reviewed product values and a separate consumed amount before the existing save/diary confirmation. A catalog or extraction result must not silently append food to the diary.

## Catalog behavior and licensing

[Open Food Facts API introduction](https://openfoodfacts.github.io/documentation/docs/Product-Opener/api/) explicitly says data is voluntarily contributed with no assurance of accuracy, completeness or reliability. [Product-by-code API](https://openfoodfacts.github.io/documentation/docs/Product-Opener/v3/products/get-api-v3-product-code/) retrieves product fields using a barcode. A successful response can still omit nutrition/basis or contain obsolete details. Compare product name/brand with the package and review nutrition before use.

Use only required response fields and reuse existing caching/rate-limit handling. Do not build search-as-you-type requests to OFF; the official guide warns against that pattern and documents endpoint rate limits. Do not upload private package photos or edits to OFF as a side effect of personal label review.

Licenses: OFF database **ODbL**, individual contents **Database Contents License**, product images **CC BY-SA** per the official API introduction and [data page](https://world.openfoodfacts.org/data). Retain source attribution/link as the app already does. Combining or redistributing a derived catalog may add license obligations; this research does not audit such distribution.

## One fitting form pattern and upstream assets

Use a **single-column staged form** in the existing panel: choose method → obtain a candidate → review label and values → save. Keep one primary action per stage and a visible change-method control. Within review, group identification, nutrition basis/values and consumed amount; use native labels and `fieldset`/`legend` for related controls. This supports the current JS/CSS stack without an extra runtime. [W3C WAI grouping guidance](https://www.w3.org/WAI/tutorials/forms/grouping/) recommends visual and semantic groups because smaller related sets are easier to understand; short legends and self-explanatory field labels matter.

- Existing [Animate UI upstream](https://github.com/imskyleen/animate-ui) is React/Vue/Motion-oriented, rather than a plain-JS drop-in. [2.4.3 changelog](https://animate-ui.com/docs/changelog) is dated 2026-11-09. Its upstream license is **MIT with Commons Clause**, not unrestricted MIT: application use is allowed; selling/redistributing the components themselves is restricted. Retain approved local motion/styling adaptation and verify the actual implementation visually. Do not run its migration CLI for this task.
- One compatible current GitHub reference, if a real new control is needed later: [Web Awesome](https://github.com/shoelace-style/webawesome), free components **MIT**, Lit-based standard web components usable with plain HTML/JS. [Input](https://webawesome.com/docs/components/input/) has visible labels/hints and standard-form integration; [radio-group](https://webawesome.com/docs/components/radio-group/) supplies shared value, keyboard navigation and validation. Its native-form-association implementation still needs target Safari verification. Use this as a pattern/source reference now; installing a second UI library is unnecessary for this repair. Do not choose archived Shoelace: its repository directs new development to Web Awesome. No Pro assets/payment needed.

## Acceptance for this phase

1. On real iPhone Safari over HTTPS: start scanner, allow camera, acquire the manufacturer's clear EAN/UPC; preview remains in-page, decoded digits visible. Screenshot and live decode receipt are required to claim device success.
2. Ignore permission, deny permission, and close while pending: alternatives remain usable; no permanent spinner; late streams are stopped after cancellation. Close/switch/background stops owned camera tracks and decoding.
3. Clear supported code → found catalog candidate → editable review; leading-zero code retained. Valid code absent from catalog → truthful miss plus label/manual path.
4. Retail RCN sticker or different code on the same pack → no invented product/weight; user can try manufacturer code or label. Code selection does not erase unrelated draft data.
5. Network timeout/503/error → bounded visible state and label/manual path; retry is user-initiated or bounded by existing policy, with no overlapping lookups.
6. Label with ingredients only → nutrition unresolved, no fabricated macros. Nutrition table with 100g and portion columns → user confirms the correct column/basis.
7. Per100ml/portion, decimal commas, kcal+kJ, missing nutrients and blurry images → preserve correct units/unknowns and request only necessary correction; never silently treat missing as zero.
8. EAEU label containing carbohydrates and fiber → no duplicate fiber subtraction. Unknown carbohydrate basis stays unresolved and uses existing safety rules.
9. Switching methods or late async results does not replace a newer candidate or lose edits. Saving still follows the existing explicit confirmation and identity/idempotency safeguards.
10. At the exact phone viewport and with keyboard open: labels, evidence image, correction fields and primary action remain readable/reachable; no horizontal page overflow or clipped controls. Native focus/keyboard and reduced-motion behavior remain supported.

These are recommended acceptance checks. They were **not executed** by this research worker. The root owns diagnosis, implementation scope and verification.
