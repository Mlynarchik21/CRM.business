"use client";

import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import {
  createSupportTicket,
  updateSupportTicket,
} from "@/app/(dashboard)/support/actions";
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
import { SUPPORT_PRIORITY, SUPPORT_STATUS } from "@/lib/constants";
import {
  SUPPORT_PRIORITIES,
  SUPPORT_SOURCES,
  SUPPORT_STATUSES,
  supportTicketSchema,
  type SupportTicketFormValues,
} from "@/lib/validations";
import type { SupportTicket } from "@/types";

const SOURCE_LABEL: Record<(typeof SUPPORT_SOURCES)[number], string> = {
  telegram: "Telegram",
  manual: "Вручную",
  email: "Email",
};

function defaults(ticket?: SupportTicket): SupportTicketFormValues {
  return {
    title: ticket?.title ?? "",
    client_id: ticket?.client_id ?? "",
    project_id: ticket?.project_id ?? "",
    status: ticket?.status ?? "new",
    priority: ticket?.priority ?? "medium",
    source: ticket?.source ?? "manual",
  };
}

export function SupportTicketFormDialog({
  clients,
  projects,
  ticket,
  open: controlledOpen,
  onOpenChange,
  hideTrigger,
}: {
  clients: { id: string; name: string }[];
  projects: { id: string; title: string }[];
  ticket?: SupportTicket;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  hideTrigger?: boolean;
}) {
  const router = useRouter();
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const isEdit = Boolean(ticket);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : uncontrolledOpen;

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<SupportTicketFormValues>({
    resolver: zodResolver(supportTicketSchema),
    defaultValues: defaults(ticket),
  });

  useEffect(() => {
    if (open) reset(defaults(ticket));
  }, [open, ticket, reset]);

  function setOpen(next: boolean) {
    if (isControlled) onOpenChange?.(next);
    else setUncontrolledOpen(next);
  }

  async function onSubmit(values: SupportTicketFormValues) {
    setSubmitting(true);
    const result = isEdit
      ? await updateSupportTicket(ticket!.id, values)
      : await createSupportTicket(values);
    setSubmitting(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    toast.success(isEdit ? "Обращение обновлено" : "Обращение создано");
    setOpen(false);
    if (!isEdit) reset(defaults());
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {!hideTrigger && (
        <DialogTrigger asChild>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Новое обращение
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Редактировать обращение" : "Новое обращение в поддержку"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Тема *</Label>
            <Input id="title" {...register("title")} placeholder="Не работает форма на сайте" />
            {errors.title && (
              <p className="text-xs text-destructive">{errors.title.message}</p>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
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
                      {SUPPORT_STATUSES.map((item) => (
                        <SelectItem key={item} value={item}>
                          {SUPPORT_STATUS[item].label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="space-y-2">
              <Label>Приоритет</Label>
              <Controller
                control={control}
                name="priority"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SUPPORT_PRIORITIES.map((item) => (
                        <SelectItem key={item} value={item}>
                          {SUPPORT_PRIORITY[item].label}
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

          <div className="space-y-2">
            <Label>Источник</Label>
            <Controller
              control={control}
              name="source"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SUPPORT_SOURCES.map((item) => (
                      <SelectItem key={item} value={item}>
                        {SOURCE_LABEL[item]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
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
