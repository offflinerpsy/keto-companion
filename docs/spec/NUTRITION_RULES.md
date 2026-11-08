# Nutrition and deterministic rules

This document describes source arithmetic and product safeguards.
It is not a clinical protocol or an independent appraisal of every cited paper.
No new literature/network retrieval or clinical review was performed.

## Authoritative numerical code

- [keto_core.py](../../library/skills/keto-companion/scripts/keto_core.py): arithmetic, screening,
  target validation, plan construction, import and event application.
- [planning.py](../../service/planning.py): starter-v1 eligibility and target preview.
- [portion_search.py](../../service/portion_search.py): bounded individual-portion fallback.
- [kitchen.py](../../service/kitchen.py): method validation, stock, recipe/day presentation.
- [foods](../../library/skills/keto-menu/data/foods.json) and
  [recipes](../../library/skills/keto-menu/data/recipes.json): actual catalogue data.

## NUM-01 — Per-ingredient calculation

For each nutrient: `sum(edible grams × nutrient per 100 g / 100)`.
Arithmetic uses Decimal for source multiplication; returned values are rounded to six decimals.
Each ingredient's supplied state must equal the selected food record's state.
There is no automatic raw↔cooked yield or nutrient-retention correction.
Recipe portions scale by `portions / base_servings`.
Input portions are 0.05–20; factor and ingredient limits are validated separately.

Example: a two-portion batch with 200 g egg gives 100 g egg per one calculated portion.
Half one portion gives 50 g; half the whole batch gives 100 g.
The server computes these quantities; a designer must not multiply displayed numbers independently.

## NUM-02 — Missing data

A missing ingredient nutrient makes that nutrient's total `null`.
Coverage exposes known subtotal, missing ingredient IDs and completeness.
The total is not the known subtotal when any component is unknown.
Summing recipes preserves unknowns.
A source-reported numeric zero remains a numeric zero.
Micronutrient completeness is not a gate proving a nutritionally complete diet.

The verified food extension contains incomplete records; e.g. raw F173725 can lack fiber.
Kitchen may display a reference idea with missing core nutrition, with explicit unknowns.
Saving/accepting such a recipe remains gated by the final complete-nutrition checks.
Do not display null as `0 kcal`, `0 g`, a full progress ring or an empty success badge.

## NUM-03 — Carbohydrate basis

USDA-derived net estimate is total carbohydrate minus fiber when both are known.
No blanket polyol subtraction is applied.
A personal label requires explicit normalization to total-includes-fiber before catalogue insertion.
The label-review helper distinguishes available-carbohydrate labels from total-includes-fiber labels.
It does not itself create a confirmed food record.
Manual targets can select `total` or `net_estimate`.
Starter-v1 uses total carbohydrate only.
Neither basis nor 50 g/100 g product modes proves ketosis.

## NUM-04 — Screening

All 13 screening fields start unknown:
adult, pregnant, breastfeeding, type1_diabetes, sglt2, hypoglycemia_medication,
kidney_disease, liver_pancreas_gallbladder_disease, metabolic_contraindication,
eating_disorder_risk, other_clinical_restrictions, medications_reviewed, allergies_reviewed.

Minor status, pregnancy/breastfeeding, type 1 diabetes, SGLT2, metabolic contraindication
or eating-disorder risk block strict personal planning.
Hypoglycemia medicines, renal/hepatic/pancreatic/gallbladder restrictions,
other restrictions and unknown medication classification require review.
Medication names are checked against known SGLT2/hypoglycemia aliases.
`reviewed_other` without a review source remains a review condition.
A model cannot silently provide that classification/source.
Unknown allergens fail conservatively.

Completed screening means no reported flags under these rules, not medical clearance.
Literal urgent phrases can bypass model/quota and add a persistent hold.
This phrase guard is not a validated emergency classifier and may miss unlisted wording.
A new hold blocks plans and exports; the redesign must not add a dismiss-to-clear shortcut.

## NUM-05 — Baseline energy estimate

Mifflin–St Jeor simplified resting estimate:

`RMR = 10 × weight_kg + 6.25 × height_cm − 5 × age + coefficient`

Coefficient is +5 for male and −161 for female, chosen explicitly for this equation.
No selected coefficient means no automatic result.
The core equation path allows ages 19–78 and requires completed screening and activity explanation.
Maintenance estimate is rounded from unrounded RMR × explicit activity factor.
Displayed resting RMR is rounded independently; do not recompute maintenance from that rounded number.

[ENGINE01](../../library/skills/keto-evidence/references/calculation_sources.json)
links Mifflin et al. (1990), DOI `10.1093/ajcn/51.2.241`.
The activity multiplier is an additional assumption, not a term from that paper.

## NUM-06 — starter-v1 pilot scope

[planning.py](../../service/planning.py) additionally requires:

- Own processing/storage/health consent and a timezone.
- Goal maintain/loss/gain and mode starter/keto chosen explicitly.
- Activity mapping sitting 1.4, light 1.6, active 1.8.
- BMI at least 18.5 and below 35.
- For loss, BMI at least 20.
- Gain requires an individual plan; no automatic candidate.
- No active hold and no screening blocker/review/missing response.

These are product pilot boundaries, not diagnoses or universal safe thresholds.
Outside scope should explain the limitation and leave reference recipes available.

## NUM-07 — Target derivation

1. Compute maintenance `M` from the core estimate.
2. Maintain center = `M`.
3. Loss center = `M − min(300, 0.10 × M)`.
4. Energy band = center × 0.95 to center × 1.05; round to nearest 10, half up.
5. Lower product floor: female 1,200; male 1,500 kcal.
6. A below-floor lower band produces a reason and no candidate; do not clamp silently.
7. Protein: current weight × 1.2 to ×1.6 g; round lower downward/upper upward to multiples of 5.
8. Total carbohydrate maximum: starter 100 g; keto 50 g.
9. Fiber minimum: center ×14 / 1,000, rounded to whole grams, half up.
10. Saturated fat maximum: 10% energy.
11. Run existing core target validation as the final numeric boundary.

