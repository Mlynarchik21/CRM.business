import { NextResponse } from "next/server";
import { applyLeadWithDedup } from "@/lib/lead-dedup";
import { createAdminClient } from "@/lib/supabase/server";
import { notifyNewLead } from "@/lib/telegram/internal-bot";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Приёмник лидов от агента холодного поиска (например, parser.py на Google Maps).
 *
 * Ожидаемый JSON (как формирует parser.py):
 *   {
 *     "company_name": "...", "phone": "...", "address": "...",
 *     "rating": "4.5", "maps_url": "https://...",
 *     "niche": "Мебель", "query_source": "кухни на заказ Гродно"
 *   }
 *
 * Принимает один объект или массив объектов. Прогоняет через дедуп,
 * создаёт лид (source: cold) и заполняет поля холодного поиска.
 *
 * Опциональная защита: заголовок `x-intake-secret` сверяется с LEAD_INTAKE_SECRET.
 */

type IntakeLead = {
  company_name?: string;
  phone?: string;
  email?: string;
  telegram_username?: string;
  address?: string;
  rating?: string | number;
  maps_url?: string;
  niche?: string;
  query_source?: string;
  offer?: string;
};

function checkSecret(request: Request): boolean {
  const expected = process.env.LEAD_INTAKE_SECRET;
  if (!expected) return true; // секрет не задан — пропускаем (MVP)
  return request.headers.get("x-intake-secret") === expected;
}

async function ingestOne(
  supabase: ReturnType<typeof createAdminClient>,
  item: IntakeLead,
) {
  const name = (item.company_name || "").trim() || "Без названия";
  const niche = (item.niche || "").trim();
  const note = [
    "Холодный поиск (Google Maps).",
    item.query_source ? `Запрос: ${item.query_source}` : null,
    item.address ? `Адрес: ${item.address}` : null,
    item.rating != null ? `Рейтинг: ${item.rating}` : null,
    item.maps_url ? `Карта: ${item.maps_url}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const res = await applyLeadWithDedup(supabase, {
    name,
    phone: item.phone ?? null,
    email: item.email ?? null,
    telegram_username: item.telegram_username ?? null,
    source: "cold",
    status: "new",
    service_interest: niche || null,
    notes: note,
  });

  if (!res.ok) return { ok: false as const, error: res.error };

  // Поля холодного поиска (best-effort — не падаем, если миграция 006 не применена).
  try {
    await supabase
      .from("leads")
      .update({
        maps_url: item.maps_url ?? null,
        cold_search: {
          found_at: item.query_source ? `Google Maps · ${item.query_source}` : "Google Maps",
          business_type: niche,
          links: item.maps_url ?? "",
          business_age: item.rating != null ? `Рейтинг: ${item.rating}` : "",
          assets: "Нет сайта (найден по карте)",
          offer: (item.offer ?? "").toString(),
        },
      })
      .eq("id", res.result.id);
  } catch {
    // колонки cold_search ещё нет — игнорируем
  }

  // Уведомление команды только о новых лидах (не при слиянии дублей).
  if (res.result.outcome !== "merged") {
    await notifyNewLead({
      id: res.result.id,
      name,
      service_interest: niche || null,
      source: "cold",
      budget_min: null,
      budget_max: null,
    });
  }

  return { ok: true as const, outcome: res.result.outcome, id: res.result.id };
}

export async function POST(request: Request) {
  if (!checkSecret(request)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  let body: IntakeLead | IntakeLead[];
  try {
    body = (await request.json()) as IntakeLead | IntakeLead[];
  } catch {
    return NextResponse.json({ ok: false, error: "invalid json" }, { status: 400 });
  }

  const items = Array.isArray(body) ? body : [body];
  if (items.length === 0) {
    return NextResponse.json({ ok: true, processed: 0 });
  }

  const supabase = createAdminClient();
  const results = { created: 0, merged: 0, flagged: 0, errors: 0 };

  for (const item of items) {
    if (!item || (!item.company_name && !item.phone)) {
      results.errors += 1;
      continue;
    }
    const r = await ingestOne(supabase, item);
    if (!r.ok) {
      results.errors += 1;
      console.error("lead-intake:", r.error);
      continue;
    }
    if (r.outcome === "merged") results.merged += 1;
    else if (r.outcome === "flagged") results.flagged += 1;
    else results.created += 1;
  }

  return NextResponse.json({ ok: true, ...results });
}

/** GET — healthcheck. */
export async function GET() {
  return NextResponse.json({ ok: true, endpoint: "agents/lead-intake" });
}
