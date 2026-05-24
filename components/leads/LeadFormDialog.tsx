"use client";

import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { createLead, updateLead } from "@/app/(dashboard)/leads/actions";
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
import { LEAD_SOURCE_LABEL, LEAD_STATUS } from "@/lib/constants";
import {
  LEAD_SOURCES,
  LEAD_STATUSES,
  leadSchema,
  type LeadFormValues,
} from "@/lib/validations";
import type { Lead } from "@/types";

function defaults(lead?: Lead): LeadFormValues {
  return {
    name: lead?.name ?? "",
    telegram_username: lead?.telegram_username ?? "",
    phone: lead?.phone ?? "",
    email: lead?.email ?? "",
    source: lead?.source ?? "manual",
    service_interest: lead?.service_interest ?? "",
    budget_min: lead?.budget_min ?? undefined,
    budget_max: lead?.budget_max ?? undefined,
    status: lead?.status ?? "new",
    probability: lead?.probability ?? undefined,
    notes: lead?.notes ?? "",
  };
}

const numberField = {
  setValueAs: (value: unknown) =>
    value === "" || value === null || value === undefined ? undefined : Number(value),
};

export function LeadFormDialog({
  lead,
  trigger,
}: {
  lead?: Lead;
  trigger?: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const isEdit = Boolean(lead);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<LeadFormValues>({
    resolver: zodResolver(leadSchema),
    defaultValues: defaults(lead),
  });

  async function onSubmit(values: LeadFormValues) {
    setSubmitting(true);
    const result = isEdit
      ? await updateLead(lead!.id, values)
      : await createLead(values);
    setSubmitting(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    toast.success(isEdit ? "Лид обновлён" : "Лид создан");
    setOpen(false);
    if (!isEdit) reset(defaults());
    router.refresh();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (nextOpen) reset(defaults(lead));
      }}
    >
      <DialogTrigger asChild>
        {trigger ?? (
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Новый лид
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Редактировать лид" : "Новый лид"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Имя / компания *</Label>
              <Input id="name" {...register("name")} placeholder="Константин / Studio CRM" />
              {errors.name && (
                <p className="text-xs text-destructive">{errors.name.message}</p>
              )}
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
                      {LEAD_STATUSES.map((status) => (
                        <SelectItem key={status} value={status}>
                          {LEAD_STATUS[status].label}
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
              <Label>Откуда лид пришёл</Label>
              <Controller
                control={control}
                name="source"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LEAD_SOURCES.map((source) => (
                        <SelectItem key={source} value={source}>
                          {LEAD_SOURCE_LABEL[source]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="service_interest">Что ищет</Label>
              <Input
                id="service_interest"
                {...register("service_interest")}
                placeholder="Сайт, аудит, бот, CRM, дизайн..."
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="telegram_username">Telegram</Label>
              <Input
                id="telegram_username"
                {...register("telegram_username")}
                placeholder="@username"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Телефон</Label>
              <Input id="phone" {...register("phone")} placeholder="+375..." />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" {...register("email")} placeholder="mail@example.com" />
              {errors.email && (
                <p className="text-xs text-destructive">{errors.email.message}</p>
              )}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="budget_min">Бюджет от</Label>
              <Input id="budget_min" type="number" {...register("budget_min", numberField)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="budget_max">Бюджет до</Label>
              <Input id="budget_max" type="number" {...register("budget_max", numberField)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Описание лида</Label>
            <Textarea
              id="notes"
              rows={6}
              {...register("notes")}
              placeholder="Где нашли лида, что это за бизнес, что у него уже есть, что ему можно предложить, какие были комментарии, сроки и общий контекст."
            />
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
