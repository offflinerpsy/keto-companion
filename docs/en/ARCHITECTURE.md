# Architecture

A Cloudflare Worker serves the website and API. D1 stores membership, invitations, sessions, consent, nutrition state, jobs, usage and source provenance. Private R2 holds uploads. Google/Firebase verifies identity; authentication alone does not grant membership.

The server derives the subject from a validated session. The browser cannot select an arbitrary subject or role. Data is owner-scoped. Invitations expire, bind to an email address, and require explicit acceptance; link previews do not consume them.

Deterministic calculations and Azure Terra are reached through a narrow HMAC-authenticated `/internal/keto/compute` bridge. New SaaS profiles are processed in Python memory; durable personal state remains in Cloudflare. Azure Blob holds bounded replay-protection metadata only for this bridge. The existing 0.2.1 Azure client retains its legacy storage mode; no silent migration occurs.

The Worker reserves an idempotent job and quota before paid inference. Before persistence it rechecks membership, session, consent and revision. A completed request ID must not cause another model call. Unknown timeout outcomes are not represented as successful writes.

The model interprets intent and explains results. Code calculates numbers and enforces state changes and restrictions. Allowlisted preferences can be proposed, previewed and confirmed; arbitrary code rewriting, medication changes and clinical-rule mutation are not supported.

Version boundaries: data 0.1.1, private plugin 0.2.1, SaaS source 0.3.0. Pinned artifacts and SHA-256 digests are in `artifacts/files_manifest.json`.
