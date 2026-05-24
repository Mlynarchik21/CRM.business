"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LEAD_SOURCE_LABEL, LEAD_STATUS } from "@/lib/constants";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { LeadSource, LeadStatus } from "@/types";

type LeadInfo = {
  name: string;
  source: LeadSource;
  status: LeadStatus;
  service_interest: string | null;
  budget_min: number | null;
  budget_max: number | null;
  notes: string | null;
  created_at: string;
};

function budgetText(lead: LeadInfo) {
  if (lead.budget_min == null && lead.budget_max == null) return "—";
  if (lead.budget_min != null && lead.budget_max != null) {
    return `${formatCurrency(lead.budget_min)} – ${formatCurrency(lead.budget_max)}`;
  }
  return formatCurrency((lead.budget_min ?? lead.budget_max)!);
}

export function ClientLeadInfoPanel({
  lead,
}: {
  lead: LeadInfo | null;
}) {
  const [open, setOpen] = useState(false);

  if (!lead) {
    return (
      <Card>
        <CardContent className="p-4 text-sm text-muted-foreground">
          У этого клиента нет связанного исходного лида.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <Button variant="outline" onClick={() => setOpen((v) => !v)}>
        {open ? <ChevronUp className="mr-2 h-4 w-4" /> : <ChevronDown className="mr-2 h-4 w-4" />}
        Информация о лиде
      </Button>

      {open && (
        <Card>
          <CardContent className="grid gap-3 p-4 md:grid-cols-2">
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                Откуда пришёл
              </p>
              <p className="mt-2 text-sm font-medium">{LEAD_SOURCE_LABEL[lead.source]}</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                Статус лида
              </p>
              <p className="mt-2 text-sm font-medium">{LEAD_STATUS[lead.status].label}</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                Что искал
              </p>
              <p className="mt-2 text-sm font-medium">{lead.service_interest || "—"}</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                Бюджет
              </p>
              <p className="mt-2 text-sm font-medium">{budgetText(lead)}</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4 md:col-span-2">
              <p className="text-xs uppercase tracking-[0.18em] text-primary">Описание лида</p>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
                {lead.notes || "Описание исходного лида не заполнено."}
              </p>
              <p className="mt-3 text-xs text-muted-foreground">
                Лид создан: {formatDate(lead.created_at, true)}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
