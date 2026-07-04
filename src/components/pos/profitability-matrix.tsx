"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Star, DollarSign, HelpCircle, Dog, TrendingUp } from "lucide-react";
import { formatEUR } from "@/lib/types";
import { cn } from "@/lib/utils";

interface MatrixData {
  items: {
    id: string; name: string; category: string; price: number; foodCost: number;
    profitPerUnit: number; profitMargin: number; quantitySold: number;
    revenue: number; totalProfit: number; quadrant: string; available: boolean; imageUrl: string | null;
  }[];
  quadrants: {
    star: { count: number; profit: number };
    "cash-cow": { count: number; profit: number };
    question: { count: number; profit: number };
    dog: { count: number; profit: number };
  };
  summary: { totalItems: number; totalProfit: number; avgMargin: number; avgPrice: number };
  days: number;
}

const QUADRANT_CONFIG = {
  star: { label: "Zvezde", icon: Star, color: "amber", desc: "Visoka cena + visoka marža — ohrani in promoviraj", bg: "bg-amber-50 dark:bg-amber-950/20", border: "border-amber-300 dark:border-amber-800", text: "text-amber-600 dark:text-amber-400" },
  "cash-cow": { label: "Krave mlekarice", icon: DollarSign, color: "emerald", desc: "Nizka cena + visoka marža — stabilen dohodek", bg: "bg-emerald-50 dark:bg-emerald-950/20", border: "border-emerald-300 dark:border-emerald-800", text: "text-emerald-600 dark:text-emerald-400" },
  question: { label: "Vprašanja", icon: HelpCircle, color: "sky", desc: "Visoka cena + nizka marža — optimiziraj recept", bg: "bg-sky-50 dark:bg-sky-950/20", border: "border-sky-300 dark:border-sky-800", text: "text-sky-600 dark:text-sky-400" },
  dog: { label: "Psi", icon: Dog, color: "rose", desc: "Nizka cena + nizka marža — razmisli o umiku", bg: "bg-rose-50 dark:bg-rose-950/20", border: "border-rose-300 dark:border-rose-800", text: "text-rose-600 dark:text-rose-400" },
};

