import { Suspense } from "react";
import { DashboardPanel } from "@/components/dashboard/DashboardPanel";
import { DashboardDrawerProvider } from "@/components/layout/DashboardDrawer";

export function DashboardDrawerSlot({ children }: { children: React.ReactNode }) {
  return (
    <DashboardDrawerProvider
      panel={
        <Suspense
          fallback={
            <p className="py-8 text-sm text-muted-foreground">Загрузка дашборда…</p>
          }
        >
          <DashboardPanel />
        </Suspense>
      }
    >
      {children}
    </DashboardDrawerProvider>
  );
}
