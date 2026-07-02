"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, Clock, Flame, TrendingUp } from "lucide-react";
import { formatEUR } from "@/lib/types";
import { cn } from "@/lib/utils";

interface HeatmapData {
  cells: {
    day: number;
    dayName: string;
    hour: number;
    revenue: number;
    count: number;
    avg: number;
  }[];
  dayTotals: { day: number; dayName: string; revenue: number; count: number; avgPerDay: number }[];
  hourTotals: { hour: number; revenue: number; count: number }[];
  peakTimes: { day: number; dayName: string; hour: number; revenue: number; count: number; label: string }[];
  bestDay: { day: number; dayName: string; revenue: number; count: number; avgPerDay: number };
  bestHour: { hour: number; revenue: number; count: number };
  dayNamesShort: string[];
  weeks: number;
  totalOrders: number;
  totalRevenue: number;
}

const HOURS_RANGE = Array.from({ length: 24 }, (_, i) => i);

function getIntensityColor(value: number, max: number): string {
  if (value === 0 || max === 0) return "bg-muted/30";
  const ratio = value / max;
  if (ratio >= 0.9) return "bg-rose-500 text-white";
  if (ratio >= 0.7) return "bg-orange-500 text-white";
  if (ratio >= 0.5) return "bg-amber-400 text-amber-900";
  if (ratio >= 0.3) return "bg-amber-300 text-amber-900";
  if (ratio >= 0.15) return "bg-emerald-300 text-emerald-900";
  if (ratio > 0) return "bg-emerald-200 text-emerald-900";
  return "bg-muted/30";
}

