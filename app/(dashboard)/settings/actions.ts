"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  labelSchema,
  myProfileSchema,
  type LabelFormValues,
  type MyProfileFormValues,
} from "@/lib/validations";

type ActionResult = { ok: true; id?: string } | { ok: false; error: string };

export async function updateMyProfile(
  input: MyProfileFormValues,
): Promise<ActionResult> {
  const parsed = myProfileSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Ошибка валидации" };
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ok: false, error: "Нет активной сессии" };

  const patch = {
    full_name: parsed.data.full_name,
    telegram_username: parsed.data.telegram_username || null,
  };

  const { data: existing } = await supabase
    .from("profiles")
    .select("id")
    .eq("auth_user_id", user.id)
    .maybeSingle<{ id: string }>();

  if (existing) {
    const { error } = await supabase.from("profiles").update(patch).eq("id", existing.id);
    if (error) return { ok: false, error: error.message };
  } else {
    const { error } = await supabase
      .from("profiles")
      .insert({ ...patch, auth_user_id: user.id, role: "admin" });
    if (error) return { ok: false, error: error.message };
  }

  revalidatePath("/settings");
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function upsertSetting(
  key: string,
  value: unknown,
): Promise<ActionResult> {
  const supabase = createClient();

  const { error } = await supabase
    .from("settings")
    .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: "key" });

  if (error) return { ok: false, error: error.message };

  revalidatePath("/settings");
  return { ok: true };
}

export async function createLabel(input: LabelFormValues): Promise<ActionResult> {
  const parsed = labelSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Ошибка валидации" };
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from("labels")
    .insert({
      name: parsed.data.name,
      color: parsed.data.color,
      type: parsed.data.type ?? "custom",
    })
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };

  revalidatePath("/settings");
  return { ok: true, id: data.id };
}

export async function deleteLabel(id: string): Promise<ActionResult> {
  const supabase = createClient();
  const { error } = await supabase.from("labels").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/settings");
  return { ok: true };
}

// ── Журнал: ошибки и обновления ──────────────────────────────

/** «Проверить» ошибку: отмечаем исправленной (галочка + дата). */
export async function markErrorChecked(id: string): Promise<ActionResult> {
  const supabase = createClient();
  const { error } = await supabase
    .from("error_logs")
    .update({ status: "fixed", fixed_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/settings");
  return { ok: true };
}

/** Снова открыть ошибку (если повторилась). */
export async function reopenError(id: string): Promise<ActionResult> {
  const supabase = createClient();
  const { error } = await supabase
    .from("error_logs")
    .update({ status: "open", fixed_at: null })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/settings");
  return { ok: true };
}

export type ChangelogEntry = {
  id: string;
  number: string;
  description: string;
  created_at: string;
};

/** Сохраняет журнал обновлений в settings (ключ "changelog"). */
export async function saveChangelog(entries: ChangelogEntry[]): Promise<ActionResult> {
  const supabase = createClient();
  const clean = entries.map((e) => ({
    id: String(e.id),
    number: String(e.number ?? ""),
    description: String(e.description ?? ""),
    created_at: e.created_at ?? new Date().toISOString(),
  }));
  const { error } = await supabase
    .from("settings")
    .upsert({ key: "changelog", value: clean, updated_at: new Date().toISOString() }, { onConflict: "key" });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/settings");
  return { ok: true };
}
