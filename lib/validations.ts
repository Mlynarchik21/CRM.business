import { z } from "zod";

export const LEAD_SOURCES = [
  "telegram_bot",
  "landing",
  "website",
  "manual",
  "cold",
  "instagram",
  "referral",
  "csv_import",
] as const;

export const LEAD_STATUSES = [
  "new",
  "in_progress",
  "contacted",
  "no_answer",
  "thinking",
  "waiting_proposal",
  "hot",
  "bought",
  "not_bought",
  "postponed",
  "spam",
] as const;

export const CLIENT_STATUSES = [
  "new",
  "active",
  "in_project",
  "on_support",
  "potential_repeat",
  "inactive",
  "problematic",
  "vip",
] as const;

export const PROJECT_TYPES = [
  "landing",
  "website",
  "business_card",
  "link_in_bio",
  "telegram_bot",
  "mini_app",
  "crm",
  "design",
  "support",
  "custom",
] as const;

export const PROJECT_STATUSES = [
  "new",
  "briefing",
  "estimation",
  "in_progress",
  "waiting_materials",
  "review",
  "revisions",
  "waiting_payment",
  "completed",
  "on_support",
  "paused",
  "cancelled",
] as const;

export const DEAL_STAGES = [
  "new_lead",
  "qualification",
  "discussion",
  "proposal",
  "negotiation",
  "waiting_payment",
  "paid",
  "lost",
  "postponed",
] as const;

export const DEAL_STATUSES = ["open", "won", "lost", "postponed"] as const;

export const TASK_STATUSES = [
  "backlog",
  "today",
  "in_progress",
  "review",
  "waiting_client",
  "done",
  "blocked",
] as const;

export const PRIORITIES = ["low", "medium", "high", "critical"] as const;

export const PAYMENT_STATUSES = ["expected", "paid", "cancelled", "error"] as const;

export const PAYMENT_METHODS = [
  "crypto",
  "bank_transfer",
  "card",
  "paypal",
  "cash",
  "other",
] as const;

export const leadSchema = z.object({
  name: z.string().trim().min(1, "Укажите имя"),
  telegram_username: z.string().trim().optional(),
  phone: z.string().trim().optional(),
  email: z
    .union([z.literal(""), z.string().trim().email("Некорректный email")])
    .optional(),
  source: z.enum(LEAD_SOURCES),
  service_interest: z.string().trim().optional(),
  budget_min: z.number().nonnegative().optional(),
  budget_max: z.number().nonnegative().optional(),
  status: z.enum(LEAD_STATUSES),
  probability: z.number().min(0).max(100).optional(),
  notes: z.string().trim().optional(),
});

export const clientSchema = z.object({
  name: z.string().trim().min(1, "Укажите имя"),
  company_name: z.string().trim().optional(),
  telegram_username: z.string().trim().optional(),
  phone: z.string().trim().optional(),
  email: z
    .union([z.literal(""), z.string().trim().email("Некорректный email")])
    .optional(),
  country: z.string().trim().optional(),
  city: z.string().trim().optional(),
  source: z.string().trim().optional(),
  status: z.enum(CLIENT_STATUSES),
  notes: z.string().trim().optional(),
});

export const projectSchema = z.object({
  client_id: z.string().optional(),
  title: z.string().trim().min(1, "Укажите название проекта"),
  project_type: z.enum(PROJECT_TYPES).optional(),
  description: z.string().trim().optional(),
  tech_spec: z.string().trim().optional(),
  status: z.enum(PROJECT_STATUSES),
  progress: z.number().min(0).max(100).optional(),
  amount: z.number().nonnegative().optional(),
  paid_amount: z.number().nonnegative().optional(),
  start_date: z.string().optional(),
  deadline: z.string().optional(),
  github_url: z.string().trim().url("Некорректный URL").or(z.literal("")).optional(),
  vercel_url: z.string().trim().url("Некорректный URL").or(z.literal("")).optional(),
  figma_url: z.string().trim().url("Некорректный URL").or(z.literal("")).optional(),
  supabase_url: z.string().trim().url("Некорректный URL").or(z.literal("")).optional(),
  telegram_bot_url: z.string().trim().url("Некорректный URL").or(z.literal("")).optional(),
  staging_url: z.string().trim().url("Некорректный URL").or(z.literal("")).optional(),
});

