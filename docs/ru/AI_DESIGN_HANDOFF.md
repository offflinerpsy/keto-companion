# Передача дизайнеру/AI: KETO Companion

> Актуальная передача: **0.6.2-audit-pilot**. Четыре ошибки исходного ревью исправлены и покрыты тестами. Сохраняйте эти проверки: [исправления](../spec/CURRENT_CORRECTIONS.md), [точные JSON-контракты](../contracts/), [решения ревью](../review/SPEC_AUDIT_RESOLUTIONS.md). Это не приёмка физического устройства и не медицинское заключение.

SPEC-AUDIT-07 · исходный commit `ee4b42707e138f677fb32e9dfb4602a26c1b5b63` · 08.11.2026.
Документ подготовлен по действительным исходникам для самостоятельной работы дизайнера.
Это не визуальная приёмка по скриншотам и не подтверждение готовности к публикации.
Сначала прочитайте [начало спецификации](../spec/README.md),
[карту экранов](../spec/SCREEN_MAP.md), [систему оформления](../spec/DESIGN_SYSTEM.md)
и [точный реестр селекторов](../spec/UI_CONTRACTS.md).
Английская версия имеет [тот же охват](../en/AI_DESIGN_HANDOFF.md).

## Какие исходники редактировать

| Файл | Что меняется здесь | Что сохранить |
| --- | --- | --- |
| [index.html](../../cloudflare-saas/public/index.html) | Каркас, разделы, формы, диалоги, подписи | ID, data-page, имена полей, required и принадлежность форме |
| [app.css](../../cloudflare-saas/public/app.css) | Цвета, геометрия, адаптация и состояния | Safe area, внутреннюю прокрутку, focus, hidden и предупреждения |
| [app.js](../../cloudflare-saas/public/app.js) | Основные renderer/event handlers | call/accept/setState/clearScreen/epoch, имена действий, ревизии |
| [setup-ui.js](../../cloudflare-saas/public/setup-ui.js) | Этапы знакомства, объяснения расчёта и база знаний | Ключи этапов, preview_hash, перенос полей с form-атрибутами |
| [setup-controls.js](../../cloudflare-saas/public/setup-controls.js) | Внешний вид чисел/кнопок/ползунков | Разбор чисел, пустые нетронутые поля, пределы, destroy |
| [kitchen-ui.js](../../cloudflare-saas/public/kitchen-ui.js) | Студия, кладовая, карточки и память | Серверные ID, mode/equipment, basis доли, место подтверждения |
| [mobile-ui.js](../../cloudflare-saas/public/mobile-ui.js) | Голос/фото/темы/напоминания/PDF/viewport | Остановку записи, редактируемый черновик, отдельный клик Share, epoch |
| [media.js](../../cloudflare-saas/public/media.js) | При необходимости — сообщения медиасостояний | Отмену поколения, освобождение tracks, проверки файлов |
| [routes.js](../../cloudflare-saas/public/routes.js) | Интеграцию оформления с имеющейся навигацией | Ключи маршрутов, историю, диалоги, Назад/Вперёд |

Не правьте как независимые исходники `public/style.css`, `public/app.bundle.js`,
`public/knowledge-data.js`, `src/embedded-assets.mjs`, `dist/**`
и `artifacts/files_manifest.json`.
Их создаёт [build.cjs](../../cloudflare-saas/build.cjs) из поддерживаемых модулей,
закреплённых vendor-файлов и публичной конфигурации Firebase.
`style.css` складывается из CSS noUiSlider и `app.css`.
ESM-бандл собирает esbuild; Worker получает standalone и modular варианты ресурсов.
После сборки ожидается связанный diff нескольких generated-файлов — проверяйте его целиком.

[service/static](../../service/static/index.html) — отдельный интерфейс legacy Azure/plugin.
Не переносите его поверх SaaS и не объединяйте механизмы входа при редизайне.
Визуальная задача не включает клинический код, вычисления, идентификацию, cloud bindings и CI.

## Экраны и переходы

Внизу ровно четыре основных раздела: Чат, Меню, Дневник, Ещё.
В «Ещё»: рецепты, память, напоминания, знакомство, ориентиры, знания,
источники, настройки и администрирование.
Админ видит только предназначенные ему метаданные; сервер проверяет роль независимо от меню.

