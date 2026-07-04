"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  Trophy,
  TrendingUp,
  TrendingDown,
  Coins,
  Receipt,
  Users,
  Crown,
  AlertCircle,
} from "lucide-react";
import { formatEUR } from "@/lib/types";
import { LoadingSpinner, ErrorState, KpiSkeleton, TableSkeleton, ListSkeleton } from "@/components/pos/loading-states";

interface RestaurantBenchmark {
  id: string;
  name: string;
  slug: string;
  city: string | null;
  rank: number;
  revenue: number;
  tips: number;
  orderCount: number;
  avgOrder: number;
  foodCost: number;
  foodCostPct: number;
  laborCost: number;
  laborCostPct: number;
  laborHours: number;
  tableCount: number;
  topItem: string;
  profit: number;
  profitMarginPct: number;
}

interface BenchmarkData {
  restaurants: RestaurantBenchmark[];
  summary: {
    totalRestaurants: number;
    totalRevenue: number;
    totalTips: number;
    totalOrders: number;
    avgRevenue: number;
    avgOrderValue: number;
    avgFoodCostPct: number;
    avgLaborCostPct: number;
    avgProfitMarginPct: number;
    topPerformer: string;
    bottomPerformer: string;
    days: number;
  } | null;
}

export function BenchmarkView() {
  const [data, setData] = useState<BenchmarkData | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState("30");
  const [sortBy, setSortBy] = useState<"revenue" | "profit" | "avgOrder" | "profitMarginPct">("revenue");

  useEffect(() => {
    load();
  }, [days]);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`/api/benchmark?days=${days}`);
      if (!res.ok) throw new Error("Napaka");
      setData(await res.json());
    } catch {
      toast.error("Napaka pri nalaganju benchmark-a");
    } finally {
      setLoading(false);
    }
  }

  if (loading || !data) {
    return (
      <div className="flex h-64 items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (!data.summary || data.restaurants.length === 0) {
    return (
      <div className="flex h-64 flex-col items-center justify-center text-center">
        <AlertCircle className="mb-3 h-12 w-12 text-muted-foreground" />
        <p className="font-medium">Ni restavracij za primerjavo</p>
        <p className="text-sm text-muted-foreground">
          Ustvari vsaj 2 restavraciji v nastavitvah za benchmark analizo.
        </p>
      </div>
    );
  }

  if (data.restaurants.length === 1) {
    return (
      <div className="flex h-64 flex-col items-center justify-center text-center">
        <Trophy className="mb-3 h-12 w-12 text-amber-500" />
        <p className="font-medium">Samo ena restavracija</p>
        <p className="text-sm text-muted-foreground">
          Za benchmark so potrebne vsaj 2 restavraciji. Trenutno: {data.restaurants[0].name}
        </p>
      </div>
    );
  }

  // Sortiraj po izbranem kriteriju
  const sorted = [...data.restaurants].sort((a, b) => {
    const val = sortBy;
    return (b[val] as number) - (a[val] as number);
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Multi-Location Benchmark</h2>
          <p className="text-sm text-muted-foreground">
            Primerjava {data.summary.totalRestaurants} restavracij — {data.summary.days} dni
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={days} onValueChange={setDays}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">7 dni</SelectItem>
              <SelectItem value="30">30 dni</SelectItem>
              <SelectItem value="90">90 dni</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="revenue">Promet</SelectItem>
              <SelectItem value="profit">Profit</SelectItem>
              <SelectItem value="avgOrder">Povp. račun</SelectItem>
              <SelectItem value="profitMarginPct">Profit margin %</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Skupaj promet</p>
              <p className="text-xl font-bold">{formatEUR(data.summary.totalRevenue)}</p>
              <p className="text-xs text-muted-foreground">
                povp. {formatEUR(data.summary.avgRevenue)} / lokacija
              </p>
            </div>
            <TrendingUp className="h-5 w-5 text-muted-foreground" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Skupaj napitnine</p>
              <p className="text-xl font-bold text-amber-600">{formatEUR(data.summary.totalTips)}</p>
              <p className="text-xs text-muted-foreground">{data.summary.totalOrders} računov</p>
            </div>
            <Coins className="h-5 w-5 text-amber-500" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Povp. račun</p>
              <p className="text-xl font-bold">{formatEUR(data.summary.avgOrderValue)}</p>
            </div>
            <Receipt className="h-5 w-5 text-muted-foreground" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Povp. profit margin</p>
              <p className="text-xl font-bold text-emerald-600">{data.summary.avgProfitMarginPct}%</p>
              <p className="text-xs text-muted-foreground">
                FC: {data.summary.avgFoodCostPct}% / LC: {data.summary.avgLaborCostPct}%
              </p>
            </div>
            <Users className="h-5 w-5 text-muted-foreground" />
          </div>
        </Card>
      </div>

      {/* Top / Bottom performer */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <Card className="border-2 border-amber-300 bg-gradient-to-br from-amber-50 to-yellow-50 p-4 dark:border-amber-800 dark:from-amber-950/30 dark:to-yellow-950/30">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-500 text-white">
              <Crown className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs text-amber-700 dark:text-amber-400">🏆 Top performer</p>
              <p className="text-lg font-bold text-amber-900 dark:text-amber-200">
                {data.summary.topPerformer}
              </p>
            </div>
          </div>
        </Card>
        <Card className="border-2 border-rose-300 bg-gradient-to-br from-rose-50 to-red-50 p-4 dark:border-rose-800 dark:from-rose-950/30 dark:to-red-950/30">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-500 text-white">
              <TrendingDown className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs text-rose-700 dark:text-rose-400">⚠️ Bottom performer</p>
              <p className="text-lg font-bold text-rose-900 dark:text-rose-200">
                {data.summary.bottomPerformer}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Comparison table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="p-3 text-left font-medium">#</th>
                <th className="p-3 text-left font-medium">Restavracija</th>
                <th className="p-3 text-right font-medium">Promet</th>
                <th className="p-3 text-right font-medium">Računov</th>
                <th className="p-3 text-right font-medium">Povp. račun</th>
                <th className="p-3 text-right font-medium">Napitnine</th>
                <th className="p-3 text-right font-medium">Food cost %</th>
                <th className="p-3 text-right font-medium">Labor cost %</th>
                <th className="p-3 text-right font-medium">Profit</th>
                <th className="p-3 text-right font-medium">Margin</th>
                <th className="p-3 text-left font-medium">Top item</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((r, i) => {
                const isTop = i === 0;
                const isBottom = i === sorted.length - 1 && sorted.length > 1;
                return (
                  <tr
                    key={r.id}
                    className={`border-b last:border-0 hover:bg-muted/30 ${
                      isTop ? "bg-amber-50/50 dark:bg-amber-950/20" : ""
                    } ${isBottom ? "bg-rose-50/50 dark:bg-rose-950/20" : ""}`}
                  >
                    <td className="p-3">
                      {isTop ? (
                        <Crown className="h-5 w-5 text-amber-500" />
                      ) : (
                        <span className="font-mono text-muted-foreground">{i + 1}</span>
                      )}
                    </td>
                    <td className="p-3">
                      <div className="font-medium">{r.name}</div>
                      {r.city && (
                        <div className="text-xs text-muted-foreground">{r.city}</div>
                      )}
                    </td>
                    <td className="p-3 text-right font-bold">{formatEUR(r.revenue)}</td>
                    <td className="p-3 text-right font-mono">{r.orderCount}</td>
                    <td className="p-3 text-right">{formatEUR(r.avgOrder)}</td>
                    <td className="p-3 text-right text-amber-600">{formatEUR(r.tips)}</td>
                    <td className="p-3 text-right">
                      <span className={r.foodCostPct > 35 ? "text-rose-600" : ""}>
                        {r.foodCostPct}%
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <span className={r.laborCostPct > 35 ? "text-rose-600" : ""}>
                        {r.laborCostPct}%
                      </span>
                    </td>
                    <td className="p-3 text-right font-bold text-emerald-600">
                      {formatEUR(r.profit)}
                    </td>
                    <td className="p-3 text-right">
                      <Badge
                        variant="outline"
                        className={
                          r.profitMarginPct > 20
                            ? "border-emerald-300 text-emerald-700 dark:border-emerald-800 dark:text-emerald-400"
                            : r.profitMarginPct > 10
                            ? "border-amber-300 text-amber-700 dark:border-amber-800 dark:text-amber-400"
                            : "border-rose-300 text-rose-700 dark:border-rose-800 dark:text-rose-400"
                        }
                      >
                        {r.profitMarginPct}%
                      </Badge>
                    </td>
                    <td className="p-3 text-xs text-muted-foreground max-w-[150px] truncate">
                      {r.topItem}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Info card */}
      <Card className="p-4 bg-muted/30">
        <h3 className="mb-2 text-sm font-semibold">💡 Kako brati rezultate?</h3>
        <div className="space-y-1 text-xs text-muted-foreground">
          <p><strong>Food cost %</strong> — idealno 25-30% v restavracijah. Čez 35% pomeni previsoke stroške ali nizke cene.</p>
          <p><strong>Labor cost %</strong> — idealno 25-30%. Čez 35% pomeni premajhen promet za število osebja.</p>
          <p><strong>Profit margin %</strong> — profit / promet. Zdrava restavracija: 15-25%. Pod 10% je kritično.</p>
          <p><strong>Povp. račun</strong> — promet / št. računov. Nizek pomeni poceni meni ali premalo upselling-a.</p>
        </div>
      </Card>
    </div>
  );
}
