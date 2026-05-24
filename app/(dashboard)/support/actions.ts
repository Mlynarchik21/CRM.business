"use server";

import { revalidatePath } from "next/cache";
import { logActivity } from "@/lib/history";
import { createClient } from "@/lib/supabase/server";
import {
  supportTicketSchema,
  type SupportTicketFormValues,
} from "@/lib/validations";
import type { SupportStatus } from "@/types";

type ActionResult = { ok: true; id?: string } | { ok: false; error: string };

function normalize<T extends Record<string, unknown>>(obj: T) {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined) continue;
    out[key] = value === "" ? null : value;
  }
  return out;
}

export async function createSupportTicket(
  input: SupportTicketFormValues,
): Promise<ActionResult> {
  const parsed = supportTicketSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Ошибка валидации" };
  }

  const supabase = createClient();
  const payload = normalize(parsed.data);
  const { data, error } = await supabase
    .from("support_tickets")
    .insert(payload)
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };

  // История: если обращение привязано к клиенту — фиксируем в его таймлайне.
  if (payload.client_id) {
    await logActivity(supabase, {
      action: "support.ticket_created",
      entityType: "client",
      entityId: payload.client_id as string,
      metadata: { title: parsed.data.title, ticket_id: data.id },
    });
  }

  revalidatePath("/support");
  revalidatePath("/");
  return { ok: true, id: data.id };
}

export async function updateSupportTicket(
  id: string,
  input: SupportTicketFormValues,
): Promise<ActionResult> {
  const parsed = supportTicketSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Ошибка валидации" };
  }

  const supabase = createClient();
  const { error } = await supabase
    .from("support_tickets")
    .update(normalize(parsed.data))
    .eq("id", id);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/support");
  return { ok: true, id };
}

export async function setSupportStatus(
  id: string,
  status: SupportStatus,
): Promise<ActionResult> {
  const supabase = createClient();
  const { error } = await supabase
    .from("support_tickets")
    .update({ status })
    .eq("id", id);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/support");
  return { ok: true, id };
}
