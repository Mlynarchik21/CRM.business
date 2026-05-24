"use client";

import Link from "next/link";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DEAL_STAGE } from "@/lib/constants";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Deal, DealStage } from "@/types";

export type DealCardItem = Deal & {
  lead_name?: string | null;
  client_name?: string | null;
};

export function DealCard({ deal }: { deal: DealCardItem }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: deal.id,
    data: {
      type: "deal",
      stage: deal.stage,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <Card className={isDragging ? "opacity-70 ring-1 ring-primary" : ""}>
        <CardContent className="space-y-4 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold">{deal.title}</p>
                <StatusBadge
                  label={DEAL_STAGE[deal.stage as DealStage].label}
                  color={DEAL_STAGE[deal.stage as DealStage].color}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Создана {formatDate(deal.created_at, true)}
              </p>
            </div>

            <button
              type="button"
              className="cursor-grab rounded-md p-1 text-muted-foreground hover:bg-[#1B1B1F] hover:text-foreground"
              {...attributes}
              {...listeners}
            >
              <GripVertical className="h-4 w-4" />
            </button>
          </div>

          <div className="grid gap-2 text-sm">
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Что продаём</span>
              <span className="text-right font-medium">{deal.service_type || "—"}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Сумма</span>
              <span className="text-right font-medium">{formatCurrency(deal.amount)}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Лид</span>
              <span className="text-right font-medium">{deal.lead_name || "—"}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Клиент</span>
              <span className="text-right font-medium">{deal.client_name || "—"}</span>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-muted-foreground">
              {deal.expected_payment_at
                ? `Оплата: ${formatDate(deal.expected_payment_at, true)}`
                : "Дата оплаты не задана"}
            </span>
            <Button asChild size="sm" variant="outline">
              <Link href={`/deals/${deal.id}`}>Открыть</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