Имеющийся router работает с hash, новый framework не нужен:

- chat — разговор, темы, фото/диктовка и подтверждения рядом с сообщением.
- today — черновое/сохранённое меню, ингредиенты, покупки, PDF/экспорт/импорт.
- diary — дата/заметка и собственные записи.
- more — вторичные переходы и публичные справка/политика/удаление.
- recipes — сначала Recipe Studio, справочник в отдельном сворачиваемом блоке.
- memory — подтверждённые предпочтения, избранное, происхождение кладовой, удаление факта.
- reminders — время/часовой пояс, сохранённые напоминания, экспорт в календарь.
- settings — оформление/готовка, история, отзыв согласия, выход, удаление.
- sources — собственные материалы с подтверждением прав и ручная подготовка рецепта.
- admin — участники/приглашения/использование без медицинских записей.
- knowledge — включённые источники, допущения продукта, исключённые материалы.
- targets — сохранённые ориентиры, объяснённый preview, отличия, ручные значения.
- setup-consent/about/restrictions/targets — общий экран с четырьмя видимыми по очереди слотами.

`setup` разрешается в сохранённый этап; `onboarding` ведёт в ограничения.
Первый вход возвращает к незавершённому знакомству, кроме явного входа в рецепты.
Переходы между основными вкладками заменяют запись истории; вторичные добавляют запись.
Диалог справочного рецепта использует тот же hash с маркером диалога в history.
Сохраните браузерные Назад/Вперёд, `#nav-back`, `ketoDepth`, `ketoOrigin`, `ketoDialog`.
Диалоги темы/справки/импорта рецепта устроены иначе; не считайте все диалоги одинаковыми.

## Перемещение DOM и принадлежность элементов

`setupGuidance` переносит `#consent-panel` в `#setup-consent-slot`.
Исходный onboarding-раздел переносится в `#setup-restrictions-slot` и теряет data-page.
Два энергетических поля переезжают в динамический `#energy-review`, но сохраняют
`form="targets-form"`: FormData по-прежнему должен их собирать.
Существующая кнопка продолжения знакомства переносится в suggestions.
При изменении каркаса сохраните операции инициализации либо замените их согласованно.
Не создавайте вторые элементы с теми же ID ради нового красивого блока.

`#proposals` — один общий перемещаемый узел, а не копия на каждом экране.
В чате он попадает в `#chat-confirmations`, в знакомстве — `#setup-confirmations`,
в ориентирах — `#target-confirmations`; кухня/память добавляют его к текущему действию.
Общая функция propose вставляет его после активной формы или заголовка страницы.
После вставки подтверждение получает focus и прокручивается в видимую область.
Предложение в скрытом родителе — ошибка интерфейса, даже если сервер его подготовил.

## Стабильные идентификаторы

Полный реестр статических ID/name/data-testid — в [UI_CONTRACTS](../spec/UI_CONTRACTS.md).
Особенно важны:

- Сеанс/каркас: app, login, workspace, content, connection, nav, nav-back, toast, holds, proposals.
- Согласие: consent-form, c-processing, c-storage, c-health.
- Чат: chat-form, message, send, messages, chat-extras, chat-confirmations, topic-picker.
- Медиа: photo, photo-preview, photo-preview-image, photo-remove, mic-button,
  voice-controls, voice-stop, voice-cancel, voice-status, voice-timer.
- Знакомство: baseline-form, baseline-age/height/weight/measured/category/zone/name,
  setup-progress/stage и четыре слота этапов.
- Имена полей ориентиров: energy_min_kcal, energy_max_kcal, protein_min_g, protein_max_g,
  carb_basis, carb_max_g, fiber_min_g, saturated_fat_max_pct, basis_note.
- Контейнеры ориентиров: target-preview, saved-targets, manual-targets, apply-targets,
  calculate-guidance, energy-review, energy-slider, target-confirmations.
- Динамические ID кухни: kitchen-product, kitchen-food-list, kitchen-free,
  kitchen-meal/servings/time/missing/equipment/cuisine/avoid, kitchen-memory.
