"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { LayoutDashboard } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

type DashboardDrawerContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
  toggle: () => void;
};

const DashboardDrawerContext = createContext<DashboardDrawerContextValue | null>(null);

export function useDashboardDrawer() {
  const ctx = useContext(DashboardDrawerContext);
  if (!ctx) {
    throw new Error("useDashboardDrawer must be used within DashboardDrawerProvider");
  }
  return ctx;
}

export function DashboardDrawerProvider({
  children,
  panel,
}: {
  children: ReactNode;
  panel: ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);

  const dashboardParam = searchParams.get("dashboard") === "1";

  useEffect(() => {
    if (dashboardParam) setOpen(true);
  }, [dashboardParam]);

  const syncUrl = useCallback(
    (nextOpen: boolean) => {
      const params = new URLSearchParams(searchParams.toString());
      if (nextOpen) params.set("dashboard", "1");
      else params.delete("dashboard");
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const setOpenWithUrl = useCallback(
    (next: boolean) => {
      setOpen(next);
      syncUrl(next);
    },
    [syncUrl],
  );

  const toggle = useCallback(() => {
    setOpenWithUrl(!open);
  }, [open, setOpenWithUrl]);

  return (
    <DashboardDrawerContext.Provider
      value={{ open, setOpen: setOpenWithUrl, toggle }}
    >
      {children}
      <Sheet open={open} onOpenChange={setOpenWithUrl}>
        <SheetContent
          side="left"
          className="w-full overflow-y-auto border-r border-border bg-background p-0 sm:max-w-xl md:max-w-2xl lg:max-w-3xl"
        >
          <SheetHeader className="border-b border-border px-6 py-4 text-left">
            <SheetTitle className="flex items-center gap-2">
              <LayoutDashboard className="h-5 w-5 text-primary" />
              Дашборд
            </SheetTitle>
            <SheetDescription>
              Сводка по лидам, проектам и задачам. Закройте панель, чтобы вернуться к работе.
            </SheetDescription>
          </SheetHeader>
          <div className="px-6 py-4">{panel}</div>
        </SheetContent>
      </Sheet>
    </DashboardDrawerContext.Provider>
  );
}
