"use client";

import { useState } from "react";
import { useFetch } from "@/hooks/use-fetch";
import { formatEUR } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Calendar,
  TrendingUp,
  Receipt,
  Trophy,
  CreditCard,
  Banknote,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface MonthlyReport {
  period: { year: number; month: number; monthName: string };
  summary: {
    grossTotal: number;
    stornoTotal: number;
    netTotal: number;
    netVat: number;
    orderCount: number;
    stornoCount: number;
    avgOrderValue: number;
  };
  dailyRevenue: { day: string; revenue: number; orders: number }[];
  vatBreakdown: { rate: number; ratePercent: string; base: number; vat: number }[];
  topItems: { name: string; count: number; revenue: number }[];
  paymentBreakdown: { method: string; count: number; total: number }[];
  byOperator: { operator: string; count: number; total: number }[];
}

export function MonthlyReportView() {
  const now = new Date();
  const [year, setYear] = useState(String(now.getFullYear()));
  const [month, setMonth] = useState(String(now.getMonth() + 1));

  const { data, loading, error } = useFetch<MonthlyReport>(
    `/api/reports/monthly?year=${year}&month=${month}`
  );

  const months = [
    "Januar", "Februar", "Marec", "April", "Maj", "Junij",
    "Julij", "Avgust", "September", "Oktober", "November", "December",
  ];
  const years = [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1];

  if (loading || !data) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-20 text-center text-sm text-muted-foreground">
        Napaka pri nalaganju poročila.
      </div>
    );
  }

  const r = data;
  const maxDaily = Math.max(...r.dailyRevenue.map((d) => d.revenue), 1);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Mesečno poročilo</h2>
          <p className="text-xs text-muted-foreground">
            {r.period.monthName} {r.period.year}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={month} onValueChange={setMonth}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {months.map((m, i) => (
                <SelectItem key={i} value={String(i + 1)}>
                  {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={year} onValueChange={setYear}>
            <SelectTrigger className="w-[100px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {years.map((y) => (
                <SelectItem key={y} value={String(y)}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi
          label="Neto prihodek"
          value={formatEUR(r.summary.netTotal)}
          sub={`bruto ${formatEUR(r.summary.grossTotal)}`}
          icon={TrendingUp}
          accent="emerald"
        />
        <Kpi
          label="Št. računov"
          value={String(r.summary.orderCount)}
          sub={`${r.summary.stornoCount} stornov`}
          icon={Receipt}
          accent="amber"
        />
        <Kpi
          label="Povprečni račun"
          value={formatEUR(r.summary.avgOrderValue)}
          sub="na račun"
          icon={Calendar}
          accent="neutral"
        />
        <Kpi
          label="DDV"
          value={formatEUR(r.summary.netVat)}
          sub={`${r.vatBreakdown.length} stopenj`}
          icon={TrendingUp}
          accent="rose"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Dnevna dinamika */}
        <Card className="p-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="font-bold">Dnevni prihodek</h3>
              <p className="text-xs text-muted-foreground">
                {r.period.monthName} {r.period.year}
              </p>
            </div>
            <Badge variant="secondary">{formatEUR(r.summary.netTotal)}</Badge>
          </div>
          <div className="flex h-48 items-end gap-px">
            {r.dailyRevenue.map((d, i) => (
              <div
                key={i}
                className="group relative flex flex-1 flex-col items-center"
                title={`${d.day}: ${formatEUR(d.revenue)} (${d.orders} računov)`}
              >
                <div className="flex w-full flex-1 items-end">
                  <div
                    className={cn(
                      "w-full rounded-t transition-all",
                      d.revenue > 0
                        ? "bg-gradient-to-t from-amber-400 to-orange-500 hover:from-amber-500 hover:to-orange-600"
                        : "bg-muted/30"
                    )}
                    style={{
                      height: `${Math.max((d.revenue / maxDaily) * 100, 1)}%`,
                    }}
                  >
                    {d.revenue > 0 && d.orders > 0 && (
                      <span className="absolute -top-4 left-1/2 -translate-x-1/2 whitespace-nowrap text-[9px] font-medium text-muted-foreground opacity-0 group-hover:opacity-100">
                        {formatEUR(d.revenue)}
                      </span>
                    )}
                  </div>
                </div>
                {(i + 1) % 5 === 0 && (
                  <span className="mt-1 text-[9px] text-muted-foreground">
                    {i + 1}
                  </span>
                )}
              </div>
            ))}
          </div>
        </Card>

        {/* DDV razčlenitev */}
        <Card className="p-5">
          <h3 className="mb-4 font-bold">DDV po stopnjah</h3>
          <div className="space-y-3">
            {r.vatBreakdown.map((v) => (
              <div key={v.rate} className="rounded-lg border border-border p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">DDV {v.ratePercent}%</span>
                  <span className="text-sm font-bold">{formatEUR(v.vat)}</span>
                </div>
                <div className="mt-1 flex justify-between text-xs text-muted-foreground">
                  <span>Osnova</span>
                  <span>{formatEUR(v.base)}</span>
                </div>
              </div>
            ))}
            <Separator />
            <div className="flex justify-between text-sm font-bold">
              <span>Skupaj DDV</span>
              <span className="text-rose-600">{formatEUR(r.summary.netVat)}</span>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Top izdelki */}
        <Card className="p-5 lg:col-span-2">
          <div className="mb-4 flex items-center gap-2">
            <Trophy className="h-4 w-4 text-amber-500" />
            <h3 className="font-bold">Top 10 izdelkov</h3>
          </div>
          {r.topItems.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Ni podatkov.
            </p>
          ) : (
            <div className="space-y-2">
              {r.topItems.map((item, i) => (
                <div
                  key={item.name}
                  className="flex items-center gap-3 rounded-lg p-2 hover:bg-muted/30"
                >
                  <span
                    className={cn(
                      "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                      i === 0
                        ? "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400"
                        : i === 1
                        ? "bg-neutral-200 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"
                        : i === 2
                        ? "bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-400"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{item.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.count}× prodanih
                    </p>
                  </div>
                  <span className="font-bold">{formatEUR(item.revenue)}</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Placila + operaterji */}
        <div className="space-y-4">
          <Card className="p-5">
            <h3 className="mb-3 font-bold">Načini plačila</h3>
            <div className="space-y-2">
              {r.paymentBreakdown.map((p) => {
                const isCard = p.method === "card";
                const Icon = isCard ? CreditCard : Banknote;
                return (
                  <div
                    key={p.method}
                    className="flex items-center justify-between rounded-lg border border-border p-2.5"
                  >
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{isCard ? "Kartica" : "Gotovina"}</span>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold">{formatEUR(p.total)}</p>
                      <p className="text-xs text-muted-foreground">{p.count}×</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          <Card className="p-5">
            <h3 className="mb-3 flex items-center gap-2 font-bold">
              <User className="h-4 w-4" />
              Po operaterju
            </h3>
            <div className="space-y-2">
              {r.byOperator.map((o) => (
                <div
                  key={o.operator}
                  className="flex items-center justify-between rounded-lg p-2 hover:bg-muted/30"
                >
                  <span className="text-sm">{o.operator}</span>
                  <div className="text-right">
                    <p className="text-sm font-bold">{formatEUR(o.total)}</p>
                    <p className="text-xs text-muted-foreground">{o.count} računov</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Kpi({
  label,
  value,
  sub,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string;
  sub: string;
  icon: React.ComponentType<{ className?: string }>;
  accent: "emerald" | "amber" | "neutral" | "rose";
}) {
  const accentClasses = {
    emerald: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400",
    amber: "bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400",
    neutral: "bg-muted text-foreground",
    rose: "bg-rose-50 text-rose-600 dark:bg-rose-950/30 dark:text-rose-400",
  };
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">{label}</p>
        <div
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-lg",
            accentClasses[accent]
          )}
        >
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <p className="mt-2 text-2xl font-bold">{value}</p>
      <p className="text-xs text-muted-foreground">{sub}</p>
    </Card>
  );
}
