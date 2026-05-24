"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { expenseSchema, type ExpenseFormValues } from "@/lib/validations";

type ActionResult = { ok: true; id?: string } | { ok: false; error: string };
type Supabase = ReturnType<typeof createClient>;

function normalize<T extends Record<string, unknown>>(obj: T) {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined) continue;
    out[key] = value === "" ? null : value;
  }
  return out;
}

async function currentProfileId(supabase: Supabase): Promise<string | null> {
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

function friendly(error: { message: string }): string {
  if (/expenses/i.test(error.message) && /(does not exist|relation)/i.test(error.message)) {
    return "Применте миграцию 005 (таблица expenses) в Supabase SQL Editor.";
  }
  return error.message;
}

export async function createExpense(input: ExpenseFormValues): Promise<ActionResult> {
  const parsed = expenseSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Ошибка валидации" };
  }

  const supabase = createClient();
  const createdBy = await currentProfileId(supabase);

  const { data, error } = await supabase
    .from("expenses")
    .insert({ ...normalize(parsed.data), created_by: createdBy })
    .select("id")
    .single();

  if (error) return { ok: false, error: friendly(error) };

  revalidatePath("/expenses");
  revalidatePath("/");
  return { ok: true, id: data.id };
}

export async function updateExpense(
  id: string,
  input: ExpenseFormValues,
): Promise<ActionResult> {
  const parsed = expenseSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Ошибка валидации" };
  }

  const supabase = createClient();
  const { error } = await supabase
    .from("expenses")
    .update(normalize(parsed.data))
    .eq("id", id);

  if (error) return { ok: false, error: friendly(error) };

  revalidatePath("/expenses");
  revalidatePath("/");
  return { ok: true, id };
}

export async function deleteExpense(id: string): Promise<ActionResult> {
  const supabase = createClient();
  const { error } = await supabase.from("expenses").delete().eq("id", id);
  if (error) return { ok: false, error: friendly(error) };

  revalidatePath("/expenses");
  revalidatePath("/");
  return { ok: true, id };
}
