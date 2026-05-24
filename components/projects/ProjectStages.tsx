"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Check,
  ChevronDown,
  FileText,
  GripVertical,
  Link2,
  MoreHorizontal,
  Paperclip,
  Pencil,
  Plus,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { updateProjectStages } from "@/app/(dashboard)/projects/actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type {
  ProjectStage,
  ProjectStageAttachment,
  ProjectStageLink,
} from "@/types";

function makeId() {
  return globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2, 10);
}

function createEmptyLink(): ProjectStageLink {
  return { id: makeId(), label: "", url: "" };
}

function normalizeStage(stage: ProjectStage): ProjectStage {
  return {
    id: String(stage.id),
    title: String(stage.title ?? ""),
    description: String(stage.description ?? ""),
    done: Boolean(stage.done),
    attachments: Array.isArray(stage.attachments)
      ? stage.attachments.map((attachment) => ({
          id: String(attachment.id),
          name: String(attachment.name ?? ""),
          url: String(attachment.url ?? ""),
          size:
            attachment.size == null || Number.isNaN(Number(attachment.size))
              ? undefined
              : Number(attachment.size),
          type: attachment.type ? String(attachment.type) : undefined,
        }))
      : [],
    links: Array.isArray(stage.links)
      ? stage.links.map((link) => ({
          id: String(link.id),
          label: String(link.label ?? ""),
          url: String(link.url ?? ""),
        }))
      : [],
  };
}

function formatFileSize(size?: number) {
  if (!size) return null;
  if (size < 1024) return `${size} Б`;
  if (size < 1024 * 1024) return `${Math.round(size / 102.4) / 10} КБ`;
  return `${Math.round(size / (1024 * 102.4)) / 10} МБ`;
}

const PRESETS = [
  "Составление ТЗ",
  "Обсуждение с клиентом",
  "Разработка дизайна",
  "Верстка и разработка",
  "Тестирование",
  "Сдача проекта",
];

