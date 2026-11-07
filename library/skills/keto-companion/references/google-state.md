# Google: одно достоверное состояние
## Почему native Google Doc
Каноническое состояние — JSON внутри отдельного native Google Doc. documents.batchUpdate поддерживает requiredRevisionId: устаревший писатель получает отказ, а не затирает чужие изменения. Обычный replace JSON-файла Drive и несколько независимых обновлений Sheets не дают этой гарантии в доступном коннекторе. Читаемые Sheets/HTML/PDF — проекции, не второе равноправное хранилище.

## Первый запуск
1. Discover реальные Google Drive tools и аккаунты; get_profile выбранного аккаунта. Нельзя наследовать идентификатор разработчика. При нескольких аккаунтах — выбор пользовательницы.
2. До сбора здоровья получи её согласие. Создай приватную папку KETO Companion и внутри подпапки Меню, Покупки, Дневник, Фото (последняя только при согласии), Экспорты, Система. Не делись автоматически. При одном пользователе один subject_id UUID.
3. new_state(subject_id, owner_account_id). Начальные clinical flags=null, targets=null, согласия false. new_state.demo=false. Сначала покажи выбранное хранение, затем отдельное событие consent.set. Демонстрационный профиль нельзя конвертировать в личный.
4. create_file native Google Doc, insertText начального canonical(state). Перемещение: get_file_metadata с parents, затем update_file addParents и removeParents только известного источника. Сохрани фактические ID/URL в персональном locator-файле, не в плагине. Назови системный документ «KETO Companion — состояние — <subject_id>».
5. Проверь readback, owner/subject и статус private. Предложи закрепить ссылку/чат. На новом чате найти locator в выбранном Google и сверить профиль.

## Чтение
get_document с fields `documentId,title,revisionId,tabs(documentTab(body(content)),tabProperties)`. Не запрашивай одновременно legacy body и tabs: Google отвергает такой field mask. Выбери единственный ожидаемый tab; собери текст textRun.content без названий вкладок/служебной обёртки. parse_state_document(text). Сохрани revisionId, tabId и digest(state). Несколько канонических документов/повреждённый JSON — остановить запись и согласовать восстановление, не создавать дубль молча.

## Запись одной операции
- actor_account_id совпадает с owner из get_profile; subject_id неизменён.
- Сформируй event_id один раз, payload подтверждён, `apply_event(state,event,expected_revision,actor,catalog)`.
- Повторный уже выполненный event возвращает ту же ревизию: новую запись в документ не делай.
- `document_write_request(old_text,new_state,revisionId,digest(old_state),tabId)` генерирует requests и write_control. Индексы Google Docs — UTF-16, не число Unicode символов.
- batch_update_document передаёт `write_control.requiredRevisionId`; только один атомарный batch. При revision mismatch перечитай состояние, сохрани event_id, пересчитай изменение; не применяй автоматически устаревшее подтверждение, если поменялся смысл/ограничения.
- После результата get_document/get_document_text и сверка state_revision/event_receipt. При тайм-ауте сначала читать receipt, не повторять внешнее действие вслепую.
- При внешнем Calendar/Gmail действии сперва проверка дублей/подтверждение, затем инструмент и readback, затем `integration.receipt` с реальным external_id/status=verified. Известные ошибки не превращать в verified.

## Размер и архив
Runtime ограничивает системный документ 2 МБ. До превышения: предупреди, создай согласованный приватный архив, проверь чтение/контрольную сумму, сохрани ссылки и только потом уплотни активные данные отдельной проверенной миграцией. Автоматическая ротация/слияние в этом релизе не реализованы. Не теряй историю, чтобы обойти лимит.

## Конфиденциальность
Создание/подключение плагина не передаёт OAuth-доступ супругу. Автор видит только файлы, которые ему явно открыты. Не ищи личные документы по всему Drive без узкого назначения. Прямое редактирование JSON вне чата может его испортить; предпочтения изменяются через чат или проверенный import-request. Тестовые системные документы разработчика никогда не являются рабочим профилем.
