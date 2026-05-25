-- ─────────────────────────────────────────────────────────────
-- Миграция 007: журнал ошибок CRM (для раздела Настройки → Журнал)
-- Применить в Supabase SQL Editor.
-- ─────────────────────────────────────────────────────────────

create table if not exists error_logs (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  detail text,
  route text,
  status text not null default 'open' check (status in ('open', 'fixed')),
  created_at timestamptz default now(),
  fixed_at timestamptz
);

create index if not exists idx_error_logs_status on error_logs(status, created_at desc);

alter table error_logs enable row level security;

-- Чтение/правка — аутентифицированным; запись из перехватчика идёт через service_role.
drop policy if exists "authenticated_all_error_logs" on error_logs;
create policy "authenticated_all_error_logs" on error_logs
  for all using (auth.role() = 'authenticated');
