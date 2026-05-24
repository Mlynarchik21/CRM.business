import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, Pencil, Plus } from "lucide-react";
import { addProjectComment } from "@/app/(dashboard)/projects/actions";
import { PaymentFormDialog } from "@/components/payments/PaymentFormDialog";
import { ProjectFormDialog } from "@/components/projects/ProjectFormDialog";
import { ProjectStatusSwitcher } from "@/components/projects/ProjectStatusSwitcher";
import { ProjectStages } from "@/components/projects/ProjectStages";
import { ProjectWorkspaceDialog } from "@/components/projects/ProjectWorkspaceDialog";
import { ContactValue } from "@/components/shared/ContactValue";
import {
  CommentThread,
  type ThreadComment,
} from "@/components/shared/CommentThread";
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
import {
  getPaymentStatusMeta,
  getPrimaryProjectStatus,
  PAYMENT_METHOD_LABEL,
  PROJECT_STATUS,
  PROJECT_TYPE_LABEL,
} from "@/lib/constants";
import { parseProjectMeta } from "@/lib/project-content";
import { createClient } from "@/lib/supabase/server";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils";
import type { Client, Payment, Project, ProjectStage } from "@/types";

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="max-w-[70%] text-right text-sm font-medium">{value || "—"}</div>
    </div>
  );
}

function MetricCard({
  title,
  value,
  hint,
}: {
  title: string;
  value: string;
  hint: string;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <p className="text-sm text-muted-foreground">{title}</p>
        <p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p>
        <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      </CardContent>
    </Card>
  );
}

function transactionIdLabel(paymentId: string) {
  return `TX-${paymentId.slice(0, 8).toUpperCase()}`;
}

function paymentCommentText(comment: string | null | undefined) {
  if (!comment) return "";
  return comment.replace(/^\[(deposit|part|final|other)\]\s*/i, "").trim();
}

