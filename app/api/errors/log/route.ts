import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Принимает ошибку от клиентского error-boundary и пишет в error_logs.
 * Best-effort: если таблицы нет (миграция 007 не применена) — тихо игнорируем.
 */
export async function POST(request: Request) {
  let body: { title?: string; detail?: string; route?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const title = (body.title || "Неизвестная ошибка").slice(0, 300);
  const detail = (body.detail || "").slice(0, 5000);
  const route = (body.route || "").slice(0, 300);

  try {
    const supabase = createAdminClient();
    await supabase.from("error_logs").insert({ title, detail, route, status: "open" });
  } catch (e) {
    console.error("errors/log:", e);
  }

  return NextResponse.json({ ok: true });
}
