"use client";

import { useState } from "react";
import {
  AnalyticsCharts,
  type CategoryDatum,
  type RevenueDatum,
  type StageDatum,
} from "@/components/analytics/AnalyticsCharts";
import { Card, CardContent } from "@/components/ui/card";
import { cn, formatCurrency, formatNumber } from "@/lib/utils";

export type TrafficRow = {
  source: string;
  label: string;
  leads: number;
  clients: number;
  conversion: number;
  spend: number;
  costPerLead: number;
};

export type AnalyticsData = {
  finance: {
    totalLeads: number;
    conversion: number;
    convertedFromLead: number;
    totalRevenue: number;
    totalExpenses: number;
    profit: number;
    avgCheck: number;
    wonDeals: number;
    leadsBySource: CategoryDatum[];
    clientsByStatus: CategoryDatum[];
    dealsByStage: StageDatum[];
    revenueByMonth: RevenueDatum[];
  };
  traffic: {
    totalLeads: number;
    totalSpend: number;
    avgCostPerLead: number;
    rows: TrafficRow[];
  };
};

function Metric({ label, value, hint, tone }: { label: string; value: string; hint?: string; tone?: "primary" | "danger" }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p
        className={cn(
          "mt-2 text-2xl font-semibold",
          tone === "primary" && "text-primary",
          tone === "danger" && "text-destructive",
        )}
      >
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function AnalyticsView({ data }: { data: AnalyticsData }) {
  const [tab, setTab] = useState<"finance" | "traffic">("finance");
  const { finance, traffic } = data;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Аналитика</h1>
          <p className="text-muted-foreground">
            Финансы и сделки или трафик по источникам — переключай вкладки.
          </p>
        </div>
        <div className="inline-flex rounded-lg border border-border bg-card p-1">
          <button
            type="button"
            onClick={() => setTab("finance")}
            className={cn(
              "rounded-md px-4 py-1.5 text-sm font-medium transition-colors",
              tab === "finance" ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground",
            )}
          >
            Финансы / сделки
          </button>
          <button
            type="button"
            onClick={() => setTab("traffic")}
            className={cn(
              "rounded-md px-4 py-1.5 text-sm font-medium transition-colors",
              tab === "traffic" ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground",
            )}
          >
            Трафик
          </button>
        </div>
      </div>

      {tab === "finance" ? (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <Metric label="Выручка" value={formatCurrency(finance.totalRevenue)} tone="primary" />
            <Metric label="Расход" value={formatCurrency(finance.totalExpenses)} tone="danger" />
            <Metric
              label="Прибыль"
              value={formatCurrency(finance.profit)}
              tone={finance.profit >= 0 ? "primary" : "danger"}
            />
            <Metric label="Средний чек" value={formatCurrency(finance.avgCheck)} />
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <Metric label="Всего лидов" value={formatNumber(finance.totalLeads)} />
            <Metric
              label="Конверсия в клиента"
              value={`${finance.conversion}%`}
              hint={`${formatNumber(finance.convertedFromLead)} из ${formatNumber(finance.totalLeads)}`}
              tone="primary"
            />
            <Metric label="Выигранных сделок" value={formatNumber(finance.wonDeals)} />
          </div>

          <AnalyticsCharts
            leadsBySource={finance.leadsBySource}
            clientsByStatus={finance.clientsByStatus}
            dealsByStage={finance.dealsByStage}
            revenueByMonth={finance.revenueByMonth}
          />
        </>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <Metric label="Лидов всего" value={formatNumber(traffic.totalLeads)} />
            <Metric label="Расход на трафик" value={formatCurrency(traffic.totalSpend)} tone="danger" />
            <Metric label="Средняя цена лида" value={formatCurrency(traffic.avgCostPerLead)} />
          </div>

          <Card>
            <CardContent className="p-0">
              <div className="grid grid-cols-[minmax(0,1.4fr)_90px_90px_110px_120px_120px] gap-4 border-b border-border px-4 py-3 text-sm text-muted-foreground">
                <div>Источник</div>
                <div>Лиды</div>
                <div>Клиенты</div>
                <div>Конверсия</div>
                <div>Расход</div>
                <div>Цена лида</div>
              </div>
              {traffic.rows.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                  Пока нет данных по трафику.
                </div>
              ) : (
                traffic.rows.map((r) => (
                  <div
                    key={r.source}
                    className="grid grid-cols-[minmax(0,1.4fr)_90px_90px_110px_120px_120px] items-center gap-4 border-b border-border px-4 py-3 last:border-b-0"
                  >
                    <div className="truncate font-medium">{r.label}</div>
                    <div className="text-sm text-muted-foreground">{formatNumber(r.leads)}</div>
                    <div className="text-sm text-muted-foreground">{formatNumber(r.clients)}</div>
                    <div className="text-sm font-medium text-primary">{r.conversion}%</div>
                    <div className="text-sm text-muted-foreground">{formatCurrency(r.spend)}</div>
                    <div className="text-sm text-muted-foreground">
                      {r.leads > 0 ? formatCurrency(r.costPerLead) : "—"}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
          <p className="text-xs text-muted-foreground">
            Расход берётся из раздела «Расходы» по полю «Источник трафика». Указывай источник у
            расходов, чтобы видеть цену лида и ROI по каналам.
          </p>
        </>
      )}
    </div>
  );
}
