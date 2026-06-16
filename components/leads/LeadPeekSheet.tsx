"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { addLeadComment, getLeadPeekComments } from "@/app/(dashboard)/leads/actions";
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
import { leadBusinessName, parseSocialFromLinks } from "@/lib/social-links";
import { formatDate } from "@/lib/utils";
import type { Lead } from "@/types";

export type LeadPeekLead = Pick<
  Lead,
  | "id"
  | "name"
  | "telegram_username"
  | "phone"
  | "extra_phone"
  | "email"
  | "decision_maker"
  | "notes"
  | "cold_search"
>;

type LeadPeekSheetProps = {
  lead: LeadPeekLead | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  detailHref: string;
};

export function LeadPeekSheet({ lead, open, onOpenChange, detailHref }: LeadPeekSheetProps) {
  const [comments, setComments] = useState<ThreadComment[]>([]);
  const [loadingComments, startLoad] = useTransition();

  useEffect(() => {
    if (!open || !lead?.id) {
      setComments([]);
      return;
    }
    startLoad(async () => {
      const data = await getLeadPeekComments(lead.id);
      setComments(data);
    });
  }, [open, lead?.id]);

  if (!lead) return null;

  const social = parseSocialFromLinks(lead.cold_search?.links);
  const businessTitle = leadBusinessName(lead);
  const details = [lead.notes, lead.cold_search?.offer, lead.cold_search?.assets]
    .filter(Boolean)
    .join("\n\n");

  const recentComments = comments.slice(0, 5);
  const leadId = lead.id;

  async function addComment(content: string) {
    const result = await addLeadComment(leadId, content);
    if (result.ok) {
      const data = await getLeadPeekComments(leadId);
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
          <SheetDescription>Краткая карточка лида. Полные данные — в полной карточке.</SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-4 overflow-y-auto px-6 py-4">
          <div className="space-y-0.5">
            {lead.decision_maker && (
              <ProfileField label="ЛПР" value={lead.decision_maker} />
            )}
            <ProfileField
              label="Телефон"
              value={<ContactValue type="phone" value={lead.phone} />}
            />
            {lead.extra_phone && (
              <ProfileField
                label="2-й тел."
                value={<ContactValue type="phone" value={lead.extra_phone} />}
              />
            )}
            <ProfileField
              label="Telegram"
              value={<ContactValue type="telegram" value={lead.telegram_username} />}
            />
            {lead.email && (
              <ProfileField
                label="Email"
                value={<ContactValue type="email" value={lead.email} />}
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

          {details && (
            <div className="space-y-1 border-t border-border pt-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Подробно
              </p>
              <p className="whitespace-pre-wrap text-sm text-foreground">{details}</p>
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
