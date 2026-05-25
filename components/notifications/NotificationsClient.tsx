"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlarmClock,
  Bell,
  CalendarClock,
  CheckCheck,
  ChevronDown,
  CreditCard,
  MessageSquare,
  Target,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import { toast } from "sonner";
import {
  dismissNotifications,
  setNotificationsRead,
} from "@/app/(dashboard)/notifications/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn, formatDate } from "@/lib/utils";
import type { NotificationItem, NotificationType } from "@/lib/notifications";

export type NotificationRow = NotificationItem & { read: boolean };

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

export function NotificationsClient({ items }: { items: NotificationRow[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [filter, setFilter] = useState<NotificationType | "all">("all");
  const [open, setOpen] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const it of items) c[it.type] = (c[it.type] ?? 0) + 1;
    return c;
  }, [items]);

  const unreadCount = items.filter((i) => !i.read).length;
  const filtered = filter === "all" ? items : items.filter((i) => i.type === filter);

  function run(fn: () => Promise<{ ok: boolean; error?: string }>, okMsg?: string) {
    startTransition(async () => {
      const r = await fn();
      if (!r.ok) {
        toast.error(r.error ?? "Ошибка");
        return;
      }
      if (okMsg) toast.success(okMsg);
      router.refresh();
    });
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function onExpand(row: NotificationRow) {
    const next = open === row.id ? null : row.id;
    setOpen(next);
    if (next && !row.read) {
      run(() => setNotificationsRead([row.id], true));
    }
  }

  function markAllRead() {
    const ids = items.filter((i) => !i.read).map((i) => i.id);
    if (ids.length === 0) return;
    run(() => setNotificationsRead(ids, true), "Все отмечены прочитанными");
  }

  function deleteSelected() {
    const ids = Array.from(selected);
    if (ids.length === 0) {
      toast.error("Ничего не отмечено");
      return;
    }
    run(() => dismissNotifications(ids), "Отмеченные удалены");
    setSelected(new Set());
  }

  function deleteAll() {
    const ids = items.map((i) => i.id);
    if (ids.length === 0) return;
    run(() => dismissNotifications(ids), "Все уведомления удалены");
    setSelected(new Set());
  }

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Уведомления
            {unreadCount > 0 && (
              <span className="ml-2 rounded-full bg-destructive px-2 py-0.5 align-middle text-xs font-semibold text-white">
                {unreadCount}
              </span>
            )}
          </h1>
          <p className="text-muted-foreground">
            Напоминания, сообщения клиентов, заявки, оплаты и сроки. Клик — раскрыть.
          </p>
        </div>

        {/* Фильтр-список + действия */}
        <div className="flex flex-wrap items-center gap-2">
          <Select value={filter} onValueChange={(v) => setFilter(v as NotificationType | "all")}>
            <SelectTrigger className="w-52 bg-card">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FILTERS.map((f) => {
                const count = f.key === "all" ? items.length : counts[f.key] ?? 0;
                return (
                  <SelectItem key={f.key} value={f.key}>
                    {f.label} · {count}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={markAllRead} disabled={pending || unreadCount === 0}>
            <CheckCheck className="mr-1 h-4 w-4" />
            Прочитать все
          </Button>
          <Button variant="outline" size="sm" onClick={deleteSelected} disabled={pending || selected.size === 0}>
            <Trash2 className="mr-1 h-4 w-4" />
            Удалить отмеченные
          </Button>
          <Button variant="outline" size="sm" onClick={deleteAll} disabled={pending || items.length === 0}>
            Удалить все
          </Button>
        </div>
      </div>

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
            const isOpen = open === n.id;
            const isSelected = selected.has(n.id);
            return (
              <div
                key={n.id}
                className={cn(
                  "rounded-xl border bg-card",
                  n.read ? "border-border" : "border-primary/40",
                )}
              >
                <div className="flex items-center gap-3 p-3">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleSelect(n.id)}
                    className="h-4 w-4 shrink-0 accent-[#22C55E]"
                    aria-label="Отметить"
                  />
                  {!n.read && <span className="h-2 w-2 shrink-0 rounded-full bg-primary" title="Непрочитано" />}
                  <button
                    type="button"
                    onClick={() => onExpand(n)}
                    className="flex min-w-0 flex-1 items-center gap-3 text-left"
                  >
                    <span
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                      style={{ backgroundColor: `${meta.color}1A`, color: meta.color }}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className={cn("block truncate text-sm", n.read ? "font-medium" : "font-semibold")}>
                        {n.title}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">{n.subtitle}</span>
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground">{timeText(n.created_at)}</span>
                    <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", isOpen && "rotate-180")} />
                  </button>
                </div>

                {isOpen && (
                  <div className="space-y-2 border-t border-border px-3 py-3 pl-14 text-sm">
                    <p className="flex justify-between gap-3">
                      <span className="text-muted-foreground">Тип</span>
                      <span className="font-medium" style={{ color: meta.color }}>{meta.label}</span>
                    </p>
                    <p className="flex justify-between gap-3">
                      <span className="text-muted-foreground">Когда</span>
                      <span className="font-medium">{timeText(n.created_at)}</span>
                    </p>
                    <div>
                      <p className="text-muted-foreground">Описание</p>
                      <p className="mt-1 whitespace-pre-wrap">{n.subtitle || "Подробностей нет."}</p>
                    </div>
                    <div className="flex flex-wrap gap-2 pt-1">
                      <Button asChild size="sm" variant="outline">
                        <Link href={n.href}>Открыть</Link>
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => run(() => setNotificationsRead([n.id], false))}>
                        Отметить непрочитанным
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => run(() => dismissNotifications([n.id]), "Удалено")}>
                        <Trash2 className="mr-1 h-3.5 w-3.5" />
                        Удалить
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
