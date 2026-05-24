import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { LEAD_STATUS } from "@/lib/constants";
import { formatDate } from "@/lib/utils";
import type { Lead } from "@/types";

type RecentLead = Pick<Lead, "id" | "name" | "status" | "created_at">;

export function RecentActivity({ leads }: { leads: RecentLead[] }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Последние лиды</CardTitle>
        <Link href="/leads" className="text-xs text-primary hover:underline">
          Все лиды
        </Link>
      </CardHeader>
      <CardContent className="space-y-1">
        {leads.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Пока нет лидов
          </p>
        ) : (
          leads.map((lead) => {
            const statusMeta = LEAD_STATUS[lead.status];
            return (
              <Link
                key={lead.id}
                href={`/leads/${lead.id}`}
                className="flex items-center justify-between rounded-lg px-2 py-2 transition-colors hover:bg-card"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{lead.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(lead.created_at)}
                  </p>
                </div>
                <StatusBadge label={statusMeta.label} color={statusMeta.color} />
              </Link>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
