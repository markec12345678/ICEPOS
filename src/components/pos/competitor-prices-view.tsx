"use client";

import { useEffect, useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
  TrendingDown,
  TrendingUp,
  Minus,
  Euro,
  Search,
  ArrowDown,
  ArrowUp,
} from "lucide-react";
import { authHeaders } from "@/components/pos/pin-login";
import { formatEUR } from "@/lib/types";
import { LoadingSpinner, EmptyState } from "@/components/pos/loading-states";

interface CompetitorPrice {
  competitor: string;
  price: number;
  difference: number;
  differencePercent: number;
}

interface PriceItem {
  menuItemId: string;
  name: string;
  category: string;
  ourPrice: number;
  competitorPrices: CompetitorPrice[];
  avgCompetitorPrice: number;
  minCompetitorPrice: number;
  maxCompetitorPrice: number;
  ourPriceVsAvg: number;
  ourPriceVsMin: number;
  pricePosition: "below" | "average" | "above";
  recommendation: string;
}

interface CategoryAgg {
  category: string;
  itemCount: number;
  avgOurPrice: number;
  avgCompetitorPrice: number;
  avgDifference: number;
}

interface CompetitorsData {
  items: PriceItem[];
  competitors: string[];
  categorySummary: CategoryAgg[];
  summary: {
    totalItems: number;
    belowCount: number;
    averageCount: number;
    aboveCount: number;
    avgPriceDifference: number;
  };
}

const CATEGORY_LABELS: Record<string, string> = {
  predjedi: "Predjedi",
  glavne_jedi: "Glavne jedi",
  sladice: "Sladice",
  brezalkoholne: "Brezalkoholne",
  alkoholne: "Alkoholne",
};

function categoryLabel(c: string): string {
  return CATEGORY_LABELS[c] || c;
}

const POSITION_CONFIG: Record<
  string,
  { label: string; icon: typeof TrendingDown; className: string }
> = {
  below: {
    label: "Ceneje",
    icon: TrendingDown,
    className:
      "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300",
  },
  average: {
    label: "Povprečno",
    icon: Minus,
    className:
      "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300",
  },
  above: {
    label: "Dražje",
    icon: TrendingUp,
    className:
      "border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950/30 dark:text-rose-300",
  },
};

