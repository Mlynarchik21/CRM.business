"use client";

import { useMemo, useState, useTransition } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { toast } from "sonner";
import { moveDealStage } from "@/app/(dashboard)/deals/actions";
import { DealCard, type DealCardItem } from "@/components/deals/DealCard";
import { KanbanColumn } from "@/components/deals/KanbanColumn";
import { DEAL_STAGE } from "@/lib/constants";
import type { DealStage } from "@/types";

const BOARD_STAGES: DealStage[] = [
  "new_lead",
  "qualification",
  "discussion",
  "proposal",
  "negotiation",
  "waiting_payment",
  "paid",
  "lost",
  "postponed",
];

function groupDeals(deals: DealCardItem[]) {
  return BOARD_STAGES.reduce<Record<DealStage, DealCardItem[]>>((acc, stage) => {
    acc[stage] = deals.filter((deal) => deal.stage === stage);
    return acc;
  }, {} as Record<DealStage, DealCardItem[]>);
}

export function KanbanBoard({ deals }: { deals: DealCardItem[] }) {
  const [items, setItems] = useState(deals);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
  );

  const grouped = useMemo(() => groupDeals(items), [items]);
  const activeDeal = items.find((deal) => deal.id === activeId) ?? null;

  function resolveStage(overId: string | null | undefined) {
    if (!overId) return null;

    if (BOARD_STAGES.includes(overId as DealStage)) {
      return overId as DealStage;
    }

    const deal = items.find((item) => item.id === overId);
    return deal?.stage ?? null;
  }

  function onDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
  }

  function onDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const dealId = String(event.active.id);
    const nextStage = resolveStage(event.over ? String(event.over.id) : null);
    const currentDeal = items.find((item) => item.id === dealId);

    if (!currentDeal || !nextStage || currentDeal.stage === nextStage) {
      return;
    }

    setItems((prev) =>
      prev.map((item) =>
        item.id === dealId
          ? {
              ...item,
              stage: nextStage,
              status:
                nextStage === "paid"
                  ? "won"
                  : nextStage === "lost"
                    ? "lost"
                    : nextStage === "postponed"
                      ? "postponed"
                      : "open",
            }
          : item,
      ),
    );

    startTransition(async () => {
      const result = await moveDealStage(dealId, nextStage);
      if (!result.ok) {
        toast.error(result.error);
        setItems(deals);
        return;
      }

      toast.success(`Сделка перенесена: ${DEAL_STAGE[nextStage].label}`);
    });
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      <div className="space-y-4">
        {isPending && (
          <p className="text-sm text-muted-foreground">Сохраняю новую стадию...</p>
        )}

        <div className="flex gap-4 overflow-x-auto pb-2">
          {BOARD_STAGES.map((stage) => (
            <KanbanColumn
              key={stage}
              stage={stage}
              title={DEAL_STAGE[stage].label}
              color={DEAL_STAGE[stage].color}
              deals={grouped[stage]}
            />
          ))}
        </div>
      </div>

      <DragOverlay>
        {activeDeal ? <DealCard deal={activeDeal} /> : null}
      </DragOverlay>
    </DndContext>
  );
}