export function SalesHeatmap() {
  const [data, setData] = useState<HeatmapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [metric, setMetric] = useState<"revenue" | "count">("revenue");
  const [hoveredCell, setHoveredCell] = useState<{ day: number; hour: number; revenue: number; count: number } | null>(null);

  useEffect(() => {
    fetch("/api/sales-heatmap?weeks=8")
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading || !data) {
    return (
      <Card className="p-5">
        <Skeleton className="mb-4 h-6 w-48" />
        <Skeleton className="h-64" />
      </Card>
    );
  }

  const maxValue = Math.max(
    ...data.cells.map((c) => (metric === "revenue" ? c.revenue : c.count)),
    1
  );

  return (
    <div className="space-y-4">
      {/* KPI kartice */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Najboljši dan</p>
            <Calendar className="h-4 w-4 text-amber-500" />
          </div>
          <p className="mt-2 text-lg font-bold text-amber-600 dark:text-amber-400">
            {data.bestDay?.dayName || "—"}
          </p>
          <p className="text-[10px] text-muted-foreground">
            povp. {formatEUR(data.bestDay?.avgPerDay || 0)}/dan
          </p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Najboljša ura</p>
            <Clock className="h-4 w-4 text-sky-500" />
          </div>
          <p className="mt-2 text-lg font-bold text-sky-600 dark:text-sky-400">
            {data.bestHour ? `${data.bestHour.hour}:00` : "—"}
          </p>
          <p className="text-[10px] text-muted-foreground">
            {formatEUR(data.bestHour?.revenue || 0)} skupaj
          </p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Skupaj računov</p>
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          </div>
          <p className="mt-2 text-2xl font-bold">{data.totalOrders}</p>
          <p className="text-[10px] text-muted-foreground">v {data.weeks} tednih</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Skupni promet</p>
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          </div>
          <p className="mt-2 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {formatEUR(data.totalRevenue)}
          </p>
        </Card>
      </div>

      {/* Metric toggle */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Prikaži:</span>
        <Button
          variant={metric === "revenue" ? "default" : "outline"}
          size="sm"
          onClick={() => setMetric("revenue")}
        >
          Promet (€)
        </Button>
        <Button
          variant={metric === "count" ? "default" : "outline"}
          size="sm"
          onClick={() => setMetric("count")}
        >
          Št. računov
        </Button>
      </div>

      {/* Heatmap */}
      <Card className="overflow-x-auto p-4">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
          <Flame className="h-4 w-4 text-orange-500" />
          Heatmap prometa (dan × ura)
        </h3>

        {/* Grid */}
        <div className="min-w-[700px]">
          {/* Hour labels header */}
          <div className="mb-1 flex">
            <div className="w-12 shrink-0" />
            {HOURS_RANGE.map((h) => (
              <div
                key={h}
                className="flex-1 text-center text-[9px] text-muted-foreground"
                title={`${h}:00`}
              >
                {h % 2 === 0 ? `${h}` : ""}
              </div>
            ))}
          </div>

          {/* Rows */}
          {data.dayNamesShort.map((dayName, dayIdx) => (
            <div key={dayIdx} className="mb-0.5 flex items-center">
              <div className="w-12 shrink-0 text-[10px] font-medium text-muted-foreground">
                {dayName}
              </div>
              {HOURS_RANGE.map((hour) => {
                const cell = data.cells.find((c) => c.day === dayIdx && c.hour === hour);
                const value = metric === "revenue" ? cell?.revenue || 0 : cell?.count || 0;
                return (
                  <div
                    key={hour}
                    className="group relative flex-1"
                    onMouseEnter={() => setHoveredCell({
                      day: dayIdx,
                      hour,
                      revenue: cell?.revenue || 0,
                      count: cell?.count || 0,
                    })}
                    onMouseLeave={() => setHoveredCell(null)}
                  >
                    <div
                      className={cn(
                        "mx-0.5 h-6 cursor-pointer rounded transition-all hover:scale-110 hover:ring-2 hover:ring-foreground",
                        getIntensityColor(value, maxValue)
                      )}
                    />
                    {/* Tooltip */}
                    {hoveredCell?.day === dayIdx && hoveredCell?.hour === hour && (
                      <div className="absolute bottom-full left-1/2 z-50 mb-1 -translate-x-1/2 whitespace-nowrap rounded-md border border-border bg-popover px-2 py-1 text-[10px] shadow-lg">
                        <p className="font-semibold">{dayName} {hour}:00-{hour + 1}:00</p>
                        <p className="text-muted-foreground">{formatEUR(cell?.revenue || 0)}</p>
                        <p className="text-muted-foreground">{cell?.count || 0} računov</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="mt-3 flex items-center justify-center gap-2 text-[10px] text-muted-foreground">
          <span>Manj</span>
          <div className="flex gap-0.5">
            <div className="h-3 w-3 rounded bg-muted/30" />
            <div className="h-3 w-3 rounded bg-emerald-200" />
            <div className="h-3 w-3 rounded bg-emerald-300" />
            <div className="h-3 w-3 rounded bg-amber-300" />
            <div className="h-3 w-3 rounded bg-amber-400" />
            <div className="h-3 w-3 rounded bg-orange-500" />
            <div className="h-3 w-3 rounded bg-rose-500" />
          </div>
          <span>Več</span>
        </div>
      </Card>

      {/* Peak times */}
      <Card className="p-4">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
          <Flame className="h-4 w-4 text-rose-500" />
          Top 5 najboljših časov
        </h3>
        <div className="space-y-1.5">
          {data.peakTimes.map((peak, i) => (
            <div
              key={i}
              className="flex items-center justify-between gap-2 rounded-md border border-border/40 p-2"
            >
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-100 text-xs font-bold text-amber-700 dark:bg-amber-950/50 dark:text-amber-400">
                  {i + 1}
                </span>
                <span className="text-sm font-medium">{peak.label}</span>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <Badge variant="outline">{peak.count} računov</Badge>
                <span className="font-bold tabular-nums">{formatEUR(peak.revenue)}</span>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Day totals */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-4">
          <h3 className="mb-3 text-sm font-semibold">Promet po dnevih v tednu</h3>
          <div className="space-y-1.5">
            {data.dayTotals.map((d) => {
              const maxDayRev = Math.max(...data.dayTotals.map((x) => x.avgPerDay), 1);
              return (
                <div key={d.day} className="flex items-center gap-2">
                  <span className="w-10 shrink-0 text-[10px] text-muted-foreground">
                    {data.dayNamesShort[d.day]}
                  </span>
                  <div className="relative h-5 flex-1 overflow-hidden rounded bg-muted/50">
                    <div
                      className="h-full rounded bg-gradient-to-r from-amber-400 to-orange-500"
                      style={{ width: `${(d.avgPerDay / maxDayRev) * 100}%` }}
                    />
                    <span className="absolute inset-y-0 left-2 flex items-center text-[10px] font-medium">
                      {formatEUR(d.avgPerDay)}
                    </span>
                  </div>
                  <span className="w-12 shrink-0 text-right text-[10px] text-muted-foreground">
                    {d.count} rač.
                  </span>
                </div>
              );
            })}
          </div>
        </Card>

        <Card className="p-4">
          <h3 className="mb-3 text-sm font-semibold">Promet po urah</h3>
          <div className="space-y-1.5 max-h-64 overflow-y-auto">
            {data.hourTotals.filter((h) => h.count > 0).map((h) => {
              const maxHourRev = Math.max(...data.hourTotals.map((x) => x.revenue), 1);
              return (
                <div key={h.hour} className="flex items-center gap-2">
                  <span className="w-10 shrink-0 text-[10px] text-muted-foreground">
                    {h.hour}:00
                  </span>
                  <div className="relative h-5 flex-1 overflow-hidden rounded bg-muted/50">
                    <div
                      className="h-full rounded bg-gradient-to-r from-sky-400 to-blue-500"
                      style={{ width: `${(h.revenue / maxHourRev) * 100}%` }}
                    />
                    <span className="absolute inset-y-0 left-2 flex items-center text-[10px] font-medium">
                      {formatEUR(h.revenue)}
                    </span>
                  </div>
                  <span className="w-12 shrink-0 text-right text-[10px] text-muted-foreground">
                    {h.count} rač.
                  </span>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}
