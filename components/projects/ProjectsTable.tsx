"use client";

import Link from "next/link";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { getPrimaryProjectStatus, PROJECT_STATUS } from "@/lib/constants";
import { formatCurrency, formatDate } from "@/lib/utils";

export type ProjectRow = {
  id: string;
  title: string;
  status: keyof typeof PROJECT_STATUS;
  progress: number;
  amount: number;
  deadline: string | null;
  client: { id: string; crmId: number } | null;
};

export type ProjectSortKey =
  | "project"
  | "client"
  | "status"
  | "amount"
  | "progress"
  | "deadline";

function SortHeader({
  label,
  sortKey,
  activeSortKey,
  direction,
  onSort,
}: {
  label: string;
  sortKey: ProjectSortKey;
  activeSortKey: ProjectSortKey;
  direction: "asc" | "desc";
  onSort: (key: ProjectSortKey) => void;
}) {
  const isActive = activeSortKey === sortKey;
  const Icon = isActive ? (direction === "asc" ? ArrowUp : ArrowDown) : ArrowUpDown;

  return (
    <button
      type="button"
      onClick={() => onSort(sortKey)}
      className="inline-flex items-center gap-1 text-left transition-colors hover:text-foreground"
    >
      <span>{label}</span>
      <Icon className="h-3.5 w-3.5" />
    </button>
  );
}

export function ProjectsTable({
  projects,
  sortKey,
  sortDirection,
  onSort,
}: {
  projects: ProjectRow[];
  sortKey: ProjectSortKey;
  sortDirection: "asc" | "desc";
  onSort: (key: ProjectSortKey) => void;
}) {
  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,1fr)_140px_120px_100px_140px] gap-4 border-b border-border px-4 py-3 text-sm text-muted-foreground">
        <div>
          <SortHeader
            label="Проект"
            sortKey="project"
            activeSortKey={sortKey}
            direction={sortDirection}
            onSort={onSort}
          />
        </div>
        <div>
          <SortHeader
            label="Клиент"
            sortKey="client"
            activeSortKey={sortKey}
            direction={sortDirection}
            onSort={onSort}
          />
        </div>
        <div>
          <SortHeader
            label="Статус"
            sortKey="status"
            activeSortKey={sortKey}
            direction={sortDirection}
            onSort={onSort}
          />
        </div>
        <div>
          <SortHeader
            label="Сумма"
            sortKey="amount"
            activeSortKey={sortKey}
            direction={sortDirection}
            onSort={onSort}
          />
        </div>
        <div>
          <SortHeader
            label="Прогресс"
            sortKey="progress"
            activeSortKey={sortKey}
            direction={sortDirection}
            onSort={onSort}
          />
        </div>
        <div>
          <SortHeader
            label="Дедлайн"
            sortKey="deadline"
            activeSortKey={sortKey}
            direction={sortDirection}
            onSort={onSort}
          />
        </div>
      </div>

      {projects.length === 0 ? (
        <div className="px-4 py-10 text-center text-sm text-muted-foreground">
          Проектов по текущим фильтрам нет.
        </div>
      ) : (
        projects.map((project) => {
          const primaryStatus = getPrimaryProjectStatus(project.status);
          const statusMeta = PROJECT_STATUS[primaryStatus];

          return (
            <Link
              key={project.id}
              href={`/projects/${project.id}`}
              className="grid grid-cols-[minmax(0,2fr)_minmax(0,1fr)_140px_120px_100px_140px] items-center gap-4 border-b border-border px-4 py-3 transition-colors hover:bg-[#1B1B1F]"
            >
              <div className="min-w-0 overflow-hidden">
                <p className="truncate font-medium">{project.title}</p>
              </div>

              <div className="truncate text-sm text-muted-foreground">
                {project.client ? (
                  <span className="font-medium text-foreground">#{project.client.crmId}</span>
                ) : (
                  "—"
                )}
              </div>

              <div className="min-w-0">
                <StatusBadge label={statusMeta.label} color={statusMeta.color} />
              </div>

              <div className="text-sm text-muted-foreground">
                {formatCurrency(project.amount)}
              </div>

              <div className="text-sm text-muted-foreground">{project.progress}%</div>

              <div className="text-sm text-muted-foreground">
                {project.deadline ? formatDate(project.deadline, true) : "—"}
              </div>
            </Link>
          );
        })
      )}
    </div>
  );
}
