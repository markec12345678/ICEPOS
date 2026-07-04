"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Clock, AlertCircle, Calendar, TrendingUp, Phone, Brain } from "lucide-react";
import { formatEUR } from "@/lib/types";
import { cn } from "@/lib/utils";

interface PredictionData {
  predictions: {
    id: string;
    name: string;
    phone: string | null;
    totalSpent: number;
    visitCount: number;
    lastVisit: string;
    avgDaysBetween: number;
    predictedNextVisit: string;
    daysUntilPredicted: number;
    status: "overdue" | "due" | "expected" | "new";
    confidence: number;
    preferredDayName: string;
    preferredHour: number;
    atRisk: boolean;
  }[];
  summary: {
    total: number;
    overdue: number;
    due: number;
    atRisk: number;
    avgConfidence: number;
  };
}

const STATUS_CONFIG = {
  overdue: { label: "Prekoračeno", color: "border-rose-300 bg-rose-100 text-rose-700 dark:border-rose-800 dark:bg-rose-950/50 dark:text-rose-400", icon: AlertCircle },
  due: { label: "Pričakovano", color: "border-amber-300 bg-amber-100 text-amber-700 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-400", icon: Clock },
  expected: { label: "V prihodnosti", color: "border-sky-300 bg-sky-100 text-sky-700 dark:border-sky-800 dark:bg-sky-950/50 dark:text-sky-400", icon: Calendar },
  new: { label: "Nov", color: "border-violet-300 bg-violet-100 text-violet-700 dark:border-violet-800 dark:bg-violet-950/50 dark:text-violet-400", icon: TrendingUp },
};

export function FrequencyPrediction() {
  const [data, setData] = useState<PredictionData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/customers/frequency-prediction")
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

  if (data.predictions.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* KPI */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Prekoračeni</p>
            <AlertCircle className="h-4 w-4 text-rose-500" />
          </div>
          <p className="mt-2 text-2xl font-bold text-rose-600 dark:text-rose-400">
            {data.summary.overdue}
          </p>
          <p className="text-[10px] text-muted-foreground">strank</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Pričakovani</p>
            <Clock className="h-4 w-4 text-amber-500" />
          </div>
          <p className="mt-2 text-2xl font-bold text-amber-600 dark:text-amber-400">
            {data.summary.due}
          </p>
          <p className="text-[10px] text-muted-foreground">v 7 dneh</p>
        </Card>
        <Card className={cn("p-4", data.summary.atRisk > 0 && "border-rose-300 dark:border-rose-800")}>
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">V nevarnosti</p>
            <AlertCircle className={cn("h-4 w-4", data.summary.atRisk > 0 ? "text-rose-500" : "text-muted-foreground")} />
          </div>
          <p className={cn("mt-2 text-2xl font-bold", data.summary.atRisk > 0 ? "text-rose-600 dark:text-rose-400" : "text-muted-foreground")}>
            {data.summary.atRisk}
          </p>
          <p className="text-[10px] text-muted-foreground">2× prekrokani interval</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Zaupanje</p>
            <Brain className="h-4 w-4 text-violet-500" />
          </div>
          <p className="mt-2 text-2xl font-bold text-violet-600 dark:text-violet-400">
            {data.summary.avgConfidence}%
          </p>
        </Card>
      </div>

      {/* Napovedi */}
      <Card className="overflow-hidden">
        <div className="border-b bg-muted/30 p-3">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <Brain className="h-4 w-4 text-violet-500" />
            Napoved vračanja strank
            <Badge variant="secondary" className="text-[10px] gap-0.5">
              AI
            </Badge>
          </h3>
          <p className="mt-0.5 text-[10px] text-muted-foreground">
            Napoved temelji na povprečnem intervalu med obiski
          </p>
        </div>
        <div className="max-h-96 divide-y overflow-y-auto">
          {data.predictions.map((p) => {
            const config = STATUS_CONFIG[p.status];
            const StatusIcon = config.icon;
            return (
              <div key={p.id} className={cn(
                "flex items-center gap-3 p-3",
                p.atRisk && "bg-rose-50/30 dark:bg-rose-950/10"
              )}>
                {/* Avatar */}
                <div className={cn(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white",
                  p.status === "overdue" ? "bg-rose-500" :
                  p.status === "due" ? "bg-amber-500" :
                  "bg-sky-500"
                )}>
                  {p.name.charAt(0).toUpperCase()}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-medium">{p.name}</p>
                    {p.atRisk && (
                      <Badge variant="destructive" className="text-[9px]">AT RISK</Badge>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
                    <span>{p.visitCount} obiskov</span>
                    <span>·</span>
                    <span>{formatEUR(p.totalSpent)}</span>
                    <span>·</span>
                    <span>vsakih {p.avgDaysBetween} dni</span>
                    <span>·</span>
                    <span>🏁 {p.preferredDayName} {p.preferredHour >= 0 ? `${p.preferredHour}:00` : ""}</span>
                  </div>
                </div>

                {/* Prediction */}
                <div className="shrink-0 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <StatusIcon className={cn("h-3 w-3", p.status === "overdue" ? "text-rose-500" : p.status === "due" ? "text-amber-500" : "text-sky-500")} />
                    <Badge variant="outline" className={cn("text-[10px]", config.color)}>
                      {config.label}
                    </Badge>
                  </div>
                  <p className={cn(
                    "mt-0.5 text-xs font-bold tabular-nums",
                    p.daysUntilPredicted < 0 ? "text-rose-600 dark:text-rose-400" : "text-foreground"
                  )}>
                    {p.daysUntilPredicted < 0
                      ? `${Math.abs(p.daysUntilPredicted)} dni prekoračeno`
                      : `čez ${p.daysUntilPredicted} dni`}
                  </p>
                  <p className="text-[9px] text-muted-foreground">
                    {p.confidence}% zaupanja
                  </p>
                </div>

                {/* Phone */}
                {p.phone && (
                  <a
                    href={`tel:${p.phone}`}
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
                    title={`Klic: ${p.phone}`}
                  >
                    <Phone className="h-3.5 w-3.5" />
                  </a>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      {/* Info */}
      <Card className="p-3 bg-muted/30">
        <p className="text-[10px] text-muted-foreground">
          🧠 Napoved = povprečni interval med obiski + zadnji obisk.
          Stranke z statusom "Prekoračeno" bi že morale priti — kontaktiraj jih!
          "V nevarnosti" = preteklo več kot 2× povprečni interval — verjetno ne vrnejo.
        </p>
      </Card>
    </div>
  );
}
