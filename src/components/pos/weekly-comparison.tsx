"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, TrendingDown, Calendar, Coins, Receipt, DollarSign } from "lucide-react";
import { formatEUR } from "@/lib/types";
import { cn } from "@/lib/utils";

interface WeeklyData {
  thisWeek: { revenue: number; tips: number; count: number; avgOrder: number };
  lastWeek: { revenue: number; tips: number; count: number; avgOrder: number };
  changes: { revenue: number; tips: number; count: number; avgOrder: number };
  dayComparison: {
    day: number;
    dayName: string;
    thisWeek: { revenue: number; count: number };
    lastWeek: { revenue: number; count: number };
    change: number;
    isFuture: boolean;
  }[];
}

function ChangeBadge({ value, suffix = "%" }: { value: number; suffix?: string }) {
  const positive = value > 0;
  const neutral = value === 0;
  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-0.5 text-[10px] font-bold tabular-nums",
        neutral && "text-muted-foreground",
        positive && !neutral && "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-400",
        !positive && !neutral && "border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950/50 dark:text-rose-400"
      )}
    >
      {positive && !neutral && <TrendingUp className="h-2.5 w-2.5" />}
      {!positive && !neutral && <TrendingDown className="h-2.5 w-2.5" />}
      {positive && !neutral ? "+" : ""}{value}{suffix}
    </Badge>
  );
}

export function WeeklyComparison() {
  const [data, setData] = useState<WeeklyData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/weekly-comparison")
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading || !data) {
    return (
      <Card className="p-5">
        <Skeleton className="mb-4 h-6 w-48" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      </Card>
    );
  }

  const maxRevenue = Math.max(
    ...data.dayComparison.map((d) => Math.max(d.thisWeek.revenue, d.lastWeek.revenue)),
    1
  );

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between border-b bg-muted/30 p-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <Calendar className="h-4 w-4 text-amber-600" />
          Ta teden vs. prejšnji teden
        </h3>
        <Badge variant="secondary" className="text-[10px]">
          WoW primerjava
        </Badge>
      </div>

      {/* KPI z spremembami */}
      <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-4">
        <div className="rounded-lg bg-muted/30 p-3">
          <div className="flex items-center justify-between">
            <p className="text-[10px] text-muted-foreground">Promet</p>
            <DollarSign className="h-3 w-3 text-emerald-500" />
          </div>
          <p className="mt-1 text-lg font-bold">{formatEUR(data.thisWeek.revenue)}</p>
          <div className="mt-0.5 flex items-center gap-1">
            <span className="text-[10px] text-muted-foreground">prej: {formatEUR(data.lastWeek.revenue)}</span>
            <ChangeBadge value={data.changes.revenue} />
          </div>
        </div>

        <div className="rounded-lg bg-muted/30 p-3">
          <div className="flex items-center justify-between">
            <p className="text-[10px] text-muted-foreground">Računov</p>
            <Receipt className="h-3 w-3 text-sky-500" />
          </div>
          <p className="mt-1 text-lg font-bold">{data.thisWeek.count}</p>
          <div className="mt-0.5 flex items-center gap-1">
            <span className="text-[10px] text-muted-foreground">prej: {data.lastWeek.count}</span>
            <ChangeBadge value={data.changes.count} />
          </div>
        </div>

        <div className="rounded-lg bg-muted/30 p-3">
          <div className="flex items-center justify-between">
            <p className="text-[10px] text-muted-foreground">Povp. račun</p>
            <DollarSign className="h-3 w-3 text-amber-500" />
          </div>
          <p className="mt-1 text-lg font-bold">{formatEUR(data.thisWeek.avgOrder)}</p>
          <div className="mt-0.5 flex items-center gap-1">
            <span className="text-[10px] text-muted-foreground">prej: {formatEUR(data.lastWeek.avgOrder)}</span>
            <ChangeBadge value={data.changes.avgOrder} />
          </div>
        </div>

        <div className="rounded-lg bg-muted/30 p-3">
          <div className="flex items-center justify-between">
            <p className="text-[10px] text-muted-foreground">Napitnine</p>
            <Coins className="h-3 w-3 text-violet-500" />
          </div>
          <p className="mt-1 text-lg font-bold text-violet-600 dark:text-violet-400">
            {formatEUR(data.thisWeek.tips)}
          </p>
          <div className="mt-0.5 flex items-center gap-1">
            <span className="text-[10px] text-muted-foreground">prej: {formatEUR(data.lastWeek.tips)}</span>
            <ChangeBadge value={data.changes.tips} />
          </div>
        </div>
      </div>

      {/* Dnevna primerjava */}
      <div className="border-t border-border/40 p-4">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Dnevna primerjava (ta teden vs prejšnji)
        </p>
        <div className="space-y-1.5">
          {data.dayComparison.map((d) => (
            <div key={d.day} className="flex items-center gap-2 text-xs">
              <span className="w-8 shrink-0 font-medium text-muted-foreground">{d.dayName}</span>

              {/* This week bar */}
              <div className="flex-1">
                <div className="relative h-5 overflow-hidden rounded bg-muted/30">
                  <div
                    className={cn(
                      "absolute left-0 h-full rounded bg-emerald-400 transition-all",
                      d.isFuture && "opacity-30"
                    )}
                    style={{ width: `${(d.thisWeek.revenue / maxRevenue) * 100}%` }}
                  />
                  <span className="absolute inset-y-0 left-2 flex items-center text-[9px] font-medium">
                    {d.thisWeek.revenue > 0 ? formatEUR(d.thisWeek.revenue) : (d.isFuture ? "—" : "0€")}
                  </span>
                </div>
              </div>

              {/* Last week bar */}
              <div className="flex-1">
                <div className="relative h-5 overflow-hidden rounded bg-muted/30">
                  <div
                    className="absolute right-0 h-full rounded bg-sky-300 transition-all dark:bg-sky-700"
                    style={{ width: `${(d.lastWeek.revenue / maxRevenue) * 100}%` }}
                  />
                  <span className="absolute inset-y-0 right-2 flex items-center text-[9px] font-medium">
                    {d.lastWeek.revenue > 0 ? formatEUR(d.lastWeek.revenue) : "0€"}
                  </span>
                </div>
              </div>

              {/* Change */}
              <div className="w-12 shrink-0 text-right">
                {!d.isFuture && d.thisWeek.revenue > 0 && <ChangeBadge value={d.change} />}
              </div>
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="mt-2 flex items-center justify-center gap-4 text-[10px]">
          <span className="flex items-center gap-1">
            <span className="h-2 w-3 rounded bg-emerald-400" />
            Ta teden
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-3 rounded bg-sky-300 dark:bg-sky-700" />
            Prejšnji teden
          </span>
        </div>
      </div>
    </Card>
  );
}