export const dealSchema = z.object({
  lead_id: z.string().optional(),
  client_id: z.string().optional(),
  title: z.string().trim().min(1, "Укажите название сделки"),
  service_type: z.string().trim().optional(),
  amount: z.number().nonnegative("Сумма не может быть отрицательной"),
  stage: z.enum(DEAL_STAGES),
  status: z.enum(DEAL_STATUSES),
  probability: z.number().min(0).max(100).optional(),
  expected_payment_at: z.string().optional(),
  lost_reason: z.string().trim().optional(),
});

export const checklistItemSchema = z.object({
  id: z.string(),
  text: z.string(),
  done: z.boolean(),
});

export const taskSchema = z.object({
  title: z.string().trim().min(1, "Укажите название задачи"),
  description: z.string().trim().optional(),
  project_id: z.string().optional(),
  client_id: z.string().optional(),
  status: z.enum(TASK_STATUSES),
  priority: z.enum(PRIORITIES),
  due_date: z.string().optional(),
  checklist: z.array(checklistItemSchema).optional(),
});

export const paymentSchema = z.object({
  client_id: z.string().optional(),
  project_id: z.string().optional(),
  deal_id: z.string().optional(),
  amount: z.number().positive("Сумма должна быть больше нуля"),
  currency: z.string().trim().optional(),
  status: z.enum(PAYMENT_STATUSES),
  payment_method: z.enum(PAYMENT_METHODS).optional(),
  paid_at: z.string().optional(),
  expected_at: z.string().optional(),
  receipt_url: z.string().trim().url("РќРµРєРѕСЂСЂРµРєС‚РЅС‹Р№ URL").or(z.literal("")).optional(),
  comment: z.string().trim().optional(),
});

export const SUPPORT_STATUSES = [
  "new",
  "in_progress",
  "waiting_client",
  "waiting_team",
  "resolved",
  "closed",
] as const;

export const SUPPORT_PRIORITIES = ["low", "medium", "high", "urgent"] as const;

export const SUPPORT_SOURCES = ["telegram", "manual", "email"] as const;

export const supportTicketSchema = z.object({
  title: z.string().trim().min(1, "Укажите тему обращения"),
  client_id: z.string().optional(),
  project_id: z.string().optional(),
  status: z.enum(SUPPORT_STATUSES),
  priority: z.enum(SUPPORT_PRIORITIES),
  source: z.enum(SUPPORT_SOURCES),
});

export type SupportTicketFormValues = z.infer<typeof supportTicketSchema>;

export const EXPENSE_CATEGORIES = [
  "ads",
  "contractors",
  "tools",
  "salary",
  "taxes",
  "other",
] as const;

export const expenseSchema = z.object({
  title: z.string().trim().min(1, "Укажите назначение расхода"),
  category: z.enum(EXPENSE_CATEGORIES),
  amount: z.number().positive("Сумма должна быть больше нуля"),
  currency: z.string().trim().optional(),
  spent_at: z.string().optional(),
  project_id: z.string().optional(),
  source: z.string().trim().optional(),
  comment: z.string().trim().optional(),
});

export type ExpenseFormValues = z.infer<typeof expenseSchema>;

export const ROLES = ["admin", "manager", "developer", "support"] as const;

export const profileSchema = z.object({
  full_name: z.string().trim().min(1, "Укажите имя"),
  role: z.enum(ROLES),
  telegram_username: z.string().trim().optional(),
  status: z.enum(["active", "inactive"]),
});

export const myProfileSchema = z.object({
  full_name: z.string().trim().min(1, "Укажите имя"),
  telegram_username: z.string().trim().optional(),
});

export const labelSchema = z.object({
  name: z.string().trim().min(1, "Укажите название"),
  color: z.string().trim().min(1, "Укажите цвет"),
  type: z.enum(["service", "budget", "priority", "custom"]).optional(),
});

export type ProfileFormValues = z.infer<typeof profileSchema>;
export type MyProfileFormValues = z.infer<typeof myProfileSchema>;
export type LabelFormValues = z.infer<typeof labelSchema>;

export type LeadFormValues = z.infer<typeof leadSchema>;
export type ClientFormValues = z.infer<typeof clientSchema>;
export type ProjectFormValues = z.infer<typeof projectSchema>;
export type DealFormValues = z.infer<typeof dealSchema>;
export type TaskFormValues = z.infer<typeof taskSchema>;
export type PaymentFormValues = z.infer<typeof paymentSchema>;
