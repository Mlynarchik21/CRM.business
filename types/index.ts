// ─────────────────────────────────────────────────────────────
// Типы Studio CRM. Соответствуют SQL-схеме supabase/migrations/001_initial.sql
// ─────────────────────────────────────────────────────────────

export type UUID = string;
export type Timestamp = string; // ISO-строка

// ── Перечисления (совпадают с CHECK-ограничениями в БД) ──────────

export type Role = "admin" | "manager" | "developer" | "support";

export type LeadSource =
  | "telegram_bot"
  | "landing"
  | "website"
  | "manual"
  | "cold"
  | "instagram"
  | "referral"
  | "csv_import";

export type LeadStatus =
  | "new"
  | "in_progress"
  | "contacted"
  | "no_answer"
  | "thinking"
  | "waiting_proposal"
  | "hot"
  | "bought"
  | "not_bought"
  | "postponed"
  | "spam";

export type ClientStatus =
  | "new"
  | "active"
  | "in_project"
  | "on_support"
  | "potential_repeat"
  | "inactive"
  | "problematic"
  | "vip";

export type DealStage =
  | "new_lead"
  | "qualification"
  | "discussion"
  | "proposal"
  | "negotiation"
  | "waiting_payment"
  | "paid"
  | "lost"
  | "postponed";

export type DealStatus = "open" | "won" | "lost" | "postponed";

export type ProjectType =
  | "landing"
  | "website"
  | "business_card"
  | "link_in_bio"
  | "telegram_bot"
  | "mini_app"
  | "crm"
  | "design"
  | "support"
  | "custom";

export type ProjectStatus =
  | "new"
  | "briefing"
  | "estimation"
  | "in_progress"
  | "waiting_materials"
  | "review"
  | "revisions"
  | "waiting_payment"
  | "completed"
  | "on_support"
  | "paused"
  | "cancelled";

export type TaskStatus =
  | "backlog"
  | "today"
  | "in_progress"
  | "review"
  | "waiting_client"
  | "done"
  | "blocked";

export type Priority = "low" | "medium" | "high" | "critical";

// Упрощено до 4 статусов (см. миграцию 004): оплачен / ожидаем / отменён / ошибка.
export type PaymentStatus = "expected" | "paid" | "cancelled" | "error";

export type PaymentMethod =
  | "crypto"
  | "bank_transfer"
  | "card"
  | "paypal"
  | "cash"
  | "other";

export type EntityType =
  | "lead"
  | "client"
  | "deal"
  | "project"
  | "task"
  | "payment"
  | "support_ticket";

export type CommentType =
  | "comment"
  | "call"
  | "no_answer"
  | "agreement"
  | "note"
  | "status_change";

export type SupportStatus =
  | "new"
  | "in_progress"
  | "waiting_client"
  | "waiting_team"
  | "resolved"
  | "closed";

export type SupportPriority = "low" | "medium" | "high" | "urgent";

// ── Таблицы ──────────────────────────────────────────────────

