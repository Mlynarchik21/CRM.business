# AI-гайд — studio-crm

Единая инструкция для Cursor, VS Code, Claude Code и других ассистентов.  
Репозиторий: `C:\Users\ggmly\studio-crm`.

---

## A. Карта проекта

### Дерево модулей

```
app/
  (auth)/login/          — вход
  (dashboard)/           — защищённые страницы CRM
    dashboard/           — дашборд /
    leads/               — лиды
    clients/             — клиенты
    deals/               — сделки (канбан)
    projects/            — проекты
    tasks/               — задачи (трекер)
    payments/            — оплаты (+ переключатель на расходы)
    expenses/            — расходы
    support/             — поддержка
    analytics/           — аналитика
    team/                — команда
    agents/              — CRM-агенты (не Cursor!)
    marketing/           — маркетинг / источники
    settings/            — настройки
  api/
    telegram/            — webhook ботов
    agents/lead-intake   — приём лидов извне
components/              — UI по доменам (leads, clients, …)
lib/
  supabase/              — client, server, admin
  constants.ts           — NAV_ITEMS, статусы
  lead-dedup.ts          — дедупликация лидов
  history.ts             — activity_logs
  validations.ts         — Zod-схемы
supabase/migrations/
  001_initial.sql
  002_lead_dedup_and_history.sql
  003_project_stages.sql
  004_payment_statuses.sql
  005_expenses.sql
  006_lead_cold_search.sql
  007–009 — см. файлы в папке
types/                   — доменные типы
```

### Маршруты UI (`NAV_ITEMS` в `lib/constants.ts`)

| href | Раздел |
|------|--------|
| `/` | Дашборд |
| `/leads` | Лиды |
| `/clients` | Клиенты |
| `/deals` | Сделки |
| `/projects` | Проекты |
| `/tasks` | Задачи |
| `/payments` | Оплаты |
| `/support` | Поддержка |
| `/analytics` | Аналитика |
| `/team` | Команда |
| `/notifications` | Уведомления |
| `/agents` | Агенты (CRM) |
| `/marketing` | Маркетинг |
| `/settings` | Настройки |

### Server Actions

Паттерн: `app/(dashboard)/<module>/actions.ts` — мутации через Supabase, после изменений данных дашборда:

```ts
revalidatePath("/");
revalidatePath("/analytics");
```

Модули с actions: `leads`, `clients`, `projects`, `deals`, `tasks`, `payments`, `expenses`, `support`, `marketing`, `agents`, `team`, `settings`, …

### Интеграции

- **Telegram:** `app/api/telegram/lead-bot`, `support-bot`, `internal-bot` — нужны токены в `.env.local`.
- **Lead intake:** `app/api/agents/lead-intake` — внешний приём лидов (не путать с `tools/lead-parser`, его нет в git).

---

## B. Матрица «задача → что запускать»

| Задача | Инструмент | Когда |
|--------|------------|--------|
| Первый раз в проекте / большой рефакторинг | **graphify** `graphify . --wiki --no-viz` | До правок кода |
| «Как связаны X и Y?» | **graphify** `query` / `path` | Вместо чтения всего репо |
| После merge крупной ветки | **graphify** `--update --wiki` | Синхронизация графа |
| Обычная фича CRM | Cursor Agent + `.cursor/rules/studio-crm.mdc` | Без graphify |
| PR / CI / merge | skill **babysit** | По запросу |
| Настройки Cursor/VS Code | skill **update-cursor-settings** | Редко |
| Cursor SDK / API | skill **sdk** | Интеграции вне IDE |
| Таблицы/графики в чате | skill **canvas** | Аналитика в UI чата |
| Токены, swarms, долгие сессии | **Ruflo** + `ruflo-cost-tracker@ruflo` | См. `docs/RUFLO.md` |
| Память между сессиями Ruflo | `ruflo-rag-memory@ruflo` | После `npx ruflo init` |
| Агенты **внутри CRM** | UI `/agents`, `settings.agents` | **Не** Cursor skills |

---

## C. Как правильно читать код

### Поток данных

```
UI (page + components)
  → actions.ts ("use server")
  → Supabase (server client / admin для webhooks)
  → revalidatePath("/") и "/analytics"
```

### Оплаты

- 4 статуса: `paid`, `expected`, `cancelled`, `error` — UI через `getPaymentStatusMeta`.
- Статус `partial` **удалён** — не использовать.
- При edit платежа — recalc `projects.paid_amount`, `clients.total_paid` (`payments/actions.ts`).

### Лиды

- Дедуп: `lib/lead-dedup.ts`, миграция `002`.
- Лиды **не удаляются** — только смена статуса / слияние.
- Холодный поиск: `leads.cold_search` (JSONB), миграция `006`, UI `ColdSearchPanel`.

### Windows dev

- Dev: **:3001**, не :3000.
- **Не** `npm run build` при работающем `npm run dev`.
- Быстрая проверка: `npx tsc --noEmit`.

### Миграции

Применять в Supabase SQL Editor **по порядку** 002→009. Без них — фолбэки в коде, не полная функциональность. Список в блоке ⭐ в `CLAUDE.md`.

### lead-parser

Папка `tools/` в `.gitignore`. Парсер Google Maps **не в репозитории**. Intake — API и Telegram.

---

## D. Чеклист handoff (другая нейросеть / VS Code)

1. Открыть папку `C:\Users\ggmly\studio-crm`.
2. Прочитать `AGENTS.md` → этот файл → блок ⭐ в `CLAUDE.md`.
3. `npm install`, скопировать `.env.example` → `.env.local`.
4. Если нет `graphify-out/` — выполнить `graphify . --wiki --no-viz` (или попросить пользователя).
5. Уточнить: **какие миграции Supabase уже применены**.
6. Перед коммитом: `npx tsc --noEmit`, lint по затронутым файлам.
7. Не коммитить без явной просьбы пользователя.

---

## E. Типичные ошибки (красные флаги)

| Ошибка | Почему плохо |
|--------|----------------|
| `npm run build` при работающем dev | Ломает `.next`, все вкладки |
| Забыли `revalidatePath("/")` после мутации | Дашборд показывает старые данные |
| `service_role` в client component | Утечка ключа |
| Статус оплаты `partial` | Поле удалено в v3.1 |
| Искать `tools/lead-parser` в репо | Папка gitignored |
| Путать `/agents` (CRM) и Cursor/Ruflo | Разные системы |
| Коммитить `graphify-out/` | Регенерируется локально |

---

## F. Обновление журнала

- После сессии: блок **«Последнее обновление»** в `CLAUDE.md` (или `docs/CRM-PROGRESS.md` для полной истории).
- Полный бэкап журнала до Ruflo: `docs/CRM-PROGRESS.md`.
- Опционально: запись в CRM «Журнал» (Настройки) — для пользователя, не для AI.

---

## Graphify (studio-crm)

См. `.cursor/skills/graphify/reference.md`.

```powershell
pipx install graphifyy   # или pip install graphifyy
cd C:\Users\ggmly\studio-crm
graphify . --wiki --no-viz
# читать: graphify-out/wiki/index.md
```

## Ruflo

См. `docs/RUFLO.md`, `.cursor/mcp.json`.

```powershell
npx ruflo@latest init
```

Плагины: `ruflo-core@ruflo`, `ruflo-rag-memory@ruflo`, `ruflo-cost-tracker@ruflo`.
