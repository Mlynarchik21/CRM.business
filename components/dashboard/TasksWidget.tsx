import Link from "next/link";
import { ListChecks } from "lucide-react";
import { StatusBadge } from "@/components/shared/StatusBadge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PRIORITY } from "@/lib/constants";
import { cn, formatDate } from "@/lib/utils";
import type { Priority, Task } from "@/types";

type TaskItem = Pick<Task, "id" | "title" | "due_date" | "priority" | "status">;

export function TasksWidget({ tasks }: { tasks: TaskItem[] }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Задачи на контроле</CardTitle>
        <Link href="/tasks" className="text-xs text-primary hover:underline">
          Все задачи
        </Link>
      </CardHeader>
      <CardContent className="space-y-1">
        {tasks.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Нет задач с близкими сроками
          </p>
        ) : (
          tasks.map((task) => {
            const priorityMeta = PRIORITY[task.priority as Priority];
            const overdue =
              task.due_date &&
              task.status !== "done" &&
              new Date(task.due_date).getTime() < Date.now();

            return (
              <Link
                key={task.id}
                href="/tasks"
                className="flex items-center justify-between gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-card"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <ListChecks className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{task.title}</p>
                    <p
                      className={cn(
                        "text-xs",
                        overdue ? "text-destructive" : "text-muted-foreground",
                      )}
                    >
                      {task.due_date ? formatDate(task.due_date, true) : "Без срока"}
                      {overdue ? " · просрочена" : ""}
                    </p>
                  </div>
                </div>
                {priorityMeta && (
                  <StatusBadge label={priorityMeta.label} color={priorityMeta.color} />
                )}
              </Link>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
