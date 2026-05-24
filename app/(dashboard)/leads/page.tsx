import { LeadsTable, type LeadTableItem, type LeadTableLabel } from "@/components/leads/LeadsTable";
import { getCrmDisplayIdMaps } from "@/lib/crm-display-id";
import { createClient } from "@/lib/supabase/server";
import type { Lead } from "@/types";

type EntityLabelRow = {
  entity_id: string;
  label: LeadTableLabel | LeadTableLabel[] | null;
};

export default async function LeadsPage() {
  const supabase = createClient();
  const { leadIdMap } = await getCrmDisplayIdMaps(supabase);

  const [leadsRes, entityLabelsRes] = await Promise.all([
    supabase.from("leads").select("*").order("created_at", { ascending: false }).returns<Lead[]>(),
    supabase
      .from("entity_labels")
      .select("entity_id, label:labels(id, name, color)")
      .eq("entity_type", "lead"),
  ]);

  const labelsByLead = new Map<string, LeadTableLabel[]>();

  for (const row of (entityLabelsRes.data ?? []) as EntityLabelRow[]) {
    const label = Array.isArray(row.label) ? row.label[0] : row.label;
    if (!label) continue;
    const current = labelsByLead.get(row.entity_id) ?? [];
    current.push(label);
    labelsByLead.set(row.entity_id, current);
  }

  const leads: LeadTableItem[] = (leadsRes.data ?? []).map((lead) => ({
    ...lead,
    crmId: leadIdMap[lead.id] ?? 0,
    labels: labelsByLead.get(lead.id) ?? [],
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Лиды</h1>
        <p className="text-muted-foreground">
          Здесь хранится вся история входящих лидов. Менеджер решает, как вести лид дальше:
          в работу, в клиента, в статус «Не дозвонился» или в статус «Не потенциальный».
        </p>
      </div>

      <LeadsTable leads={leads} />
    </div>
  );
}
