"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingDown, TrendingUp, Trash2, Package, AlertTriangle } from "lucide-react";
import { formatEUR } from "@/lib/types";
import { cn } from "@/lib/utils";

interface ConsumptionData {
  summary: {
    totalConsumedValue: number;
    totalWastedValue: number;
    totalValue: number;
    wasteRate: number;
    itemCount: number;
  };
  items: {
    inventoryItemId: string;
    inventoryItemName: string;
    unit: string;
    costPerUnit: number;
    consumedQuantity: number;
    consumedValue: number;
    wastedQuantity: number;
    wastedValue: number;
    totalQuantity: number;
    totalValue: number;
    wastePct: number;
  }[];
  topConsumed: ConsumptionData["items"];
  topWasted: ConsumptionData["items"];
  last7Days: { date: string; value: number }[];
  days: number;
}

export function InventoryConsumption() {
  const [data, setData] = useState<ConsumptionData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/inventory/consumption?days=30")
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

  const max7Day = Math.max(...data.last7Days.map((d) => d.value), 1);

  return (
    <div className="space-y-4">
      {/* KPI */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Porabljeno</p>
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          </div>
          <p className="mt-2 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {formatEUR(data.summary.totalConsumedValue)}
          </p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Odpadki</p>
            <Trash2 className="h-4 w-4 text-rose-500" />
          </div>
          <p className="mt-2 text-2xl font-bold text-rose-600 dark:text-rose-400">
            {formatEUR(data.summary.totalWastedValue)}
          </p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Stopnja odpadkov</p>
            <AlertTriangle className={cn("h-4 w-4", data.summary.wasteRate > 5 ? "text-rose-500" : "text-amber-500")} />
          </div>
          <p className={cn(
            "mt-2 text-2xl font-bold",
            data.summary.wasteRate > 5 ? "text-rose-600 dark:text-rose-400" : "text-amber-600 dark:text-amber-400"
          )}>
            {data.summary.wasteRate}%
          </p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Sestavin</p>
            <Package className="h-4 w-4 text-sky-500" />
          </div>
          <p className="mt-2 text-2xl font-bold">{data.summary.itemCount}</p>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Top porabljene */}
        <Card className="overflow-hidden">
          <div className="border-b bg-muted/30 p-3">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <TrendingUp className="h-4 w-4 text-emerald-500" />
              Top 5 porabljenih sestavin
            </h3>
          </div>
          <div className="divide-y">
            {data.topConsumed.length === 0 ? (
              <p className="p-4 text-center text-sm text-muted-foreground">Ni podatkov o porabi</p>
            ) : (
              data.topConsumed.map((item, i) => (
                <div key={item.inventoryItemId} className="flex items-center justify-between gap-2 p-3">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400">
                      {i + 1}
                    </span>
                    <div>
                      <p className="text-sm font-medium">{item.inventoryItemName}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {item.consumedQuantity} {item.unit} · {formatEUR(item.costPerUnit)}/{item.unit}
                      </p>
                    </div>
                  </div>
                  <span className="font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                    {formatEUR(item.consumedValue)}
                  </span>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Top odpadki */}
        <Card className="overflow-hidden">
          <div className="border-b bg-muted/30 p-3">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <Trash2 className="h-4 w-4 text-rose-500" />
              Top 5 odpadkov
            </h3>
          </div>
          <div className="divide-y">
            {data.topWasted.length === 0 ? (
              <p className="p-4 text-center text-sm text-muted-foreground">Ni odpadkov v tem obdobju 🎉</p>
            ) : (
              data.topWasted.map((item, i) => (
                <div key={item.inventoryItemId} className="flex items-center justify-between gap-2 p-3">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-rose-100 text-xs font-bold text-rose-700 dark:bg-rose-950/50 dark:text-rose-400">
                      {i + 1}
                    </span>
                    <div>
                      <p className="text-sm font-medium">{item.inventoryItemName}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {item.wastedQuantity} {item.unit} · {item.wastePct}% odpadkov
                      </p>
                    </div>
                  </div>
                  <span className="font-bold tabular-nums text-rose-600 dark:text-rose-400">
                    -{formatEUR(item.wastedValue)}
                  </span>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      {/* Dnevni graf porabe */}
      <Card className="p-4">
        <h3 className="mb-3 text-sm font-semibold">Dnevna poraba (zadnjih 7 dni)</h3>
        <div className="flex h-32 items-end gap-1.5">
          {data.last7Days.map((d) => (
            <div key={d.date} className="group flex flex-1 flex-col items-center gap-1">
              <div className="relative flex w-full flex-1 items-end">
                <div
                  className="w-full rounded-t bg-gradient-to-t from-sky-400 to-blue-500 transition-all hover:from-sky-500 hover:to-blue-600"
                  style={{ height: `${Math.max((d.value / max7Day) * 100, 2)}%` }}
                >
                  {d.value > 0 && (
                    <span className="absolute -top-5 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] font-medium text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">
                      {formatEUR(d.value)}
                    </span>
                  )}
                </div>
              </div>
              <span className="text-[10px] text-muted-foreground">
                {new Date(d.date).toLocaleDateString("sl-SI", { weekday: "short" })}
              </span>
            </div>
          ))}
        </div>
      </Card>

      {/* Celotna tabela */}
      <Card className="overflow-hidden">
        <div className="border-b bg-muted/30 p-3">
          <h3 className="text-sm font-semibold">Vse sestavine — poraba v {data.days} dneh</h3>
        </div>
        <div className="overflow-x-auto max-h-96 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-muted/50 backdrop-blur">
              <tr>
                <th className="p-2 text-left font-medium">Sestavina</th>
                <th className="p-2 text-right font-medium">Porabljeno</th>
                <th className="p-2 text-right font-medium">Odpadki</th>
                <th className="p-2 text-right font-medium">Skupaj</th>
                <th className="p-2 text-center font-medium">Odpadki %</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((item) => (
                <tr key={item.inventoryItemId} className="border-t border-border/40 hover:bg-muted/20">
                  <td className="p-2">
                    <p className="font-medium">{item.inventoryItemName}</p>
                    <p className="text-[10px] text-muted-foreground">{item.unit}</p>
                  </td>
                  <td className="p-2 text-right tabular-nums">
                    <span className="text-emerald-600 dark:text-emerald-400">{formatEUR(item.consumedValue)}</span>
                    <p className="text-[10px] text-muted-foreground">{item.consumedQuantity} {item.unit}</p>
                  </td>
                  <td className="p-2 text-right tabular-nums">
                    {item.wastedValue > 0 ? (
                      <>
                        <span className="text-rose-600 dark:text-rose-400">-{formatEUR(item.wastedValue)}</span>
                        <p className="text-[10px] text-muted-foreground">{item.wastedQuantity} {item.unit}</p>
                      </>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="p-2 text-right font-semibold tabular-nums">{formatEUR(item.totalValue)}</td>
                  <td className="p-2 text-center">
                    {item.wastePct > 0 ? (
                      <Badge variant="outline" className={cn(
                        "text-[10px]",
                        item.wastePct > 10 ? "border-rose-300 text-rose-700 dark:border-rose-800 dark:text-rose-400" : "border-amber-300 text-amber-700 dark:border-amber-800 dark:text-amber-400"
                      )}>
                        {item.wastePct}%
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
