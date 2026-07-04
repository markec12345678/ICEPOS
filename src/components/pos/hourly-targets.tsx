"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Target, TrendingUp, TrendingDown, Minus, Clock, Zap, Flame } from "lucide-react";
import { formatEUR } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useNow } from "@/hooks/use-now";

interface HourlyData {
  hourlyTargets: {
    hour: number;
    target: number;
    actual: number;
    percent: number;
    cumulative: number;
    cumulativeTarget: number;
    cumulativePercent: number;
    isPast: boolean;
    isCurrent: boolean;
    isFuture: boolean;
  }[];
  summary: {
    dailyTarget: number;
    todayRevenue: number;
    remainingTarget: number;
    overallPercent: number;
    hoursLeft: number;
    targetPerHourLeft: number;
    pace: "ahead" | "on-track" | "behind";
    isWeekend: boolean;
    currentHour: number;
    currentHourActual: number;
    currentHourTarget: number;
    currentHourPercent: number;
  };
}

const PACE_CONFIG = {
  "ahead": { label: "Pred ciljem", icon: TrendingUp, color: "emerald" },
  "on-track": { label: "Na cilju", icon: Minus, color: "sky" },
  "behind": { label: "Za ciljem", icon: TrendingDown, color: "rose" },
};

function getColor(rate: number): string {
  if (rate >= 100) return "emerald";
  if (rate >= 75) return "amber";
  if (rate > 0) return "rose";
  return "muted";
}

