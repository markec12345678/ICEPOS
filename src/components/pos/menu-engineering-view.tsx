"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MenuCostAnalysis } from "@/components/pos/menu-cost-analysis";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Star, TrendingUp, Puzzle, Dog, Sparkles } from "lucide-react";
import { formatEUR } from "@/lib/types";

interface MenuItemAnalysis {
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
  classification: "STAR" | "HORSE" | "PUZZLE" | "DOG";
  recommendation: string;
}

interface MenuEngineeringData {
  items: MenuItemAnalysis[];
  summary: {
    totalItems: number;
    stars: number;
    horses: number;
    puzzles: number;
    dogs: number;
    avgProfitMargin: number;
    avgFoodCostPct: number;
    totalRevenue: number;
    totalProfit: number;
  };
  medianProfit: number;
  medianPopularity: number;
  days: number;
}

const CLASSIFICATION_CONFIG = {
  STAR: {
    label: "Zvezda",
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-50 dark:bg-amber-950/30",
    border: "border-amber-300 dark:border-amber-800",
    icon: Star,
    description: "Visok profit + visoka popularnost",
  },
  HORSE: {
    label: "Konj",
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-50 dark:bg-blue-950/30",
    border: "border-blue-300 dark:border-blue-800",
    icon: TrendingUp,
    description: "Nizek profit + visoka popularnost",
  },
  PUZZLE: {
    label: "Uganka",
    color: "text-purple-600 dark:text-purple-400",
    bg: "bg-purple-50 dark:bg-purple-950/30",
    border: "border-purple-300 dark:border-purple-800",
    icon: Puzzle,
    description: "Visok profit + nizka popularnost",
  },
  DOG: {
    label: "Pes",
    color: "text-rose-600 dark:text-rose-400",
    bg: "bg-rose-50 dark:bg-rose-950/30",
    border: "border-rose-300 dark:border-rose-800",
    icon: Dog,
    description: "Nizek profit + nizka popularnost",
  },
};

