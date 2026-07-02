"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, Package, AlertTriangle, DollarSign, Layers, Truck, ArrowUpDown } from "lucide-react";
import { formatEUR } from "@/lib/types";
import { cn } from "@/lib/utils";

interface ValuationData {
  summary: {
    totalStockValue: number;
    totalItems: number;
    lowStockCount: number;
    outOfStockCount: number;
    overstockedCount: number;
    lowStockValue: number;
    avgItemValue: number;
  };
  categoryStats: { category: string; value: number; count: number; quantity: number }[];
  supplierStats: { supplier: string; value: number; count: number }[];
  topValueItems: {
    id: string;
    name: string;
    unit: string;
    quantity: number;
    costPerUnit: number;
    stockValue: number;
    category: string;
    isLow: boolean;
    isOut: boolean;
    isOverstocked: boolean;
  }[];
}

export function InventoryValuation() {
  const [data, setData] = useState<ValuationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"summary" | "categories" | "suppliers" | "top">("summary");

  useEffect(() => {
    fetch("/api/inventory/valuation")
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

  const { summary } = data;
  const maxCatValue = Math.max(...data.categoryStats.map((c) => c.value), 1);
  const maxSupplierValue = Math.max(...data.supplierStats.map((s) => s.value), 1);

  return (
    <div className="space-y-4">
      {/* KPI kartice */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Skupna vrednost</p>
            <DollarSign className="h-4 w-4 text-emerald-500" />
          </div>
          <p className="mt-2 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {formatEUR(summary.totalStockValue)}
          </p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Artiklov</p>
            <Package className="h-4 w-4 text-amber-500" />
          </div>
          <p className="mt-2 text-2xl font-bold">{summary.totalItems}</p>
          <p className="text-[10px] text-muted-foreground">
            povp. {formatEUR(summary.avgItemValue)}/kos
          </p>
        </Card>
        <Card className={cn("p-4", summary.lowStockCount > 0 && "border-amber-300 dark:border-amber-800")}>
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Nizka zaloga</p>
            <AlertTriangle className={cn("h-4 w-4", summary.lowStockCount > 0 ? "text-amber-500" : "text-muted-foreground")} />
          </div>
          <p className="mt-2 text-2xl font-bold text-amber-600 dark:text-amber-400">
            {summary.lowStockCount}
          </p>
          <p className="text-[10px] text-muted-foreground">
            + {summary.outOfStockCount} praznih
          </p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Preveč zaloge</p>
            <Layers className="h-4 w-4 text-violet-500" />
          </div>
          <p className="mt-2 text-2xl font-bold text-violet-600 dark:text-violet-400">
            {summary.overstockedCount}
          </p>
          <p className="text-[10px] text-muted-foreground">več kot 3× min</p>
        </Card>
      </div>

      {/* View tabs */}
      <div className="flex flex-wrap gap-2">
        <Button variant={view === "summary" ? "default" : "outline"} size="sm" onClick={() => setView("summary")}>
          <TrendingUp className="mr-1.5 h-3.5 w-3.5" />
          Po kategorijah
        </Button>
        <Button variant={view === "suppliers" ? "default" : "outline"} size="sm" onClick={() => setView("suppliers")}>
          <Truck className="mr-1.5 h-3.5 w-3.5" />
          Po dobaviteljih
        </Button>
        <Button variant={view === "top" ? "default" : "outline"} size="sm" onClick={() => setView("top")}>
          <DollarSign className="mr-1.5 h-3.5 w-3.5" />
          Top 10 najdražjih
        </Button>
      </div>

      {/* Content based on view */}
      {view === "summary" && (
        <Card className="p-5">
          <h3 className="mb-4 text-sm font-semibold">Vrednost zalog po kategorijah</h3>
          <div className="space-y-2">
            {data.categoryStats.map((cat) => (
              <div key={cat.category} className="flex items-center gap-3">
                <span className="w-32 shrink-0 truncate text-xs text-muted-foreground">
                  {cat.category}
                </span>
                <div className="relative h-6 flex-1 overflow-hidden rounded bg-muted/50">
                  <div
                    className="h-full rounded bg-gradient-to-r from-emerald-400 to-emerald-500 transition-all"
                    style={{ width: `${(cat.value / maxCatValue) * 100}%` }}
                  />
                  <span className="absolute inset-y-0 left-2 flex items-center text-[10px] font-medium">
                    {formatEUR(cat.value)}
                  </span>
                </div>
                <span className="w-16 shrink-0 text-right text-[10px] text-muted-foreground">
                  {cat.count} art.
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {view === "suppliers" && (
        <Card className="p-5">
          <h3 className="mb-4 text-sm font-semibold">Vrednost zalog po dobaviteljih</h3>
          <div className="space-y-2">
            {data.supplierStats.map((sup) => (
              <div key={sup.supplier} className="flex items-center gap-3">
                <span className="w-40 shrink-0 truncate text-xs text-muted-foreground">
                  {sup.supplier}
                </span>
                <div className="relative h-6 flex-1 overflow-hidden rounded bg-muted/50">
                  <div
                    className="h-full rounded bg-gradient-to-r from-sky-400 to-blue-500 transition-all"
                    style={{ width: `${(sup.value / maxSupplierValue) * 100}%` }}
                  />
                  <span className="absolute inset-y-0 left-2 flex items-center text-[10px] font-medium">
                    {formatEUR(sup.value)}
                  </span>
                </div>
                <span className="w-16 shrink-0 text-right text-[10px] text-muted-foreground">
                  {sup.count} art.
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {view === "top" && (
        <Card className="overflow-hidden">
          <div className="border-b bg-muted/30 p-3">
            <h3 className="text-sm font-semibold">Top 10 artiklov po vrednosti zaloge</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/30">
                <tr>
                  <th className="p-2 text-left font-medium">#</th>
                  <th className="p-2 text-left font-medium">Artikel</th>
                  <th className="p-2 text-right font-medium">Količina</th>
                  <th className="p-2 text-right font-medium">Cena/kos</th>
                  <th className="p-2 text-right font-medium">Vrednost</th>
                  <th className="p-2 text-center font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.topValueItems.map((item, i) => (
                  <tr key={item.id} className="border-t border-border/40 hover:bg-muted/20">
                    <td className="p-2 font-bold text-muted-foreground">{i + 1}</td>
                    <td className="p-2">
                      <p className="font-medium">{item.name}</p>
                      <p className="text-[10px] text-muted-foreground">{item.category}</p>
                    </td>
                    <td className="p-2 text-right tabular-nums">
                      {item.quantity} {item.unit}
                    </td>
                    <td className="p-2 text-right tabular-nums text-muted-foreground">
                      {formatEUR(item.costPerUnit)}
                    </td>
                    <td className="p-2 text-right font-bold tabular-nums">
                      {formatEUR(item.stockValue)}
                    </td>
                    <td className="p-2 text-center">
                      {item.isOut ? (
                        <Badge variant="outline" className="text-[9px] text-rose-600">PRAZNO</Badge>
                      ) : item.isLow ? (
                        <Badge variant="outline" className="text-[9px] text-amber-600">NIZKO</Badge>
                      ) : item.isOverstocked ? (
                        <Badge variant="outline" className="text-[9px] text-violet-600">PREVEČ</Badge>
                      ) : (
                        <Badge variant="outline" className="text-[9px] text-emerald-600">OK</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
