# Minimal model contracts

Existing IDs/state/revisions remain authoritative. New fields optional for old documents. FoodCandidate carries source identity/URL/time, barcode if known, human name/brand/preparation, per100g or serving basis, nullable nutrient values, label carbohydrate basis, ingredients/allergen review and unresolved fields. Confirmation transforms a validated candidate into an owned personal food/pantry event; never auto-save model output.

GI observation carries numeric value only with cited source and matching preparation; status is sourced/unknown/not-applicable-with-evidence. No missing→zero conversion. GL uses compatible known available carbohydrate and sourced GI; otherwise incomplete. A measurement carries explicit type, unit, timestamp, value and optional context. Do not infer measured ketosis from food. Shared shopping servings and personal consumption fractions remain distinct.

Unknown pantry mass remains nullable and prevents precise shortage claims. Imported foods remain unclassified for audited recipe methods until validated mapping; a barcode alone does not make a food recipe-safe.

An explicitly user-authored composition may use confirmed personal foods for observational arithmetic and factual intake. Store it in the existing personal recipe collection with `usage: observational`; omitted usage retains legacy behavior. Validate identity, stated edible grams and exact preparation state. Return known subtotals and per-field coverage even when plan eligibility is absent. `check_recipe` and exact-plan/generated-method admission reject observational compositions and unmapped ingredients. Calculation or diary confirmation does not approve a cooking method, diagnose ketosis or remove a safety hold.

Measurements form an optional collection separate from food diary records. A paired blood glucose/BHB session has one explicitly confirmed measurement time; GKI uses only that pair. Glucose mg/dL converts to mmol/L by division by 18.016 (Meidenbauer et al., 2015, DOI 10.1186/s12986-015-0009-2). Keep original units and values. No automatic pairing of unrelated latest readings or therapeutic thresholds.
