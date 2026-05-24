"use client";

import { useEffect, useMemo, useState } from "react";
import { PaymentDetailsDialog } from "@/components/payments/PaymentDetailsDialog";
import { PaymentFormDialog } from "@/components/payments/PaymentFormDialog";
import { PaginationBar } from "@/components/shared/PaginationBar";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { getPaymentStatusMeta, PAYMENT_METHOD_LABEL } from "@/lib/constants";
import { cn, formatCurrency, formatDateTimeGmt3, transactionId } from "@/lib/utils";
import type { Payment, PaymentMethod } from "@/types";

export type PaymentRow = Payment & {
  client_name?: string | null;
  project_title?: string | null;
};

const GRID =
  "grid grid-cols-[130px_110px_minmax(0,1.2fr)_minmax(0,1.2fr)_120px_130px_minmax(0,190px)] items-center gap-4";

export function PaymentsTable({
  payments,
  clients,
  projects,
}: {
  payments: PaymentRow[];
  clients: { id: string; name: string }[];
  projects: { id: string; title: string }[];
}) {
  const [viewing, setViewing] = useState<PaymentRow | null>(null);
  const [editing, setEditing] = useState<PaymentRow | null>(null);
  const [pageSize, setPageSize] = useState(25);
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [pageSize, payments.length]);

  const totalPages = Math.max(1, Math.ceil(payments.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageRows = useMemo(
    () => payments.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [payments, currentPage, pageSize],
  );

  return (
    <>
      <div className="rounded-xl border border-border bg-card">
        <div className={cn(GRID, "border-b border-border px-4 py-3 text-sm text-muted-foreground")}>
          <div>ID транзакции</div>
          <div>Сумма</div>
          <div>Клиент</div>
          <div>Проект</div>
          <div>Статус</div>
          <div>Способ</div>
          <div>Проведена (GMT+3)</div>
        </div>

        {payments.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-muted-foreground">
            Оплат пока нет. Добавь первую оплату и привяжи её к клиенту и проекту.
          </div>
        ) : (
          pageRows.map((payment) => {
            const statusMeta = getPaymentStatusMeta(payment.status);
            const processedAt = payment.paid_at ?? payment.expected_at ?? payment.created_at;

            return (
              <button
                key={payment.id}
                type="button"
                onClick={() => setViewing(payment)}
                className={cn(
                  GRID,
                  "w-full border-b border-border px-4 py-3 text-left transition-colors hover:bg-[#1B1B1F]",
                )}
              >
                <span className="truncate font-mono text-xs text-muted-foreground">
                  {transactionId(payment.id)}
                </span>
                <span className="font-medium">
                  {formatCurrency(payment.amount, payment.currency || "USD")}
                </span>
                <span className="truncate text-sm text-muted-foreground">
                  {payment.client_name || "—"}
                </span>
                <span className="truncate text-sm text-muted-foreground">
                  {payment.project_title || "—"}
                </span>
                <span className="min-w-0">
                  <StatusBadge label={statusMeta.label} color={statusMeta.color} />
                </span>
                <span className="truncate text-sm text-muted-foreground">
                  {payment.payment_method
                    ? PAYMENT_METHOD_LABEL[payment.payment_method as PaymentMethod]
                    : "—"}
                </span>
                <span className="truncate text-sm text-muted-foreground">
                  {formatDateTimeGmt3(processedAt)}
                </span>
              </button>
            );
          })
        )}

      </div>

      {payments.length > 0 && (
        <PaginationBar
          total={payments.length}
          page={currentPage}
          totalPages={totalPages}
          pageSize={pageSize}
          onPage={setPage}
          onPageSize={setPageSize}
        />
      )}

      {/* Шаг 1: просмотр транзакции */}
      <PaymentDetailsDialog
        payment={viewing}
        open={viewing !== null}
        onOpenChange={(next) => {
          if (!next) setViewing(null);
        }}
        onEdit={() => {
          setEditing(viewing);
          setViewing(null);
        }}
      />

      {/* Шаг 2: редактирование (после нажатия «Изменить») */}
      <PaymentFormDialog
        clients={clients}
        projects={projects}
        payment={editing ?? undefined}
        open={editing !== null}
        onOpenChange={(next) => {
          if (!next) setEditing(null);
        }}
        hideTrigger
      />
    </>
  );
}
