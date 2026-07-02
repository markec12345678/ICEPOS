"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { UserCircle, Clock, TrendingUp, Coins, Receipt } from "lucide-react";
import { formatEUR } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useNow } from "@/hooks/use-now";

interface OperatorStatus {
  operator: string;
  openTables: number;
  totalItems: number;
  tableNames: string[];
  oldestOrderMinutes: number;
  todayRevenue: number;
  todayTips: number;
  todayOrders: number;
}

function formatDuration(min: number): string {
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export function LiveServerStatus() {
  const [data, setData] = useState<{ operators: OperatorStatus[]; totalOpen: number; totalRevenue: number; totalTips: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const now = useNow(30000); // za relative time

  async function load() {
    try {
      const res = await fetch("/api/operators/live-status");
      if (!res.ok) throw new Error("Napaka");
      setData(await res.json());
    } catch {
      // tiha napaka
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <Card className="p-5">
        <Skeleton className="mb-4 h-6 w-48" />
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      </Card>
    );
  }

  if (!data || data.operators.length === 0) {
    return null;
  }

  const activeServers = data.operators.filter((o) => o.openTables > 0);

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between border-b bg-muted/30 p-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <UserCircle className="h-4 w-4 text-amber-600" />
          Aktivni natakarji
          <Badge variant="secondary" className="text-[10px]">
            {activeServers.length} online
          </Badge>
        </h3>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Receipt className="h-3 w-3" />
            {data.totalOpen} odprtih
          </span>
          <span className="flex items-center gap-1">
            <TrendingUp className="h-3 w-3" />
            {formatEUR(data.totalRevenue)}
          </span>
        </div>
      </div>

      <div className="divide-y">
        {activeServers.map((op) => {
          const urgency = op.oldestOrderMinutes >= 90 ? "urgent" : op.oldestOrderMinutes >= 45 ? "warning" : "normal";
          return (
            <div key={op.operator} className="flex items-center gap-3 p-3">
              {/* Avatar z inicialko */}
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-sm font-bold text-white">
                {op.operator.charAt(0).toUpperCase()}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate font-medium">{op.operator}</p>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <TrendingUp className="h-3 w-3" />
                      <strong className="text-foreground">{formatEUR(op.todayRevenue)}</strong>
                    </span>
                    {op.todayTips > 0 && (
                      <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                        <Coins className="h-3 w-3" />
                        {formatEUR(op.todayTips)}
                      </span>
                    )}
                  </div>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Receipt className="h-3 w-3" />
                    <strong className="text-foreground">{op.openTables}</strong> miz
                  </span>
                  <span>·</span>
                  <span><strong className="text-foreground">{op.totalItems}</strong> postavk</span>
                  <span>·</span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    najstarejša:{" "}
                    <span className={cn(
                      "font-semibold",
                      urgency === "urgent" && "text-rose-600 dark:text-rose-400",
                      urgency === "warning" && "text-amber-600 dark:text-amber-400",
                      urgency === "normal" && "text-foreground"
                    )}>
                      {formatDuration(op.oldestOrderMinutes)}
                    </span>
                  </span>
                  <span>·</span>
                  <span>{op.todayOrders} računov danes</span>
                </div>
                {/* Mize badge-ovi */}
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {op.tableNames.slice(0, 8).map((name, i) => (
                    <Badge key={i} variant="outline" className="text-[10px] py-0">
                      {name}
                    </Badge>
                  ))}
                  {op.tableNames.length > 8 && (
                    <Badge variant="outline" className="text-[10px] py-0">
                      +{op.tableNames.length - 8}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
