"use client";

import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { createClientRecord, updateClientRecord } from "@/app/(dashboard)/clients/actions";
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
import { CLIENT_STATUS } from "@/lib/constants";
import {
  CLIENT_STATUSES,
  clientSchema,
  type ClientFormValues,
} from "@/lib/validations";
import type { Client } from "@/types";

function defaults(client?: Client): ClientFormValues {
  return {
    name: client?.name ?? "",
    company_name: client?.company_name ?? "",
    telegram_username: client?.telegram_username ?? "",
    phone: client?.phone ?? "",
    email: client?.email ?? "",
    country: client?.country ?? "",
    city: client?.city ?? "",
    source: client?.source ?? "",
    status: client?.status ?? "new",
    notes: client?.notes ?? "",
  };
}

export function ClientFormDialog({
  client,
  trigger,
}: {
  client?: Client;
  trigger?: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const isEdit = Boolean(client);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<ClientFormValues>({
    resolver: zodResolver(clientSchema),
    defaultValues: defaults(client),
  });

  async function onSubmit(values: ClientFormValues) {
    setSubmitting(true);
    const result = isEdit
      ? await updateClientRecord(client!.id, values)
      : await createClientRecord(values);
    setSubmitting(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    toast.success(isEdit ? "Клиент обновлён" : "Клиент создан");
    setOpen(false);
    if (!isEdit) reset(defaults());
    router.refresh();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (nextOpen) reset(defaults(client));
      }}
    >
      <DialogTrigger asChild>
        {trigger ?? (
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Новый клиент
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Редактировать клиента" : "Новый клиент"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Имя *</Label>
            <Input id="name" {...register("name")} placeholder="Иван Петров" />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="company_name">Компания</Label>
              <Input
                id="company_name"
                {...register("company_name")}
                placeholder="Acme Studio"
              />
            </div>
            <div className="space-y-2">
              <Label>Статус клиента</Label>
              <Controller
                control={control}
                name="status"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CLIENT_STATUSES.map((status) => (
                        <SelectItem key={status} value={status}>
                          {CLIENT_STATUS[status].label}
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
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" {...register("email")} placeholder="mail@example.com" />
              {errors.email && (
                <p className="text-xs text-destructive">{errors.email.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="source">Источник</Label>
              <Input id="source" {...register("source")} placeholder="telegram_bot" />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="country">Страна</Label>
              <Input id="country" {...register("country")} placeholder="Беларусь" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="city">Город</Label>
              <Input id="city" {...register("city")} placeholder="Минск" />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Заметки</Label>
            <Textarea id="notes" rows={4} {...register("notes")} />
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
