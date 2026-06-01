"use server";

import { revalidatePath } from "next/cache";
import { logActivity } from "@/lib/history";
import { createClient } from "@/lib/supabase/server";
import { clientSchema, type ClientFormValues } from "@/lib/validations";
import type { ClientStatus } from "@/types";

type ActionResult = { ok: true; id?: string } | { ok: false; error: string };

function normalize<T extends Record<string, unknown>>(obj: T) {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined) continue;
    out[k] = v === "" ? null : v;
  }
  return out;
}

// Поля из миграции 009 — если её ещё не применили, отбрасываем их и сохраняем остальное.
const FIELDS_009 = ["decision_maker", "extra_phone", "maps_url", "links"];
function isMissingColumn(msg?: string) {
  return !!msg && (/schema cache/i.test(msg) || /column/i.test(msg));
}
function stripNewFields(obj: Record<string, unknown>) {
  const out = { ...obj };
  for (const k of FIELDS_009) delete out[k];
  return out;
}

async function currentProfileId(
  supabase: ReturnType<typeof createClient>,
): Promise<string | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("id")
    .eq("auth_user_id", user.id)
    .maybeSingle<{ id: string }>();

  return data?.id ?? null;
}

export async function createClientRecord(
  input: ClientFormValues,
): Promise<ActionResult> {
  const parsed = clientSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Ошибка валидации",
    };
  }

  const supabase = createClient();
  const assignedTo = await currentProfileId(supabase);

  const payload = { ...normalize(parsed.data), assigned_to: assignedTo };
  let { data, error } = await supabase.from("clients").insert(payload).select("id").single();

  // Фолбэк: миграция 009 не применена — сохраняем без новых полей.
  if (error && isMissingColumn(error.message)) {
    ({ data, error } = await supabase
      .from("clients")
      .insert(stripNewFields(payload))
      .select("id")
      .single());
  }

  if (error || !data) return { ok: false, error: error?.message ?? "Ошибка" };

  revalidatePath(`/clients/${data.id}`);
  revalidatePath("/clients");
  revalidatePath("/");
  revalidatePath("/analytics");
  return { ok: true, id: data.id };
}

export async function updateClientRecord(
  id: string,
  input: ClientFormValues,
): Promise<ActionResult> {
  const parsed = clientSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Ошибка валидации",
    };
  }

  const supabase = createClient();
  const payload = normalize(parsed.data);
  let { error } = await supabase.from("clients").update(payload).eq("id", id);

  // Фолбэк: миграция 009 не применена — сохраняем без новых полей.
  if (error && isMissingColumn(error.message)) {
    ({ error } = await supabase.from("clients").update(stripNewFields(payload)).eq("id", id));
  }

  if (error) return { ok: false, error: error.message };

  revalidatePath("/clients");
  revalidatePath(`/clients/${id}`);
  revalidatePath("/");
  revalidatePath("/analytics");
  return { ok: true, id };
}

export async function updateClientNotes(
  id: string,
  notes: string,
): Promise<ActionResult> {
  const supabase = createClient();
  const { error } = await supabase
    .from("clients")
    .update({ notes: notes.trim() || null })
    .eq("id", id);

  if (error) return { ok: false, error: error.message };

  revalidatePath(`/clients/${id}`);
  revalidatePath("/clients");
  return { ok: true, id };
}

export async function setClientArchived(
  id: string,
  archived: boolean,
): Promise<ActionResult> {
  const supabase = createClient();
  const { error } = await supabase.from("clients").update({ archived }).eq("id", id);

  if (error) {
    if (/archived/.test(error.message) && /column/i.test(error.message)) {
      return { ok: false, error: "Применте миграцию 008 (поле archived) в Supabase." };
    }
    return { ok: false, error: error.message };
  }

  revalidatePath("/clients");
  revalidatePath(`/clients/${id}`);
  revalidatePath("/");
  return { ok: true, id };
}

export async function deleteClientRecord(id: string): Promise<ActionResult> {
  const supabase = createClient();
  const { error } = await supabase.from("clients").delete().eq("id", id);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/clients");
  revalidatePath("/");
  return { ok: true };
}

