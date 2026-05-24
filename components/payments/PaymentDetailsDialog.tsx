"use client";

import { ExternalLink, Pencil } from "lucide-react";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getPaymentStatusMeta, PAYMENT_METHOD_LABEL } from "@/lib/constants";
import { formatCurrency, formatDateTimeGmt3, transactionId } from "@/lib/utils";
import type { Payment, PaymentMethod } from "@/types";

const KIND_LABEL: Record<string, string> = {
  deposit: "Предоплата",
  part: "Частичная оплата",
  final: "Финальная оплата",
  other: "Другое",
};

export type PaymentRowLike = Payment & {
  client_name?: string | null;
  project_title?: string | null;
};

function parseComment(comment?: string | null) {
  const text = String(comment ?? "");
  const match = text.match(/^\[(deposit|part|final|other)\]\s*/);
  const kind = match?.[1] ?? "other";
  const body = match ? text.slice(match[0].length) : text;
  return { kind, body: body.trim() };
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2">
      <span className="shrink-0 text-sm text-muted-foreground">{label}</span>
      <div className="min-w-0 text-right text-sm font-medium">{value}</div>
    </div>
  );
}

export function PaymentDetailsDialog({
  payment,
  open,
  onOpenChange,
  onEdit,
}: {
  payment: PaymentRowLike | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: () => void;
}) {
  if (!payment) return null;

  const statusMeta = getPaymentStatusMeta(payment.status);
  const { kind, body } = parseComment(payment.comment);
  const processedAt = payment.paid_at ?? payment.expected_at ?? payment.created_at;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <span className="font-mono text-base">{transactionId(payment.id)}</span>
            <StatusBadge label={statusMeta.label} color={statusMeta.color} />
          </DialogTitle>
        </DialogHeader>

        <div className="divide-y divide-border rounded-xl border border-border bg-card px-4">
          <Row
            label="Сумма"
            value={
              <span className="text-base">
                {formatCurrency(payment.amount, payment.currency || "USD")}
              </span>
            }
          />
          <Row label="Тип платежа" value={KIND_LABEL[kind] ?? "Другое"} />
          <Row
            label="Способ"
            value={
              payment.payment_method
                ? PAYMENT_METHOD_LABEL[payment.payment_method as PaymentMethod]
                : "—"
            }
          />
          <Row label="Клиент" value={payment.client_name || "—"} />
          <Row label="Проект" value={payment.project_title || "—"} />
          <Row label="Проведена" value={formatDateTimeGmt3(processedAt)} />
          {payment.expected_at && (
            <Row label="Ожидаемая дата" value={formatDateTimeGmt3(payment.expected_at)} />
          )}
          <Row
            label="Чек"
            value={
              payment.receipt_url ? (
                <a
                  href={payment.receipt_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-primary hover:underline"
                >
                  Открыть <ExternalLink className="h-3.5 w-3.5" />
                </a>
              ) : (
                "—"
              )
            }
          />
          {body && (
            <div className="py-2">
              <p className="text-sm text-muted-foreground">Комментарий</p>
              <p className="mt-1 whitespace-pre-wrap text-sm">{body}</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button onClick={onEdit}>
            <Pencil className="mr-2 h-4 w-4" />
            Изменить
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
