"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Crown, TrendingUp, AlertTriangle, UserX, Diamond, Award, Medal } from "lucide-react";
import { formatEUR } from "@/lib/types";
import { cn } from "@/lib/utils";

interface CLVCustomer {
  id: string;
  name: string;
  phone: string | null;
  totalSpent: number;
  visitCount: number;
  avgOrderValue: number;
  firstVisit: string | null;
  lastVisit: string | null;
  visitsPerMonth: number;
  avgDaysBetween: number;
  projectedYearlyValue: number;
  clv3Year: number;
  daysSinceLastVisit: number;
  status: "active" | "at_risk" | "churned";
  segment: "platinum" | "gold" | "silver" | "bronze" | "new";
}

interface CLVData {
  customers: CLVCustomer[];
  summary: {
    totalCustomers: number;
    totalCLV: number;
    avgCLV: number;
    statusStats: { active: number; at_risk: number; churned: number };
    segmentStats: Record<string, { count: number; totalValue: number; avgCLV: number }>;
  };
}

const SEGMENT_CONFIG = {
  platinum: { label: "Platinum", icon: Diamond, color: "violet" },
  gold: { label: "Gold", icon: Crown, color: "amber" },
  silver: { label: "Silver", icon: Award, color: "slate" },
  bronze: { label: "Bronze", icon: Medal, color: "orange" },
  new: { label: "Nov", icon: TrendingUp, color: "emerald" },
};

const STATUS_CONFIG = {
  active: { label: "Aktiven", color: "border-emerald-300 bg-emerald-100 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-400" },
  at_risk: { label: "V nevarnosti", color: "border-amber-300 bg-amber-100 text-amber-700 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-400" },
  churned: { label: "Izgubljen", color: "border-rose-300 bg-rose-100 text-rose-700 dark:border-rose-800 dark:bg-rose-950/50 dark:text-rose-400" },
};

