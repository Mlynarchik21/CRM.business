"use client";

import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { createProjectRecord, updateProjectRecord } from "@/app/(dashboard)/projects/actions";
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
import { PROJECT_STATUS, PROJECT_TYPE_LABEL } from "@/lib/constants";
import { parseProjectMeta } from "@/lib/project-content";
import {
  PROJECT_STATUSES,
  PROJECT_TYPES,
  projectSchema,
  type ProjectFormValues,
} from "@/lib/validations";
import type { Client, Project } from "@/types";

const PRIMARY_PROJECT_STATUSES = ["in_progress", "paused", "completed", "cancelled"] as const;

const numberField = {
  setValueAs: (value: unknown) =>
    value === "" || value === null || value === undefined ? undefined : Number(value),
};

function defaults(project?: Project, initialClientId?: string): ProjectFormValues {
  const meta = parseProjectMeta(project?.tech_spec);

  return {
    client_id: project?.client_id ?? initialClientId ?? "",
    title: project?.title ?? "",
    project_type: project?.project_type ?? undefined,
    description: project?.description ?? "",
    tech_spec: meta.notes,
    status: project?.status ?? "in_progress",
    progress: project?.progress ?? 0,
    amount: project?.amount ?? undefined,
    paid_amount: project?.paid_amount ?? undefined,
    start_date: project?.start_date ?? "",
    deadline: project?.deadline ?? "",
    github_url: project?.github_url ?? "",
    vercel_url: project?.vercel_url ?? "",
    figma_url: project?.figma_url ?? "",
    supabase_url: project?.supabase_url ?? "",
    telegram_bot_url: project?.telegram_bot_url ?? "",
    staging_url: project?.staging_url ?? "",
  };
}

export function ProjectFormDialog({
  clients,
  project,
  trigger,
  initialClientId,
  lockClient = false,
}: {
  clients: Pick<Client, "id" | "name">[];
  project?: Project;
  trigger?: React.ReactNode;
  initialClientId?: string;
  lockClient?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const isEdit = Boolean(project);
  const statusOptions = Array.from(
    new Set([
      ...(project?.status ? [project.status] : []),
      ...PRIMARY_PROJECT_STATUSES,
    ]),
  ).filter((status): status is (typeof PROJECT_STATUSES)[number] =>
    PROJECT_STATUSES.includes(status as (typeof PROJECT_STATUSES)[number]),
  );

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<ProjectFormValues>({
    resolver: zodResolver(projectSchema),
    defaultValues: defaults(project, initialClientId),
  });

  async function onSubmit(values: ProjectFormValues) {
    setSubmitting(true);
    const result = isEdit
      ? await updateProjectRecord(project!.id, values)
      : await createProjectRecord(values);
    setSubmitting(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    toast.success(isEdit ? "Проект обновлён" : "Проект создан");
    setOpen(false);
    if (!isEdit) reset(defaults(undefined, initialClientId));
    router.refresh();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (nextOpen) reset(defaults(project, initialClientId));
      }}
    >
      <DialogTrigger asChild>
        {trigger ?? (
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Новый проект
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Редактировать проект" : "Новый проект"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="title">Название проекта *</Label>
              <Input id="title" {...register("title")} placeholder="CRM для студии" />
              {errors.title && (
                <p className="text-xs text-destructive">{errors.title.message}</p>
              )}
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
                    disabled={lockClient}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Выбери клиента" />
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
              <Label>Что делаем</Label>
              <Controller
                control={control}
                name="project_type"
                render={({ field }) => (
                  <Select
                    value={field.value || "none"}
                    onValueChange={(value) => field.onChange(value === "none" ? undefined : value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Выбери тип" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Не указан</SelectItem>
                      {PROJECT_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {PROJECT_TYPE_LABEL[type]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
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
                      {statusOptions.map((status) => (
                        <SelectItem key={status} value={status}>
                          {PROJECT_STATUS[status].label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="progress">Прогресс %</Label>
              <Input id="progress" type="number" {...register("progress", numberField)} />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="description">Описание проекта</Label>
              <Textarea
                id="description"
                rows={4}
                {...register("description")}
                placeholder="Что делаем, какой результат нужен, общий контекст по проекту."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tech_spec">Заметки для обзора</Label>
              <Textarea
                id="tech_spec"
                rows={4}
                {...register("tech_spec")}
                placeholder="Короткие заметки и важные договоренности. Контакты, ссылки и файлы редактируются в карточке проекта."
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Стоимость</Label>
              <Input id="amount" type="number" {...register("amount", numberField)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="paid_amount">Оплачено</Label>
              <Input id="paid_amount" type="number" {...register("paid_amount", numberField)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="start_date">Дата старта</Label>
              <Input id="start_date" type="date" {...register("start_date")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="deadline">Срок</Label>
              <Input id="deadline" type="date" {...register("deadline")} />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="github_url">GitHub URL</Label>
              <Input id="github_url" {...register("github_url")} placeholder="https://github.com/..." />
              {errors.github_url && <p className="text-xs text-destructive">{errors.github_url.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="vercel_url">Vercel URL</Label>
              <Input id="vercel_url" {...register("vercel_url")} placeholder="https://..." />
              {errors.vercel_url && <p className="text-xs text-destructive">{errors.vercel_url.message}</p>}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="supabase_url">Supabase URL</Label>
              <Input id="supabase_url" {...register("supabase_url")} placeholder="https://..." />
              {errors.supabase_url && <p className="text-xs text-destructive">{errors.supabase_url.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="figma_url">Figma URL</Label>
              <Input id="figma_url" {...register("figma_url")} placeholder="https://..." />
              {errors.figma_url && <p className="text-xs text-destructive">{errors.figma_url.message}</p>}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="telegram_bot_url">Telegram Bot URL</Label>
              <Input id="telegram_bot_url" {...register("telegram_bot_url")} placeholder="https://t.me/..." />
              {errors.telegram_bot_url && <p className="text-xs text-destructive">{errors.telegram_bot_url.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="staging_url">Staging URL</Label>
              <Input id="staging_url" {...register("staging_url")} placeholder="https://..." />
              {errors.staging_url && <p className="text-xs text-destructive">{errors.staging_url.message}</p>}
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
