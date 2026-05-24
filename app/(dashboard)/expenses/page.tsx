import { ExpensesClient, type ExpenseRow } from "@/components/expenses/ExpensesClient";
import { createClient } from "@/lib/supabase/server";
import type { Expense } from "@/types";

function relationTitle(value: unknown): string | null {
  if (Array.isArray(value)) return (value[0] as { title?: string })?.title ?? null;
  if (value && typeof value === "object") return (value as { title?: string }).title ?? null;
  return null;
}

export default async function ExpensesPage() {
  const supabase = createClient();

  const [expensesRes, projectsRes, paymentsRes] = await Promise.all([
    supabase
      .from("expenses")
      .select("*, project:projects(title)")
      .order("created_at", { ascending: false }),
    supabase.from("projects").select("id, title").order("created_at", { ascending: false }),
    supabase.from("payments").select("amount").eq("status", "paid"),
  ]);

  // Если таблица expenses ещё не создана (миграция 005) — не падаем.
  const expenses: ExpenseRow[] = (expensesRes.data ?? []).map((e) => ({
    ...(e as Expense),
    project_title: relationTitle((e as { project?: unknown }).project),
  }));

  const projects = (projectsRes.data ?? []).map((p) => ({
    id: p.id as string,
    title: p.title as string,
  }));

  const revenue = (paymentsRes.data ?? []).reduce(
    (sum, p) => sum + Number((p as { amount: number }).amount ?? 0),
    0,
  );
  const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount ?? 0), 0);

  return (
    <ExpensesClient
      expenses={expenses}
      projects={projects}
      revenue={revenue}
      totalExpenses={totalExpenses}
    />
  );
}
