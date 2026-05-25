import type {
  ClientStatus,
  DealStage,
  LeadSource,
  LeadStatus,
  PaymentMethod,
  PaymentStatus,
  Priority,
  ProjectStatus,
  ProjectType,
  SupportPriority,
  SupportStatus,
  TaskStatus,
} from "@/types";

export const PRIMARY_PROJECT_STATUSES = [
  "in_progress",
  "paused",
  "completed",
  "cancelled",
] as const;

export const COLORS = {
  bgMain: "#000000",
  bgSecondary: "#0B0B0D",
  bgCard: "#141416",
  bgCardElevated: "#1B1B1F",
  border: "#2A2A2E",
  textPrimary: "#FFFFFF",
  textSecondary: "#A1A1AA",
  textMuted: "#6B7280",
  accentGreen: "#22C55E",
  accentPurple: "#8B5CF6",
  accentOrange: "#F97316",
  danger: "#EF4444",
  warning: "#F59E0B",
} as const;

export const NAV_ITEMS = [
  { href: "/", label: "Дашборд", icon: "LayoutDashboard" },
  { href: "/leads", label: "Лиды", icon: "Target" },
  { href: "/clients", label: "Клиенты", icon: "Users" },
  { href: "/deals", label: "Сделки", icon: "Handshake" },
  { href: "/projects", label: "Проекты", icon: "FolderKanban" },
  { href: "/tasks", label: "Задачи", icon: "ListChecks" },
  { href: "/payments", label: "Оплаты", icon: "Wallet" },
  { href: "/support", label: "Поддержка", icon: "LifeBuoy" },
  { href: "/analytics", label: "Аналитика", icon: "BarChart3" },
  { href: "/team", label: "Команда", icon: "UsersRound" },
  { href: "/notifications", label: "Уведомления", icon: "Bell" },
  { href: "/agents", label: "Агенты", icon: "Bot" },
  { href: "/marketing", label: "Маркетинг", icon: "Megaphone" },
  { href: "/settings", label: "Настройки", icon: "Settings" },
] as const;

type StatusConfig<T extends string> = Record<T, { label: string; color: string }>;

export const LEAD_STATUS: StatusConfig<LeadStatus> = {
  new: { label: "Новый", color: COLORS.accentGreen },
  in_progress: { label: "В работе", color: COLORS.accentPurple },
  contacted: { label: "Связались", color: COLORS.accentPurple },
  no_answer: { label: "Не дозвонился", color: COLORS.warning },
  thinking: { label: "Думает", color: COLORS.warning },
  waiting_proposal: { label: "Ждёт предложение", color: COLORS.warning },
  hot: { label: "Горячий", color: COLORS.danger },
  bought: { label: "Купил", color: COLORS.accentGreen },
  not_bought: { label: "Не потенциальный", color: COLORS.textMuted },
  postponed: { label: "Отложен", color: COLORS.textMuted },
  spam: { label: "Спам", color: COLORS.danger },
};

export const CLIENT_STATUS: StatusConfig<ClientStatus> = {
  new: { label: "Новый", color: COLORS.accentGreen },
  active: { label: "Активный", color: COLORS.accentGreen },
  in_project: { label: "В проекте", color: COLORS.accentPurple },
  on_support: { label: "На поддержке", color: COLORS.accentPurple },
  potential_repeat: { label: "Повторная продажа", color: COLORS.warning },
  inactive: { label: "Неактивный", color: COLORS.textMuted },
  problematic: { label: "Проблемный", color: COLORS.danger },
  vip: { label: "VIP", color: COLORS.warning },
};

export const DEAL_STAGE: StatusConfig<DealStage> = {
  new_lead: { label: "Новый лид", color: COLORS.textMuted },
  qualification: { label: "Квалификация", color: COLORS.accentPurple },
  discussion: { label: "Обсуждение", color: COLORS.accentPurple },
  proposal: { label: "Предложение", color: COLORS.warning },
  negotiation: { label: "Переговоры", color: COLORS.warning },
  waiting_payment: { label: "Ждём оплату", color: COLORS.accentOrange },
  paid: { label: "Оплачено", color: COLORS.accentGreen },
  lost: { label: "Проигран", color: COLORS.danger },
  postponed: { label: "Отложен", color: COLORS.textMuted },
};

export const PROJECT_STATUS: StatusConfig<ProjectStatus> = {
  new: { label: "Новый", color: COLORS.textMuted },
  briefing: { label: "Бриф", color: COLORS.accentPurple },
  estimation: { label: "Оценка", color: COLORS.accentPurple },
  in_progress: { label: "В работе", color: COLORS.accentGreen },
  waiting_materials: { label: "Ждём материалы", color: COLORS.warning },
  review: { label: "Ревью", color: COLORS.warning },
  revisions: { label: "Правки", color: COLORS.accentOrange },
  waiting_payment: { label: "Ждём оплату", color: COLORS.accentOrange },
  completed: { label: "Завершён", color: COLORS.accentGreen },
  on_support: { label: "Поддержка", color: COLORS.accentPurple },
  paused: { label: "На паузе", color: COLORS.textMuted },
  cancelled: { label: "Отменён", color: COLORS.danger },
};

