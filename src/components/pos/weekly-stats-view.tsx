"use client";

import { useFetch } from "@/hooks/use-fetch";
import { formatEUR } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, TrendingDown, Calendar, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";

interface DayStat {
  dayIndex: number;
  dayName: string;
  dayShort: string;
  totalRevenue: number;
  orderCount: number;
  avgRevenue: number;
  avgOrders: number;
  cashRevenue: number;
  cardRevenue: number;
  daysCount: number;
}

interface WeeklyStats {
  period: { from: string; to: string };
  days: DayStat[];
  summary: {
    bestDay: { day: string; avgRevenue: number } | null;
    worstDay: { day: string; avgRevenue: number } | null;
    totalRevenue: number;
    totalOrders: number;
  };
}

export function WeeklyStatsView() {
  const { data, loading, error } = useFetch<WeeklyStats>("/api/stats/weekly");

  if (loading) {
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

  if (error || !data) {
    return (
      <div className="py-20 text-center text-sm text-muted-foreground">
        Napaka pri nalaganju tedenske statistike.
      </div>
    );
  }

  const maxAvg = Math.max(...data.days.map((d) => d.avgRevenue), 1);
  const today = new Date().getDay();
  const todayIndex = today === 0 ? 6 : today - 1; // pon-sob (0-5), ned (6)

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold tracking-tight">Tedenska statistika</h2>
        <p className="text-xs text-muted-foreground">
          Povprečje po dnevih v tednu (zadnje 4 tedne) — za optimizacijo delavnikov
        </p>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Najboljši dan</p>
            <Trophy className="h-4 w-4 text-amber-500" />
          </div>
          <p className="mt-2 text-lg font-bold text-amber-700 dark:text-amber-400">
            {data.summary.bestDay?.day || "-"}
          </p>
          <p className="text-xs text-muted-foreground">
            {data.summary.bestDay ? formatEUR(data.summary.bestDay.avgRevenue) : "-"}
          </p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Najšibkejši dan</p>
            <TrendingDown className="h-4 w-4 text-rose-500" />
          </div>
          <p className="mt-2 text-lg font-bold text-rose-700 dark:text-rose-400">
            {data.summary.worstDay?.day || "-"}
          </p>
          <p className="text-xs text-muted-foreground">
            {data.summary.worstDay ? formatEUR(data.summary.worstDay.avgRevenue) : "-"}
          </p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Skupaj (4 tedne)</p>
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          </div>
          <p className="mt-2 text-2xl font-bold">
            {formatEUR(data.summary.totalRevenue)}
          </p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Skupaj računov</p>
            <Calendar className="h-4 w-4 text-sky-500" />
          </div>
          <p className="mt-2 text-2xl font-bold">{data.summary.totalOrders}</p>
        </Card>
      </div>

      {/* Bar chart po dnevih */}
      <Card className="p-5">
        <h3 className="mb-4 font-bold">Povprečni prihodek po dnevih v tednu</h3>
        <div className="flex h-64 items-end justify-around gap-2">
          {data.days.map((d, i) => {
            const heightPct = (d.avgRevenue / maxAvg) * 100;
            const isToday = i === todayIndex;
            const isBest = d.dayName === data.summary.bestDay?.day;
            return (
              <div
                key={d.dayIndex}
                className="group flex flex-1 flex-col items-center gap-2"
              >
                {/* Vrednost nad stolpcem */}
                <div className="text-center">
                  <p className="text-xs font-bold">
                    {formatEUR(d.avgRevenue)}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {d.avgOrders} rač.
                  </p>
                </div>

                {/* Stolpec */}
                <div className="flex w-full flex-1 items-end">
                  <div
                    className={cn(
                      "w-full rounded-t transition-all duration-300 hover:opacity-80",
                      isBest
                        ? "bg-gradient-to-t from-amber-400 to-amber-500"
                        : isToday
                        ? "bg-gradient-to-t from-sky-400 to-sky-500"
                        : "bg-gradient-to-t from-neutral-300 to-neutral-400 dark:from-neutral-600 dark:to-neutral-500"
                    )}
                    style={{ height: `${Math.max(heightPct, 2)}%` }}
                    title={`${d.dayName}: ${formatEUR(d.avgRevenue)} (povprečno ${d.avgOrders} računov)`}
                  />
                </div>

                {/* Dan */}
                <div className="text-center">
                  <p
                    className={cn(
                      "text-xs font-medium",
                      isToday && "text-sky-600 dark:text-sky-400"
                    )}
                  >
                    {d.dayShort}
                  </p>
                  {isToday && (
                    <Badge variant="outline" className="mt-0.5 px-1 py-0 text-[8px] text-sky-600 dark:text-sky-400">
                      Danes
                    </Badge>
                  )}
                  {isBest && (
                    <Badge variant="outline" className="mt-0.5 px-1 py-0 text-[8px] text-amber-600 dark:text-amber-400">
                      🏆
                    </Badge>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Tabela s podrobnostmi */}
      <Card className="overflow-hidden p-0">
        <div className="border-b border-border p-4">
          <h3 className="font-bold">Podrobnosti po dnevih</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr className="text-left text-xs uppercase text-muted-foreground">
                <th className="px-4 py-2">Dan</th>
                <th className="px-4 py-2 text-right">Pov. prihodek</th>
                <th className="px-4 py-2 text-right">Pov. računov</th>
                <th className="px-4 py-2 text-right">Skupaj</th>
                <th className="px-4 py-2 text-right">Gotovina</th>
                <th className="px-4 py-2 text-right">Kartica</th>
              </tr>
            </thead>
            <tbody>
              {data.days.map((d) => {
                const isToday = d.dayName === data.days[todayIndex]?.dayName;
                return (
                  <tr
                    key={d.dayIndex}
                    className={cn(
                      "border-b border-border/50 last:border-0",
                      isToday && "bg-sky-50/50 dark:bg-sky-950/20"
                    )}
                  >
                    <td className="px-4 py-3 font-medium">
                      {d.dayName}
                      {isToday && (
                        <Badge variant="outline" className="ml-2 text-[10px] text-sky-600 dark:text-sky-400">
                          Danes
                        </Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-bold">
                      {formatEUR(d.avgRevenue)}
                    </td>
                    <td className="px-4 py-3 text-right text-muted-foreground">
                      {d.avgOrders}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {formatEUR(d.totalRevenue)}
                    </td>
                    <td className="px-4 py-3 text-right text-emerald-600 dark:text-emerald-400">
                      {formatEUR(d.cashRevenue)}
                    </td>
                    <td className="px-4 py-3 text-right text-amber-600 dark:text-amber-400">
                      {formatEUR(d.cardRevenue)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="border-sky-200 bg-sky-50/50 p-4 dark:border-sky-900 dark:bg-sky-950/20">
        <div className="text-xs text-sky-900 dark:text-sky-200">
          <p className="font-semibold">💡 Optimizacija delavnikov</p>
          <p className="mt-1">
            Na podlagi te statistike lahko lastnik optimizira razpored delavnikov:
            na najbolj prodajne dni (npr. {data.summary.bestDay?.day || "-"})
            postavite več osebja, na šibkejše dni (
            {data.summary.worstDay?.day || "-"}) pa manj.
            Povprečje je izračunano iz zadnjih 4 tednov.
          </p>
        </div>
      </Card>
    </div>
  );
}
