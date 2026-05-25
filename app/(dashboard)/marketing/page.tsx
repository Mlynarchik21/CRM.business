import { MarketingClient, type TrafficStat } from "@/components/marketing/MarketingClient";
import type { MarketingSource } from "@/app/(dashboard)/marketing/actions";
import { LEAD_SOURCE_LABEL } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";
import type { LeadSource } from "@/types";

export default async function MarketingPage() {
  const supabase = createClient();

  const [settingsRes, leadsRes, clientsRes, paymentsRes, expensesRes] = await Promise.all([
    supabase.from("settings").select("value").eq("key", "marketing_sources").maybeSingle<{ value: unknown }>(),
    supabase.from("leads").select("source"),
    supabase.from("clients").select("id, source"),
    supabase.from("payments").select("amount, client:clients(source)").eq("status", "paid"),
    supabase.from("expenses").select("amount, source"),
  ]);

  const initialSources: MarketingSource[] = Array.isArray(settingsRes.data?.value)
    ? (settingsRes.data!.value as MarketingSource[])
    : [];

  const leads = (leadsRes.data ?? []) as { source: LeadSource }[];
  const clients = (clientsRes.data ?? []) as { id: string; source: string | null }[];
  const payments = (paymentsRes.data ?? []) as { amount: number; client: unknown }[];
  const expenses = (expensesRes.data ?? []) as { amount: number; source: string | null }[];

  // Трафик: лиды по источникам + сколько из них стало клиентами.
  const leadCounts = new Map<string, number>();
  for (const lead of leads) {
    leadCounts.set(lead.source, (leadCounts.get(lead.source) ?? 0) + 1);
  }
  const clientCounts = new Map<string, number>();
  for (const c of clients) {
    if (c.source) clientCounts.set(c.source, (clientCounts.get(c.source) ?? 0) + 1);
  }

  // Выручка по источнику (через источник клиента в оплате).
  const revenueBySource = new Map<string, number>();
  for (const p of payments) {
    const src = Array.isArray(p.client)
      ? (p.client[0] as { source?: string })?.source
      : (p.client as { source?: string } | null)?.source;
    if (src) revenueBySource.set(src, (revenueBySource.get(src) ?? 0) + Number(p.amount ?? 0));
  }

  // Расход по источнику (из расходов с указанным источником).
  const spendBySource = new Map<string, number>();
  for (const e of expenses) {
    if (e.source) spendBySource.set(e.source, (spendBySource.get(e.source) ?? 0) + Number(e.amount ?? 0));
  }

  const trafficStats: TrafficStat[] = Array.from(leadCounts.entries())
    .map(([source, leadsCount]) => {
      const clientsCount = clientCounts.get(source) ?? 0;
      const spend = spendBySource.get(source) ?? 0;
      return {
        source,
        label: LEAD_SOURCE_LABEL[source as LeadSource] ?? source,
        leads: leadsCount,
        clients: clientsCount,
        conversion: leadsCount > 0 ? Math.round((clientsCount / leadsCount) * 100) : 0,
        revenue: revenueBySource.get(source) ?? 0,
        spend,
        costPerLead: leadsCount > 0 ? Math.round((spend / leadsCount) * 100) / 100 : 0,
      };
    })
    .sort((a, b) => b.leads - a.leads);

  return (
    <MarketingClient
      initialSources={initialSources}
      trafficStats={trafficStats}
      totalLeads={leads.length}
    />
  );
}
