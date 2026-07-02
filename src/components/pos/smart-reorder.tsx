"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, TrendingDown, Package, Truck, Calendar } from "lucide-react";
import { formatEUR } from "@/lib/types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface SmartReorderData {
  suggestions: {
    id: string;
    name: string;
    unit: string;
    category: string;
    supplier: string | null;
    currentQty: number;
    minQty: number;
    costPerUnit: number;
    dailyAvg: number;
    totalConsumed: number;
    wasteQty: number;
    daysUntilStockout: number;
    reorderPoint: number;
    suggestedQty: number;
    suggestedValue: number;
    priority: "critical" | "high" | "medium" | "low";
    needsReorder: boolean;
    leadTimeDays: number;
  }[];
  summary: {
    totalItems: number;
    needsReorder: number;
    criticalCount: number;
    highCount: number;
    totalSuggestedValue: number;
    days: number;
  };
}

const PRIORITY_CONFIG = {
  critical: {
    label: "KRITIČNO",
    color: "border-rose-300 bg-rose-100 text-rose-700 dark:border-rose-800 dark:bg-rose-950/50 dark:text-rose-400",
    rowColor: "border-l-4 border-rose-500",
  },
  high: {
    label: "VISOKO",
    color: "border-amber-300 bg-amber-100 text-amber-700 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-400",
    rowColor: "border-l-4 border-amber-500",
  },
  medium: {
    label: "SREDNJE",
    color: "border-sky-300 bg-sky-100 text-sky-700 dark:border-sky-800 dark:bg-sky-950/50 dark:text-sky-400",
    rowColor: "border-l-4 border-sky-500",
  },
  low: {
    label: "NIZKO",
    color: "border-muted bg-muted text-muted-foreground",
    rowColor: "",
  },
};

export function SmartReorder() {
  const [data, setData] = useState<SmartReorderData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/inventory/smart-reorder?days=30")
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
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-12" />
          ))}
        </div>
      </Card>
    );
  }

  if (data.suggestions.length === 0) {
    return (
      <Card className="p-5">
        <div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400">
          <Package className="h-5 w-5" />
          <span>Vse zaloge so zadostne za naslednje tedne. 🎉</span>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* KPI */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Za naročilo</p>
            <Package className="h-4 w-4 text-amber-500" />
          </div>
          <p className="mt-2 text-2xl font-bold text-amber-600 dark:text-amber-400">
            {data.summary.needsReorder}
          </p>
        </Card>
        <Card className="p-4 border-rose-300 dark:border-rose-800">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Kritično</p>
            <AlertCircle className="h-4 w-4 text-rose-500" />
          </div>
          <p className="mt-2 text-2xl font-bold text-rose-600 dark:text-rose-400">
            {data.summary.criticalCount}
          </p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Visoka prioriteta</p>
            <TrendingDown className="h-4 w-4 text-amber-500" />
          </div>
          <p className="mt-2 text-2xl font-bold text-amber-600 dark:text-amber-400">
            {data.summary.highCount}
          </p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Predlagan znesek</p>
            <Truck className="h-4 w-4 text-sky-500" />
          </div>
          <p className="mt-2 text-2xl font-bold text-sky-600 dark:text-sky-400">
            {formatEUR(data.summary.totalSuggestedValue)}
          </p>
        </Card>
      </div>

      {/* Tabela predlogov */}
      <Card className="overflow-hidden">
        <div className="border-b bg-muted/30 p-3">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <Truck className="h-4 w-4 text-amber-600" />
            Pametni predlogi naročil
            <Badge variant="secondary" className="text-[10px]">
              glede na porabo v {data.summary.days} dneh
            </Badge>
          </h3>
        </div>
        <div className="overflow-x-auto max-h-96 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-muted/50 backdrop-blur">
              <tr>
                <th className="p-2 text-left font-medium">Artikel</th>
                <th className="p-2 text-center font-medium">Prioriteta</th>
                <th className="p-2 text-right font-medium">Zaloga</th>
                <th className="p-2 text-right font-medium">Dnevna poraba</th>
                <th className="p-2 text-center font-medium">Dni do prazne</th>
                <th className="p-2 text-right font-medium">Predlagano</th>
                <th className="p-2 text-right font-medium">Vrednost</th>
              </tr>
            </thead>
            <tbody>
              {data.suggestions.map((s) => {
                const config = PRIORITY_CONFIG[s.priority];
                return (
                  <tr key={s.id} className={cn("border-t border-border/40 hover:bg-muted/20", config.rowColor)}>
                    <td className="p-2">
                      <p className="font-medium">{s.name}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {s.category}{s.supplier ? ` · ${s.supplier}` : ""}
                      </p>
                    </td>
                    <td className="p-2 text-center">
                      <Badge variant="outline" className={cn("text-[9px]", config.color)}>
                        {config.label}
                      </Badge>
                    </td>
                    <td className="p-2 text-right tabular-nums">
                      <span className={cn(s.currentQty <= 0 && "text-rose-600 dark:text-rose-400 font-bold")}>
                        {s.currentQty} {s.unit}
                      </span>
                      <p className="text-[10px] text-muted-foreground">min: {s.minQty}</p>
                    </td>
                    <td className="p-2 text-right tabular-nums text-muted-foreground">
                      {s.dailyAvg > 0 ? `${s.dailyAvg} ${s.unit}/dan` : "—"}
                    </td>
                    <td className="p-2 text-center">
                      {s.daysUntilStockout === 999 ? (
                        <span className="text-muted-foreground">∞</span>
                      ) : (
                        <span className={cn(
                          "font-semibold tabular-nums",
                          s.daysUntilStockout <= 3 ? "text-rose-600 dark:text-rose-400" :
                          s.daysUntilStockout <= 7 ? "text-amber-600 dark:text-amber-400" :
                          "text-foreground"
                        )}>
                          {s.daysUntilStockout} dni
                        </span>
                      )}
                    </td>
                    <td className="p-2 text-right">
                      {s.suggestedQty > 0 ? (
                        <span className="font-bold tabular-nums">
                          {s.suggestedQty} {s.unit}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="p-2 text-right tabular-nums font-semibold">
                      {s.suggestedValue > 0 ? formatEUR(s.suggestedValue) : "—"}
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
        <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold">
          <Calendar className="h-4 w-4 text-sky-500" />
          Kako delujejo predlogi?
        </h3>
        <div className="space-y-1 text-xs text-muted-foreground">
          <p>• <strong>Dnevna poraba</strong> = povprečna poraba v zadnjih {data.summary.days} dneh (iz receptov + odpadkov)</p>
          <p>• <strong>Dni do prazne</strong> = trenutna zaloga ÷ dnevna poraba</p>
          <p>• <strong>Predlagano</strong> = 14 dni porabe - trenutna zaloga</p>
          <p>• <strong>Lead time</strong>: 3 dni (privzeto) — naroči vsaj 3 dni preden zmanjka</p>
          <p>• <strong className="text-rose-600">Kritično</strong>: zaloga <= 0 ali dni do prazne <= 3</p>
          <p>• <strong className="text-amber-600">Visoko</strong>: dni do prazne <= 5</p>
        </div>
      </Card>
    </div>
  );
}
