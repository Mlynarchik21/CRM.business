"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { updateProjectStatus } from "@/app/(dashboard)/projects/actions";
import { Button } from "@/components/ui/button";
import {
  getPrimaryProjectStatus,
  PRIMARY_PROJECT_STATUSES,
  PROJECT_STATUS,
} from "@/lib/constants";
import type { ProjectStatus } from "@/types";

export function ProjectStatusSwitcher({
  projectId,
  status,
}: {
  projectId: string;
  status: ProjectStatus;
}) {
  const [isPending, startTransition] = useTransition();
  const activeStatus = getPrimaryProjectStatus(status);

  function onChange(nextStatus: (typeof PRIMARY_PROJECT_STATUSES)[number]) {
    if (nextStatus === activeStatus) return;

    startTransition(async () => {
      const result = await updateProjectStatus(projectId, nextStatus);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`Статус обновлён: ${PROJECT_STATUS[nextStatus].label}`);
    });
  }

  return (
    <div className="space-y-2">
      <p className="text-sm text-muted-foreground">Статус проекта</p>
      <div className="flex flex-wrap gap-2">
        {PRIMARY_PROJECT_STATUSES.map((item) => {
          const isActive = item === activeStatus;
          return (
            <Button
              key={item}
              type="button"
              size="sm"
              variant={isActive ? "default" : "outline"}
              disabled={isPending}
              onClick={() => onChange(item)}
            >
              {PROJECT_STATUS[item].label}
            </Button>
          );
        })}
      </div>
      <div className="min-h-5">
        {isPending && (
          <p className="text-xs text-muted-foreground">Сохраняю новый статус...</p>
        )}
      </div>
    </div>
  );
}
