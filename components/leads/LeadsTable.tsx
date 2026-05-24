"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  type ColumnDef,
  type SortingState,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { ArrowUpDown, ChevronLeft, ChevronRight, RefreshCw, Search } from "lucide-react";
import { toast } from "sonner";
import { LeadFormDialog } from "@/components/leads/LeadFormDialog";
import { StatusBadge } from "@/components/shared/StatusBadge";
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
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import type { Lead } from "@/types";

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

export function LeadsTable({
  leads,
}: {
  leads: LeadTableItem[];
}) {
  const router = useRouter();
  const [refreshing, startRefresh] = useTransition();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [pageSize, setPageSize] = useState(25);
  const [page, setPage] = useState(1);

  function refresh() {
    startRefresh(() => {
      router.refresh();
      toast.success("Список лидов обновлён");
    });
  }
  const [sorting, setSorting] = useState<SortingState>([
    { id: "created_at", desc: true },
  ]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return leads.filter((lead) => {
      if (status !== "all" && lead.status !== status) return false;
      if (!query) return true;

      return (
        lead.name.toLowerCase().includes(query) ||
        (lead.telegram_username ?? "").toLowerCase().includes(query) ||
        (lead.email ?? "").toLowerCase().includes(query) ||
        (lead.phone ?? "").toLowerCase().includes(query) ||
        LEAD_SOURCE_LABEL[lead.source].toLowerCase().includes(query) ||
        (lead.service_interest ?? "").toLowerCase().includes(query) ||
        (lead.notes ?? "").toLowerCase().includes(query) ||
        lead.labels.some((label) => label.name.toLowerCase().includes(query))
      );
    });
  }, [leads, search, status]);

  useEffect(() => {
    setPage(1);
  }, [search, status, pageSize]);

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
        header: "Откуда пришёл",
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {LEAD_SOURCE_LABEL[row.original.source]}
          </span>
        ),
      },
      {
        accessorKey: "service_interest",
        header: "Что ищет",
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {row.original.service_interest || "—"}
          </span>
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
            className="flex items-center gap-1"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Создан <ArrowUpDown className="h-3 w-3" />
          </button>
        ),
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {formatDate(row.original.created_at)}
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

  return (
    <div className="space-y-4 pb-20">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Поиск по имени, контактам, источнику, описанию..."
            className="bg-card pl-9"
          />
        </div>

        <Select value={status} onValueChange={setStatus}>
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
          title="Обновить список"
          className="bg-card"
        >
          <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
        </Button>

        <div className="ml-auto">
          <LeadFormDialog />
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="hover:bg-transparent">
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
              pageRows.map((row) => (
                <TableRow
                  key={row.id}
                  className="cursor-pointer transition-colors hover:bg-[#1B1B1F]"
                  onClick={() => router.push(`/leads/${row.original.id}`)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
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

      <div className="fixed bottom-0 left-[240px] right-0 z-20 border-t border-border bg-background/95 px-6 py-4 backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Показывать</span>
            <Select value={String(pageSize)} onValueChange={(value) => setPageSize(Number(value))}>
              <SelectTrigger className="w-24 bg-card">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-sm text-muted-foreground">из {sortedRows.length}</span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              disabled={currentPage <= 1}
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="min-w-24 text-center text-sm text-muted-foreground">
              Страница {currentPage} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="icon"
              disabled={currentPage >= totalPages}
              onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
