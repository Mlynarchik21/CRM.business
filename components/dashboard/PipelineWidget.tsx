"use client";

import {
  Bar,
  BarChart,
  Cell,
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
import { formatCurrency } from "@/lib/utils";

export type PipelineDatum = {
  label: string;
  count: number;
  amount: number;
  color: string;
};

export function PipelineWidget({ data }: { data: PipelineDatum[] }) {
  const total = data.reduce((s, d) => s + d.count, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Воронка сделок</CardTitle>
        <CardDescription>
          Открытые сделки по стадиям · всего {total}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {total === 0 ? (
          <div className="flex h-[260px] items-center justify-center text-sm text-muted-foreground">
            Пока нет открытых сделок
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart
              data={data}
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
                width={120}
                stroke="#A1A1AA"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                cursor={{ fill: "#FFFFFF0D" }}
                contentStyle={{
                  background: "#1B1B1F",
                  border: "1px solid #2A2A2E",
                  borderRadius: 8,
                  fontSize: 12,
                }}
                labelStyle={{ color: "#FFFFFF" }}
                formatter={(_v, _n, item) => {
                  const d = item.payload as PipelineDatum;
                  return [`${d.count} шт · ${formatCurrency(d.amount)}`, "Сделки"];
                }}
              />
              <Bar dataKey="count" radius={[0, 6, 6, 0]} barSize={18}>
                {data.map((d) => (
                  <Cell key={d.label} fill={d.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
