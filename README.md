# KETO Companion

**Private / Приватный репозиторий.** Personal nutrition planning with explicit consent, isolated family accounts and deterministic calculations. Not a medical service or an autonomous clinical monitor.

## Documentation / Документация

**[Русский — начать здесь](README.ru.md)** · **[English — start here](README.en.md)**

| Area / Раздел | Русский | English |
|---|---|---|
| Architecture / Архитектура | [RU](docs/ru/ARCHITECTURE.md) | [EN](docs/en/ARCHITECTURE.md) |
| Setup and tests / Запуск и тесты | [RU](docs/ru/DEVELOPMENT.md) | [EN](docs/en/DEVELOPMENT.md) |
| Deployment / Выпуск | [RU](docs/ru/DEPLOYMENT.md) | [EN](docs/en/DEPLOYMENT.md) |
| Security and limits / Безопасность | [RU](docs/ru/SECURITY.md) | [EN](docs/en/SECURITY.md) |
| Continuation / Продолжение | [RU](docs/ru/CONTINUATION.md) | [EN](docs/en/CONTINUATION.md) |

## Version boundaries / Границы версий

- SaaS source: `0.3.0-internal-pilot`; exact cloud state: [CURRENT_STATUS.json](docs/CURRENT_STATUS.json).
- Existing private plugin: `0.2.1`; exported instructions and metadata in `plugin/`. The obsolete nested server snapshot was excluded; see `plugin/EXPORT_PROVENANCE.json`.
- Research and food data: `0.1.1`, in `library/`; 78 foods, 72 recipes, 47 source records. This is not a new scientific review.
- Canonical Python service: `service/`. Do not restore historical plugin source over it.

Recent verification: 341 Python tests; 62 Node synthetic tests; 30 exact-build local workerd checks. These cover different scopes and must not be added together as a clinical or browser acceptance score. The local runtime checked compatibility date `2026-10-03`, not cloud `2026-11-07`.

Read [AGENTS.md](AGENTS.md) before changing the project. Work one task at a time. No browser automation, Computer Use or automatic production deployment. Tests must not call paid AI or external user accounts by default.

All original code is private. Third-party code retains its existing license; see [THIRD_PARTY.md](THIRD_PARTY.md). Do not upload tokens, cookies, health diaries, local databases or raw agent logs, even to this private repository.
