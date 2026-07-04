"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Trophy, TrendingUp, Calendar, Users, Clock } from "lucide-react";
import { formatEUR } from "@/lib/types";
import { cn } from "@/lib/utils";

interface ComparisonData {
  summary: {
    totalRevenue: number;
    totalOrders: number;
    totalShifts: number;
    avgRevenuePerShift: number;
    avgOrdersPerShift: number;
  };
  operatorStats: {
    operator: string;
    shiftCount: number;
    totalRevenue: number;
    totalOrders: number;
    avgRevenue: number;
    avgDuration: number;
    revenuePerHour: number;
    shifts: { id: string; date: string; revenue: number; orders: number; tips: number; duration: number }[];
  }[];
  dailyStats: { date: string; revenue: number; orders: number; shifts: number; avgPerShift: number }[];
  bestShift: { operator: string; date: string; revenue: number; orders: number } | null;
  bestDay: { date: string; revenue: number; orders: number; shifts: number } | null;
  days: number;
}

function formatDuration(min: number): string {
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("sl-SI", { day: "numeric", month: "short", weekday: "short" });
}

export function ShiftComparison() {
  const [data, setData] = useState<ComparisonData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/shifts/comparison?days=14")
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

  if (data.summary.totalShifts === 0) {
    return null;
  }

  const maxDailyRevenue = Math.max(...data.dailyStats.map((d) => d.revenue), 1);

  return (
    <div className="space-y-4">
      {/* KPI */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Skupni promet</p>
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          </div>
          <p className="mt-2 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {formatEUR(data.summary.totalRevenue)}
          </p>
          <p className="text-[10px] text-muted-foreground">{data.summary.totalShifts} smen</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Povp. promet/smeno</p>
            <Trophy className="h-4 w-4 text-amber-500" />
          </div>
          <p className="mt-2 text-2xl font-bold text-amber-600 dark:text-amber-400">
            {formatEUR(data.summary.avgRevenuePerShift)}
          </p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Skupaj računov</p>
            <Calendar className="h-4 w-4 text-sky-500" />
          </div>
          <p className="mt-2 text-2xl font-bold text-sky-600 dark:text-sky-400">
            {data.summary.totalOrders}
          </p>
          <p className="text-[10px] text-muted-foreground">{data.summary.avgOrdersPerShift}/smeno</p>
        </Card>
        <Card className="p-4 border-amber-300 dark:border-amber-800">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Najboljši dan</p>
            <Trophy className="h-4 w-4 text-amber-500" />
          </div>
          {data.bestDay ? (
            <>
              <p className="mt-2 text-sm font-bold text-amber-600 dark:text-amber-400">
                {formatDate(data.bestDay.date)}
              </p>
              <p className="text-[10px] text-muted-foreground">{formatEUR(data.bestDay.revenue)}</p>
            </>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">—</p>
          )}
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Po operaterjih */}
        <Card className="overflow-hidden">
          <div className="border-b bg-muted/30 p-3">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <Users className="h-4 w-4 text-sky-500" />
              Primerjava po operaterjih
            </h3>
          </div>
          <div className="divide-y max-h-80 overflow-y-auto">
            {data.operatorStats.map((op, i) => (
              <div key={op.operator} className="p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-sky-100 text-xs font-bold text-sky-700 dark:bg-sky-950/50 dark:text-sky-400">
                      {i + 1}
                    </span>
                    <div>
                      <p className="text-sm font-medium">{op.operator}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {op.shiftCount} smen · {op.totalOrders} računov
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold tabular-nums">{formatEUR(op.totalRevenue)}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {formatEUR(op.revenuePerHour)}/h
                    </p>
                  </div>
                </div>
                {/* Mini stats */}
                <div className="mt-2 grid grid-cols-3 gap-1 text-[10px]">
                  <div className="rounded bg-muted/30 px-1.5 py-0.5 text-center">
                    <span className="text-muted-foreground">Povp/smena</span>
                    <p className="font-bold">{formatEUR(op.avgRevenue)}</p>
                  </div>
                  <div className="rounded bg-muted/30 px-1.5 py-0.5 text-center">
                    <span className="text-muted-foreground">Povp. trajanje</span>
                    <p className="font-bold">{formatDuration(op.avgDuration)}</p>
                  </div>
                  <div className="rounded bg-muted/30 px-1.5 py-0.5 text-center">
                    <span className="text-muted-foreground">Računov/h</span>
                    <p className="font-bold">
                      {op.avgDuration > 0 ? (op.totalOrders / (op.avgDuration / 60 * op.shiftCount)).toFixed(1) : "0"}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Dnevni graf */}
        <Card className="overflow-hidden">
          <div className="border-b bg-muted/30 p-3">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <Calendar className="h-4 w-4 text-amber-500" />
              Promet po dnevih (zadnjih 14 dni)
            </h3>
          </div>
          <div className="p-3 space-y-1.5 max-h-80 overflow-y-auto">
            {data.dailyStats.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">Ni podatkov</p>
            ) : (
              data.dailyStats.map((d) => (
                <div key={d.date} className="flex items-center gap-2 text-xs">
                  <span className="w-24 shrink-0 text-muted-foreground">
                    {formatDate(d.date)}
                  </span>
                  <div className="relative h-5 flex-1 overflow-hidden rounded bg-muted/50">
                    <div
                      className="h-full rounded bg-gradient-to-r from-amber-400 to-orange-500"
                      style={{ width: `${(d.revenue / maxDailyRevenue) * 100}%` }}
                    />
                    <span className="absolute inset-y-0 left-2 flex items-center text-[10px] font-medium">
                      {formatEUR(d.revenue)}
                    </span>
                  </div>
                  <span className="w-16 shrink-0 text-right text-[10px] text-muted-foreground">
                    {d.shifts} smen · {d.orders} rač.
                  </span>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      {/* Najboljša smena */}
      {data.bestShift && (
        <Card className="border-amber-300 bg-amber-50/30 p-3 dark:border-amber-800 dark:bg-amber-950/10">
          <div className="flex items-center gap-2">
            <span className="text-xl">🏆</span>
            <div>
              <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">
                Najboljša smena: {data.bestShift.operator}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatDate(data.bestShift.date)} · {formatEUR(data.bestShift.revenue)} · {data.bestShift.orders} računov
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
