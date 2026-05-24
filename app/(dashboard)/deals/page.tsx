import { DealFormDialog } from "@/components/deals/DealFormDialog";
import { KanbanBoard } from "@/components/deals/KanbanBoard";
import { createClient } from "@/lib/supabase/server";
import { formatCurrency, formatNumber } from "@/lib/utils";
import type { Client, Deal, Lead } from "@/types";

type DealRow = Deal & {
  lead_name?: string | null;
  client_name?: string | null;
};

export default async function DealsPage() {
  const supabase = createClient();

  const [dealsRes, leadsRes, clientsRes] = await Promise.all([
    supabase
      .from("deals")
      .select("*, lead:leads(name), client:clients(name)")
      .order("created_at", { ascending: false }),
    supabase
      .from("leads")
      .select("id, name, status")
      .order("created_at", { ascending: false })
      .returns<Pick<Lead, "id" | "name" | "status">[]>(),
    supabase
      .from("clients")
      .select("id, name")
      .order("name", { ascending: true })
      .returns<Pick<Client, "id" | "name">[]>(),
  ]);

  const deals: DealRow[] = (dealsRes.data ?? []).map((deal) => ({
    ...(deal as Deal),
    lead_name: Array.isArray((deal as { lead?: { name?: string }[] }).lead)
      ? (deal as { lead?: { name?: string }[] }).lead?.[0]?.name ?? null
      : ((deal as { lead?: { name?: string } | null }).lead?.name ?? null),
    client_name: Array.isArray((deal as { client?: { name?: string }[] }).client)
      ? (deal as { client?: { name?: string }[] }).client?.[0]?.name ?? null
      : ((deal as { client?: { name?: string } | null }).client?.name ?? null),
  }));

  const totalAmount = deals.reduce((sum, deal) => sum + Number(deal.amount ?? 0), 0);
  const openCount = deals.filter((deal) => deal.status === "open").length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Сделки</h1>
          <p className="text-muted-foreground">
            Канбан по воронке: ведём переговоры, фиксируем стадии и переводим успешные сделки в проекты.
          </p>
        </div>

        <DealFormDialog
          leads={leadsRes.data ?? []}
          clients={clientsRes.data ?? []}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-sm text-muted-foreground">Всего сделок</p>
          <p className="mt-2 text-2xl font-semibold">{formatNumber(deals.length)}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-sm text-muted-foreground">Открытых сделок</p>
          <p className="mt-2 text-2xl font-semibold">{formatNumber(openCount)}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-sm text-muted-foreground">Общая сумма</p>
          <p className="mt-2 text-2xl font-semibold">{formatCurrency(totalAmount)}</p>
        </div>
      </div>

      <KanbanBoard deals={deals} />
    </div>
  );
}
