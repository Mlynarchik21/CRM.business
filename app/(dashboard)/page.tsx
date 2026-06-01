import Link from "next/link";
import { FolderKanban, Target, Users } from "lucide-react";
import { OpenDashboardButton } from "@/components/layout/OpenDashboardButton";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { formatNumber } from "@/lib/utils";

export default async function HomePage() {
  const supabase = createClient();
  const [{ count: leadsCount }, { count: clientsCount }, { count: projectsCount }] =
    await Promise.all([
      supabase.from("leads").select("*", { count: "exact", head: true }),
      supabase.from("clients").select("*", { count: "exact", head: true }),
      supabase
        .from("projects")
        .select("*", { count: "exact", head: true })
        .not("status", "in", "(completed,cancelled)"),
    ]);

  return (
    <div className="mx-auto max-w-2xl space-y-6 py-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Главная</h1>
        <p className="mt-1 text-muted-foreground">
          Рабочее пространство студии. Дашборд открывается выдвижной панелью слева — не
          занимает весь экран.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <OpenDashboardButton />
        <Button variant="secondary" asChild>
          <Link href="/leads">
            <Target className="mr-2 h-4 w-4" />
            Лиды ({formatNumber(leadsCount ?? 0)})
          </Link>
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Link
          href="/leads"
          className="rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary"
        >
          <Target className="mb-2 h-5 w-5 text-primary" />
          <p className="font-medium">Лиды</p>
          <p className="text-2xl font-semibold">{formatNumber(leadsCount ?? 0)}</p>
        </Link>
        <Link
          href="/clients"
          className="rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary"
        >
          <Users className="mb-2 h-5 w-5 text-primary" />
          <p className="font-medium">Клиенты</p>
          <p className="text-2xl font-semibold">{formatNumber(clientsCount ?? 0)}</p>
        </Link>
        <Link
          href="/projects"
          className="rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary"
        >
          <FolderKanban className="mb-2 h-5 w-5 text-primary" />
          <p className="font-medium">Проекты</p>
          <p className="text-2xl font-semibold">{formatNumber(projectsCount ?? 0)}</p>
        </Link>
      </div>
    </div>
  );
}
