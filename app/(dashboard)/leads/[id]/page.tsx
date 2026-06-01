import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronDown, MapPin, Pencil, Plus } from "lucide-react";
import { addLeadComment } from "@/app/(dashboard)/leads/actions";
import { ColdSearchPanel } from "@/components/leads/ColdSearchPanel";
import { LeadFormDialog } from "@/components/leads/LeadFormDialog";
import { LeadQuickActions } from "@/components/leads/LeadQuickActions";
import { ProjectFormDialog } from "@/components/projects/ProjectFormDialog";
import { ContactValue } from "@/components/shared/ContactValue";
import {
  CommentThread,
  type ThreadComment,
} from "@/components/shared/CommentThread";
import { HistoryTimeline } from "@/components/shared/HistoryTimeline";
import { ListBackLink } from "@/components/shared/ListBackLink";
import { ProfileField } from "@/components/shared/ProfileField";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getCrmDisplayIdMaps } from "@/lib/crm-display-id";
import { parseListQueryFromParam } from "@/lib/crm-list-query";
import { getHistory } from "@/lib/history";
import { LEAD_SOURCE_LABEL, LEAD_STATUS, PROJECT_STATUS, PROJECT_TYPE_LABEL } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";
import { formatCurrency, formatDate, formatNumber } from "@/lib/utils";
import type { Lead, Project } from "@/types";

function budgetText(lead: Lead) {
  if (lead.budget_min == null && lead.budget_max == null) return "—";
  if (lead.budget_min != null && lead.budget_max != null) {
    return `${formatCurrency(lead.budget_min)} – ${formatCurrency(lead.budget_max)}`;
  }
  return formatCurrency((lead.budget_min ?? lead.budget_max)!);
}

