"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { UserX, TrendingDown, Calendar, AlertTriangle, Phone } from "lucide-react";
import { formatEUR } from "@/lib/types";
import { cn } from "@/lib/utils";

interface NoShowData {
  summary: {
    total: number;
    confirmed: number;
    seated: number;
    cancelled: number;
    noShows: number;
    noShowRate: number;
    cancelRate: number;
    totalLostValue: number;
  };
  repeatOffenders: { name: string; phone: string | null; total: number; noShows: number; cancellations: number }[];
  byDayOfWeek: { day: number; dayName: string; total: number; noShows: number; noShowRate: number }[];
  recentNoShows: {
    id: string;
    customerName: string;
    customerPhone: string | null;
    partySize: number;
    date: string;
    time: string;
    tableName: string | null;
    note: string | null;
  }[];
  days: number;
}

export function NoShowStats() {
  const [data, setData] = useState<NoShowData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/reservations/no-show-stats?days=90")
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
  const maxDayTotal = Math.max(...data.byDayOfWeek.map((d) => d.total), 1);

  return (
    <div className="space-y-4">
      {/* KPI */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">No-show rate</p>
            <UserX className="h-4 w-4 text-rose-500" />
          </div>
          <p className={cn(
            "mt-2 text-2xl font-bold",
            summary.noShowRate > 15 ? "text-rose-600 dark:text-rose-400" : summary.noShowRate > 5 ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"
          )}>
            {summary.noShowRate}%
          </p>
          <p className="text-[10px] text-muted-foreground">{summary.noShows} od {summary.total}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Ocenjena izguba</p>
            <TrendingDown className="h-4 w-4 text-rose-500" />
          </div>
          <p className="mt-2 text-2xl font-bold text-rose-600 dark:text-rose-400">
            {formatEUR(summary.totalLostValue)}
          </p>
          <p className="text-[10px] text-muted-foreground">~25€/osebo</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Cancel rate</p>
            <Calendar className="h-4 w-4 text-amber-500" />
          </div>
          <p className="mt-2 text-2xl font-bold text-amber-600 dark:text-amber-400">
            {summary.cancelRate}%
          </p>
          <p className="text-[10px] text-muted-foreground">{summary.cancelled} preklicov</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Usp. sedeži</p>
            <Calendar className="h-4 w-4 text-emerald-500" />
          </div>
          <p className="mt-2 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {summary.seated}
          </p>
          <p className="text-[10px] text-muted-foreground">od {summary.total}</p>
        </Card>
      </div>

      {/* Repeat offenders */}
      {data.repeatOffenders.length > 0 && (
        <Card className="overflow-hidden border-rose-300 dark:border-rose-800">
          <div className="border-b bg-rose-50 p-3 dark:bg-rose-950/20">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-rose-700 dark:text-rose-400">
              <AlertTriangle className="h-4 w-4" />
              Pogosti no-show (2+)
              <Badge variant="destructive" className="text-[10px]">{data.repeatOffenders.length}</Badge>
            </h3>
          </div>
          <div className="divide-y">
            {data.repeatOffenders.slice(0, 10).map((offender, i) => (
              <div key={i} className="flex items-center justify-between gap-2 p-3">
                <div className="flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-rose-100 text-xs font-bold text-rose-700 dark:bg-rose-950/50 dark:text-rose-400">
                    {i + 1}
                  </span>
                  <div>
                    <p className="text-sm font-medium">{offender.name}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {offender.total} rezervacij · {offender.noShows} no-show · {offender.cancellations} preklicov
                    </p>
                  </div>
                </div>
                {offender.phone && (
                  <a
                    href={`tel:${offender.phone}`}
                    className="flex h-7 w-7 items-center justify-center rounded-md bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
                    title={`Klic: ${offender.phone}`}
                  >
                    <Phone className="h-3.5 w-3.5" />
                  </a>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Po dnevih v tednu */}
        <Card className="p-4">
          <h3 className="mb-3 text-sm font-semibold">No-show po dnevih v tednu</h3>
          <div className="space-y-1.5">
            {data.byDayOfWeek.map((d) => (
              <div key={d.day} className="flex items-center gap-2">
                <span className="w-20 shrink-0 text-[10px] text-muted-foreground">
                  {d.dayName}
                </span>
                <div className="relative h-5 flex-1 overflow-hidden rounded bg-muted/50">
                  <div
                    className={cn(
                      "h-full rounded transition-all",
                      d.noShowRate > 15 ? "bg-rose-400" : d.noShowRate > 5 ? "bg-amber-400" : "bg-emerald-400"
                    )}
                    style={{ width: `${(d.total / maxDayTotal) * 100}%` }}
                  />
                  <span className="absolute inset-y-0 left-2 flex items-center text-[10px] font-medium">
                    {d.total} rez.
                  </span>
                </div>
                <span className="w-14 shrink-0 text-right text-[10px] font-semibold">
                  {d.noShows} NS ({d.noShowRate}%)
                </span>
              </div>
            ))}
          </div>
        </Card>

        {/* Recent no-shows */}
        <Card className="overflow-hidden">
          <div className="border-b bg-muted/30 p-3">
            <h3 className="text-sm font-semibold">Zadnji no-show</h3>
          </div>
          <div className="max-h-64 divide-y overflow-y-auto">
            {data.recentNoShows.length === 0 ? (
              <p className="p-4 text-center text-sm text-muted-foreground">
                Ni no-showov v zadnjih {data.days} dneh 🎉
              </p>
            ) : (
              data.recentNoShows.map((ns) => (
                <div key={ns.id} className="flex items-center justify-between gap-2 p-2.5 text-xs">
                  <div>
                    <p className="font-medium">{ns.customerName}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {new Date(ns.date).toLocaleDateString("sl-SI")} · {ns.time} · {ns.partySize} oseb
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-muted-foreground">{ns.tableName}</p>
                    {ns.note && <p className="text-[9px] italic text-amber-600">📝 {ns.note}</p>}
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
