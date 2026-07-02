"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { DollarSign, Clock, Users, TrendingUp, AlertCircle, CheckCircle2 } from "lucide-react";
import { formatEUR } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useNow } from "@/hooks/use-now";

interface LaborData {
  date: string;
  operators: {
    timesheetId: string;
    operatorId: string;
    operatorName: string;
    role: string;
    hourlyRate: number;
    clockIn: string;
    clockOut: string | null;
    breakMinutes: number;
    workMinutes: number;
    workHours: number;
    cost: number;
    isClockedIn: boolean;
    elapsedMinutes: number;
  }[];
  summary: {
    totalHours: number;
    totalCost: number;
    activeCount: number;
    totalCount: number;
    dayRevenue: number;
    laborCostPct: number;
    avgHourlyCost: number;
    recommendation: string;
  };
  hourlyCost: { hour: number; cost: number; count: number }[];
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${Math.round(minutes)}m`;
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export function LaborCostTracker() {
  const [data, setData] = useState<LaborData | null>(null);
  const [loading, setLoading] = useState(true);
  const now = useNow(30000);

  useEffect(() => {
    load();
    const interval = setInterval(load, 60000); // vsako minuto
    return () => clearInterval(interval);
  }, []);

  async function load() {
    try {
      const res = await fetch("/api/labor-cost-live");
      if (!res.ok) return;
      setData(await res.json());
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

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
  const laborCostColor =
    summary.laborCostPct > 35 ? "rose" :
    summary.laborCostPct > 25 ? "amber" :
    summary.laborCostPct > 0 ? "emerald" : "muted";

  const maxHourlyCost = Math.max(...data.hourlyCost.map((h) => h.cost), 1);

  return (
    <div className="space-y-4">
      {/* KPI */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Strošek dela danes</p>
            <DollarSign className="h-4 w-4 text-amber-500" />
          </div>
          <p className="mt-2 text-2xl font-bold text-amber-600 dark:text-amber-400">
            {formatEUR(summary.totalCost)}
          </p>
          <p className="text-[10px] text-muted-foreground">
            {summary.totalHours}h · {formatEUR(summary.avgHourlyCost)}/h
          </p>
        </Card>

        <Card className={cn(
          "p-4",
          laborCostColor === "rose" && "border-rose-300 dark:border-rose-800",
          laborCostColor === "amber" && "border-amber-300 dark:border-amber-800",
          laborCostColor === "emerald" && "border-emerald-300 dark:border-emerald-800"
        )}>
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Labor cost %</p>
            <TrendingUp className={cn(
              "h-4 w-4",
              laborCostColor === "rose" && "text-rose-500",
              laborCostColor === "amber" && "text-amber-500",
              laborCostColor === "emerald" && "text-emerald-500"
            )} />
          </div>
          <p className={cn(
            "mt-2 text-2xl font-bold",
            laborCostColor === "rose" && "text-rose-600 dark:text-rose-400",
            laborCostColor === "amber" && "text-amber-600 dark:text-amber-400",
            laborCostColor === "emerald" && "text-emerald-600 dark:text-emerald-400"
          )}>
            {summary.laborCostPct > 0 ? `${summary.laborCostPct}%` : "—"}
          </p>
          <p className="text-[10px] text-muted-foreground">
            promet: {formatEUR(summary.dayRevenue)}
          </p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Aktivni delavci</p>
            <Users className="h-4 w-4 text-sky-500" />
          </div>
          <p className="mt-2 text-2xl font-bold text-sky-600 dark:text-sky-400">
            {summary.activeCount}
          </p>
          <p className="text-[10px] text-muted-foreground">
            od {summary.totalCount} prijavljenih
          </p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Skupaj ur</p>
            <Clock className="h-4 w-4 text-violet-500" />
          </div>
          <p className="mt-2 text-2xl font-bold text-violet-600 dark:text-violet-400">
            {summary.totalHours}h
          </p>
        </Card>
      </div>

      {/* Recommendation banner */}
      {summary.recommendation && (
        <div className={cn(
          "flex items-center gap-2 rounded-lg border p-3 text-sm",
          summary.laborCostPct > 35
            ? "border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950/30 dark:text-rose-400"
            : summary.laborCostPct > 25
            ? "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-400"
            : "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400"
        )}>
          {summary.laborCostPct > 25 ? <AlertCircle className="h-4 w-4 shrink-0" /> : <CheckCircle2 className="h-4 w-4 shrink-0" />}
          <span className="font-medium">{summary.recommendation}</span>
        </div>
      )}

      {/* Aktivni delavci */}
      <Card className="overflow-hidden">
        <div className="border-b bg-muted/30 p-3">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <Users className="h-4 w-4 text-sky-500" />
            Delavci na delu
            <Badge variant="secondary" className="text-[10px]">
              {summary.activeCount} aktivnih
            </Badge>
          </h3>
        </div>
        <div className="divide-y">
          {data.operators.length === 0 ? (
            <p className="p-4 text-center text-sm text-muted-foreground">
              Ni prijavljenih delavcev. Prijavi se v Razpored → Clock In.
            </p>
          ) : (
            data.operators.map((op) => (
              <div key={op.timesheetId} className="flex items-center gap-3 p-3">
                {/* Avatar */}
                <div className={cn(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white",
                  op.isClockedIn
                    ? "bg-gradient-to-br from-emerald-400 to-green-500"
                    : "bg-muted text-muted-foreground"
                )}>
                  {op.operatorName.charAt(0).toUpperCase()}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-medium">{op.operatorName}</p>
                    <Badge variant="outline" className="text-[9px]">
                      {op.role === "admin" ? "Admin" : "Blagajnik"}
                    </Badge>
                    {op.isClockedIn && (
                      <Badge variant="outline" className="gap-1 border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-400 text-[9px]">
                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                        ACTIVE
                      </Badge>
                    )}
                  </div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
                    <span className="flex items-center gap-0.5">
                      <Clock className="h-2.5 w-2.5" />
                      {formatDuration(op.workMinutes)}
                      {op.breakMinutes > 0 && ` (-${op.breakMinutes}m pavza)`}
                    </span>
                    <span>· {formatEUR(op.hourlyRate)}/h</span>
                    <span>· od {new Date(op.clockIn).toLocaleTimeString("sl-SI", { hour: "2-digit", minute: "2-digit" })}</span>
                    {op.clockOut && (
                      <span>· do {new Date(op.clockOut).toLocaleTimeString("sl-SI", { hour: "2-digit", minute: "2-digit" })}</span>
                    )}
                  </div>
                </div>

                <div className="shrink-0 text-right">
                  <p className="font-bold tabular-nums text-amber-600 dark:text-amber-400">
                    {formatEUR(op.cost)}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {op.workHours}h
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>

      {/* Urni strošek */}
      {data.hourlyCost.length > 0 && (
        <Card className="p-4">
          <h3 className="mb-3 text-sm font-semibold">Strošek po urah</h3>
          <div className="flex h-32 items-end gap-1.5">
            {data.hourlyCost.map((h) => (
              <div key={h.hour} className="group flex flex-1 flex-col items-center gap-1">
                <div className="relative flex w-full flex-1 items-end">
                  <div
                    className="w-full rounded-t bg-gradient-to-t from-amber-400 to-orange-500 transition-all hover:from-amber-500 hover:to-orange-600"
                    style={{ height: `${Math.max((h.cost / maxHourlyCost) * 100, 2)}%` }}
                  >
                    <span className="absolute -top-5 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] font-medium text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">
                      {formatEUR(h.cost)}
                    </span>
                  </div>
                </div>
                <span className="text-[10px] text-muted-foreground">{h.hour}</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
