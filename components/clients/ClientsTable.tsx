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
import { ArrowUpDown, CheckSquare, Search } from "lucide-react";
import { toast } from "sonner";
import { bulkSetClientStatus } from "@/app/(dashboard)/clients/actions";
import { ClientFormDialog } from "@/components/clients/ClientFormDialog";
import { ClientPeekSheet } from "@/components/clients/ClientPeekSheet";
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
import { CLIENT_STATUS, LEAD_SOURCE_LABEL } from "@/lib/constants";
import { CLIENT_STATUSES } from "@/lib/validations";
import { cn, formatCurrency, formatDate, formatDateTimeShort, formatNumber } from "@/lib/utils";
import type { Client, ClientStatus } from "@/types";

export type ClientTableItem = Client & {
  crmId: number;
};

export function ClientsTable({ clients }: { clients: ClientTableItem[] }) {
  const router = useRouter();
  const { query, replaceQuery, detailHref } = useCrmListUrl("/clients");
  const [bulkPending, startBulk] = useTransition();
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkStatus, setBulkStatus] = useState<ClientStatus>("active");
  const [sorting, setSorting] = useState<SortingState>([{ id: "created_at", desc: true }]);

  const search = query.q ?? "";
  const status = query.status ?? "all";
  const view = query.view ?? "active";
  const pageSize = query.size ?? 25;
  const page = query.page ?? 1;
  const expandedId = query.expanded;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return clients.filter((client) => {
      const archived = Boolean(client.archived);
      if (view === "active" && archived) return false;
      if (view === "archived" && !archived) return false;
      if (status !== "all" && client.status !== status) return false;
      if (!q) return true;
      return (
        client.name.toLowerCase().includes(q) ||
        (client.company_name ?? "").toLowerCase().includes(q) ||
        (client.telegram_username ?? "").toLowerCase().includes(q) ||
        (client.email ?? "").toLowerCase().includes(q) ||
        (client.notes ?? "").toLowerCase().includes(q)
      );
    });
  }, [clients, search, status, view]);

  const columns = useMemo<ColumnDef<ClientTableItem>[]>(
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
            Имя <ArrowUpDown className="h-3 w-3" />
          </button>
        ),
        cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
      },
      {
        accessorKey: "company_name",
        header: "Компания",
        cell: ({ row }) => row.original.company_name || "—",
      },
      {
        accessorKey: "status",
        header: "Статус",
        cell: ({ row }) => {
          const statusMeta = CLIENT_STATUS[row.original.status];
          return <StatusBadge label={statusMeta.label} color={statusMeta.color} />;
        },
      },
      {
        accessorKey: "source",
        header: "Источник",
        cell: ({ row }) =>
          row.original.source
            ? (LEAD_SOURCE_LABEL[row.original.source as keyof typeof LEAD_SOURCE_LABEL] ??
              row.original.source)
            : "—",
      },
      {
        accessorKey: "total_paid",
        header: "Оплачено",
        cell: ({ row }) => formatCurrency(row.original.total_paid),
      },
      {
        accessorKey: "projects_count",
        header: "Проекты",
        cell: ({ row }) => formatNumber(row.original.projects_count),
      },
      {
        accessorKey: "created_at",
        header: ({ column }) => (
          <button
            type="button"
            className="flex items-center gap-1"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Создан <ArrowUpDown className="h-3 w-3" />
          </button>
        ),
        cell: ({ row }) => formatDate(row.original.created_at),
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

  const peekClient = useMemo(
    () => (expandedId ? (clients.find((c) => c.id === expandedId) ?? null) : null),
    [expandedId, clients],
  );

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 2) {
        toast.message("Можно выбрать не более 2 клиентов");
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
      toast.error("Выберите 1–2 клиентов");
      return;
    }
    startBulk(async () => {
      const result = await bulkSetClientStatus(selectedIds, bulkStatus);
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
            <Select value={bulkStatus} onValueChange={(v) => setBulkStatus(v as ClientStatus)}>
              <SelectTrigger className="h-8 w-44 bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CLIENT_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {CLIENT_STATUS[s].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button size="sm" onClick={applyBulkStatus} disabled={bulkPending}>
              Сменить статус
            </Button>
          </div>
        )}

        <div className="relative max-w-xs flex-1">
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
          <SelectTrigger className="w-44 bg-card">
            <SelectValue placeholder="Статус" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все статусы</SelectItem>
            {CLIENT_STATUSES.map((clientStatus) => (
              <SelectItem key={clientStatus} value={clientStatus}>
                {CLIENT_STATUS[clientStatus].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={view}
          onValueChange={(v) => replaceQuery({ view: v, page: 1, expanded: undefined })}
        >
          <SelectTrigger className="w-36 bg-card">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Активные</SelectItem>
            <SelectItem value="archived">Архив</SelectItem>
            <SelectItem value="all">Все</SelectItem>
          </SelectContent>
        </Select>

        <div className="ml-auto">
          <ClientFormDialog />
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
                      <TableCell className="w-10" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(row.original.id)}
                          className="h-4 w-4 rounded border-border accent-primary"
                          aria-label="Выбрать клиента"
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
                  {clients.length === 0
                    ? "Клиентов пока нет."
                    : "Ничего не найдено по фильтрам."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <ClientPeekSheet
        client={peekClient}
        open={Boolean(expandedId) && !selectionMode}
        onOpenChange={(open) => {
          if (!open) {
            replaceQuery({
              expanded: undefined,
              page: currentPage > 1 ? currentPage : undefined,
            });
          }
        }}
        detailHref={peekClient ? detailHref(peekClient.id) : "/clients"}
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
