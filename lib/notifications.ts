/**
 * Уведомления собираются из уже существующих данных CRM (без отдельной таблицы):
 *   reminder        — просроченные задачи (напоминания)
 *   client          — обращения в поддержку от клиента
 *   lead            — новые заявки (свежие лиды)
 *   payment         — полученные оплаты
 *   payment_problem — проблемы с оплатой (статус «ошибка»)
 *   deadline        — близкие/просроченные сроки по проектам
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabase = any;

export type NotificationType =
  | "reminder"
  | "client"
  | "lead"
  | "payment"
  | "payment_problem"
  | "deadline";

export type NotificationItem = {
  id: string;
  type: NotificationType;
  title: string;
  subtitle: string;
  href: string;
  created_at: string;
};

const DAY = 24 * 60 * 60 * 1000;

/** Лёгкий счётчик «требует внимания» — для значка у админа. */
export async function getNotificationCount(supabase: AnySupabase): Promise<number> {
  const nowIso = new Date().toISOString();
  const in7 = new Date(Date.now() + 7 * DAY).toISOString().slice(0, 10);

  try {
    const [support, problem, deadlines, tasks] = await Promise.all([
      supabase.from("support_tickets").select("*", { count: "exact", head: true }).not("status", "in", "(resolved,closed)"),
      supabase.from("payments").select("*", { count: "exact", head: true }).eq("status", "error"),
      supabase
        .from("projects")
        .select("*", { count: "exact", head: true })
        .not("status", "in", "(completed,cancelled)")
        .not("deadline", "is", null)
        .lte("deadline", in7),
      supabase.from("tasks").select("*", { count: "exact", head: true }).neq("status", "done").lt("due_date", nowIso),
    ]);
    return (support.count ?? 0) + (problem.count ?? 0) + (deadlines.count ?? 0) + (tasks.count ?? 0);
  } catch {
    return 0;
  }
}

function rel(value: unknown): string | null {
  if (Array.isArray(value)) return (value[0] as { name?: string })?.name ?? null;
  if (value && typeof value === "object") return (value as { name?: string }).name ?? null;
  return null;
}

/** Полный список уведомлений для страницы (ограничен по свежести/количеству). */
export async function getNotifications(supabase: AnySupabase): Promise<NotificationItem[]> {
  const now = Date.now();
  const nowIso = new Date().toISOString();
  const since14 = new Date(now - 14 * DAY).toISOString();
  const in7 = new Date(now + 7 * DAY).toISOString().slice(0, 10);

  const [leadsRes, paymentsRes, supportRes, projectsRes, tasksRes] = await Promise.all([
    supabase.from("leads").select("id, name, source, created_at").gte("created_at", since14).order("created_at", { ascending: false }).limit(20),
    supabase.from("payments").select("id, amount, currency, status, created_at, client:clients(name)").order("created_at", { ascending: false }).limit(20),
    supabase.from("support_tickets").select("id, title, status, source, created_at").not("status", "in", "(resolved,closed)").order("created_at", { ascending: false }).limit(20),
    supabase.from("projects").select("id, title, deadline, status").not("status", "in", "(completed,cancelled)").not("deadline", "is", null).lte("deadline", in7).order("deadline", { ascending: true }).limit(20),
    supabase.from("tasks").select("id, title, due_date, status").neq("status", "done").lt("due_date", nowIso).order("due_date", { ascending: true }).limit(20),
  ]);

  const items: NotificationItem[] = [];

  for (const l of leadsRes.data ?? []) {
    items.push({
      id: `lead-${l.id}`,
      type: "lead",
      title: "Новая заявка",
      subtitle: `${l.name ?? "Лид"} · ${l.source ?? ""}`,
      href: `/leads/${l.id}`,
      created_at: l.created_at,
    });
  }

  for (const p of paymentsRes.data ?? []) {
    const isProblem = p.status === "error";
    const isPaid = p.status === "paid";
    if (!isProblem && !isPaid) continue;
    items.push({
      id: `pay-${p.id}`,
      type: isProblem ? "payment_problem" : "payment",
      title: isProblem ? "Проблема оплаты" : "Оплата получена",
      subtitle: `${rel(p.client) ?? "Клиент"} · ${p.amount} ${p.currency ?? "USD"}`,
      href: "/payments",
      created_at: p.created_at,
    });
  }

  for (const s of supportRes.data ?? []) {
    items.push({
      id: `sup-${s.id}`,
      type: "client",
      title: s.source === "telegram" ? "Сообщение от клиента" : "Обращение в поддержку",
      subtitle: s.title ?? "",
      href: "/support",
      created_at: s.created_at,
    });
  }

  for (const pr of projectsRes.data ?? []) {
    const overdue = pr.deadline && new Date(pr.deadline).getTime() < now;
    items.push({
      id: `deal-${pr.id}`,
      type: "deadline",
      title: overdue ? "Просрочен срок по проекту" : "Скоро дедлайн по проекту",
      subtitle: `${pr.title} · ${pr.deadline}`,
      href: `/projects/${pr.id}`,
      created_at: pr.deadline,
    });
  }

  for (const t of tasksRes.data ?? []) {
    items.push({
      id: `task-${t.id}`,
      type: "reminder",
      title: "Просроченная задача",
      subtitle: t.title ?? "",
      href: "/tasks",
      created_at: t.due_date,
    });
  }

  return items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}