export function MenuEngineeringView() {
  const [data, setData] = useState<MenuEngineeringData | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState("30");
  const [filter, setFilter] = useState<"ALL" | "STAR" | "HORSE" | "PUZZLE" | "DOG">("ALL");

  useEffect(() => {
    load();
  }, [days]);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`/api/menu-engineering?days=${days}`);
      if (!res.ok) throw new Error("Napaka");
      setData(await res.json());
    } catch {
      toast.error("Napaka pri nalaganju analize");
    } finally {
      setLoading(false);
    }
  }

  if (loading || !data) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-muted-foreground">Analiziram meni...</div>
      </div>
    );
  }

  const filteredItems =
    filter === "ALL"
      ? data.items
      : data.items.filter((i) => i.classification === filter);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Menu Engineering</h2>
          <p className="text-sm text-muted-foreground">
            Analiza profitabilnosti in popularnosti po Bostonski matriki
          </p>
        </div>
        <Select value={days} onValueChange={setDays}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Zadnjih 7 dni</SelectItem>
            <SelectItem value="30">Zadnjih 30 dni</SelectItem>
            <SelectItem value="90">Zadnjih 90 dni</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card className={`p-4 ${CLASSIFICATION_CONFIG.STAR.bg} ${CLASSIFICATION_CONFIG.STAR.border} border-2`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Zvezde</p>
              <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                {data.summary.stars}
              </p>
            </div>
            <Star className="h-6 w-6 text-amber-600 dark:text-amber-400" />
          </div>
        </Card>
        <Card className={`p-4 ${CLASSIFICATION_CONFIG.HORSE.bg} ${CLASSIFICATION_CONFIG.HORSE.border} border-2`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Konji</p>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {data.summary.horses}
              </p>
            </div>
            <TrendingUp className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
        </Card>
        <Card className={`p-4 ${CLASSIFICATION_CONFIG.PUZZLE.bg} ${CLASSIFICATION_CONFIG.PUZZLE.border} border-2`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Uganke</p>
              <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {data.summary.puzzles}
              </p>
            </div>
            <Puzzle className="h-6 w-6 text-purple-600 dark:text-purple-400" />
          </div>
        </Card>
        <Card className={`p-4 ${CLASSIFICATION_CONFIG.DOG.bg} ${CLASSIFICATION_CONFIG.DOG.border} border-2`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Psi</p>
              <p className="text-2xl font-bold text-rose-600 dark:text-rose-400">
                {data.summary.dogs}
              </p>
            </div>
            <Dog className="h-6 w-6 text-rose-600 dark:text-rose-400" />
          </div>
        </Card>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card className="p-3">
          <p className="text-xs text-muted-foreground">Skupaj promet</p>
          <p className="text-lg font-bold">{formatEUR(data.summary.totalRevenue)}</p>
        </Card>
        <Card className="p-3">
          <p className="text-xs text-muted-foreground">Skupaj profit</p>
          <p className="text-lg font-bold text-emerald-600">{formatEUR(data.summary.totalProfit)}</p>
        </Card>
        <Card className="p-3">
          <p className="text-xs text-muted-foreground">Povp. profit margin</p>
          <p className="text-lg font-bold">{data.summary.avgProfitMargin}%</p>
        </Card>
        <Card className="p-3">
          <p className="text-xs text-muted-foreground">Povp. food cost</p>
          <p className="text-lg font-bold">{data.summary.avgFoodCostPct}%</p>
        </Card>
      </div>

      {/* Filter buttons */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant={filter === "ALL" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("ALL")}
        >
          Vse ({data.items.length})
        </Button>
        <Button
          variant={filter === "STAR" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("STAR")}
          className={filter === "STAR" ? "" : "border-amber-300 text-amber-700 dark:border-amber-800 dark:text-amber-400"}
        >
          <Star className="mr-1 h-3 w-3" /> Zvezde ({data.summary.stars})
        </Button>
        <Button
          variant={filter === "HORSE" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("HORSE")}
          className={filter === "HORSE" ? "" : "border-blue-300 text-blue-700 dark:border-blue-800 dark:text-blue-400"}
        >
          <TrendingUp className="mr-1 h-3 w-3" /> Konji ({data.summary.horses})
        </Button>
        <Button
          variant={filter === "PUZZLE" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("PUZZLE")}
          className={filter === "PUZZLE" ? "" : "border-purple-300 text-purple-700 dark:border-purple-800 dark:text-purple-400"}
        >
          <Puzzle className="mr-1 h-3 w-3" /> Uganke ({data.summary.puzzles})
        </Button>
        <Button
          variant={filter === "DOG" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("DOG")}
          className={filter === "DOG" ? "" : "border-rose-300 text-rose-700 dark:border-rose-800 dark:text-rose-400"}
        >
          <Dog className="mr-1 h-3 w-3" /> Psi ({data.summary.dogs})
        </Button>
      </div>

      {/* Items table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="p-3 text-left font-medium">Postavka</th>
                <th className="p-3 text-left font-medium">Klasifikacija</th>
                <th className="p-3 text-right font-medium">Cena</th>
                <th className="p-3 text-right font-medium">Food cost</th>
                <th className="p-3 text-right font-medium">Profit/kos</th>
                <th className="p-3 text-right font-medium">Prodano</th>
                <th className="p-3 text-right font-medium">Skupaj profit</th>
                <th className="p-3 text-left font-medium">Priporočilo</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-6 text-center text-muted-foreground">
                    Ni postavk v tej kategoriji
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => {
                  const cfg = CLASSIFICATION_CONFIG[item.classification];
                  const Icon = cfg.icon;
                  return (
                    <tr key={item.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="p-3">
                        <div className="font-medium">{item.name}</div>
                        <div className="text-xs text-muted-foreground">{item.category}</div>
                      </td>
                      <td className="p-3">
                        <Badge
                          variant="outline"
                          className={`${cfg.bg} ${cfg.color} ${cfg.border} gap-1`}
                        >
                          <Icon className="h-3 w-3" />
                          {cfg.label}
                        </Badge>
                      </td>
                      <td className="p-3 text-right">{formatEUR(item.price)}</td>
                      <td className="p-3 text-right">
                        <span className={item.foodCostPct > 35 ? "text-rose-600" : ""}>
                          {formatEUR(item.foodCost)}
                          <span className="text-xs text-muted-foreground"> ({item.foodCostPct}%)</span>
                        </span>
                      </td>
                      <td className="p-3 text-right font-medium text-emerald-600">
                        {formatEUR(item.profitPerUnit)}
                      </td>
                      <td className="p-3 text-right">
                        <span className={item.quantitySold === 0 ? "text-rose-600" : ""}>
                          {item.quantitySold}
                        </span>
                      </td>
                      <td className="p-3 text-right font-bold">
                        {formatEUR(item.totalProfit)}
                      </td>
                      <td className="p-3 text-xs text-muted-foreground max-w-xs">
                        <Sparkles className="mr-1 inline h-3 w-3 text-amber-500" />
                        {item.recommendation}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Menu Cost Analysis — detalna analiza stroškov */}
      <div>
        <h3 className="mb-3 text-sm font-semibold">💰 Analiza stroškov in marž</h3>
        <MenuCostAnalysis items={data.items} />
      </div>

      {/* Info card */}
      <Card className="p-4 bg-muted/30">
        <h3 className="mb-2 text-sm font-semibold">💡 Kaj pomeni Bostonska matrika?</h3>
        <div className="grid grid-cols-1 gap-2 text-xs text-muted-foreground md:grid-cols-2">
          <p><strong className="text-amber-600">⭐ Zvezda</strong> — visok profit + visoka popularnost. Ohrani in promoviraj.</p>
          <p><strong className="text-blue-600">📈 Konj</strong> — nizek profit + visoka popularnost. Znižaj food cost ali zvišaj ceno.</p>
          <p><strong className="text-purple-600">🧩 Uganka</strong> — visok profit + nizka popularnost. Promoviraj, dodaj v combo.</p>
          <p><strong className="text-rose-600">🐕 Pes</strong> — nizek profit + nizka popularnost. Razmisli o umiku iz menija.</p>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Median profit na kos: <strong>{formatEUR(data.medianProfit)}</strong> · Median popularnost: <strong>{data.medianPopularity} kos</strong>
        </p>
      </Card>
    </div>
  );
}
