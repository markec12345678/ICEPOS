"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Clock, TrendingDown, TrendingUp, Timer, ArrowLeftRight } from "lucide-react";
import { formatEUR } from "@/lib/types";
import { cn } from "@/lib/utils";

interface TurnTimeData {
  daily: {
    date: string;
    dayName: string;
    avgTurnTime: number;
    minTurnTime: number;
    maxTurnTime: number;
    count: number;
    revenue: number;
  }[];
  bySection: {
    section: string;
    avgTurnTime: number;
    count: number;
  }[];
  byDayOfWeek: {
    dayOfWeek: number;
    dayName: string;
    avgTurnTime: number;
    count: number;
  }[];
  overall: {
    avgTurnTime: number;
    minTurnTime: number;
    maxTurnTime: number;
    totalTables: number;
    avgRevenuePerTable: number;
    avgTablesPerDay: number;
  };
  days: number;
}

function formatDuration(min: number): string {
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export function TableTurnTime() {
  const [data, setData] = useState<TurnTimeData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/tables/turn-time?days=7")
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <Card className="p-5">
        <Skeleton className="mb-4 h-6 w-48" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
        <Skeleton className="mt-4 h-40" />
      </Card>
    );
  }

  if (!data || data.overall.totalTables === 0) {
    return (
      <Card className="p-5">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Timer className="h-4 w-4" />
          <span>
            Turn time analitika se bo prikazala, ko bodo plačani računi z začetkom in koncem v zadnjih {data?.days || 7} dneh.
          </span>
        </div>
      </Card>
    );
  }

  const maxDailyTurn = Math.max(...data.daily.map((d) => d.avgTurnTime), 1);
  const maxDayOfWeek = Math.max(...data.byDayOfWeek.map((d) => d.avgTurnTime), 1);

  return (
    <Card className="overflow-hidden">
      <div className="border-b bg-muted/30 p-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <ArrowLeftRight className="h-4 w-4 text-amber-600" />
          Turn time analitika — zadnjih {data.days} dni
        </h3>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Povprečni čas zasedenosti mize (od odprtja do plačila)
        </p>
      </div>

      {/* Skupne metrike */}
      <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-4">
        <div className="rounded-lg bg-amber-50 p-3 dark:bg-amber-950/20">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            Povprečno
          </div>
          <p className="mt-1 text-xl font-bold text-amber-700 dark:text-amber-400">
            {formatDuration(data.overall.avgTurnTime)}
          </p>
        </div>
        <div className="rounded-lg bg-emerald-50 p-3 dark:bg-emerald-950/20">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <TrendingDown className="h-3 w-3" />
            Najkrajše
          </div>
          <p className="mt-1 text-xl font-bold text-emerald-700 dark:text-emerald-400">
            {formatDuration(data.overall.minTurnTime)}
          </p>
        </div>
        <div className="rounded-lg bg-rose-50 p-3 dark:bg-rose-950/20">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <TrendingUp className="h-3 w-3" />
            Najdaljše
          </div>
          <p className="mt-1 text-xl font-bold text-rose-700 dark:text-rose-400">
            {formatDuration(data.overall.maxTurnTime)}
          </p>
        </div>
        <div className="rounded-lg bg-violet-50 p-3 dark:bg-violet-950/20">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <ArrowLeftRight className="h-3 w-3" />
            Obrat/mizo
          </div>
          <p className="mt-1 text-xl font-bold text-violet-700 dark:text-violet-400">
            {formatEUR(data.overall.avgRevenuePerTable)}
          </p>
        </div>
      </div>

      <div className="grid gap-4 p-4 pt-0 lg:grid-cols-2">
        {/* Dnevni turn time — bar chart */}
        <div>
          <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Po dnevih
          </h4>
          <div className="space-y-2">
            {data.daily.map((d) => (
              <div key={d.date} className="flex items-center gap-2">
                <span className="w-12 shrink-0 text-xs text-muted-foreground">
                  {d.dayName}
                </span>
                <div className="relative h-6 flex-1 overflow-hidden rounded bg-muted/50">
                  <div
                    className={cn(
                      "h-full rounded transition-all",
                      d.avgTurnTime >= 90
                        ? "bg-rose-400 dark:bg-rose-600"
                        : d.avgTurnTime >= 60
                        ? "bg-amber-400 dark:bg-amber-600"
                        : "bg-emerald-400 dark:bg-emerald-600"
                    )}
                    style={{ width: `${(d.avgTurnTime / maxDailyTurn) * 100}%` }}
                  />
                  <span className="absolute inset-y-0 left-2 flex items-center text-[10px] font-medium">
                    {formatDuration(d.avgTurnTime)}
                  </span>
                </div>
                <span className="w-12 shrink-0 text-right text-[10px] text-muted-foreground">
                  {d.count}×
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Po dnevih v tednu */}
        <div>
          <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Povprečje po dnevih v tednu
          </h4>
          <div className="flex h-32 items-end gap-1.5">
            {data.byDayOfWeek.map((d) => (
              <div key={d.dayOfWeek} className="group flex flex-1 flex-col items-center gap-1">
                <div className="relative flex w-full flex-1 items-end">
                  <div
                    className="w-full rounded-t bg-gradient-to-t from-amber-400 to-orange-500 transition-all hover:from-amber-500 hover:to-orange-600"
                    style={{ height: `${Math.max((d.avgTurnTime / maxDayOfWeek) * 100, 2)}%` }}
                  >
                    {d.count > 0 && (
                      <span className="absolute -top-4 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] font-medium text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">
                        {formatDuration(d.avgTurnTime)}
                      </span>
                    )}
                  </div>
                </div>
                <span className="text-[10px] text-muted-foreground">{d.dayName}</span>
              </div>
            ))}
          </div>

          {/* Po sekcijah */}
          {data.bySection.length > 0 && (
            <div className="mt-4">
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Po sekcijah
              </h4>
              <div className="flex flex-wrap gap-2">
                {data.bySection.map((s) => (
                  <Badge
                    key={s.section}
                    variant="outline"
                    className="gap-1.5"
                    title={`${s.count} računov`}
                  >
                    {s.section}: {formatDuration(s.avgTurnTime)} ({s.count}×)
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
