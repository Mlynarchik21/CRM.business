"use server";

import { revalidatePath } from "next/cache";
import { applyLeadWithDedup } from "@/lib/lead-dedup";
import { logActivity } from "@/lib/history";
import { createClient } from "@/lib/supabase/server";
import { notifyNewLead } from "@/lib/telegram/internal-bot";
import { leadSchema, type LeadFormValues } from "@/lib/validations";
import type { LeadStatus } from "@/types";

type ActionResult = { ok: true; id?: string } | { ok: false; error: string };

function normalize<T extends Record<string, unknown>>(obj: T) {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined) continue;
    out[key] = value === "" ? null : value;
  }
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

export async function createLead(input: LeadFormValues): Promise<ActionResult> {
  const parsed = leadSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Ошибка валидации",
    };
  }

  const supabase = createClient();
  const assignedTo = await currentProfileId(supabase);

  const values = { ...normalize(parsed.data), assigned_to: assignedTo };
  const res = await applyLeadWithDedup(supabase, values, { userId: assignedTo });

  if (!res.ok) return { ok: false, error: res.error };

  const { result } = res;

  // Уведомляем команду только если создан новый лид (не при слиянии).
  if (result.outcome !== "merged") {
    await notifyNewLead({
      id: result.id,
      name: parsed.data.name,
      service_interest: parsed.data.service_interest ?? null,
      source: parsed.data.source,
      budget_min: parsed.data.budget_min ?? null,
      budget_max: parsed.data.budget_max ?? null,
    });
  }

  revalidatePath("/leads");
  revalidatePath("/");
  revalidatePath(`/leads/${result.id}`);
  return { ok: true, id: result.id };
}

export async function updateLead(
  id: string,
  input: LeadFormValues,
): Promise<ActionResult> {
  const parsed = leadSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Ошибка валидации",
    };
  }

  const supabase = createClient();
  const { error } = await supabase
    .from("leads")
    .update(normalize(parsed.data))
    .eq("id", id);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/");
  revalidatePath("/analytics");

  await logActivity(supabase, {
    action: "lead.updated",
    entityType: "lead",
    entityId: id,
    userId: await currentProfileId(supabase),
  });

  revalidatePath("/leads");
  revalidatePath(`/leads/${id}`);
  revalidatePath("/");
  return { ok: true, id };
}

export async function setLeadStatus(
  id: string,
  status: LeadStatus,
): Promise<ActionResult> {
  const supabase = createClient();
  const { error } = await supabase
    .from("leads")
    .update({ status, last_contact_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return { ok: false, error: error.message };

  await logActivity(supabase, {
    action: "lead.status_changed",
    entityType: "lead",
    entityId: id,
    metadata: { to: status },
    userId: await currentProfileId(supabase),
  });

  revalidatePath("/leads");
  revalidatePath(`/leads/${id}`);
  revalidatePath("/");
  return { ok: true, id };
}

export async function updateLeadColdSearch(
  id: string,
  data: Record<string, string>,
): Promise<ActionResult> {
  const supabase = createClient();

  const clean: Record<string, string> = {};
  for (const key of ["found_at", "business_type", "links", "business_age", "assets", "offer"]) {
    clean[key] = String(data[key] ?? "");
  }

  const { error } = await supabase.from("leads").update({ cold_search: clean }).eq("id", id);

  if (error) {
    if (/cold_search/.test(error.message) && /column/i.test(error.message)) {
      return { ok: false, error: "Применте миграцию 006 (поле cold_search) в Supabase." };
    }
    return { ok: false, error: error.message };
  }

  await logActivity(supabase, {
    action: "lead.updated",
    entityType: "lead",
    entityId: id,
    metadata: { section: "cold_search" },
    userId: await currentProfileId(supabase),
  });

  revalidatePath(`/leads/${id}`);
  return { ok: true, id };
}

export async function addLeadComment(
  leadId: string,
  content: string,
): Promise<ActionResult> {
  const text = content.trim();
  if (!text) return { ok: false, error: "Пустой комментарий" };

  const supabase = createClient();
  const userId = await currentProfileId(supabase);

  const { error } = await supabase.from("comments").insert({
    entity_type: "lead",
    entity_id: leadId,
    user_id: userId,
    content: text,
    type: "comment",
  });

  if (error) return { ok: false, error: error.message };

  // Фиксируем последнее взаимодействие.
  await supabase
    .from("leads")
    .update({ last_contact_at: new Date().toISOString() })
    .eq("id", leadId);

  revalidatePath(`/leads/${leadId}`);
  revalidatePath("/leads");
  return { ok: true };
}
