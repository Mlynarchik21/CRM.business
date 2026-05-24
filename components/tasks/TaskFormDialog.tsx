"use client";

import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { createTaskRecord, updateTaskRecord } from "@/app/(dashboard)/tasks/actions";
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
import { PRIORITY, TASK_STATUS } from "@/lib/constants";
import {
  PRIORITIES,
  TASK_STATUSES,
  taskSchema,
  type TaskFormValues,
} from "@/lib/validations";
import type { ChecklistItem, Task } from "@/types";

function makeId() {
  return Math.random().toString(36).slice(2, 10);
}

function defaults(task?: Task): TaskFormValues {
  return {
    title: task?.title ?? "",
    description: task?.description ?? "",
    project_id: task?.project_id ?? "",
    client_id: task?.client_id ?? "",
    status: task?.status ?? "backlog",
    priority: task?.priority ?? "medium",
    due_date: task?.due_date ? task.due_date.slice(0, 16) : "",
    checklist: Array.isArray(task?.checklist) ? task!.checklist : [],
  };
}

export function TaskFormDialog({
  projects,
  clients,
  task,
  open: controlledOpen,
  onOpenChange,
  hideTrigger,
  trigger,
}: {
  projects: { id: string; title: string }[];
  clients: { id: string; name: string }[];
  task?: Task;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  hideTrigger?: boolean;
  trigger?: React.ReactNode;
}) {
  const router = useRouter();
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [newItem, setNewItem] = useState("");
  const isEdit = Boolean(task);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : uncontrolledOpen;

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<TaskFormValues>({
    resolver: zodResolver(taskSchema),
    defaultValues: defaults(task),
  });

  useEffect(() => {
    if (open) {
      reset(defaults(task));
      setChecklist(Array.isArray(task?.checklist) ? task!.checklist : []);
    }
  }, [open, task, reset]);

  function setOpen(next: boolean) {
    if (isControlled) onOpenChange?.(next);
    else setUncontrolledOpen(next);
  }

  function addChecklistItem() {
    const text = newItem.trim();
    if (!text) return;
    setChecklist((prev) => [...prev, { id: makeId(), text, done: false }]);
    setNewItem("");
  }

  async function onSubmit(values: TaskFormValues) {
    const payload: TaskFormValues = { ...values, checklist };

    setSubmitting(true);
    const result = isEdit
      ? await updateTaskRecord(task!.id, payload)
      : await createTaskRecord(payload);
    setSubmitting(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    toast.success(isEdit ? "Задача обновлена" : "Задача создана");
    setOpen(false);
    if (!isEdit) {
      reset(defaults());
      setChecklist([]);
    }
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {!hideTrigger && (
        <DialogTrigger asChild>
          {trigger ?? (
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Новая задача
            </Button>
          )}
        </DialogTrigger>
      )}
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Редактировать задачу" : "Новая задача"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Название задачи *</Label>
            <Input id="title" {...register("title")} placeholder="Сверстать главную страницу" />
            {errors.title && (
              <p className="text-xs text-destructive">{errors.title.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Описание</Label>
            <Textarea id="description" rows={3} {...register("description")} />
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
                      {TASK_STATUSES.map((item) => (
                        <SelectItem key={item} value={item}>
                          {TASK_STATUS[item].label}
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
                      {PRIORITIES.map((item) => (
                        <SelectItem key={item} value={item}>
                          {PRIORITY[item].label}
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

          <div className="space-y-2">
            <Label htmlFor="due_date">Срок</Label>
            <Input id="due_date" type="datetime-local" {...register("due_date")} />
          </div>

          <div className="space-y-2">
            <Label>Чек-лист</Label>
            <div className="space-y-2">
              {checklist.map((item) => (
                <div key={item.id} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={item.done}
                    onChange={() =>
                      setChecklist((prev) =>
                        prev.map((it) =>
                          it.id === item.id ? { ...it, done: !it.done } : it,
                        ),
                      )
                    }
                    className="h-4 w-4 accent-[#22C55E]"
                  />
                  <span className="flex-1 text-sm">{item.text}</span>
                  <button
                    type="button"
                    onClick={() =>
                      setChecklist((prev) => prev.filter((it) => it.id !== item.id))
                    }
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={newItem}
                onChange={(event) => setNewItem(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    addChecklistItem();
                  }
                }}
                placeholder="Добавить пункт..."
              />
              <Button type="button" variant="outline" onClick={addChecklistItem}>
                <Plus className="h-4 w-4" />
              </Button>
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
