"use client";

import { useState } from "react";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { TeamMemberFormDialog } from "@/components/team/TeamMemberFormDialog";
import { COLORS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { Profile, Role } from "@/types";

const ROLE_LABEL: Record<Role, string> = {
  admin: "Администратор",
  manager: "Менеджер",
  developer: "Разработчик",
  support: "Поддержка",
};

const GRID = "grid grid-cols-[minmax(0,1.6fr)_160px_minmax(0,1fr)_120px] items-center gap-4";

export function TeamTable({ profiles }: { profiles: Profile[] }) {
  const [editing, setEditing] = useState<Profile | null>(null);

  return (
    <>
      <div className="rounded-xl border border-border bg-card">
        <div className={cn(GRID, "border-b border-border px-4 py-3 text-sm text-muted-foreground")}>
          <div>Имя</div>
          <div>Роль</div>
          <div>Telegram</div>
          <div>Статус</div>
        </div>

        {profiles.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-muted-foreground">
            Участников пока нет. Добавь первого участника команды.
          </div>
        ) : (
          profiles.map((profile) => (
            <button
              key={profile.id}
              type="button"
              onClick={() => setEditing(profile)}
              className={cn(
                GRID,
                "w-full border-b border-border px-4 py-3 text-left transition-colors hover:bg-[#1B1B1F]",
              )}
            >
              <div className="truncate font-medium">{profile.full_name}</div>
              <div className="text-sm text-muted-foreground">{ROLE_LABEL[profile.role]}</div>
              <div className="truncate text-sm text-muted-foreground">
                {profile.telegram_username || "—"}
              </div>
              <div>
                <StatusBadge
                  label={profile.status === "active" ? "Активен" : "Неактивен"}
                  color={profile.status === "active" ? COLORS.accentGreen : COLORS.textMuted}
                />
              </div>
            </button>
          ))
        )}
      </div>

      <TeamMemberFormDialog
        profile={editing ?? undefined}
        open={editing !== null}
        onOpenChange={(next) => {
          if (!next) setEditing(null);
        }}
        hideTrigger
      />
    </>
  );
}
