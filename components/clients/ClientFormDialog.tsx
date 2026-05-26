"use client";

import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
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
import type { Client, ClientLink } from "@/types";

function makeId() {
  return globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2, 10);
}

function defaults(client?: Client): ClientFormValues {
  return {
    name: client?.name ?? "",
    company_name: client?.company_name ?? "",
    decision_maker: client?.decision_maker ?? "",
    telegram_username: client?.telegram_username ?? "",
    phone: client?.phone ?? "",
    extra_phone: client?.extra_phone ?? "",
    maps_url: client?.maps_url ?? "",
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
  const [links, setLinks] = useState<ClientLink[]>(client?.links ?? []);
  const isEdit = Boolean(client);

  function addLink() {
    setLinks((prev) => [...prev, { id: makeId(), label: "", url: "" }]);
  }
  function updateLink(id: string, key: "label" | "url", value: string) {
    setLinks((prev) => prev.map((l) => (l.id === id ? { ...l, [key]: value } : l)));
  }
  function removeLink(id: string) {
    setLinks((prev) => prev.filter((l) => l.id !== id));
  }

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
    const payload: ClientFormValues = {
      ...values,
      links: links
        .map((l) => ({ ...l, label: l.label.trim(), url: l.url.trim() }))
        .filter((l) => l.url),
    };
    setSubmitting(true);
    const result = isEdit
      ? await updateClientRecord(client!.id, payload)
      : await createClientRecord(payload);
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
        if (nextOpen) {
          reset(defaults(client));
          setLinks(client?.links ?? []);
        }
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

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Основное
          </p>
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

          <div className="space-y-2">
            <Label htmlFor="decision_maker">Имя ЛПР (доп. контакт)</Label>
            <Input
              id="decision_maker"
              {...register("decision_maker")}
              placeholder="Кто принимает решение (если отличается от основного)"
            />
          </div>

          <p className="border-t border-border pt-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Контакты
          </p>
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
              <Label htmlFor="extra_phone">Второй телефон</Label>
              <Input id="extra_phone" {...register("extra_phone")} placeholder="+375... (необязательно)" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" {...register("email")} placeholder="mail@example.com" />
              {errors.email && (
                <p className="text-xs text-destructive">{errors.email.message}</p>
              )}
            </div>
          </div>

          <p className="border-t border-border pt-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Локация, источник и ссылки
          </p>
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

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="maps_url">Ссылка на картах (Google Maps / 2ГИС)</Label>
              <Input id="maps_url" {...register("maps_url")} placeholder="https://maps.google.com/..." />
            </div>
            <div className="space-y-2">
              <Label htmlFor="source">Источник</Label>
              <Input id="source" {...register("source")} placeholder="telegram_bot" />
            </div>
          </div>

          {/* Сторонние ссылки (Instagram, сайт, соцсети) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <Label>Ссылки (Instagram, сайт, соцсети)</Label>
              <Button type="button" variant="outline" size="sm" onClick={addLink}>
                <Plus className="mr-1 h-4 w-4" />
                Добавить ссылку
              </Button>
            </div>
            {links.length > 0 && (
              <div className="space-y-2">
                {links.map((link) => (
                  <div
                    key={link.id}
                    className="grid gap-2 sm:grid-cols-[minmax(0,150px)_minmax(0,1fr)_auto]"
                  >
                    <Input
                      value={link.label}
                      onChange={(e) => updateLink(link.id, "label", e.target.value)}
                      placeholder="Instagram"
                    />
                    <Input
                      value={link.url}
                      onChange={(e) => updateLink(link.id, "url", e.target.value)}
                      placeholder="https://instagram.com/..."
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeLink(link.id)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <p className="border-t border-border pt-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Заметки
          </p>
          <div className="space-y-2">
            <Textarea id="notes" rows={4} {...register("notes")} placeholder="Любые заметки по клиенту" />
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