- Test ID кухни: kitchen-composer, mode-*, pantry-chips, product-questions,
  kitchen-generate/status/results/candidate/day/confirmation, memory-fact.
- Источники/админ: source-form, source-list, source-recipe-form, поля sr-*,
  invite-form, invite-link, admin-summary, admin-tab.
- Сброс/удаление: revoke, logout, delete-data, deletion-code, deletion-status.

`data-view` задаёт переход, `data-page` выбирает контейнер экрана.
`data-testid` нужен существующим проверкам.
`name` участвует в FormData, это не подпись для пользователя.
Текст подписи обычно менять безопасно; ключ mode/action/route/equipment — контракт.
Не переводите в коде значения pantry_only, no_cook, net_estimate и им подобные.

## Функции и обмен состоянием

`call(name,args,options)` отправляет POST с текущим CSRF и проверяет screen epoch.
`accept(data)` принимает серверное состояние, сообщение/покупки и переход после применения.
`setState(next)` проверяет смену владельца/согласия перед отображением.
`clearScreen()` увеличивает epoch и очищает частный DOM, медиа, диалоги и кэши кандидатов.
`run(fn)` показывает ошибку через имеющийся механизм уведомлений.
`setView(next,options)` использует существующий router и разрешение aliases.
`renderState()` обновляет оформление, предложения, дневник, темы и сохранённое меню.

В setup-функции модулей передаются `$`, `el`, `getState`, `call`, `accept`,
`run`, `notify`, `setView`, `epoch`; mobile также получает `setImage/getImage`.
Kitchen возвращает render/load/reset/card/show/dayCard.
Guidance возвращает initial/render/resolve/afterApplied/reset.
Mobile возвращает render/reset/resetPhoto/recording/setChatBusy.
Сохраните имена и смысл callbacks; не подменяйте accept оптимистичным «сохранено».
Начатый HTTP-запрос ещё не подтверждает изменение данных.

## Геометрия и режимы

Точные значения — в [DESIGN_SYSTEM](../spec/DESIGN_SYSTEM.md).
Отправная точка: системный шрифт 17px, обычный control 48px,
компактный/icon минимум 44px, панели с радиусом 20px,
основной отступ 18px и padding панели 20px.
Базовая палитра ivory/plum; dark/light — сохранённые настройки.
Крупный текст 1.2rem, compact меняет отступы, simple скрывает вторичные декоративные подписи.
Скрытие нутриентов меняет отображение, а не вычисления.

Пределы ширины: app 1100px, страница 900px, чат 850px.
При ширине от 850px основной padding становится 24px.
До 600px кухня одноколоночная, этапы знакомства — сетка 2×2.
До 400px определения подтверждений одноколоночные, строка тем может переноситься.
При высоте до 650px действуют компактные header/composer с сохранением контролов.

Сохраните `--viewport-height`, `--viewport-offset` и адаптер visualViewport.
Safe-area insets нужны header/nav/composer.
`min-height:0` должен пройти через вложенные flex-контейнеры до chat-scroll.
Не фиксируйте composer поверх окна и не возвращайте прокрутку body внутрь app shell.
Keyboard-open скрывает нижнюю навигацию и сокращает детали composer.
Наличие этих правил ещё не доказывает работу на реальном iPhone/Safari.

## Обязательные состояния

- Вход: ожидание, отмена, заблокированный popup, нет приглашения, другой аккаунт.
- Знакомство: неизвестные ответы, недоступные автоматические ориентиры.
- Рецепты: пустой результат, меньше трёх блюд, неполный день с причинами.
- Генерация: явно подписанный шаблон при недоступной/отклонённой модели.
- Чат/голос: ожидание, запись, распознавание, stop/cancel, понятная ошибка.
- Источник: needs_content/draft/reviewed/personal_recipe без смешения статусов.
- Предложение: истекло/устарело, Apply отключён, Cancel доступен.
- Безопасность: hold и устаревшее меню заметны.
- PDF: подготовка, готовность, share/download, ошибка; календарь требует импорта.
- Пустые дневник/память/напоминания; неизвестные нутриенты/граммы/дата происхождения.

