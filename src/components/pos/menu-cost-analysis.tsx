"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingDown, TrendingUp, DollarSign, AlertTriangle, ArrowUpDown, ChefHat } from "lucide-react";
import { formatEUR } from "@/lib/types";
import { cn } from "@/lib/utils";

interface CostAnalysisItem {
  id: string;
  name: string;
  category: string;
  price: number;
  foodCost: number;
  foodCostPct: number;
  profitPerUnit: number;
  profitMarginPct: number;
  quantitySold: number;
  revenue: number;
  totalProfit: number;
  available: boolean;
}

type SortKey = "name" | "foodCostPct" | "profitPerUnit" | "price" | "quantitySold" | "totalProfit";
type SortDir = "asc" | "desc";

/**
 * Menu Cost Analysis — detalna analiza stroškov in marž za vsako jed.
 * Prikazuje: food cost %, profit per unit, skupni profit, barvno kodiranje.
 */
export function MenuCostAnalysis({ items }: { items: CostAnalysisItem[] | undefined }) {
  const [sortKey, setSortKey] = useState<SortKey>("foodCostPct");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [filter, setFilter] = useState<"all" | "high" | "low" | "noRecipe">("all");

  if (!items) {
    return (
      <Card className="p-5">
        <Skeleton className="mb-4 h-6 w-48" />
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-10" />
          ))}
        </div>
      </Card>
    );
  }

  // Filtriranje
  const filtered = items.filter((item) => {
    if (filter === "high") return item.foodCostPct > 40;
    if (filter === "low") return item.foodCostPct > 0 && item.foodCostPct <= 30;
    if (filter === "noRecipe") return item.foodCost === 0;
    return true;
  });

  // Sortiranje
  const sorted = [...filtered].sort((a, b) => {
    let cmp = 0;
    if (sortKey === "name") cmp = a.name.localeCompare(b.name);
    else cmp = (a[sortKey] || 0) - (b[sortKey] || 0);
    return sortDir === "asc" ? cmp : -cmp;
  });

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  // Skupne metrike
  const itemsWithRecipe = items.filter((i) => i.foodCost > 0);
  const itemsWithoutRecipe = items.filter((i) => i.foodCost === 0);
  const avgFoodCostPct = itemsWithRecipe.length > 0
    ? itemsWithRecipe.reduce((s, i) => s + i.foodCostPct, 0) / itemsWithRecipe.length
    : 0;
  const totalPotentialProfit = items.reduce((s, i) => s + i.profitPerUnit, 0);
  const highCostItems = items.filter((i) => i.foodCostPct > 40).length;

  function getCostColor(pct: number): string {
    if (pct === 0) return "text-muted-foreground";
    if (pct > 40) return "text-rose-600 dark:text-rose-400";
    if (pct > 30) return "text-amber-600 dark:text-amber-400";
    return "text-emerald-600 dark:text-emerald-400";
  }

  function getCostBadge(pct: number) {
    if (pct === 0) return null;
    if (pct > 40) return <Badge variant="outline" className="border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950/50 dark:text-rose-400">VISOK</Badge>;
    if (pct > 30) return <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-400">SREDNJI</Badge>;
    return <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-400">DOBER</Badge>;
  }

  return (
    <div className="space-y-4">
      {/* Skupne metrike */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Povp. food cost</p>
            <ChefHat className="h-4 w-4 text-amber-500" />
          </div>
          <p className={cn("mt-2 text-2xl font-bold", getCostColor(avgFoodCostPct))}>
            {avgFoodCostPct.toFixed(1)}%
          </p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Skupni profit/kos</p>
            <DollarSign className="h-4 w-4 text-emerald-500" />
          </div>
          <p className="mt-2 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {formatEUR(totalPotentialProfit)}
          </p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Visok food cost</p>
            <TrendingDown className="h-4 w-4 text-rose-500" />
          </div>
          <p className="mt-2 text-2xl font-bold text-rose-600 dark:text-rose-400">
            {highCostItems}
          </p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Brez recepta</p>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </div>
          <p className="mt-2 text-2xl font-bold text-amber-600 dark:text-amber-400">
            {itemsWithoutRecipe.length}
          </p>
        </Card>
      </div>

      {/* Filtri */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant={filter === "all" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("all")}
        >
          Vsi ({items.length})
        </Button>
        <Button
          variant={filter === "high" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("high")}
          className={filter === "high" ? "bg-rose-600 hover:bg-rose-700" : ""}
        >
          Visok cost &gt;40% ({highCostItems})
        </Button>
        <Button
          variant={filter === "low" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("low")}
          className={filter === "low" ? "bg-emerald-600 hover:bg-emerald-700" : ""}
        >
          Dober &le;30% ({items.filter((i) => i.foodCostPct > 0 && i.foodCostPct <= 30).length})
        </Button>
        <Button
          variant={filter === "noRecipe" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("noRecipe")}
          className={filter === "noRecipe" ? "bg-amber-600 hover:bg-amber-700" : ""}
        >
          Brez recepta ({itemsWithoutRecipe.length})
        </Button>
      </div>

      {/* Tabela */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-muted/50 backdrop-blur">
              <tr>
                <th className="p-2 text-left">
                  <button onClick={() => toggleSort("name")} className="flex items-center gap-1 font-medium hover:text-foreground">
                    Jed <ArrowUpDown className="h-3 w-3 opacity-50" />
                  </button>
                </th>
                <th className="p-2 text-right">
                  <button onClick={() => toggleSort("price")} className="flex items-center gap-1 font-medium hover:text-foreground ml-auto">
                    Cena <ArrowUpDown className="h-3 w-3 opacity-50" />
                  </button>
                </th>
                <th className="p-2 text-right">
                  <button onClick={() => toggleSort("foodCostPct")} className="flex items-center gap-1 font-medium hover:text-foreground ml-auto">
                    Food cost % <ArrowUpDown className="h-3 w-3 opacity-50" />
                  </button>
                </th>
                <th className="p-2 text-right">Food cost</th>
                <th className="p-2 text-right">
                  <button onClick={() => toggleSort("profitPerUnit")} className="flex items-center gap-1 font-medium hover:text-foreground ml-auto">
                    Profit/kos <ArrowUpDown className="h-3 w-3 opacity-50" />
                  </button>
                </th>
                <th className="p-2 text-right">
                  <button onClick={() => toggleSort("quantitySold")} className="flex items-center gap-1 font-medium hover:text-foreground ml-auto">
                    Prodano <ArrowUpDown className="h-3 w-3 opacity-50" />
                  </button>
                </th>
                <th className="p-2 text-right">
                  <button onClick={() => toggleSort("totalProfit")} className="flex items-center gap-1 font-medium hover:text-foreground ml-auto">
                    Skupni profit <ArrowUpDown className="h-3 w-3 opacity-50" />
                  </button>
                </th>
                <th className="p-2 text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((item) => (
                <tr key={item.id} className="border-t border-border/40 hover:bg-muted/30">
                  <td className="p-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{item.name}</span>
                      {!item.available && (
                        <Badge variant="outline" className="text-[9px] text-muted-foreground">SKRITO</Badge>
                      )}
                    </div>
                    <p className="text-[10px] text-muted-foreground">{item.category}</p>
                  </td>
                  <td className="p-2 text-right font-semibold">{formatEUR(item.price)}</td>
                  <td className="p-2 text-right">
                    <span className={cn("font-bold", getCostColor(item.foodCostPct))}>
                      {item.foodCostPct > 0 ? `${item.foodCostPct.toFixed(1)}%` : "—"}
                    </span>
                  </td>
                  <td className="p-2 text-right text-xs text-muted-foreground">
                    {item.foodCost > 0 ? formatEUR(item.foodCost) : "—"}
                  </td>
                  <td className="p-2 text-right">
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                      {formatEUR(item.profitPerUnit)}
                    </span>
                  </td>
                  <td className="p-2 text-right text-muted-foreground">{item.quantitySold}×</td>
                  <td className="p-2 text-right font-semibold">
                    {item.totalProfit > 0 ? formatEUR(item.totalProfit) : "—"}
                  </td>
                  <td className="p-2 text-center">{getCostBadge(item.foodCostPct)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Info */}
      <Card className="p-4 bg-muted/30">
        <h3 className="mb-2 text-sm font-semibold">💡 Kako interpretirati food cost %?</h3>
        <div className="space-y-1 text-xs text-muted-foreground">
          <p>• <strong className="text-emerald-600">≤30%</strong> — Odlična marža. Jedi so visoko donosne.</p>
          <p>• <strong className="text-amber-600">30-40%</strong> — Srednja marža. Preveri cene ali optimiziraj recept.</p>
          <p>• <strong className="text-rose-600">&gt;40%</strong> — Visok food cost. Razmisli o zvišanju cene ali cenejših sestavinah.</p>
          <p>• <strong className="text-amber-600">Brez recepta</strong> — Dodaj recept v Recipe Manager za analizo stroškov.</p>
        </div>
      </Card>
    </div>
  );
}
