"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Brain, UserPlus, UserMinus, CheckCircle2, TrendingUp, Users, Zap } from "lucide-react";
import { formatEUR } from "@/lib/types";
import { cn } from "@/lib/utils";

interface OptimizerData {
  dayRecommendations: {
    day: number;
    dayName: string;
    dayNameShort: string;
    predictedRevenue: number;
    currentStaff: number;
    recommendedStaff: number;
    difference: number;
    laborCost: number;
    laborCostPct: number;
    status: "understaffed" | "optimal" | "overstaffed";
    suggestion: string;
  }[];
  peakHours: { hour: number; avgRevenue: number; isPeak: boolean }[];
  summary: {
    totalPredictedRevenue: number;
    totalCurrentStaff: number;
    totalRecommendedStaff: number;
    staffDifference: number;
    understaffedDays: number;
    overstaffedDays: number;
    optimalDays: number;
    avgLaborCostPct: number;
  };
}

const STATUS_CONFIG = {
  understaffed: { label: "Premalo", icon: UserPlus, color: "rose", bg: "border-rose-300 bg-rose-50/50 dark:border-rose-800 dark:bg-rose-950/20", text: "text-rose-600 dark:text-rose-400" },
  optimal: { label: "Optimalno", icon: CheckCircle2, color: "emerald", bg: "border-emerald-300 bg-emerald-50/50 dark:border-emerald-800 dark:bg-emerald-950/20", text: "text-emerald-600 dark:text-emerald-400" },
  overstaffed: { label: "Preveč", icon: UserMinus, color: "amber", bg: "border-amber-300 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/20", text: "text-amber-600 dark:text-amber-400" },
};