export function ProfitabilityMatrix() {
  const [data, setData] = useState<MatrixData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/menu/profitability-matrix?days=30")
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

  if (data.items.length === 0) {
    return null;
  }

  // Za scatter plot: X = cena, Y = marža
  const maxPrice = Math.max(...data.items.map((i) => i.price), 20);
  const maxQty = Math.max(...data.items.map((i) => i.quantitySold), 1);

  return (
    <div className="space-y-4">
      {/* KPI */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Skupni profit</p>
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          </div>
          <p className="mt-2 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {formatEUR(data.summary.totalProfit)}
          </p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Povp. marža</p>
            <TrendingUp className="h-4 w-4 text-amber-500" />
          </div>
          <p className="mt-2 text-2xl font-bold text-amber-600 dark:text-amber-400">
            {data.summary.avgMargin}%
          </p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Povp. cena</p>
            <DollarSign className="h-4 w-4 text-sky-500" />
          </div>
          <p className="mt-2 text-2xl font-bold text-sky-600 dark:text-sky-400">
            {formatEUR(data.summary.avgPrice)}
          </p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Jedi</p>
            <Star className="h-4 w-4 text-violet-500" />
          </div>
          <p className="mt-2 text-2xl font-bold">{data.summary.totalItems}</p>
        </Card>
      </div>

      {/* Scatter plot matrika */}
      <Card className="overflow-hidden">
        <div className="border-b bg-muted/30 p-3">
          <h3 className="text-sm font-semibold">Matrika profitabilnosti (cena vs marža)</h3>
          <p className="text-[10px] text-muted-foreground">X = cena · Y = marža % · velikost = prodana količina</p>
        </div>
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted/10 p-4">
          {/* Grid lines */}
          <div className="absolute inset-4 grid grid-cols-2 grid-rows-2 gap-0">
            <div className="border-r border-b border-border/30" />
            <div className="border-b border-border/30" />
            <div className="border-r border-border/30" />
            <div />
          </div>
          {/* Axis labels */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-[10px] text-muted-foreground/30">
            {formatEUR(maxPrice / 2)}
          </div>
          <div className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[10px] text-muted-foreground">
            Cena →
          </div>
          <div className="absolute left-1 top-1/2 -translate-y-1/2 -rotate-90 text-[10px] text-muted-foreground">
            Marža % →
          </div>

          {/* Quadrant labels */}
          <div className="absolute right-4 top-4 text-[10px] font-semibold text-amber-500/40">★ Zvezde</div>
          <div className="absolute left-4 top-4 text-[10px] font-semibold text-emerald-500/40">💰 Krave</div>
          <div className="absolute right-4 bottom-4 text-[10px] font-semibold text-sky-500/40">? Vprašanja</div>
          <div className="absolute left-4 bottom-4 text-[10px] font-semibold text-rose-500/40">🐕 Psi</div>

          {/* Data points */}
          {data.items.map((item) => {
            const x = (item.price / maxPrice) * 100;
            const y = 100 - item.profitMargin; // invertiraj ker Y gre od zgoraj navzdol
            const size = 12 + (item.quantitySold / maxQty) * 24;
            const config = QUADRANT_CONFIG[item.quadrant as keyof typeof QUADRANT_CONFIG] || QUADRANT_CONFIG.dog;
            return (
              <div
                key={item.id}
                className="group absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer"
                style={{
                  left: `${Math.min(Math.max(x, 5), 95)}%`,
                  top: `${Math.min(Math.max(y, 5), 95)}%`,
                  width: `${size}px`,
                  height: `${size}px`,
                }}
                title={`${item.name}: ${formatEUR(item.price)} · ${item.profitMargin}% marža · ${item.quantitySold}×`}
              >
                <div
                  className={cn(
                    "h-full w-full rounded-full transition-all hover:scale-150 hover:z-10",
                    item.quadrant === "star" && "bg-amber-400 hover:bg-amber-500",
                    item.quadrant === "cash-cow" && "bg-emerald-400 hover:bg-emerald-500",
                    item.quadrant === "question" && "bg-sky-400 hover:bg-sky-500",
                    item.quadrant === "dog" && "bg-rose-400 hover:bg-rose-500",
                    !item.available && "opacity-40"
                  )}
                />
                {/* Tooltip */}
                <div className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-1 hidden -translate-x-1/2 whitespace-nowrap rounded-md border border-border bg-popover px-2 py-1 text-[10px] shadow-lg group-hover:block">
                  <p className="font-semibold">{item.name}</p>
                  <p className="text-muted-foreground">{formatEUR(item.price)} · {item.profitMargin}% · {item.quantitySold}×</p>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Kvadrant povzetki */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {(Object.keys(QUADRANT_CONFIG) as Array<keyof typeof QUADRANT_CONFIG>).map((key) => {
          const config = QUADRANT_CONFIG[key];
          const stats = data.quadrants[key];
          const Icon = config.icon;
          return (
            <Card key={key} className={cn("border-2 p-3", config.border, config.bg)}>
              <div className="flex items-center gap-2">
                <Icon className={cn("h-4 w-4", config.text)} />
                <p className={cn("text-sm font-semibold", config.text)}>{config.label}</p>
                <Badge variant="outline" className="ml-auto text-[10px]">{stats.count}</Badge>
              </div>
              <p className="mt-1 text-[10px] text-muted-foreground">{config.desc}</p>
              <p className="mt-1 text-lg font-bold tabular-nums">{formatEUR(stats.profit)}</p>
            </Card>
          );
        })}
      </div>

      {/* Tabela top profitabilnih */}
      <Card className="overflow-hidden">
        <div className="border-b bg-muted/30 p-3">
          <h3 className="text-sm font-semibold">Top 10 po skupnem profitu</h3>
        </div>
        <div className="overflow-x-auto max-h-64 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-muted/50 backdrop-blur">
              <tr>
                <th className="p-2 text-left font-medium">#</th>
                <th className="p-2 text-left font-medium">Jed</th>
                <th className="p-2 text-right font-medium">Cena</th>
                <th className="p-2 text-right font-medium">Food cost</th>
                <th className="p-2 text-right font-medium">Marža</th>
                <th className="p-2 text-right font-medium">Prodano</th>
                <th className="p-2 text-right font-medium">Profit</th>
              </tr>
            </thead>
            <tbody>
              {data.items.slice(0, 10).map((item, i) => {
                const config = QUADRANT_CONFIG[item.quadrant as keyof typeof QUADRANT_CONFIG] || QUADRANT_CONFIG.dog;
                const Icon = config.icon;
                return (
                  <tr key={item.id} className="border-t border-border/40 hover:bg-muted/20">
                    <td className="p-2 font-bold text-muted-foreground">{i + 1}</td>
                    <td className="p-2">
                      <div className="flex items-center gap-1.5">
                        <Icon className={cn("h-3 w-3", config.text)} />
                        <span className="font-medium">{item.name}</span>
                      </div>
                    </td>
                    <td className="p-2 text-right tabular-nums">{formatEUR(item.price)}</td>
                    <td className="p-2 text-right tabular-nums text-muted-foreground">{formatEUR(item.foodCost)}</td>
                    <td className="p-2 text-right">
                      <span className={cn(
                        "font-bold tabular-nums",
                        item.profitMargin >= 60 ? "text-emerald-600 dark:text-emerald-400" :
                        item.profitMargin >= 30 ? "text-amber-600 dark:text-amber-400" :
                        "text-rose-600 dark:text-rose-400"
                      )}>
                        {item.profitMargin}%
                      </span>
                    </td>
                    <td className="p-2 text-right tabular-nums">{item.quantitySold}×</td>
                    <td className="p-2 text-right font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                      {formatEUR(item.totalProfit)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
