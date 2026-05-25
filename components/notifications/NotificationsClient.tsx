"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  AlarmClock,
  Bell,
  CalendarClock,
  CreditCard,
  MessageSquare,
  Target,
  TriangleAlert,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn, formatDate } from "@/lib/utils";
import type { NotificationItem, NotificationType } from "@/lib/notifications";

const TYPE_META: Record<NotificationType, { label: string; icon: typeof Bell; color: string }> = {
  reminder: { label: "Напоминания", icon: AlarmClock, color: "#F59E0B" },
  client: { label: "От клиента", icon: MessageSquare, color: "#8B5CF6" },
  lead: { label: "Новая заявка", icon: Target, color: "#22C55E" },
  payment: { label: "Оплата", icon: CreditCard, color: "#22C55E" },
  payment_problem: { label: "Проблема оплаты", icon: TriangleAlert, color: "#EF4444" },
  deadline: { label: "Сроки по проекту", icon: CalendarClock, color: "#F97316" },
};

const FILTERS: { key: NotificationType | "all"; label: string }[] = [
  { key: "all", label: "Все" },
  { key: "reminder", label: "Напоминания" },
  { key: "client", label: "От клиента" },
  { key: "lead", label: "Новая заявка" },
  { key: "payment", label: "Оплата" },
  { key: "payment_problem", label: "Проблема оплаты" },
  { key: "deadline", label: "Сроки по проекту" },
];

function timeText(value: string) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return formatDate(value, true);
}

export function NotificationsClient({ items }: { items: NotificationItem[] }) {
  const [filter, setFilter] = useState<NotificationType | "all">("all");

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const it of items) c[it.type] = (c[it.type] ?? 0) + 1;
    return c;
  }, [items]);

  const filtered = filter === "all" ? items : items.filter((i) => i.type === filter);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Уведомления</h1>
        <p className="text-muted-foreground">
          Напоминания, сообщения клиентов, новые заявки, оплаты и сроки по проектам.
        </p>
      </div>

      {/* Фильтры */}
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const active = filter === f.key;
          const count = f.key === "all" ? items.length : counts[f.key] ?? 0;
          return (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={cn(
                "rounded-full border px-3 py-1 text-sm transition-colors",
                active
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:text-foreground",
              )}
            >
              {f.label}
              <span className="ml-1.5 opacity-70">{count}</span>
            </button>
          );
        })}
      </div>

      {/* Список */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-12 text-center text-muted-foreground">
            <Bell className="h-7 w-7 opacity-50" />
            <p className="text-sm">Уведомлений нет.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((n) => {
            const meta = TYPE_META[n.type];
            const Icon = meta.icon;
            return (
              <Link
                key={n.id}
                href={n.href}
                className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 transition-colors hover:bg-[#1B1B1F]"
              >
                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                  style={{ backgroundColor: `${meta.color}1A`, color: meta.color }}
                >
                  <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{n.title}</p>
                  <p className="truncate text-xs text-muted-foreground">{n.subtitle}</p>
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">{timeText(n.created_at)}</span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
