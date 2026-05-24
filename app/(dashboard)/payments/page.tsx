import Link from "next/link";
import { PaymentFormDialog } from "@/components/payments/PaymentFormDialog";
import { PaymentsTable, type PaymentRow } from "@/components/payments/PaymentsTable";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { formatCurrency, formatNumber } from "@/lib/utils";
import type { Payment } from "@/types";

function relationName(value: unknown): string | null {
  if (Array.isArray(value)) {
    const first = value[0] as { name?: string; title?: string } | undefined;
    return first?.name ?? first?.title ?? null;
  }
  if (value && typeof value === "object") {
    const obj = value as { name?: string; title?: string };
    return obj.name ?? obj.title ?? null;
  }
  return null;
}

export default async function PaymentsPage() {
  const supabase = createClient();

  const [paymentsRes, clientsRes, projectsRes] = await Promise.all([
    supabase
      .from("payments")
      .select("*, client:clients(name), project:projects(title)")
      .order("created_at", { ascending: false }),
    supabase.from("clients").select("id, name").order("name", { ascending: true }),
    supabase
      .from("projects")
      .select("id, title")
      .order("created_at", { ascending: false }),
  ]);

  const payments: PaymentRow[] = (paymentsRes.data ?? []).map((payment) => ({
    ...(payment as Payment),
    client_name: relationName((payment as { client?: unknown }).client),
    project_title: relationName((payment as { project?: unknown }).project),
  }));

  const clients = (clientsRes.data ?? []).map((c) => ({
    id: c.id as string,
    name: c.name as string,
  }));
  const projects = (projectsRes.data ?? []).map((p) => ({
    id: p.id as string,
    title: p.title as string,
  }));

  const paid = payments.filter((p) => p.status === "paid");
  const revenue = paid.reduce((sum, p) => sum + Number(p.amount ?? 0), 0);
  const avgCheck = paid.length > 0 ? revenue / paid.length : 0;
  const expected = payments
    .filter((p) => p.status === "expected")
    .reduce((sum, p) => sum + Number(p.amount ?? 0), 0);
  const problematic = payments.filter(
    (p) => p.status === "cancelled" || p.status === "error",
  ).length;

  return (
    <div className="space-y-6 pb-24">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-primary/10 px-3 py-1 text-sm font-medium text-primary">Оплаты</span>
            <Button asChild variant="outline" size="sm">
              <Link href="/expenses">Расходы</Link>
            </Button>
          </div>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight">Оплаты</h1>
          <p className="text-muted-foreground">
            Финансы студии: выручка, ожидаемые платежи, средний чек. Расходы — на соседней вкладке.
          </p>
        </div>
        <PaymentFormDialog clients={clients} projects={projects} />
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-sm text-muted-foreground">Выручка (получено)</p>
          <p className="mt-2 text-2xl font-semibold text-primary">
            {formatCurrency(revenue)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">{formatNumber(paid.length)} оплат</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-sm text-muted-foreground">Средний чек</p>
          <p className="mt-2 text-2xl font-semibold">{formatCurrency(avgCheck)}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-sm text-muted-foreground">Ожидаем</p>
          <p className="mt-2 text-2xl font-semibold text-[#F59E0B]">
            {formatCurrency(expected)}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-sm text-muted-foreground">Отменено / ошибка</p>
          <p className="mt-2 text-2xl font-semibold text-destructive">
            {formatNumber(problematic)}
          </p>
        </div>
      </div>

      <PaymentsTable payments={payments} clients={clients} projects={projects} />
    </div>
  );
}
