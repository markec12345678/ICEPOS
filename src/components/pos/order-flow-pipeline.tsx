"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Receipt, Clock, CheckCircle2, XCircle, TrendingUp, Zap, Timer } from "lucide-react";
import { formatEUR } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useNow } from "@/hooks/use-now";

interface FlowData {
  pipeline: {
    open: { count: number; items: number; value: number; avgAge: number };
    paid: { count: number; items: number; value: number; avgTime: number };
    storno: { count: number; value: number };
  };
  timing: {
    avgOrderToPay: number;
    minTime: number;
    maxTime: number;
    p50: number;
    p90: number;
    sampleSize: number;
  };
  hourly: { hour: number; open: number; paid: number; revenue: number }[];
  conversionRate: number;
  totalOrders: number;
  activeOrders: {
    id: string;
    tableName: string;
    tableNumber: number;
    createdAt: string;
    ageMinutes: number;
    itemCount: number;
    operator: string;
    flags: string | null;
  }[];
}

function formatDuration(min: number): string {
  if (min < 1) return "<1m";
  if (min < 60) return `${Math.round(min)}m`;
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export function OrderFlowPipeline() {
  const [data, setData] = useState<FlowData | null>(null);
  const [loading, setLoading] = useState(true);
  const now = useNow(30000);

  async function load() {
    try {
      const res = await fetch("/api/order-flow");
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
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading || !data) {
    return (
      <Card className="p-5">
        <Skeleton className="mb-4 h-6 w-48" />
        <div className="grid grid-cols-3 gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      </Card>
    );
  }

  const { pipeline, timing } = data;
  const maxHourlyRevenue = Math.max(...data.hourly.map((h) => h.revenue), 1);

  return (
    <div className="space-y-4">
      {/* Pipeline stages */}
      <Card className="overflow-hidden">
        <div className="border-b bg-muted/30 p-3">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <Receipt className="h-4 w-4 text-amber-600" />
            Tok naročil danes
            <Badge variant="secondary" className="text-[10px]">
              {data.totalOrders} skupaj
            </Badge>
            {data.conversionRate > 0 && (
              <Badge variant="outline" className="text-[10px] border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-400">
                {data.conversionRate}% konverzija
              </Badge>
            )}
          </h3>
        </div>

        {/* Pipeline visual */}
        <div className="grid grid-cols-3 gap-0">
          {/* Open */}
          <div className="border-r border-border/40 p-4 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400">
              <Clock className="h-6 w-6" />
            </div>
            <p className="mt-2 text-3xl font-bold text-amber-600 dark:text-amber-400">
              {pipeline.open.count}
            </p>
            <p className="text-xs font-medium">Odprta</p>
            <div className="mt-1 space-y-0.5 text-[10px] text-muted-foreground">
              <p>{pipeline.open.items} postavk</p>
              <p>povp. {formatDuration(pipeline.open.avgAge)} starost</p>
            </div>
          </div>

          {/* Arrow */}
          <div className="flex items-center justify-center">
            <div className="h-full w-px bg-border" />
          </div>

          {/* Paid */}
          <div className="border-l border-border/40 p-4 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <p className="mt-2 text-3xl font-bold text-emerald-600 dark:text-emerald-400">
              {pipeline.paid.count}
            </p>
            <p className="text-xs font-medium">Plačana</p>
            <div className="mt-1 space-y-0.5 text-[10px] text-muted-foreground">
              <p>{formatEUR(pipeline.paid.value)}</p>
              <p>{pipeline.paid.items} postavk</p>
            </div>
          </div>
        </div>

        {/* Storno (if any) */}
        {pipeline.storno.count > 0 && (
          <div className="flex items-center justify-center gap-2 border-t border-border/40 p-2 text-xs">
            <XCircle className="h-3.5 w-3.5 text-rose-500" />
            <span className="text-rose-600 dark:text-rose-400">
              {pipeline.storno.count} storniranih (-{formatEUR(pipeline.storno.value)})
            </span>
          </div>
        )}
      </Card>

      {/* Timing stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="p-3">
          <div className="flex items-center justify-between">
            <p className="text-[10px] text-muted-foreground">Povp. čas (order → pay)</p>
            <Timer className="h-3.5 w-3.5 text-sky-500" />
          </div>
          <p className="mt-1 text-xl font-bold text-sky-600 dark:text-sky-400">
            {formatDuration(timing.avgOrderToPay)}
          </p>
        </Card>
        <Card className="p-3">
          <div className="flex items-center justify-between">
            <p className="text-[10px] text-muted-foreground">Median (P50)</p>
            <Zap className="h-3.5 w-3.5 text-emerald-500" />
          </div>
          <p className="mt-1 text-xl font-bold text-emerald-600 dark:text-emerald-400">
            {formatDuration(timing.p50)}
          </p>
        </Card>
        <Card className="p-3">
          <div className="flex items-center justify-between">
            <p className="text-[10px] text-muted-foreground">P90 (počasni 10%)</p>
            <Clock className="h-3.5 w-3.5 text-amber-500" />
          </div>
          <p className="mt-1 text-xl font-bold text-amber-600 dark:text-amber-400">
            {formatDuration(timing.p90)}
          </p>
        </Card>
        <Card className="p-3">
          <div className="flex items-center justify-between">
            <p className="text-[10px] text-muted-foreground">Najdaljši</p>
            <TrendingUp className="h-3.5 w-3.5 text-rose-500" />
          </div>
          <p className="mt-1 text-xl font-bold text-rose-600 dark:text-rose-400">
            {formatDuration(timing.maxTime)}
          </p>
        </Card>
      </div>

      {/* Hourly flow */}
      {data.hourly.length > 0 && (
        <Card className="p-4">
          <h3 className="mb-3 text-sm font-semibold">Urni tok (danes)</h3>
          <div className="flex h-24 items-end gap-1">
            {data.hourly.map((h) => (
              <div key={h.hour} className="group flex flex-1 flex-col items-center gap-1">
                <div className="relative flex w-full flex-1 flex-col justify-end gap-px">
                  {/* Paid bar */}
                  <div
                    className="w-full rounded-t bg-emerald-400 transition-all hover:bg-emerald-500"
                    style={{ height: `${Math.max((h.paid / Math.max(...data.hourly.map((x) => Math.max(x.open, x.paid)), 1)) * 50, h.paid > 0 ? 4 : 0)}%` }}
                    title={`${h.hour}:00 — ${h.paid} plačanih`}
                  />
                  {/* Open bar */}
                  <div
                    className="w-full rounded-b bg-amber-400 transition-all hover:bg-amber-500"
                    style={{ height: `${Math.max((h.open / Math.max(...data.hourly.map((x) => Math.max(x.open, x.paid)), 1)) * 50, h.open > 0 ? 4 : 0)}%` }}
                    title={`${h.hour}:00 — ${h.open} odprtih`}
                  />
                </div>
                <span className="text-[8px] text-muted-foreground">{h.hour}</span>
              </div>
            ))}
          </div>
          <div className="mt-2 flex items-center justify-center gap-3 text-[10px]">
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded bg-amber-400" />
              Odprta
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded bg-emerald-400" />
              Plačana
            </span>
          </div>
        </Card>
      )}

      {/* Active orders list */}
      {data.activeOrders.length > 0 && (
        <Card className="overflow-hidden">
          <div className="border-b bg-muted/30 p-3">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <Clock className="h-4 w-4 text-amber-500" />
              Najstarejša odprta naročila
            </h3>
          </div>
          <div className="divide-y">
            {data.activeOrders.map((order) => {
              const urgency = order.ageMinutes >= 90 ? "urgent" : order.ageMinutes >= 45 ? "warning" : "normal";
              return (
                <div key={order.id} className="flex items-center gap-3 p-2.5">
                  <div className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold",
                    urgency === "urgent" && "bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400",
                    urgency === "warning" && "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400",
                    urgency === "normal" && "bg-muted text-foreground"
                  )}>
                    #{order.tableNumber}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{order.tableName}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {order.itemCount} postavk · {order.operator}
                    </p>
                  </div>
                  <span className={cn(
                    "shrink-0 text-sm font-bold tabular-nums",
                    urgency === "urgent" && "text-rose-600 dark:text-rose-400",
                    urgency === "warning" && "text-amber-600 dark:text-amber-400",
                    urgency === "normal" && "text-foreground"
                  )}>
                    {formatDuration(order.ageMinutes)}
                  </span>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}
