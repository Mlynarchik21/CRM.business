"use server";

import { revalidatePath } from "next/cache";
import { logActivity } from "@/lib/history";
import { createClient } from "@/lib/supabase/server";
import { clientSchema, type ClientFormValues } from "@/lib/validations";

type ActionResult = { ok: true; id?: string } | { ok: false; error: string };

function normalize<T extends Record<string, unknown>>(obj: T) {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined) continue;
    out[k] = v === "" ? null : v;
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

  const payload = normalize(parsed.data);
  const { data, error } = await supabase
    .from("clients")
    .insert({ ...payload, assigned_to: assignedTo })
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };

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
  const { error } = await supabase
    .from("clients")
    .update(normalize(parsed.data))
    .eq("id", id);

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

  revalidatePath(`/clients/${clientId}`);
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
  const { data, error } = await supabase
    .from("clients")
    .insert({
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
    })
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };

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

  revalidatePath("/clients");
  revalidatePath(`/leads/${leadId}`);
  return { ok: true, id: data.id };
}