export default async function ProjectDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();
  const { clientIdMap } = await getCrmDisplayIdMaps(supabase);

  const [projectRes, clientsRes, commentsRes, paymentsRes] = await Promise.all([
    supabase.from("projects").select("*").eq("id", params.id).maybeSingle<Project>(),
    supabase.from("clients").select("id, name").order("name", { ascending: true }),
    supabase
      .from("comments")
      .select("id, content, type, created_at, author:profiles(full_name)")
      .eq("entity_type", "project")
      .eq("entity_id", params.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("payments")
      .select("id, client_id, project_id, amount, currency, status, payment_method, paid_at, expected_at, receipt_url, comment, created_at")
      .eq("project_id", params.id)
      .order("created_at", { ascending: false })
      .returns<Payment[]>(),
  ]);

  const project = projectRes.data;
  if (!project) notFound();

  const clientRes = project.client_id
    ? await supabase
        .from("clients")
        .select("id, name, company_name, telegram_username, phone, email, country, city, notes")
        .eq("id", project.client_id)
        .maybeSingle<Client>()
    : { data: null };

  const client = clientRes.data;
  const clients = (clientsRes.data ?? []).map((entry) => ({
    id: entry.id as string,
    name: entry.name as string,
  }));

  const comments: ThreadComment[] = (commentsRes.data ?? []).map((comment) => ({
    id: comment.id as string,
    content: comment.content as string,
    type: comment.type as string,
    created_at: comment.created_at as string,
    author: Array.isArray(comment.author)
      ? (comment.author[0] ?? null)
      : ((comment.author as { full_name: string } | null) ?? null),
  }));

  const clientCrmId = client ? clientIdMap[client.id] ?? 0 : 0;
  const statusMeta = PROJECT_STATUS[getPrimaryProjectStatus(project.status)];
  const payments = paymentsRes.data ?? [];
  const stages: ProjectStage[] = Array.isArray(project.stages) ? project.stages : [];
  const meta = parseProjectMeta(project.tech_spec);
  const paidAmount = Number(project.paid_amount ?? 0);
  const totalAmount = Number(project.amount ?? 0);
  const remainingAmount = Math.max(totalAmount - paidAmount, 0);
  const paymentCount = payments.length;
  const links = [
    { label: "GitHub", value: project.github_url },
    { label: "Vercel", value: project.vercel_url },
    { label: "Supabase", value: project.supabase_url },
    { label: "Figma", value: project.figma_url },
    { label: "Telegram Bot", value: project.telegram_bot_url },
    { label: "Staging", value: project.staging_url },
    ...meta.links.map((item) => ({ label: item.label || "Ссылка", value: item.url })),
  ].filter((item) => item.value);

  const overviewContacts = [
    client?.phone ? { label: "Телефон клиента", node: <ContactValue type="phone" value={client.phone} /> } : null,
    client?.email ? { label: "Email клиента", node: <ContactValue type="email" value={client.email} /> } : null,
    client?.telegram_username
      ? { label: "Telegram клиента", node: <ContactValue type="telegram" value={client.telegram_username} /> }
      : null,
  ].filter(Boolean) as { label: string; node: React.ReactNode }[];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/projects">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold tracking-tight">{project.title}</h1>
              <StatusBadge label={statusMeta.label} color={statusMeta.color} />
            </div>
            <p className="text-sm text-muted-foreground">
              Проект создан {formatDate(project.created_at, true)}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <ProjectWorkspaceDialog
            projectId={project.id}
            description={project.description}
            techSpec={project.tech_spec}
            trigger={
              <Button variant="outline">
                <Pencil className="mr-2 h-4 w-4" />
                Контент и контакты
              </Button>
            }
          />

          <ProjectFormDialog
            clients={clients as Pick<Client, "id" | "name">[]}
            project={project}
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
        <TabsList className="grid w-full grid-cols-5 bg-card">
          <TabsTrigger value="overview">Обзор</TabsTrigger>
          <TabsTrigger value="data">Данные</TabsTrigger>
          <TabsTrigger value="stages">Этапы</TabsTrigger>
          <TabsTrigger value="payments">Оплаты</TabsTrigger>
          <TabsTrigger value="comments">Комментарии</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              title="Бюджет проекта"
              value={formatCurrency(totalAmount, project.currency || "USD")}
              hint="Итоговая стоимость проекта"
            />
            <MetricCard
              title="Оплачено"
              value={formatCurrency(paidAmount, project.currency || "USD")}
              hint={`${paymentCount} ${paymentCount === 1 ? "платёж" : paymentCount < 5 ? "платежа" : "платежей"} в проекте`}
            />
            <MetricCard
              title="Осталось"
              value={formatCurrency(remainingAmount, project.currency || "USD")}
              hint="Сколько ещё должен оплатить клиент"
            />
            <MetricCard
              title="Прогресс"
              value={`${project.progress}%`}
              hint={stages.length > 0 ? `${stages.filter((stage) => stage.done).length} из ${stages.length} этапов` : "Этапы пока не заданы"}
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
            <Card>
              <CardHeader>
                <CardTitle>Параметры проекта</CardTitle>
              </CardHeader>
              <CardContent className="divide-y divide-border">
                <InfoRow
                  label="Клиент"
                  value={
                    client ? (
                      <Link href={`/clients/${client.id}`} className="text-primary hover:underline">
                        #{clientCrmId}
                      </Link>
                    ) : (
                      "—"
                    )
                  }
                />
                {client?.name && <InfoRow label="Имя клиента" value={client.name} />}
                {client?.company_name && <InfoRow label="Компания" value={client.company_name} />}
                <InfoRow
                  label="Что делаем"
                  value={project.project_type ? PROJECT_TYPE_LABEL[project.project_type] : "—"}
                />
                <InfoRow label="Стоимость" value={formatCurrency(totalAmount, project.currency || "USD")} />
                <InfoRow label="Оплачено" value={formatCurrency(paidAmount, project.currency || "USD")} />
                <InfoRow
                  label="Дата старта"
                  value={project.start_date ? formatDate(project.start_date, true) : "—"}
                />
                <InfoRow
                  label="Срок"
                  value={project.deadline ? formatDate(project.deadline, true) : "—"}
                />
                {client?.country && <InfoRow label="Страна" value={client.country} />}
                {client?.city && <InfoRow label="Город" value={client.city} />}
              </CardContent>
            </Card>

            <div className="space-y-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0">
                  <CardTitle>Прогресс проекта</CardTitle>
                  <ProjectWorkspaceDialog
                    projectId={project.id}
                    description={project.description}
                    techSpec={project.tech_spec}
                    trigger={
                      <Button variant="ghost" size="sm">
                        <Pencil className="mr-2 h-4 w-4" />
                        Изменить
                      </Button>
                    }
                  />
                </CardHeader>
                <CardContent className="space-y-5">
                  <ProjectStatusSwitcher projectId={project.id} status={project.status} />

                  <div>
                    <div className="mb-2 flex items-end justify-between">
                      <p className="text-3xl font-semibold tracking-tight">{project.progress}%</p>
                      <p className="text-sm text-muted-foreground">
                        {stages.length > 0
                          ? `${stages.filter((stage) => stage.done).length} из ${stages.length} этапов`
                          : "Этапы не заданы"}
                      </p>
                    </div>
                    <div className="h-2.5 w-full overflow-hidden rounded-full bg-[#1B1B1F]">
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{ width: `${project.progress}%` }}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Описание проекта</p>
                    <p className="whitespace-pre-wrap text-sm">
                      {project.description || "Описание проекта пока не заполнено."}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Заметки</p>
                    <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                      {meta.notes || "Заметок пока нет."}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Контакты для связи</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {overviewContacts.length > 0 && (
                    <div className="space-y-3">
                      {overviewContacts.map((item) => (
                        <div key={item.label} className="flex items-center justify-between gap-4">
                          <span className="text-sm text-muted-foreground">{item.label}</span>
                          {item.node}
                        </div>
                      ))}
                    </div>
                  )}

                  {meta.contacts.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Дополнительные контакты не заполнены.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {meta.contacts.map((contact) => (
                        <div key={contact.id} className="rounded-xl border border-border p-4">
                          <p className="font-medium">
                            {[contact.firstName, contact.lastName].filter(Boolean).join(" ") || "Контакт"}
                          </p>
                          {contact.role && (
                            <p className="mt-1 text-sm text-muted-foreground">{contact.role}</p>
                          )}
                          <div className="mt-3 flex flex-wrap gap-2">
                            {contact.phone && <ContactValue type="phone" value={contact.phone} />}
                            {contact.email && <ContactValue type="email" value={contact.email} />}
                            {contact.telegram && <ContactValue type="telegram" value={contact.telegram} />}
                            {contact.whatsapp && <ContactValue type="phone" value={contact.whatsapp} />}
                          </div>
                          {contact.notes && (
                            <p className="mt-3 whitespace-pre-wrap text-sm text-muted-foreground">
                              {contact.notes}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="data" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle>Подробная информация</CardTitle>
              <ProjectWorkspaceDialog
                projectId={project.id}
                description={project.description}
                techSpec={project.tech_spec}
                trigger={
                  <Button variant="ghost" size="sm">
                    <Pencil className="mr-2 h-4 w-4" />
                    Редактировать
                  </Button>
                }
              />
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <p className="mb-2 text-sm text-muted-foreground">Описание проекта</p>
                <p className="whitespace-pre-wrap text-sm">
                  {project.description || "Описание проекта пока не заполнено."}
                </p>
              </div>
              <div>
                <p className="mb-2 text-sm text-muted-foreground">Подробные данные</p>
                <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                  {meta.details || "Подробные данные пока не заполнены."}
                </p>
              </div>
              <div>
                <p className="mb-2 text-sm text-muted-foreground">Заметки</p>
                <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                  {meta.notes || "Заметок пока нет."}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Ссылки и окружения</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {links.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Пока нет ссылок. Добавь их через редактор проекта.
                </p>
              ) : (
                links.map((link, index) => (
                  <div
                    key={`${link.label}-${index}`}
                    className="flex items-center justify-between gap-4 rounded-xl border border-border p-3"
                  >
                    <div className="flex items-center gap-2">
                      <ExternalLink className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">{link.label}</span>
                    </div>
                    <ContactValue type="link" value={link.value} />
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Фото и файлы</CardTitle>
            </CardHeader>
            <CardContent>
              {meta.assets.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Пока нет загруженных файлов и изображений.
                </p>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {meta.assets.map((asset) => {
                    const isImage = asset.type?.startsWith("image/");

                    return (
                      <a
                        key={asset.id}
                        href={asset.url}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-xl border border-border p-3 transition-colors hover:border-primary/40"
                      >
                        {isImage ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={asset.url}
                            alt={asset.name}
                            className="h-40 w-full rounded-lg object-cover"
                          />
                        ) : (
                          <div className="flex h-40 items-center justify-center rounded-lg bg-[#1B1B1F] text-sm text-muted-foreground">
                            Открыть файл
                          </div>
                        )}
                        <p className="mt-3 truncate text-sm font-medium">{asset.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {asset.type || "Файл"}
                        </p>
                      </a>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stages">
          <ProjectStages projectId={project.id} initialStages={stages} />
        </TabsContent>

        <TabsContent value="payments" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <MetricCard
              title="Сумма проекта"
              value={formatCurrency(totalAmount, project.currency || "USD")}
              hint="Зафиксированная стоимость"
            />
            <MetricCard
              title="Получено"
              value={formatCurrency(paidAmount, project.currency || "USD")}
              hint="Пересчитывается по оплатам"
            />
            <MetricCard
              title="Остаток"
              value={formatCurrency(remainingAmount, project.currency || "USD")}
              hint="Сколько осталось оплатить"
            />
          </div>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle>Оплаты по проекту</CardTitle>
              <PaymentFormDialog
                clients={client ? [{ id: client.id, name: client.name }] : clients}
                projects={[{ id: project.id, title: project.title }]}
                initialClientId={project.client_id ?? undefined}
                initialProjectId={project.id}
                lockProject
                trigger={
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Добавить оплату
                  </Button>
                }
              />
            </CardHeader>
            <CardContent className="space-y-3">
              {payments.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Платежей по проекту пока нет.
                </p>
              ) : (
                <div className="overflow-hidden rounded-xl border border-border">
                  <div className="hidden grid-cols-[minmax(0,1.1fr)_140px_170px_170px_220px] gap-4 border-b border-border bg-muted/20 px-4 py-3 text-[11px] uppercase tracking-[0.18em] text-muted-foreground md:grid">
                    <span>Оплата</span>
                    <span>Сумма</span>
                    <span>ID</span>
                    <span>Дата</span>
                    <span className="text-right">Действия</span>
                  </div>

                  {payments.map((payment) => {
                    const statusMeta = getPaymentStatusMeta(payment.status);
                    const commentText = paymentCommentText(payment.comment);
                    const paymentDate = payment.paid_at || payment.created_at;

                    return (
                      <div
                        key={payment.id}
                        className="grid gap-3 border-b border-border px-4 py-3 last:border-b-0 md:grid-cols-[minmax(0,1.1fr)_140px_170px_170px_220px] md:items-center"
                      >
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-medium">Оплата</p>
                            <StatusBadge label={statusMeta.label} color={statusMeta.color} />
                          </div>
                          <p className="mt-1 truncate text-xs text-muted-foreground">
                            {commentText ||
                              PAYMENT_METHOD_LABEL[payment.payment_method ?? "other"] ||
                              "Без комментария"}
                          </p>
                        </div>

                        <div className="text-sm font-medium">
                          {formatCurrency(payment.amount, payment.currency || project.currency || "USD")}
                        </div>

                        <div className="text-xs text-muted-foreground">
                          {transactionIdLabel(payment.id)}
                        </div>

                        <div className="text-xs text-muted-foreground">
                          {formatDateTime(paymentDate)}
                        </div>

                        <div className="flex flex-wrap items-center justify-start gap-2 md:justify-end">
                          {payment.receipt_url && (
                            <a
                              href={payment.receipt_url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                              Чек
                            </a>
                          )}
                          <PaymentFormDialog
                            clients={client ? [{ id: client.id, name: client.name }] : clients}
                            projects={[{ id: project.id, title: project.title }]}
                            payment={payment}
                            trigger={
                              <Button variant="outline" size="sm">
                                <Pencil className="mr-2 h-4 w-4" />
                                Изменить
                              </Button>
                            }
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>История оплат</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {payments.length === 0 ? (
                <p className="text-sm text-muted-foreground">Событий по оплатам пока нет.</p>
              ) : (
                payments.map((payment) => {
                  const commentText = paymentCommentText(payment.comment);
                  const paymentDate = payment.paid_at || payment.created_at;

                  return (
                    <div
                      key={`history-${payment.id}`}
                      className="flex flex-col gap-2 rounded-lg border border-border px-3 py-2 md:flex-row md:items-center md:justify-between"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium">
                          Оплата {formatCurrency(payment.amount, payment.currency || project.currency || "USD")}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {commentText || "Платёж добавлен в проект"}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                        <span>{transactionIdLabel(payment.id)}</span>
                        <span>{formatDateTime(paymentDate)}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="comments">
          <CommentThread comments={comments} add={addProjectComment.bind(null, project.id)} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
