"use client";

import { useEffect, useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  Calculator,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  Euro,
  Package,
  Percent,
  Search,
} from "lucide-react";
import { authHeaders } from "@/components/pos/pin-login";
import { formatEUR } from "@/lib/types";
import { LoadingSpinner, EmptyState } from "@/components/pos/loading-states";

interface Ingredient {
  name: string;
  quantity: number;
  unit: string;
  costPerUnit: number;
  lineCost: number;
  supplier: string | null;
}

interface CostItem {
  id: string;
  name: string;
  category: string;
  price: number;
  foodCost: number;
  foodCostPct: number;
  profitPerUnit: number;
  profitMarginPct: number;
  health: "healthy" | "warning" | "critical";
  ingredients: Ingredient[];
  hasRecipe: boolean;
  available: boolean;
}

interface CategorySummary {
  category: string;
  count: number;
  totalFoodCost: number;
  totalRevenue: number;
  totalProfit: number;
  avgFoodCostPct: number;
}

interface SupplierInfo {
  id: string;
  name: string;
  discountPercent: number;
  paymentTerms: string;
}

interface CostData {
  items: CostItem[];
  categorySummary: CategorySummary[];
  summary: {
    totalItems: number;
    itemsWithRecipe: number;
    itemsWithoutRecipe: number;
    avgFoodCostPct: number;
    avgProfitMargin: number;
    healthyCount: number;
    warningCount: number;
    criticalCount: number;
    totalSuppliers: number;
  };
  suppliers: SupplierInfo[];
}

const CATEGORY_LABELS: Record<string, string> = {
  predjedi: "Predjedi",
  glavne_jedi: "Glavne jedi",
  sladice: "Sladice",
  brezalkoholne: "Brezalkoholne pijače",
  alkoholne: "Alkoholne pijače",
};

function categoryLabel(c: string): string {
  return CATEGORY_LABELS[c] || c;
}

