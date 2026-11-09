# KETO 0.7.1 — design, images and bounded development

Private family staging: https://keto-companion-saas-staging.offflinerpsy.workers.dev/ . This is not a public app-store release or medical service.

## Everyday navigation and appearance

This guide describes the implemented C10–C13 interface. Check [CURRENT_STATUS.json](../CURRENT_STATUS.json) for the deployed revision and C14 acceptance; the guide does not establish a completed release. The [approved product plan](../design/PRODUCT_DELIVERY_2026_11_09.md) supersedes the earlier visual direction.

The bottom tabs are **Chat / Diary / Recipes / Products**. **Profile and settings** opens from the header; **My menu** is inside Recipes. The interface uses system fonts, a 17px normal body size, neutral surfaces and a blue accent. Large text and dark appearance remain separate preferences.

Recipes, own dishes and products use **Записать съеденное → amount and basis → eating date/time → Проверить запись → Добавить в дневник**. Confirmation opens Diary with the saved entry and the selected day’s totals. **Исправить** edits that entry; **Повторить** prepares a new one for confirmation. Saving a recipe, planning a meal and adding stock are separate actions. Unknown nutrients remain unknown.

In Products, choose name search, camera barcode scanning, a typed barcode, a label photo or manual entry; review the facts and missing values, then confirm saving and choose how to use the product. Camera barcode scanning and label-photo reading are separate methods. Chat’s contextual actions open the relevant existing flow. Pending confirmations remain available from the header; closing a review dialog does not cancel the pending change, while **Отмена** cancels it.

## Chat images

Paste a copied image, drag/drop an image file or use the picker. Preview/remove and image-only drafts share one attachment controller; sending remains explicit. One image per message. A normal page/private social URL is not an automatically visible image. The explicit URL loader supports only the three documented public image hosts: images.unsplash.com, images.pexels.com and upload.wikimedia.org. Other sources require an authorized image/text upload. Exact food weights/nutrients cannot be confirmed from appearance.

## Owner developer pilot

Choose Development from the owner's chat mode selector or **Profile → Development**. The mode starts disabled. Enable for one hour, provide a technical-only task, review its exact text, then explicitly approve one Sol-high call. No diary, photo, source attachment or nutrition conversation is copied into that request. The attestation is not an automatic personal-data classifier.

Only app.css, help.html and developer-extension.js may change. Three reserved generations per day; one active job; server-side expiry/cancellation. The candidate gets no user data, deployment tokens, internet, editable protected tests or backend/nutrition authority. Test runs in a separate Cloudflare Container with fixed trusted commands. Passing results unlock private preview and diff export only.

There is **no automatic production publication endpoint**. A tested patch still requires the normal reviewed GitHub/Cloudflare release. The ordinary full source gate runs in Cloudflare Builds, not GitHub Actions. Runtime source/image pins and fresh real-container acceptance are required; documentation-only changes do not rebuild the runtime.

## Evidence boundary

See [current status](../CURRENT_STATUS.json) for the applicable acceptance evidence. The [earlier release receipt](../evidence/CF_DEV_MEDIA_08_RELEASE_RECEIPT.json) is historical. Native source tests, real isolated candidate acceptance, previous real-model synthetic calls and actual compiled-client browser tests are distinct. Complete owner browser execution, physical iPhone/Safari and clinical/kitchen-trial acceptance are not claimed.
