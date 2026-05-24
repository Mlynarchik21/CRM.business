import { SupportTable, type SupportRow } from "@/components/support/SupportTable";
import { SupportTicketFormDialog } from "@/components/support/SupportTicketFormDialog";
import { createClient } from "@/lib/supabase/server";
import { formatNumber } from "@/lib/utils";
import type { SupportTicket } from "@/types";

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

export default async function SupportPage() {
  const supabase = createClient();

  const [ticketsRes, clientsRes, projectsRes] = await Promise.all([
    supabase
      .from("support_tickets")
      .select("*, client:clients(name), project:projects(title)")
      .order("created_at", { ascending: false }),
    supabase.from("clients").select("id, name").order("name", { ascending: true }),
    supabase
      .from("projects")
      .select("id, title")
      .order("created_at", { ascending: false }),
  ]);

  const tickets: SupportRow[] = (ticketsRes.data ?? []).map((ticket) => ({
    ...(ticket as SupportTicket),
    client_name: relationName((ticket as { client?: unknown }).client),
    project_title: relationName((ticket as { project?: unknown }).project),
  }));

  const clients = (clientsRes.data ?? []).map((c) => ({
    id: c.id as string,
    name: c.name as string,
  }));
  const projects = (projectsRes.data ?? []).map((p) => ({
    id: p.id as string,
    title: p.title as string,
  }));

  const open = tickets.filter(
    (t) => t.status !== "resolved" && t.status !== "closed",
  ).length;
  const urgent = tickets.filter(
    (t) => t.priority === "urgent" && t.status !== "resolved" && t.status !== "closed",
  ).length;
  const resolved = tickets.filter(
    (t) => t.status === "resolved" || t.status === "closed",
  ).length;

  return (
    <div className="space-y-6 pb-24">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Поддержка</h1>
          <p className="text-muted-foreground">
            Обращения клиентов по проектам: приоритеты, статусы и быстрая отметка решения.
          </p>
        </div>
        <SupportTicketFormDialog clients={clients} projects={projects} />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-sm text-muted-foreground">Открытых обращений</p>
          <p className="mt-2 text-2xl font-semibold">{formatNumber(open)}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-sm text-muted-foreground">Срочных</p>
          <p className="mt-2 text-2xl font-semibold text-destructive">
            {formatNumber(urgent)}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-sm text-muted-foreground">Решено / закрыто</p>
          <p className="mt-2 text-2xl font-semibold text-primary">
            {formatNumber(resolved)}
          </p>
        </div>
      </div>

      <SupportTable tickets={tickets} clients={clients} projects={projects} />
    </div>
  );
}
