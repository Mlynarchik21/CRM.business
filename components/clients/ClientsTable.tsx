"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  type ColumnDef,
  type SortingState,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { ArrowUpDown, Search } from "lucide-react";
import { ClientFormDialog } from "@/components/clients/ClientFormDialog";
import { PaginationBar } from "@/components/shared/PaginationBar";
import { StatusBadge } from "@/components/shared/StatusBadge";
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
import { formatCurrency, formatDate, formatDateTimeShort, formatNumber } from "@/lib/utils";
import type { Client } from "@/types";

export type ClientTableItem = Client & {
  crmId: number;
};

export function ClientsTable({ clients }: { clients: ClientTableItem[] }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [view, setView] = useState<"active" | "archived" | "all">("active");
  const [pageSize, setPageSize] = useState(25);
  const [page, setPage] = useState(1);
  const [sorting, setSorting] = useState<SortingState>([
    { id: "created_at", desc: true },
  ]);

  useEffect(() => {
    setPage(1);
  }, [search, status, view, pageSize]);

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
            ? LEAD_SOURCE_LABEL[row.original.source as keyof typeof LEAD_SOURCE_LABEL] ??
              row.original.source
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
            className="flex items-center gap-1"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Последнее взаимодействие <ArrowUpDown className="h-3 w-3" />
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

  return (
    <div className="space-y-4 pb-24">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative max-w-xs flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Поиск по имени, компании, telegram, email..."
            className="bg-card pl-9"
          />
        </div>

        <Select value={status} onValueChange={setStatus}>
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

        <Select value={view} onValueChange={(v) => setView(v as typeof view)}>
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
                  onClick={() => router.push(`/clients/${row.original.id}`)}
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
                  {clients.length === 0
                    ? "Клиентов пока нет. Создайте первого вручную или переведите лида."
                    : "Ничего не найдено по фильтрам."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {sortedRows.length > 0 && (
        <PaginationBar
          total={sortedRows.length}
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
