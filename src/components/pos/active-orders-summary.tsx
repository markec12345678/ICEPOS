"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Clock, AlertCircle, Receipt, Users, Crown, Cake, Zap, ShieldAlert } from "lucide-react";
import { formatEUR } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useNow } from "@/hooks/use-now";
import { usePosStore } from "@/stores/pos-store";
import { OrderFlagsDisplay } from "@/components/pos/order-flags";

interface ActiveOrder {
  id: string;
  tableId: string;
  tableName: string;
  tableNumber: number;
  section: string;
  seats: number;
  operator: string;
  createdAt: string;
  elapsed: number;
  urgency: "normal" | "warning" | "urgent";
  itemCount: number;
  total: number;
  flags: string[];
  byCategory: Record<string, number>;
  hasNotes: boolean;
  hasFlags: boolean;
}

interface ActiveData {
  orders: ActiveOrder[];
  summary: {
    totalOrders: number;
    totalItems: number;
    totalValue: number;
    urgentCount: number;
    warningCount: number;
    avgElapsed: number;
    flaggedCount: number;
  };
}

function formatElapsed(min: number): string {
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export function ActiveOrdersSummary() {
  const [data, setData] = useState<ActiveData | null>(null);
  const [loading, setLoading] = useState(true);
  const now = useNow(30000);
  const selectTable = usePosStore((s) => s.selectTable);

  async function load() {
    try {
      const res = await fetch("/api/orders/active-summary");
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
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      </Card>
    );
  }

  if (data.summary.totalOrders === 0) {
    return null;
  }

  const { summary } = data;

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between border-b bg-muted/30 p-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <Receipt className="h-4 w-4 text-amber-600" />
          Aktivna naročila
          <Badge variant="secondary" className="text-[10px]">
            {summary.totalOrders}
          </Badge>
          {summary.urgentCount > 0 && (
            <Badge variant="destructive" className="animate-pulse text-[10px]">
              {summary.urgentCount} URGENTNO
            </Badge>
          )}
        </h3>
        <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
          <span>{summary.totalItems} postavk</span>
          <span className="font-bold">{formatEUR(summary.totalValue)}</span>
        </div>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 gap-2 p-3 sm:grid-cols-4">
        <div className="rounded-lg bg-amber-50 p-2 dark:bg-amber-950/20">
          <p className="text-[10px] text-muted-foreground">Skupaj</p>
          <p className="text-lg font-bold text-amber-600 dark:text-amber-400">{summary.totalOrders}</p>
        </div>
        <div className="rounded-lg bg-rose-50 p-2 dark:bg-rose-950/20">
          <p className="text-[10px] text-muted-foreground">Urgentno (&gt;90m)</p>
          <p className="text-lg font-bold text-rose-600 dark:text-rose-400">{summary.urgentCount}</p>
        </div>
        <div className="rounded-lg bg-sky-50 p-2 dark:bg-sky-950/20">
          <p className="text-[10px] text-muted-foreground">Povp. čas</p>
          <p className="text-lg font-bold text-sky-600 dark:text-sky-400">{formatElapsed(summary.avgElapsed)}</p>
        </div>
        <div className="rounded-lg bg-violet-50 p-2 dark:bg-violet-950/20">
          <p className="text-[10px] text-muted-foreground">Z oznakami</p>
          <p className="text-lg font-bold text-violet-600 dark:text-violet-400">{summary.flaggedCount}</p>
        </div>
      </div>

      {/* Seznam naročil */}
      <div className="max-h-96 divide-y overflow-y-auto">
        {data.orders.map((order) => (
          <button
            key={order.id}
            onClick={() => selectTable(order.tableId)}
            className={cn(
              "flex w-full items-center gap-3 p-3 text-left transition-colors hover:bg-muted/30",
              order.urgency === "urgent" && "bg-rose-50/30 dark:bg-rose-950/10",
              order.urgency === "warning" && "bg-amber-50/30 dark:bg-amber-950/10"
            )}
          >
            {/* Table number */}
            <div className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-sm font-bold",
              order.urgency === "urgent"
                ? "bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400"
                : order.urgency === "warning"
                ? "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400"
                : "bg-muted text-foreground"
            )}>
              #{order.tableNumber}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="truncate text-sm font-medium">{order.tableName}</p>
                {order.hasFlags && <OrderFlagsDisplay flags={JSON.stringify(order.flags)} />}
              </div>
              <div className="flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
                <span className="flex items-center gap-0.5">
                  <Users className="h-2.5 w-2.5" />
                  {order.seats} sed.
                </span>
                <span>·</span>
                <span>{order.itemCount} postavk</span>
                <span>·</span>
                <span>{order.operator}</span>
                {order.hasNotes && <span className="text-amber-600 dark:text-amber-400">· 📝 opombe</span>}
              </div>
              {/* Top kategorije */}
              {Object.keys(order.byCategory).length > 0 && (
                <div className="mt-1 flex flex-wrap gap-1">
                  {Object.entries(order.byCategory).slice(0, 3).map(([cat, qty]) => (
                    <span key={cat} className="rounded bg-muted/50 px-1 text-[9px] text-muted-foreground">
                      {cat}: {qty}×
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Time + total */}
            <div className="shrink-0 text-right">
              <div className={cn(
                "flex items-center justify-end gap-1 text-xs font-bold tabular-nums",
                order.urgency === "urgent" ? "text-rose-600 dark:text-rose-400" :
                order.urgency === "warning" ? "text-amber-600 dark:text-amber-400" :
                "text-foreground"
              )}>
                {order.urgency === "urgent" && <AlertCircle className="h-3 w-3" />}
                <Clock className="h-3 w-3" />
                {formatElapsed(order.elapsed)}
              </div>
              <p className="text-sm font-bold tabular-nums">{formatEUR(order.total)}</p>
            </div>
          </button>
        ))}
      </div>
    </Card>
  );
}