export function SchedulingOptimizer() {
  const [data, setData] = useState<OptimizerData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/scheduling-optimizer")
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

  const { summary } = data;
  const maxRevenue = Math.max(...data.dayRecommendations.map((d) => d.predictedRevenue), 1);
  const maxHourRev = Math.max(...data.peakHours.map((h) => h.avgRevenue), 1);

  return (
    <div className="space-y-4">
      {/* KPI */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Napovedan promet</p>
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          </div>
          <p className="mt-2 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {formatEUR(summary.totalPredictedRevenue)}
          </p>
          <p className="text-[10px] text-muted-foreground">za ta teden</p>
        </Card>
        <Card className={cn("p-4", summary.staffDifference > 0 && "border-rose-300 dark:border-rose-800")}>
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Razlika osebja</p>
            <Users className={cn("h-4 w-4", summary.staffDifference > 0 ? "text-rose-500" : summary.staffDifference < 0 ? "text-amber-500" : "text-emerald-500")} />
          </div>
          <p className={cn(
            "mt-2 text-2xl font-bold",
            summary.staffDifference > 0 ? "text-rose-600 dark:text-rose-400" :
            summary.staffDifference < 0 ? "text-amber-600 dark:text-amber-400" :
            "text-emerald-600 dark:text-emerald-400"
          )}>
            {summary.staffDifference > 0 ? "+" : ""}{summary.staffDifference}
          </p>
          <p className="text-[10px] text-muted-foreground">
            {summary.totalCurrentStaff} trenutno / {summary.totalRecommendedStaff} priporočeno
          </p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Labor cost %</p>
            <Users className="h-4 w-4 text-amber-500" />
          </div>
          <p className={cn(
            "mt-2 text-2xl font-bold",
            summary.avgLaborCostPct > 35 ? "text-rose-600 dark:text-rose-400" :
            summary.avgLaborCostPct > 25 ? "text-amber-600 dark:text-amber-400" :
            "text-emerald-600 dark:text-emerald-400"
          )}>
            {summary.avgLaborCostPct}%
          </p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Optimalnih dni</p>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </div>
          <p className="mt-2 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {summary.optimalDays}/7
          </p>
          <p className="text-[10px] text-muted-foreground">
            {summary.understaffedDays} premalo · {summary.overstaffedDays} preveč
          </p>
        </Card>
      </div>

      {/* Priporočila po dnevih */}
      <Card className="overflow-hidden">
        <div className="border-b bg-muted/30 p-3">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <Brain className="h-4 w-4 text-violet-500" />
            AI priporočila za razpored
            <Badge variant="secondary" className="text-[10px] gap-0.5">
              <Zap className="h-2.5 w-2.5" />
              AI
            </Badge>
          </h3>
        </div>
        <div className="divide-y">
          {data.dayRecommendations.map((rec) => {
            const config = STATUS_CONFIG[rec.status];
            const Icon = config.icon;
            return (
              <div key={rec.day} className={cn("p-3", config.bg)}>
                <div className="flex items-center gap-3">
                  {/* Day */}
                  <div className="w-16 shrink-0">
                    <p className="text-sm font-bold">{rec.dayNameShort}</p>
                    <p className="text-[10px] text-muted-foreground">{formatEUR(rec.predictedRevenue)}</p>
                  </div>

                  {/* Staff visual */}
                  <div className="flex flex-1 items-center gap-1">
                    {Array.from({ length: Math.max(rec.currentStaff, rec.recommendedStaff, 4) }).map((_, i) => (
                      <div
                        key={i}
                        className={cn(
                          "flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold transition-all",
                          i < rec.currentStaff
                            ? i < rec.recommendedStaff
                              ? "bg-emerald-400 text-white"
                              : "bg-amber-400 text-amber-900"
                            : i < rec.recommendedStaff
                            ? "border-2 border-dashed border-rose-400 text-rose-400"
                            : "bg-muted/30 text-muted-foreground"
                        )}
                      >
                        {i < rec.currentStaff ? "👤" : i < rec.recommendedStaff ? "+" : ""}
                      </div>
                    ))}
                  </div>

                  {/* Status */}
                  <div className="shrink-0 text-right">
                    <Badge variant="outline" className={cn("text-[10px]", config.text)}>
                      <Icon className="mr-0.5 h-2.5 w-2.5" />
                      {config.label}
                    </Badge>
                    <p className="mt-0.5 text-[10px] text-muted-foreground">
                      {rec.currentStaff}→{rec.recommendedStaff} · {rec.laborCostPct}%
                    </p>
                  </div>
                </div>
                {/* Suggestion */}
                <p className={cn("mt-1.5 pl-[76px] text-xs", config.text)}>
                  {rec.suggestion}
                </p>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Peak hours */}
      <Card className="p-4">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
          <Zap className="h-4 w-4 text-amber-500" />
          Urni vrhovi (peak hours)
        </h3>
        <div className="flex h-20 items-end gap-1">
          {data.peakHours.map((h) => (
            <div key={h.hour} className="group flex flex-1 flex-col items-center gap-0.5">
              <div className="relative flex w-full flex-1 items-end">
                <div
                  className={cn(
                    "w-full rounded-t transition-all",
                    h.isPeak ? "bg-rose-400 hover:bg-rose-500" : "bg-sky-300 hover:bg-sky-400 dark:bg-sky-700 dark:hover:bg-sky-600"
                  )}
                  style={{ height: `${Math.max((h.avgRevenue / maxHourRev) * 100, 4)}%` }}
                  title={`${h.hour}:00 — ${formatEUR(h.avgRevenue)}`}
                />
                {h.isPeak && (
                  <span className="absolute -top-4 left-1/2 -translate-x-1/2 text-[8px]">🔥</span>
                )}
              </div>
              <span className="text-[8px] text-muted-foreground">{h.hour}</span>
            </div>
          ))}
        </div>
        <p className="mt-2 text-center text-[10px] text-muted-foreground">
          🔥 = peak ura (1.5× nad povprečjem) — povečaj osebje v teh urah
        </p>
      </Card>
    </div>
  );
}
