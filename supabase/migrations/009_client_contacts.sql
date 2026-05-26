-- ─────────────────────────────────────────────────────────────
-- Миграция 009: доп. контакты клиента/лида
--   второй телефон, ЛПР, ссылка на карты, сторонние ссылки (соцсети)
-- Применить в Supabase SQL Editor.
-- ─────────────────────────────────────────────────────────────

alter table clients
  add column if not exists extra_phone text,
  add column if not exists decision_maker text,
  add column if not exists maps_url text,
  add column if not exists links jsonb not null default '[]'::jsonb;

alter table leads
  add column if not exists extra_phone text,
  add column if not exists decision_maker text,
  add column if not exists maps_url text;
