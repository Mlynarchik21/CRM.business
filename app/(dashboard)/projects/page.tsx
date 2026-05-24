import { ProjectFormDialog } from "@/components/projects/ProjectFormDialog";
import { ProjectsView } from "@/components/projects/ProjectsView";
import { getCrmDisplayIdMaps } from "@/lib/crm-display-id";
import { createClient } from "@/lib/supabase/server";

export default async function ProjectsPage() {
  const supabase = createClient();
  const { clientIdMap } = await getCrmDisplayIdMaps(supabase);

  const [projectsRes, clientsRes] = await Promise.all([
    supabase
      .from("projects")
      .select("id, title, project_type, status, progress, amount, deadline, client_id, client:clients(id, name)")
      .order("created_at", { ascending: false }),
    supabase.from("clients").select("id, name").order("name", { ascending: true }),
  ]);

  const projects = (projectsRes.data ?? []).map((project) => ({
    id: project.id as string,
    title: project.title as string,
    project_type: project.project_type as
      | "landing"
      | "website"
      | "business_card"
      | "link_in_bio"
      | "telegram_bot"
      | "mini_app"
      | "crm"
      | "design"
      | "support"
      | "custom"
      | null,
    status: project.status as
      | "new"
      | "briefing"
      | "estimation"
      | "in_progress"
      | "waiting_materials"
      | "review"
      | "revisions"
      | "waiting_payment"
      | "completed"
      | "on_support"
      | "paused"
      | "cancelled",
    progress: Number(project.progress ?? 0),
    amount: Number(project.amount ?? 0),
    deadline: project.deadline as string | null,
    client_id: project.client_id as string | null,
    client: Array.isArray(project.client)
      ? (
          project.client[0]
            ? {
                id: (project.client[0] as { id: string }).id,
                crmId: clientIdMap[(project.client[0] as { id: string }).id] ?? 0,
              }
            : null
        )
      : (
          project.client
            ? {
                id: (project.client as { id: string }).id,
                crmId: clientIdMap[(project.client as { id: string }).id] ?? 0,
              }
            : null
        ),
  }));

  const clients = (clientsRes.data ?? []).map((client) => ({
    id: client.id as string,
    name: client.name as string,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Проекты</h1>
          <p className="text-muted-foreground">
            Веди процесс проекта, сроки, оплату, ссылки на GitHub, Vercel, Supabase и заметки.
          </p>
        </div>
        <ProjectFormDialog clients={clients} />
      </div>

      <ProjectsView projects={projects} />
    </div>
  );
}
