"use client";

import { LogOut } from "lucide-react";
import { GlobalSearch } from "@/components/layout/GlobalSearch";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
}: {
  name: string;
  role: Role;
  email: string;
}) {
  return (
    <header className="flex h-16 shrink-0 items-center justify-between gap-4 border-b border-border bg-background px-6">
      <GlobalSearch />

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
    </header>
  );
}
