"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  type ColumnDef,
  type SortingState,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { ArrowUpDown, CheckSquare, RefreshCw, Search } from "lucide-react";
import { toast } from "sonner";
import { bulkSetLeadStatus } from "@/app/(dashboard)/leads/actions";
import { LeadFormDialog } from "@/components/leads/LeadFormDialog";
import { LeadPeekSheet } from "@/components/leads/LeadPeekSheet";
import { PaginationBar } from "@/components/shared/PaginationBar";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { useCrmListUrl } from "@/components/shared/useCrmListUrl";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { LEAD_SOURCE_LABEL, LEAD_STATUS } from "@/lib/constants";
import { LEAD_STATUSES } from "@/lib/validations";
import { cn, formatCurrency, formatDate, formatDateTimeShort } from "@/lib/utils";
import type { Lead, LeadStatus } from "@/types";

export type LeadTableLabel = {
  id: string;
  name: string;
  color: string;
};

export type LeadTableItem = Lead & {
  crmId: number;
  labels: LeadTableLabel[];
};

function budgetValue(lead: LeadTableItem) {
  return lead.budget_max ?? lead.budget_min ?? 0;
}

function budgetText(lead: LeadTableItem) {
  const { budget_min: min, budget_max: max } = lead;
  if (min == null && max == null) return "—";
  if (min != null && max != null) {
    return `${formatCurrency(min)} – ${formatCurrency(max)}`;
  }
  return formatCurrency((min ?? max)!);
}

function dateValue(value: string) {
  return new Date(value).getTime();
}

