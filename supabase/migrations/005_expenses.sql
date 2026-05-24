-- ─────────────────────────────────────────────────────────────
-- Миграция 005: расходы (для расчёта прибыли и ROI источников)
-- Применить в Supabase SQL Editor.
-- ─────────────────────────────────────────────────────────────

create table if not exists expenses (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  category text not null default 'other'
    check (category in ('ads', 'contractors', 'tools', 'salary', 'taxes', 'other')),
  amount numeric not null default 0,
  currency text default 'USD',
  spent_at date,
  project_id uuid references projects(id),
  source text,                 -- канал/источник трафика (для ROI)
  comment text,
  created_by uuid references profiles(id),
  created_at timestamptz default now()
);

create index if not exists idx_expenses_spent_at on expenses(spent_at desc);
create index if not exists idx_expenses_category on expenses(category);

alter table expenses enable row level security;

-- MVP-политика: аутентифицированные видят и редактируют всё (как у остальных таблиц).
drop policy if exists "authenticated_all_expenses" on expenses;
create policy "authenticated_all_expenses" on expenses
  for all using (auth.role() = 'authenticated');
