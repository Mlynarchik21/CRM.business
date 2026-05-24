/**
 * Дедупликация лидов.
 *
 * Правила (подтверждены заказчиком):
 *  - сходство >= 50%  → СЛИЯНИЕ в существующего лида: заполняем только пустые
 *    поля, ничего не теряем; новый лид не создаётся.
 *  - 0 < сходство < 50% → новый лид создаётся ОТДЕЛЬНО с пометкой `is_duplicate`
 *    и ссылкой `duplicate_of` на оригинал.
 *  - совпадений нет → обычное создание лида.
 *
 * Всё пишется в историю (activity_logs). Если миграция 002 ещё не применена
 * (нет колонок is_duplicate/duplicate_of), код безопасно откатывается к обычному
 * созданию лида — создание лида не ломается.
 */

import { logActivity } from "@/lib/history";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabase = any;

const MERGE_THRESHOLD = 50;

type LeadValues = Record<string, unknown>;

type Candidate = {
  id: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  telegram_username: string | null;
  telegram_id: number | null;
  service_interest: string | null;
  notes: string | null;
  budget_min: number | null;
  budget_max: number | null;
};

type DedupResult = {
  id: string;
  outcome: "created" | "merged" | "flagged" | "created_no_dedup";
  score?: number;
  duplicateOf?: string;
};

// ── Нормализация значений ────────────────────────────────────
function digits(v: unknown): string {
  return typeof v === "string" ? v.replace(/\D/g, "") : "";
}
function lower(v: unknown): string {
  return typeof v === "string" ? v.trim().toLowerCase() : "";
}
function username(v: unknown): string {
  return lower(v).replace(/^@/, "");
}

/** Сходство двух лидов в процентах (0–100). */
export function computeSimilarity(a: LeadValues, b: Candidate): number {
  let score = 0;

  const aPhone = digits(a.phone);
  const bPhone = digits(b.phone);
  if (aPhone && bPhone && aPhone === bPhone) score += 35;

  const aEmail = lower(a.email);
  const bEmail = lower(b.email);
  if (aEmail && bEmail && aEmail === bEmail) score += 35;

  const aUser = username(a.telegram_username);
  const bUser = username(b.telegram_username);
  if (aUser && bUser && aUser === bUser) score += 25;

  if (a.telegram_id != null && b.telegram_id != null && Number(a.telegram_id) === Number(b.telegram_id)) {
    score += 25;
  }

  // Имя — слабый сигнал
  const aName = lower(a.name);
  const bName = lower(b.name);
  if (aName && bName) {
    if (aName === bName) score += 20;
    else if (aName.length >= 3 && (aName.includes(bName) || bName.includes(aName))) score += 12;
  }

  return Math.min(100, score);
}

function insertValues(values: LeadValues): LeadValues {
  // Убираем технические/реляционные поля, которых может не быть в payload.
  const { ...rest } = values;
  return rest;
}

/** Поля, которые можно «дозаполнить» при слиянии (не затирая существующее). */
const FILLABLE: (keyof Candidate)[] = [
  "phone",
  "email",
  "telegram_username",
  "telegram_id",
  "service_interest",
  "budget_min",
  "budget_max",
];

function isEmpty(v: unknown): boolean {
  return v === null || v === undefined || v === "";
}

/**
 * Создаёт лид с учётом дедупликации. `supabase` — любой клиент
 * (cookie-based из server action или admin из вебхука).
 */
