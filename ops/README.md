# Trusted release operations

These operator-reviewed release helpers never enter the candidate coding sandbox and are not model-editable. The normal Cloudflare full synthetic gate remains mandatory. `promote_existing_runtime.mjs` reuses only an explicitly pinned, actually tested image when its exact source baseline, live Worker bindings and bounded Container application all match. It runs actual isolated Container acceptance again before main-app deployment. It never builds/replaces an image, changes quotas, disables a test, invokes a model, reads nutrition records or grants a new permission.

A changed runtime source baseline intentionally stops promotion with `NEW_BASELINE_REQUIRES_REVIEWED_IMAGE_RELEASE`; use the separately reviewed native image build/rollout procedure and update this pin only after its acceptance. Documentation and receipts must not trigger an unnecessary rebuild of the same accepted immutable image. Candidate patch previews do not publish themselves.

The historical full-image release failure1607 was caused by missing Worker container-class metadata and is fixed. One first-container acceptance failed with a wrapper-hidden reason; exact-cause remains unverified. A separate native diagnostic of the same immutable image passed all4fixed stages without any code change. No automatic repeated retry loop is added.

## Explicit source correction rollout

The first actual deployed-client check found an unused overview render hook. Correcting it changes the protected source baseline. The native image release now supports an explicit `KETO_APPROVED_ROLLOUT=1` only when the current application ID/image match the owner-reviewed pin and every prior instance is inactive. It changes only image configuration through the supported rollout API, then updates the service Worker and executes actual acceptance. Ordinary pinned promotion remains the default after the new image is accepted; missing/mismatched pins fail closed.
