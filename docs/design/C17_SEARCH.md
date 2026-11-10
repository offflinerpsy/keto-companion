# C17: food and recipe search

Owner feedback: `сыр` selected raw meat and fish, the portion selector exposed only five cheeses, and `Яйцо` showed nine recipes. Device: iPhone 17 Pro, Chrome, 402 CSS px reference viewport. This document describes source behavior; the release receipt establishes deployment separately.

## Search contract

`service/food_search.py` is the shared deterministic vocabulary for prepared and personal products, pantry lookup, the USDA reference and recipe search. It normalizes Unicode/case/ё, matches complete known food words and explicit Russian/English word families, and retains every required term. It has no paid provider or cache of private queries or food names.

`сыр` means cheese and its named varieties. `сырой` means raw food. A visible alternative lets a person switch those meanings without an interrupting question. Known words never fall back to arbitrary substrings. An unknown final word of at least three letters can match a prefix; ambiguous short exclusions produce an actionable error. Specific compound ingredients must occur together in the same ingredient field.

Recipe exclusions examine actual ingredient names, while existing allergy/settings checks remain authoritative. Product qualifiers such as `без соли` require explicit wording in the name; missing metadata is not evidence of absence. `Без добавленного сахара` and `без сахара` remain distinct. Search is not an allergy certificate or a nutrient inference.

The original USDA reference contains 7,793 records, including the 85 prepared foods. The additional 7,708 candidates remain a separate reviewed reference. Search ranks primary cheese records ahead of dishes and derivative products. Existing unofficial Russian labels are retained; untranslated records keep their original English names. This is the pinned historical SR Legacy reference, not a live brand catalogue.

## Selection and confirmation

Portion and own-dish screens share `food-picker.js`. Prepared choices use readable button rows, eight per page; the broader reference is visible directly below. Search never automatically chooses the first result. Changing a query keeps the previously chosen product and grams until another choice is made.

A reference record opens its source, original name and known/unknown nutrients. State, allergens and explicit review must be supplied before preparing the existing `source_import` proposal. Only its matching confirmed receipt selects the new personal product. Import alone never writes intake. Existing account scope, release hash, CAS, deduplication and `recipe_eligible=false` boundaries remain unchanged.

Query/account tokens reject late results. Cancelling a review also rejects its late proposal response. Enter in a review input cannot submit the enclosing own-dish form; action buttons retain native keyboard behavior. Re-entering a page keeps a search draft without issuing a redundant pantry search.

## Recipe expansion

The canonical library grows from 72 to 108 recipes: 36 original editorial additions using 47 existing food IDs and 178 ingredient rows. Actual egg-containing recipes grow from nine to 24. IDs: B17–B24, M33–M48, G13–G18, S13–S18. No original recipe or food nutrient record changes. The distinct legacy plugin catalogue is not overwritten.

Each addition declares edible grams, exact ingredient state, servings, time estimates, water and cooking steps. Canonical calculations establish core nutrient totals and allergens. Unknown micronutrients remain unknown. There are no duplicated ingredient sets in the added batch or against the original batch. All additions remain `kitchen_tested=false` and `clinical_validated=false`; appearance, taste and appliance timings have not been kitchen tested.

The first 72 recipe objects retain normalized SHA-256 `18aeac293471803e679537e42498b27da563739906764726b43f6d1bc78ba0d0`. `foods.json` retains byte SHA-256 `8b881cfbcfb553c5cf84a932e078799c9d0ba53d5a16efda5028fed074ad0fe9`.

Editorial reference methods: [USDA documentation](https://fdc.nal.usda.gov/data-documentation/), [FoodSafety.gov temperature chart](https://www.foodsafety.gov/food-safety-charts/safe-minimum-internal-temperatures), and [Dash chaffle method](https://bydash.com/blogs/recipes/the-chaffle). The existing recipe source ID `S_FOODSAFE` continues to point to FDA Safe Food Handling in `sources.json`; it is not reassigned to FoodSafety.gov. Recipes use original weights and instructions, not copied published recipes.

## Acceptance

Regressions cover cheese/raw separation, word forms, all required terms, negative ingredients, product qualifiers, owner scope, wide-reference cursor binding, unchanged nutrients and complete 108-recipe pagination. Real HTTP/SQLite browser scenarios cover selection, reviewed import, confirmation, 75 g intake, own-dish reuse, keyboard behavior, stale responses and 360–430 px layout in Chromium/WebKit.

Synthetic browser checks do not establish physical iPhone keyboard/browser-chrome behavior, fresh family sign-in, live family data writes or cooking/clinical validation. The existing native Cloudflare acceptance and exact Azure source adoption remain required before deployment.
