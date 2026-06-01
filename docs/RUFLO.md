# Ruflo — studio-crm

Установка на Windows: только через `npx`, без `curl | bash`.

## Инициализация

```powershell
cd C:\Users\ggmly\studio-crm
npx ruflo@latest init
# интерактивный wizard (если блокирует — см. docs/AI-GUIDE.md)
```

## Рекомендуемые плагины (marketplace)

| Плагин | Назначение |
|--------|------------|
| `ruflo-core@ruflo` | Базовая оркестрация |
| `ruflo-rag-memory@ruflo` | Память между сессиями |
| `ruflo-cost-tracker@ruflo` | Учёт токенов и бюджетов |

## MCP (Cursor)

В `.cursor/mcp.json` добавлен сервер `ruflo`:

```json
"npx ruflo@latest mcp start"
```

## Конфликт с CLAUDE.md

`ruflo init` может изменить корневой `CLAUDE.md`. Правило:

- Полный журнал CRM: `docs/CRM-PROGRESS.md` (бэкап до init).
- В `CLAUDE.md` сохранять блок **«⭐ ТЕКУЩЕЕ СОСТОЯНИЕ»** из бэкапа + секции Ruflo из шаблона init.

## Локальные кэши

Папка `.claude-flow/` в `.gitignore` — не коммитить тяжёлые локальные данные.
