"use client";

import { LayoutDashboard } from "lucide-react";
import { useDashboardDrawer } from "@/components/layout/DashboardDrawer";
import { Button } from "@/components/ui/button";

export function OpenDashboardButton() {
  const { setOpen } = useDashboardDrawer();

  return (
    <Button variant="outline" onClick={() => setOpen(true)}>
      <LayoutDashboard className="mr-2 h-4 w-4" />
      Открыть дашборд
    </Button>
  );
}
