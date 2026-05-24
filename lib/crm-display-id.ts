type LeadIdentity = {
  id: string;
  created_at: string;
};

type ClientIdentity = {
  id: string;
  lead_id: string | null;
  created_at: string;
};

type ComparableEntry =
  | { type: "lead"; id: string; created_at: string }
  | { type: "client"; id: string; created_at: string };

function sortByCreatedAt<T extends { created_at: string; id: string }>(items: T[]) {
  return [...items].sort((a, b) => {
    const diff = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    if (diff !== 0) return diff;
    return a.id.localeCompare(b.id);
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getCrmDisplayIdMaps(supabase: any) {
  const [leadsRes, clientsRes] = await Promise.all([
    supabase
      .from("leads")
      .select("id, created_at")
      .order("created_at", { ascending: true }),
    supabase
      .from("clients")
      .select("id, lead_id, created_at")
      .order("created_at", { ascending: true }),
  ]);

  const leads = (leadsRes.data ?? []) as LeadIdentity[];
  const clients = (clientsRes.data ?? []) as ClientIdentity[];

  const leadIdMap: Record<string, number> = {};
  const clientIdMap: Record<string, number> = {};

  const standaloneClients = clients.filter((client) => !client.lead_id);
  const timeline: ComparableEntry[] = [
    ...leads.map((lead) => ({
      type: "lead" as const,
      id: lead.id,
      created_at: lead.created_at,
    })),
    ...standaloneClients.map((client) => ({
      type: "client" as const,
      id: client.id,
      created_at: client.created_at,
    })),
  ];

  let sequence = 1;
  for (const entry of sortByCreatedAt(timeline)) {
    if (entry.type === "lead") {
      leadIdMap[entry.id] = sequence;
    } else {
      clientIdMap[entry.id] = sequence;
    }
    sequence += 1;
  }

  for (const client of clients) {
    if (client.lead_id && leadIdMap[client.lead_id]) {
      clientIdMap[client.id] = leadIdMap[client.lead_id];
    }
  }

  return { leadIdMap, clientIdMap };
}
