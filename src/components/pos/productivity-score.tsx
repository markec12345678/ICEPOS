"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Trophy, TrendingUp, Clock, Receipt, Star, DollarSign } from "lucide-react";
import { formatEUR } from "@/lib/types";
import { cn } from "@/lib/utils";

interface ProductivityData {
  operators: {
    operatorId: string;
    operatorName: string;
    role: string;
    hourlyRate: number;
    totalHours: number;
    totalRevenue: number;
    totalTips: number;
    orderCount: number;
    totalItems: number;
    laborCost: number;
    revenuePerHour: number;
    ordersPerHour: number;
    avgOrderValue: number;
    itemsPerOrder: number;
    tipsPerHour: number;
    revenuePerCost: number;
    score: number;
    rating: "excellent" | "good" | "average" | "below";
  }[];
  summary: {
    totalRevenue: number;
    totalHours: number;
    totalOrders: number;
    avgScore: number;
    operatorCount: number;
  };
  days: number;
}

const RATING_CONFIG = {
  excellent: { label: "Odličen", color: "border-emerald-300 bg-emerald-100 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-400", medal: "🥇" },
  good: { label: "Dober", color: "border-sky-300 bg-sky-100 text-sky-700 dark:border-sky-800 dark:bg-sky-950/50 dark:text-sky-400", medal: "🥈" },
  average: { label: "Povprečen", color: "border-amber-300 bg-amber-100 text-amber-700 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-400", medal: "🥉" },
  below: { label: "Pod povprečjem", color: "border-rose-300 bg-rose-100 text-rose-700 dark:border-rose-800 dark:bg-rose-950/50 dark:text-rose-400", medal: "⚠️" },
};

function getScoreColor(score: number): string {
  if (score >= 80) return "text-emerald-600 dark:text-emerald-400";
  if (score >= 60) return "text-sky-600 dark:text-sky-400";
  if (score >= 40) return "text-amber-600 dark:text-amber-400";
  return "text-rose-600 dark:text-rose-400";
}

function getScoreBarColor(score: number): string {
  if (score >= 80) return "bg-emerald-500";
  if (score >= 60) return "bg-sky-500";
  if (score >= 40) return "bg-amber-500";
  return "bg-rose-500";
}

export function ProductivityScore() {
  const [data, setData] = useState<ProductivityData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/employee-productivity-score?days=30")
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

  if (data.operators.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* KPI */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Povp. score</p>
            <Trophy className="h-4 w-4 text-amber-500" />
          </div>
          <p className={cn("mt-2 text-2xl font-bold", getScoreColor(data.summary.avgScore))}>
            {data.summary.avgScore}
          </p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Skupni promet</p>
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          </div>
          <p className="mt-2 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {formatEUR(data.summary.totalRevenue)}
          </p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Skupaj ur</p>
            <Clock className="h-4 w-4 text-sky-500" />
          </div>
          <p className="mt-2 text-2xl font-bold text-sky-600 dark:text-sky-400">
            {data.summary.totalHours}h
          </p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Računov</p>
            <Receipt className="h-4 w-4 text-violet-500" />
          </div>
          <p className="mt-2 text-2xl font-bold text-violet-600 dark:text-violet-400">
            {data.summary.totalOrders}
          </p>
        </Card>
      </div>

      {/* Ranking */}
      <Card className="overflow-hidden">
        <div className="border-b bg-muted/30 p-3">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <Trophy className="h-4 w-4 text-amber-500" />
            Ranking produktivnosti ({data.operators.length})
            <Badge variant="secondary" className="text-[10px]">
              {data.days} dni
            </Badge>
          </h3>
        </div>
        <div className="divide-y">
          {data.operators.map((op, i) => {
            const rating = RATING_CONFIG[op.rating];
            return (
              <div key={op.operatorId} className="p-4">
                <div className="flex items-center justify-between gap-3">
                  {/* Rank */}
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">
                      {i < 3 ? ["🥇", "🥈", "🥉"][i] : `${i + 1}.`}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold">{op.operatorName}</p>
                        <Badge variant="outline" className="text-[9px]">{op.role}</Badge>
                      </div>
                      <p className="text-[10px] text-muted-foreground">
                        {op.totalHours}h · {op.orderCount} računov · {op.totalItems} postavk
                      </p>
                    </div>
                  </div>

                  {/* Score */}
                  <div className="text-right">
                    <p className={cn("text-2xl font-bold", getScoreColor(op.score))}>
                      {op.score}
                    </p>
                    <Badge variant="outline" className={cn("text-[9px]", rating.color)}>
                      {rating.label}
                    </Badge>
                  </div>
                </div>

                {/* Score bar */}
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted/50">
                  <div
                    className={cn("h-full rounded-full transition-all", getScoreBarColor(op.score))}
                    style={{ width: `${op.score}%` }}
                  />
                </div>

                {/* Metrics */}
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
                  <div className="rounded bg-muted/30 p-2">
                    <p className="text-[10px] text-muted-foreground">Promet/h</p>
                    <p className="font-bold tabular-nums">{formatEUR(op.revenuePerHour)}</p>
                  </div>
                  <div className="rounded bg-muted/30 p-2">
                    <p className="text-[10px] text-muted-foreground">Računov/h</p>
                    <p className="font-bold tabular-nums">{op.ordersPerHour}</p>
                  </div>
                  <div className="rounded bg-muted/30 p-2">
                    <p className="text-[10px] text-muted-foreground">Povp. račun</p>
                    <p className="font-bold tabular-nums">{formatEUR(op.avgOrderValue)}</p>
                  </div>
                  <div className="rounded bg-muted/30 p-2">
                    <p className="text-[10px] text-muted-foreground">Napitnine/h</p>
                    <p className="font-bold tabular-nums text-violet-600 dark:text-violet-400">
                      {formatEUR(op.tipsPerHour)}
                    </p>
                  </div>
                </div>

                {/* ROI */}
                {op.laborCost > 0 && (
                  <div className="mt-2 flex items-center justify-between text-[10px]">
                    <span className="text-muted-foreground">
                      Strošek dela: <strong className="text-rose-600 dark:text-rose-400">{formatEUR(op.laborCost)}</strong>
                    </span>
                    <span className="text-muted-foreground">
                      ROI: <strong className={cn(
                        op.revenuePerCost >= 5 ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"
                      )}>{op.revenuePerCost}×</strong>
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      {/* Info */}
      <Card className="p-4 bg-muted/30">
        <h3 className="mb-2 text-sm font-semibold">💡 Kako se izračuna score?</h3>
        <div className="space-y-1 text-xs text-muted-foreground">
          <p>• <strong>40%</strong> — promet na uro (100€/h = 40 točk)</p>
          <p>• <strong>25%</strong> — računi na uro (5 računov/h = 25 točk)</p>
          <p>• <strong>15%</strong> — povprečni račun (20€ = 15 točk)</p>
          <p>• <strong>10%</strong> — napitnine na uro</p>
          <p>• <strong>10%</strong> — postavke na račun</p>
          <p className="mt-1">• <strong>Odličen</strong>: 80+ · <strong>Dober</strong>: 60-79 · <strong>Povprečen</strong>: 40-59 · <strong>Pod</strong>: &lt;40</p>
        </div>
      </Card>
    </div>
  );
}
