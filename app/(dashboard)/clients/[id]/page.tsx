import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, MapPin, Pencil, Plus } from "lucide-react";
import { addClientComment, updateClientNotes } from "@/app/(dashboard)/clients/actions";
import { ClientArchiveButton } from "@/components/clients/ClientArchiveButton";
import { ClientFormDialog } from "@/components/clients/ClientFormDialog";
import { ClientLeadInfoPanel } from "@/components/clients/ClientLeadInfoPanel";
import { ClientNotesEditor } from "@/components/clients/ClientNotesEditor";
import { ProjectFormDialog } from "@/components/projects/ProjectFormDialog";
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { getCrmDisplayIdMaps } from "@/lib/crm-display-id";
import { getHistory } from "@/lib/history";
import { CLIENT_STATUS, LEAD_SOURCE_LABEL, PROJECT_STATUS, PROJECT_TYPE_LABEL } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";
import { formatCurrency, formatDate, formatNumber } from "@/lib/utils";
import type { Client, Lead, Payment, Project } from "@/types";

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

export default async function ClientDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();
  const { clientIdMap } = await getCrmDisplayIdMaps(supabase);

  const { data: client } = await supabase
    .from("clients")
    .select("*")
    .eq("id", params.id)
    .maybeSingle<Client>();

  if (!client) notFound();

  const [projectsRes, paymentsRes, commentsRes, leadRes] = await Promise.all([
    supabase
      .from("projects")
      .select("*")
      .eq("client_id", client.id)
      .order("created_at", { ascending: false })
      .returns<Project[]>(),
    supabase
      .from("payments")
      .select("id, amount, currency, status, paid_at, expected_at, comment")
      .eq("client_id", client.id)
      .order("created_at", { ascending: false })
      .returns<
        (Pick<Payment, "id" | "amount" | "currency" | "status" | "paid_at" | "expected_at"> & {
          comment: string | null;
        })[]
      >(),
    supabase
      .from("comments")
      .select("id, content, type, created_at, author:profiles(full_name)")
      .eq("entity_type", "client")
      .eq("entity_id", client.id)
      .order("created_at", { ascending: false }),
    client.lead_id
      ? supabase
          .from("leads")
          .select("name, source, status, service_interest, budget_min, budget_max, notes, created_at")
          .eq("id", client.lead_id)
          .maybeSingle<
            Pick<
              Lead,
              "name" | "source" | "status" | "service_interest" | "budget_min" | "budget_max" | "notes" | "created_at"
            >
          >()
      : Promise.resolve({ data: null }),
  ]);

  const comments: ThreadComment[] = (commentsRes.data ?? []).map((comment) => ({
    id: comment.id as string,
    content: comment.content as string,
    type: comment.type as string,
    created_at: comment.created_at as string,
    author: Array.isArray(comment.author)
      ? (comment.author[0] ?? null)
      : ((comment.author as { full_name: string } | null) ?? null),
  }));

  const statusMeta = CLIENT_STATUS[client.status];
  const projects = projectsRes.data ?? [];
  const payments = paymentsRes.data ?? [];
  const lead = leadRes.data ?? null;
  const crmId = clientIdMap[client.id] ?? 0;

  // История: события клиента + события исходного лида (если есть).
  const history = await getHistory(
    supabase,
    [client.id, client.lead_id].filter(Boolean) as string[],
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/clients">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold tracking-tight">{client.name}</h1>
              <span className="rounded-full border border-border px-2.5 py-1 text-xs font-medium text-muted-foreground">
                ID #{crmId}
              </span>
              <StatusBadge label={statusMeta.label} color={statusMeta.color} />
              {client.archived && (
                <span className="rounded-full bg-[#6B72801A] px-2.5 py-1 text-xs font-medium text-muted-foreground">
                  В архиве
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              Клиент с {formatDate(client.created_at, true)}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <ClientArchiveButton clientId={client.id} archived={Boolean(client.archived)} />
          <ClientFormDialog
            client={client}
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

        <TabsContent value="overview" className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
          <Card>
            <CardHeader>
              <CardTitle>Информация</CardTitle>
            </CardHeader>
            <CardContent className="divide-y divide-border">
              <InfoRow label="ID пользователя" value={`#${crmId}`} />
              <InfoRow label="Компания" value={client.company_name} />
              <InfoRow label="ЛПР (доп. контакт)" value={client.decision_maker} />
              <InfoRow
                label="Telegram"
                value={<ContactValue type="telegram" value={client.telegram_username} />}
              />
              <InfoRow
                label="Телефон"
                value={<ContactValue type="phone" value={client.phone} />}
              />
              {client.extra_phone && (
                <InfoRow
                  label="Второй телефон"
                  value={<ContactValue type="phone" value={client.extra_phone} />}
                />
              )}
              <InfoRow
                label="Email"
                value={<ContactValue type="email" value={client.email} />}
              />
              {client.maps_url && (
                <InfoRow
                  label="На картах"
                  value={
                    <Button asChild size="sm" variant="outline">
                      <a href={client.maps_url} target="_blank" rel="noreferrer">
                        <MapPin className="mr-1 h-3.5 w-3.5" />
                        Открыть на картах
                      </a>
                    </Button>
                  }
                />
              )}
              {Array.isArray(client.links) && client.links.length > 0 && (
                <InfoRow
                  label="Ссылки"
                  value={
                    <div className="flex flex-wrap justify-end gap-2">
                      {client.links.map((l) => (
                        <a
                          key={l.id}
                          href={l.url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-2.5 py-1 text-xs font-medium transition-colors hover:border-primary hover:text-primary"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          {l.label || "Ссылка"}
                        </a>
                      ))}
                    </div>
                  }
                />
              )}
              <InfoRow label="Страна" value={client.country} />
              <InfoRow label="Город" value={client.city} />
              <InfoRow
                label="Источник"
                value={
                  client.source
                    ? LEAD_SOURCE_LABEL[client.source as keyof typeof LEAD_SOURCE_LABEL] ?? client.source
                    : "—"
                }
              />
              <InfoRow label="Проекты" value={formatNumber(client.projects_count)} />
              <InfoRow label="Оплачено" value={formatCurrency(client.total_paid)} />
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Сводка</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-xl bg-card p-4">
                  <p className="text-sm text-muted-foreground">Проектов</p>
                  <p className="mt-1 text-2xl font-semibold">{formatNumber(projects.length)}</p>
                </div>
                <div className="rounded-xl bg-card p-4">
                  <p className="text-sm text-muted-foreground">Платежей</p>
                  <p className="mt-1 text-2xl font-semibold">{formatNumber(payments.length)}</p>
                </div>
                <div className="rounded-xl bg-card p-4">
                  <p className="text-sm text-muted-foreground">Сумма</p>
                  <p className="mt-1 text-2xl font-semibold">{formatCurrency(client.total_paid)}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Заметки</CardTitle>
              </CardHeader>
              <CardContent>
                <ClientNotesEditor
                  initialValue={client.notes ?? ""}
                  save={updateClientNotes.bind(null, client.id)}
                />
              </CardContent>
            </Card>

            <ClientLeadInfoPanel lead={lead} />
          </div>
        </TabsContent>

        <TabsContent value="projects" className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold">Проекты клиента</h2>
              <p className="text-sm text-muted-foreground">
                Здесь храним всё по проектам: что делаем, сроки, стоимость, ссылки, дорожную карту, правки и комментарии.
              </p>
            </div>
            <ProjectFormDialog
              clients={[{ id: client.id, name: client.name }]}
              initialClientId={client.id}
              lockClient
              trigger={
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Новый проект
                </Button>
              }
            />
          </div>

          <Card>
            <CardContent className="space-y-3 p-4">
              {projects.length === 0 ? (
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
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-lg font-semibold">{project.title}</p>
                            <StatusBadge label={projectStatus.label} color={projectStatus.color} />
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Создан {formatDate(project.created_at, true)}
                          </p>
                        </div>
                        <Button variant="outline" size="sm">Подробная информация</Button>
                      </div>

                      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                        <div className="rounded-lg bg-[#1B1B1F] p-3">
                          <p className="text-xs uppercase tracking-wide text-muted-foreground">Что делаем</p>
                          <p className="mt-1 text-sm font-medium">
                            {project.project_type ? PROJECT_TYPE_LABEL[project.project_type] : "Не указано"}
                          </p>
                        </div>
                        <div className="rounded-lg bg-[#1B1B1F] p-3">
                          <p className="text-xs uppercase tracking-wide text-muted-foreground">Срок</p>
                          <p className="mt-1 text-sm font-medium">
                            {project.deadline ? formatDate(project.deadline, true) : "Не задан"}
                          </p>
                        </div>
                        <div className="rounded-lg bg-[#1B1B1F] p-3">
                          <p className="text-xs uppercase tracking-wide text-muted-foreground">Стоимость</p>
                          <p className="mt-1 text-sm font-medium">{formatCurrency(project.amount)}</p>
                        </div>
                        <div className="rounded-lg bg-[#1B1B1F] p-3">
                          <p className="text-xs uppercase tracking-wide text-muted-foreground">Оплачено</p>
                          <p className="mt-1 text-sm font-medium">{formatCurrency(project.paid_amount)}</p>
                        </div>
                        <div className="rounded-lg bg-[#1B1B1F] p-3">
                          <p className="text-xs uppercase tracking-wide text-muted-foreground">Прогресс</p>
                          <p className="mt-1 text-sm font-medium">{project.progress}%</p>
                        </div>
                      </div>

                      {project.description && (
                        <p className="mt-4 line-clamp-2 text-sm text-muted-foreground">
                          {project.description}
                        </p>
                      )}
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
            <CardContent className="space-y-3">
              {payments.length === 0 ? (
                <p className="text-sm text-muted-foreground">Оплат пока нет.</p>
              ) : (
                payments.map((payment) => (
                  <div key={payment.id} className="rounded-lg border border-border p-4">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <p className="font-medium">{formatCurrency(payment.amount)}</p>
                        <p className="text-sm text-muted-foreground">
                          Статус: {payment.status} · Дата: {formatDate(payment.paid_at ?? payment.expected_at ?? client.created_at, true)}
                        </p>
                      </div>
                      {payment.comment && (
                        <p className="max-w-xl text-sm text-muted-foreground">{payment.comment}</p>
                      )}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="comments">
          <CommentThread comments={comments} add={addClientComment.bind(null, client.id)} />
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
                Блок файлов оставлен под дальнейшую интеграцию Supabase Storage.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
