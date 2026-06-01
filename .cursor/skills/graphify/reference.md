# graphify — studio-crm

Проект: `C:\Users\ggmly\studio-crm` (Next.js 14 CRM, Supabase).

## Первый прогон

Из корня репозитория:

```powershell
cd C:\Users\ggmly\studio-crm
graphify . --wiki --no-viz
```

Если полный репозиторий слишком большой или долго:

```powershell
graphify app lib supabase/migrations types --wiki --no-viz
```

## Исключения

Не индексировать повторно: `node_modules`, `.next`, `graphify-out` (артефакты уже в `.gitignore`).

## После крупных изменений

```powershell
graphify . --update --wiki
```

## Для агента

1. Проверить наличие `graphify-out/wiki/index.md` или `graphify-out/GRAPH_REPORT.md`.
2. Читать wiki: `graphify-out/wiki/index.md` → статьи по сообществам кода.
3. Запросы: `graphify query "как связаны лиды и оплаты?"`, `graphify path "leads" "payments"`.

## Установка CLI (Windows)

```powershell
pipx install graphifyy
# или: pip install graphifyy
graphify --help
```

Полный skill: `.cursor/skills/graphify/SKILL.md` (синхронизация: `scripts/sync-graphify-skill.ps1`).
