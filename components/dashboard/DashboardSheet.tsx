"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import {
  BarChart3,
  FolderKanban,
  LayoutDashboard,
  LifeBuoy,
  ListChecks,
  Target,
  Users,
  Wallet,
} from "lucide-react";
import { getDashboardStats, type DashboardStats } from "@/app/(dashboard)/dashboard/actions";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { LEAD_STATUS } from "@/lib/constants";
import { formatCurrency, formatDate } from "@/lib/utils";

function StatRow({
  icon: Icon,
  label,
  value,
  sub,
  href,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: string;
  href?: string;
}) {
  const inner = (
    <div className="flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-[#1B1B1F]">
      <div className="flex items-center gap-2.5">
        <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
        <span className="text-sm text-foreground">{label}</span>
      </div>
      <div className="text-right">
        <span className="text-sm font-semibold text-foreground">{value}</span>
        {sub && <span className="ml-1.5 text-xs text-muted-foreground">{sub}</span>}
      </div>
    </div>
  );

  return href ? <Link href={href}>{inner}</Link> : inner;
}

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function DashboardSheet({ open, onOpenChange }: Props) {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, startLoad] = useTransition();

  useEffect(() => {
    if (!open) return;
    startLoad(async () => {
      const data = await getDashboardStats();
      setStats(data);
    });
  }, [open]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col overflow-hidden border-l border-border bg-background p-0 sm:max-w-xs"
      >
        <SheetHeader className="border-b border-border px-5 py-4 text-left">
          <SheetTitle className="flex items-center gap-2 text-base">
            <LayoutDashboard className="h-4 w-4 text-primary" />
            Дашборд
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-2 py-3">
          {loading || !stats ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Загрузка…</p>
          ) : (
            <div className="space-y-4">
              <div>
                <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  База
                </p>
                <StatRow
                  icon={Target}
                  label="Лидов"
                  value={stats.leadsTotal}
                  sub={stats.leadsNew > 0 ? `+${stats.leadsNew} за месяц` : undefined}
                  href="/leads"
                />
                <StatRow
                  icon={Users}
                  label="Клиентов"
                  value={stats.clientsTotal}
                  href="/clients"
                />
                <StatRow
                  icon={FolderKanban}
                  label="Активных проектов"
                  value={stats.projectsActive}
                  href="/projects"
                />
              </div>

              <div>
                <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Финансы
                </p>
                <StatRow
                  icon={Wallet}
                  label="Выручка"
                  value={formatCurrency(stats.revenue)}
                  href="/payments"
                />
                {stats.expectedPayments > 0 && (
                  <StatRow
                    icon={Wallet}
                    label="Ожидается"
                    value={formatCurrency(stats.expectedPayments)}
                    href="/payments"
                  />
                )}
              </div>

              <div>
                <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Оперативно
                </p>
                <StatRow
                  icon={ListChecks}
                  label="Задач на сегодня"
                  value={stats.tasksDueToday}
                  href="/tasks"
                />
                {stats.tasksOverdue > 0 && (
                  <StatRow
                    icon={ListChecks}
                    label="Просрочено"
                    value={stats.tasksOverdue}
                    href="/tasks"
                  />
                )}
                <StatRow
                  icon={LifeBuoy}
                  label="Открытых обращений"
                  value={stats.supportOpen}
                  href="/support"
                />
              </div>

              {stats.recentLeads.length > 0 && (
                <div>
                  <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                    Последние лиды
                  </p>
                  <div className="space-y-0.5">
                    {stats.recentLeads.map((lead) => {
                      const statusMeta = LEAD_STATUS[lead.status as keyof typeof LEAD_STATUS];
                      return (
                        <Link
                          key={lead.id}
                          href={`/leads/${lead.id}`}
                          className="flex items-center justify-between gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-[#1B1B1F]"
                        >
                          <span className="min-w-0 truncate text-sm">{lead.name}</span>
                          <div className="flex shrink-0 items-center gap-2">
                            {statusMeta && (
                              <span
                                className="h-1.5 w-1.5 rounded-full"
                                style={{ backgroundColor: statusMeta.color }}
                              />
                            )}
                            <span className="text-xs text-muted-foreground">
                              {formatDate(lead.created_at)}
                            </span>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="border-t border-border px-5 py-3">
          <Button variant="outline" className="w-full" asChild>
            <Link href="/analytics">
              <BarChart3 className="mr-2 h-4 w-4" />
              Аналитика
            </Link>
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export function DashboardSheetTrigger() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="shrink-0 text-muted-foreground hover:text-foreground"
        onClick={() => setOpen(true)}
        title="Дашборд"
        aria-label="Открыть дашборд"
      >
        <LayoutDashboard className="h-5 w-5" />
      </Button>
      <DashboardSheet open={open} onOpenChange={setOpen} />
    </>
  );
}
