# CRM-PROGRESS.md — бэкап журнала CRM

> **Снимок 2026-06-01** (до `npx ruflo init`). Содержимое = `CLAUDE.md` **без** блока «AI onboarding» вверху.
>
> Для **полной** побайтовой копии текущего `CLAUDE.md`:
>
> ```powershell
> powershell -ExecutionPolicy Bypass -File scripts/backup-crm-progress.ps1
> ```

---

## Последнее обновление
2026-05-22 (v3.1) — **P1 аудит: 4 критичных фикса данных**
- ✅ #1: Синхро оплат — recalc для старых связей при редактировании платежа (payments/actions.ts)
- ✅ #2: Инвалидация дашборда — добавлены revalidatePath("/") и revalidatePath("/analytics") во все actions (clients, leads, projects, support, marketing)
- ✅ #3: Дрейф статусов — дашборд больше не ищет несуществующий status "partial", исправлен hintText (dashboard/page.tsx)
- ✅ #4: Конверсионная цепочка — логирование конвертации лид→клиент и сделка→проект (clients/actions.ts, deals/actions.ts)
- ✅ Инкремент projects_count при создании проекта (projects/actions.ts с fallback)
- Сборка: ✅ zелёная после всех правок

**Статус:** MVP с критичными ошибками данных = FIXED. Готово к дальнейшему развитию.

---

## ⭐ ТЕКУЩЕЕ СОСТОЯНИЕ ДЛЯ ПРОДОЛЖЕНИЯ (читать первым)

### Как работать (важно, Windows)
- Запуск: `npm run dev` (поднимается на **http://localhost:3001**, порт 3000 занят).
- **НЕ запускать `npm run build` поверх работающего `next dev`** — бьёт `.next` и
  ломает все вкладки. Перед сборкой остановить dev (освободить порт 3001), затем
  `rm -rf .next && npm run build`, потом снова `npm run dev`.
- Проверка на каждом шаге: `npx tsc --noEmit` (быстро, без конфликта с dev).
- Логин: `Ggmlynarchik21@gmail.com` (роль admin).

### ⚠️ Миграции Supabase — применить в SQL Editor по порядку
Лежат в `supabase/migrations/`. Без них модули работают с фолбэками, но не полноценно:
- `002_lead_dedup_and_history.sql` — дедуп лидов + история (activity_logs).
- `003_project_stages.sql` — `projects.stages` (JSONB) — этапы проекта.
- `004_payment_statuses.sql` — 4 статуса оплат (paid/expected/cancelled/error).
- `005_expenses.sql` — таблица `expenses` (расходы/прибыль/ROI).
- `006_lead_cold_search.sql` — `leads.cold_search` (JSONB) — поля холодного поиска.

### Что сделано в v3 (E1–E8)
- **E1 Задачи** → трекер в стиле этапов (канбан удалён): компактный список,
  раскрытие по клику, чекбокс выполнения, карандаш-правка, «...» меню, «Шаблоны» +
  «Добавить» (окно), прогресс %. Файлы: `components/tasks/TasksTracker.tsx`,
  `tasks/page.tsx`, `tasks/actions.ts` (+ `deleteTaskRecord`). Удалены
  `TasksBoard/TaskKanbanColumn/TaskCard`.
- **E2 Агенты** (`/agents`): статистика (работает/пауза/ошибка), список с раскрытием,
  ошибки с копированием, статусы, форма «Добавить»/«Настройки» (промпт/скилы/API).
  Хранение в `settings.agents` (JSON). Файлы: `components/agents/AgentsClient.tsx`,
  `agents/actions.ts`, `agents/page.tsx`.
- **E3 Маркетинг** (`/marketing`): статистика трафика (лиды/клиенты/конверсия по
  источникам) + «Добавить» источник формой с подсказками по каналу. Хранение в
  `settings.marketing_sources`. Файлы: `components/marketing/MarketingClient.tsx`,
  `marketing/actions.ts`, `marketing/page.tsx`.
- **E4 Расходы** (`/expenses`): кнопка «Расходы» на оплатах (переключатель Оплаты↔Расходы),
  таблица+форма, метрики Доход/Расход/Прибыль. Файлы: `components/expenses/ExpensesClient.tsx`,
  `expenses/actions.ts`, `expenses/page.tsx`. Тип `Expense`, схема `expenseSchema`.
- **E5 Пагинация**: общий `components/shared/PaginationBar.tsx` — **фиксированная панель
  внизу экрана** (как в лидах). Подключена в Клиентах, Проектах, Оплатах, Поддержке,
  Расходах (страницы получили `pb-24`).
- **E6 Аналитика**: `components/analytics/AnalyticsView.tsx` — переключатель
  «Финансы/сделки ↔ Трафик». Финансы: выручка/расход/прибыль/средний чек + графики.
  Трафик: источники, конверсия, расход, **цена лида/ROI** (расход берётся из expenses
  по полю «Источник»). Старый `AnalyticsCharts.tsx` используется внутри.
- **E7 Холодный поиск**: блок в карточке лида (`components/leads/ColdSearchPanel.tsx`):
  где найден, тип бизнеса, ссылки, срок, что есть, что предложить. Action
  `updateLeadColdSearch` в `leads/actions.ts`. Поле `leads.cold_search` (JSONB).
- **E8 Сторонние API**: Настройки → Подключения — добавление внешних API
  (название/URL/ключ), хранение в `settings.connections`. В `SettingsClient.tsx`.

### Оплаты — текущее поведение (важно)
- 4 статуса: Оплачен / Ожидаем / Отменён / Ошибка (`getPaymentStatusMeta` —
  безопасный доступ для старых значений до миграции 004).
- В таблице: ID транзакции (`TX-XXXX`, `transactionId()` в utils), время **GMT+3**
  (`formatDateTimeGmt3()`). Клик по строке → окно деталей (только просмотр) → кнопка
  «Изменить» открывает форму. Тип платежа (deposit/part/final), способ, чек — в форме.

### Не сделано / тех-долг (следующие шаги)
- **Агент-ревьюер** (раздел D в `docs/TZ-improvements.md`): встроенный «живой
  пользователь», проходит по данным и подсказывает улучшения.
- **Supabase Storage**: загрузка чеков/файлов сейчас в локальные `/api/*` —
  на Vercel не сохранится. Перенести в Storage.
- **Шифрование ключей** агентов/подключений (сейчас в `settings` открытым текстом).
- Реальные Telegram-токены + `setWebhook`.
- Роли/RLS (V2).
- Полное ТЗ с приоритетами: `docs/TZ-improvements.md`.

---

_Полная история модулей (Leads, Clients, Deals, …), Supabase, env и «Следующая сессия» — в `CLAUDE.md` или после запуска `scripts/backup-crm-progress.ps1`._
