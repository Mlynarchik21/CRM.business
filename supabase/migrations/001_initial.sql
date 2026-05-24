-- ============================================================
-- Studio CRM — начальная схема БД
-- Выполнить в Supabase SQL Editor (или через `supabase db push`)
-- ============================================================

-- Расширения
create extension if not exists "uuid-ossp";

-- Профили команды
create table profiles (
  id uuid primary key default uuid_generate_v4(),
  auth_user_id uuid references auth.users(id) on delete cascade,
  full_name text not null,
  avatar_url text,
  role text not null default 'manager' check (role in ('admin', 'manager', 'developer', 'support')),
  telegram_id bigint,
  telegram_username text,
  status text default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Лиды
create table leads (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  telegram_username text,
  telegram_id bigint,
  phone text,
  email text,
  source text default 'manual' check (source in ('telegram_bot', 'landing', 'website', 'manual', 'cold', 'instagram', 'referral', 'csv_import')),
  service_interest text,
  budget_min numeric,
  budget_max numeric,
  budget_currency text default 'USD',
  status text default 'new' check (status in ('new', 'in_progress', 'contacted', 'no_answer', 'thinking', 'waiting_proposal', 'hot', 'bought', 'not_bought', 'postponed', 'spam')),
  probability integer default 0 check (probability between 0 and 100),
  assigned_to uuid references profiles(id),
  next_action_at timestamptz,
  last_contact_at timestamptz,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Клиенты
create table clients (
  id uuid primary key default uuid_generate_v4(),
  lead_id uuid references leads(id),
  name text not null,
  company_name text,
  telegram_username text,
  telegram_id bigint,
  phone text,
  email text,
  country text,
  city text,
  source text,
  status text default 'new' check (status in ('new', 'active', 'in_project', 'on_support', 'potential_repeat', 'inactive', 'problematic', 'vip')),
  assigned_to uuid references profiles(id),
  total_paid numeric default 0,
  projects_count integer default 0,
  last_contact_at timestamptz,
  last_payment_at timestamptz,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Сделки
create table deals (
  id uuid primary key default uuid_generate_v4(),
  lead_id uuid references leads(id),
  client_id uuid references clients(id),
  title text not null,
  service_type text,
  amount numeric not null default 0,
  currency text default 'USD',
  stage text default 'new_lead' check (stage in ('new_lead', 'qualification', 'discussion', 'proposal', 'negotiation', 'waiting_payment', 'paid', 'lost', 'postponed')),
  probability integer default 0,
  status text default 'open' check (status in ('open', 'won', 'lost', 'postponed')),
  assigned_to uuid references profiles(id),
  expected_payment_at timestamptz,
  lost_reason text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Проекты
create table projects (
  id uuid primary key default uuid_generate_v4(),
  client_id uuid references clients(id),
  deal_id uuid references deals(id),
  title text not null,
  project_type text check (project_type in ('landing', 'website', 'business_card', 'link_in_bio', 'telegram_bot', 'mini_app', 'crm', 'design', 'support', 'custom')),
  description text,
  tech_spec text,
  status text default 'new' check (status in ('new', 'briefing', 'estimation', 'in_progress', 'waiting_materials', 'review', 'revisions', 'waiting_payment', 'completed', 'on_support', 'paused', 'cancelled')),
  progress integer default 0 check (progress between 0 and 100),
  amount numeric default 0,
  paid_amount numeric default 0,
  currency text default 'USD',
  manager_id uuid references profiles(id),
  developer_id uuid references profiles(id),
  start_date date,
  deadline date,
  github_url text,
  vercel_url text,
  figma_url text,
  supabase_url text,
  telegram_bot_url text,
  staging_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Задачи
create table tasks (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid references projects(id),
  client_id uuid references clients(id),
  title text not null,
  description text,
  status text default 'backlog' check (status in ('backlog', 'today', 'in_progress', 'review', 'waiting_client', 'done', 'blocked')),
  priority text default 'medium' check (priority in ('low', 'medium', 'high', 'critical')),
  assigned_to uuid references profiles(id),
  created_by uuid references profiles(id),
  due_date timestamptz,
  checklist jsonb default '[]',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Оплаты
create table payments (
  id uuid primary key default uuid_generate_v4(),
  client_id uuid references clients(id),
  project_id uuid references projects(id),
  deal_id uuid references deals(id),
  amount numeric not null,
  currency text default 'USD',
  status text default 'expected' check (status in ('expected', 'partial', 'paid', 'overdue', 'refunded', 'cancelled')),
  payment_method text check (payment_method in ('crypto', 'bank_transfer', 'card', 'paypal', 'cash', 'other')),
  paid_at timestamptz,
  expected_at timestamptz,
  receipt_url text,
  comment text,
  created_by uuid references profiles(id),
  created_at timestamptz default now()
);

-- Комментарии (универсальные)
create table comments (
  id uuid primary key default uuid_generate_v4(),
  entity_type text not null check (entity_type in ('lead', 'client', 'deal', 'project', 'task', 'payment', 'support_ticket')),
  entity_id uuid not null,
  user_id uuid references profiles(id),
  content text not null,
  type text default 'comment' check (type in ('comment', 'call', 'no_answer', 'agreement', 'note', 'status_change')),
  created_at timestamptz default now()
);

-- Лейблы
create table labels (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  color text not null default '#22C55E',
  type text check (type in ('service', 'budget', 'priority', 'custom')),
  created_at timestamptz default now()
);

-- Связь лейблов с сущностями
create table entity_labels (
  id uuid primary key default uuid_generate_v4(),
  label_id uuid references labels(id) on delete cascade,
  entity_type text not null,
  entity_id uuid not null,
  created_at timestamptz default now(),
  unique(label_id, entity_type, entity_id)
);

-- Тикеты поддержки
create table support_tickets (
  id uuid primary key default uuid_generate_v4(),
  client_id uuid references clients(id),
  project_id uuid references projects(id),
  title text not null,
  status text default 'new' check (status in ('new', 'in_progress', 'waiting_client', 'waiting_team', 'resolved', 'closed')),
  priority text default 'medium' check (priority in ('low', 'medium', 'high', 'urgent')),
  assigned_to uuid references profiles(id),
  source text default 'telegram' check (source in ('telegram', 'manual', 'email')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- История сообщений
create table messages (
  id uuid primary key default uuid_generate_v4(),
  entity_type text,
  entity_id uuid,
  direction text check (direction in ('in', 'out', 'internal')),
  channel text default 'telegram' check (channel in ('telegram', 'email', 'manual')),
  sender_name text,
  sender_telegram_id bigint,
  text text not null,
  metadata jsonb,
  created_at timestamptz default now()
);

-- Лог активности
create table activity_logs (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references profiles(id),
  action text not null,
  entity_type text,
  entity_id uuid,
  metadata jsonb,
  created_at timestamptz default now()
);

-- Настройки
create table settings (
  id uuid primary key default uuid_generate_v4(),
  key text unique not null,
  value jsonb,
  updated_at timestamptz default now()
);

-- ── Индексы для производительности ──────────────────────────
create index idx_leads_status on leads(status);
create index idx_leads_assigned on leads(assigned_to);
create index idx_leads_created on leads(created_at desc);
create index idx_clients_status on clients(status);
create index idx_deals_stage on deals(stage);
create index idx_projects_status on projects(status);
create index idx_tasks_status on tasks(status);
create index idx_tasks_assigned on tasks(assigned_to);
create index idx_payments_status on payments(status);
create index idx_comments_entity on comments(entity_type, entity_id);
create index idx_entity_labels on entity_labels(entity_type, entity_id);
create index idx_activity_logs_entity on activity_logs(entity_type, entity_id);

-- ── updated_at trigger ──────────────────────────────────────
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_profiles_updated before update on profiles for each row execute function set_updated_at();
create trigger trg_leads_updated before update on leads for each row execute function set_updated_at();
create trigger trg_clients_updated before update on clients for each row execute function set_updated_at();
create trigger trg_deals_updated before update on deals for each row execute function set_updated_at();
create trigger trg_projects_updated before update on projects for each row execute function set_updated_at();
create trigger trg_tasks_updated before update on tasks for each row execute function set_updated_at();
create trigger trg_support_tickets_updated before update on support_tickets for each row execute function set_updated_at();

-- ============================================================
-- Row Level Security (MVP — упрощённо, в V2 заменить на role-based)
-- ============================================================
alter table profiles enable row level security;
alter table leads enable row level security;
alter table clients enable row level security;
alter table deals enable row level security;
alter table projects enable row level security;
alter table tasks enable row level security;
alter table payments enable row level security;
alter table comments enable row level security;
alter table labels enable row level security;
alter table entity_labels enable row level security;
alter table support_tickets enable row level security;
alter table messages enable row level security;
alter table activity_logs enable row level security;
alter table settings enable row level security;

-- Аутентифицированные пользователи видят/меняют всё (MVP)
create policy "authenticated_all_profiles" on profiles for all using (auth.role() = 'authenticated');
create policy "authenticated_all_leads" on leads for all using (auth.role() = 'authenticated');
create policy "authenticated_all_clients" on clients for all using (auth.role() = 'authenticated');
create policy "authenticated_all_deals" on deals for all using (auth.role() = 'authenticated');
create policy "authenticated_all_projects" on projects for all using (auth.role() = 'authenticated');
create policy "authenticated_all_tasks" on tasks for all using (auth.role() = 'authenticated');
create policy "authenticated_all_payments" on payments for all using (auth.role() = 'authenticated');
create policy "authenticated_all_comments" on comments for all using (auth.role() = 'authenticated');
create policy "authenticated_all_labels" on labels for all using (auth.role() = 'authenticated');
create policy "authenticated_all_entity_labels" on entity_labels for all using (auth.role() = 'authenticated');
create policy "authenticated_all_support" on support_tickets for all using (auth.role() = 'authenticated');
create policy "authenticated_all_messages" on messages for all using (auth.role() = 'authenticated');
create policy "authenticated_all_logs" on activity_logs for all using (auth.role() = 'authenticated');
create policy "authenticated_all_settings" on settings for all using (auth.role() = 'authenticated');

-- Service role для Telegram webhooks (полный доступ в обход auth-сессии)
create policy "service_role_leads" on leads for all using (auth.role() = 'service_role');
create policy "service_role_clients" on clients for all using (auth.role() = 'service_role');
create policy "service_role_messages" on messages for all using (auth.role() = 'service_role');
create policy "service_role_support" on support_tickets for all using (auth.role() = 'service_role');
