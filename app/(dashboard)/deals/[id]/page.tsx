import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FolderKanban, Pencil } from "lucide-react";
import {
  addDealComment,
  convertDealToProject,
} from "@/app/(dashboard)/deals/actions";
import { DealFormDialog } from "@/components/deals/DealFormDialog";
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
import { DEAL_STAGE } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Client, Deal, Lead, Project } from "@/types";
import { ConvertDealToProjectButton } from "@/components/deals/ConvertDealToProjectButton";

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

export default async function DealDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();

  const [dealRes, leadsRes, clientsRes, commentsRes, projectRes] = await Promise.all([
    supabase
      .from("deals")
      .select("*")
      .eq("id", params.id)
      .maybeSingle<Deal>(),
    supabase
      .from("leads")
      .select("id, name, status")
      .order("created_at", { ascending: false })
      .returns<Pick<Lead, "id" | "name" | "status">[]>(),
    supabase
      .from("clients")
      .select("id, name")
      .order("name", { ascending: true })
      .returns<Pick<Client, "id" | "name">[]>(),
    supabase
      .from("comments")
      .select("id, content, type, created_at, author:profiles(full_name)")
      .eq("entity_type", "deal")
      .eq("entity_id", params.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("projects")
      .select("id, title")
      .eq("deal_id", params.id)
      .maybeSingle<Pick<Project, "id" | "title">>(),
  ]);

  const deal = dealRes.data;
  if (!deal) notFound();

  const comments: ThreadComment[] = (commentsRes.data ?? []).map((comment) => ({
    id: comment.id as string,
    content: comment.content as string,
    type: comment.type as string,
    created_at: comment.created_at as string,
    author: Array.isArray(comment.author)
      ? (comment.author[0] ?? null)
      : ((comment.author as { full_name: string } | null) ?? null),
  }));

  const lead = (leadsRes.data ?? []).find((item) => item.id === deal.lead_id) ?? null;
  const client = (clientsRes.data ?? []).find((item) => item.id === deal.client_id) ?? null;
  const stageMeta = DEAL_STAGE[deal.stage];
  const linkedProject = projectRes.data ?? null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/deals">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold tracking-tight">{deal.title}</h1>
              <StatusBadge label={stageMeta.label} color={stageMeta.color} />
            </div>
            <p className="text-sm text-muted-foreground">
              Сделка создана {formatDate(deal.created_at, true)}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {linkedProject ? (
            <Button asChild variant="outline">
              <Link href={`/projects/${linkedProject.id}`}>
                <FolderKanban className="mr-2 h-4 w-4" />
                Открыть проект
              </Link>
            </Button>
          ) : (
            <ConvertDealToProjectButton
              dealId={deal.id}
              convert={convertDealToProject}
            />
          )}

          <DealFormDialog
            leads={leadsRes.data ?? []}
            clients={clientsRes.data ?? []}
            deal={deal}
            trigger={
              <Button variant="outline">
                <Pencil className="mr-2 h-4 w-4" />
                Редактировать
              </Button>
            }
          />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Параметры сделки</CardTitle>
          </CardHeader>
          <CardContent className="divide-y divide-border">
            <InfoRow label="Лид" value={lead?.name} />
            <InfoRow label="Клиент" value={client?.name} />
            <InfoRow label="Что продаём" value={deal.service_type} />
            <InfoRow label="Сумма" value={formatCurrency(deal.amount)} />
            <InfoRow
              label="Вероятность"
              value={deal.probability ? `${deal.probability}%` : "—"}
            />
            <InfoRow
              label="Ожидаемая оплата"
              value={
                deal.expected_payment_at
                  ? formatDate(deal.expected_payment_at, true)
                  : "—"
              }
            />
            <InfoRow label="Статус сделки" value={deal.status} />
          </CardContent>
        </Card>

        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Подробная информация</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="mb-2 text-sm text-muted-foreground">Текущая стадия</p>
                <p className="text-sm">{stageMeta.label}</p>
              </div>

              <div>
                <p className="mb-2 text-sm text-muted-foreground">
                  Комментарий по стадии / причина потери
                </p>
                <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                  {deal.lost_reason || "Пока не заполнено."}
                </p>
              </div>

              {linkedProject && (
                <div className="rounded-xl border border-border p-4">
                  <p className="text-sm text-muted-foreground">Связанный проект</p>
                  <Link
                    href={`/projects/${linkedProject.id}`}
                    className="mt-1 inline-flex text-sm font-medium text-primary hover:underline"
                  >
                    {linkedProject.title}
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          <CommentThread comments={comments} add={addDealComment.bind(null, deal.id)} />
        </div>
      </div>
    </div>
  );
}