export function CompetitorPricesView() {
  const [data, setData] = useState<CompetitorsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [positionFilter, setPositionFilter] = useState("all");

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/competitor-prices", { headers: authHeaders() });
      if (!res.ok) throw new Error("Napaka");
      const json = await res.json();
      setData(json);
    } catch {
      toast.error("Napaka pri nalaganju cen konkurence");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold">Cene konkurence</h2>
          <p className="text-sm text-muted-foreground">Primerjava cen</p>
        </div>
        <LoadingSpinner />
      </div>
    );
  }

  if (!data) return null;

  const s = data.summary;
  const filteredItems = data.items.filter((item) => {
    if (search && !item.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (positionFilter !== "all" && item.pricePosition !== positionFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="flex items-center gap-2 text-2xl font-bold">
          <Trophy className="h-6 w-6 text-amber-600" />
          Cene konkurence
        </h2>
        <p className="text-sm text-muted-foreground">
          Primerjava lastnih cen s cenami konkurentov in priporočila
        </p>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase text-muted-foreground">Skupaj artiklov</p>
              <p className="text-2xl font-bold">{s.totalItems}</p>
            </div>
            <Trophy className="h-8 w-8 text-amber-600/40" />
          </div>
        </Card>
        <Card className="border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900 dark:bg-emerald-950/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase text-emerald-700 dark:text-emerald-300">Ceneje od konkurence</p>
              <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">{s.belowCount}</p>
            </div>
            <ArrowDown className="h-8 w-8 text-emerald-600/60" />
          </div>
        </Card>
        <Card className="border-rose-200 bg-rose-50 p-4 dark:border-rose-900 dark:bg-rose-950/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase text-rose-700 dark:text-rose-300">Dražje od konkurence</p>
              <p className="text-2xl font-bold text-rose-700 dark:text-rose-300">{s.aboveCount}</p>
            </div>
            <ArrowUp className="h-8 w-8 text-rose-600/60" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase text-muted-foreground">Pov. razlika</p>
              <p className={`text-2xl font-bold ${s.avgPriceDifference > 0 ? "text-rose-600" : "text-emerald-600"}`}>
                {s.avgPriceDifference > 0 ? "+" : ""}{s.avgPriceDifference.toFixed(1)}%
              </p>
            </div>
            <Euro className="h-8 w-8 text-muted-foreground/40" />
          </div>
        </Card>
      </div>

      {/* Po kategorijah */}
      {data.categorySummary.length > 0 && (
        <Card className="overflow-hidden">
          <div className="border-b bg-muted/50 p-4">
            <h3 className="font-semibold">Primerjava po kategorijah</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/30">
                <tr className="border-b">
                  <th className="px-3 py-2 text-left font-semibold">Kategorija</th>
                  <th className="px-3 py-2 text-right font-semibold">Artikli</th>
                  <th className="px-3 py-2 text-right font-semibold">Pov. naša cena</th>
                  <th className="px-3 py-2 text-right font-semibold">Pov. konkurenca</th>
                  <th className="px-3 py-2 text-right font-semibold">Razlika</th>
                </tr>
              </thead>
              <tbody>
                {data.categorySummary.map((c) => (
                  <tr key={c.category} className="border-b">
                    <td className="px-3 py-2 font-medium">{categoryLabel(c.category)}</td>
                    <td className="px-3 py-2 text-right">{c.itemCount}</td>
                    <td className="px-3 py-2 text-right">{formatEUR(c.avgOurPrice)}</td>
                    <td className="px-3 py-2 text-right text-muted-foreground">{formatEUR(c.avgCompetitorPrice)}</td>
                    <td className="px-3 py-2 text-right">
                      <span className={c.avgDifference > 0 ? "text-rose-600" : "text-emerald-600"}>
                        {c.avgDifference > 0 ? "+" : ""}{c.avgDifference.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Filtri */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Išči artikle..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={positionFilter} onValueChange={setPositionFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Pozicija cene" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Vse pozicije</SelectItem>
            <SelectItem value="below">Ceneje</SelectItem>
            <SelectItem value="average">Povprečno</SelectItem>
            <SelectItem value="above">Dražje</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tabela cen */}
      {filteredItems.length === 0 ? (
        <EmptyState
          icon={Trophy}
          title="Ni artiklov"
          description="Ni artiklov, ki ustrezajo filtrom"
        />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr className="border-b">
                  <th className="px-3 py-3 text-left font-semibold">Artikel</th>
                  <th className="px-3 py-3 text-right font-semibold">Naša cena</th>
                  {data.competitors.map((comp) => (
                    <th key={comp} className="px-3 py-3 text-right font-semibold">{comp}</th>
                  ))}
                  <th className="px-3 py-3 text-right font-semibold">Pov. konk.</th>
                  <th className="px-3 py-3 text-right font-semibold">Razlika</th>
                  <th className="px-3 py-3 text-center font-semibold">Pozicija</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item) => {
                  const posCfg = POSITION_CONFIG[item.pricePosition];
                  const PosIcon = posCfg.icon;
                  return (
                    <tr key={item.menuItemId} className="border-b">
                      <td className="px-3 py-3">
                        <p className="font-medium">{item.name}</p>
                        <p className="text-xs text-muted-foreground">{categoryLabel(item.category)}</p>
                      </td>
                      <td className="px-3 py-3 text-right font-bold">{formatEUR(item.ourPrice)}</td>
                      {item.competitorPrices.map((cp) => (
                        <td key={cp.competitor} className="px-3 py-3 text-right">
                          <div>
                            <p className={cp.price < item.ourPrice ? "text-rose-600" : "text-emerald-600"}>
                              {formatEUR(cp.price)}
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              {cp.difference > 0 ? "+" : ""}{cp.differencePercent}%
                            </p>
                          </div>
                        </td>
                      ))}
                      <td className="px-3 py-3 text-right text-muted-foreground">
                        {formatEUR(item.avgCompetitorPrice)}
                      </td>
                      <td className="px-3 py-3 text-right">
                        <span className={item.ourPriceVsAvg > 0 ? "text-rose-600" : "text-emerald-600"}>
                          {item.ourPriceVsAvg > 0 ? "+" : ""}{item.ourPriceVsAvg}%
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <Badge variant="outline" className={posCfg.className}>
                          <PosIcon className="mr-1 h-3 w-3" />
                          {posCfg.label}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
