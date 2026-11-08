# Exact static UI contract inventory

Extracted from [index.html](../../cloudflare-saas/public/index.html).
This is static markup, not a DOM snapshot. Setup moves consent/onboarding/energy fields.
Dynamic kitchen IDs and callback contracts are described in the bilingual design handoff.
Line anchors refer to the compact maintained source at the reviewed baseline.

| Surface | Element/selector | Form/input contract | Source |
| --- | --- | --- | --- |
| shell | `meta[name=viewport]` | name=viewport | [L1](../../cloudflare-saas/public/index.html#L1) |
| shell | `meta[name=color-scheme]` | name=color-scheme | [L1](../../cloudflare-saas/public/index.html#L1) |
| shell | `meta[name=theme-color]` | name=theme-color | [L1](../../cloudflare-saas/public/index.html#L1) |
| shell | `div#app` |  | [L3](../../cloudflare-saas/public/index.html#L3) |
| shell | `header[data-testid=app-header]` | data-testid=app-header | [L3](../../cloudflare-saas/public/index.html#L3) |
| shell | `button#nav-back` | data-testid=nav-back | [L3](../../cloudflare-saas/public/index.html#L3) |
| shell | `span#connection` |  | [L3](../../cloudflare-saas/public/index.html#L3) |
| shell | `button#help` |  | [L3](../../cloudflare-saas/public/index.html#L3) |
| shell | `button#refresh` |  | [L3](../../cloudflare-saas/public/index.html#L3) |
| shell | `section#login` |  | [L4](../../cloudflare-saas/public/index.html#L4) |
| shell | `button#cf-login` |  | [L4](../../cloudflare-saas/public/index.html#L4) |
| shell | `div#cf-claim` |  | [L4](../../cloudflare-saas/public/index.html#L4) |
| shell | `button#cf-claim-button` |  | [L4](../../cloudflare-saas/public/index.html#L4) |
| shell | `button#cf-switch` |  | [L4](../../cloudflare-saas/public/index.html#L4) |
| shell | `p#cf-login-message` |  | [L4](../../cloudflare-saas/public/index.html#L4) |
| shell | `div#deletion-recovery` |  | [L4](../../cloudflare-saas/public/index.html#L4) |
| shell | `input#deletion-code` |  | [L4](../../cloudflare-saas/public/index.html#L4) |
| shell | `button#continue-deletion` |  | [L4](../../cloudflare-saas/public/index.html#L4) |
| shell | `p#deletion-status` |  | [L4](../../cloudflare-saas/public/index.html#L4) |
| shell | `div#workspace` |  | [L5](../../cloudflare-saas/public/index.html#L5) |
| shell | `nav#nav` | data-testid=bottom-nav | [L5](../../cloudflare-saas/public/index.html#L5) |
| shell | `button[data-view=chat]` | data-view=chat | [L5](../../cloudflare-saas/public/index.html#L5) |
| shell | `button[data-view=today]` | data-view=today | [L5](../../cloudflare-saas/public/index.html#L5) |
| shell | `button[data-view=diary]` | data-view=diary | [L5](../../cloudflare-saas/public/index.html#L5) |
| shell | `button[data-view=more]` | data-view=more | [L5](../../cloudflare-saas/public/index.html#L5) |
| shell | `div#demo-banner` |  | [L5](../../cloudflare-saas/public/index.html#L5) |
| shell | `main#content` |  | [L5](../../cloudflare-saas/public/index.html#L5) |
| shell | `section#consent-panel` |  | [L6](../../cloudflare-saas/public/index.html#L6) |
| shell | `form#consent-form` |  | [L6](../../cloudflare-saas/public/index.html#L6) |
| shell | `input#c-processing` | type=checkbox; required=True | [L6](../../cloudflare-saas/public/index.html#L6) |
| shell | `input#c-storage` | type=checkbox; required=True | [L6](../../cloudflare-saas/public/index.html#L6) |
| shell | `input#c-health` | type=checkbox; required=True | [L6](../../cloudflare-saas/public/index.html#L6) |
| shell | `div#toast` |  | [L7](../../cloudflare-saas/public/index.html#L7) |
| shell | `div#holds` |  | [L7](../../cloudflare-saas/public/index.html#L7) |
| shell | `div#proposals` |  | [L7](../../cloudflare-saas/public/index.html#L7) |
| chat | `section[data-page=chat]` | data-page=chat | [L8](../../cloudflare-saas/public/index.html#L8) |
| chat | `button[data-testid=recipes-shortcut]` | type=button; data-view=recipes; data-testid=recipes-shortcut | [L8](../../cloudflare-saas/public/index.html#L8) |
| chat | `select#topic-picker` | data-testid=topic-picker | [L8](../../cloudflare-saas/public/index.html#L8) |
| chat | `button#topic-new` |  | [L8](../../cloudflare-saas/public/index.html#L8) |
| chat | `button#topic-edit` |  | [L8](../../cloudflare-saas/public/index.html#L8) |
| chat | `div[data-testid=chat-scroll]` | data-testid=chat-scroll | [L8](../../cloudflare-saas/public/index.html#L8) |
| chat | `div#messages` |  | [L8](../../cloudflare-saas/public/index.html#L8) |
| chat | `div#chat-extras` |  | [L8](../../cloudflare-saas/public/index.html#L8) |
| chat | `div#chat-confirmations` |  | [L8](../../cloudflare-saas/public/index.html#L8) |
| chat | `div#suggestions` |  | [L8](../../cloudflare-saas/public/index.html#L8) |
| chat | `form#chat-form` | data-testid=chat-composer | [L8](../../cloudflare-saas/public/index.html#L8) |
| chat | `div#photo-preview` | data-testid=photo-preview | [L8](../../cloudflare-saas/public/index.html#L8) |
| chat | `img#photo-preview-image` |  | [L8](../../cloudflare-saas/public/index.html#L8) |
| chat | `button#photo-remove` | type=button | [L8](../../cloudflare-saas/public/index.html#L8) |
| chat | `textarea#message` | maxlength=6000; required=True | [L8](../../cloudflare-saas/public/index.html#L8) |
| chat | `p#photo-status` |  | [L8](../../cloudflare-saas/public/index.html#L8) |
| chat | `input#photo` | type=file; accept=image/* | [L8](../../cloudflare-saas/public/index.html#L8) |
| chat | `button#mic-button` | data-testid=mic-button; type=button | [L8](../../cloudflare-saas/public/index.html#L8) |
| chat | `button#send` | type=submit | [L8](../../cloudflare-saas/public/index.html#L8) |
| chat | `div#voice-controls` |  | [L8](../../cloudflare-saas/public/index.html#L8) |
| chat | `span#voice-timer` |  | [L8](../../cloudflare-saas/public/index.html#L8) |
| chat | `button#voice-stop` | type=button | [L8](../../cloudflare-saas/public/index.html#L8) |
| chat | `button#voice-cancel` | type=button | [L8](../../cloudflare-saas/public/index.html#L8) |
| chat | `p#voice-status` |  | [L8](../../cloudflare-saas/public/index.html#L8) |
| chat | `p#composer-help` |  | [L8](../../cloudflare-saas/public/index.html#L8) |
| chat | `span#state-summary` |  | [L8](../../cloudflare-saas/public/index.html#L8) |
| chat | `button#onboard-open` | type=button | [L8](../../cloudflare-saas/public/index.html#L8) |
| setup | `section[data-page=setup]` | data-page=setup | [L9](../../cloudflare-saas/public/index.html#L9) |
| setup | `nav#setup-progress` | data-testid=setup-progress | [L9](../../cloudflare-saas/public/index.html#L9) |
| setup | `p#setup-stage` | data-testid=setup-stage | [L9](../../cloudflare-saas/public/index.html#L9) |
| setup | `button[data-view=recipes]` | data-view=recipes | [L9](../../cloudflare-saas/public/index.html#L9) |
| setup | `button[data-view=knowledge]` | data-view=knowledge | [L9](../../cloudflare-saas/public/index.html#L9) |
| setup | `div#setup-consent-slot` |  | [L9](../../cloudflare-saas/public/index.html#L9) |
| setup | `div#setup-about` |  | [L9](../../cloudflare-saas/public/index.html#L9) |
| setup | `form#baseline-form` | data-testid=baseline-form | [L9](../../cloudflare-saas/public/index.html#L9) |
| setup | `input#baseline-name` | maxlength=80 | [L9](../../cloudflare-saas/public/index.html#L9) |
| setup | `input#baseline-zone` | required=True | [L9](../../cloudflare-saas/public/index.html#L9) |
| setup | `input#baseline-age` | required=True | [L9](../../cloudflare-saas/public/index.html#L9) |
| setup | `input#baseline-height` | required=True | [L9](../../cloudflare-saas/public/index.html#L9) |
| setup | `input#baseline-weight` | required=True | [L9](../../cloudflare-saas/public/index.html#L9) |
| setup | `input#baseline-measured` | type=date; required=True | [L9](../../cloudflare-saas/public/index.html#L9) |
| setup | `p#baseline-weight-help` |  | [L9](../../cloudflare-saas/public/index.html#L9) |
| setup | `div#baseline-weight-slider` |  | [L9](../../cloudflare-saas/public/index.html#L9) |
| setup | `select#baseline-category` | required=True | [L9](../../cloudflare-saas/public/index.html#L9) |
| setup | `div#activity-choices` |  | [L9](../../cloudflare-saas/public/index.html#L9) |
| setup | `input[name=activity]` | type=radio; name=activity; value=sitting | [L9](../../cloudflare-saas/public/index.html#L9) |
| setup | `input[name=activity]` | type=radio; name=activity; value=light | [L9](../../cloudflare-saas/public/index.html#L9) |
| setup | `input[name=activity]` | type=radio; name=activity; value=active | [L9](../../cloudflare-saas/public/index.html#L9) |
| setup | `input[name=planning-goal]` | type=radio; name=planning-goal; value=maintain | [L9](../../cloudflare-saas/public/index.html#L9) |
| setup | `input[name=planning-goal]` | type=radio; name=planning-goal; value=loss | [L9](../../cloudflare-saas/public/index.html#L9) |
| setup | `input[name=planning-goal]` | type=radio; name=planning-goal; value=gain | [L9](../../cloudflare-saas/public/index.html#L9) |
| setup | `input[name=planning-mode]` | type=radio; name=planning-mode; value=starter | [L9](../../cloudflare-saas/public/index.html#L9) |
| setup | `input[name=planning-mode]` | type=radio; name=planning-mode; value=keto | [L9](../../cloudflare-saas/public/index.html#L9) |
| setup | `div#setup-restrictions-slot` |  | [L9](../../cloudflare-saas/public/index.html#L9) |
| setup | `div#setup-targets` |  | [L9](../../cloudflare-saas/public/index.html#L9) |
| setup | `button[data-view=targets]` | data-view=targets | [L9](../../cloudflare-saas/public/index.html#L9) |
| setup | `button[data-view=knowledge]` | data-view=knowledge | [L9](../../cloudflare-saas/public/index.html#L9) |
| setup | `div#setup-confirmations` |  | [L9](../../cloudflare-saas/public/index.html#L9) |
| targets | `section[data-page=targets]` | data-page=targets | [L9](../../cloudflare-saas/public/index.html#L9) |
| targets | `div#saved-targets` |  | [L9](../../cloudflare-saas/public/index.html#L9) |
| targets | `button#calculate-guidance` |  | [L9](../../cloudflare-saas/public/index.html#L9) |
| targets | `button[data-view=setup-about]` | data-view=setup-about | [L9](../../cloudflare-saas/public/index.html#L9) |
| targets | `button[data-view=knowledge]` | data-view=knowledge | [L9](../../cloudflare-saas/public/index.html#L9) |
| targets | `div#target-preview` | data-testid=target-preview | [L9](../../cloudflare-saas/public/index.html#L9) |
| targets | `button#apply-targets` | data-testid=apply-targets | [L9](../../cloudflare-saas/public/index.html#L9) |
| targets | `div#target-confirmations` |  | [L9](../../cloudflare-saas/public/index.html#L9) |
| targets | `details#manual-targets` |  | [L9](../../cloudflare-saas/public/index.html#L9) |
| targets | `form#targets-form` |  | [L9](../../cloudflare-saas/public/index.html#L9) |
| targets | `input[name=energy_min_kcal]` | name=energy_min_kcal; type=number; min=1200; max=6000; required=True | [L9](../../cloudflare-saas/public/index.html#L9) |
| targets | `input[name=energy_max_kcal]` | name=energy_max_kcal; type=number; min=1200; max=6000; required=True | [L9](../../cloudflare-saas/public/index.html#L9) |
| targets | `input[name=protein_min_g]` | name=protein_min_g; type=number; min=1; max=300; required=True | [L9](../../cloudflare-saas/public/index.html#L9) |
| targets | `input[name=protein_max_g]` | name=protein_max_g; type=number; min=1; max=350; required=True | [L9](../../cloudflare-saas/public/index.html#L9) |
| targets | `select[name=carb_basis]` | name=carb_basis | [L9](../../cloudflare-saas/public/index.html#L9) |
| targets | `input[name=carb_max_g]` | name=carb_max_g; type=number; min=1; max=300; required=True | [L9](../../cloudflare-saas/public/index.html#L9) |
| targets | `input[name=fiber_min_g]` | name=fiber_min_g; type=number; min=0; max=80; required=True | [L9](../../cloudflare-saas/public/index.html#L9) |
| targets | `input[name=saturated_fat_max_pct]` | name=saturated_fat_max_pct; type=number; min=1; max=30; required=True | [L9](../../cloudflare-saas/public/index.html#L9) |
| targets | `textarea[name=basis_note]` | name=basis_note; required=True; maxlength=500 | [L9](../../cloudflare-saas/public/index.html#L9) |
| knowledge | `section[data-testid=knowledge]` | data-page=knowledge; data-testid=knowledge | [L9](../../cloudflare-saas/public/index.html#L9) |
| knowledge | `div#knowledge-cards` |  | [L9](../../cloudflare-saas/public/index.html#L9) |
| more | `section[data-page=more]` | data-page=more | [L9](../../cloudflare-saas/public/index.html#L9) |
| more | `div[data-testid=more-list]` | data-testid=more-list | [L9](../../cloudflare-saas/public/index.html#L9) |
| more | `button[data-view=recipes]` | data-view=recipes | [L9](../../cloudflare-saas/public/index.html#L9) |
| more | `button[data-view=memory]` | data-view=memory | [L9](../../cloudflare-saas/public/index.html#L9) |
| more | `button[data-view=reminders]` | data-view=reminders | [L9](../../cloudflare-saas/public/index.html#L9) |
| more | `button[data-view=setup]` | data-view=setup | [L9](../../cloudflare-saas/public/index.html#L9) |
| more | `button[data-view=targets]` | data-view=targets | [L9](../../cloudflare-saas/public/index.html#L9) |
| more | `button[data-view=knowledge]` | data-view=knowledge | [L9](../../cloudflare-saas/public/index.html#L9) |
| more | `button[data-view=sources]` | data-view=sources | [L9](../../cloudflare-saas/public/index.html#L9) |
| more | `button[data-view=settings]` | data-view=settings | [L9](../../cloudflare-saas/public/index.html#L9) |
| more | `button#admin-tab` | data-view=admin | [L9](../../cloudflare-saas/public/index.html#L9) |
| reminders | `section[data-page=reminders]` | data-page=reminders | [L10](../../cloudflare-saas/public/index.html#L10) |
| reminders | `button#reminder-day-template` |  | [L10](../../cloudflare-saas/public/index.html#L10) |
| reminders | `button#reminder-menu-template` |  | [L10](../../cloudflare-saas/public/index.html#L10) |
| reminders | `div#reminder-list` |  | [L10](../../cloudflare-saas/public/index.html#L10) |
| reminders | `form#reminder-form` | data-testid=reminder-form | [L10](../../cloudflare-saas/public/index.html#L10) |
| reminders | `input#reminder-id` | type=hidden | [L10](../../cloudflare-saas/public/index.html#L10) |
| reminders | `input#reminder-title` | maxlength=120; required=True | [L10](../../cloudflare-saas/public/index.html#L10) |
| reminders | `input#reminder-time` | type=time; required=True | [L10](../../cloudflare-saas/public/index.html#L10) |
| reminders | `input#reminder-zone` | required=True | [L10](../../cloudflare-saas/public/index.html#L10) |
| reminders | `div#reminder-weekdays` |  | [L10](../../cloudflare-saas/public/index.html#L10) |
| reminders | `input#reminder-date` | type=date | [L10](../../cloudflare-saas/public/index.html#L10) |
| reminders | `input#reminder-enabled` | type=checkbox | [L10](../../cloudflare-saas/public/index.html#L10) |
| reminders | `button#reminder-reset` | type=button | [L10](../../cloudflare-saas/public/index.html#L10) |
| memory | `section[data-page=memory]` | data-page=memory | [L11](../../cloudflare-saas/public/index.html#L11) |
| memory | `div#kitchen-memory` | data-testid=kitchen-memory | [L11](../../cloudflare-saas/public/index.html#L11) |
| recipes | `section[data-page=recipes]` | data-page=recipes | [L11](../../cloudflare-saas/public/index.html#L11) |
| recipes | `div#kitchen-studio` | data-testid=kitchen-studio | [L11](../../cloudflare-saas/public/index.html#L11) |
| recipes | `details[data-testid=recipe-library]` | data-testid=recipe-library | [L11](../../cloudflare-saas/public/index.html#L11) |
| recipes | `form#recipe-search` |  | [L11](../../cloudflare-saas/public/index.html#L11) |
| recipes | `input#recipe-query` | maxlength=200 | [L11](../../cloudflare-saas/public/index.html#L11) |
| recipes | `p#recipe-note` |  | [L11](../../cloudflare-saas/public/index.html#L11) |
| recipes | `div#recipes` |  | [L11](../../cloudflare-saas/public/index.html#L11) |
| diary | `section[data-page=diary]` | data-page=diary | [L12](../../cloudflare-saas/public/index.html#L12) |
| diary | `form#diary-form` |  | [L12](../../cloudflare-saas/public/index.html#L12) |
| diary | `input#diary-date` | type=date; required=True | [L12](../../cloudflare-saas/public/index.html#L12) |
| diary | `textarea#diary-note` | maxlength=3000; required=True | [L12](../../cloudflare-saas/public/index.html#L12) |
| diary | `div#diary-entries` |  | [L12](../../cloudflare-saas/public/index.html#L12) |
| today | `section[data-page=today]` | data-page=today | [L13](../../cloudflare-saas/public/index.html#L13) |
| today | `button[data-view=recipes]` | data-view=recipes | [L13](../../cloudflare-saas/public/index.html#L13) |
| today | `button[data-view=targets]` | data-view=targets | [L13](../../cloudflare-saas/public/index.html#L13) |
| today | `div#menu-gate` |  | [L13](../../cloudflare-saas/public/index.html#L13) |
| today | `form#menu-form` |  | [L13](../../cloudflare-saas/public/index.html#L13) |
| today | `input#menu-start` | type=date; required=True | [L13](../../cloudflare-saas/public/index.html#L13) |
| today | `select#menu-days` |  | [L13](../../cloudflare-saas/public/index.html#L13) |
| today | `div#menu-result` |  | [L13](../../cloudflare-saas/public/index.html#L13) |
| today | `button#menu-pdf` | data-testid=menu-pdf | [L13](../../cloudflare-saas/public/index.html#L13) |
| today | `button#menu-share` | data-testid=menu-share | [L13](../../cloudflare-saas/public/index.html#L13) |
| today | `button#menu-download` |  | [L13](../../cloudflare-saas/public/index.html#L13) |
| today | `p#pdf-status` |  | [L13](../../cloudflare-saas/public/index.html#L13) |
| today | `button[data-export=json]` | data-export=json | [L13](../../cloudflare-saas/public/index.html#L13) |
| today | `button[data-export=csv]` | data-export=csv | [L13](../../cloudflare-saas/public/index.html#L13) |
| today | `button[data-export=html]` | data-export=html | [L13](../../cloudflare-saas/public/index.html#L13) |
| today | `input#menu-import` | type=file; accept=.csv,.json | [L13](../../cloudflare-saas/public/index.html#L13) |
| settings | `section[data-page=settings]` | data-page=settings | [L14](../../cloudflare-saas/public/index.html#L14) |
| settings | `form#settings-form` |  | [L14](../../cloudflare-saas/public/index.html#L14) |
| settings | `select#theme` |  | [L14](../../cloudflare-saas/public/index.html#L14) |
| settings | `select#text_size` |  | [L14](../../cloudflare-saas/public/index.html#L14) |
| settings | `select#density` |  | [L14](../../cloudflare-saas/public/index.html#L14) |
| settings | `select#home` |  | [L14](../../cloudflare-saas/public/index.html#L14) |
| settings | `input#simple_mode` | type=checkbox | [L14](../../cloudflare-saas/public/index.html#L14) |
| settings | `input#show_nutrition` | type=checkbox | [L14](../../cloudflare-saas/public/index.html#L14) |
| settings | `select#meals_per_day` |  | [L14](../../cloudflare-saas/public/index.html#L14) |
| settings | `input#max_active_minutes` | type=number; min=5; max=180 | [L14](../../cloudflare-saas/public/index.html#L14) |
| settings | `div#history` |  | [L14](../../cloudflare-saas/public/index.html#L14) |
| settings | `button#open-onboarding-settings` |  | [L14](../../cloudflare-saas/public/index.html#L14) |
| settings | `button#revoke` |  | [L14](../../cloudflare-saas/public/index.html#L14) |
| settings | `button#logout` |  | [L14](../../cloudflare-saas/public/index.html#L14) |
| settings | `button#delete-data` |  | [L14](../../cloudflare-saas/public/index.html#L14) |
| onboarding | `section[data-page=onboarding]` | data-page=onboarding | [L15](../../cloudflare-saas/public/index.html#L15) |
| onboarding | `form#profile-form` |  | [L15](../../cloudflare-saas/public/index.html#L15) |
| onboarding | `input#display-name` | maxlength=80 | [L15](../../cloudflare-saas/public/index.html#L15) |
| onboarding | `input#timezone` | required=True | [L15](../../cloudflare-saas/public/index.html#L15) |
| onboarding | `input#goal` | maxlength=200 | [L15](../../cloudflare-saas/public/index.html#L15) |
| onboarding | `input#medications` | maxlength=800 | [L15](../../cloudflare-saas/public/index.html#L15) |
| onboarding | `legend#question-progress` |  | [L15](../../cloudflare-saas/public/index.html#L15) |
| onboarding | `div#screen-questions` |  | [L15](../../cloudflare-saas/public/index.html#L15) |
| onboarding | `button#question-prev` | type=button | [L15](../../cloudflare-saas/public/index.html#L15) |
| onboarding | `button#question-next` | type=button | [L15](../../cloudflare-saas/public/index.html#L15) |
| onboarding | `div#allergy-options` |  | [L15](../../cloudflare-saas/public/index.html#L15) |
| sources | `section[data-page=sources]` | data-page=sources | [L16](../../cloudflare-saas/public/index.html#L16) |
| sources | `form#source-form` |  | [L16](../../cloudflare-saas/public/index.html#L16) |
| sources | `input[name=title]` | name=title; maxlength=140; required=True | [L16](../../cloudflare-saas/public/index.html#L16) |
| sources | `input[name=author]` | name=author; maxlength=140 | [L16](../../cloudflare-saas/public/index.html#L16) |
| sources | `input[name=url]` | name=url; type=url | [L16](../../cloudflare-saas/public/index.html#L16) |
| sources | `textarea[name=text]` | name=text; maxlength=2000 | [L16](../../cloudflare-saas/public/index.html#L16) |
| sources | `input[name=upload]` | name=upload; type=file; accept=image/jpeg,image/png,text/plain | [L16](../../cloudflare-saas/public/index.html#L16) |
| sources | `input[name=rights]` | type=checkbox; name=rights; required=True | [L16](../../cloudflare-saas/public/index.html#L16) |
| sources | `div#source-list` |  | [L16](../../cloudflare-saas/public/index.html#L16) |
| admin | `section[data-page=admin]` | data-page=admin | [L16](../../cloudflare-saas/public/index.html#L16) |
| admin | `form#invite-form` |  | [L16](../../cloudflare-saas/public/index.html#L16) |
| admin | `input[name=email]` | type=email; name=email; required=True | [L16](../../cloudflare-saas/public/index.html#L16) |
| admin | `p#invite-link` |  | [L16](../../cloudflare-saas/public/index.html#L16) |
| admin | `div#admin-summary` |  | [L16](../../cloudflare-saas/public/index.html#L16) |
| shell | `span#version` |  | [L16](../../cloudflare-saas/public/index.html#L16) |
| topic-dialog | `dialog#topic-dialog` |  | [L17](../../cloudflare-saas/public/index.html#L17) |
| topic-dialog | `h2#topic-heading` |  | [L17](../../cloudflare-saas/public/index.html#L17) |
| topic-dialog | `input#topic-title` | maxlength=80 | [L17](../../cloudflare-saas/public/index.html#L17) |
| topic-dialog | `button#topic-rename` |  | [L17](../../cloudflare-saas/public/index.html#L17) |
| topic-dialog | `button#topic-clear` |  | [L17](../../cloudflare-saas/public/index.html#L17) |
| topic-dialog | `button#topic-delete` |  | [L17](../../cloudflare-saas/public/index.html#L17) |
| topic-dialog | `button#topic-close` |  | [L17](../../cloudflare-saas/public/index.html#L17) |
| source-recipe-dialog | `dialog#source-recipe-dialog` |  | [L17](../../cloudflare-saas/public/index.html#L17) |
| source-recipe-dialog | `form#source-recipe-form` |  | [L17](../../cloudflare-saas/public/index.html#L17) |
| source-recipe-dialog | `input#sr-name` | maxlength=200; required=True | [L17](../../cloudflare-saas/public/index.html#L17) |
| source-recipe-dialog | `select#sr-category` |  | [L17](../../cloudflare-saas/public/index.html#L17) |
| source-recipe-dialog | `input#sr-servings` | type=number; min=0.1; max=30; required=True | [L17](../../cloudflare-saas/public/index.html#L17) |
| source-recipe-dialog | `input#sr-minutes` | type=number; min=1; max=360; required=True | [L17](../../cloudflare-saas/public/index.html#L17) |
| source-recipe-dialog | `textarea#sr-ingredients` | required=True | [L17](../../cloudflare-saas/public/index.html#L17) |
| source-recipe-dialog | `textarea#sr-steps` | maxlength=5000; required=True | [L17](../../cloudflare-saas/public/index.html#L17) |
| source-recipe-dialog | `button#sr-close` | type=button | [L17](../../cloudflare-saas/public/index.html#L17) |
| recipe-dialog | `dialog#recipe-dialog` |  | [L17](../../cloudflare-saas/public/index.html#L17) |
| recipe-dialog | `div#recipe-detail` |  | [L17](../../cloudflare-saas/public/index.html#L17) |
| recipe-dialog | `button#close-recipe` |  | [L17](../../cloudflare-saas/public/index.html#L17) |
| help-dialog | `dialog#help-dialog` |  | [L17](../../cloudflare-saas/public/index.html#L17) |
| help-dialog | `input#help-search` | type=search | [L17](../../cloudflare-saas/public/index.html#L17) |
| help-dialog | `div#help-results` |  | [L17](../../cloudflare-saas/public/index.html#L17) |
| help-dialog | `button#close-help` |  | [L17](../../cloudflare-saas/public/index.html#L17) |

## Dynamic selectors

These are created by maintained modules and do not appear in the static table.

| Module | Dynamic contract |
| --- | --- |
| setup-ui | energy-review, energy-floor-note, energy-edit-note, energy-slider; knowledge-*; stage aria-current |
| setup-controls | number-control wrappers and noUiSlider handles; explicit form ownership preserved |
| kitchen-ui | kitchen-product/free/food-list/meal/servings/time/missing/equipment/cuisine/avoid/avoid-list/equipment-help |
| kitchen-ui | data-testid kitchen-composer, mode-*, pantry-chips, product-questions, kitchen-generate/status/results/candidate/day/confirmation, memory-fact |
| kitchen-ui | data-food-id on pantry chips; data-recipe-id on candidates; radio name=mode; control names meal/servings/time/missing/equipment/cuisine |
| app | data-screen screening keys; question-help-*; proposal region and dynamic Apply/Cancel |
| mobile-ui | reminder weekday checkboxes 0..6; field-help-* IDs; keyboard-open body class |

Do not rename these without updating owning handlers and tests together.
