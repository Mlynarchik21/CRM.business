"use client";

import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { ExternalLink, Plus, Upload } from "lucide-react";
import { toast } from "sonner";
import {
  createPaymentRecord,
  updatePaymentRecord,
} from "@/app/(dashboard)/payments/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { PAYMENT_METHOD_LABEL, PAYMENT_STATUS } from "@/lib/constants";
import {
  PAYMENT_METHODS,
  PAYMENT_STATUSES,
  paymentSchema,
  type PaymentFormValues,
} from "@/lib/validations";
import type { Payment } from "@/types";

type PaymentKind = "deposit" | "part" | "final" | "other";

const PAYMENT_KIND_LABEL: Record<PaymentKind, string> = {
  deposit: "Предоплата",
  part: "Частичная оплата",
  final: "Финальная оплата",
  other: "Другое",
};

const numberField = {
  setValueAs: (value: unknown) =>
    value === "" || value === null || value === undefined ? undefined : Number(value),
};

function parsePaymentComment(comment?: string | null) {
  const text = String(comment ?? "");
  const match = text.match(/^\[(deposit|part|final|other)\]\s*/);
  const kind = (match?.[1] as PaymentKind | undefined) ?? "other";
  const body = match ? text.slice(match[0].length) : text;

  return { kind, body };
}

function composePaymentComment(kind: PaymentKind, body: string) {
  const trimmed = body.trim();
  if (!trimmed) return `[${kind}]`;
  return `[${kind}] ${trimmed}`;
}

function defaults(
  payment?: Payment,
  initialClientId?: string,
  initialProjectId?: string,
): PaymentFormValues {
  return {
    client_id: payment?.client_id ?? initialClientId ?? "",
    project_id: payment?.project_id ?? initialProjectId ?? "",
    deal_id: payment?.deal_id ?? "",
    amount: payment?.amount ?? 0,
    currency: payment?.currency ?? "USD",
    status: payment?.status ?? "expected",
    payment_method: payment?.payment_method ?? undefined,
    paid_at: payment?.paid_at ? payment.paid_at.slice(0, 16) : "",
    expected_at: payment?.expected_at ? payment.expected_at.slice(0, 16) : "",
    receipt_url: payment?.receipt_url ?? "",
    comment: parsePaymentComment(payment?.comment).body,
  };
}

