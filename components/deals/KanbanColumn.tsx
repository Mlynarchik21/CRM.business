"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { DealCard, type DealCardItem } from "@/components/deals/DealCard";
import { cn, formatCurrency } from "@/lib/utils";
import type { DealStage } from "@/types";

export function KanbanColumn({
  stage,
  title,
  color,
  deals,
}: {
  stage: DealStage;
  title: string;
  color: string;
  deals: DealCardItem[];
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: stage,
    data: { type: "stage", stage },
  });

  const total = deals.reduce((sum, deal) => sum + Number(deal.amount ?? 0), 0);

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex min-h-[520px] min-w-[300px] flex-1 flex-col rounded-2xl border border-border bg-card",
        isOver && "border-primary/70 bg-[#17171B]",
      )}
    >
      <div className="border-b border-border p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: color }}
            />
            <p className="font-semibold">{title}</p>
          </div>
          <span className="rounded-full bg-[#1B1B1F] px-2.5 py-0.5 text-xs text-muted-foreground">
            {deals.length}
          </span>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Сумма: {formatCurrency(total)}
        </p>
      </div>

      <SortableContext
        items={deals.map((deal) => deal.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="flex flex-1 flex-col gap-3 p-3">
          {deals.length === 0 ? (
            <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-border text-sm text-muted-foreground">
              Перетащи сделку сюда
            </div>
          ) : (
            deals.map((deal) => <DealCard key={deal.id} deal={deal} />)
          )}
        </div>
      </SortableContext>
    </div>
  );
}
