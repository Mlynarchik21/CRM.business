"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { notifyPayment } from "@/lib/telegram/internal-bot";
import { paymentSchema, type PaymentFormValues } from "@/lib/validations";

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

/** Пересчитывает оплаченную сумму проекта по сумме всех paid-оплат. */
async function recalcProject(supabase: Supabase, projectId: string | null) {
  if (!projectId) return;

  const { data } = await supabase
    .from("payments")
    .select("amount")
    .eq("project_id", projectId)
    .eq("status", "paid")
    .returns<{ amount: number }[]>();

  const paid = (data ?? []).reduce((sum, p) => sum + Number(p.amount ?? 0), 0);
  await supabase.from("projects").update({ paid_amount: paid }).eq("id", projectId);
}

/** Пересчитывает суммарную оплату клиента и дату последней оплаты. */
async function recalcClient(supabase: Supabase, clientId: string | null) {
  if (!clientId) return;

  const { data } = await supabase
    .from("payments")
    .select("amount, paid_at")
    .eq("client_id", clientId)
    .eq("status", "paid")
    .returns<{ amount: number; paid_at: string | null }[]>();

  const rows = data ?? [];
  const total = rows.reduce((sum, p) => sum + Number(p.amount ?? 0), 0);
  const lastPaid = rows
    .map((p) => p.paid_at)
    .filter((d): d is string => Boolean(d))
    .sort()
    .at(-1);

  await supabase
    .from("clients")
    .update({ total_paid: total, last_payment_at: lastPaid ?? null })
    .eq("id", clientId);
}

async function recalc(
  supabase: Supabase,
  clientId: string | null,
  projectId: string | null,
) {
  await Promise.all([
    recalcClient(supabase, clientId),
    recalcProject(supabase, projectId),
  ]);
}

export async function createPaymentRecord(
  input: PaymentFormValues,
): Promise<ActionResult> {
  const parsed = paymentSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Ошибка валидации" };
  }

  const supabase = createClient();
  const createdBy = await currentProfileId(supabase);
  const values = normalize(parsed.data);

  // Если оплата отмечена как оплаченная, но дата не задана — ставим текущую.
  if (values.status === "paid" && !values.paid_at) {
    values.paid_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from("payments")
    .insert({ ...values, created_by: createdBy })
    .select("id, client_id, project_id, amount, currency, status")
    .single();

  if (error) return { ok: false, error: error.message };

  await recalc(supabase, data.client_id, data.project_id);

  // Уведомляем команду о полученной оплате (тихо no-op, если бот не настроен).
  if (data.status === "paid") {
    const [clientRes, projectRes] = await Promise.all([
      data.client_id
        ? supabase.from("clients").select("name").eq("id", data.client_id).maybeSingle<{ name: string }>()
        : Promise.resolve({ data: null }),
      data.project_id
        ? supabase.from("projects").select("title").eq("id", data.project_id).maybeSingle<{ title: string }>()
        : Promise.resolve({ data: null }),
    ]);
    await notifyPayment({
      amount: Number(data.amount ?? 0),
      currency: data.currency ?? "USD",
      clientName: clientRes.data?.name ?? null,
      projectTitle: projectRes.data?.title ?? null,
    });
  }

  revalidatePath("/payments");
  if (data.project_id) revalidatePath(`/projects/${data.project_id}`);
  revalidatePath("/");
  return { ok: true, id: data.id };
}

export async function updatePaymentRecord(
  id: string,
  input: PaymentFormValues,
): Promise<ActionResult> {
  const parsed = paymentSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Ошибка валидации" };
  }

  const supabase = createClient();
  
  // Получаем старые связи ДО обновления для пересчёта.
  const { data: oldPayment } = await supabase
    .from("payments")
    .select("client_id, project_id")
    .eq("id", id)
    .maybeSingle<{ client_id: string | null; project_id: string | null }>();

  const values = normalize(parsed.data);

  if (values.status === "paid" && !values.paid_at) {
    values.paid_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from("payments")
    .update(values)
    .eq("id", id)
    .select("id, client_id, project_id")
    .single();

  if (error) return { ok: false, error: error.message };

  // Пересчитываем и новые связи, и старые (чтобы не было зависших агрегатов).
  await Promise.all([
    recalc(supabase, data.client_id, data.project_id),
    oldPayment && (oldPayment.client_id !== data.client_id || oldPayment.project_id !== data.project_id)
      ? recalc(supabase, oldPayment.client_id, oldPayment.project_id)
      : Promise.resolve(),
  ]);

  revalidatePath("/payments");
  if (data.project_id) revalidatePath(`/projects/${data.project_id}`);
  revalidatePath("/");
  return { ok: true, id };
}

export async function markPaymentPaid(id: string): Promise<ActionResult> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("payments")
    .update({ status: "paid", paid_at: new Date().toISOString() })
    .eq("id", id)
    .select("id, client_id, project_id")
    .single();

  if (error) return { ok: false, error: error.message };

  await recalc(supabase, data.client_id, data.project_id);

  revalidatePath("/payments");
  if (data.project_id) revalidatePath(`/projects/${data.project_id}`);
  revalidatePath("/");
  return { ok: true, id };
}
