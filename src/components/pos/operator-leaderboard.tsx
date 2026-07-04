"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Trophy, Crown, Medal, Award, TrendingUp, Coins } from "lucide-react";
import { formatEUR } from "@/lib/types";
import { cn } from "@/lib/utils";

interface LeaderboardData {
  leaderboard: {
    operator: string;
    orders: number;
    revenue: number;
    tips: number;
    items: number;
    avgOrder: number;
    maxOrder: number;
    tipRate: number;
    achievements: { id: string; label: string; icon: string; desc: string }[];
  }[];
  summary: { totalRevenue: number; totalOrders: number; totalTips: number; operatorCount: number };
  topPerformer: { operator: string; revenue: number; orders: number; achievements: number } | null;
  days: number;
}

const RANK_ICONS = ["🥇", "🥈", "🥉"];
const RANK_COLORS = [
  "border-amber-300 bg-gradient-to-br from-amber-50 to-yellow-50 dark:border-amber-800 dark:from-amber-950/30 dark:to-yellow-950/20",
  "border-slate-300 bg-gradient-to-br from-slate-50 to-gray-50 dark:border-slate-700 dark:from-slate-900/30 dark:to-gray-900/20",
  "border-orange-300 bg-gradient-to-br from-orange-50 to-amber-50 dark:border-orange-800 dark:from-orange-950/30 dark:to-amber-950/20",
];

export function OperatorLeaderboard() {
  const [data, setData] = useState<LeaderboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/operator-leaderboard?days=7")
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
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      </Card>
    );
  }

  if (data.leaderboard.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Top performer banner */}
      {data.topPerformer && (
        <Card className="overflow-hidden border-amber-300 bg-gradient-to-r from-amber-50 to-orange-50 dark:border-amber-800 dark:from-amber-950/30 dark:to-orange-950/20">
          <div className="flex items-center gap-3 p-4">
            <span className="text-3xl">🏆</span>
            <div className="flex-1">
              <p className="text-xs text-amber-700 dark:text-amber-400">TOP PERFORMER</p>
              <p className="text-lg font-bold text-amber-900 dark:text-amber-200">{data.topPerformer.operator}</p>
              <p className="text-xs text-amber-700 dark:text-amber-400">
                {formatEUR(data.topPerformer.revenue)} · {data.topPerformer.orders} računov · {data.topPerformer.achievements} achievementov
              </p>
            </div>
            <Trophy className="h-8 w-8 text-amber-500" />
          </div>
        </Card>
      )}

      {/* Leaderboard */}
      <Card className="overflow-hidden">
        <div className="border-b bg-muted/30 p-3">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <Trophy className="h-4 w-4 text-amber-500" />
            Leaderboard operaterjev
            <Badge variant="secondary" className="text-[10px]">
              zadnjih {data.days} dni
            </Badge>
          </h3>
        </div>
        <div className="divide-y">
          {data.leaderboard.map((op, i) => (
            <div
              key={op.operator}
              className={cn(
                "p-3 transition-colors hover:bg-muted/20",
                i < 3 && RANK_COLORS[i]
              )}
            >
              <div className="flex items-center gap-3">
                {/* Rank */}
                <span className="flex h-9 w-9 shrink-0 items-center justify-center text-lg font-bold">
                  {i < 3 ? RANK_ICONS[i] : `${i + 1}.`}
                </span>

                {/* Avatar */}
                <div className={cn(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white",
                  i === 0 && "bg-gradient-to-br from-amber-400 to-yellow-500",
                  i === 1 && "bg-gradient-to-br from-slate-400 to-gray-500",
                  i === 2 && "bg-gradient-to-br from-orange-400 to-amber-500",
                  i >= 3 && "bg-gradient-to-br from-sky-400 to-blue-500"
                )}>
                  {op.operator.charAt(0).toUpperCase()}
                </div>

                {/* Info */}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{op.operator}</p>
                  <div className="flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
                    <span>{op.orders} računov</span>
                    <span>·</span>
                    <span>{formatEUR(op.avgOrder)} povp.</span>
                    <span>·</span>
                    <span className="text-violet-600 dark:text-violet-400">{formatEUR(op.tips)} napitnin</span>
                    {op.tipRate > 0 && (
                      <>
                        <span>·</span>
                        <span>{op.tipRate}% tip</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Revenue */}
                <div className="shrink-0 text-right">
                  <p className="text-lg font-bold tabular-nums">{formatEUR(op.revenue)}</p>
                  <p className="text-[10px] text-muted-foreground">{op.items} postavk</p>
                </div>
              </div>

              {/* Achievements */}
              {op.achievements.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1 pl-12">
                  {op.achievements.map((a) => (
                    <span
                      key={a.id}
                      className="inline-flex items-center gap-0.5 rounded-full bg-muted/50 px-2 py-0.5 text-[10px] font-medium"
                      title={a.desc}
                    >
                      {a.icon} {a.label}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </Card>

      {/* KPI */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-3 text-center">
          <TrendingUp className="mx-auto h-4 w-4 text-emerald-500" />
          <p className="mt-1 text-lg font-bold text-emerald-600 dark:text-emerald-400">
            {formatEUR(data.summary.totalRevenue)}
          </p>
          <p className="text-[10px] text-muted-foreground">skupni promet</p>
        </Card>
        <Card className="p-3 text-center">
          <Trophy className="mx-auto h-4 w-4 text-amber-500" />
          <p className="mt-1 text-lg font-bold text-amber-600 dark:text-amber-400">
            {data.summary.totalOrders}
          </p>
          <p className="text-[10px] text-muted-foreground">računov</p>
        </Card>
        <Card className="p-3 text-center">
          <Coins className="mx-auto h-4 w-4 text-violet-500" />
          <p className="mt-1 text-lg font-bold text-violet-600 dark:text-violet-400">
            {formatEUR(data.summary.totalTips)}
          </p>
          <p className="text-[10px] text-muted-foreground">napitnin</p>
        </Card>
      </div>
    </div>
  );
}
