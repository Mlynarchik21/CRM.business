import { AnalyticsView, type AnalyticsData, type TrafficRow } from "@/components/analytics/AnalyticsView";
import type {
  CategoryDatum,
  RevenueDatum,
  StageDatum,
} from "@/components/analytics/AnalyticsCharts";
import { CLIENT_STATUS, COLORS, DEAL_STAGE, LEAD_SOURCE_LABEL } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";
import type { ClientStatus, DealStage, LeadSource } from "@/types";

const SOURCE_PALETTE = [
  COLORS.accentGreen,
  COLORS.accentPurple,
  COLORS.accentOrange,
  "#3B82F6",
  COLORS.warning,
  COLORS.danger,
  COLORS.textSecondary,
  COLORS.textMuted,
];

const MONTHS_RU = ["янв", "фев", "мар", "апр", "май", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];

export default async function AnalyticsPage() {
  const supabase = createClient();

  const [leadsRes, clientsRes, dealsRes, paymentsRes, expensesRes] = await Promise.all([
    supabase.from("leads").select("source, status"),
    supabase.from("clients").select("status, lead_id, source"),
    supabase.from("deals").select("stage, amount, status"),
    supabase.from("payments").select("amount, paid_at").eq("status", "paid"),
    supabase.from("expenses").select("amount, source"),
  ]);

  const leads = (leadsRes.data ?? []) as { source: LeadSource; status: string }[];
  const clients = (clientsRes.data ?? []) as { status: ClientStatus; lead_id: string | null; source: string | null }[];
  const deals = (dealsRes.data ?? []) as { stage: DealStage; amount: number; status: string }[];
  const payments = (paymentsRes.data ?? []) as { amount: number; paid_at: string | null }[];
  const expenses = (expensesRes.data ?? []) as { amount: number; source: string | null }[];

  // ── Лиды по источникам ──
  const sourceCounts = new Map<string, number>();
  for (const lead of leads) sourceCounts.set(lead.source, (sourceCounts.get(lead.source) ?? 0) + 1);
  const leadsBySource: CategoryDatum[] = Array.from(sourceCounts.entries()).map(([source, count], i) => ({
    label: LEAD_SOURCE_LABEL[source as LeadSource] ?? source,
    count,
    color: SOURCE_PALETTE[i % SOURCE_PALETTE.length],
  }));

  // ── Клиенты по статусам ──
  const statusCounts = new Map<ClientStatus, number>();
  for (const client of clients) statusCounts.set(client.status, (statusCounts.get(client.status) ?? 0) + 1);
  const clientsByStatus: CategoryDatum[] = Array.from(statusCounts.entries()).map(([status, count]) => ({
    label: CLIENT_STATUS[status].label,
    count,
    color: CLIENT_STATUS[status].color,
  }));

  // ── Сделки по стадиям ──
  const stageAgg = new Map<DealStage, { count: number; amount: number }>();
  for (const deal of deals) {
    const prev = stageAgg.get(deal.stage) ?? { count: 0, amount: 0 };
    stageAgg.set(deal.stage, { count: prev.count + 1, amount: prev.amount + Number(deal.amount ?? 0) });
  }
  const dealsByStage: StageDatum[] = (Object.keys(DEAL_STAGE) as DealStage[]).map((stage) => ({
    label: DEAL_STAGE[stage].label,
    count: stageAgg.get(stage)?.count ?? 0,
    amount: stageAgg.get(stage)?.amount ?? 0,
    color: DEAL_STAGE[stage].color,
  }));

  // ── Выручка по месяцам (12) ──
  const now = new Date();
  const revenueByMonth: RevenueDatum[] = [];
  const monthKeys: string[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    monthKeys.push(`${d.getFullYear()}-${d.getMonth()}`);
    revenueByMonth.push({ month: MONTHS_RU[d.getMonth()], revenue: 0 });
  }
  for (const payment of payments) {
    if (!payment.paid_at) continue;
    const d = new Date(payment.paid_at);
    const idx = monthKeys.indexOf(`${d.getFullYear()}-${d.getMonth()}`);
    if (idx >= 0) revenueByMonth[idx].revenue += Number(payment.amount ?? 0);
  }

  // ── Финансовые метрики ──
  const totalLeads = leads.length;
  const convertedFromLead = clients.filter((c) => c.lead_id).length;
  const conversion = totalLeads > 0 ? Math.round((convertedFromLead / totalLeads) * 100) : 0;
  const totalRevenue = payments.reduce((s, p) => s + Number(p.amount ?? 0), 0);
  const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount ?? 0), 0);
  const avgCheck = payments.length > 0 ? totalRevenue / payments.length : 0;
  const wonDeals = deals.filter((d) => d.status === "won").length;

  // ── Трафик / ROI по источникам ──
  const spendBySource = new Map<string, number>();
  for (const e of expenses) {
    if (e.source) spendBySource.set(e.source, (spendBySource.get(e.source) ?? 0) + Number(e.amount ?? 0));
  }
  const clientBySource = new Map<string, number>();
  for (const c of clients) {
    if (c.source) clientBySource.set(c.source, (clientBySource.get(c.source) ?? 0) + 1);
  }
  // Объединяем ключи источников из лидов и расходов.
  const trafficKeys = new Set<string>([
    ...Array.from(sourceCounts.keys()),
    ...Array.from(spendBySource.keys()),
  ]);
  const rows: TrafficRow[] = Array.from(trafficKeys)
    .map((source) => {
      const leadsCount = sourceCounts.get(source) ?? 0;
      const clientsCount = clientBySource.get(source) ?? 0;
      const spend = spendBySource.get(source) ?? 0;
      return {
        source,
        label: LEAD_SOURCE_LABEL[source as LeadSource] ?? source,
        leads: leadsCount,
        clients: clientsCount,
        conversion: leadsCount > 0 ? Math.round((clientsCount / leadsCount) * 100) : 0,
        spend,
        costPerLead: leadsCount > 0 ? spend / leadsCount : 0,
      };
    })
    .sort((a, b) => b.leads - a.leads);

  const data: AnalyticsData = {
    finance: {
      totalLeads,
      conversion,
      convertedFromLead,
      totalRevenue,
      totalExpenses,
      profit: totalRevenue - totalExpenses,
      avgCheck,
      wonDeals,
      leadsBySource,
      clientsByStatus,
      dealsByStage,
      revenueByMonth,
    },
    traffic: {
      totalLeads,
      totalSpend: totalExpenses,
      avgCostPerLead: totalLeads > 0 ? totalExpenses / totalLeads : 0,
      rows,
    },
  };

  return <AnalyticsView data={data} />;
}
