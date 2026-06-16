"use client";

import Link from "next/link";
import { Bell, LogOut, PanelLeft, PanelLeftClose } from "lucide-react";
import { useSidebarCollapse } from "@/components/layout/SidebarCollapse";
import { GlobalSearch } from "@/components/layout/GlobalSearch";
import { DashboardSheetTrigger } from "@/components/dashboard/DashboardSheet";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { logout } from "@/app/(dashboard)/actions";
import type { Role } from "@/types";

const ROLE_LABEL: Record<Role, string> = {
  admin: "Администратор",
  manager: "Менеджер",
  developer: "Разработчик",
  support: "Поддержка",
};

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function Topbar({
  name,
  role,
  email,
  notifCount = 0,
}: {
  name: string;
  role: Role;
  email: string;
  notifCount?: number;
}) {
  const { collapsed, toggle } = useSidebarCollapse();

  return (
    <header className="flex h-16 shrink-0 items-center justify-between gap-4 border-b border-border bg-background px-6">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="shrink-0 text-muted-foreground hover:text-foreground"
          onClick={toggle}
          title={collapsed ? "Показать меню" : "Скрыть меню"}
          aria-label={collapsed ? "Показать меню" : "Скрыть меню"}
        >
          {collapsed ? (
            <PanelLeft className="h-5 w-5" />
          ) : (
            <PanelLeftClose className="h-5 w-5" />
          )}
        </Button>
        <DashboardSheetTrigger />
        <GlobalSearch />
      </div>

      <div className="flex items-center gap-2">
        <Link
          href="/notifications"
          className="relative flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-card hover:text-foreground"
          title="Уведомления"
          aria-label="Уведомления"
        >
          <Bell className="h-5 w-5" />
          {notifCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-white">
              {notifCount > 99 ? "99+" : notifCount}
            </span>
          )}
        </Link>

        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-3 rounded-lg px-2 py-1.5 outline-none transition-colors hover:bg-card">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-primary/15 text-xs text-primary">
                {initials(name)}
              </AvatarFallback>
            </Avatar>
            <div className="hidden text-left sm:block">
              <p className="text-sm font-medium leading-none">{name}</p>
              <p className="text-xs text-muted-foreground">{ROLE_LABEL[role]}</p>
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <p className="font-medium">{name}</p>
              <p className="text-xs font-normal text-muted-foreground">{email}</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <form action={logout}>
              <button type="submit" className="w-full">
                <DropdownMenuItem className="cursor-pointer text-destructive focus:text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  Выйти
                </DropdownMenuItem>
              </button>
            </form>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
