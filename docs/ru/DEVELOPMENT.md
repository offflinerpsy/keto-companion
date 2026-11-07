# Разработка и тестирование

Нужны Python 3.12, Node.js 26 и OpenSSL. Все команды выполняются из корня репозитория. Используйте отдельную локальную среду, не меняйте глобальную конфигурацию Codex.

```sh
python3.12 -m venv .venv
.venv/bin/python -m pip install -r requirements-dev.txt
npm ci --prefix ui-sdk --ignore-scripts
.venv/bin/python scripts/verify_repository.py
.venv/bin/python -m pytest -q tests/test_service.py tests/test_oauth_bridge.py tests/test_edge_candidate.py tests/test_edge_bridge.py library/skills/keto-companion/tests/test_core.py
node --test cloudflare-saas/tests/*.test.mjs
node tests/test_ui_no_browser.cjs
node tests/test_oauth_ui.cjs
node cloudflare-saas/build.cjs
.venv/bin/python scripts/verify_repository.py
```

Node-тесты вызывают `.venv/bin/python` для синтетического вычислительного моста. Firebase и JOSE поставлены как зафиксированные vendor-модули с лицензиями и происхождением. `ui-sdk/package-lock.json` фиксирует зависимости сборки. Публичный Firebase config требуется сборщику; это идентификаторы браузерного приложения, не серверные секреты.

CI запускает только синтетические тесты и проверки сборки. Реальные вызовы модели, авторизация человека, браузерные тесты и выпуск инфраструктуры не входят в CI. Старые `tests/live_model_eval.py` и `tests/browser_journey.py` нельзя запускать автоматически.

Локальный workerd-скрипт в `qa/recovery-firebase-runtime.cjs` был выполнен на Mac с Miniflare 5.20260926.0-alpha; путь к установленному Miniflare специфичен для этой машины. Его проверенная дата совместимости 2026-10-03 не подтверждает облачную дату 2026-11-07. Не меняйте production-настройки, чтобы скрыть несовместимость теста.