export function CostAnalysisView() {
  const [data, setData] = useState<CostData | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [healthFilter, setHealthFilter] = useState("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/cost-analysis", { headers: authHeaders() });
      if (!res.ok) throw new Error("Napaka");
      const json = await res.json();
      setData(json);
    } catch {
      toast.error("Napaka pri nalaganju analize stroškov");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredItems = (data?.items || []).filter((item) => {
    if (search && !item.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (categoryFilter !== "all" && item.category !== categoryFilter) return false;
    if (healthFilter !== "all" && item.health !== healthFilter) return false;
    return true;
  });

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold">Analiza stroškov</h2>
          <p className="text-sm text-muted-foreground">
            Food cost analiza jedi na podlagi receptov in zaloge
          </p>
        </div>
        <LoadingSpinner />
      </div>
    );
  }

  if (!data) return null;

  const s = data.summary;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="flex items-center gap-2 text-2xl font-bold">
          <Calculator className="h-6 w-6 text-amber-600" />
          Analiza stroškov
        </h2>
        <p className="text-sm text-muted-foreground">
          Food cost analiza jedi na podlagi receptov in zaloge — primerjava dobaviteljev
        </p>
      </div>

      {/* KPI kartice */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase text-muted-foreground">
                Povprečni food cost
              </p>
              <p className="text-2xl font-bold text-amber-700 dark:text-amber-400">
                {s.avgFoodCostPct.toFixed(1)}%
              </p>
            </div>
            <Percent className="h-8 w-8 text-amber-600/40" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase text-muted-foreground">
                Povprečna marža
              </p>
              <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">
                {s.avgProfitMargin.toFixed(1)}%
              </p>
            </div>
            <TrendingUp className="h-8 w-8 text-emerald-600/40" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase text-muted-foreground">
                Jedi z receptom
              </p>
              <p className="text-2xl font-bold">
                {s.itemsWithRecipe}
                <span className="text-sm text-muted-foreground"> / {s.totalItems}</span>
              </p>
            </div>
            <Package className="h-8 w-8 text-muted-foreground/40" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase text-muted-foreground">
                Aktivni dobavitelji
              </p>
              <p className="text-2xl font-bold">{s.totalSuppliers}</p>
            </div>
            <Euro className="h-8 w-8 text-muted-foreground/40" />
          </div>
        </Card>
      </div>

      {/* Health povzetek */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900 dark:bg-emerald-950/30">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-8 w-8 text-emerald-600" />
            <div>
              <p className="text-xs font-medium uppercase text-emerald-700 dark:text-emerald-300">
                Zdrave (&lt;40% FC)
              </p>
              <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">
                {s.healthyCount}
              </p>
            </div>
          </div>
        </Card>
        <Card className="border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/30">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-8 w-8 text-amber-600" />
            <div>
              <p className="text-xs font-medium uppercase text-amber-700 dark:text-amber-300">
                Opozorilo (40–60% FC)
              </p>
              <p className="text-2xl font-bold text-amber-700 dark:text-amber-300">
                {s.warningCount}
              </p>
            </div>
          </div>
        </Card>
        <Card className="border-rose-200 bg-rose-50 p-4 dark:border-rose-900 dark:bg-rose-950/30">
          <div className="flex items-center gap-3">
            <TrendingDown className="h-8 w-8 text-rose-600" />
            <div>
              <p className="text-xs font-medium uppercase text-rose-700 dark:text-rose-300">
                Kritično (&gt;60% FC)
              </p>
              <p className="text-2xl font-bold text-rose-700 dark:text-rose-300">
                {s.criticalCount}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filtri */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Išči jedi..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Kategorija" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Vse kategorije</SelectItem>
            {Object.keys(CATEGORY_LABELS).map((c) => (
              <SelectItem key={c} value={c}>
                {CATEGORY_LABELS[c]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={healthFilter} onValueChange={setHealthFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Stanje" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Vsa stanja</SelectItem>
            <SelectItem value="healthy">Zdrave</SelectItem>
            <SelectItem value="warning">Opozorilo</SelectItem>
            <SelectItem value="critical">Kritično</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tabela jedi */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr className="border-b">
                <th className="px-4 py-3 text-left font-semibold">Jed</th>
                <th className="px-4 py-3 text-right font-semibold">Cena</th>
                <th className="px-4 py-3 text-right font-semibold">Food cost</th>
                <th className="px-4 py-3 text-right font-semibold">FC %</th>
                <th className="px-4 py-3 text-right font-semibold">Dobiček/kos</th>
                <th className="px-4 py-3 text-right font-semibold">Marža</th>
                <th className="px-4 py-3 text-center font-semibold">Stanje</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                    Ni jedi, ki ustrezajo filtrom
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => (
                  <>
                    <tr
                      key={item.id}
                      className="cursor-pointer border-b transition-colors hover:bg-muted/30"
                      onClick={() =>
                        setExpandedId(expandedId === item.id ? null : item.id)
                      }
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{item.name}</span>
                          {!item.hasRecipe && (
                            <Badge variant="outline" className="text-xs text-muted-foreground">
                              brez recepta
                            </Badge>
                          )}
                          {!item.available && (
                            <Badge variant="secondary" className="text-xs">
                              nedosegljivo
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {categoryLabel(item.category)}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-right font-medium">
                        {formatEUR(item.price)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {item.hasRecipe ? formatEUR(item.foodCost) : "—"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {item.hasRecipe ? (
                          <span
                            className={
                              item.health === "healthy"
                                ? "text-emerald-600"
                                : item.health === "warning"
                                ? "text-amber-600"
                                : "text-rose-600"
                            }
                          >
                            {item.foodCostPct.toFixed(1)}%
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-emerald-600">
                        {item.hasRecipe ? formatEUR(item.profitPerUnit) : "—"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {item.hasRecipe ? `${item.profitMarginPct.toFixed(1)}%` : "—"}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {item.hasRecipe ? (
                          <Badge
                            variant="outline"
                            className={
                              item.health === "healthy"
                                ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300"
                                : item.health === "warning"
                                ? "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300"
                                : "border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950/30 dark:text-rose-300"
                            }
                          >
                            {item.health === "healthy"
                              ? "Zdravo"
                              : item.health === "warning"
                              ? "Opozorilo"
                              : "Kritično"}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                    {expandedId === item.id && item.ingredients.length > 0 && (
                      <tr key={`${item.id}-detail`} className="bg-muted/20">
                        <td colSpan={7} className="px-4 py-4">
                          <div className="space-y-2">
                            <p className="text-xs font-semibold uppercase text-muted-foreground">
                              Sestavine ({item.ingredients.length})
                            </p>
                            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                              {item.ingredients.map((ing, idx) => (
                                <div
                                  key={idx}
                                  className="flex items-center justify-between rounded border bg-background p-2 text-xs"
                                >
                                  <div>
                                    <span className="font-medium">{ing.name}</span>
                                    <span className="text-muted-foreground">
                                      {" "}
                                      · {ing.quantity} {ing.unit}
                                    </span>
                                  </div>
                                  <div className="text-right">
                                    <p className="font-medium">{formatEUR(ing.lineCost)}</p>
                                    {ing.supplier && (
                                      <p className="text-[10px] text-muted-foreground">
                                        {ing.supplier}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Povzetek po kategorijah */}
      {data.categorySummary.length > 0 && (
        <Card className="p-4">
          <h3 className="mb-3 text-lg font-semibold">Povzetek po kategorijah</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr className="border-b">
                  <th className="px-3 py-2 text-left font-semibold">Kategorija</th>
                  <th className="px-3 py-2 text-right font-semibold">Jedi</th>
                  <th className="px-3 py-2 text-right font-semibold">Pov. food cost</th>
                  <th className="px-3 py-2 text-right font-semibold">Pov. dobiček/kos</th>
                  <th className="px-3 py-2 text-right font-semibold">Pov. FC %</th>
                </tr>
              </thead>
              <tbody>
                {data.categorySummary.map((cat) => (
                  <tr key={cat.category} className="border-b">
                    <td className="px-3 py-2 font-medium">{categoryLabel(cat.category)}</td>
                    <td className="px-3 py-2 text-right">{cat.count}</td>
                    <td className="px-3 py-2 text-right">{formatEUR(cat.totalFoodCost)}</td>
                    <td className="px-3 py-2 text-right text-emerald-600">
                      {formatEUR(cat.totalProfit)}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <span
                        className={
                          cat.avgFoodCostPct > 60
                            ? "text-rose-600"
                            : cat.avgFoodCostPct > 40
                            ? "text-amber-600"
                            : "text-emerald-600"
                        }
                      >
                        {cat.avgFoodCostPct.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Dobavitelji */}
      {data.suppliers.length > 0 && (
        <Card className="p-4">
          <h3 className="mb-3 text-lg font-semibold">Dobavitelji</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {data.suppliers.map((sup) => (
              <div key={sup.id} className="rounded border p-3">
                <p className="font-medium">{sup.name}</p>
                <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                  {sup.discountPercent > 0 && (
                    <Badge variant="outline" className="text-emerald-600">
                      {sup.discountPercent}% rabat
                    </Badge>
                  )}
                  <span>{sup.paymentTerms}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {data.items.length === 0 && (
        <EmptyState
          icon={Calculator}
          title="Ni podatkov"
          description="Dodaj meni postavke in recepte za analizo stroškov"
        />
      )}
    </div>
  );
}
