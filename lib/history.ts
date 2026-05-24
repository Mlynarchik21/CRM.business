/**
 * История изменений (audit trail) поверх таблицы activity_logs.
 * Запись best-effort: ошибки логируются, но никогда не ломают основной поток.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabase = any;

export type ActivityAction =
  | "lead.created"
  | "lead.merged"
  | "lead.duplicate_flagged"
  | "lead.status_changed"
  | "lead.updated"
  | "lead.converted_to_client"
  | "client.created_from_lead"
  | "client.created"
  | "client.updated"
  | "deal.converted_to_project"
  | "project.created_from_deal"
  | "support.ticket_created";

export type HistoryEntry = {
  id: string;
  action: string;
  label: string;
  detail: string | null;
  created_at: string;
  author: string | null;
};

export async function logActivity(
  supabase: AnySupabase,
  params: {
    action: ActivityAction;
    entityType: "lead" | "client" | "support_ticket" | "deal" | "project";
    entityId: string;
    metadata?: Record<string, unknown>;
    userId?: string | null;
  },
): Promise<void> {
  try {
    await supabase.from("activity_logs").insert({
      action: params.action,
      entity_type: params.entityType,
      entity_id: params.entityId,
      metadata: params.metadata ?? {},
      user_id: params.userId ?? null,
    });
  } catch (error) {
    console.error("logActivity failed", error);
  }
}

/** Человекочитаемое описание события для таймлайна. */
export function describeActivity(
  action: string,
  metadata: Record<string, unknown> | null,
): { label: string; detail: string | null } {
  const m = metadata ?? {};
  switch (action) {
    case "lead.created":
      return { label: "Лид зарегистрирован", detail: sourceDetail(m) };
    case "lead.merged":
      return {
        label: "Объединён с существующим лидом",
        detail:
          typeof m.score === "number"
            ? `Сходство ${m.score}% · обновлены поля: ${fieldsDetail(m)}`
            : fieldsDetail(m),
      };
    case "lead.duplicate_flagged":
      return {
        label: "Помечен как дубль",
        detail:
          typeof m.score === "number"
            ? `Сходство ${m.score}% с лидом ${shortId(m.duplicate_of)}`
            : null,
      };
    case "lead.status_changed":
      return {
        label: "Смена статуса",
        detail: m.to ? `→ ${String(m.to)}` : null,
      };
    case "lead.updated":
      return { label: "Лид отредактирован", detail: null };
    case "client.created_from_lead":
      return { label: "Создан клиент из лида", detail: null };
    case "support.ticket_created":
      return {
        label: "Обращение в поддержку",
        detail: typeof m.title === "string" ? m.title : null,
      };
    default:
      return { label: action, detail: null };
  }
}

function sourceDetail(m: Record<string, unknown>): string | null {
  return typeof m.source === "string" ? `Источник: ${m.source}` : null;
}
function fieldsDetail(m: Record<string, unknown>): string {
  return Array.isArray(m.fields) && m.fields.length ? m.fields.join(", ") : "—";
}
function shortId(v: unknown): string {
  return typeof v === "string" ? `#${v.slice(0, 8)}` : "";
}

/**
 * Таймлайн событий для набора сущностей (например, клиент + его исходный лид).
 * Возвращает события, отсортированные по времени (новые сверху).
 */
export async function getHistory(
  supabase: AnySupabase,
  ids: string[],
): Promise<HistoryEntry[]> {
  const cleanIds = ids.filter(Boolean);
  if (cleanIds.length === 0) return [];

  try {
    const { data, error } = await supabase
      .from("activity_logs")
      .select("id, action, metadata, created_at, author:profiles(full_name)")
      .in("entity_id", cleanIds)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error || !data) return [];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (data as any[]).map((row) => {
      const described = describeActivity(
        row.action as string,
        (row.metadata ?? null) as Record<string, unknown> | null,
      );
      const author = Array.isArray(row.author)
        ? (row.author[0]?.full_name ?? null)
        : (row.author?.full_name ?? null);
      return {
        id: row.id as string,
        action: row.action as string,
        label: described.label,
        detail: described.detail,
        created_at: row.created_at as string,
        author,
      };
    });
  } catch (error) {
    console.error("getHistory failed", error);
    return [];
  }
}
