"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, TrendingDown, Calendar, Brain, Zap } from "lucide-react";
import { formatEUR } from "@/lib/types";
import { cn } from "@/lib/utils";

interface ForecastData {
  forecast: {
    date: string;
    dayOfWeek: number;
    dayName: string;
    dayNameShort: string;
    predicted: number;
    confidence: number;
    isWeekend: boolean;
  }[];
  summary: {
    avgDaily: number;
    totalForecast: number;
    trend: number;
    confidence: number;
    sampleDays: number;
  };
  dayOfWeekAverages: { day: number; dayName: string; avg: number; count: number }[];
}

export function RevenueForecast() {
  const [data, setData] = useState<ForecastData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/revenue-forecast")
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

  if (data.forecast.length === 0) {
    return null;
  }

  const maxPredicted = Math.max(...data.forecast.map((f) => f.predicted), 1);
  const maxDayAvg = Math.max(...data.dayOfWeekAverages.map((d) => d.avg), 1);
  const trendPositive = data.summary.trend > 0;

  return (
    <div className="space-y-4">
      {/* KPI */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Napoved 7 dni</p>
            <Calendar className="h-4 w-4 text-sky-500" />
          </div>
          <p className="mt-2 text-2xl font-bold text-sky-600 dark:text-sky-400">
            {formatEUR(data.summary.totalForecast)}
          </p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Povp. na dan</p>
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          </div>
          <p className="mt-2 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {formatEUR(data.summary.avgDaily)}
          </p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Trend</p>
            {trendPositive ? <TrendingUp className="h-4 w-4 text-emerald-500" /> : <TrendingDown className="h-4 w-4 text-rose-500" />}
          </div>
          <p className={cn(
            "mt-2 text-2xl font-bold",
            trendPositive ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
          )}>
            {trendPositive ? "+" : ""}{data.summary.trend}%
          </p>
          <p className="text-[10px] text-muted-foreground">WoW</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Zaupanje</p>
            <Brain className="h-4 w-4 text-violet-500" />
          </div>
          <p className={cn(
            "mt-2 text-2xl font-bold",
            data.summary.confidence >= 70 ? "text-emerald-600 dark:text-emerald-400" :
            data.summary.confidence >= 40 ? "text-amber-600 dark:text-amber-400" :
            "text-rose-600 dark:text-rose-400"
          )}>
            {data.summary.confidence}%
          </p>
          <p className="text-[10px] text-muted-foreground">{data.summary.sampleDays} dni podatkov</p>
        </Card>
      </div>

      {/* 7-dnevna napoved */}
      <Card className="overflow-hidden">
        <div className="border-b bg-muted/30 p-3">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <Brain className="h-4 w-4 text-violet-500" />
            Napoved prometa — naslednjih 7 dni
            <Badge variant="secondary" className="text-[10px] gap-0.5">
              <Zap className="h-2.5 w-2.5" />
              AI
            </Badge>
          </h3>
        </div>
        <div className="p-4">
          <div className="flex h-40 items-end gap-2">
            {data.forecast.map((f) => (
              <div key={f.date} className="group flex flex-1 flex-col items-center gap-1">
                <div className="relative flex w-full flex-1 items-end">
                  <div
                    className={cn(
                      "w-full rounded-t transition-all hover:scale-105",
                      f.isWeekend
                        ? "bg-gradient-to-t from-amber-500 to-orange-400"
                        : "bg-gradient-to-t from-sky-500 to-cyan-400"
                    )}
                    style={{ height: `${Math.max((f.predicted / maxPredicted) * 100, 5)}%` }}
                  >
                    <span className="absolute -top-5 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] font-bold opacity-0 transition-opacity group-hover:opacity-100">
                      {formatEUR(f.predicted)}
                    </span>
                  </div>
                </div>
                {/* Confidence bar */}
                <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn(
                      "h-full rounded-full",
                      f.confidence >= 70 ? "bg-emerald-500" : f.confidence >= 40 ? "bg-amber-500" : "bg-rose-500"
                    )}
                    style={{ width: `${f.confidence}%` }}
                  />
                </div>
                <span className="text-[10px] font-medium">{f.dayNameShort}</span>
                <span className="text-[9px] text-muted-foreground">{f.confidence}%</span>
              </div>
            ))}
          </div>
          {/* Legend */}
          <div className="mt-3 flex items-center justify-center gap-4 text-[10px]">
            <span className="flex items-center gap-1">
              <span className="h-2 w-3 rounded bg-sky-500" />
              Delavnik
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-3 rounded bg-amber-500" />
              Vikend
            </span>
            <span className="text-muted-foreground">|</span>
            <span className="flex items-center gap-1">
              <span className="h-1 w-4 rounded bg-emerald-500" />
              Zaupanje
            </span>
          </div>
        </div>
      </Card>

      {/* Povprečje po dnevih v tednu */}
      <Card className="p-4">
        <h3 className="mb-3 text-sm font-semibold">Povprečni promet po dnevih v tednu</h3>
        <div className="space-y-1.5">
          {data.dayOfWeekAverages.map((d) => (
            <div key={d.day} className="flex items-center gap-2 text-xs">
              <span className="w-8 shrink-0 font-medium text-muted-foreground">{d.dayName}</span>
              <div className="relative h-5 flex-1 overflow-hidden rounded bg-muted/50">
                <div
                  className={cn(
                    "h-full rounded",
                    d.day === 0 || d.day === 6 ? "bg-amber-400" : "bg-sky-400"
                  )}
                  style={{ width: `${(d.avg / maxDayAvg) * 100}%` }}
                />
                <span className="absolute inset-y-0 left-2 flex items-center text-[10px] font-medium">
                  {formatEUR(d.avg)}
                </span>
              </div>
              <span className="w-16 shrink-0 text-right text-[10px] text-muted-foreground">
                {d.count} dni
              </span>
            </div>
          ))}
        </div>
      </Card>

      {/* Info */}
      <Card className="p-3 bg-muted/30">
        <p className="text-[10px] text-muted-foreground">
          🧠 Napoved temelji na povprečju po dnevih v tednu (90 dni zgodovine) + trend prilagoditev.
          Zaupanje raste z številom podatkov — več kot 8 dni na dan v tednu = 100%.
        </p>
      </Card>
    </div>
  );
}
