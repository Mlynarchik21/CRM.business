"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Check } from "lucide-react";
import { toast } from "sonner";
import { setSupportStatus } from "@/app/(dashboard)/support/actions";
import { PaginationBar } from "@/components/shared/PaginationBar";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { SupportTicketFormDialog } from "@/components/support/SupportTicketFormDialog";
import { Button } from "@/components/ui/button";
import { SUPPORT_PRIORITY, SUPPORT_STATUS } from "@/lib/constants";
import { cn, formatDate } from "@/lib/utils";
import type { SupportTicket } from "@/types";

export type SupportRow = SupportTicket & {
  client_name?: string | null;
  project_title?: string | null;
};

const GRID =
  "grid grid-cols-[minmax(0,2fr)_minmax(0,1.2fr)_140px_120px_120px_110px] items-center gap-4";

export function SupportTable({
  tickets,
  clients,
  projects,
}: {
  tickets: SupportRow[];
  clients: { id: string; name: string }[];
  projects: { id: string; title: string }[];
}) {
  const [editing, setEditing] = useState<SupportRow | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [pageSize, setPageSize] = useState(25);
  const [page, setPage] = useState(1);
  const [, startTransition] = useTransition();

  useEffect(() => {
    setPage(1);
  }, [pageSize, tickets.length]);

  const totalPages = Math.max(1, Math.ceil(tickets.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageRows = useMemo(
    () => tickets.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [tickets, currentPage, pageSize],
  );

  function resolve(id: string) {
    setPendingId(id);
    startTransition(async () => {
      const result = await setSupportStatus(id, "resolved");
      setPendingId(null);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Обращение отмечено решённым");
    });
  }

  return (
    <>
      <div className="rounded-xl border border-border bg-card">
        <div className={cn(GRID, "border-b border-border px-4 py-3 text-sm text-muted-foreground")}>
          <div>Тема</div>
          <div>Клиент</div>
          <div>Статус</div>
          <div>Приоритет</div>
          <div>Создано</div>
          <div className="text-right">Действие</div>
        </div>

        {tickets.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-muted-foreground">
            Обращений пока нет. Создай первое обращение или подключи Telegram-бота поддержки.
          </div>
        ) : (
          pageRows.map((ticket) => {
            const statusMeta = SUPPORT_STATUS[ticket.status];
            const priorityMeta = SUPPORT_PRIORITY[ticket.priority];

            return (
              <div
                key={ticket.id}
                className={cn(
                  GRID,
                  "border-b border-border px-4 py-3 transition-colors hover:bg-[#1B1B1F]",
                )}
              >
                <button
                  type="button"
                  onClick={() => setEditing(ticket)}
                  className="truncate text-left font-medium hover:text-primary"
                >
                  {ticket.title}
                </button>

                <div className="truncate text-sm text-muted-foreground">
                  {ticket.client_name || "—"}
                </div>

                <div className="min-w-0">
                  <StatusBadge label={statusMeta.label} color={statusMeta.color} />
                </div>

                <div className="min-w-0">
                  <StatusBadge label={priorityMeta.label} color={priorityMeta.color} />
                </div>

                <div className="text-sm text-muted-foreground">
                  {formatDate(ticket.created_at, true)}
                </div>

                <div className="flex justify-end">
                  {ticket.status !== "resolved" && ticket.status !== "closed" ? (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={pendingId === ticket.id}
                      onClick={() => resolve(ticket.id)}
                    >
                      <Check className="mr-1 h-3.5 w-3.5" />
                      Решить
                    </Button>
                  ) : (
                    <span className="text-xs text-primary">Закрыто</span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {tickets.length > 0 && (
        <PaginationBar
          total={tickets.length}
          page={currentPage}
          totalPages={totalPages}
          pageSize={pageSize}
          onPage={setPage}
          onPageSize={setPageSize}
        />
      )}

      <SupportTicketFormDialog
        clients={clients}
        projects={projects}
        ticket={editing ?? undefined}
        open={editing !== null}
        onOpenChange={(next) => {
          if (!next) setEditing(null);
        }}
        hideTrigger
      />
    </>
  );
}