export function PaymentFormDialog({
  clients,
  projects,
  payment,
  open: controlledOpen,
  onOpenChange,
  hideTrigger,
  trigger,
  initialClientId,
  initialProjectId,
  lockClient = false,
  lockProject = false,
}: {
  clients: { id: string; name: string }[];
  projects: { id: string; title: string }[];
  payment?: Payment;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  hideTrigger?: boolean;
  trigger?: React.ReactNode;
  initialClientId?: string;
  initialProjectId?: string;
  lockClient?: boolean;
  lockProject?: boolean;
}) {
  const router = useRouter();
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [paymentKind, setPaymentKind] = useState<PaymentKind>(
    parsePaymentComment(payment?.comment).kind,
  );
  const isEdit = Boolean(payment);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : uncontrolledOpen;

  const {
    register,
    handleSubmit,
    control,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentSchema),
    defaultValues: defaults(payment, initialClientId, initialProjectId),
  });

  useEffect(() => {
    if (!open) return;
    reset(defaults(payment, initialClientId, initialProjectId));
    setPaymentKind(parsePaymentComment(payment?.comment).kind);
  }, [open, payment, initialClientId, initialProjectId, reset]);

  function setOpen(next: boolean) {
    if (isControlled) onOpenChange?.(next);
    else setUncontrolledOpen(next);
  }

  async function uploadReceipt(file: File | null) {
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    setUploading(true);
    try {
      const response = await fetch("/api/payment-receipts", {
        method: "POST",
        body: formData,
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Не удалось загрузить чек.");
      }

      setValue("receipt_url", payload.file.url, { shouldDirty: true, shouldValidate: true });
      toast.success("Чек загружен");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Ошибка загрузки чека.");
    } finally {
      setUploading(false);
    }
  }

  async function onSubmit(values: PaymentFormValues) {
    setSubmitting(true);
    const payload: PaymentFormValues = {
      ...values,
      comment: composePaymentComment(paymentKind, values.comment ?? ""),
    };

    const result = isEdit
      ? await updatePaymentRecord(payment!.id, payload)
      : await createPaymentRecord(payload);
    setSubmitting(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    toast.success(isEdit ? "Оплата обновлена" : "Оплата добавлена");
    setOpen(false);
    if (!isEdit) reset(defaults(undefined, initialClientId, initialProjectId));
    router.refresh();
  }

  const receiptUrl = watch("receipt_url");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {!hideTrigger && (
        <DialogTrigger asChild>
          {trigger ?? (
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Новая оплата
            </Button>
          )}
        </DialogTrigger>
      )}
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Редактировать оплату" : "Новая оплата"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="amount">Сумма *</Label>
              <Input id="amount" type="number" step="0.01" {...register("amount", numberField)} />
              {errors.amount && (
                <p className="text-xs text-destructive">{errors.amount.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="currency">Валюта</Label>
              <Input id="currency" {...register("currency")} placeholder="USD" />
            </div>
            <div className="space-y-2">
              <Label>Статус</Label>
              <Controller
                control={control}
                name="status"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PAYMENT_STATUSES.map((item) => (
                        <SelectItem key={item} value={item}>
                          {PAYMENT_STATUS[item].label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Клиент</Label>
              <Controller
                control={control}
                name="client_id"
                render={({ field }) => (
                  <Select
                    value={field.value || "none"}
                    onValueChange={(value) => field.onChange(value === "none" ? "" : value)}
                    disabled={lockClient}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Без клиента" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Без клиента</SelectItem>
                      {clients.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="space-y-2">
              <Label>Проект</Label>
              <Controller
                control={control}
                name="project_id"
                render={({ field }) => (
                  <Select
                    value={field.value || "none"}
                    onValueChange={(value) => field.onChange(value === "none" ? "" : value)}
                    disabled={lockProject}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Без проекта" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Без проекта</SelectItem>
                      {projects.map((project) => (
                        <SelectItem key={project.id} value={project.id}>
                          {project.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Тип платежа</Label>
              <Select value={paymentKind} onValueChange={(value) => setPaymentKind(value as PaymentKind)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PAYMENT_KIND_LABEL).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Способ оплаты</Label>
              <Controller
                control={control}
                name="payment_method"
                render={({ field }) => (
                  <Select
                    value={field.value || "none"}
                    onValueChange={(value) =>
                      field.onChange(value === "none" ? undefined : value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Не указан" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Не указан</SelectItem>
                      {PAYMENT_METHODS.map((item) => (
                        <SelectItem key={item} value={item}>
                          {PAYMENT_METHOD_LABEL[item]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="expected_at">Ожидаемая дата</Label>
              <Input id="expected_at" type="datetime-local" {...register("expected_at")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="paid_at">Дата оплаты</Label>
              <Input id="paid_at" type="datetime-local" {...register("paid_at")} />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <Label htmlFor="receipt_url">Чек / подтверждение оплаты</Label>
                <p className="text-xs text-muted-foreground">
                  Можно вставить ссылку вручную или загрузить файл чека.
                </p>
              </div>
              <label className="inline-flex cursor-pointer items-center rounded-md border border-input bg-background px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground">
                <Upload className="mr-2 h-4 w-4" />
                {uploading ? "Загрузка..." : "Загрузить чек"}
                <input
                  type="file"
                  className="hidden"
                  onChange={async (event) => {
                    await uploadReceipt(event.target.files?.[0] ?? null);
                    event.target.value = "";
                  }}
                />
              </label>
            </div>

            <Input id="receipt_url" {...register("receipt_url")} placeholder="https://... или локальный url" />
            {errors.receipt_url && (
              <p className="text-xs text-destructive">{errors.receipt_url.message}</p>
            )}

            {receiptUrl && (
              <a
                href={receiptUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
              >
                <ExternalLink className="h-4 w-4" />
                Открыть чек
              </a>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="comment">Комментарий</Label>
            <Textarea
              id="comment"
              rows={3}
              {...register("comment")}
              placeholder="Например: клиент внес 100$, остаток после утверждения дизайна."
            />
          </div>

          <DialogFooter>
            <Button type="submit" disabled={submitting || uploading}>
              {submitting ? "Сохранение..." : "Сохранить"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