export async function addClientComment(
  clientId: string,
  content: string,
): Promise<ActionResult> {
  const text = content.trim();
  if (!text) return { ok: false, error: "Пустой комментарий" };

  const supabase = createClient();
  const userId = await currentProfileId(supabase);

  const { error } = await supabase.from("comments").insert({
    entity_type: "client",
    entity_id: clientId,
    user_id: userId,
    content: text,
    type: "comment",
  });

  if (error) return { ok: false, error: error.message };

  // Фиксируем последнее взаимодействие.
  await supabase
    .from("clients")
    .update({ last_contact_at: new Date().toISOString() })
    .eq("id", clientId);

  revalidatePath(`/clients/${clientId}`);
  revalidatePath("/clients");
  return { ok: true };
}

export async function createClientFromLead(leadId: string): Promise<ActionResult> {
  const supabase = createClient();

  const { data: lead, error: leadError } = await supabase
    .from("leads")
    .select("*")
    .eq("id", leadId)
    .maybeSingle<{
      id: string;
      name: string;
      telegram_username: string | null;
      telegram_id: number | null;
      phone: string | null;
      email: string | null;
      source: string | null;
      notes: string | null;
      last_contact_at: string | null;
      extra_phone: string | null;
      decision_maker: string | null;
      maps_url: string | null;
    }>();

  if (leadError || !lead) {
    return { ok: false, error: "Лид не найден" };
  }

  const { data: existing } = await supabase
    .from("clients")
    .select("id")
    .eq("lead_id", leadId)
    .maybeSingle<{ id: string }>();

  if (existing) {
    return { ok: true, id: existing.id };
  }

  const assignedTo = await currentProfileId(supabase);
  const clientPayload: Record<string, unknown> = {
    lead_id: lead.id,
    name: lead.name,
    telegram_username: lead.telegram_username,
    telegram_id: lead.telegram_id,
    phone: lead.phone,
    email: lead.email,
    source: lead.source,
    notes: lead.notes,
    assigned_to: assignedTo,
    status: "new",
    // Переносим последнее взаимодействие и доп. контакты лида.
    last_contact_at: lead.last_contact_at ?? null,
    extra_phone: lead.extra_phone ?? null,
    decision_maker: lead.decision_maker ?? null,
    maps_url: lead.maps_url ?? null,
  };

  let { data, error } = await supabase.from("clients").insert(clientPayload).select("id").single();

  // Фолбэк: миграция 009 не применена — без новых полей.
  if (error && isMissingColumn(error.message)) {
    ({ data, error } = await supabase
      .from("clients")
      .insert(stripNewFields(clientPayload))
      .select("id")
      .single());
  }

  if (error || !data) return { ok: false, error: error?.message ?? "Ошибка" };

  await supabase
    .from("leads")
    .update({ status: "bought", last_contact_at: new Date().toISOString() })
    .eq("id", leadId);

  // История: фиксируем конвертацию и на клиенте, и на исходном лиде.
  await logActivity(supabase, {
    action: "client.created_from_lead",
    entityType: "client",
    entityId: data.id,
    metadata: { lead_id: leadId },
    userId: assignedTo,
  });
  await logActivity(supabase, {
    action: "client.created_from_lead",
    entityType: "lead",
    entityId: leadId,
    metadata: { client_id: data.id },
    userId: assignedTo,
  });

  revalidatePath("/leads");
  revalidatePath("/clients");
  revalidatePath(`/leads/${leadId}`);
  revalidatePath("/");
  return { ok: true, id: data.id };
}

export async function bulkSetClientStatus(
  ids: string[],
  status: ClientStatus,
): Promise<ActionResult> {
  if (ids.length === 0) {
    return { ok: false, error: "Выберите хотя бы одного клиента" };
  }
  if (ids.length > 2) {
    return { ok: false, error: "Можно выбрать не более 2 клиентов" };
  }

  const supabase = createClient();
  const userId = await currentProfileId(supabase);
  const now = new Date().toISOString();

  const { error } = await supabase
    .from("clients")
    .update({ status, last_contact_at: now })
    .in("id", ids);

  if (error) return { ok: false, error: error.message };

  await Promise.all(
    ids.map((id) =>
      logActivity(supabase, {
        action: "client.updated",
        entityType: "client",
        entityId: id,
        metadata: { status, bulk: true },
        userId,
      }),
    ),
  );

  revalidatePath("/clients");
  revalidatePath("/");
  for (const id of ids) revalidatePath(`/clients/${id}`);
  return { ok: true };
}
