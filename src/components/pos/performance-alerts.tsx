"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, TrendingDown, TrendingUp, Skull, Star, Bell } from "lucide-react";
import { formatEUR } from "@/lib/types";
import { cn } from "@/lib/utils";

interface AlertData {
  alerts: {
    id: string;
    name: string;
    category: string;
    price: number;
    imageUrl: string | null;
    type: "drop" | "surge" | "dead" | "rising-star" | "low-margin";
    severity: "critical" | "warning" | "info" | "success";
    message: string;
    thisWeekQty: number;
    lastWeekQty: number;
    monthAvg: number;
    changePct: number;
    revenue: number;
  }[];
  summary: { total: number; critical: number; warning: number; info: number; success: number };
}

const SEVERITY_CONFIG = {
  critical: { bg: "border-rose-300 bg-rose-50/50 dark:border-rose-800 dark:bg-rose-950/20", icon: AlertCircle, iconColor: "text-rose-500" },
  warning: { bg: "border-amber-300 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/20", icon: AlertCircle, iconColor: "text-amber-500" },
  info: { bg: "border-sky-300 bg-sky-50/50 dark:border-sky-800 dark:bg-sky-950/20", icon: Star, iconColor: "text-sky-500" },
  success: { bg: "border-emerald-300 bg-emerald-50/50 dark:border-emerald-800 dark:bg-emerald-950/20", icon: TrendingUp, iconColor: "text-emerald-500" },
};

const TYPE_ICONS = {
  drop: TrendingDown,
  surge: TrendingUp,
  dead: Skull,
  "rising-star": Star,
  "low-margin": AlertCircle,
};

export function PerformanceAlerts() {
  const [data, setData] = useState<AlertData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/menu/performance-alerts")
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading || !data) {
    return (
      <Card className="p-5">
        <Skeleton className="mb-4 h-6 w-48" />
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-14" />
          ))}
        </div>
      </Card>
    );
  }

  if (data.alerts.length === 0) {
    return null;
  }

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between border-b bg-muted/30 p-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <Bell className="h-4 w-4 text-amber-600" />
          Opozorila o performance
          <Badge variant="secondary" className="text-[10px]">
            {data.summary.total}
          </Badge>
        </h3>
        <div className="flex items-center gap-1.5">
          {data.summary.critical > 0 && (
            <Badge variant="destructive" className="text-[10px]">{data.summary.critical}</Badge>
          )}
          {data.summary.warning > 0 && (
            <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-400 text-[10px]">
              {data.summary.warning}
            </Badge>
          )}
          {data.summary.success > 0 && (
            <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-400 text-[10px]">
              {data.summary.success}
            </Badge>
          )}
        </div>
      </div>

      <div className="max-h-96 divide-y overflow-y-auto">
        {data.alerts.map((alert) => {
          const config = SEVERITY_CONFIG[alert.severity];
          const SevIcon = config.icon;
          const TypeIcon = TYPE_ICONS[alert.type];
          return (
            <div key={alert.id} className={cn("flex items-start gap-3 p-3", config.bg)}>
              {/* Image or icon */}
              {alert.imageUrl ? (
                <img
                  src={alert.imageUrl}
                  alt={alert.name}
                  className="h-10 w-10 shrink-0 rounded-lg object-cover"
                />
              ) : (
                <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted", config.iconColor)}>
                  <TypeIcon className="h-5 w-5" />
                </div>
              )}

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-medium">{alert.name}</p>
                  <Badge variant="outline" className="text-[9px]">{alert.category}</Badge>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">{alert.message}</p>
                {/* Mini stats */}
                <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
                  <span>Ta teden: <strong className="text-foreground">{alert.thisWeekQty}×</strong></span>
                  <span>·</span>
                  <span>Prejšnji: <strong className="text-foreground">{alert.lastWeekQty}×</strong></span>
                  <span>·</span>
                  <span>Povprečje: <strong className="text-foreground">{alert.monthAvg}×</strong></span>
                  {alert.revenue > 0 && (
                    <>
                      <span>·</span>
                      <span className="text-emerald-600 dark:text-emerald-400">{formatEUR(alert.revenue)}</span>
                    </>
                  )}
                </div>
              </div>

              {/* Change badge */}
              {alert.changePct !== 0 && alert.type !== "dead" && (
                <div className="shrink-0">
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-[10px] font-bold tabular-nums",
                      alert.changePct > 0
                        ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-400"
                        : "border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950/50 dark:text-rose-400"
                    )}
                  >
                    {alert.changePct > 0 ? "+" : ""}{alert.changePct}%
                  </Badge>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}