function StageEditorDialog({
  open,
  onOpenChange,
  stage,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stage: ProjectStage | null;
  onSave: (stage: ProjectStage) => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [links, setLinks] = useState<ProjectStageLink[]>([createEmptyLink()]);
  const [attachments, setAttachments] = useState<ProjectStageAttachment[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (!open) return;

    setTitle(stage?.title ?? "");
    setDescription(stage?.description ?? "");
    setLinks(stage?.links?.length ? stage.links : [createEmptyLink()]);
    setAttachments(stage?.attachments ?? []);
    setIsUploading(false);
  }, [open, stage]);

  async function uploadFiles(fileList: FileList | null) {
    const files = Array.from(fileList ?? []);
    if (files.length === 0) return;

    const formData = new FormData();
    files.forEach((file) => formData.append("files", file));

    setIsUploading(true);
    try {
      const response = await fetch("/api/project-stage-files", {
        method: "POST",
        body: formData,
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Не удалось загрузить файлы.");
      }

      setAttachments((prev) => [...prev, ...(payload.files as ProjectStageAttachment[])]);
      toast.success("Файлы прикреплены");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Ошибка загрузки файлов.");
    } finally {
      setIsUploading(false);
    }
  }

  function submit() {
    const cleanTitle = title.trim();
    if (!cleanTitle) {
      toast.error("Укажи название этапа.");
      return;
    }

    onSave(
      normalizeStage({
        id: stage?.id ?? makeId(),
        title: cleanTitle,
        description: description.trim(),
        done: stage?.done ?? false,
        attachments,
        links: links
          .map((link) => ({
            ...link,
            label: link.label.trim(),
            url: link.url.trim(),
          }))
          .filter((link) => link.url),
      }),
    );
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{stage ? "Редактировать этап" : "Новый этап"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="stage-title">Название этапа</Label>
            <Input
              id="stage-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Например: Составление ТЗ"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="stage-description">Описание этапа</Label>
            <Textarea
              id="stage-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={5}
              placeholder="Что делаем на этом этапе, что нужно от клиента, какие есть договоренности."
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium">Ссылки</p>
                <p className="text-xs text-muted-foreground">
                  Можно добавить Figma, Google Docs, Notion или любую рабочую ссылку.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setLinks((prev) => [...prev, createEmptyLink()])}
              >
                <Plus className="mr-2 h-4 w-4" />
                Добавить ссылку
              </Button>
            </div>

            <div className="space-y-2">
              {links.map((link, index) => (
                <div
                  key={link.id}
                  className="grid gap-2 rounded-lg border border-border p-3 sm:grid-cols-[minmax(0,180px)_minmax(0,1fr)_auto]"
                >
                  <Input
                    value={link.label}
                    onChange={(event) =>
                      setLinks((prev) =>
                        prev.map((item) =>
                          item.id === link.id
                            ? { ...item, label: event.target.value }
                            : item,
                        ),
                      )
                    }
                    placeholder={`Подпись ${index + 1}`}
                  />
                  <Input
                    value={link.url}
                    onChange={(event) =>
                      setLinks((prev) =>
                        prev.map((item) =>
                          item.id === link.id
                            ? { ...item, url: event.target.value }
                            : item,
                        ),
                      )
                    }
                    placeholder="https://..."
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() =>
                      setLinks((prev) =>
                        prev.length > 1
                          ? prev.filter((item) => item.id !== link.id)
                          : [createEmptyLink()],
                      )
                    }
                    aria-label="Удалить ссылку"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium">Файлы</p>
                <p className="text-xs text-muted-foreground">
                  Файлы сохраняются локально и прикрепляются к этапу.
                </p>
              </div>
              <label className="inline-flex cursor-pointer items-center rounded-md border border-input bg-background px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground">
                <Upload className="mr-2 h-4 w-4" />
                {isUploading ? "Загрузка..." : "Загрузить файлы"}
                <input
                  type="file"
                  multiple
                  className="hidden"
                  onChange={async (event) => {
                    await uploadFiles(event.target.files);
                    event.target.value = "";
                  }}
                />
              </label>
            </div>

            {attachments.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
                Пока нет прикрепленных файлов.
              </div>
            ) : (
              <div className="space-y-2">
                {attachments.map((attachment) => (
                  <div
                    key={attachment.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border p-3"
                  >
                    <div className="min-w-0">
                      <a
                        href={attachment.url}
                        target="_blank"
                        rel="noreferrer"
                        className="truncate text-sm font-medium hover:text-primary"
                      >
                        {attachment.name}
                      </a>
                      <p className="text-xs text-muted-foreground">
                        {[attachment.type, formatFileSize(attachment.size)]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() =>
                        setAttachments((prev) =>
                          prev.filter((item) => item.id !== attachment.id),
                        )
                      }
                      aria-label="Удалить файл"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Отмена
          </Button>
          <Button type="button" onClick={submit} disabled={isUploading || !title.trim()}>
            Сохранить
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SortableStageCard({
  index,
  stage,
  isOpen,
  onToggleOpen,
  onToggleDone,
  onEdit,
  onRemove,
}: {
  index: number;
  stage: ProjectStage;
  isOpen: boolean;
  onToggleOpen: (id: string) => void;
  onToggleDone: (id: string) => void;
  onEdit: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: stage.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const attachmentCount = stage.attachments?.length ?? 0;
  const linkCount = stage.links?.length ?? 0;

  return (
    <div ref={setNodeRef} style={style}>
      <div
        className={cn(
          "rounded-xl border border-border bg-card p-3 transition-all",
          stage.done && "border-primary/30 bg-primary/5",
          isDragging && "opacity-70 ring-1 ring-primary",
        )}
      >
        <div className="flex items-start gap-3">
          <button
            type="button"
            onClick={() => onToggleDone(stage.id)}
            className={cn(
              "mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors",
              stage.done
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background text-transparent",
            )}
            aria-label="Отметить этап"
          >
            <Check className="h-3.5 w-3.5" />
          </button>

          <div className="min-w-0 flex-1">
            <button
              type="button"
              onClick={() => onToggleOpen(stage.id)}
              className="flex w-full items-start justify-between gap-3 text-left"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">#{index + 1}</span>
                  <p
                    className={cn(
                      "truncate text-sm font-medium",
                      stage.done && "line-through text-muted-foreground",
                    )}
                  >
                    {stage.title || "Без названия"}
                  </p>
                </div>

                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span className="truncate">
                    {stage.description || "Нажми, чтобы добавить описание, ссылки и файлы."}
                  </span>
                  {attachmentCount > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#1B1B1F] px-2 py-0.5">
                      <Paperclip className="h-3 w-3" />
                      {attachmentCount}
                    </span>
                  )}
                  {linkCount > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#1B1B1F] px-2 py-0.5">
                      <Link2 className="h-3 w-3" />
                      {linkCount}
                    </span>
                  )}
                </div>
              </div>

              <ChevronDown
                className={cn(
                  "mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-transform",
                  isOpen && "rotate-180",
                )}
              />
            </button>

            <div
              className={cn(
                "grid transition-all duration-300 ease-out",
                isOpen ? "mt-3 grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
              )}
            >
              <div className="min-h-0 overflow-hidden">
                <div className="space-y-3 border-t border-border pt-3">
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                    Описание
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
                    {stage.description || "Описание пока не заполнено."}
                  </p>
                </div>

                {linkCount > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                      Ссылки
                    </p>
                    {stage.links?.map((link) => (
                      <a
                        key={link.id}
                        href={link.url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm hover:border-primary/40 hover:text-primary"
                      >
                        <Link2 className="h-4 w-4 shrink-0" />
                        <span className="truncate">
                          {link.label || link.url}
                        </span>
                      </a>
                    ))}
                  </div>
                )}

                {attachmentCount > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                      Файлы
                    </p>
                    {stage.attachments?.map((attachment) => (
                      <a
                        key={attachment.id}
                        href={attachment.url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 text-sm hover:border-primary/40 hover:text-primary"
                      >
                        <span className="flex min-w-0 items-center gap-2">
                          <FileText className="h-4 w-4 shrink-0" />
                          <span className="truncate">{attachment.name}</span>
                        </span>
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {formatFileSize(attachment.size)}
                        </span>
                      </a>
                    ))}
                  </div>
                )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => onEdit(stage.id)}
              aria-label="Редактировать этап"
            >
              <Pencil className="h-4 w-4" />
            </Button>

            <button
              type="button"
              className="cursor-grab rounded-md p-2 text-muted-foreground transition-colors hover:bg-[#1B1B1F] hover:text-foreground"
              aria-label="Перетащить этап"
              {...attributes}
              {...listeners}
            >
              <GripVertical className="h-4 w-4" />
            </button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button type="button" variant="ghost" size="icon" aria-label="Действия">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => onEdit(stage.id)}>
                  <Pencil className="h-4 w-4" />
                  Изменить
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() => onRemove(stage.id)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                  Удалить
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ProjectStages({
  projectId,
  initialStages,
}: {
  projectId: string;
  initialStages: ProjectStage[];
}) {
  const [stages, setStages] = useState<ProjectStage[]>(() =>
    initialStages.map(normalizeStage),
  );
  const [openStageId, setOpenStageId] = useState<string | null>(null);
  const [dialogState, setDialogState] = useState<
    { mode: "create" } | { mode: "edit"; stageId: string } | null
  >(null);
  const [isPending, startTransition] = useTransition();
  const stagesRef = useRef(stages);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  useEffect(() => {
    const nextStages = initialStages.map(normalizeStage);
    setStages(nextStages);
    stagesRef.current = nextStages;
    setOpenStageId((current) =>
      current && nextStages.some((stage) => stage.id === current)
        ? current
        : null,
    );
  }, [initialStages]);

  useEffect(() => {
    stagesRef.current = stages;
  }, [stages]);

  const total = stages.length;
  const done = stages.filter((stage) => stage.done).length;
  const progress = total > 0 ? Math.round((done / total) * 100) : 0;
  const editingStage =
    dialogState?.mode === "edit"
      ? stages.find((stage) => stage.id === dialogState.stageId) ?? null
      : null;

  function persist(next: ProjectStage[]) {
    const previous = stagesRef.current;
    setStages(next);
    stagesRef.current = next;

    startTransition(async () => {
      const result = await updateProjectStages(projectId, next);
      if (!result.ok) {
        toast.error(result.error);
        setStages(previous);
        stagesRef.current = previous;
      }
    });
  }

  function createStage(title?: string) {
    const nextStage = normalizeStage({
      id: makeId(),
      title: title?.trim() ?? "",
      description: "",
      done: false,
      attachments: [],
      links: [],
    });

    persist([...stages, nextStage]);
  }

  function toggleDone(id: string) {
    persist(
      stages.map((stage) =>
        stage.id === id ? { ...stage, done: !stage.done } : stage,
      ),
    );
  }

  function removeStage(id: string) {
    const nextStages = stages.filter((stage) => stage.id !== id);
    persist(nextStages);
    if (openStageId === id) {
      setOpenStageId(null);
    }
  }

  function saveStage(nextStage: ProjectStage) {
    if (dialogState?.mode === "edit") {
      persist(
        stages.map((stage) =>
          stage.id === nextStage.id ? normalizeStage(nextStage) : stage,
        ),
      );
    } else {
      const normalized = normalizeStage({
        ...nextStage,
        id: nextStage.id || makeId(),
        done: false,
      });
      persist([...stages, normalized]);
    }
  }

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    const oldIndex = stages.findIndex((stage) => stage.id === String(active.id));
    const newIndex = stages.findIndex((stage) => stage.id === String(over.id));

    if (oldIndex === -1 || newIndex === -1) return;

    persist(arrayMove(stages, oldIndex, newIndex));
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-5">
          <div className="mb-2 flex items-end justify-between gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Прогресс по этапам</p>
              <p className="text-3xl font-semibold tracking-tight">{progress}%</p>
            </div>
            <p className="text-right text-sm text-muted-foreground">
              {done} из {total} этапов выполнено
            </p>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-[#1B1B1F]">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Этапы проекта</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Компактный список с раскрытием деталей по клику.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button type="button" variant="outline" size="sm">
                  Шаблоны
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {PRESETS.map((preset) => (
                  <DropdownMenuItem key={preset} onSelect={() => createStage(preset)}>
                    <Plus className="h-4 w-4" />
                    {preset}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <Button type="button" size="sm" onClick={() => setDialogState({ mode: "create" })}>
              <Plus className="mr-2 h-4 w-4" />
              Добавить
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          {stages.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">
              Этапов пока нет. Добавь первый этап через кнопку сверху.
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={onDragEnd}
            >
              <SortableContext
                items={stages.map((stage) => stage.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-3">
                  {stages.map((stage, index) => (
                    <SortableStageCard
                      key={stage.id}
                      index={index}
                      stage={stage}
                      isOpen={openStageId === stage.id}
                      onToggleOpen={(id) =>
                        setOpenStageId((current) => (current === id ? null : id))
                      }
                      onToggleDone={toggleDone}
                      onEdit={(id) => setDialogState({ mode: "edit", stageId: id })}
                      onRemove={removeStage}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}

          <div className="min-h-5 pt-1">
            {isPending && (
              <p className="text-sm text-muted-foreground">Сохраняю изменения...</p>
            )}
          </div>
        </CardContent>
      </Card>

      <StageEditorDialog
        open={dialogState !== null}
        onOpenChange={(open) => {
          if (!open) setDialogState(null);
        }}
        stage={editingStage}
        onSave={saveStage}
      />
    </div>
  );
}
