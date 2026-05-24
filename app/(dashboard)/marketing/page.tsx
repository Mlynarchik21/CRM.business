import { MarketingClient, type TrafficStat } from "@/components/marketing/MarketingClient";
import type { MarketingSource } from "@/app/(dashboard)/marketing/actions";
import { LEAD_SOURCE_LABEL } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";
import type { LeadSource } from "@/types";

export default async function MarketingPage() {
  const supabase = createClient();

  const [settingsRes, leadsRes, clientsRes] = await Promise.all([
    supabase.from("settings").select("value").eq("key", "marketing_sources").maybeSingle<{ value: unknown }>(),
    supabase.from("leads").select("source"),
    supabase.from("clients").select("source"),
  ]);

  const initialSources: MarketingSource[] = Array.isArray(settingsRes.data?.value)
    ? (settingsRes.data!.value as MarketingSource[])
    : [];

  const leads = (leadsRes.data ?? []) as { source: LeadSource }[];
  const clients = (clientsRes.data ?? []) as { source: string | null }[];

  // Трафик: лиды по источникам + сколько из них стало клиентами.
  const leadCounts = new Map<string, number>();
  for (const lead of leads) {
    leadCounts.set(lead.source, (leadCounts.get(lead.source) ?? 0) + 1);
  }
  const clientCounts = new Map<string, number>();
  for (const c of clients) {
    if (c.source) clientCounts.set(c.source, (clientCounts.get(c.source) ?? 0) + 1);
  }

  const trafficStats: TrafficStat[] = Array.from(leadCounts.entries())
    .map(([source, leadsCount]) => {
      const clientsCount = clientCounts.get(source) ?? 0;
      return {
        source,
        label: LEAD_SOURCE_LABEL[source as LeadSource] ?? source,
        leads: leadsCount,
        clients: clientsCount,
        conversion: leadsCount > 0 ? Math.round((clientsCount / leadsCount) * 100) : 0,
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
