"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { taskSchema, type TaskFormValues } from "@/lib/validations";
import type { ChecklistItem, TaskStatus } from "@/types";

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

export async function createTaskRecord(
  input: TaskFormValues,
): Promise<ActionResult> {
  const parsed = taskSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Ошибка валидации",
    };
  }

  const supabase = createClient();
  const profileId = await currentProfileId(supabase);

  const { checklist, ...rest } = parsed.data;

  const { data, error } = await supabase
    .from("tasks")
    .insert({
      ...normalize(rest),
      checklist: checklist ?? [],
      created_by: profileId,
      assigned_to: profileId,
    })
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };

  revalidatePath("/tasks");
  revalidatePath("/");
  return { ok: true, id: data.id };
}

export async function updateTaskRecord(
  id: string,
  input: TaskFormValues,
): Promise<ActionResult> {
  const parsed = taskSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Ошибка валидации",
    };
  }

  const supabase = createClient();
  const { checklist, ...rest } = parsed.data;

  const { error } = await supabase
    .from("tasks")
    .update({ ...normalize(rest), checklist: checklist ?? [] })
    .eq("id", id);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/tasks");
  return { ok: true, id };
}

export async function moveTaskStatus(
  id: string,
  status: TaskStatus,
): Promise<ActionResult> {
  const supabase = createClient();

  const { error } = await supabase.from("tasks").update({ status }).eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/tasks");
  revalidatePath("/");
  return { ok: true, id };
}

export async function deleteTaskRecord(id: string): Promise<ActionResult> {
  const supabase = createClient();
  const { error } = await supabase.from("tasks").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/tasks");
  revalidatePath("/");
  return { ok: true, id };
}

export async function toggleChecklistItem(
  taskId: string,
  itemId: string,
): Promise<ActionResult> {
  const supabase = createClient();

  const { data: task, error: readError } = await supabase
    .from("tasks")
    .select("checklist")
    .eq("id", taskId)
    .maybeSingle<{ checklist: ChecklistItem[] | null }>();

  if (readError) return { ok: false, error: readError.message };

  const checklist = (task?.checklist ?? []).map((item) =>
    item.id === itemId ? { ...item, done: !item.done } : item,
  );

  const { error } = await supabase
    .from("tasks")
    .update({ checklist })
    .eq("id", taskId);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/tasks");
  return { ok: true, id: taskId };
}
