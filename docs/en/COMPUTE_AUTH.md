# Cloudflare to Azure compute

The staging Worker signs the existing method/path/timestamp/nonce/body-digest envelope with a dedicated Ed25519 key held only in a Cloudflare secret binding. Azure stores the corresponding public JWK, not the private signing key. It checks freshness, signature, operation allowlist and durable one-time nonce before computing in memory. HMAC remains an explicit mutually exclusive compatibility mode, not a client-negotiated downgrade. Personal state is returned to Cloudflare D1; Azure replay records contain only nonce hashes and expiration times.

Private keys must never be printed, committed, exported in reports or delivered to the browser. Tests use ephemeral synthetic keys. Real Google user sign-in is a separate acceptance gate; a seeded synthetic staging session does not prove Google login.
