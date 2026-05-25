-- ─────────────────────────────────────────────────────────────
-- Миграция 008: архив клиентов
-- Применить в Supabase SQL Editor.
-- ─────────────────────────────────────────────────────────────

alter table clients
  add column if not exists archived boolean not null default false;

create index if not exists idx_clients_archived on clients(archived);
