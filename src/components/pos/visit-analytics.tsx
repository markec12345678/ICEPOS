"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, Clock, TrendingUp, Heart, MapPin, CreditCard, Star } from "lucide-react";
import { formatEUR, formatDateTime } from "@/lib/types";
import { cn } from "@/lib/utils";

interface VisitAnalytics {
  totalVisits: number;
  totalSpent: number;
  totalTips: number;
  avgOrderValue: number;
  favoriteItems: { name: string; category: string; quantity: number; revenue: number }[];
  monthlyTrend: { month: string; visits: number; spent: number }[];
  visitFrequency: "vip" | "regular" | "occasional" | "new";
  firstVisit: string | null;
  lastVisit: string | null;
  avgDaysBetweenVisits: number;
  preferredSection: string | null;
  preferredPaymentMethod: string | null;
  preferredDayName: string | null;
}

const FREQUENCY_CONFIG = {
  vip: { label: "VIP", color: "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-400", icon: "👑" },
  regular: { label: "Redni gost", color: "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-400", icon: "⭐" },
  occasional: { label: "Občasni", color: "border-sky-300 bg-sky-50 text-sky-700 dark:border-sky-800 dark:bg-sky-950/50 dark:text-sky-400", icon: "👋" },
  new: { label: "Nov gost", color: "border-violet-300 bg-violet-50 text-violet-700 dark:border-violet-800 dark:bg-violet-950/50 dark:text-violet-400", icon: "🎉" },
};

function getPaymentLabel(method: string | null): string {
  if (!method) return "—";
  switch (method) {
    case "cash": return "Gotovina";
    case "card": return "Kartica";
    case "giftcard": return "Darilna kartica";
    default: return method;
  }
}

export function VisitAnalytics({ customerId }: { customerId: string }) {
  const [data, setData] = useState<VisitAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/customers/${customerId}/visit-analytics`)
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [customerId]);

  if (loading || !data) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-16" />
        ))}
      </div>
    );
  }

  if (data.totalVisits === 0) {
    return (
      <Card className="p-4 text-center text-sm text-muted-foreground">
        Stranka še ni imela plačanih obiskov.
      </Card>
    );
  }

  const freqConfig = FREQUENCY_CONFIG[data.visitFrequency];
  const maxMonthlySpent = Math.max(...data.monthlyTrend.map((m) => m.spent), 1);

  return (
    <div className="space-y-3">
      {/* Frequency badge */}
      <div className={cn("flex items-center justify-between rounded-lg border p-3", freqConfig.color)}>
        <div className="flex items-center gap-2">
          <span className="text-xl">{freqConfig.icon}</span>
          <div>
            <p className="text-sm font-bold">{freqConfig.label}</p>
            <p className="text-[10px] opacity-80">
              {data.totalVisits} obiskov · {formatEUR(data.totalSpent)} skupaj
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs opacity-80">Povprečno</p>
          <p className="font-bold">{formatEUR(data.avgOrderValue)}</p>
        </div>
      </div>

      {/* KPI mreža */}
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg bg-muted/30 p-2">
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <Calendar className="h-3 w-3" />
            Pogostost
          </div>
          <p className="mt-0.5 text-sm font-bold">
            {data.avgDaysBetweenVisits > 0 ? `vsakih ${data.avgDaysBetweenVisits} dni` : "—"}
          </p>
        </div>
        <div className="rounded-lg bg-muted/30 p-2">
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <Clock className="h-3 w-3" />
            Zadnji obisk
          </div>
          <p className="mt-0.5 text-sm font-bold">
            {data.lastVisit ? new Date(data.lastVisit).toLocaleDateString("sl-SI", { day: "numeric", month: "short" }) : "—"}
          </p>
        </div>
        <div className="rounded-lg bg-muted/30 p-2">
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <MapPin className="h-3 w-3" />
            Najraje sede
          </div>
          <p className="mt-0.5 text-sm font-bold">{data.preferredSection || "—"}</p>
        </div>
        <div className="rounded-lg bg-muted/30 p-2">
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <CreditCard className="h-3 w-3" />
            Plačilo
          </div>
          <p className="mt-0.5 text-sm font-bold">{getPaymentLabel(data.preferredPaymentMethod)}</p>
        </div>
      </div>

      {/* Napitnine */}
      {data.totalTips > 0 && (
        <div className="flex items-center justify-between rounded-lg bg-violet-50 p-2 dark:bg-violet-950/20">
          <span className="flex items-center gap-1 text-xs text-violet-700 dark:text-violet-400">
            <Star className="h-3 w-3 fill-violet-400" />
            Skupne napitnine
          </span>
          <span className="font-bold text-violet-600 dark:text-violet-400">
            {formatEUR(data.totalTips)}
          </span>
        </div>
      )}

      {/* Favorite items */}
      {data.favoriteItems.length > 0 && (
        <div>
          <p className="mb-1.5 flex items-center gap-1 text-xs font-semibold">
            <Heart className="h-3 w-3 text-rose-500" />
            Najljubše jedi
          </p>
          <div className="space-y-1">
            {data.favoriteItems.map((item, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <span className="truncate">
                  <span className="font-medium">{item.name}</span>
                  <span className="ml-1 text-muted-foreground">({item.category})</span>
                </span>
                <span className="shrink-0 font-semibold tabular-nums">
                  {item.quantity}×
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Mesečni trend */}
      {data.monthlyTrend.some((m) => m.visits > 0) && (
        <div>
          <p className="mb-1.5 flex items-center gap-1 text-xs font-semibold">
            <TrendingUp className="h-3 w-3 text-emerald-500" />
            Mesečni trend (zadnjih 12 mesecev)
          </p>
          <div className="flex h-16 items-end gap-0.5">
            {data.monthlyTrend.map((m, i) => (
              <div key={i} className="group flex flex-1 flex-col items-center gap-0.5">
                <div className="relative flex w-full flex-1 items-end">
                  <div
                    className={cn(
                      "w-full rounded-t transition-all",
                      m.visits > 0 ? "bg-emerald-400 hover:bg-emerald-500" : "bg-muted/30"
                    )}
                    style={{ height: `${Math.max((m.spent / maxMonthlySpent) * 100, m.visits > 0 ? 8 : 2)}%` }}
                    title={`${m.month}: ${m.visits} obiskov, ${formatEUR(m.spent)}`}
                  />
                </div>
                <span className="text-[8px] text-muted-foreground">{m.month}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Preferred day */}
      {data.preferredDayName && (
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">📅 Najraje pride:</span>
          <span className="font-medium">{data.preferredDayName}</span>
        </div>
      )}

      {/* First visit */}
      {data.firstVisit && (
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">🎉 Prvi obisk:</span>
          <span className="font-medium">{formatDateTime(data.firstVisit)}</span>
        </div>
      )}
    </div>
  );
}
