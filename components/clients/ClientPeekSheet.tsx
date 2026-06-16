"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { ExternalLink, Send } from "lucide-react";
import {
  addClientComment,
  getClientPeekComments,
} from "@/app/(dashboard)/clients/actions";
import { ContactValue } from "@/components/shared/ContactValue";
import { type ThreadComment } from "@/components/shared/CommentThread";
import { ProfileField } from "@/components/shared/ProfileField";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { parseSocialFromLinks } from "@/lib/social-links";
import { formatDate } from "@/lib/utils";
import type { Client, ClientLink } from "@/types";

export type ClientPeekClient = Pick<
  Client,
  | "id"
  | "name"
  | "company_name"
  | "telegram_username"
  | "phone"
  | "extra_phone"
  | "email"
  | "decision_maker"
  | "notes"
  | "links"
>;

function linkUrls(links: ClientLink[] | undefined): string {
  return (links ?? []).map((l) => l.url).filter(Boolean).join(" ");
}

type ClientPeekSheetProps = {
  client: ClientPeekClient | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  detailHref: string;
};

export function ClientPeekSheet({
  client,
  open,
  onOpenChange,
  detailHref,
}: ClientPeekSheetProps) {
  const [comments, setComments] = useState<ThreadComment[]>([]);
  const [commentText, setCommentText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loadingComments, startLoad] = useTransition();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!open || !client?.id) {
      setComments([]);
      return;
    }
    startLoad(async () => {
      const data = await getClientPeekComments(client.id);
      setComments(data);
    });
  }, [open, client?.id]);

  if (!client) return null;

  const social = parseSocialFromLinks(linkUrls(client.links));
  const businessTitle = client.company_name?.trim()
    ? `${client.name} · ${client.company_name}`
    : client.name;
  const clientId = client.id;

  const hasPhone = Boolean(client.phone);
  const hasTelegram = Boolean(client.telegram_username);
  const hasEmail = Boolean(client.email);
  const hasExtraPhone = Boolean(client.extra_phone);
  const hasDecisionMaker = Boolean(client.decision_maker);
  const hasAnyContact = hasPhone || hasTelegram || hasEmail || hasExtraPhone || hasDecisionMaker || social.instagram || social.github;

  async function submitComment() {
    const text = commentText.trim();
    if (!text) return;
    setSubmitting(true);
    const result = await addClientComment(clientId, text);
    if (result.ok) {
      setCommentText("");
      const data = await getClientPeekComments(clientId);
      setComments(data);
    }
    setSubmitting(false);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      submitComment();
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col overflow-hidden border-l border-border bg-background p-0 sm:max-w-sm md:max-w-md"
      >
        {/* Шапка */}
        <SheetHeader className="border-b border-border px-5 py-3 text-left">
          <SheetTitle className="pr-8 text-base font-semibold leading-snug">
            {businessTitle}
          </SheetTitle>
        </SheetHeader>

        {/* Тело */}
        <div className="flex-1 overflow-y-auto">
          {/* Контакты */}
          {hasAnyContact && (
            <div className="border-b border-border px-5 py-3">
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Контакты
              </p>
              <div className="space-y-0.5">
                {hasDecisionMaker && (
                  <ProfileField label="ЛПР" value={client.decision_maker} />
                )}
                {hasPhone && (
                  <ProfileField
                    label="Тел."
                    value={<ContactValue type="phone" value={client.phone} />}
                  />
                )}
                {hasExtraPhone && (
                  <ProfileField
                    label="2-й тел."
                    value={<ContactValue type="phone" value={client.extra_phone} />}
                  />
                )}
                {hasTelegram && (
                  <ProfileField
                    label="Telegram"
                    value={<ContactValue type="telegram" value={client.telegram_username} />}
                  />
                )}
                {hasEmail && (
                  <ProfileField
                    label="Email"
                    value={<ContactValue type="email" value={client.email} />}
                  />
                )}
                {social.instagram && (
                  <ProfileField
                    label="Instagram"
                    value={
                      <a
                        href={social.instagram.startsWith("http") ? social.instagram : `https://${social.instagram}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline"
                      >
                        {social.instagram}
                      </a>
                    }
                  />
                )}
                {social.github && (
                  <ProfileField
                    label="GitHub"
                    value={
                      <a
                        href={social.github.startsWith("http") ? social.github : `https://${social.github}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline"
                      >
                        {social.github}
                      </a>
                    }
                  />
                )}
              </div>
            </div>
          )}

          {/* Заметки */}
          {client.notes?.trim() && (
            <div className="border-b border-border px-5 py-3">
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Заметки
              </p>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                {client.notes.trim()}
              </p>
            </div>
          )}

          {/* Комментарии */}
          <div className="px-5 py-3">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              Комментарии
            </p>

            {/* Форма добавления */}
            <div className="mb-3 flex flex-col gap-2">
              <Textarea
                ref={textareaRef}
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Написать комментарий… (Ctrl+Enter)"
                rows={2}
                className="resize-none bg-[#1B1B1F] text-sm"
              />
              <div className="flex justify-end">
                <Button
                  size="sm"
                  onClick={submitComment}
                  disabled={submitting || !commentText.trim()}
                  className="gap-1.5"
                >
                  <Send className="h-3.5 w-3.5" />
                  {submitting ? "Отправка…" : "Добавить"}
                </Button>
              </div>
            </div>

            {/* Список комментариев */}
            {loadingComments ? (
              <p className="text-sm text-muted-foreground">Загрузка…</p>
            ) : comments.length === 0 ? (
              <p className="text-sm text-muted-foreground">Пока нет комментариев.</p>
            ) : (
              <div className="space-y-2">
                {comments.slice(0, 6).map((comment) => (
                  <div key={comment.id} className="rounded-lg bg-[#1B1B1F] px-3 py-2.5">
                    <div className="mb-0.5 flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold">
                        {comment.author?.full_name ?? "Система"}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {formatDate(comment.created_at, true)}
                      </span>
                    </div>
                    <p className="line-clamp-3 whitespace-pre-wrap text-sm text-muted-foreground">
                      {comment.content}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Футер */}
        <div className="border-t border-border px-5 py-3">
          <Button variant="outline" className="w-full" asChild>
            <Link href={detailHref}>
              <ExternalLink className="mr-2 h-4 w-4" />
              Полная карточка
            </Link>
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
