import { TeamMemberFormDialog } from "@/components/team/TeamMemberFormDialog";
import { TeamTable } from "@/components/team/TeamTable";
import { createClient } from "@/lib/supabase/server";
import { formatNumber } from "@/lib/utils";
import type { Profile } from "@/types";

export default async function TeamPage() {
  const supabase = createClient();

  const { data } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: true })
    .returns<Profile[]>();

  const profiles = data ?? [];
  const activeCount = profiles.filter((p) => p.status === "active").length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Команда</h1>
          <p className="text-muted-foreground">
            Участники студии, их роли и статус. На участников можно назначать лиды, задачи и проекты.
          </p>
        </div>
        <TeamMemberFormDialog />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-sm text-muted-foreground">Всего участников</p>
          <p className="mt-2 text-2xl font-semibold">{formatNumber(profiles.length)}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-sm text-muted-foreground">Активных</p>
          <p className="mt-2 text-2xl font-semibold text-primary">
            {formatNumber(activeCount)}
          </p>
        </div>
      </div>

      <TeamTable profiles={profiles} />
    </div>
  );
}
