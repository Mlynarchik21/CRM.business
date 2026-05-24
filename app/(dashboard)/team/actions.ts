"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { profileSchema, type ProfileFormValues } from "@/lib/validations";

type ActionResult = { ok: true; id?: string } | { ok: false; error: string };

function normalize<T extends Record<string, unknown>>(obj: T) {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined) continue;
    out[key] = value === "" ? null : value;
  }
  return out;
}

export async function createTeamMember(
  input: ProfileFormValues,
): Promise<ActionResult> {
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Ошибка валидации" };
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from("profiles")
    .insert(normalize(parsed.data))
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };

  revalidatePath("/team");
  return { ok: true, id: data.id };
}

export async function updateTeamMember(
  id: string,
  input: ProfileFormValues,
): Promise<ActionResult> {
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Ошибка валидации" };
  }

  const supabase = createClient();
  const { error } = await supabase
    .from("profiles")
    .update(normalize(parsed.data))
    .eq("id", id);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/team");
  return { ok: true, id };
}
