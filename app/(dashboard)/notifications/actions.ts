"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type Result = { ok: true } | { ok: false; error: string };
type Supabase = ReturnType<typeof createClient>;

async function readSetting(supabase: Supabase, key: string): Promise<string[]> {
  const { data } = await supabase
    .from("settings")
    .select("value")
    .eq("key", key)
    .maybeSingle<{ value: unknown }>();
  return Array.isArray(data?.value) ? (data!.value as string[]) : [];
}

async function writeSetting(supabase: Supabase, key: string, value: string[]): Promise<Result> {
  const { error } = await supabase
    .from("settings")
    .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: "key" });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/notifications");
  revalidatePath("/", "layout");
  return { ok: true };
}

/** Пометить уведомления прочитанными/непрочитанными. */
export async function setNotificationsRead(ids: string[], read: boolean): Promise<Result> {
  const supabase = createClient();
  const current = await readSetting(supabase, "notif_read");
  const set = new Set(current);
  if (read) ids.forEach((id) => set.add(id));
  else ids.forEach((id) => set.delete(id));
  return writeSetting(supabase, "notif_read", Array.from(set));
}

/** Удалить (скрыть) уведомления — добавляем в список скрытых. */
export async function dismissNotifications(ids: string[]): Promise<Result> {
  const supabase = createClient();
  const current = await readSetting(supabase, "notif_dismissed");
  const set = new Set(current);
  ids.forEach((id) => set.add(id));
  // Чтобы список не рос бесконечно — оставим последние 2000.
  const next = Array.from(set).slice(-2000);
  return writeSetting(supabase, "notif_dismissed", next);
}
