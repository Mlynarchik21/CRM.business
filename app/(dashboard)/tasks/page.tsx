import { TaskFormDialog } from "@/components/tasks/TaskFormDialog";
import { TasksTracker, type TrackerTask } from "@/components/tasks/TasksTracker";
import { createClient } from "@/lib/supabase/server";
import { formatNumber } from "@/lib/utils";
import type { Task } from "@/types";

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

export default async function TasksPage() {
  const supabase = createClient();

  const [tasksRes, projectsRes, clientsRes] = await Promise.all([
    supabase
      .from("tasks")
      .select("*, project:projects(title), client:clients(name)")
      .order("created_at", { ascending: false }),
    supabase
      .from("projects")
      .select("id, title")
      .order("created_at", { ascending: false }),
    supabase.from("clients").select("id, name").order("name", { ascending: true }),
  ]);

  const tasks: TrackerTask[] = (tasksRes.data ?? []).map((task) => ({
    ...(task as Task),
    checklist: Array.isArray((task as Task).checklist) ? (task as Task).checklist : [],
    project_title: relationName((task as { project?: unknown }).project),
    client_name: relationName((task as { client?: unknown }).client),
  }));

  const projects = (projectsRes.data ?? []).map((p) => ({
    id: p.id as string,
    title: p.title as string,
  }));
  const clients = (clientsRes.data ?? []).map((c) => ({
    id: c.id as string,
    name: c.name as string,
  }));

  const activeCount = tasks.filter(
    (task) => task.status !== "done" && task.status !== "blocked",
  ).length;
  const overdueCount = tasks.filter(
    (task) =>
      task.due_date &&
      task.status !== "done" &&
      new Date(task.due_date).getTime() < Date.now(),
  ).length;
  const doneCount = tasks.filter((task) => task.status === "done").length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Задачи</h1>
          <p className="text-muted-foreground">
            Внутренний трекер студии: ставим задачи себе и команде, отмечаем выполнение.
          </p>
        </div>
        <TaskFormDialog projects={projects} clients={clients} />
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-sm text-muted-foreground">Всего задач</p>
          <p className="mt-2 text-2xl font-semibold">{formatNumber(tasks.length)}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-sm text-muted-foreground">В работе</p>
          <p className="mt-2 text-2xl font-semibold">{formatNumber(activeCount)}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-sm text-muted-foreground">Просрочено</p>
          <p className="mt-2 text-2xl font-semibold text-destructive">
            {formatNumber(overdueCount)}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-sm text-muted-foreground">Готово</p>
          <p className="mt-2 text-2xl font-semibold text-primary">
            {formatNumber(doneCount)}
          </p>
        </div>
      </div>

      <TasksTracker tasks={tasks} projects={projects} clients={clients} />
    </div>
  );
}
