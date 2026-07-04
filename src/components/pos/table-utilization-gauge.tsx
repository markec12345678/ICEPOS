"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Gauge, Users, Clock, TrendingUp, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface GaugeData {
  gauge: {
    utilizationPct: number;
    seatUtilizationPct: number;
    status: "empty" | "low" | "moderate" | "busy" | "full";
    totalTables: number;
    occupiedTables: number;
    freeTables: number;
    totalSeats: number;
    occupiedSeats: number;
    avgOccupancyMinutes: number;
    turnoverToday: number;
  };
  sections: {
    section: string;
    total: number;
    occupied: number;
    free: number;
    seats: number;
    occupiedSeats: number;
    utilizationPct: number;
  }[];
  longestOccupied: {
    tableName: string;
    tableNumber: number;
    section: string;
    minutes: number;
    items: number;
  }[];
}

const STATUS_CONFIG = {
  empty: { label: "Prazno", color: "#64748b", bg: "text-slate-500" },
  low: { label: "Nizko", color: "#10b981", bg: "text-emerald-500" },
  moderate: { label: "Zmerno", color: "#f59e0b", bg: "text-amber-500" },
  busy: { label: "Polno", color: "#f97316", bg: "text-orange-500" },
  full: { label: "Popolno", color: "#ef4444", bg: "text-rose-500" },
};

const SECTION_ICONS: Record<string, string> = {
  Dvorana: "🏛️",
  Terasa: "🌿",
  Zasebna: "🔒",
  Bar: "🍸",
};