export async function applyLeadWithDedup(
  supabase: AnySupabase,
  values: LeadValues,
  opts: { userId?: string | null } = {},
): Promise<{ ok: true; result: DedupResult } | { ok: false; error: string }> {
  const userId = opts.userId ?? null;

  // 1. Ищем кандидатов по совпадающим контактам.
  const orParts: string[] = [];
  const phone = typeof values.phone === "string" ? values.phone : "";
  const email = typeof values.email === "string" ? values.email : "";
  const tgUser = typeof values.telegram_username === "string" ? values.telegram_username : "";
  const tgId = values.telegram_id;

  if (phone) orParts.push(`phone.eq.${phone}`);
  if (email) orParts.push(`email.eq.${email}`);
  if (tgUser) orParts.push(`telegram_username.eq.${tgUser}`);
  if (tgId != null) orParts.push(`telegram_id.eq.${tgId}`);

  let candidates: Candidate[] = [];
  let dedupAvailable = true;

  if (orParts.length > 0) {
    const { data, error } = await supabase
      .from("leads")
      .select(
        "id, name, phone, email, telegram_username, telegram_id, service_interest, notes, budget_min, budget_max, is_duplicate",
      )
      .or(orParts.join(","))
      .limit(25);

    if (error) {
      // Скорее всего нет колонки is_duplicate → миграция 002 не применена.
      dedupAvailable = false;
    } else {
      candidates = ((data ?? []) as (Candidate & { is_duplicate?: boolean })[]).filter(
        (c) => !c.is_duplicate,
      );
    }
  }

  // Если дедуп недоступен — обычное создание без новых колонок.
  if (!dedupAvailable) {
    return plainInsert(supabase, insertValues(values), userId, "created_no_dedup");
  }

  // 2. Лучший кандидат по сходству.
  let best: { cand: Candidate; score: number } | null = null;
  for (const cand of candidates) {
    const score = computeSimilarity(values, cand);
    if (score > 0 && (!best || score > best.score)) best = { cand, score };
  }

  // 3. Нет совпадений — обычное создание.
  if (!best) {
    return plainInsert(supabase, insertValues(values), userId, "created");
  }

  // 4. Сильное совпадение — слияние.
  if (best.score >= MERGE_THRESHOLD) {
    const patch: Record<string, unknown> = {};
    const changed: string[] = [];

    for (const field of FILLABLE) {
      if (isEmpty(best.cand[field]) && !isEmpty(values[field])) {
        patch[field] = values[field];
        changed.push(field);
      }
    }

    // Заметки: если есть и там и там — дописываем, чтобы не потерять контекст.
    const newNotes = typeof values.notes === "string" ? values.notes.trim() : "";
    if (newNotes) {
      if (isEmpty(best.cand.notes)) {
        patch.notes = newNotes;
        changed.push("notes");
      } else if (!String(best.cand.notes).includes(newNotes)) {
        patch.notes = `${best.cand.notes}\n\n— Из повторной заявки:\n${newNotes}`;
        changed.push("notes");
      }
    }

    patch.last_contact_at = new Date().toISOString();

    if (Object.keys(patch).length > 0) {
      await supabase.from("leads").update(patch).eq("id", best.cand.id);
    }

    await logActivity(supabase, {
      action: "lead.merged",
      entityType: "lead",
      entityId: best.cand.id,
      metadata: { score: best.score, fields: changed },
      userId,
    });

    return { ok: true, result: { id: best.cand.id, outcome: "merged", score: best.score } };
  }

  // 5. Слабое совпадение — отдельный лид с пометкой дубля.
  const flagged = await insertLead(supabase, {
    ...insertValues(values),
    is_duplicate: true,
    duplicate_of: best.cand.id,
    similarity_score: best.score,
  });

  if (!flagged.ok) {
    // Не удалось записать колонки дубля → обычное создание.
    return plainInsert(supabase, insertValues(values), userId, "created_no_dedup");
  }

  await logActivity(supabase, {
    action: "lead.created",
    entityType: "lead",
    entityId: flagged.id,
    metadata: { source: values.source },
    userId,
  });
  await logActivity(supabase, {
    action: "lead.duplicate_flagged",
    entityType: "lead",
    entityId: flagged.id,
    metadata: { score: best.score, duplicate_of: best.cand.id },
    userId,
  });

  return {
    ok: true,
    result: { id: flagged.id, outcome: "flagged", score: best.score, duplicateOf: best.cand.id },
  };
}

async function insertLead(
  supabase: AnySupabase,
  values: LeadValues,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const { data, error } = await supabase.from("leads").insert(values).select("id").single();
  if (error) return { ok: false, error: error.message };
  return { ok: true, id: data.id as string };
}

async function plainInsert(
  supabase: AnySupabase,
  values: LeadValues,
  userId: string | null,
  outcome: DedupResult["outcome"],
): Promise<{ ok: true; result: DedupResult } | { ok: false; error: string }> {
  const res = await insertLead(supabase, values);
  if (!res.ok) return { ok: false, error: res.error };

  await logActivity(supabase, {
    action: "lead.created",
    entityType: "lead",
    entityId: res.id,
    metadata: { source: values.source },
    userId,
  });

  return { ok: true, result: { id: res.id, outcome } };
}