export function HourlyTargets() {
  const [data, setData] = useState<HourlyData | null>(null);
  const [loading, setLoading] = useState(true);
  const now = useNow(60000);

  async function load() {
    try {
      const res = await fetch("/api/hourly-targets");
      if (!res.ok) return;
      setData(await res.json());
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, 60000);
    return () => clearInterval(interval);
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

  const { summary } = data;
  const paceConfig = PACE_CONFIG[summary.pace];
  const PaceIcon = paceConfig.icon;
  const maxTarget = Math.max(...data.hourlyTargets.map((h) => Math.max(h.target, h.actual)), 1);

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between border-b bg-muted/30 p-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <Target className="h-4 w-4 text-amber-600" />
          Urni cilji prometa
          {summary.isWeekend && <Badge variant="secondary" className="text-[10px]">Vikend</Badge>}
        </h3>
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className={cn(
              "gap-1 text-[10px] font-bold",
              paceConfig.color === "emerald" && "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-400",
              paceConfig.color === "sky" && "border-sky-300 bg-sky-50 text-sky-700 dark:border-sky-800 dark:bg-sky-950/50 dark:text-sky-400",
              paceConfig.color === "rose" && "border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950/50 dark:text-rose-400"
            )}
          >
            <PaceIcon className="h-2.5 w-2.5" />
            {paceConfig.label}
          </Badge>
        </div>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-4">
        <div className="rounded-lg bg-emerald-50 p-3 dark:bg-emerald-950/20">
          <p className="text-[10px] text-muted-foreground">Današnji promet</p>
          <p className="mt-1 text-lg font-bold text-emerald-600 dark:text-emerald-400">
            {formatEUR(summary.todayRevenue)}
          </p>
          <p className="text-[10px] text-muted-foreground">
            od {formatEUR(summary.dailyTarget)} ({summary.overallPercent}%)
          </p>
        </div>
        <div className="rounded-lg bg-amber-50 p-3 dark:bg-amber-950/20">
          <p className="text-[10px] text-muted-foreground">Še do cilja</p>
          <p className="mt-1 text-lg font-bold text-amber-600 dark:text-amber-400">
            {formatEUR(summary.remainingTarget)}
          </p>
        </div>
        <div className="rounded-lg bg-sky-50 p-3 dark:bg-sky-950/20">
          <p className="text-[10px] text-muted-foreground">Ure do konca</p>
          <p className="mt-1 text-lg font-bold text-sky-600 dark:text-sky-400">
            {summary.hoursLeft}h
          </p>
          <p className="text-[10px] text-muted-foreground">
            {formatEUR(summary.targetPerHourLeft)}/h potrebno
          </p>
        </div>
        <div className={cn(
          "rounded-lg p-3",
          summary.currentHourPercent >= 100 ? "bg-emerald-50 dark:bg-emerald-950/20" :
          summary.currentHourPercent >= 75 ? "bg-amber-50 dark:bg-amber-950/20" :
          "bg-rose-50 dark:bg-rose-950/20"
        )}>
          <p className="text-[10px] text-muted-foreground">Trenutna ura ({summary.currentHour}:00)</p>
          <p className={cn(
            "mt-1 text-lg font-bold",
            summary.currentHourPercent >= 100 ? "text-emerald-600 dark:text-emerald-400" :
            summary.currentHourPercent >= 75 ? "text-amber-600 dark:text-amber-400" :
            "text-rose-600 dark:text-rose-400"
          )}>
            {summary.currentHourPercent}%
          </p>
          <p className="text-[10px] text-muted-foreground">
            {formatEUR(summary.currentHourActual)} / {formatEUR(summary.currentHourTarget)}
          </p>
        </div>
      </div>

      {/* Urni graf */}
      <div className="border-t border-border/40 p-4">
        <div className="flex items-end gap-1.5" style={{ height: "120px" }}>
          {data.hourlyTargets.map((h) => {
            const color = getColor(h.percent);
            const targetHeight = (h.target / maxTarget) * 100;
            const actualHeight = h.actual > 0 ? (h.actual / maxTarget) * 100 : 0;
            return (
              <div key={h.hour} className="group flex flex-1 flex-col items-center gap-1">
                <div className="relative flex w-full flex-1 items-end gap-px">
                  {/* Target (outline) */}
                  <div
                    className="flex-1 rounded-t border-2 border-dashed border-muted-foreground/30"
                    style={{ height: `${Math.max(targetHeight, 2)}%` }}
                    title={`Cilj: ${formatEUR(h.target)}`}
                  />
                  {/* Actual (filled) */}
                  {h.actual > 0 && (
                    <div
                      className={cn(
                        "flex-1 rounded-t transition-all group-hover:opacity-80",
                        h.isPast && color === "emerald" && "bg-emerald-500",
                        h.isPast && color === "amber" && "bg-amber-500",
                        h.isPast && color === "rose" && "bg-rose-500",
                        h.isPast && color === "muted" && "bg-muted",
                        h.isCurrent && color === "emerald" && "bg-emerald-400 animate-pulse",
                        h.isCurrent && color === "amber" && "bg-amber-400 animate-pulse",
                        h.isCurrent && color === "rose" && "bg-rose-400 animate-pulse",
                        h.isCurrent && color === "muted" && "bg-muted-foreground/30 animate-pulse",
                        h.isFuture && "bg-transparent"
                      )}
                      style={{ height: `${Math.max(actualHeight, h.actual > 0 ? 4 : 0)}%` }}
                    />
                  )}
                  {/* Tooltip */}
                  <div className="pointer-events-none absolute -top-12 left-1/2 z-20 hidden -translate-x-1/2 whitespace-nowrap rounded-md border border-border bg-popover px-2 py-1 text-[10px] shadow-lg group-hover:block">
                    <p className="font-semibold">{h.hour}:00 - {h.hour + 1}:00</p>
                    <p className="text-emerald-600 dark:text-emerald-400">Dejansko: {formatEUR(h.actual)}</p>
                    <p className="text-muted-foreground">Cilj: {formatEUR(h.target)}</p>
                    <p className="font-bold">{h.percent}%</p>
                  </div>
                </div>
                {/* Hour label */}
                <span className={cn(
                  "text-[9px]",
                  h.isCurrent ? "font-bold text-amber-600 dark:text-amber-400" : "text-muted-foreground"
                )}>
                  {h.hour}
                </span>
                {/* Current hour indicator */}
                {h.isCurrent && (
                  <div className="flex items-center gap-0.5">
                    <Clock className="h-2 w-2 text-amber-500" />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="mt-3 flex items-center justify-center gap-4 text-[10px]">
          <span className="flex items-center gap-1">
            <span className="h-3 w-3 rounded border-2 border-dashed border-muted-foreground/30" />
            Cilj
          </span>
          <span className="flex items-center gap-1">
            <span className="h-3 w-3 rounded bg-emerald-500" />
            Doseženo
          </span>
          <span className="flex items-center gap-1">
            <span className="h-3 w-3 rounded bg-amber-400 animate-pulse" />
            Trenutna ura
          </span>
        </div>
      </div>

      {/* Pace warning */}
      {summary.pace === "behind" && summary.hoursLeft > 0 && (
        <div className="flex items-center gap-2 border-t border-border/40 bg-rose-50 p-3 text-xs text-rose-700 dark:bg-rose-950/20 dark:text-rose-400">
          <Flame className="h-4 w-4 shrink-0" />
          <span>
            <strong>Za ciljem!</strong> Potreben promet {formatEUR(summary.targetPerHourLeft)}/uro za naslednje {summary.hoursLeft}h, da dosežeš dnevni cilj {formatEUR(summary.dailyTarget)}.
          </span>
        </div>
      )}
      {summary.pace === "ahead" && (
        <div className="flex items-center gap-2 border-t border-border/40 bg-emerald-50 p-3 text-xs text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400">
          <Zap className="h-4 w-4 shrink-0" />
          <span>
            <strong>Odlično!</strong> Si pred ciljem — nadaljuj v enakem tempu. 🎉
          </span>
        </div>
      )}
    </Card>
  );
}