export function LeadsTable({ leads }: { leads: LeadTableItem[] }) {
  const router = useRouter();
  const { query, replaceQuery, detailHref } = useCrmListUrl("/leads");
  const [refreshing, startRefresh] = useTransition();
  const [bulkPending, startBulk] = useTransition();
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkStatus, setBulkStatus] = useState<LeadStatus>("in_progress");
  const [sorting, setSorting] = useState<SortingState>([{ id: "created_at", desc: true }]);

  const search = query.q ?? "";
  const status = query.status ?? "all";
  const pageSize = query.size ?? 25;
  const page = query.page ?? 1;
  const expandedId = query.expanded;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return leads.filter((lead) => {
      if (status !== "all" && lead.status !== status) return false;
      if (!q) return true;
      return (
        lead.name.toLowerCase().includes(q) ||
        (lead.telegram_username ?? "").toLowerCase().includes(q) ||
        (lead.email ?? "").toLowerCase().includes(q) ||
        (lead.phone ?? "").toLowerCase().includes(q) ||
        LEAD_SOURCE_LABEL[lead.source].toLowerCase().includes(q) ||
        (lead.service_interest ?? "").toLowerCase().includes(q) ||
        (lead.notes ?? "").toLowerCase().includes(q) ||
        lead.labels.some((label) => label.name.toLowerCase().includes(q))
      );
    });
  }, [leads, search, status]);

  const columns = useMemo<ColumnDef<LeadTableItem>[]>(
    () => [
      {
        accessorKey: "crmId",
        header: "ID",
        cell: ({ row }) => (
          <span className="text-sm font-medium text-muted-foreground">#{row.original.crmId}</span>
        ),
      },
      {
        accessorKey: "name",
        header: ({ column }) => (
          <button
            type="button"
            className="flex items-center gap-1"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Лид <ArrowUpDown className="h-3 w-3" />
          </button>
        ),
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <p className="font-medium text-foreground">{row.original.name}</p>
            {row.original.is_duplicate && (
              <span className="rounded-full bg-[#F59E0B1A] px-2 py-0.5 text-[11px] font-medium text-[#F59E0B]">
                Дубль
              </span>
            )}
          </div>
        ),
      },
      {
        accessorKey: "status",
        header: "Статус",
        cell: ({ row }) => {
          const statusMeta = LEAD_STATUS[row.original.status];
          return <StatusBadge label={statusMeta.label} color={statusMeta.color} />;
        },
      },
      {
        accessorKey: "source",
        header: "Откуда",
        cell: ({ row }) => (
          <span className="text-muted-foreground">{LEAD_SOURCE_LABEL[row.original.source]}</span>
        ),
      },
      {
        accessorKey: "service_interest",
        header: "Запрос",
        cell: ({ row }) => (
          <span className="text-muted-foreground">{row.original.service_interest || "—"}</span>
        ),
      },
      {
        id: "labels",
        header: "Лейблы",
        cell: ({ row }) =>
          row.original.labels.length ? (
            <div className="flex flex-wrap gap-1">
              {row.original.labels.map((label) => (
                <StatusBadge
                  key={label.id}
                  label={label.name}
                  color={label.color}
                  className="px-2 py-0.5"
                />
              ))}
            </div>
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
      },
      {
        id: "budget",
        accessorFn: (row) => budgetValue(row),
        header: ({ column }) => (
          <button
            type="button"
            className="flex items-center gap-1"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Бюджет <ArrowUpDown className="h-3 w-3" />
          </button>
        ),
        cell: ({ row }) => budgetText(row.original),
      },
      {
        accessorKey: "created_at",
        accessorFn: (row) => dateValue(row.created_at),
        header: ({ column }) => (
          <button
            type="button"
            className="flex items-center gap-1"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Создан <ArrowUpDown className="h-3 w-3" />
          </button>
        ),
        cell: ({ row }) => (
          <span className="text-muted-foreground">{formatDate(row.original.created_at)}</span>
        ),
      },
      {
        id: "last_contact",
        accessorFn: (row) => (row.last_contact_at ? new Date(row.last_contact_at).getTime() : 0),
        header: ({ column }) => (
          <button
            type="button"
            className="flex items-center gap-1"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Контакт <ArrowUpDown className="h-3 w-3" />
          </button>
        ),
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {formatDateTimeShort(row.original.last_contact_at)}
          </span>
        ),
      },
    ],
    [],
  );

  const table = useReactTable({
    data: filtered,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const sortedRows = table.getRowModel().rows;
  const totalPages = Math.max(1, Math.ceil(sortedRows.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageRows = sortedRows.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const peekLead = useMemo(
    () => (expandedId ? (leads.find((l) => l.id === expandedId) ?? null) : null),
    [expandedId, leads],
  );

  function refresh() {
    startRefresh(() => {
      router.refresh();
      toast.success("Список лидов обновлён");
    });
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 2) {
        toast.message("Можно выбрать не более 2 лидов");
        return prev;
      }
      return [...prev, id];
    });
  }

  function onRowInteract(id: string) {
    if (selectionMode) {
      toggleSelect(id);
      return;
    }
    replaceQuery({
      expanded: expandedId === id ? undefined : id,
      page: currentPage > 1 ? currentPage : undefined,
    });
  }

  function applyBulkStatus() {
    if (selectedIds.length === 0) {
      toast.error("Выберите 1–2 лида");
      return;
    }
    startBulk(async () => {
      const result = await bulkSetLeadStatus(selectedIds, bulkStatus);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Статус обновлён");
      setSelectedIds([]);
      setSelectionMode(false);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4 pb-24">
      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          variant={selectionMode ? "default" : "outline"}
          size="sm"
          className="shrink-0"
          onClick={() => {
            setSelectionMode((v) => !v);
            setSelectedIds([]);
          }}
        >
          <CheckSquare className="mr-2 h-4 w-4" />
          Отметить
        </Button>

        {selectionMode && selectedIds.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-card px-3 py-2">
            <span className="text-sm text-muted-foreground">
              Выбрано: {selectedIds.length}/2
            </span>
            <Select value={bulkStatus} onValueChange={(v) => setBulkStatus(v as LeadStatus)}>
              <SelectTrigger className="h-8 w-44 bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LEAD_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {LEAD_STATUS[s].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button size="sm" onClick={applyBulkStatus} disabled={bulkPending}>
              Сменить статус
            </Button>
          </div>
        )}

        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) =>
              replaceQuery({ q: e.target.value || undefined, page: 1, expanded: undefined })
            }
            placeholder="Поиск..."
            className="bg-card pl-9"
          />
        </div>

        <Select
          value={status}
          onValueChange={(v) => replaceQuery({ status: v, page: 1, expanded: undefined })}
        >
          <SelectTrigger className="w-52 bg-card">
            <SelectValue placeholder="Все статусы" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все статусы</SelectItem>
            {LEAD_STATUSES.map((leadStatus) => (
              <SelectItem key={leadStatus} value={leadStatus}>
                {LEAD_STATUS[leadStatus].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          variant="outline"
          size="icon"
          onClick={refresh}
          disabled={refreshing}
          title="Обновить"
          className="bg-card"
        >
          <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
        </Button>

        <div className="ml-auto">
          <LeadFormDialog />
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="hover:bg-transparent">
                {selectionMode && <TableHead className="w-10" />}
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {pageRows.length ? (
              pageRows.map((row) => {
                const isExpanded = expandedId === row.original.id;
                const isSelected = selectedIds.includes(row.original.id);
                const isActive = isExpanded || isSelected;

                return (
                  <TableRow
                    key={row.id}
                    className={cn(
                      "cursor-pointer transition-colors",
                      isActive
                        ? "bg-primary/10 hover:bg-primary/15"
                        : "hover:bg-[#1B1B1F]",
                    )}
                    onClick={() => onRowInteract(row.original.id)}
                  >
                    {selectionMode && (
                      <TableCell
                        className="w-10"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(row.original.id)}
                          className="h-4 w-4 rounded border-border accent-primary"
                          aria-label="Выбрать лид"
                        />
                      </TableCell>
                    )}
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length + (selectionMode ? 1 : 0)}
                  className="h-32 text-center text-muted-foreground"
                >
                  {leads.length === 0
                    ? "Лидов пока нет. Создайте первый лид."
                    : "По текущим фильтрам лидов не найдено."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <LeadPeekSheet
        lead={peekLead}
        open={Boolean(expandedId) && !selectionMode}
        onOpenChange={(open) => {
          if (!open) {
            replaceQuery({
              expanded: undefined,
              page: currentPage > 1 ? currentPage : undefined,
            });
          }
        }}
        detailHref={peekLead ? detailHref(peekLead.id) : "/leads"}
      />

      {sortedRows.length > 0 && (
        <PaginationBar
          total={sortedRows.length}
          page={currentPage}
          totalPages={totalPages}
          pageSize={pageSize}
          onPage={(p) => replaceQuery({ page: p, expanded: expandedId })}
          onPageSize={(size) => replaceQuery({ size, page: 1, expanded: undefined })}
        />
      )}
    </div>
  );
}
