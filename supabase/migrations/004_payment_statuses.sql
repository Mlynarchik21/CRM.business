-- ─────────────────────────────────────────────────────────────
-- Миграция 004: упрощение статусов оплат до 4
--   оплачен (paid) / ожидаем (expected) / отменён (cancelled) / ошибка (error)
-- Применить в Supabase SQL Editor.
-- ─────────────────────────────────────────────────────────────

-- 1. Снимаем старое CHECK-ограничение (имя по умолчанию из 001_initial.sql).
alter table payments drop constraint if exists payments_status_check;

-- 2. Переносим старые значения на новые.
update payments set status = 'expected'  where status in ('partial', 'overdue');
update payments set status = 'cancelled' where status = 'refunded';
-- paid / expected / cancelled остаются как есть; 'error' — новое значение.

-- 3. Значение по умолчанию.
alter table payments alter column status set default 'expected';

-- 4. Новое ограничение ровно на 4 статуса.
alter table payments
  add constraint payments_status_check
  check (status in ('expected', 'paid', 'cancelled', 'error'));
