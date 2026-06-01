import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { ContactValue } from "@/components/shared/ContactValue";
import { ProfileField } from "@/components/shared/ProfileField";
import { Button } from "@/components/ui/button";
import { LEAD_SOURCE_LABEL } from "@/lib/constants";
import { formatCurrency } from "@/lib/utils";
import type { Client, Lead } from "@/types";

function budgetText(min: number | null, max: number | null) {
  if (min == null && max == null) return "—";
  if (min != null && max != null) return `${formatCurrency(min)} – ${formatCurrency(max)}`;
  return formatCurrency((min ?? max)!);
}

export function LeadContactPeek({
  lead,
  detailHref,
}: {
  lead: Pick<
    Lead,
    | "id"
    | "name"
    | "telegram_username"
    | "phone"
    | "extra_phone"
    | "email"
    | "decision_maker"
    | "service_interest"
    | "budget_min"
    | "budget_max"
    | "source"
    | "notes"
  >;
  detailHref: string;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 border-t border-border bg-[#141416]/80 px-4 py-3">
      <div className="grid min-w-[240px] flex-1 gap-0.5 sm:grid-cols-2">
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
        <ProfileField label="Источник" value={LEAD_SOURCE_LABEL[lead.source]} />
        <ProfileField label="Запрос" value={lead.service_interest} />
        <ProfileField
          label="Бюджет"
          value={budgetText(lead.budget_min, lead.budget_max)}
        />
      </div>
      <div className="flex shrink-0 flex-col items-end gap-2">
        {lead.notes && (
          <p className="max-w-md text-right text-xs text-muted-foreground line-clamp-2">
            {lead.notes}
          </p>
        )}
        <Button variant="outline" size="sm" asChild>
          <Link href={detailHref}>
            <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
            Полная карточка
          </Link>
        </Button>
      </div>
    </div>
  );
}

export function ClientContactPeek({
  client,
  detailHref,
}: {
  client: Pick<
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
  >;
  detailHref: string;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 border-t border-border bg-[#141416]/80 px-4 py-3">
      <div className="grid min-w-[240px] flex-1 gap-0.5 sm:grid-cols-2">
        <ProfileField label="Компания" value={client.company_name} />
        <ProfileField
          label="Telegram"
          value={<ContactValue type="telegram" value={client.telegram_username} />}
        />
        <ProfileField label="Телефон" value={<ContactValue type="phone" value={client.phone} />} />
        {client.extra_phone && (
          <ProfileField
            label="2-й тел."
            value={<ContactValue type="phone" value={client.extra_phone} />}
          />
        )}
        <ProfileField label="Email" value={<ContactValue type="email" value={client.email} />} />
        {client.decision_maker && <ProfileField label="ЛПР" value={client.decision_maker} />}
      </div>
      <div className="flex shrink-0 flex-col items-end gap-2">
        {client.notes && (
          <p className="max-w-md text-right text-xs text-muted-foreground line-clamp-2">
            {client.notes}
          </p>
        )}
        <Button variant="outline" size="sm" asChild>
          <Link href={detailHref}>
            <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
            Полная карточка
          </Link>
        </Button>
      </div>
    </div>
  );
}
