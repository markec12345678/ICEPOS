"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Banknote, CreditCard, Gift, Receipt, TrendingUp, Coins } from "lucide-react";
import { formatEUR } from "@/lib/types";
import { cn } from "@/lib/utils";

interface PaymentData {
  summary: {
    totalRevenue: number;
    totalTips: number;
    totalOrders: number;
    avgOrderValue: number;
    overallTipRate: number;
  };
  methodStats: {
    method: string;
    count: number;
    total: number;
    tips: number;
    avgOrder: number;
    share: number;
    tipRate: number;
  }[];
  dailyTrend: { date: string; cash: number; card: number; giftcard: number; other: number }[];
  operatorStats: {
    operator: string;
    total: number;
    count: number;
    cashCount: number;
    cardCount: number;
    giftcardCount: number;
    cashPct: number;
    cardPct: number;
  }[];
  dayOfWeekStats: { day: number; dayName: string; cashCount: number; cardCount: number; cashPct: number; cardPct: number }[];
  days: number;
}

const METHOD_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  cash: Banknote,
  card: CreditCard,
  giftcard: Gift,
};

const METHOD_LABELS: Record<string, string> = {
  cash: "Gotovina",
  card: "Kartica",
  giftcard: "Darilna kartica",
};

const METHOD_COLORS: Record<string, string> = {
  cash: "emerald",
  card: "sky",
  giftcard: "violet",
};

export function PaymentAnalytics() {
  const [data, setData] = useState<PaymentData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/payment-analytics?days=30")
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

  if (data.summary.totalOrders === 0) {
    return null;
  }

  const { summary } = data;
  const maxDailyTotal = Math.max(...data.dailyTrend.map((d) => d.cash + d.card + d.giftcard + d.other), 1);

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
            {formatEUR(summary.totalRevenue)}
          </p>
          <p className="text-[10px] text-muted-foreground">{summary.totalOrders} računov</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Napitnine</p>
            <Coins className="h-4 w-4 text-violet-500" />
          </div>
          <p className="mt-2 text-2xl font-bold text-violet-600 dark:text-violet-400">
            {formatEUR(summary.totalTips)}
          </p>
          <p className="text-[10px] text-muted-foreground">{summary.overallTipRate}% tip rate</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Povprečni račun</p>
            <Receipt className="h-4 w-4 text-amber-500" />
          </div>
          <p className="mt-2 text-2xl font-bold text-amber-600 dark:text-amber-400">
            {formatEUR(summary.avgOrderValue)}
          </p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Računov/dan</p>
            <Receipt className="h-4 w-4 text-sky-500" />
          </div>
          <p className="mt-2 text-2xl font-bold text-sky-600 dark:text-sky-400">
            {Math.round(summary.totalOrders / data.days)}
          </p>
        </Card>
      </div>

      {/* Method stats */}
      <Card className="overflow-hidden">
        <div className="border-b bg-muted/30 p-3">
          <h3 className="text-sm font-semibold">Načini plačila</h3>
        </div>
        <div className="divide-y">
          {data.methodStats.map((m) => {
            const Icon = METHOD_ICONS[m.method] || Receipt;
            const label = METHOD_LABELS[m.method] || m.method;
            const color = METHOD_COLORS[m.method] || "slate";
            return (
              <div key={m.method} className="p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-lg",
                      color === "emerald" && "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400",
                      color === "sky" && "bg-sky-100 text-sky-700 dark:bg-sky-950/50 dark:text-sky-400",
                      color === "violet" && "bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-400",
                      color === "slate" && "bg-muted text-muted-foreground"
                    )}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-medium">{label}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {m.count} računov · povp. {formatEUR(m.avgOrder)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold tabular-nums">{formatEUR(m.total)}</p>
                    <Badge variant="outline" className="text-[10px]">
                      {m.share}% delež
                    </Badge>
                  </div>
                </div>
                {/* Share bar */}
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted/50">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all",
                      color === "emerald" && "bg-emerald-400",
                      color === "sky" && "bg-sky-400",
                      color === "violet" && "bg-violet-400",
                      color === "slate" && "bg-muted-foreground"
                    )}
                    style={{ width: `${m.share}%` }}
                  />
                </div>
                {m.tips > 0 && (
                  <p className="mt-1 text-[10px] text-violet-600 dark:text-violet-400">
                    +{formatEUR(m.tips)} napitnine ({m.tipRate}% tip rate)
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      {/* Daily trend */}
      <Card className="p-4">
        <h3 className="mb-3 text-sm font-semibold">Dnevni trend (zadnjih 14 dni)</h3>
        <div className="flex h-32 items-end gap-1">
          {data.dailyTrend.map((d) => {
            const total = d.cash + d.card + d.giftcard + d.other;
            const cashPct = total > 0 ? (d.cash / total) * 100 : 0;
            const cardPct = total > 0 ? (d.card / total) * 100 : 0;
            const giftPct = total > 0 ? (d.giftcard / total) * 100 : 0;
            return (
              <div key={d.date} className="group flex flex-1 flex-col items-center gap-1">
                <div className="relative flex w-full flex-1 flex-col-reverse items-end overflow-hidden rounded-t"
                  style={{ height: `${Math.max((total / maxDailyTotal) * 100, 2)}%` }}
                  title={`${new Date(d.date).toLocaleDateString("sl-SI")}: ${formatEUR(total)}`}
                >
                  {cashPct > 0 && <div className="w-full bg-emerald-400" style={{ height: `${cashPct}%` }} />}
                  {cardPct > 0 && <div className="w-full bg-sky-400" style={{ height: `${cardPct}%` }} />}
                  {giftPct > 0 && <div className="w-full bg-violet-400" style={{ height: `${giftPct}%` }} />}
                </div>
                <span className="text-[8px] text-muted-foreground">
                  {new Date(d.date).getDate()}
                </span>
              </div>
            );
          })}
        </div>
        {/* Legend */}
        <div className="mt-2 flex items-center justify-center gap-3 text-[10px]">
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            Gotovina
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-sky-400" />
            Kartica
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-violet-400" />
            Darilna
          </span>
        </div>
      </Card>

      {/* Po dnevih v tednu */}
      <Card className="p-4">
        <h3 className="mb-3 text-sm font-semibold">Preferenca plačila po dnevih v tednu</h3>
        <div className="space-y-1.5">
          {data.dayOfWeekStats.map((d) => (
            <div key={d.day} className="flex items-center gap-2 text-xs">
              <span className="w-8 shrink-0 text-muted-foreground">{d.dayName}</span>
              <div className="relative h-5 flex-1 overflow-hidden rounded bg-muted/50">
                <div className="flex h-full">
                  <div className="bg-emerald-400" style={{ width: `${d.cashPct}%` }} />
                  <div className="bg-sky-400" style={{ width: `${d.cardPct}%` }} />
                </div>
              </div>
              <span className="w-20 shrink-0 text-right text-[10px] text-muted-foreground">
                {d.cashCount} got · {d.cardCount} kart
              </span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