function formatDuration(min: number): string {
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

// SVG gauge komponenta
function GaugeSVG({ value, color, label }: { value: number; color: string; label: string }) {
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference * 0.75; // 270 stopinj lok
  return (
    <div className="relative flex h-40 w-40 items-center justify-center">
      <svg className="h-full w-full -rotate-[135deg]" viewBox="0 0 160 160">
        {/* Background */}
        <circle
          cx="80" cy="80" r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="12"
          className="text-muted/30"
          strokeDasharray={`${circumference * 0.75} ${circumference}`}
          strokeLinecap="round"
        />
        {/* Value */}
        <circle
          cx="80" cy="80" r={radius}
          fill="none"
          stroke={color}
          strokeWidth="12"
          strokeDasharray={`${circumference * 0.75} ${circumference}`}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 1s ease-out, stroke 0.5s" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <p className="text-3xl font-bold tabular-nums" style={{ color }}>{value}%</p>
        <p className="text-[10px] text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

export function TableUtilizationGauge() {
  const [data, setData] = useState<GaugeData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/tables/utilization-gauge");
        if (!res.ok) return;
        setData(await res.json());
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading || !data) {
    return (
      <Card className="p-5">
        <Skeleton className="mb-4 h-6 w-48" />
        <div className="flex justify-center">
          <Skeleton className="h-40 w-40 rounded-full" />
        </div>
      </Card>
    );
  }

  const { gauge, sections, longestOccupied } = data;
  const statusConfig = STATUS_CONFIG[gauge.status];

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between border-b bg-muted/30 p-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <Gauge className="h-4 w-4 text-amber-600" />
          Zasedenost miz v realnem času
        </h3>
        <Badge
          variant="outline"
          className={cn("text-[10px] font-bold", statusConfig.bg)}
        >
          {statusConfig.label}
        </Badge>
      </div>

      <div className="grid gap-4 p-4 sm:grid-cols-2">
        {/* Gauge */}
        <div className="flex flex-col items-center">
          <GaugeSVG value={gauge.utilizationPct} color={statusConfig.color} label="mize zasedene" />
          {/* Mini stats pod gauge */}
          <div className="mt-2 grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="text-lg font-bold text-amber-600 dark:text-amber-400">{gauge.occupiedTables}</p>
              <p className="text-[9px] text-muted-foreground">zasedene</p>
            </div>
            <div>
              <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{gauge.freeTables}</p>
              <p className="text-[9px] text-muted-foreground">proste</p>
            </div>
            <div>
              <p className="text-lg font-bold text-sky-600 dark:text-sky-400">{gauge.totalTables}</p>
              <p className="text-[9px] text-muted-foreground">skupaj</p>
            </div>
          </div>
        </div>

        {/* KPI + sections */}
        <div className="space-y-3">
          {/* KPI */}
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-lg bg-muted/30 p-2 text-center">
              <Users className="mx-auto h-3.5 w-3.5 text-violet-500" />
              <p className="mt-0.5 text-sm font-bold">{gauge.seatUtilizationPct}%</p>
              <p className="text-[9px] text-muted-foreground">sedišč zasedenih</p>
            </div>
            <div className="rounded-lg bg-muted/30 p-2 text-center">
              <Clock className="mx-auto h-3.5 w-3.5 text-sky-500" />
              <p className="mt-0.5 text-sm font-bold">{formatDuration(gauge.avgOccupancyMinutes)}</p>
              <p className="text-[9px] text-muted-foreground">povp. čas mize</p>
            </div>
            <div className="rounded-lg bg-muted/30 p-2 text-center">
              <TrendingUp className="mx-auto h-3.5 w-3.5 text-emerald-500" />
              <p className="mt-0.5 text-sm font-bold">{gauge.turnoverToday}</p>
              <p className="text-[9px] text-muted-foreground">osvobojene danes</p>
            </div>
            <div className="rounded-lg bg-muted/30 p-2 text-center">
              <Users className="mx-auto h-3.5 w-3.5 text-amber-500" />
              <p className="mt-0.5 text-sm font-bold">{gauge.occupiedSeats}/{gauge.totalSeats}</p>
              <p className="text-[9px] text-muted-foreground">gostov sedi</p>
            </div>
          </div>

          {/* Sections */}
          <div className="space-y-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Po sekcijah</p>
            {sections.map((s) => {
              const icon = SECTION_ICONS[s.section] || "🍽️";
              const color = s.utilizationPct >= 90 ? "bg-rose-400" : s.utilizationPct >= 60 ? "bg-orange-400" : s.utilizationPct >= 30 ? "bg-amber-400" : "bg-emerald-400";
              return (
                <div key={s.section} className="flex items-center gap-2 text-xs">
                  <span className="w-20 shrink-0">{icon} {s.section}</span>
                  <div className="relative h-4 flex-1 overflow-hidden rounded bg-muted/50">
                    <div className={cn("h-full rounded", color)} style={{ width: `${s.utilizationPct}%` }} />
                    <span className="absolute inset-y-0 left-2 flex items-center text-[9px] font-medium">
                      {s.occupied}/{s.total} miz
                    </span>
                  </div>
                  <span className="w-8 shrink-0 text-right text-[10px] font-bold">{s.utilizationPct}%</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Najdlje odprte mize */}
      {longestOccupied.length > 0 && (
        <div className="border-t p-3">
          <p className="mb-2 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            <AlertCircle className="h-3 w-3 text-amber-500" />
            Najdlje odprte mize
          </p>
          <div className="flex flex-wrap gap-2">
            {longestOccupied.map((t, i) => (
              <div
                key={i}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg border px-2 py-1 text-xs",
                  t.minutes >= 90 ? "border-rose-300 bg-rose-50 dark:border-rose-800 dark:bg-rose-950/20" :
                  t.minutes >= 45 ? "border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/20" :
                  "border-border bg-muted/30"
                )}
              >
                <span className="font-medium">#{t.tableNumber} {t.tableName}</span>
                <span className="text-muted-foreground">{t.items} postavk</span>
                <span className={cn(
                  "font-bold tabular-nums",
                  t.minutes >= 90 ? "text-rose-600 dark:text-rose-400" :
                  t.minutes >= 45 ? "text-amber-600 dark:text-amber-400" : ""
                )}>
                  {formatDuration(t.minutes)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}
