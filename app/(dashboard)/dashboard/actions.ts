"use server";

import { createClient } from "@/lib/supabase/server";

export type DashboardStats = {
  leadsTotal: number;
  leadsNew: number;
  clientsTotal: number;
  projectsActive: number;
  revenue: number;
  expectedPayments: number;
  tasksDueToday: number;
  tasksOverdue: number;
  supportOpen: number;
  recentLeads: { id: string; name: string; status: string; created_at: string }[];
};

export async function getDashboardStats(): Promise<DashboardStats> {
  const supabase = createClient();

  const today = new Date().toISOString().slice(0, 10);
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    .toISOString()
    .slice(0, 10);

  const [
    leadsRes,
    leadsNewRes,
    clientsRes,
    projectsRes,
    paidPaymentsRes,
    expectedPaymentsRes,
    tasksRes,
    supportRes,
  ] = await Promise.all([
    supabase.from("leads").select("*", { count: "exact", head: true }),
    supabase
      .from("leads")
      .select("*", { count: "exact", head: true })
      .gte("created_at", monthStart),
    supabase.from("clients").select("*", { count: "exact", head: true }),
    supabase
      .from("projects")
      .select("*", { count: "exact", head: true })
      .not("status", "in", "(completed,cancelled)"),
    supabase.from("payments").select("amount").eq("status", "paid"),
    supabase.from("payments").select("amount").eq("status", "expected"),
    supabase
      .from("tasks")
      .select("id, status, due_date"),
    supabase
      .from("support_tickets")
      .select("*", { count: "exact", head: true })
      .eq("status", "open"),
  ]);

  const recentLeadsRes = await supabase
    .from("leads")
    .select("id, name, status, created_at")
    .order("created_at", { ascending: false })
    .limit(5);

  const tasks = tasksRes.data ?? [];

  return {
    leadsTotal: leadsRes.count ?? 0,
    leadsNew: leadsNewRes.count ?? 0,
    clientsTotal: clientsRes.count ?? 0,
    projectsActive: projectsRes.count ?? 0,
    revenue: (paidPaymentsRes.data ?? []).reduce((s, p) => s + (p.amount ?? 0), 0),
    expectedPayments: (expectedPaymentsRes.data ?? []).reduce((s, p) => s + (p.amount ?? 0), 0),
    tasksDueToday: tasks.filter(
      (t) => t.due_date === today && t.status !== "done",
    ).length,
    tasksOverdue: tasks.filter(
      (t) => t.due_date && t.due_date < today && t.status !== "done",
    ).length,
    supportOpen: supportRes.count ?? 0,
    recentLeads: (recentLeadsRes.data ?? []) as {
      id: string;
      name: string;
      status: string;
      created_at: string;
    }[],
  };
}
