import { Suspense } from "react";
import { DashboardPanel } from "@/components/dashboard/DashboardPanel";

export default function HomePage() {
  return (
    <Suspense
      fallback={<p className="py-8 text-sm text-muted-foreground">Загрузка дашборда…</p>}
    >
      <DashboardPanel />
    </Suspense>
  );
}