export function getPrimaryProjectStatus(
  status: ProjectStatus,
): (typeof PRIMARY_PROJECT_STATUSES)[number] {
  switch (status) {
    case "paused":
      return "paused";
    case "completed":
      return "completed";
    case "cancelled":
      return "cancelled";
    default:
      return "in_progress";
  }
}

export const TASK_STATUS: StatusConfig<TaskStatus> = {
  backlog: { label: "Бэклог", color: COLORS.textMuted },
  today: { label: "Сегодня", color: COLORS.accentGreen },
  in_progress: { label: "В работе", color: COLORS.accentPurple },
  review: { label: "Ревью", color: COLORS.warning },
  waiting_client: { label: "Ждём клиента", color: COLORS.accentOrange },
  done: { label: "Готово", color: COLORS.accentGreen },
  blocked: { label: "Заблокирована", color: COLORS.danger },
};

export const PAYMENT_STATUS: StatusConfig<PaymentStatus> = {
  expected: { label: "Ожидаем", color: COLORS.warning },
  paid: { label: "Оплачен", color: COLORS.accentGreen },
  cancelled: { label: "Отменён", color: COLORS.textMuted },
  error: { label: "Ошибка", color: COLORS.danger },
};

/** Безопасный доступ к метаданным статуса оплаты (на случай старых значений до миграции 004). */
export function getPaymentStatusMeta(status: string): { label: string; color: string } {
  return (
    (PAYMENT_STATUS as Record<string, { label: string; color: string }>)[status] ?? {
      label: status,
      color: COLORS.textMuted,
    }
  );
}

export const SUPPORT_STATUS: StatusConfig<SupportStatus> = {
  new: { label: "Новый", color: COLORS.accentGreen },
  in_progress: { label: "В работе", color: COLORS.accentPurple },
  waiting_client: { label: "Ждём клиента", color: COLORS.accentOrange },
  waiting_team: { label: "Ждём команду", color: COLORS.warning },
  resolved: { label: "Решён", color: COLORS.accentGreen },
  closed: { label: "Закрыт", color: COLORS.textMuted },
};

export const SUPPORT_PRIORITY: StatusConfig<SupportPriority> = {
  low: { label: "Низкий", color: COLORS.textMuted },
  medium: { label: "Средний", color: COLORS.accentPurple },
  high: { label: "Высокий", color: COLORS.accentOrange },
  urgent: { label: "Срочный", color: COLORS.danger },
};

export const PRIORITY: StatusConfig<Priority> = {
  low: { label: "Низкий", color: COLORS.textMuted },
  medium: { label: "Средний", color: COLORS.accentPurple },
  high: { label: "Высокий", color: COLORS.accentOrange },
  critical: { label: "Критичный", color: COLORS.danger },
};

export const LEAD_SOURCE_LABEL: Record<LeadSource, string> = {
  telegram_bot: "Telegram бот",
  landing: "Лендинг",
  website: "Сайт",
  manual: "Вручную",
  cold: "Холодный поиск",
  instagram: "Instagram",
  referral: "Рекомендация",
  csv_import: "Импорт CSV",
};

export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  crypto: "Криптовалюта",
  bank_transfer: "Банковский перевод",
  card: "Карта",
  paypal: "PayPal",
  cash: "Наличные",
  other: "Другое",
};

export const EXPENSE_CATEGORY_LABEL: Record<string, string> = {
  ads: "Реклама",
  contractors: "Подрядчики",
  tools: "Инструменты / подписки",
  salary: "Зарплата",
  taxes: "Налоги / комиссии",
  other: "Прочее",
};

export const PROJECT_TYPE_LABEL: Record<ProjectType, string> = {
  landing: "Лендинг",
  website: "Сайт",
  business_card: "Визитка",
  link_in_bio: "Link in bio",
  telegram_bot: "Telegram бот",
  mini_app: "Mini App",
  crm: "CRM",
  design: "Дизайн",
  support: "Поддержка",
  custom: "Другое",
};

export const BOT_SERVICE_OPTIONS = [
  "Сайт",
  "Лендинг",
  "Telegram бот",
  "Mini App",
  "Дизайн",
  "Другое",
] as const;

export const BOT_BUDGET_OPTIONS = [
  { label: "До $300", min: 0, max: 300 },
  { label: "$300-500", min: 300, max: 500 },
  { label: "$500-1000", min: 500, max: 1000 },
  { label: "$1000+", min: 1000, max: null },
  { label: "Обсудим", min: null, max: null },
] as const;

export const DEFAULT_CURRENCY = "USD";

// ── Настройки внешнего вида ───────────────────────────────────
// HSL-значения подставляются в --primary / --ring (см. dashboard layout).
export type AccentKey = "green" | "purple" | "orange" | "blue" | "red";

export const ACCENT_PRESETS: Record<
  AccentKey,
  { label: string; hex: string; hsl: string }
> = {
  green: { label: "Зелёный", hex: "#22C55E", hsl: "142 71% 45%" },
  purple: { label: "Фиолетовый", hex: "#8B5CF6", hsl: "258 90% 66%" },
  orange: { label: "Оранжевый", hex: "#F97316", hsl: "25 95% 53%" },
  blue: { label: "Синий", hex: "#3B82F6", hsl: "217 91% 60%" },
  red: { label: "Красный", hex: "#EF4444", hsl: "0 84% 60%" },
};

export const DEFAULT_ACCENT: AccentKey = "green";
export type DensityKey = "comfortable" | "compact";
