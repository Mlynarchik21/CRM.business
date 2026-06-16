"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
import { useSidebarCollapse } from "@/components/layout/SidebarCollapse";
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
  const { collapsed } = useSidebarCollapse();

  return (
    <aside
      className={cn(
        "flex h-screen shrink-0 flex-col border-r border-border bg-[#0B0B0D] transition-[width] duration-200 ease-in-out",
        collapsed ? "w-0 overflow-hidden border-r-0" : "w-60",
      )}
      aria-hidden={collapsed}
    >
      <div className="flex h-16 min-w-[15rem] items-center gap-2 px-6">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
          <LayoutDashboard className="h-4 w-4" />
        </div>
        <span className="whitespace-nowrap text-lg font-semibold">
          Studio <span className="text-primary">CRM</span>
        </span>
      </div>

      <nav className="min-w-[15rem] flex-1 space-y-1 overflow-y-auto px-3 py-2">
        {NAV_ITEMS.map((item) => {
          const Icon = ICONS[item.icon] ?? LayoutDashboard;
          const isActive =
            item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

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
