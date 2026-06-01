import {
  AlarmClock,
  FolderKanban,
  LifeBuoy,
  ListChecks,
  Target,
  Users,
  Wallet,
} from "lucide-react";
import { DeadlinesWidget } from "@/components/dashboard/DeadlinesWidget";
import { JournalWidget } from "@/components/dashboard/JournalWidget";
import { PipelineWidget, type PipelineDatum } from "@/components/dashboard/PipelineWidget";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { TasksWidget } from "@/components/dashboard/TasksWidget";
import { DEAL_STAGE } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";
import { formatCurrency, formatNumber } from "@/lib/utils";
import type { DealStage, Task } from "@/types";

const FUNNEL_STAGES: DealStage[] = [
  "new_lead",
  "qualification",
  "discussion",
  "proposal",
  "negotiation",
  "waiting_payment",
];

/** Серверная сводка дашборда — рендерится в выдвижной панели. */
export async function DashboardPanel() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [
    leadsRes,
    clientsRes,
    projectsRes,
    paymentsRes,
    dealsRes,
    recentLeadsRes,
    deadlinesRes,
    profileRes,
    tasksRes,
    expectedPaymentsRes,
    supportRes,
    changelogRes,
    errorsRes,
  ] = await Promise.all([
    supabase.from("leads").select("*", { count: "exact", head: true }),
    supabase.from("clients").select("*", { count: "exact", head: true }),
    supabase
      .from("projects")
      .select("*", { count: "exact", head: true })
      .not("status", "in", "(completed,cancelled)"),
    supabase.from("payments").select("amount").eq("status", "paid"),
    supabase.from("deals").select("stage, amount").eq("status", "open"),
    supabase
      .from("leads")
      .select("id, name, status, created_at")
      .order("created_at", { ascending: false })
      .limit(6),
    supabase
      .from("projects")
      .select("id, title, deadline, status")
      .gte("deadline", new Date().toISOString().slice(0, 10))
      .order("deadline", { ascending: true })
      .limit(6),
    supabase
      .from("profiles")
      .select("full_name")
      .eq("auth_user_id", user!.id)
      .maybeSingle<{ full_name: string }>(),
    supabase
      .from("tasks")
      .select("id, title, due_date, priority, status")
      .returns<Pick<Task, "id" | "title" | "due_date" | "priority" | "status">[]>(),
    supabase.from("payments").select("amount").eq("status", "expected"),
    supabase
      .from("support_tickets")
      .select("*", { count: "exact", head: true })
      .not("status", "in", "(resolved,closed)"),
    supabase.from("settings").select("value").eq("key", "changelog").maybeSingle<{ value: unknown }>(),
    supabase
      .from("error_logs")
      .select("id, title, status, created_at")
      .order("created_at", { ascending: false })
      .limit(3),
  ]);

  const updates = (
    Array.isArray(changelogRes.data?.value)
      ? (changelogRes.data!.value as {
          number: string;
          description: string;
          created_at: string;
        }[])
      : []
  ).slice(0, 3);
  const recentErrors = (errorsRes.data ?? []) as {
    id: string;
    title: string;
    status: string;
    created_at: string;
  }[];

  const revenue = (paymentsRes.data ?? []).reduce(
    (sum, payment) => sum + Number(payment.amount ?? 0),
    0,
  );

  const expectedPayments = (expectedPaymentsRes.data ?? []).reduce(
    (sum, payment) => sum + Number(payment.amount ?? 0),
    0,
  );

  const allTasks = tasksRes.data ?? [];
  const now = Date.now();
  const activeTasks = allTasks.filter(
    (task) => task.status !== "done" && task.status !== "blocked",
  ).length;
  const overdueTasks = allTasks.filter(
    (task) =>
      task.due_date && task.status !== "done" && new Date(task.due_date).getTime() < now,
  ).length;

  const watchTasks = allTasks
    .filter((task) => task.due_date && task.status !== "done")
    .sort(
      (a, b) =>
        new Date(a.due_date as string).getTime() - new Date(b.due_date as string).getTime(),
    )
    .slice(0, 6);

  const aggregate = new Map<string, { count: number; amount: number }>();
  for (const deal of dealsRes.data ?? []) {
    const current = aggregate.get(deal.stage) ?? { count: 0, amount: 0 };
    current.count += 1;
    current.amount += Number(deal.amount ?? 0);
    aggregate.set(deal.stage, current);
  }

  const pipeline: PipelineDatum[] = FUNNEL_STAGES.map((stage) => ({
    label: DEAL_STAGE[stage].label,
    color: DEAL_STAGE[stage].color,
    count: aggregate.get(stage)?.count ?? 0,
    amount: aggregate.get(stage)?.amount ?? 0,
  }));

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">Дашборд</h2>
        <p className="text-sm text-muted-foreground">
          Привет, {profileRes.data?.full_name ?? user?.email}. Сводка по студии.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <StatsCard
          label="Лиды"
          value={formatNumber(leadsRes.count ?? 0)}
          icon={Target}
          accent="#22C55E"
          href="/leads"
        />
        <StatsCard
          label="Клиенты"
          value={formatNumber(clientsRes.count ?? 0)}
          icon={Users}
          accent="#8B5CF6"
          href="/clients"
        />
        <StatsCard
          label="Активные проекты"
          value={formatNumber(projectsRes.count ?? 0)}
          icon={FolderKanban}
          accent="#F97316"
          href="/projects"
        />
        <StatsCard
          label="Выручка"
          value={formatCurrency(revenue)}
          icon={Wallet}
          accent="#22C55E"
          href="/payments"
        />
        <StatsCard
          label="Задачи в работе"
          value={formatNumber(activeTasks)}
          icon={ListChecks}
          accent="#8B5CF6"
          href="/tasks"
        />
        <StatsCard
          label="Просроченные"
          value={formatNumber(overdueTasks)}
          icon={AlarmClock}
          accent="#EF4444"
          href="/tasks"
        />
        <StatsCard
          label="Ожидаемые оплаты"
          value={formatCurrency(expectedPayments)}
          icon={Wallet}
          accent="#F59E0B"
          href="/payments"
        />
        <StatsCard
          label="Обращения"
          value={formatNumber(supportRes.count ?? 0)}
          icon={LifeBuoy}
          accent="#F97316"
          href="/support"
        />
      </div>

      <PipelineWidget data={pipeline} />
      <RecentActivity leads={recentLeadsRes.data ?? []} />
      <DeadlinesWidget projects={deadlinesRes.data ?? []} />
      <TasksWidget tasks={watchTasks} />
      <JournalWidget updates={updates} errors={recentErrors} />
    </div>
  );
}
