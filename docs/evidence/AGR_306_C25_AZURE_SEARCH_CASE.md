# AGR-306 C25: Azure sourced recipe search remains unaccepted

Status: reproducible provider-filter outcome captured; safe failure handling released separately. This is a prepared support case, not a submitted message.

## Observed request

- Existing Azure account: offflinerpsy-4097-resource; resource group rg-offflinerpsy-6588; location SwedenCentral.
- Existing deployment: gpt-6.1-sol; model version 2026-09-29; reasoning high. Assigned RAI policy: Microsoft.DefaultV2.
- Public query: «сыр» (cheese). No profile, diary, health information or private user documents were supplied.
- Endpoint family: Azure OpenAI Responses API, web_search with strict JSON recipe extraction.
- One deliberately authorized diagnostic request around 2026-11-11 15:32:41 UTC; duration 10.386 seconds. No retry.
- Actual result: HTTP 200; provider status incomplete; incomplete_details.reason content_filter.
- Reported usage: 4755 input tokens, 60 output tokens, 3 web-search requests.
- Detailed moderation categories, provider error code and provider response ID were not retained and are UNKNOWN.

## Separate prior observation

The ordinary hosted app query «сыр» at 15:23:03 UTC ended with a handled failure at 15:23:53 UTC. Its exact request ID is f014bdcdebbf41d4acdc7fa0b303dc9e. The old adapter discarded its cause. It must not be retroactively described as the same content-filter event or as a proven timeout.

## Implemented correction

The adapter now preserves allowlisted failure stage, code, HTTP status, latency, known usage and incomplete reason. The application shows an explicit terminal filter message, retains the failure for normal account-scoped reading, and does not replay the request automatically. Model, provider, high reasoning, payload, timeout, quotas, consent boundaries and filtering policy were preserved.

The exact RAI policy resource read returned 404; filter thresholds/modes were not obtained. This does not establish that filtering is absent or that the observed rejection was a false positive. No filters or security controls were weakened.

## Question for the service owner/support

Determine which documented moderation category or processing stage produced incomplete/content_filter for this ordinary public recipe query, and whether there is a service incident or supported integration correction that preserves the existing protection policy. No action to bypass the refusal is proposed.

## Acceptance still required

A real, ordinary ingredient-only query in the hosted app must return attributable source recipes and support review/calculation/save/intake. Source and container checks alone do not meet this criterion. Exact failure evidence: AGR_306_C25_DISCOVERY_FAILURE.json. Hosted regional product search was accepted separately in AGR_306_C25_LIVE_UI.json.
