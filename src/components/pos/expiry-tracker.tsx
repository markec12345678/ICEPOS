"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, Calendar, Clock, CheckCircle2, XCircle } from "lucide-react";
import { formatEUR } from "@/lib/types";
import { cn } from "@/lib/utils";

interface ExpiryData {
  summary: {
    total: number;
    expired: number;
    expiringSoon: number;
    expiringWeek: number;
    safe: number;
    expiredValue: number;
    expiringSoonValue: number;
  };
  expired: {
    id: string; name: string; unit: string; quantity: number; costPerUnit: number;
    expiryDate: string; batchNumber: string | null; category: string; daysOverdue: number; value: number;
  }[];
  expiringSoon: {
    id: string; name: string; unit: string; quantity: number; costPerUnit: number;
    expiryDate: string; batchNumber: string | null; category: string; daysUntil: number; value: number;
  }[];
  expiringWeek: {
    id: string; name: string; unit: string; quantity: number; costPerUnit: number;
    expiryDate: string; batchNumber: string | null; category: string; daysUntil: number; value: number;
  }[];
}

export function ExpiryTracker() {
  const [data, setData] = useState<ExpiryData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/inventory/expiry")
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

  if (data.summary.total === 0) {
    return (
      <Card className="p-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4" />
          <span>Ni artiklov z rokom trajanja. Dodaj rok trajanja pri artiklih za sledenje.</span>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* KPI */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className={cn("p-4", data.summary.expired > 0 && "border-rose-300 dark:border-rose-800")}>
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Poteklo</p>
            <XCircle className={cn("h-4 w-4", data.summary.expired > 0 ? "text-rose-500" : "text-muted-foreground")} />
          </div>
          <p className={cn("mt-2 text-2xl font-bold", data.summary.expired > 0 ? "text-rose-600 dark:text-rose-400" : "text-muted-foreground")}>
            {data.summary.expired}
          </p>
          <p className="text-[10px] text-rose-600 dark:text-rose-400">
            -{formatEUR(data.summary.expiredValue)} izguba
          </p>
        </Card>
        <Card className={cn("p-4", data.summary.expiringSoon > 0 && "border-amber-300 dark:border-amber-800")}>
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">V 3 dneh</p>
            <AlertTriangle className={cn("h-4 w-4", data.summary.expiringSoon > 0 ? "text-amber-500" : "text-muted-foreground")} />
          </div>
          <p className={cn("mt-2 text-2xl font-bold", data.summary.expiringSoon > 0 ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground")}>
            {data.summary.expiringSoon}
          </p>
          <p className="text-[10px] text-amber-600 dark:text-amber-400">
            {formatEUR(data.summary.expiringSoonValue)} vrednost
          </p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">V 7 dneh</p>
            <Clock className="h-4 w-4 text-sky-500" />
          </div>
          <p className="mt-2 text-2xl font-bold text-sky-600 dark:text-sky-400">
            {data.summary.expiringWeek}
          </p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">V redu</p>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </div>
          <p className="mt-2 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {data.summary.safe}
          </p>
        </Card>
      </div>

      {/* Potekli artikli */}
      {data.expired.length > 0 && (
        <Card className="overflow-hidden border-rose-300 dark:border-rose-800">
          <div className="border-b bg-rose-50 p-3 dark:bg-rose-950/20">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-rose-700 dark:text-rose-400">
              <XCircle className="h-4 w-4" />
              Potekli artikli ({data.expired.length})
              <Badge variant="destructive" className="text-[10px]">
                -{formatEUR(data.summary.expiredValue)}
              </Badge>
            </h3>
          </div>
          <div className="divide-y">
            {data.expired.map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-2 p-3">
                <div>
                  <p className="text-sm font-medium">{item.name}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {item.quantity} {item.unit} · {item.category}
                    {item.batchNumber && ` · serija: ${item.batchNumber}`}
                  </p>
                </div>
                <div className="text-right">
                  <Badge variant="destructive" className="text-[9px]">
                    {item.daysOverdue} dni prekoračeno
                  </Badge>
                  <p className="mt-1 text-xs font-bold tabular-nums text-rose-600 dark:text-rose-400">
                    -{formatEUR(item.value)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* V 3 dneh */}
      {data.expiringSoon.length > 0 && (
        <Card className="overflow-hidden border-amber-300 dark:border-amber-800">
          <div className="border-b bg-amber-50 p-3 dark:bg-amber-950/20">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-amber-700 dark:text-amber-400">
              <AlertTriangle className="h-4 w-4" />
              Poteče v 3 dneh ({data.expiringSoon.length})
            </h3>
          </div>
          <div className="divide-y">
            {data.expiringSoon.map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-2 p-3">
                <div>
                  <p className="text-sm font-medium">{item.name}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {item.quantity} {item.unit} · {item.category}
                    {item.batchNumber && ` · serija: ${item.batchNumber}`}
                  </p>
                </div>
                <div className="text-right">
                  <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-400 text-[9px]">
                    čez {item.daysUntil} {item.daysUntil === 1 ? "dan" : "dni"}
                  </Badge>
                  <p className="mt-1 text-xs font-bold tabular-nums">
                    {formatEUR(item.value)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* V 7 dneh */}
      {data.expiringWeek.length > 0 && (
        <Card className="overflow-hidden">
          <div className="border-b bg-muted/30 p-3">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <Clock className="h-4 w-4 text-sky-500" />
              Poteče v 7 dneh ({data.expiringWeek.length})
            </h3>
          </div>
          <div className="divide-y">
            {data.expiringWeek.map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-2 p-2.5 text-sm">
                <div>
                  <span className="font-medium">{item.name}</span>
                  <span className="ml-2 text-[10px] text-muted-foreground">
                    {item.quantity} {item.unit}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[9px]">
                    čez {item.daysUntil} dni
                  </Badge>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {formatEUR(item.value)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