export function CLVAnalysis() {
  const [data, setData] = useState<CLVData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/customer-analytics/clv")
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

  if (data.customers.length === 0) {
    return (
      <Card className="p-4 text-center text-sm text-muted-foreground">
        Ni podatkov o strankah za CLV analizo.
      </Card>
    );
  }

  const { summary } = data;

  return (
    <div className="space-y-4">
      {/* KPI */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Skupni CLV</p>
            <TrendingUp className="h-4 w-4 text-violet-500" />
          </div>
          <p className="mt-2 text-2xl font-bold text-violet-600 dark:text-violet-400">
            {formatEUR(summary.totalCLV)}
          </p>
          <p className="text-[10px] text-muted-foreground">3-letna projekcija</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Povp. CLV/stranko</p>
            <Crown className="h-4 w-4 text-amber-500" />
          </div>
          <p className="mt-2 text-2xl font-bold text-amber-600 dark:text-amber-400">
            {formatEUR(summary.avgCLV)}
          </p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">V nevarnosti</p>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </div>
          <p className="mt-2 text-2xl font-bold text-amber-600 dark:text-amber-400">
            {summary.statusStats.at_risk}
          </p>
          <p className="text-[10px] text-muted-foreground">strank</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Izgubljeni</p>
            <UserX className="h-4 w-4 text-rose-500" />
          </div>
          <p className="mt-2 text-2xl font-bold text-rose-600 dark:text-rose-400">
            {summary.statusStats.churned}
          </p>
          <p className="text-[10px] text-muted-foreground">strank (&gt;90 dni)</p>
        </Card>
      </div>

      {/* Segmenti */}
      <Card className="p-4">
        <h3 className="mb-3 text-sm font-semibold">Segmenti strank</h3>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {Object.entries(summary.segmentStats).map(([seg, stats]) => {
            const config = SEGMENT_CONFIG[seg as keyof typeof SEGMENT_CONFIG];
            if (!config) return null;
            const Icon = config.icon;
            return (
              <div key={seg} className={cn(
                "rounded-lg border p-3 text-center",
                seg === "platinum" && "border-violet-300 bg-violet-50/50 dark:border-violet-800 dark:bg-violet-950/20",
                seg === "gold" && "border-amber-300 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/20",
                seg === "silver" && "border-slate-300 bg-slate-50/50 dark:border-slate-700 dark:bg-slate-900/20",
                seg === "bronze" && "border-orange-300 bg-orange-50/50 dark:border-orange-800 dark:bg-orange-950/20",
                seg === "new" && "border-emerald-300 bg-emerald-50/50 dark:border-emerald-800 dark:bg-emerald-950/20"
              )}>
                <Icon className={cn(
                  "mx-auto h-5 w-5",
                  seg === "platinum" && "text-violet-500",
                  seg === "gold" && "text-amber-500",
                  seg === "silver" && "text-slate-500",
                  seg === "bronze" && "text-orange-500",
                  seg === "new" && "text-emerald-500"
                )} />
                <p className="mt-1 text-xs font-bold">{config.label}</p>
                <p className="text-lg font-bold">{stats.count}</p>
                <p className="text-[10px] text-muted-foreground">
                  {formatEUR(stats.avgCLV)} povp.
                </p>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Top 20 strank po CLV */}
      <Card className="overflow-hidden">
        <div className="border-b bg-muted/30 p-3">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <Crown className="h-4 w-4 text-amber-500" />
            Top 20 strank po CLV (3-letna projekcija)
          </h3>
        </div>
        <div className="overflow-x-auto max-h-96 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-muted/50 backdrop-blur">
              <tr>
                <th className="p-2 text-left font-medium">#</th>
                <th className="p-2 text-left font-medium">Stranka</th>
                <th className="p-2 text-center font-medium">Segment</th>
                <th className="p-2 text-center font-medium">Status</th>
                <th className="p-2 text-right font-medium">Obiski</th>
                <th className="p-2 text-right font-medium">Poraba</th>
                <th className="p-2 text-right font-medium">CLV (3 leta)</th>
              </tr>
            </thead>
            <tbody>
              {data.customers.map((c, i) => {
                const segConfig = SEGMENT_CONFIG[c.segment];
                const statusConfig = STATUS_CONFIG[c.status];
                return (
                  <tr key={c.id} className="border-t border-border/40 hover:bg-muted/20">
                    <td className="p-2 font-bold text-muted-foreground">{i + 1}</td>
                    <td className="p-2">
                      <p className="font-medium">{c.name}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {c.visitsPerMonth}/mes · {c.avgDaysBetween}d med obiski
                      </p>
                    </td>
                    <td className="p-2 text-center">
                      <Badge variant="outline" className="text-[9px]">
                        {segConfig.label}
                      </Badge>
                    </td>
                    <td className="p-2 text-center">
                      <Badge variant="outline" className={cn("text-[9px]", statusConfig.color)}>
                        {statusConfig.label}
                      </Badge>
                    </td>
                    <td className="p-2 text-right tabular-nums">{c.visitCount}</td>
                    <td className="p-2 text-right tabular-nums">{formatEUR(c.totalSpent)}</td>
                    <td className="p-2 text-right font-bold tabular-nums text-violet-600 dark:text-violet-400">
                      {formatEUR(c.clv3Year)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Info */}
      <Card className="p-4 bg-muted/30">
        <h3 className="mb-2 text-sm font-semibold">💡 Kako se izračuna CLV?</h3>
        <div className="space-y-1 text-xs text-muted-foreground">
          <p>• <strong>CLV</strong> = povprečni račun × obiski/mesec × 12 mesecev × 3 leta (z 20% churn rate)</p>
          <p>• <strong>Segmenti</strong>: Platinum (1000€+), Gold (500€+), Silver (200€+), Bronze (50€+), Nov</p>
          <p>• <strong>Status</strong>: Aktiven (&lt;45dni), V nevarnosti (45-90dni), Izgubljen (&gt;90dni)</p>
          <p className="mt-1 text-[10px]">CLV je ocena prihodnje vrednosti stranke — uporabno za proračun marketinga in loyalty programov.</p>
        </div>
      </Card>
    </div>
  );
}
