-- ─────────────────────────────────────────────────────────────
-- Миграция 002: дедупликация лидов + история (activity_logs)
-- Применить в Supabase SQL Editor.
-- ─────────────────────────────────────────────────────────────

-- 1. Поля дубликатов на лидах
alter table leads
  add column if not exists is_duplicate boolean not null default false,
  add column if not exists duplicate_of uuid references leads(id),
  add column if not exists similarity_score integer;

create index if not exists idx_leads_duplicate_of on leads(duplicate_of);
create index if not exists idx_leads_is_duplicate on leads(is_duplicate);

-- 2. История изменений ведётся в уже существующей таблице activity_logs
--    (создана в 001_initial.sql). Здесь только убеждаемся, что есть индекс
--    по сущности и по времени — для быстрых таймлайнов в карточках.
create index if not exists idx_activity_logs_entity_created
  on activity_logs(entity_type, entity_id, created_at desc);

-- 3. На случай, если RLS на activity_logs ещё не разрешает запись
--    аутентифицированным — политика "for all" из 001 это уже покрывает.
--    Доп. действий не требуется.
