"use client";

import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { createDealRecord, updateDealRecord } from "@/app/(dashboard)/deals/actions";
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
import { DEAL_STAGE, LEAD_STATUS } from "@/lib/constants";
import {
  DEAL_STAGES,
  dealSchema,
  type DealFormValues,
} from "@/lib/validations";
import type { Client, Deal, Lead } from "@/types";

const numberField = {
  setValueAs: (value: unknown) =>
    value === "" || value === null || value === undefined ? undefined : Number(value),
};

function defaults(
  deal?: Deal,
  initialLeadId?: string,
  initialClientId?: string,
): DealFormValues {
  return {
    lead_id: deal?.lead_id ?? initialLeadId ?? "",
    client_id: deal?.client_id ?? initialClientId ?? "",
    title: deal?.title ?? "",
    service_type: deal?.service_type ?? "",
    amount: deal?.amount ?? 0,
    stage: deal?.stage ?? "new_lead",
    status: deal?.status ?? "open",
    probability: deal?.probability ?? undefined,
    expected_payment_at: deal?.expected_payment_at ?? "",
    lost_reason: deal?.lost_reason ?? "",
  };
}

export function DealFormDialog({
  leads,
  clients,
  deal,
  trigger,
  initialLeadId,
  initialClientId,
}: {
  leads: Pick<Lead, "id" | "name" | "status">[];
  clients: Pick<Client, "id" | "name">[];
  deal?: Deal;
  trigger?: React.ReactNode;
  initialLeadId?: string;
  initialClientId?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const isEdit = Boolean(deal);

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<DealFormValues>({
    resolver: zodResolver(dealSchema),
    defaultValues: defaults(deal, initialLeadId, initialClientId),
  });

  const stage = watch("stage");

  async function onSubmit(values: DealFormValues) {
    const payload: DealFormValues = {
      ...values,
      status:
        values.stage === "paid"
          ? "won"
          : values.stage === "lost"
            ? "lost"
            : values.stage === "postponed"
              ? "postponed"
              : "open",
    };

    setSubmitting(true);
    const result = isEdit
      ? await updateDealRecord(deal!.id, payload)
      : await createDealRecord(payload);
    setSubmitting(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    toast.success(isEdit ? "Сделка обновлена" : "Сделка создана");
    setOpen(false);
    if (!isEdit) reset(defaults(undefined, initialLeadId, initialClientId));
    router.refresh();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (nextOpen) reset(defaults(deal, initialLeadId, initialClientId));
      }}
    >
      <DialogTrigger asChild>
        {trigger ?? (
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Новая сделка
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Редактировать сделку" : "Новая сделка"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="title">Название сделки *</Label>
              <Input id="title" {...register("title")} placeholder="Разработка сайта для студии" />
              {errors.title && (
                <p className="text-xs text-destructive">{errors.title.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="service_type">Что продаём</Label>
              <Input id="service_type" {...register("service_type")} placeholder="Сайт, Mini App, бот..." />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Лид</Label>
              <Controller
                control={control}
                name="lead_id"
                render={({ field }) => (
                  <Select
                    value={field.value || "none"}
                    onValueChange={(value) => field.onChange(value === "none" ? "" : value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Без лида" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Без лида</SelectItem>
                      {leads.map((lead) => (
                        <SelectItem key={lead.id} value={lead.id}>
                          {lead.name} · {LEAD_STATUS[lead.status].label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="space-y-2">
              <Label>Клиент</Label>
              <Controller
                control={control}
                name="client_id"
                render={({ field }) => (
                  <Select
                    value={field.value || "none"}
                    onValueChange={(value) => field.onChange(value === "none" ? "" : value)}
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
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-2">
              <Label>Стадия</Label>
              <Controller
                control={control}
                name="stage"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={(value) => {
                      field.onChange(value);
                      setValue(
                        "status",
                        value === "paid"
                          ? "won"
                          : value === "lost"
                            ? "lost"
                            : value === "postponed"
                              ? "postponed"
                              : "open",
                      );
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DEAL_STAGES.map((item) => (
                        <SelectItem key={item} value={item}>
                          {DEAL_STAGE[item].label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Сумма *</Label>
              <Input id="amount" type="number" {...register("amount", numberField)} />
              {errors.amount && (
                <p className="text-xs text-destructive">{errors.amount.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="probability">Вероятность %</Label>
              <Input id="probability" type="number" {...register("probability", numberField)} />
              {errors.probability && (
                <p className="text-xs text-destructive">{errors.probability.message}</p>
              )}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="expected_payment_at">Ожидаемая дата оплаты</Label>
              <Input id="expected_payment_at" type="datetime-local" {...register("expected_payment_at")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lost_reason">
                {stage === "lost" ? "Причина потери сделки" : "Комментарий по стадии"}
              </Label>
              <Textarea
                id="lost_reason"
                rows={3}
                {...register("lost_reason")}
                placeholder="Что важно зафиксировать по этой сделке"
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Сохранение..." : "Сохранить"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
