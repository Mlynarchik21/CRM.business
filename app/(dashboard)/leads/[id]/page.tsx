import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, MapPin, Pencil } from "lucide-react";
import { LeadQuickActions } from "@/components/leads/LeadQuickActions";
import { LeadFormDialog } from "@/components/leads/LeadFormDialog";
import { ColdSearchPanel } from "@/components/leads/ColdSearchPanel";
import { ContactValue } from "@/components/shared/ContactValue";
import {
  CommentThread,
  type ThreadComment,
} from "@/components/shared/CommentThread";
import { HistoryTimeline } from "@/components/shared/HistoryTimeline";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { addLeadComment } from "@/app/(dashboard)/leads/actions";
import { getCrmDisplayIdMaps } from "@/lib/crm-display-id";
import { getHistory } from "@/lib/history";
import { LEAD_SOURCE_LABEL, LEAD_STATUS } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Lead } from "@/types";

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <span className="shrink-0 text-sm text-muted-foreground">{label}</span>
      <div className="min-w-0 text-right text-sm font-medium">{value || "—"}</div>
    </div>
  );
}

function budgetText(lead: Lead) {
  if (lead.budget_min == null && lead.budget_max == null) return "—";
  if (lead.budget_min != null && lead.budget_max != null) {
    return `${formatCurrency(lead.budget_min)} – ${formatCurrency(lead.budget_max)}`;
  }
  return formatCurrency((lead.budget_min ?? lead.budget_max)!);
}

export default async function LeadDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();
  const { leadIdMap } = await getCrmDisplayIdMaps(supabase);

  const { data: lead } = await supabase
    .from("leads")
    .select("*")
    .eq("id", params.id)
    .maybeSingle<Lead>();

  if (!lead) notFound();

  const { data: rawComments } = await supabase
    .from("comments")
    .select("id, content, type, created_at, author:profiles(full_name)")
    .eq("entity_type", "lead")
    .eq("entity_id", params.id)
    .order("created_at", { ascending: false });

  const comments: ThreadComment[] = (rawComments ?? []).map((comment) => ({
    id: comment.id as string,
    content: comment.content as string,
    type: comment.type as string,
    created_at: comment.created_at as string,
    author: Array.isArray(comment.author)
      ? (comment.author[0] ?? null)
      : ((comment.author as { full_name: string } | null) ?? null),
  }));

  const history = await getHistory(supabase, [lead.id]);

  const statusMeta = LEAD_STATUS[lead.status];
  const crmId = leadIdMap[lead.id] ?? 0;
  const duplicateOfCrmId = lead.duplicate_of ? (leadIdMap[lead.duplicate_of] ?? 0) : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/leads">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-semibold tracking-tight">{lead.name}</h1>
              <span className="rounded-full border border-border px-2.5 py-1 text-xs font-medium text-muted-foreground">
                ID #{crmId}
              </span>
              <StatusBadge label={statusMeta.label} color={statusMeta.color} />
              {lead.is_duplicate && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F59E0B1A] px-2.5 py-1 text-xs font-medium text-[#F59E0B]">
                  Дубль
                  {lead.duplicate_of && (
                    <Link href={`/leads/${lead.duplicate_of}`} className="underline">
                      → ID #{duplicateOfCrmId}
                    </Link>
                  )}
                  {typeof lead.similarity_score === "number" && (
                    <span className="opacity-80">· {lead.similarity_score}%</span>
                  )}
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              Создан {formatDate(lead.created_at, true)}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <LeadQuickActions leadId={lead.id} />
          <LeadFormDialog
            lead={lead}
            trigger={
              <Button variant="outline">
                <Pencil className="mr-2 h-4 w-4" />
                Редактировать
              </Button>
            }
          />
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Контакты и квалификация</CardTitle>
          </CardHeader>
          <CardContent className="divide-y divide-border">
            <InfoRow label="ID пользователя" value={`#${crmId}`} />
            <InfoRow
              label="Telegram"
              value={<ContactValue type="telegram" value={lead.telegram_username} />}
            />
            <InfoRow
              label="Телефон"
              value={<ContactValue type="phone" value={lead.phone} />}
            />
            {lead.extra_phone && (
              <InfoRow
                label="Второй телефон"
                value={<ContactValue type="phone" value={lead.extra_phone} />}
              />
            )}
            <InfoRow
              label="Email"
              value={<ContactValue type="email" value={lead.email} />}
            />
            {lead.decision_maker && (
              <InfoRow label="ЛПР (доп. контакт)" value={lead.decision_maker} />
            )}
            {lead.maps_url && (
              <InfoRow
                label="На картах"
                value={
                  <Button asChild size="sm" variant="outline">
                    <a href={lead.maps_url} target="_blank" rel="noreferrer">
                      <MapPin className="mr-1 h-3.5 w-3.5" />
                      Открыть на картах
                    </a>
                  </Button>
                }
              />
            )}
            <InfoRow label="Откуда пришёл" value={LEAD_SOURCE_LABEL[lead.source]} />
            <InfoRow label="Что ищет" value={lead.service_interest || "—"} />
            <InfoRow label="Бюджет" value={budgetText(lead)} />
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader className="space-y-1 pb-3">
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-primary">
                Подробно
              </p>
              <CardTitle>Детали запроса</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 lg:grid-cols-3">
                <div className="rounded-xl border border-border bg-card p-4">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                    Откуда лид пришёл
                  </p>
                  <p className="mt-2 text-sm font-medium">
                    {LEAD_SOURCE_LABEL[lead.source]}
                  </p>
                </div>
                <div className="rounded-xl border border-border bg-card p-4">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                    Что ищет
                  </p>
                  <p className="mt-2 text-sm font-medium">
                    {lead.service_interest || "Не уточнил"}
                  </p>
                </div>
                <div className="rounded-xl border border-border bg-card p-4">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                    Бюджет
                  </p>
                  <p className="mt-2 text-sm font-medium">{budgetText(lead)}</p>
                </div>
              </div>

              <div className="rounded-xl border border-border bg-card p-4">
                <p className="text-[11px] uppercase tracking-[0.18em] text-primary">
                  Описание лида
                </p>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
                  {lead.notes ||
                    "Пока без описания. Здесь фиксируем, где найден лид, что это за бизнес, что у него уже есть, что можно предложить, комментарии и контекст общения."}
                </p>
              </div>
            </CardContent>
          </Card>

          <ColdSearchPanel leadId={lead.id} initial={lead.cold_search} />

          <CommentThread comments={comments} add={addLeadComment.bind(null, lead.id)} />

          <HistoryTimeline entries={history} />
        </div>
      </div>
    </div>
  );
}
