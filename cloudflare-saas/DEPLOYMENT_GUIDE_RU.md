# KETO Companion: передача кандидата родителю

Код и сборки подготовлены локально, публикации не было. До использования реальных данных родитель должен проверить новую сборку в реальном Workers runtime, вход на staging с настоящим Google-аккаунтом, совместимость CSP и popup на поддерживаемых устройствах, безопасность, клинические ограничения и визуальную часть. Настроенный Firebase provider и успешный preflight не являются проверкой входа пользователя.

## Сборка и модули

Из корня: `node cloudflare-saas/build.cjs`. В `vendor/firebase-13.2.0/` сохранены поставленные родителем официальные модули, SHA-256 и Apache-2.0; модули `firebase/app`, `firebase/auth` и точный gstatic import сопоставлены локальным файлам. JOSE 6.2.15 взят из зафиксированной зависимости `ui-sdk/package-lock.json`, локально собран в `vendor/jose-6.2.15/`, лицензия MIT сохранена. Сборщик esbuild устанавливается из `ui-sdk/package-lock.json`; готовым сборкам node_modules не нужен.

`dist/worker.mjs` — единый Worker с assets. `dist/worker-modules.mjs` — основной минифицированный модуль с отдельными TEXT-модулями `dist/assets/*`; точные имена и хеши приведены в `artifacts/files_manifest.json`. При multipart-загрузке имена должны совпадать с импортами в основном модуле, а содержимое assets должно передаваться как TEXT. Данные публичного Firebase config также сохранены отдельным текстовым модулем; работающий endpoint `/auth/config` формируется из binding, отфильтровывая посторонние поля. Никакие идентификаторы из config не являются сервисными секретами.

Применить миграции `0001_initial.sql`–`0004_firebase_challenges.sql` по порядку только после сверки уже применённых миграций в целевой базе. `0003` переносит существующий учёт дневных вызовов в общий счётчик. При прежнем удалении участника его уже удалённые старые счётчики восстановить невозможно. D1 и R2 staging/production уже созданы: идентификаторы — в `qa/SAAS_PROVISIONED_RESOURCES.json` у родителя; повторно ресурсы не создавать. R2 WEUR — указание location, а не доказательство EU jurisdiction.

## Bindings и границы входа

Для Firebase: `AUTH_PROVIDER=firebase_google`, `FIREBASE_PUBLIC_CONFIG_JSON` (содержимое `qa/firebase-public-config.json`), `PUBLIC_ORIGIN`, `OWNER_GOOGLE_EMAIL`, `SESSION_HMAC_KEY` (не менее 32 символов), D1 `DB`, приватный R2 `UPLOADS`, `KETO_EDGE_BRIDGE_URL` и `KETO_EDGE_BRIDGE_SECRET`. В Firebase-режиме Google client secret Worker не нужен. Origin должен быть точным HTTPS origin развёрнутого приложения. Секреты передавать через защищённые bindings, не помещать в source, логи или артефакты.

SDK запускает popup по нажатию, использует `select_account` и память процесса страницы, затем выполняет signOut после обмена. Пяти­минутный challenge связан с защищённой HttpOnly cookie, Origin и хешем приглашения; успешно или неуспешно использованный challenge повторно не принимается. Лимиты выдачи — 10 операций с одного HMAC-хеша Cloudflare `CF-Connecting-IP` и 1000 общих одновременно за пять минут; записи очищаются после истечения. Поддельные клиентские `X-Forwarded-For` не используются. Развёртывать только за Cloudflare, который устанавливает CF-Connecting-IP. Общий и пользовательский лимиты чат-вызовов модели — 500 и 30 в UTC-день; это защитные значения, а не подтверждение бюджета.

Worker проверяет RS256 сертификатом из фиксированного Google endpoint `https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com`, с ограниченным TTL из Cache-Control, issuer/audience, сроки и provider claims. Исходная документация: <https://firebase.google.com/docs/auth/admin/verify-id-tokens> и <https://firebase.google.com/docs/auth/web/google-signin>. Firebase subject не заменяет Google subject: используется единственный подтверждённый `firebase.identities['google.com']`. Авторизация не заменяет действующее email-bound приглашение, проверку owner, status и CSRF.

Альтернатива `AUTH_PROVIDER=direct_google` сохраняется только при явном выборе и отдельной настройке. В проверке родителя её callback вернул `redirect_uri_mismatch`; считать этот путь настроенным нельзя. В браузере не проверены ни реальный вход, ни popup/CSP/COOP.

## Azure, приватность и удаление

Azure bridge должен иметь тот же отдельный `KETO_EDGE_BRIDGE_SECRET`, приватный Blob для nonce и managed identity; `KETO_EDGE_BRIDGE_URL` указывает на HTTPS `/internal/keto/compute`. До живого использования проверьте отсутствие тел запросов с личными данными в инфраструктурных логах. Ссылки источников не загружаются автоматически, закрытые Instagram-публикации не читаются. Обработка не является клинической валидацией; встроенного голосового режима ChatGPT у отдельного сайта нет.

Удаление отключает сессии, затем продолжает очистку по отдельному коду; зависшая неопределённая загрузка оставляет задачу в pending до сверки конкретной операции. Политика R2 версий/резервных копий, срок хранения jobs и Blob nonce и бюджет требуют отдельного решения. Удаление приложения не удаляет Google account или записи поставщиков идентификации.

Parent ранее проверил настоящий Miniflare/workerd с D1/R2 на совместимости `2026-10-03`, до новых изменений Firebase. Этот результат не доказывает работу текущей сборки или production compatibility date `2026-11-07`. Родитель выполняет новые localhost/staging проверки и выпуск; эта фаза не выполняла browser/GUI или cloud writes.
