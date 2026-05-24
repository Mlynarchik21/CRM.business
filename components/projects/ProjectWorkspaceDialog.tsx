"use client";

import { useEffect, useState } from "react";
import { ImageIcon, Plus, Trash2, Upload, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { updateProjectWorkspace } from "@/app/(dashboard)/projects/actions";
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
import { Textarea } from "@/components/ui/textarea";
import {
  parseProjectMeta,
  type ProjectMetaAsset,
  type ProjectMetaContact,
  type ProjectMetaLink,
} from "@/lib/project-content";

function makeId() {
  return globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2, 10);
}

function createContact(): ProjectMetaContact {
  return {
    id: makeId(),
    firstName: "",
    lastName: "",
    role: "",
    phone: "",
    email: "",
    telegram: "",
    whatsapp: "",
    notes: "",
  };
}

function createLink(): ProjectMetaLink {
  return {
    id: makeId(),
    label: "",
    url: "",
  };
}

function formatFileSize(size?: number) {
  if (!size) return null;
  if (size < 1024) return `${size} Б`;
  if (size < 1024 * 1024) return `${Math.round(size / 102.4) / 10} КБ`;
  return `${Math.round(size / (1024 * 102.4)) / 10} МБ`;
}

export function ProjectWorkspaceDialog({
  projectId,
  description,
  techSpec,
  trigger,
}: {
  projectId: string;
  description?: string | null;
  techSpec?: string | null;
  trigger: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [projectDescription, setProjectDescription] = useState("");
  const [notes, setNotes] = useState("");
  const [details, setDetails] = useState("");
  const [contacts, setContacts] = useState<ProjectMetaContact[]>([]);
  const [links, setLinks] = useState<ProjectMetaLink[]>([]);
  const [assets, setAssets] = useState<ProjectMetaAsset[]>([]);

  useEffect(() => {
    if (!open) return;
    const meta = parseProjectMeta(techSpec);
    setProjectDescription(description ?? "");
    setNotes(meta.notes);
    setDetails(meta.details);
    setContacts(meta.contacts);
    setLinks(meta.links.length > 0 ? meta.links : [createLink()]);
    setAssets(meta.assets);
  }, [open, description, techSpec]);

  async function uploadFiles(fileList: FileList | null) {
    const files = Array.from(fileList ?? []);
    if (files.length === 0) return;

    const formData = new FormData();
    files.forEach((file) => formData.append("files", file));

    setUploading(true);
    try {
      const response = await fetch("/api/project-files", {
        method: "POST",
        body: formData,
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Не удалось загрузить файлы.");
      }

      setAssets((prev) => [...prev, ...(payload.files as ProjectMetaAsset[])]);
      toast.success("Файлы добавлены");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Ошибка загрузки файлов.");
    } finally {
      setUploading(false);
    }
  }

  async function onSubmit() {
    setSubmitting(true);
    const result = await updateProjectWorkspace(projectId, {
      description: projectDescription,
      notes,
      details,
      contacts,
      links,
      assets,
    });
    setSubmitting(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    toast.success("Данные проекта обновлены");
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Детали проекта</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="workspace-description">Описание проекта</Label>
            <Textarea
              id="workspace-description"
              rows={4}
              value={projectDescription}
              onChange={(event) => setProjectDescription(event.target.value)}
              placeholder="Короткое описание проекта, цели, результат."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="workspace-notes">Заметки для обзора</Label>
            <Textarea
              id="workspace-notes"
              rows={4}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Ключевые договоренности, заметки, важные пометки."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="workspace-details">Подробные данные</Label>
            <Textarea
              id="workspace-details"
              rows={8}
              value={details}
              onChange={(event) => setDetails(event.target.value)}
              placeholder="Развернутое описание проекта, состав работ, материалы, что уже сделано, что еще нужно."
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium">Контакты</p>
                <p className="text-xs text-muted-foreground">
                  Добавь имена, фамилии, роли и все каналы связи.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setContacts((prev) => [...prev, createContact()])}
              >
                <Plus className="mr-2 h-4 w-4" />
                Добавить контакт
              </Button>
            </div>

            {contacts.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
                Контакты пока не добавлены.
              </div>
            ) : (
              <div className="space-y-3">
                {contacts.map((contact) => (
                  <div key={contact.id} className="rounded-xl border border-border p-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <p className="text-sm font-medium">Контакт</p>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                          setContacts((prev) => prev.filter((item) => item.id !== contact.id))
                        }
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <Input
                        value={contact.firstName}
                        onChange={(event) =>
                          setContacts((prev) =>
                            prev.map((item) =>
                              item.id === contact.id
                                ? { ...item, firstName: event.target.value }
                                : item,
                            ),
                          )
                        }
                        placeholder="Имя"
                      />
                      <Input
                        value={contact.lastName}
                        onChange={(event) =>
                          setContacts((prev) =>
                            prev.map((item) =>
                              item.id === contact.id
                                ? { ...item, lastName: event.target.value }
                                : item,
                            ),
                          )
                        }
                        placeholder="Фамилия"
                      />
                      <Input
                        value={contact.role}
                        onChange={(event) =>
                          setContacts((prev) =>
                            prev.map((item) =>
                              item.id === contact.id
                                ? { ...item, role: event.target.value }
                                : item,
                            ),
                          )
                        }
                        placeholder="Роль / должность"
                      />
                      <Input
                        value={contact.phone}
                        onChange={(event) =>
                          setContacts((prev) =>
                            prev.map((item) =>
                              item.id === contact.id
                                ? { ...item, phone: event.target.value }
                                : item,
                            ),
                          )
                        }
                        placeholder="Телефон"
                      />
                      <Input
                        value={contact.email}
                        onChange={(event) =>
                          setContacts((prev) =>
                            prev.map((item) =>
                              item.id === contact.id
                                ? { ...item, email: event.target.value }
                                : item,
                            ),
                          )
                        }
                        placeholder="Email"
                      />
                      <Input
                        value={contact.telegram}
                        onChange={(event) =>
                          setContacts((prev) =>
                            prev.map((item) =>
                              item.id === contact.id
                                ? { ...item, telegram: event.target.value }
                                : item,
                            ),
                          )
                        }
                        placeholder="Telegram"
                      />
                      <Input
                        value={contact.whatsapp}
                        onChange={(event) =>
                          setContacts((prev) =>
                            prev.map((item) =>
                              item.id === contact.id
                                ? { ...item, whatsapp: event.target.value }
                                : item,
                            ),
                          )
                        }
                        placeholder="WhatsApp"
                      />
                    </div>

                    <Textarea
                      className="mt-3"
                      rows={3}
                      value={contact.notes}
                      onChange={(event) =>
                        setContacts((prev) =>
                          prev.map((item) =>
                            item.id === contact.id
                              ? { ...item, notes: event.target.value }
                              : item,
                          ),
                        )
                      }
                      placeholder="Дополнительные примечания по контакту."
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium">Ссылки</p>
                <p className="text-xs text-muted-foreground">
                  Добавь любые рабочие ссылки: документы, таблицы, макеты, материалы.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setLinks((prev) => [...prev, createLink()])}
              >
                <Plus className="mr-2 h-4 w-4" />
                Добавить ссылку
              </Button>
            </div>

            <div className="space-y-2">
              {links.map((link) => (
                <div
                  key={link.id}
                  className="grid gap-2 rounded-lg border border-border p-3 sm:grid-cols-[180px_minmax(0,1fr)_auto]"
                >
                  <Input
                    value={link.label}
                    onChange={(event) =>
                      setLinks((prev) =>
                        prev.map((item) =>
                          item.id === link.id ? { ...item, label: event.target.value } : item,
                        ),
                      )
                    }
                    placeholder="Название ссылки"
                  />
                  <Input
                    value={link.url}
                    onChange={(event) =>
                      setLinks((prev) =>
                        prev.map((item) =>
                          item.id === link.id ? { ...item, url: event.target.value } : item,
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
                          : [createLink()],
                      )
                    }
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
                <p className="text-sm font-medium">Фото и файлы</p>
                <p className="text-xs text-muted-foreground">
                  Можно загружать изображения, документы, pdf и другие файлы.
                </p>
              </div>
              <label className="inline-flex cursor-pointer items-center rounded-md border border-input bg-background px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground">
                <Upload className="mr-2 h-4 w-4" />
                {uploading ? "Загрузка..." : "Загрузить"}
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

            {assets.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
                Пока нет загруженных файлов.
              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {assets.map((asset) => {
                  const isImage = asset.type?.startsWith("image/");

                  return (
                    <div key={asset.id} className="rounded-xl border border-border p-3">
                      {isImage ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={asset.url}
                          alt={asset.name}
                          className="mb-3 h-40 w-full rounded-lg object-cover"
                        />
                      ) : (
                        <div className="mb-3 flex h-40 items-center justify-center rounded-lg bg-[#1B1B1F]">
                          <ImageIcon className="h-8 w-8 text-muted-foreground" />
                        </div>
                      )}

                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <a
                            href={asset.url}
                            target="_blank"
                            rel="noreferrer"
                            className="truncate text-sm font-medium hover:text-primary"
                          >
                            {asset.name}
                          </a>
                          <p className="text-xs text-muted-foreground">
                            {[asset.type, formatFileSize(asset.size)].filter(Boolean).join(" · ")}
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            setAssets((prev) => prev.filter((item) => item.id !== asset.id))
                          }
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Отмена
          </Button>
          <Button type="button" onClick={onSubmit} disabled={submitting || uploading}>
            {submitting ? "Сохранение..." : "Сохранить"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
