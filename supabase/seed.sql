-- ============================================================
-- Studio CRM — стартовые данные
-- ============================================================

-- Стартовые лейблы
insert into labels (name, color, type) values
('Сайт', '#22C55E', 'service'),
('Лендинг', '#22C55E', 'service'),
('Telegram бот', '#8B5CF6', 'service'),
('Mini App', '#8B5CF6', 'service'),
('Карточка/визитка', '#F97316', 'service'),
('Дизайн', '#3B82F6', 'service'),
('Срочно', '#EF4444', 'priority'),
('VIP', '#F59E0B', 'priority'),
('Чек $100', '#6B7280', 'budget'),
('Чек $300', '#22C55E', 'budget'),
('Чек $500', '#F97316', 'budget'),
('Чек $1000+', '#EF4444', 'budget'),
('Повторная продажа', '#8B5CF6', 'custom');

-- Стартовые настройки
insert into settings (key, value) values
('company_name', '"Studio CRM"'),
('default_currency', '"USD"'),
('telegram_lead_bot_token', '""'),
('telegram_internal_bot_token', '""'),
('telegram_notification_chat_id', '""');
