"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { dealSchema, type DealFormValues } from "@/lib/validations";

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

export async function createDealRecord(
  input: DealFormValues,
): Promise<ActionResult> {
  const parsed = dealSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Ошибка валидации",
    };
  }

  const supabase = createClient();
  const assignedTo = await currentProfileId(supabase);

  const { data, error } = await supabase
    .from("deals")
    .insert({ ...normalize(parsed.data), assigned_to: assignedTo })
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };

  revalidatePath("/deals");
  revalidatePath("/");
  return { ok: true, id: data.id };
}

export async function updateDealRecord(
  id: string,
  input: DealFormValues,
): Promise<ActionResult> {
  const parsed = dealSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Ошибка валидации",
    };
  }

  const supabase = createClient();
  const { error } = await supabase
    .from("deals")
    .update(normalize(parsed.data))
    .eq("id", id);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/deals");
  revalidatePath(`/deals/${id}`);
  return { ok: true, id };
}

export async function moveDealStage(
  id: string,
  stage: DealFormValues["stage"],
): Promise<ActionResult> {
  const supabase = createClient();
  const patch: Record<string, unknown> = { stage };

  if (stage === "paid") {
    patch.status = "won";
  } else if (stage === "lost") {
    patch.status = "lost";
  } else if (stage === "postponed") {
    patch.status = "postponed";
  } else {
    patch.status = "open";
  }

  const { error } = await supabase.from("deals").update(patch).eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/deals");
  revalidatePath(`/deals/${id}`);
  revalidatePath("/");
  return { ok: true, id };
}

export async function addDealComment(
  dealId: string,
  content: string,
): Promise<ActionResult> {
  const text = content.trim();
  if (!text) return { ok: false, error: "Пустой комментарий" };

  const supabase = createClient();
  const userId = await currentProfileId(supabase);

  const { error } = await supabase.from("comments").insert({
    entity_type: "deal",
    entity_id: dealId,
    user_id: userId,
    content: text,
    type: "comment",
  });

  if (error) return { ok: false, error: error.message };

  revalidatePath(`/deals/${dealId}`);
  return { ok: true };
}

export async function convertDealToProject(
  dealId: string,
): Promise<ActionResult> {
  const supabase = createClient();
  const managerId = await currentProfileId(supabase);

  const { data: existingProject } = await supabase
    .from("projects")
    .select("id")
    .eq("deal_id", dealId)
    .maybeSingle<{ id: string }>();

  if (existingProject) {
    return { ok: true, id: existingProject.id };
  }

  const { data: deal, error: dealError } = await supabase
    .from("deals")
    .select("id, client_id, title, service_type, amount")
    .eq("id", dealId)
    .maybeSingle<{
      id: string;
      client_id: string | null;
      title: string;
      service_type: string | null;
      amount: number;
    }>();

  if (dealError || !deal) {
    return { ok: false, error: dealError?.message ?? "Сделка не найдена" };
  }

  const { data: project, error } = await supabase
    .from("projects")
    .insert({
      deal_id: deal.id,
      client_id: deal.client_id,
      title: deal.title,
      description: deal.service_type
        ? `Создано из сделки. Услуга: ${deal.service_type}`
        : "Создано из сделки.",
      amount: deal.amount,
      manager_id: managerId,
      status: "new",
      progress: 0,
    })
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };

  // Добавляем системный комментарий к сделке о конвертации (best-effort)
  const userId = await currentProfileId(supabase);
  supabase.from("comments").insert({
    entity_type: "deal",
    entity_id: deal.id,
    user_id: userId,
    content: "✅ Сделка конвертирована в проект",
    type: "system",
  }); // Fire-and-forget, не блокируем основное действие

  revalidatePath("/deals");
  revalidatePath(`/deals/${dealId}`);
  revalidatePath("/projects");
  revalidatePath("/");
  revalidatePath("/analytics");
  return { ok: true, id: project.id };
}