export default async function LeadDetailPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { from?: string };
}) {
  const supabase = createClient();
  const { leadIdMap } = await getCrmDisplayIdMaps(supabase);
  const listQuery = parseListQueryFromParam(searchParams.from);

  const { data: lead } = await supabase
    .from("leads")
    .select("*")
    .eq("id", params.id)
    .maybeSingle<Lead>();

  if (!lead) notFound();

  const { data: linkedClient } = await supabase
    .from("clients")
    .select("id, name")
    .eq("lead_id", lead.id)
    .maybeSingle<{ id: string; name: string }>();

  const [commentsRes, projectsRes] = await Promise.all([
    supabase
      .from("comments")
      .select("id, content, type, created_at, author:profiles(full_name)")
      .eq("entity_type", "lead")
      .eq("entity_id", params.id)
      .order("created_at", { ascending: false }),
    linkedClient
      ? supabase
          .from("projects")
          .select("*")
          .eq("client_id", linkedClient.id)
          .order("created_at", { ascending: false })
          .returns<Project[]>()
      : Promise.resolve({ data: [] as Project[] }),
  ]);

  function mapAuthor(author: unknown): { full_name: string } | null {
    return Array.isArray(author)
      ? ((author[0] as { full_name: string }) ?? null)
      : ((author as { full_name: string } | null) ?? null);
  }

  const comments: ThreadComment[] = (commentsRes.data ?? []).map((comment) => ({
    id: comment.id as string,
    content: comment.content as string,
    type: comment.type as string,
    created_at: comment.created_at as string,
    author: mapAuthor(comment.author),
  }));

  const history = await getHistory(supabase, [lead.id]);
  const statusMeta = LEAD_STATUS[lead.status];
  const crmId = leadIdMap[lead.id] ?? 0;
  const duplicateOfCrmId = lead.duplicate_of ? (leadIdMap[lead.duplicate_of] ?? 0) : 0;
  const projects = projectsRes.data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <ListBackLink href="/leads" listQuery={listQuery} />
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
                </span>
              )}
              {linkedClient && (
                <Link
                  href={`/clients/${linkedClient.id}`}
                  className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary"
                >
                  Клиент: {linkedClient.name}
                </Link>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              Лид с {formatDate(lead.created_at, true)}
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

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-6 bg-card">
          <TabsTrigger value="overview">Обзор</TabsTrigger>
          <TabsTrigger value="projects">Проекты</TabsTrigger>
          <TabsTrigger value="payments">Оплаты</TabsTrigger>
          <TabsTrigger value="comments">Комментарии</TabsTrigger>
          <TabsTrigger value="history">История</TabsTrigger>
          <TabsTrigger value="files">Файлы</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="grid gap-4 xl:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
          <Card>
            <CardContent className="space-y-3 p-4">
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Контакты
              </p>
              <ProfileField
                label="Telegram"
                value={<ContactValue type="telegram" value={lead.telegram_username} />}
              />
              <ProfileField label="Телефон" value={<ContactValue type="phone" value={lead.phone} />} />
              {lead.extra_phone && (
                <ProfileField
                  label="2-й тел."
                  value={<ContactValue type="phone" value={lead.extra_phone} />}
                />
              )}
              <ProfileField label="Email" value={<ContactValue type="email" value={lead.email} />} />
              {lead.decision_maker && <ProfileField label="ЛПР" value={lead.decision_maker} />}

              {lead.maps_url && (
                <div className="border-t border-border pt-2">
                  <a
                    href={lead.maps_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1 text-xs font-medium hover:border-primary hover:text-primary"
                  >
                    <MapPin className="h-3.5 w-3.5" />
                    На картах
                  </a>
                </div>
              )}

              <details className="group rounded-lg border border-border">
                <summary className="flex cursor-pointer list-none items-center justify-between px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground">
                  Квалификация
                  <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
                </summary>
                <div className="space-y-0.5 border-t border-border px-3 py-2">
                  <ProfileField label="Источник" value={LEAD_SOURCE_LABEL[lead.source]} />
                  <ProfileField label="Запрос" value={lead.service_interest} />
                  <ProfileField label="Бюджет" value={budgetText(lead)} />
                </div>
              </details>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <Card>
              <CardContent className="grid grid-cols-3 gap-3 p-4">
                <div>
                  <p className="text-xs text-muted-foreground">Источник</p>
                  <p className="mt-0.5 text-sm font-semibold">{LEAD_SOURCE_LABEL[lead.source]}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Запрос</p>
                  <p className="mt-0.5 text-sm font-semibold">{lead.service_interest || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Бюджет</p>
                  <p className="mt-0.5 text-sm font-semibold">{budgetText(lead)}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Заметки</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                  {lead.notes || "Без описания. Добавьте контекст через «Редактировать»."}
                </p>
              </CardContent>
            </Card>

            <details className="group rounded-xl border border-border bg-card">
              <summary className="flex cursor-pointer list-none items-center justify-between p-4 text-sm font-medium hover:text-primary">
                Холодный поиск
                <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
              </summary>
              <div className="border-t border-border p-4 pt-2">
                <ColdSearchPanel leadId={lead.id} initial={lead.cold_search} />
              </div>
            </details>
          </div>
        </TabsContent>

        <TabsContent value="projects" className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold">Проекты</h2>
              <p className="text-sm text-muted-foreground">
                {linkedClient
                  ? "Проекты связанного клиента."
                  : "Переведите лида в клиента, чтобы вести проекты."}
              </p>
            </div>
            {linkedClient && (
              <ProjectFormDialog
                clients={[{ id: linkedClient.id, name: linkedClient.name }]}
                initialClientId={linkedClient.id}
                lockClient
                trigger={
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Новый проект
                  </Button>
                }
              />
            )}
          </div>

          <Card>
            <CardContent className="space-y-3 p-4">
              {!linkedClient ? (
                <p className="text-sm text-muted-foreground">Клиент ещё не создан из этого лида.</p>
              ) : projects.length === 0 ? (
                <p className="text-sm text-muted-foreground">У клиента пока нет проектов.</p>
              ) : (
                projects.map((project) => {
                  const projectStatus = PROJECT_STATUS[project.status];
                  return (
                    <Link
                      key={project.id}
                      href={`/projects/${project.id}`}
                      className="block rounded-xl border border-border p-4 transition-colors hover:border-primary"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-semibold">{project.title}</p>
                            <StatusBadge label={projectStatus.label} color={projectStatus.color} />
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {formatDate(project.created_at, true)}
                          </p>
                        </div>
                        <span className="inline-flex h-9 items-center rounded-md border border-input px-3 text-sm">
                          Подробнее
                        </span>
                      </div>
                      <div className="mt-3 grid gap-2 sm:grid-cols-3">
                        <div className="rounded-lg bg-[#1B1B1F] p-2.5 text-sm">
                          <span className="text-xs text-muted-foreground">Тип · </span>
                          {project.project_type
                            ? PROJECT_TYPE_LABEL[project.project_type]
                            : "—"}
                        </div>
                        <div className="rounded-lg bg-[#1B1B1F] p-2.5 text-sm">
                          <span className="text-xs text-muted-foreground">Сумма · </span>
                          {formatCurrency(project.amount)}
                        </div>
                        <div className="rounded-lg bg-[#1B1B1F] p-2.5 text-sm">
                          <span className="text-xs text-muted-foreground">Прогресс · </span>
                          {project.progress}%
                        </div>
                      </div>
                    </Link>
                  );
                })
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments">
          <Card>
            <CardHeader>
              <CardTitle>Оплаты</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Оплаты привязаны к клиенту.{" "}
                {linkedClient ? (
                  <Link href={`/clients/${linkedClient.id}`} className="text-primary underline">
                    Открыть карточку клиента
                  </Link>
                ) : (
                  "Сначала переведите лида в клиента."
                )}
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="comments">
          <CommentThread comments={comments} add={addLeadComment.bind(null, lead.id)} />
        </TabsContent>

        <TabsContent value="history">
          <HistoryTimeline entries={history} />
        </TabsContent>

        <TabsContent value="files">
          <Card>
            <CardHeader>
              <CardTitle>Файлы</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Блок файлов под интеграцию Supabase Storage.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