Maintenance ±10% is a UI uncertainty illustration, not a statistical confidence interval.
Targets are working estimates requiring explicit confirmation, not an automatic prescription.
A 30-day-old measurement or ≥5% weight change asks for review; no automatic adaptation occurs.
Fingerprint changes make starter targets stale without overwriting manual targets.

## NUM-08 — Manual targets

Core accepts energy 1,200–6,000 kcal, protein minimum 1–300 g and maximum 1–350 g,
carbs maximum 1–300 g, fiber 0–80 g and saturated-fat fraction 1–30%.
Lower/upper bounds must be ordered; source note and agreed timestamp are required.
The domain adds the male 1,500 kcal product floor.
Manual values retain user-edited provenance; a typed note is not verified clinician authorization.
Manual numbers do not override screening or active safety holds.

## NUM-09 — Plan checks

All ingredient IDs/states and allergy/exclusion checks run before plan construction.
Day totals must meet energy/protein ranges, carb maximum, fiber minimum and saturated-fat maximum.
Saturated-fat percentage is `900 × saturated_fat_g / energy_kcal`.
Unknown required nutrients fail the corresponding constraint.
Imported nutrient totals and accepted labels are ignored; trusted ingredients are recalculated.
Acceptance rebuilds the plan against current profile/catalogue hashes.

Primary search is deterministic-seeded heuristic selection, bounded by attempt count.
Service requests use 1,500 primary attempts and 1–7 days.
The fallback searches independent portion factors 0.65–1.65, default 2,000 attempts,
and an eight-second deadline; preview fallback uses three seconds.
It never relaxes allergies, hard exclusions or target constraints.
No result means bounded search/catalogue infeasibility, not proof no diet can exist.
Two-/three-meal settings group components by slot rather than dropping their food.

## NUM-10 — Recipe and appliance realism

Methods come from [kitchen_policy](../../service/data/kitchen_policy.json).
Candidates have 2–6 unique known ingredients, role compatibility and realistic group limits.
Total mass is capped at 1,000 g/person; per-group caps apply independently.
No-cook methods reject raw animal products requiring heat and raw mushrooms.
Poultry requires method temperature ≥74°C; eggs require ≥71°C.
Fish methods supply 63°C guidance; leftovers/reheat use 74°C.
These values are linked to FoodSafety.gov in policy; practical cooking remains untested.

Steps use only the validated ingredient list, count oil explicitly and prohibit hidden extras.
Multicooker steps require non-pressure steaming, manufacturer water volume and steam insert.
Air-fryer steps defer device setting/loading to the manual and require internal-temperature checks.
Waffle iron methods are bounded egg/cheese variants; no raw meat/fish added to batter.
Times are product estimates, not doneness guarantees.
Style/cuisine text does not establish authentic cuisine or sensory quality.

## NUM-11 — Inventory and day completeness

Known stock grams are subtracted from whole-batch ingredient need.
Unknown stock grams are treated as quantity requiring later weighing, not as measured sufficiency.
Pantry-plus limits distinct missing IDs, not shops, packages or monetary cost.
Day generation aggregates stock over all dishes and rechecks global shortages.
A three-dish day only becomes acceptable if the entire day passes current core constraints.
Viewing/save/diary actions do not implement automatic stock depletion.
SA07-03 identifies an accepted-plan shopping mismatch for multi-serving kitchen state.

## NUM-12 — Diary and remaining budgets

Daily totals use confirmed recipe IDs and explicit portions in the confirmed profile timezone.
Unquantified entries are counted separately; absence of entries is not zero food intake.
SA07-01: `kitchen_card` currently filters those entries out before its remaining-carb calculation,
so the displayed remaining allowance can appear fully known despite incomplete intake.
Design should retain qualified language and must not strengthen that estimate into advice.

## Included reference roles and limits

| Registry/source | Role in implementation | Limit |
| --- | --- | --- |
| ENGINE01 | Resting-energy equation | Not an activity/deficit prescription |
| S_ENERGY | PAL context | Hall dynamic model is not implemented |
| START_PROTEIN | 1.2–1.6 g/kg review context | Population/adherence limits; maintenance carryover is policy |
| START_ENERGY_2013 | Historical energy ranges | Not proof of current 2026 guideline or the product's 10% rule |
| START_USDA_DRI | Individual requirements context | Product does not implement DRI calculator |
| S11 | Nutrition behavior reference | Not individualized diabetes treatment authorization |
| S_USDA | FoodData Central values | Provider rounding and missing data remain |
| S_NET | Carbohydrate interpretation | No automatic polyol subtraction |
| COOK_FSC | Internal cooking temperatures | No appliance or kitchen validation |

[Starter sources](../../service/data/starter_policy_sources.json) explicitly separate product assumptions.
[Evidence registry](../../library/skills/keto-evidence/references/sources.json) separates included,
correction-pending, integrity-control and excluded-retracted records.
S18 is excluded/retracted; it must never support a benefit claim.

## Remaining scientific and practical unknowns

Clinical suitability, medicine interactions beyond conservative screening,
long-term adherence, cooking yield/retention, household appliance performance,
actual food-label identity, calorie accuracy for an individual and full micronutrient adequacy
are not established by passing software tests.
A clinical reviewer would need a separate evidence appraisal and actual user context.
Do not change safeguards or formulas to force an attractive menu or passing visual demo.
