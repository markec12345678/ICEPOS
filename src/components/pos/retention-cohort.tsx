"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Repeat, TrendingDown, Calendar } from "lucide-react";
import { formatEUR } from "@/lib/types";
import { cn } from "@/lib/utils";

interface CohortData {
  cohorts: {
    cohortMonth: string;
    cohortLabel: string;
    size: number;
    totalRevenue: number;
    avgRevenuePerCustomer: number;
    retention: { month: number; retained: number; rate: number }[];
  }[];
  summary: {
    totalCustomers: number;
    avgRetention30: number;
    avgRetention90: number;
    avgRetention180: number;
  };
}

function getRetentionColor(rate: number): string {
  if (rate >= 50) return "bg-emerald-500 text-white";
  if (rate >= 30) return "bg-emerald-400 text-emerald-900";
  if (rate >= 15) return "bg-amber-400 text-amber-900";
  if (rate > 0) return "bg-rose-300 text-rose-900";
  return "bg-muted/30 text-muted-foreground";
}

export function RetentionCohort() {
  const [data, setData] = useState<CohortData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/customer-analytics/retention")
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

  if (data.cohorts.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* KPI */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Skupaj strank</p>
            <Users className="h-4 w-4 text-sky-500" />
          </div>
          <p className="mt-2 text-2xl font-bold text-sky-600 dark:text-sky-400">
            {data.summary.totalCustomers}
          </p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Ret. 30 dni</p>
            <Repeat className="h-4 w-4 text-emerald-500" />
          </div>
          <p className={cn(
            "mt-2 text-2xl font-bold",
            data.summary.avgRetention30 >= 30 ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"
          )}>
            {data.summary.avgRetention30}%
          </p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Ret. 90 dni</p>
            <Repeat className="h-4 w-4 text-amber-500" />
          </div>
          <p className={cn(
            "mt-2 text-2xl font-bold",
            data.summary.avgRetention90 >= 20 ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"
          )}>
            {data.summary.avgRetention90}%
          </p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Ret. 180 dni</p>
            <TrendingDown className="h-4 w-4 text-rose-500" />
          </div>
          <p className={cn(
            "mt-2 text-2xl font-bold",
            data.summary.avgRetention180 >= 10 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
          )}>
            {data.summary.avgRetention180}%
          </p>
        </Card>
      </div>

      {/* Cohort heatmap */}
      <Card className="overflow-hidden">
        <div className="border-b bg-muted/30 p-3">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <Calendar className="h-4 w-4 text-violet-500" />
            Kohortna analiza vračanja
            <Badge variant="secondary" className="text-[10px]">
              {data.cohorts.length} kohort
            </Badge>
          </h3>
          <p className="mt-0.5 text-[10px] text-muted-foreground">
            Stranke grupirane po mesecu prvega obiska — % ki se vrnejo v naslednjih mesecih
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/20">
              <tr>
                <th className="sticky left-0 bg-muted/20 p-2 text-left font-medium">Kohorta</th>
                <th className="p-2 text-center font-medium">Velikost</th>
                <th className="p-2 text-center font-medium">M+1</th>
                <th className="p-2 text-center font-medium">M+2</th>
                <th className="p-2 text-center font-medium">M+3</th>
                <th className="p-2 text-center font-medium">M+4</th>
                <th className="p-2 text-center font-medium">M+5</th>
                <th className="p-2 text-center font-medium">M+6</th>
              </tr>
            </thead>
            <tbody>
              {data.cohorts.map((cohort) => (
                <tr key={cohort.cohortMonth} className="border-t border-border/40">
                  <td className="sticky left-0 bg-background p-2">
                    <p className="text-xs font-medium">{cohort.cohortLabel}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {formatEUR(cohort.avgRevenuePerCustomer)}/stranko
                    </p>
                  </td>
                  <td className="p-2 text-center">
                    <Badge variant="outline" className="text-[10px]">{cohort.size}</Badge>
                  </td>
                  {cohort.retention.map((r) => (
                    <td key={r.month} className="p-1.5 text-center">
                      {r.rate > 0 ? (
                        <div
                          className={cn(
                            "mx-auto flex h-10 w-12 flex-col items-center justify-center rounded text-[10px] font-bold",
                            getRetentionColor(r.rate)
                          )}
                          title={`${r.retained} od ${cohort.size} strank (${r.rate}%)`}
                        >
                          <span>{r.rate}%</span>
                          <span className="text-[8px] opacity-80">{r.retained}</span>
                        </div>
                      ) : (
                        <div className="mx-auto flex h-10 w-12 items-center justify-center rounded bg-muted/20 text-[10px] text-muted-foreground">
                          —
                        </div>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-2 border-t p-2 text-[10px]">
          <span className="text-muted-foreground">Manj</span>
          <div className="flex gap-0.5">
            <div className="h-3 w-6 rounded bg-muted/30" />
            <div className="h-3 w-6 rounded bg-rose-300" />
            <div className="h-3 w-6 rounded bg-amber-400" />
            <div className="h-3 w-6 rounded bg-emerald-400" />
            <div className="h-3 w-6 rounded bg-emerald-500" />
          </div>
          <span className="text-muted-foreground">Več</span>
        </div>
      </Card>

      {/* Info */}
      <Card className="p-4 bg-muted/30">
        <h3 className="mb-2 text-sm font-semibold">💡 Kaj pomeni kohortna analiza?</h3>
        <div className="space-y-1 text-xs text-muted-foreground">
          <p>• <strong>Kohorta</strong> = skupina strank, ki so prvič obiskale v istem mesecu</p>
          <p>• <strong>M+1</strong> = % strank, ki so se vrnele v naslednjem mesecu po prvem obisku</p>
          <p>• <strong>Višji % = boljše</strong> — pomeni, da se stranke vračajo</p>
          <p>• Uporabno za merjenje učinkovitosti loyalty programov in marketinga</p>
        </div>
      </Card>
    </div>
  );
}
