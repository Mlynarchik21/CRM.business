import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TABLES = [
  "profiles",
  "leads",
  "clients",
  "deals",
  "projects",
  "tasks",
  "payments",
  "support_tickets",
  "comments",
  "labels",
  "entity_labels",
  "expenses",
  "activity_logs",
  "settings",
];

/**
 * Резервная копия данных CRM в JSON (для скачивания/копирования).
 * Доступно залогиненному пользователю (RLS — authenticated). Отсутствующие
 * таблицы (не применённые миграции) просто пропускаются.
 */
export async function GET() {
  const supabase = createClient();

  // Защита: только для авторизованных.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const tables: Record<string, unknown[]> = {};
  for (const t of TABLES) {
    const { data, error } = await supabase.from(t).select("*");
    tables[t] = error ? [] : (data ?? []);
  }

  const body = JSON.stringify(
    { exported_at: new Date().toISOString(), tables },
    null,
    2,
  );

  return new NextResponse(body, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="crm-backup-${new Date().toISOString().slice(0, 10)}.json"`,
    },
  });
}
