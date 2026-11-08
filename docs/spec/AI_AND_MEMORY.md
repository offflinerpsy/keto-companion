# AI, budgets and memory

> Current specification: **0.6.2-audit-pilot**, reconciled with runtime commit `e3f648d5313b68202336cda775ff7279556a2569`. The independent review examined 0.6.1; SA07-01…04 are historical findings corrected in 0.6.2. Read [current corrections](CURRENT_CORRECTIONS.md) for exact source, regression evidence and remaining acceptance gates.

## Model routes found in source

| Role | Configuration/default | Work | Bounds |
| --- | --- | --- | --- |
| Intent/chat | `AZURE_OPENAI_DEPLOYMENT`, default `keto-terra-61` | Structured intent, text and proposed values | low reasoning; 1,200 output tokens; no provider store |
| Recipe design | `KETO_RECIPE_DEPLOYMENT=gpt-6.1-sol` and `KETO_RECIPE_REASONING=high` | Known ingredient IDs/grams and allowed method | Exactly Sol/high; 3,500–5,000 output tokens, default 5,000 |
| Dictation | `AZURE_TRANSCRIBE_DEPLOYMENT`, default `gpt-transcribe` | Russian audio → editable transcript | 60 s, 1 MB input, bounded response |
| Deterministic tools | No model | Formula, nutrient arithmetic, catalogue, proposals, summaries, exports | Server validations and size/deadline bounds |

Sources: [brain](../../service/brain.py), [recipe designer](../../service/recipe_brain.py),
[speech](../../service/speech.py), [kitchen](../../service/kitchen.py).
Deployment names are configured routes, not independent proof of provider model identity or billing.
No real provider calls were made in this review.

## Cost admission and timeout layers

- Worker paid admission: fewer than 30 requests/member/UTC day and 500 globally/UTC day.
- Service conversational/kitchen allowance: `KETO_DAILY_REQUEST_LIMIT`, default 60 calls/day.
- Legacy service audio allowance: 30 paid attempts/day; SaaS transcription uses Worker admission.
- A normal chat may make one Terra call and one Sol recipe call; one HTTP request is not one invoice line.
- Explicit kitchen phrases may use the local dispatcher and skip Terra.
- Recipe output is capped; permitted timeout is at most 45 seconds at the designer.
- Policy supplies 40 seconds to recipe design; intent→recipe path subtracts elapsed time from 50 seconds.
- Worker bridge fetch uses 55 seconds; state lock uses 180 seconds.
- Recipe response stream is capped at 150,000 bytes and checked against a bounded deadline.
- Transcription uses 45-second HTTP timeout/connect 8 seconds and 64,000-byte response cap.
- Silence/invalid audio can be rejected before a paid call.

A timeout or failed response is not a zero-cost assertion.
Calls are reserved before possible provider work and uncertain effects are not automatically retried.
SA07-02 correction: all potentially paid chat requests reserve member/global quota before dispatch, regardless of words such as “рассчитай”. Verified no-model results refund that reservation. Dedicated deterministic guidance operations remain model-free. Both request-admission and service-side limits still apply.

## Data sent to the model

Intent context includes screening status/holds, allowlisted UI/settings,
confirmed allergies/goal, known food IDs/names, current-topic choices,
up to eight recent messages truncated to 700 characters each, kitchen facts,
selected own historical quotes and retrieved guidance references.
An attached personal source becomes `untrusted_source` provenance/text.
A chat image is a low-detail input after sanitation; it does not supply confirmed grams.

Recipe context includes at most 40 allowed foods with state, allergens and selected nutrients,
permitted methods/roles, the request spec, confirmed targets/exclusions,
recent accepted recipes and confirmed diary references, bounded own quotes and sources.
The model output schema does not accept steps, nutrient totals, code or arbitrary tools.
Server steps and all arithmetic are derived after validation.

Do not copy complete hidden system prompts into handoffs, public docs or screenshots.
Describe constraints and configuration; source remains the implementation authority.

## Prompt injection boundary

User text, historical quotes, photos and pasted sources are data, not system authority.
The model has no direct write/network/code capability in the domain service.
JSON shape checks do not replace semantic validation.
Kitchen validates ingredient IDs, role assignment, equipment, title, servings,
food state, grams, inventory, exclusions and temperature rules independently.
External source discussion cannot become onboarding/preferences/diary/feature writes
through those detected intents when no safety signal is present.
Safety signals can conservatively pause planning; they are not a clinical diagnosis.

The source boundary is not proof that all prompt injection is impossible.
Tests cover selected malicious fixtures; ordinary nonempty source content must also reach context.
Selected recipe drafts and cached responses can contain personal text; treat them as private.

## Canonical memory

Confirmed profile/allergies/targets/settings and kitchen preferences have durable authority.
Temporary `avoid` IDs in a request are not automatically shared dislikes.
`remember` requires an explicit request and proposal confirmation.
Preference rows track owned dislike IDs so forgetting can preserve unrelated exclusions.
The memory page also shows legacy dislikes and favorite recipes with editable controls.
Older facts may lack origin time; the UI must say the date is unknown rather than invent one.

## Conversational memory

| Store/context | Bound | Meaning |
| --- | --- | --- |
| Topics | 12 | Personal named conversations |
| Messages/topic | 60 | Rolling retained history |
| All topic message JSON | 200,000 bytes | Oldest message pairs removed first |
| Intent recent context | 8 messages × max 700 chars | Current-topic, filtered after fact changes |
| Own quote recall | 5 × max 500 chars | Lexical matches, explicitly untrusted historical quotes |
| Accepted recipe quote scan | Last 10 | Current existing topics only |
| Public guidance retrieval | At most 3 | Included, allowlisted local metadata rows |

Recall excludes selected preference/medical phrases and facts older than `facts_changed_at`.
These are conservative lexical rules, not a semantic privacy or clinical classifier.
Cross-topic retrieval is deliberate for the same owner; it is not cross-user retrieval.
Current-topic selection remains separate from quote recall.

## Guidance retrieval

[Source registry](../../library/skills/keto-evidence/references/sources.json)
is a checked-in corpus of references/metadata.
[Kitchen retrieval](../../service/kitchen.py) ranks lexical word stems and returns title/URL/source ID.
It does not download full papers, run vector search or read closed social content.
Only `included` rows with a URL and a kitchen allowlist entry qualify.
Retracted S18 and correction/integrity records are not used as positive support.
The static knowledge page separately packages explanations and included references through `knowledge.cjs`.
A listed reference is not proof that a new user-supplied page was studied.

## Forgetting actions

1. **Forget a preference**: confirm the selected canonical fact; remove owned dislike IDs,
   invalidate drafts/request responses and suppress older relevant context.
2. **Clear a topic**: remove messages/choices and linked caches; retain shared profile/preferences.
3. **Delete a topic**: same private-topic cleanup; the main topic can only be cleared.
4. **Revoke consent**: stop new processing/records; retain old diary pending explicit deletion.
5. **Delete personal data**: revoke sessions then continue bounded D1/R2 cleanup with receipt.

Forgetting a topic does not claim to retract previously shared PDFs or calendar events.
`store:false` on model requests does not establish the provider's entire retention policy.
The review did not inspect provider logs or enterprise data terms.
