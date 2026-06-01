"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useDashboardDrawer } from "@/components/layout/DashboardDrawer";
import {
  LayoutDashboard,
  Target,
  Users,
  Handshake,
  FolderKanban,
  ListChecks,
  Wallet,
  LifeBuoy,
  BarChart3,
  UsersRound,
  Bot,
  Megaphone,
  Bell,
  Settings,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { NAV_ITEMS } from "@/lib/constants";

const ICONS: Record<string, LucideIcon> = {
  LayoutDashboard,
  Target,
  Users,
  Handshake,
  FolderKanban,
  ListChecks,
  Wallet,
  LifeBuoy,
  BarChart3,
  UsersRound,
  Bot,
  Megaphone,
  Bell,
  Settings,
};

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { open: dashboardOpen, setOpen: setDashboardOpen } = useDashboardDrawer();

  return (
    <aside className="flex h-screen w-60 shrink-0 flex-col border-r border-border bg-[#0B0B0D]">
      <div className="flex h-16 items-center gap-2 px-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 text-primary">
          <LayoutDashboard className="h-4 w-4" />
        </div>
        <span className="text-lg font-semibold">
          Studio <span className="text-primary">CRM</span>
        </span>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
        {NAV_ITEMS.map((item) => {
          const Icon = ICONS[item.icon] ?? LayoutDashboard;
          const isDashboard = item.href === "/";
          const isActive = isDashboard
            ? dashboardOpen || pathname === "/"
            : pathname.startsWith(item.href);

          if (isDashboard) {
            return (
              <button
                key={item.href}
                type="button"
                onClick={() => {
                  if (pathname !== "/") router.push("/");
                  setDashboardOpen(true);
                }}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-card hover:text-foreground",
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {item.label}
              </button>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-card hover:text-foreground",
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
