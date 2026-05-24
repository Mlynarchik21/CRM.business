"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { ProjectsTable, type ProjectRow, type ProjectSortKey } from "@/components/projects/ProjectsTable";
import { PaginationBar } from "@/components/shared/PaginationBar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getPrimaryProjectStatus,
  PRIMARY_PROJECT_STATUSES,
  PROJECT_STATUS,
} from "@/lib/constants";

type SortDirection = "asc" | "desc";

function compareNullableDates(a: string | null, b: string | null) {
  if (!a && !b) return 0;
  if (!a) return 1;
  if (!b) return -1;
  return new Date(a).getTime() - new Date(b).getTime();
}

export function ProjectsView({ projects }: { projects: ProjectRow[] }) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | (typeof PRIMARY_PROJECT_STATUSES)[number]>("all");
  const [sortKey, setSortKey] = useState<ProjectSortKey>("deadline");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [pageSize, setPageSize] = useState(25);
  const [page, setPage] = useState(1);

  const statusCounts = useMemo(() => {
    return PRIMARY_PROJECT_STATUSES.reduce<Record<(typeof PRIMARY_PROJECT_STATUSES)[number], number>>(
      (acc, status) => {
        acc[status] = projects.filter(
          (project) => getPrimaryProjectStatus(project.status) === status,
        ).length;
        return acc;
      },
      {
        in_progress: 0,
        paused: 0,
        completed: 0,
        cancelled: 0,
      },
    );
  }, [projects]);

  const filteredProjects = useMemo(() => {
    const query = search.trim().toLowerCase();

    const filtered = projects.filter((project) => {
      const primaryStatus = getPrimaryProjectStatus(project.status);
      const matchesStatus = statusFilter === "all" || primaryStatus === statusFilter;
      const matchesSearch =
        !query ||
        project.title.toLowerCase().includes(query) ||
        String(project.client?.crmId ?? "").includes(query) ||
        PROJECT_STATUS[primaryStatus].label.toLowerCase().includes(query);

      return matchesStatus && matchesSearch;
    });

    const sorted = [...filtered].sort((left, right) => {
      let result = 0;

      switch (sortKey) {
        case "project":
          result = left.title.localeCompare(right.title, "ru");
          break;
        case "client":
          result = (left.client?.crmId ?? 0) - (right.client?.crmId ?? 0);
          break;
        case "status":
          result = PROJECT_STATUS[getPrimaryProjectStatus(left.status)].label.localeCompare(
            PROJECT_STATUS[getPrimaryProjectStatus(right.status)].label,
            "ru",
          );
          break;
        case "amount":
          result = left.amount - right.amount;
          break;
        case "progress":
          result = left.progress - right.progress;
          break;
        case "deadline":
          result = compareNullableDates(left.deadline, right.deadline);
          break;
      }

      return sortDirection === "asc" ? result : -result;
    });

    return sorted;
  }, [projects, search, statusFilter, sortKey, sortDirection]);

  const hasActiveFilters = search.trim() || statusFilter !== "all";

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filteredProjects.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageProjects = filteredProjects.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  function onSort(nextKey: ProjectSortKey) {
    if (sortKey === nextKey) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setSortKey(nextKey);
    setSortDirection(nextKey === "deadline" ? "asc" : "desc");
  }

  return (
    <div className="space-y-4 pb-24">
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1.6fr)_240px_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Поиск по названию проекта или ID клиента"
              className="pl-9"
            />
          </div>

          <Select
            value={statusFilter}
            onValueChange={(value) =>
              setStatusFilter(value as "all" | (typeof PRIMARY_PROJECT_STATUSES)[number])
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Все статусы" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все статусы</SelectItem>
              {PRIMARY_PROJECT_STATUSES.map((status) => (
                <SelectItem key={status} value={status}>
                  {PROJECT_STATUS[status].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            type="button"
            variant="outline"
            disabled={!hasActiveFilters}
            onClick={() => {
              setSearch("");
              setStatusFilter("all");
            }}
          >
            <X className="mr-2 h-4 w-4" />
            Сбросить
          </Button>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
          {PRIMARY_PROJECT_STATUSES.map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setStatusFilter((current) => (current === status ? "all" : status))}
              className={statusFilter === status ? "text-foreground" : ""}
            >
              {PROJECT_STATUS[status].label}
              <span className="ml-1.5 tabular-nums opacity-70">{statusCounts[status]}</span>
            </button>
          ))}
        </div>
      </div>

      <ProjectsTable
        projects={pageProjects}
        sortKey={sortKey}
        sortDirection={sortDirection}
        onSort={onSort}
      />

      {filteredProjects.length > 0 && (
        <PaginationBar
          total={filteredProjects.length}
          page={currentPage}
          totalPages={totalPages}
          pageSize={pageSize}
          onPage={setPage}
          onPageSize={setPageSize}
        />
      )}
    </div>
  );
}
