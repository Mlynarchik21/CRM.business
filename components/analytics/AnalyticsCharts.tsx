"use client";

import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCurrency } from "@/lib/utils";

export type CategoryDatum = { label: string; count: number; color: string };
export type StageDatum = { label: string; count: number; amount: number; color: string };
export type RevenueDatum = { month: string; revenue: number };

const tooltipStyle = {
  background: "#1B1B1F",
  border: "1px solid #2A2A2E",
  borderRadius: 8,
  fontSize: 12,
} as const;

function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex h-[260px] items-center justify-center text-sm text-muted-foreground">
      {text}
    </div>
  );
}

export function AnalyticsCharts({
  leadsBySource,
  clientsByStatus,
  dealsByStage,
  revenueByMonth,
}: {
  leadsBySource: CategoryDatum[];
  clientsByStatus: CategoryDatum[];
  dealsByStage: StageDatum[];
  revenueByMonth: RevenueDatum[];
}) {
  const [period, setPeriod] = useState<"6" | "12" | "all">("6");

  const revenue = useMemo(() => {
    if (period === "all") return revenueByMonth;
    const n = Number(period);
    return revenueByMonth.slice(-n);
  }, [revenueByMonth, period]);

  const leadsTotal = leadsBySource.reduce((s, d) => s + d.count, 0);
  const clientsTotal = clientsByStatus.reduce((s, d) => s + d.count, 0);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {/* Выручка по месяцам */}
      <Card className="lg:col-span-2">
        <CardHeader className="flex-row items-start justify-between gap-4 space-y-0">
          <div>
            <CardTitle>Выручка по месяцам</CardTitle>
            <CardDescription>Сумма полученных оплат по месяцам</CardDescription>
          </div>
          <Select value={period} onValueChange={(v) => setPeriod(v as typeof period)}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="6">Последние 6 мес.</SelectItem>
              <SelectItem value="12">Последние 12 мес.</SelectItem>
              <SelectItem value="all">Весь период</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          {revenue.every((d) => d.revenue === 0) ? (
            <EmptyState text="Пока нет полученных оплат" />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={revenue} margin={{ left: 8, right: 16, top: 8, bottom: 4 }}>
                <CartesianGrid stroke="#2A2A2E" vertical={false} />
                <XAxis
                  dataKey="month"
                  stroke="#A1A1AA"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="#6B7280"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  width={70}
                  tickFormatter={(v) => formatCurrency(Number(v))}
                />
                <Tooltip
                  cursor={{ stroke: "#2A2A2E" }}
                  contentStyle={tooltipStyle}
                  labelStyle={{ color: "#FFFFFF" }}
                  formatter={(v) => [formatCurrency(Number(v)), "Выручка"]}
                />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="#22C55E"
                  strokeWidth={2}
                  dot={{ r: 3, fill: "#22C55E" }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Лиды по источникам */}
      <Card>
        <CardHeader>
          <CardTitle>Лиды по источникам</CardTitle>
          <CardDescription>Откуда приходят лиды · всего {leadsTotal}</CardDescription>
        </CardHeader>
        <CardContent>
          {leadsTotal === 0 ? (
            <EmptyState text="Пока нет лидов" />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={leadsBySource}
                  dataKey="count"
                  nameKey="label"
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={95}
                  paddingAngle={2}
                >
                  {leadsBySource.map((d) => (
                    <Cell key={d.label} fill={d.color} stroke="#141416" />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={tooltipStyle}
                  labelStyle={{ color: "#FFFFFF" }}
                  formatter={(v, n) => [`${v} шт`, n]}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
            {leadsBySource.map((d) => (
              <span key={d.label} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: d.color }} />
                {d.label} · {d.count}
              </span>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Клиенты по статусам */}
      <Card>
        <CardHeader>
          <CardTitle>Клиенты по статусам</CardTitle>
          <CardDescription>Распределение клиентов · всего {clientsTotal}</CardDescription>
        </CardHeader>
        <CardContent>
          {clientsTotal === 0 ? (
            <EmptyState text="Пока нет клиентов" />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart
                data={clientsByStatus}
                layout="vertical"
                margin={{ left: 8, right: 16, top: 4, bottom: 4 }}
              >
                <XAxis
                  type="number"
                  allowDecimals={false}
                  stroke="#6B7280"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="label"
                  width={130}
                  stroke="#A1A1AA"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  cursor={{ fill: "#FFFFFF0D" }}
                  contentStyle={tooltipStyle}
                  labelStyle={{ color: "#FFFFFF" }}
                  formatter={(v) => [`${v} шт`, "Клиенты"]}
                />
                <Bar dataKey="count" radius={[0, 6, 6, 0]} barSize={16}>
                  {clientsByStatus.map((d) => (
                    <Cell key={d.label} fill={d.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Сделки по стадиям */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Сделки по стадиям</CardTitle>
          <CardDescription>Количество и сумма сделок на каждой стадии</CardDescription>
        </CardHeader>
        <CardContent>
          {dealsByStage.every((d) => d.count === 0) ? (
            <EmptyState text="Пока нет сделок" />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={dealsByStage} margin={{ left: 8, right: 16, top: 8, bottom: 4 }}>
                <CartesianGrid stroke="#2A2A2E" vertical={false} />
                <XAxis
                  dataKey="label"
                  stroke="#A1A1AA"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  interval={0}
                  angle={-20}
                  textAnchor="end"
                  height={60}
                />
                <YAxis
                  stroke="#6B7280"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                  width={40}
                />
                <Tooltip
                  cursor={{ fill: "#FFFFFF0D" }}
                  contentStyle={tooltipStyle}
                  labelStyle={{ color: "#FFFFFF" }}
                  formatter={(_v, _n, item) => {
                    const d = item.payload as StageDatum;
                    return [`${d.count} шт · ${formatCurrency(d.amount)}`, "Сделки"];
                  }}
                />
                <Bar dataKey="count" radius={[6, 6, 0, 0]} barSize={36}>
                  {dealsByStage.map((d) => (
                    <Cell key={d.label} fill={d.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
