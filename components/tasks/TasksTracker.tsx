"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckSquare, ChevronDown, Pencil, Plus, Square } from "lucide-react";
import { toast } from "sonner";
import {
  createTaskRecord,
  deleteTaskRecord,
  moveTaskStatus,
  toggleChecklistItem,
} from "@/app/(dashboard)/tasks/actions";
import { TaskFormDialog } from "@/components/tasks/TaskFormDialog";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PRIORITY, TASK_STATUS } from "@/lib/constants";
import { cn, formatDate } from "@/lib/utils";
import type { ChecklistItem, Priority, Task, TaskStatus } from "@/types";

export type TrackerTask = Task & {
  project_title?: string | null;
  client_name?: string | null;
};

// Быстрые шаблоны задач (как «Шаблоны» в этапах проекта).
const TEMPLATES = [
  "Связаться с клиентом",
  "Подготовить КП",
  "Выставить счёт",
  "Собрать материалы",
  "Контроль дедлайна",
  "Созвон с командой",
];

export function TasksTracker({
  tasks,
  projects,
  clients,
}: {
  tasks: TrackerTask[];
  projects: { id: string; title: string }[];
  clients: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [editing, setEditing] = useState<TrackerTask | null>(null);
  const [showTemplates, setShowTemplates] = useState(false);

  const total = tasks.length;
  const done = tasks.filter((t) => t.status === "done").length;
  const progress = total > 0 ? Math.round((done / total) * 100) : 0;

  function run(fn: () => Promise<{ ok: boolean; error?: string }>, okMsg?: string) {
    startTransition(async () => {
      const result = await fn();
      if (!result.ok) {
        toast.error(result.error ?? "Ошибка");
        return;
      }
      if (okMsg) toast.success(okMsg);
      router.refresh();
    });
  }

  function toggleDone(task: TrackerTask) {
    const next: TaskStatus = task.status === "done" ? "today" : "done";
    run(() => moveTaskStatus(task.id, next));
  }

  function addTemplate(title: string) {
    run(
      () => createTaskRecord({ title, status: "backlog", priority: "medium" }),
      "Задача добавлена",
    );
  }

  // Разделение: задачи внутри компании (без проекта) и задачи по проектам.
  const companyTasks = tasks.filter((t) => !t.project_id);
  const projectTasks = tasks.filter((t) => t.project_id);

  function renderTask(task: TrackerTask, index: number) {
    const isOpen = expanded === task.id;
    const isDone = task.status === "done";
    const checklist: ChecklistItem[] = Array.isArray(task.checklist) ? task.checklist : [];
    const priority = PRIORITY[task.priority as Priority];
    const statusMeta = TASK_STATUS[task.status];
    const overdue =
      task.due_date && !isDone && new Date(task.due_date).getTime() < Date.now();

    return (
      <div
        key={task.id}
        className={cn(
          "rounded-xl border border-border transition-colors",
          isDone && "border-primary/30 bg-primary/5",
        )}
      >
        <div className="flex items-center gap-3 p-3">
          <button
            type="button"
            onClick={() => toggleDone(task)}
            disabled={pending}
            className={cn(
              "flex h-5 w-5 shrink-0 items-center justify-center rounded-md border",
              isDone ? "border-primary bg-primary text-white" : "border-border",
            )}
            aria-label="Отметить выполнение"
          >
            {isDone && "✓"}
          </button>

          <button
            type="button"
            onClick={() => setExpanded(isOpen ? null : task.id)}
            className="flex min-w-0 flex-1 items-center gap-2 text-left"
          >
            <span className="text-xs text-muted-foreground">#{index + 1}</span>
            <span className={cn("truncate font-medium", isDone && "line-through")}>
              {task.title}
            </span>
            {priority && task.priority !== "medium" && (
              <StatusBadge label={priority.label} color={priority.color} />
            )}
          </button>

          {task.due_date && (
            <span
              className={cn(
                "hidden shrink-0 text-xs sm:block",
                overdue ? "text-destructive" : "text-muted-foreground",
              )}
            >
              {formatDate(task.due_date, true)}
            </span>
          )}

          <button
            type="button"
            onClick={() => setEditing(task)}
            className="shrink-0 text-muted-foreground hover:text-foreground"
            aria-label="Редактировать"
          >
            <Pencil className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={() => setExpanded(isOpen ? null : task.id)}
            className="shrink-0 text-muted-foreground hover:text-foreground"
            aria-label="Развернуть"
          >
            <ChevronDown
              className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")}
            />
          </button>

          <DropdownMenu>
            <DropdownMenuTrigger className="shrink-0 text-muted-foreground hover:text-foreground">
              <span className="px-1 text-lg leading-none">⋯</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setEditing(task)}>
                Редактировать
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => run(() => deleteTaskRecord(task.id), "Задача удалена")}
              >
                Удалить
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {isOpen && (
          <div className="space-y-3 border-t border-border px-3 py-3 pl-11">
            {task.description ? (
              <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                {task.description}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                Нажми на карандаш, чтобы добавить описание, срок и чек-лист.
              </p>
            )}

            {checklist.length > 0 && (
              <div className="space-y-1">
                {checklist.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    disabled={pending}
                    onClick={() => run(() => toggleChecklistItem(task.id, item.id))}
                    className="flex w-full items-start gap-2 text-left text-sm text-muted-foreground hover:text-foreground"
                  >
                    {item.done ? (
                      <CheckSquare className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    ) : (
                      <Square className="mt-0.5 h-4 w-4 shrink-0" />
                    )}
                    <span className={cn(item.done && "line-through")}>{item.text}</span>
                  </button>
                ))}
              </div>
            )}

            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
              <StatusBadge label={statusMeta.label} color={statusMeta.color} />
              {task.project_title && (
                <span className="rounded-full bg-[#1B1B1F] px-2 py-0.5">
                  Проект: {task.project_title}
                </span>
              )}
              {task.client_name && (
                <span className="rounded-full bg-[#1B1B1F] px-2 py-0.5">
                  Клиент: {task.client_name}
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Прогресс */}
      <Card>
        <CardContent className="p-5">
          <div className="mb-2 flex items-end justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Прогресс по задачам</p>
              <p className="text-3xl font-semibold tracking-tight">{progress}%</p>
            </div>
            <p className="text-sm text-muted-foreground">
              {done} из {total} выполнено
            </p>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-[#1B1B1F]">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
          <div>
            <CardTitle>Задачи</CardTitle>
            <p className="text-sm text-muted-foreground">
              Компактный список с раскрытием деталей по клику.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowTemplates((v) => !v)}>
              Шаблоны
            </Button>
            <TaskFormDialog
              projects={projects}
              clients={clients}
              trigger={
                <Button size="sm">
                  <Plus className="mr-1 h-4 w-4" />
                  Добавить
                </Button>
              }
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {showTemplates && (
            <div className="flex flex-wrap gap-2 rounded-lg border border-border bg-[#1B1B1F] p-3">
              {TEMPLATES.map((t) => (
                <button
                  key={t}
                  type="button"
                  disabled={pending}
                  onClick={() => addTemplate(t)}
                  className="rounded-full border border-border px-2.5 py-0.5 text-xs text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
                >
                  + {t}
                </button>
              ))}
            </div>
          )}

          {tasks.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Задач пока нет. Добавь первую кнопкой «Добавить» или из шаблонов.
            </p>
          ) : (
            <div className="space-y-6">
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Внутри компании · {companyTasks.length}
                </p>
                {companyTasks.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Нет задач внутри компании.</p>
                ) : (
                  <div className="space-y-3">
                    {companyTasks.map((task, index) => renderTask(task, index))}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  По проектам · {projectTasks.length}
                </p>
                {projectTasks.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Нет задач по проектам.</p>
                ) : (
                  <div className="space-y-3">
                    {projectTasks.map((task, index) => renderTask(task, index))}
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Редактирование через окно (как «Этапы») */}
      <TaskFormDialog
        projects={projects}
        clients={clients}
        task={editing ?? undefined}
        open={editing !== null}
        onOpenChange={(next) => {
          if (!next) setEditing(null);
        }}
        hideTrigger
      />
    </div>
  );
}
