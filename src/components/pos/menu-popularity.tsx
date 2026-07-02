"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Trophy, TrendingUp, TrendingDown, Minus, Flame } from "lucide-react";
import { formatEUR } from "@/lib/types";
import { cn } from "@/lib/utils";

interface PopularityData {
  ranking: {
    id: string;
    name: string;
    nameEn: string | null;
    category: string;
    price: number;
    imageUrl: string | null;
    available: boolean;
    quantitySold: number;
    revenue: number;
    orderCount: number;
    avgOrderSize: number;
    trendPct: number;
    lastWeekQty: number;
    prevWeekQty: number;
  }[];
  categoryStats: { category: string; quantitySold: number; revenue: number; itemCount: number }[];
  summary: {
    totalItems: number;
    totalQuantity: number;
    totalRevenue: number;
    topItem: { name: string; quantitySold: number } | null;
    days: number;
  };
}

export function MenuPopularity() {
  const [data, setData] = useState<PopularityData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/menu/popularity?days=30")
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
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-10" />
          ))}
        </div>
      </Card>
    );
  }

  if (data.ranking.length === 0) {
    return null;
  }

  const maxQty = Math.max(...data.ranking.map((i) => i.quantitySold), 1);

  return (
    <div className="space-y-4">
      {/* Top 3 medalists */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {data.ranking.slice(0, 3).map((item, i) => {
          const medals = ["🥇", "🥈", "🥉"];
          const colors = [
            "border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/20",
            "border-slate-300 bg-slate-50 dark:border-slate-700 dark:bg-slate-900/20",
            "border-orange-300 bg-orange-50 dark:border-orange-800 dark:bg-orange-950/20",
          ];
          return (
            <Card key={item.id} className={cn("p-4", colors[i])}>
              <div className="flex items-center gap-2">
                <span className="text-2xl">{medals[i]}</span>
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground">#{i + 1} najbolj prodajana</p>
                  <p className="truncate font-semibold">{item.name}</p>
                </div>
              </div>
              <div className="mt-2 flex items-baseline gap-1">
                <p className="text-2xl font-bold">{item.quantitySold}</p>
                <span className="text-xs text-muted-foreground">prodanih kosov</span>
              </div>
              <p className="text-xs text-muted-foreground">
                {formatEUR(item.revenue)} prometa · {item.orderCount} računov
              </p>
            </Card>
          );
        })}
      </div>

      {/* Full ranking */}
      <Card className="overflow-hidden">
        <div className="border-b bg-muted/30 p-3">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <Trophy className="h-4 w-4 text-amber-500" />
            Ranking popularnosti ({data.summary.totalItems} jedi)
            <Badge variant="secondary" className="text-[10px]">
              {data.summary.days} dni
            </Badge>
          </h3>
        </div>
        <div className="max-h-96 overflow-y-auto">
          {data.ranking.map((item, i) => {
            const isTop = i < 3;
            return (
              <div
                key={item.id}
                className={cn(
                  "flex items-center gap-3 border-b border-border/40 p-2.5 transition-colors hover:bg-muted/30",
                  isTop && "bg-amber-50/30 dark:bg-amber-950/10"
                )}
              >
                {/* Rank */}
                <span className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                  isTop
                    ? "bg-amber-200 text-amber-800 dark:bg-amber-900 dark:text-amber-300"
                    : "bg-muted text-muted-foreground"
                )}>
                  {i + 1}
                </span>

                {/* Image + name */}
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  {item.imageUrl && (
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      className="h-8 w-8 shrink-0 rounded object-cover"
                    />
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {item.name}
                      {!item.available && <span className="ml-1 text-[10px] text-rose-500">(skrito)</span>}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {item.category} · {formatEUR(item.price)}
                    </p>
                  </div>
                </div>

                {/* Trend */}
                <div className="hidden shrink-0 items-center gap-1 sm:flex">
                  {item.trendPct > 10 ? (
                    <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
                  ) : item.trendPct < -10 ? (
                    <TrendingDown className="h-3.5 w-3.5 text-rose-500" />
                  ) : (
                    <Minus className="h-3.5 w-3.5 text-muted-foreground" />
                  )}
                  <span className={cn(
                    "text-xs font-medium",
                    item.trendPct > 10 ? "text-emerald-600 dark:text-emerald-400" : item.trendPct < -10 ? "text-rose-600 dark:text-rose-400" : "text-muted-foreground"
                  )}>
                    {item.trendPct > 0 ? "+" : ""}{item.trendPct}%
                  </span>
                </div>

                {/* Quantity bar */}
                <div className="hidden w-20 shrink-0 sm:block">
                  <div className="relative h-5 overflow-hidden rounded bg-muted/50">
                    <div
                      className={cn(
                        "h-full rounded transition-all",
                        isTop ? "bg-amber-400" : "bg-sky-400"
                      )}
                      style={{ width: `${(item.quantitySold / maxQty) * 100}%` }}
                    />
                  </div>
                </div>

                {/* Stats */}
                <div className="shrink-0 text-right">
                  <p className="text-sm font-bold tabular-nums">{item.quantitySold}×</p>
                  <p className="text-[10px] text-muted-foreground">{formatEUR(item.revenue)}</p>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Category stats */}
      <Card className="p-4">
        <h3 className="mb-3 text-sm font-semibold">Prodaja po kategorijah</h3>
        <div className="space-y-1.5">
          {data.categoryStats.map((cat) => {
            const maxCatQty = Math.max(...data.categoryStats.map((c) => c.quantitySold), 1);
            return (
              <div key={cat.category} className="flex items-center gap-2">
                <span className="w-24 shrink-0 truncate text-xs text-muted-foreground">
                  {cat.category}
                </span>
                <div className="relative h-5 flex-1 overflow-hidden rounded bg-muted/50">
                  <div
                    className="h-full rounded bg-gradient-to-r from-violet-400 to-purple-500"
                    style={{ width: `${(cat.quantitySold / maxCatQty) * 100}%` }}
                  />
                  <span className="absolute inset-y-0 left-2 flex items-center text-[10px] font-medium">
                    {cat.quantitySold} kos
                  </span>
                </div>
                <span className="w-16 shrink-0 text-right text-[10px] font-medium tabular-nums">
                  {formatEUR(cat.revenue)}
                </span>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
