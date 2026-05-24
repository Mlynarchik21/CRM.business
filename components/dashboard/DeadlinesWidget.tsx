import Link from "next/link";
import { CalendarClock } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { PROJECT_STATUS } from "@/lib/constants";
import { formatDate } from "@/lib/utils";
import type { Project } from "@/types";

type DeadlineProject = Pick<Project, "id" | "title" | "deadline" | "status">;

export function DeadlinesWidget({ projects }: { projects: DeadlineProject[] }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Ближайшие дедлайны</CardTitle>
        <Link href="/projects" className="text-xs text-primary hover:underline">
          Все проекты
        </Link>
      </CardHeader>
      <CardContent className="space-y-1">
        {projects.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Нет проектов с дедлайнами
          </p>
        ) : (
          projects.map((project) => {
            const statusMeta = PROJECT_STATUS[project.status];
            return (
              <Link
                key={project.id}
                href={`/projects/${project.id}`}
                className="flex items-center justify-between rounded-lg px-2 py-2 transition-colors hover:bg-card"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <CalendarClock className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{project.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {project.deadline ? formatDate(project.deadline, true) : "—"}
                    </p>
                  </div>
                </div>
                <StatusBadge label={statusMeta.label} color={statusMeta.color} />
              </Link>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
