"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import {
  addClientComment,
  getClientPeekComments,
} from "@/app/(dashboard)/clients/actions";
import { ContactValue } from "@/components/shared/ContactValue";
import {
  CommentThread,
  type ThreadComment,
} from "@/components/shared/CommentThread";
import { ProfileField } from "@/components/shared/ProfileField";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
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
  const [loadingComments, startLoad] = useTransition();

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
  const recentComments = comments.slice(0, 5);
  const clientId = client.id;

  async function addComment(content: string) {
    const result = await addClientComment(clientId, content);
    if (result.ok) {
      const data = await getClientPeekComments(clientId);
      setComments(data);
    }
    return result;
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col overflow-hidden border-l border-border bg-background p-0 sm:max-w-md md:max-w-lg"
      >
        <SheetHeader className="border-b border-border px-6 py-4 text-left">
          <SheetTitle className="pr-8 text-lg leading-snug">{businessTitle}</SheetTitle>
          <SheetDescription>
            Краткая карточка клиента. Полные данные — в полной карточке.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-4 overflow-y-auto px-6 py-4">
          <div className="space-y-0.5">
            {client.decision_maker && (
              <ProfileField label="ЛПР" value={client.decision_maker} />
            )}
            <ProfileField
              label="Телефон"
              value={<ContactValue type="phone" value={client.phone} />}
            />
            {client.extra_phone && (
              <ProfileField
                label="2-й тел."
                value={<ContactValue type="phone" value={client.extra_phone} />}
              />
            )}
            <ProfileField
              label="Telegram"
              value={<ContactValue type="telegram" value={client.telegram_username} />}
            />
            {client.email && (
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
                    className="text-primary hover:underline"
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
                    className="text-primary hover:underline"
                  >
                    {social.github}
                  </a>
                }
              />
            )}
          </div>

          {client.notes?.trim() && (
            <div className="space-y-1 border-t border-border pt-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Подробно
              </p>
              <p className="whitespace-pre-wrap text-sm text-foreground">{client.notes.trim()}</p>
            </div>
          )}

          <div className="space-y-3 border-t border-border pt-3">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Комментарии
            </p>
            {loadingComments ? (
              <p className="text-sm text-muted-foreground">Загрузка…</p>
            ) : recentComments.length > 0 ? (
              <ul className="space-y-2">
                {recentComments.map((comment) => (
                  <li key={comment.id} className="rounded-lg bg-[#1B1B1F] p-3">
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <span className="text-sm font-medium">
                        {comment.author?.full_name ?? "Система"}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(comment.created_at, true)}
                      </span>
                    </div>
                    <p className="line-clamp-3 whitespace-pre-wrap text-sm text-muted-foreground">
                      {comment.content}
                    </p>
                  </li>
                ))}
              </ul>
            ) : null}
            <CommentThread comments={comments} add={addComment} />
          </div>
        </div>

        <div className="border-t border-border px-6 py-4">
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
