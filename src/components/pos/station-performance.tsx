"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Flame, Zap, Clock, TrendingUp, AlertCircle, ChefHat } from "lucide-react";
import { cn } from "@/lib/utils";

interface StationData {
  stations: {
    station: string;
    totalItems: number;
    totalOrders: number;
    avgPrepTime: number;
    minPrepTime: number;
    maxPrepTime: number;
    items: { id: string; name: string; category: string; quantity: number; avgPrepTime: number; orderCount: number }[];
  }[];
  summary: {
    totalItems: number;
    totalOrders: number;
    overallAvgPrep: number;
    stationCount: number;
    slowestStation: { station: string; avgPrepTime: number } | null;
    fastestStation: { station: string; avgPrepTime: number } | null;
  };
  days: number;
}

const STATION_ICONS: Record<string, string> = {
  "Vroča postaja": "🔥",
  "Hladna postaja": "❄️",
  "Sladice": "🍰",
  "Pijača": "🍹",
  "Vroča pijača": "☕",
  "Hladna pijača": "🧊",
  "Ostalo": "🍽️",
};

function getPerformanceColor(prepTime: number): string {
  if (prepTime > 30) return "rose";
  if (prepTime > 15) return "amber";
  return "emerald";
}

export function StationPerformance() {
  const [data, setData] = useState<StationData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/kitchen/station-performance?days=7")
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

  if (data.stations.length === 0) {
    return null;
  }

  const { summary } = data;
  const maxItems = Math.max(...data.stations.map((s) => s.totalItems), 1);

  return (
    <div className="space-y-4">
      {/* KPI */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Skupaj postavk</p>
            <ChefHat className="h-4 w-4 text-amber-500" />
          </div>
          <p className="mt-2 text-2xl font-bold">{summary.totalItems}</p>
          <p className="text-[10px] text-muted-foreground">{summary.totalOrders} naročil</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Povp. čas priprave</p>
            <Clock className="h-4 w-4 text-sky-500" />
          </div>
          <p className="mt-2 text-2xl font-bold text-sky-600 dark:text-sky-400">
            {summary.overallAvgPrep}m
          </p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Najhitrejša</p>
            <Zap className="h-4 w-4 text-emerald-500" />
          </div>
          <p className="mt-2 truncate text-sm font-bold text-emerald-600 dark:text-emerald-400">
            {summary.fastestStation?.station || "—"}
          </p>
          <p className="text-[10px] text-muted-foreground">{summary.fastestStation?.avgPrepTime || 0}m povp.</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Najpočasnejša</p>
            <Flame className="h-4 w-4 text-rose-500" />
          </div>
          <p className="mt-2 truncate text-sm font-bold text-rose-600 dark:text-rose-400">
            {summary.slowestStation?.station || "—"}
          </p>
          <p className="text-[10px] text-muted-foreground">{summary.slowestStation?.avgPrepTime || 0}m povp.</p>
        </Card>
      </div>

      {/* Postaje */}
      {data.stations.map((station) => {
        const icon = STATION_ICONS[station.station] || "🍽️";
        const perfColor = getPerformanceColor(station.avgPrepTime);
        return (
          <Card key={station.station} className="overflow-hidden">
            <div className={cn(
              "flex items-center justify-between border-b p-3",
              perfColor === "rose" && "bg-rose-50 dark:bg-rose-950/20",
              perfColor === "amber" && "bg-amber-50 dark:bg-amber-950/20",
              perfColor === "emerald" && "bg-emerald-50 dark:bg-emerald-950/20"
            )}>
              <div className="flex items-center gap-2">
                <span className="text-xl">{icon}</span>
                <div>
                  <p className="font-semibold">{station.station}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {station.totalItems} postavk · {station.totalOrders} naročil
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={cn(
                  "text-xs font-bold",
                  perfColor === "rose" && "border-rose-300 bg-rose-100 text-rose-700 dark:border-rose-800 dark:bg-rose-950/50 dark:text-rose-400",
                  perfColor === "amber" && "border-amber-300 bg-amber-100 text-amber-700 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-400",
                  perfColor === "emerald" && "border-emerald-300 bg-emerald-100 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-400"
                )}>
                  <Clock className="mr-1 h-3 w-3" />
                  {station.avgPrepTime}m
                </Badge>
                {station.avgPrepTime > 30 && (
                  <Badge variant="outline" className="border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950/50 dark:text-rose-400 text-[9px]">
                    <AlertCircle className="mr-0.5 h-2.5 w-2.5" />
                    POčasno
                  </Badge>
                )}
              </div>
            </div>

            {/* Volume bar */}
            <div className="px-3 py-2">
              <div className="relative h-2 overflow-hidden rounded-full bg-muted/50">
                <div
                  className={cn(
                    "h-full rounded-full transition-all",
                    perfColor === "rose" ? "bg-rose-400" : perfColor === "amber" ? "bg-amber-400" : "bg-emerald-400"
                  )}
                  style={{ width: `${(station.totalItems / maxItems) * 100}%` }}
                />
              </div>
              <p className="mt-1 text-[10px] text-muted-foreground">
                min: {station.minPrepTime}m · max: {station.maxPrepTime}m
              </p>
            </div>

            {/* Top jedi */}
            {station.items.length > 0 && (
              <div className="border-t border-border/40 p-3">
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Top 5 jedi
                </p>
                <div className="space-y-1">
                  {station.items.map((item, i) => (
                    <div key={item.id} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-muted text-[9px] font-bold text-muted-foreground">
                          {i + 1}
                        </span>
                        <span className="truncate font-medium">{item.name}</span>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <span className="text-muted-foreground">{item.quantity}×</span>
                        <span className={cn(
                          "font-semibold tabular-nums",
                          item.avgPrepTime > 30 ? "text-rose-600 dark:text-rose-400" : item.avgPrepTime > 15 ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"
                        )}>
                          {item.avgPrepTime}m
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}