Не заменяйте ошибку красивой карточкой успеха и не прячьте предупреждение ради высоты экрана.

## Доступность и размеры приёмки

Сохраните настоящие формы/кнопки, labels, fieldsets, native dialog,
skip link, live/status regions, aria-current, aria-pressed и видимый focus.
Проверяйте фактические touch areas, контраст и порядок обхода клавиатурой.
Уважайте prefers-reduced-motion; важная информация не должна зависеть от анимации.

Нужны синтетические before/after для 375×956, 390×956, 440×956,
440×540, landscape 956×440 и desktop шириной 1280px с записанной высотой.
Ключевые сценарии повторите с крупным текстом, dark/simple и уменьшенной высотой под клавиатуру.
Проверьте длинные русские строки, неизвестные значения, несколько предложений,
пустую кладовую и активное ограничение безопасности.
DOM-проверка доказывает семантику; скриншот — расположение; они не заменяют друг друга.
Браузеры/GUI на Mac нельзя запускать без нового явного разрешения.
Скриншоты может предоставить родитель через отдельное разрешённое preview-окружение.

## Что менять запрещено в задаче дизайна

- Auth, членство, разграничение админ/личные данные, CSRF и подписи.
- Согласие, Apply/Cancel, ревизии, срок предложения и request/event ID.
- Клинический скрининг, holds, формулы, ориентиры, состояния продуктов и справочник.
- Место clearScreen и epoch на границе сеанса/согласия.
- Различие доли порции и доли всего блюда.
- Неизвестное на ноль/default; предположение по фото на измеренную массу.
- Права на источник, его недоверенный статус и URL-only needs_content.
- Ограниченную память на «помнит всё», ICS на фоновый push.
- Модели, deployment/budget, private bindings и идентичности релиза.
- Админ-экран на просмотр семейных медицинских дневников.

Исторические дефекты SA07-01..04 записаны в [findings](../../qa/SPEC_AUDIT_FINDINGS.json); актуальные исправления и тесты — в решениях ревью.
Исправления принадлежат родителю; не маскируйте их придуманными данными или ослаблением backend.

## Поэтапная работа дизайнера

1. Прочитать текущую задачу и сохранить посторонние dirty changes.
2. Выбрать один экран/результат и перечислить исходные модули изменения.
3. Зафиксировать синтетическое состояние, селекторы, viewport и before при разрешённом просмотре.
4. Внести небольшое обратимое изменение, сохранив ключи действий/callbacks.
5. Проверить видимость общего подтверждения в форме/чате/студии/памяти.
6. Проверить принадлежность форме, имена полей, unknown и клавиатурный порядок.
7. После готовности исходника один раз обновить generated assets штатной сборкой.
8. Выполнить относящиеся к изменению существующие static/setup/kitchen/media проверки.
9. Выполнить обязательные проверки родителя и получить разрешённые синтетические скриншоты.
10. Сопоставить точные build hashes и записать оставшиеся visual/device gaps.
11. Делать небольшие обратимые commits только если задача реализации разрешает commits.
12. Остановиться на критериях этой задачи; не добавлять deployment/framework как «уборку».

Команды для исполнителя/родителя; этот документационный проход их не запускал:

```sh
node --test cloudflare-saas/tests/static.test.mjs cloudflare-saas/tests/setup.test.mjs cloudflare-saas/tests/kitchen.test.mjs cloudflare-saas/tests/media.test.mjs
node cloudflare-saas/build.cjs
python3 scripts/verify_repository.py
git diff --check
```

Если меняется поведение, нужна содержательная регрессия на его собственной границе.
Не запускайте browser scripts, установку пакетов или cloud-изменения ради дизайнерского макета.

## Additional invariant after audit / Дополнительный инвариант

Render every saved allergy, including canonical values not originally visible and any stored legacy value. An unrelated profile edit must never erase a restriction. Keep unknown diary intake visibly unknown, and distinguish per-person nutrition from household shopping. Test both the SaaS and legacy editor if editing shared logic. / Все сохранённые аллергии должны оставаться видимыми и сохранными при изменении других полей. Не превращайте неизвестное питание в ноль и не смешивайте личный рацион с покупками на всё блюдо.