export interface Profile {
  id: UUID;
  auth_user_id: UUID | null;
  full_name: string;
  avatar_url: string | null;
  role: Role;
  telegram_id: number | null;
  telegram_username: string | null;
  status: "active" | "inactive";
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface Lead {
  id: UUID;
  name: string;
  telegram_username: string | null;
  telegram_id: number | null;
  phone: string | null;
  email: string | null;
  source: LeadSource;
  service_interest: string | null;
  budget_min: number | null;
  budget_max: number | null;
  budget_currency: string;
  status: LeadStatus;
  probability: number;
  assigned_to: UUID | null;
  next_action_at: Timestamp | null;
  last_contact_at: Timestamp | null;
  notes: string | null;
  // Дедупликация (миграция 002). Поля nullable/со значениями по умолчанию.
  is_duplicate?: boolean;
  duplicate_of?: UUID | null;
  similarity_score?: number | null;
  // Холодный поиск (миграция 006).
  cold_search?: ColdSearch | null;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface ColdSearch {
  found_at?: string;
  business_type?: string;
  links?: string;
  business_age?: string;
  assets?: string;
  offer?: string;
}

export interface Client {
  id: UUID;
  lead_id: UUID | null;
  name: string;
  company_name: string | null;
  telegram_username: string | null;
  telegram_id: number | null;
  phone: string | null;
  email: string | null;
  country: string | null;
  city: string | null;
  source: string | null;
  status: ClientStatus;
  assigned_to: UUID | null;
  total_paid: number;
  projects_count: number;
  last_contact_at: Timestamp | null;
  last_payment_at: Timestamp | null;
  notes: string | null;
  archived?: boolean;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface Deal {
  id: UUID;
  lead_id: UUID | null;
  client_id: UUID | null;
  title: string;
  service_type: string | null;
  amount: number;
  currency: string;
  stage: DealStage;
  probability: number;
  status: DealStatus;
  assigned_to: UUID | null;
  expected_payment_at: Timestamp | null;
  lost_reason: string | null;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface ProjectStage {
  id: string;
  title: string;
  description: string;
  done: boolean;
  attachments?: ProjectStageAttachment[];
  links?: ProjectStageLink[];
}

export interface ProjectStageAttachment {
  id: string;
  name: string;
  url: string;
  size?: number;
  type?: string;
}

export interface ProjectStageLink {
  id: string;
  label: string;
  url: string;
}

export interface Project {
  id: UUID;
  client_id: UUID | null;
  deal_id: UUID | null;
  title: string;
  project_type: ProjectType | null;
  description: string | null;
  tech_spec: string | null;
  status: ProjectStatus;
  progress: number;
  amount: number;
  paid_amount: number;
  currency: string;
  manager_id: UUID | null;
  developer_id: UUID | null;
  start_date: string | null;
  deadline: string | null;
  github_url: string | null;
  vercel_url: string | null;
  figma_url: string | null;
  supabase_url: string | null;
  telegram_bot_url: string | null;
  staging_url: string | null;
  stages?: ProjectStage[];
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface ChecklistItem {
  id: string;
  text: string;
  done: boolean;
}

export interface Task {
  id: UUID;
  project_id: UUID | null;
  client_id: UUID | null;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: Priority;
  assigned_to: UUID | null;
  created_by: UUID | null;
  due_date: Timestamp | null;
  checklist: ChecklistItem[];
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface Payment {
  id: UUID;
  client_id: UUID | null;
  project_id: UUID | null;
  deal_id: UUID | null;
  amount: number;
  currency: string;
  status: PaymentStatus;
  payment_method: PaymentMethod | null;
  paid_at: Timestamp | null;
  expected_at: Timestamp | null;
  receipt_url: string | null;
  comment: string | null;
  created_by: UUID | null;
  created_at: Timestamp;
}

export type ExpenseCategory =
  | "ads"
  | "contractors"
  | "tools"
  | "salary"
  | "taxes"
  | "other";

export interface Expense {
  id: UUID;
  title: string;
  category: ExpenseCategory;
  amount: number;
  currency: string;
  spent_at: string | null;
  project_id: UUID | null;
  source: string | null;
  comment: string | null;
  created_by: UUID | null;
  created_at: Timestamp;
}

export interface Comment {
  id: UUID;
  entity_type: EntityType;
  entity_id: UUID;
  user_id: UUID | null;
  content: string;
  type: CommentType;
  created_at: Timestamp;
}

export interface Label {
  id: UUID;
  name: string;
  color: string;
  type: "service" | "budget" | "priority" | "custom" | null;
  created_at: Timestamp;
}

export interface EntityLabel {
  id: UUID;
  label_id: UUID;
  entity_type: string;
  entity_id: UUID;
  created_at: Timestamp;
}

export interface SupportTicket {
  id: UUID;
  client_id: UUID | null;
  project_id: UUID | null;
  title: string;
  status: SupportStatus;
  priority: SupportPriority;
  assigned_to: UUID | null;
  source: "telegram" | "manual" | "email";
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface Message {
  id: UUID;
  entity_type: string | null;
  entity_id: UUID | null;
  direction: "in" | "out" | "internal" | null;
  channel: "telegram" | "email" | "manual";
  sender_name: string | null;
  sender_telegram_id: number | null;
  text: string;
  metadata: Record<string, unknown> | null;
  created_at: Timestamp;
}

export interface ActivityLog {
  id: UUID;
  user_id: UUID | null;
  action: string;
  entity_type: string | null;
  entity_id: UUID | null;
  metadata: Record<string, unknown> | null;
  created_at: Timestamp;
}

export interface Setting {
  id: UUID;
  key: string;
  value: unknown;
  updated_at: Timestamp;
}
