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
  Apple,
  Flame,
  Beef,
  Wheat,
  Droplet,
  TrendingUp,
  TrendingDown,
  Award,
  Search,
} from "lucide-react";
import { authHeaders } from "@/components/pos/pin-login";
import { formatEUR } from "@/lib/types";
import { LoadingSpinner, EmptyState } from "@/components/pos/loading-states";

interface NutritionItem {
  id: string;
  name: string;
  nameEn: string | null;
  category: string;
  price: number;
  available: boolean;
  calories: number;
  originalCalories: number | null;
  protein: number;
  carbs: number;
  fat: number;
  proteinCalories: number;
  carbsCalories: number;
  fatCalories: number;
  proteinPercent: number;
  carbsPercent: number;
  fatPercent: number;
  pricePer100kcal: number;
  healthScore: "healthy" | "moderate" | "high";
  recommendations: string[];
  hasNutritionData: boolean;
}

interface CategorySummary {
  category: string;
  count: number;
  avgCalories: number;
  avgProtein: number;
  avgCarbs: number;
  avgFat: number;
  totalCalories: number;
}

interface NutritionData {
  items: NutritionItem[];
  categorySummary: CategorySummary[];
  summary: {
    totalItems: number;
    itemsWithNutrition: number;
    itemsWithoutNutrition: number;
    avgCalories: number;
    avgProtein: number;
    avgCarbs: number;
    avgFat: number;
    healthyCount: number;
    moderateCount: number;
    highCount: number;
    dailyReference: {
      calories: number;
      protein: number;
      carbs: number;
      fat: number;
    };
  };
  highestCalorie: NutritionItem[];
  lowestCalorie: NutritionItem[];
  highestProtein: NutritionItem[];
}

const CATEGORY_LABELS: Record<string, string> = {
  predjedi: "Predjedi",
  glavne_jedi: "Glavne jedi",
  sladice: "Sladice",
  brezalkoholne: "Brezalkoholne",
  alkoholne: "Alkoholne",
};

const HEALTH_CONFIG: Record<
  string,
  { label: string; className: string }
> = {
  healthy: {
    label: "Zdravo",
    className:
      "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300",
  },
  moderate: {
    label: "Zmerno",
    className:
      "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300",
  },
  high: {
    label: "Bogato",
    className:
      "border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950/30 dark:text-rose-300",
  },
};

function categoryLabel(c: string): string {
  return CATEGORY_LABELS[c] || c;
}

export function NutritionCalculatorView() {
  const [data, setData] = useState<NutritionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/nutrition-calculator", { headers: authHeaders() });
      if (!res.ok) throw new Error("Napaka");
      const json = await res.json();
      setData(json);
    } catch {
      toast.error("Napaka pri nalaganju prehranskih vrednosti");
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
          <h2 className="text-2xl font-bold">Prehranski kalkulator</h2>
          <p className="text-sm text-muted-foreground">Analiza prehranske vrednosti menija</p>
        </div>
        <LoadingSpinner />
      </div>
    );
  }

  if (!data) return null;

  const s = data.summary;
  const dr = s.dailyReference;

  const filteredItems = data.items.filter((item) => {
    if (search && !item.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (categoryFilter !== "all" && item.category !== categoryFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="flex items-center gap-2 text-2xl font-bold">
          <Apple className="h-6 w-6 text-emerald-600" />
          Prehranski kalkulator
        </h2>
        <p className="text-sm text-muted-foreground">
          Analiza prehranske vrednosti menija — kalorije, makrohranila, zdravstvena ocena
        </p>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase text-muted-foreground">Pov. kalorije</p>
              <p className="text-2xl font-bold text-amber-700 dark:text-amber-400">
                {s.avgCalories.toFixed(0)}
              </p>
              <p className="text-xs text-muted-foreground">kcal/jed</p>
            </div>
            <Flame className="h-8 w-8 text-amber-600/40" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase text-muted-foreground">Pov. beljakovine</p>
              <p className="text-2xl font-bold text-rose-700 dark:text-rose-400">
                {s.avgProtein.toFixed(1)}g
              </p>
              <p className="text-xs text-muted-foreground">
                {dr.protein > 0 ? `${((s.avgProtein / dr.protein) * 100).toFixed(0)}% dnevne` : ""}
              </p>
            </div>
            <Beef className="h-8 w-8 text-rose-600/40" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase text-muted-foreground">Pov. oglj. hidrati</p>
              <p className="text-2xl font-bold text-amber-700 dark:text-amber-400">
                {s.avgCarbs.toFixed(1)}g
              </p>
              <p className="text-xs text-muted-foreground">
                {dr.carbs > 0 ? `${((s.avgCarbs / dr.carbs) * 100).toFixed(0)}% dnevne` : ""}
              </p>
            </div>
            <Wheat className="h-8 w-8 text-amber-600/40" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase text-muted-foreground">Pov. maščobe</p>
              <p className="text-2xl font-bold text-yellow-700 dark:text-yellow-400">
                {s.avgFat.toFixed(1)}g
              </p>
              <p className="text-xs text-muted-foreground">
                {dr.fat > 0 ? `${((s.avgFat / dr.fat) * 100).toFixed(0)}% dnevne` : ""}
              </p>
            </div>
            <Droplet className="h-8 w-8 text-yellow-600/40" />
          </div>
        </Card>
      </div>

      {/* Zdravstvena ocena */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900 dark:bg-emerald-950/30">
          <div className="flex items-center gap-3">
            <Apple className="h-8 w-8 text-emerald-600" />
            <div>
              <p className="text-xs font-medium uppercase text-emerald-700 dark:text-emerald-300">
                Zdrave jedi
              </p>
              <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">
                {s.healthyCount}
              </p>
              <p className="text-xs text-emerald-700 dark:text-emerald-300">
                &lt;400 kcal, nizka maščoba
              </p>
            </div>
          </div>
        </Card>
        <Card className="border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/30">
          <div className="flex items-center gap-3">
            <Apple className="h-8 w-8 text-amber-600" />
            <div>
              <p className="text-xs font-medium uppercase text-amber-700 dark:text-amber-300">
                Zmerne jedi
              </p>
              <p className="text-2xl font-bold text-amber-700 dark:text-amber-300">
                {s.moderateCount}
              </p>
            </div>
          </div>
        </Card>
        <Card className="border-rose-200 bg-rose-50 p-4 dark:border-rose-900 dark:bg-rose-950/30">
          <div className="flex items-center gap-3">
            <Flame className="h-8 w-8 text-rose-600" />
            <div>
              <p className="text-xs font-medium uppercase text-rose-700 dark:text-rose-300">
                Bogate jedi
              </p>
              <p className="text-2xl font-bold text-rose-700 dark:text-rose-300">
                {s.highCount}
              </p>
              <p className="text-xs text-rose-700 dark:text-rose-300">
                &gt;800 kcal ali &gt;40g maščobe
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Podatki o prehrani */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Pokritost podatkov</p>
            <p className="text-2xl font-bold">
              {s.itemsWithNutrition}/{s.totalItems}
            </p>
          </div>
          <div className="h-3 w-48 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-emerald-500"
              style={{
                width: `${s.totalItems > 0 ? (s.itemsWithNutrition / s.totalItems) * 100 : 0}%`,
              }}
            />
          </div>
        </div>
        {s.itemsWithoutNutrition > 0 && (
          <p className="mt-2 text-xs text-amber-600">
            ⚠ {s.itemsWithoutNutrition} jedi nima podatkov o prehranski vrednosti
          </p>
        )}
      </Card>

      {/* Top jedi */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {data.highestCalorie.length > 0 && (
          <Card className="p-4">
            <h3 className="mb-3 flex items-center gap-2 font-semibold text-rose-700 dark:text-rose-300">
              <TrendingUp className="h-5 w-5" />
              Največ kalorij
            </h3>
            <div className="space-y-2">
              {data.highestCalorie.map((item) => (
                <div key={item.id} className="flex items-center justify-between text-sm">
                  <span className="truncate">{item.name}</span>
                  <Badge variant="outline" className="text-rose-600">
                    {item.calories} kcal
                  </Badge>
                </div>
              ))}
            </div>
          </Card>
        )}
        {data.lowestCalorie.length > 0 && (
          <Card className="p-4">
            <h3 className="mb-3 flex items-center gap-2 font-semibold text-emerald-700 dark:text-emerald-300">
              <TrendingDown className="h-5 w-5" />
              Najmanj kalorij
            </h3>
            <div className="space-y-2">
              {data.lowestCalorie.map((item) => (
                <div key={item.id} className="flex items-center justify-between text-sm">
                  <span className="truncate">{item.name}</span>
                  <Badge variant="outline" className="text-emerald-600">
                    {item.calories} kcal
                  </Badge>
                </div>
              ))}
            </div>
          </Card>
        )}
        {data.highestProtein.length > 0 && (
          <Card className="p-4">
            <h3 className="mb-3 flex items-center gap-2 font-semibold text-rose-700 dark:text-rose-300">
              <Award className="h-5 w-5" />
              Največ beljakovin
            </h3>
            <div className="space-y-2">
              {data.highestProtein.map((item) => (
                <div key={item.id} className="flex items-center justify-between text-sm">
                  <span className="truncate">{item.name}</span>
                  <Badge variant="outline" className="text-rose-600">
                    {item.protein.toFixed(1)}g
                  </Badge>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>

      {/* Po kategorijah */}
      {data.categorySummary.length > 0 && (
        <Card className="p-4">
          <h3 className="mb-3 font-semibold">Povzetek po kategorijah</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/30">
                <tr className="border-b">
                  <th className="px-3 py-2 text-left font-semibold">Kategorija</th>
                  <th className="px-3 py-2 text-right font-semibold">Jedi</th>
                  <th className="px-3 py-2 text-right font-semibold">Pov. kcal</th>
                  <th className="px-3 py-2 text-right font-semibold">Pov. belj.</th>
                  <th className="px-3 py-2 text-right font-semibold">Pov. oglj.</th>
                  <th className="px-3 py-2 text-right font-semibold">Pov. mašč.</th>
                </tr>
              </thead>
              <tbody>
                {data.categorySummary.map((c) => (
                  <tr key={c.category} className="border-b">
                    <td className="px-3 py-2 font-medium">{categoryLabel(c.category)}</td>
                    <td className="px-3 py-2 text-right">{c.count}</td>
                    <td className="px-3 py-2 text-right text-amber-600">{c.avgCalories.toFixed(0)}</td>
                    <td className="px-3 py-2 text-right text-rose-600">{c.avgProtein.toFixed(1)}g</td>
                    <td className="px-3 py-2 text-right text-amber-600">{c.avgCarbs.toFixed(1)}g</td>
                    <td className="px-3 py-2 text-right text-yellow-600">{c.avgFat.toFixed(1)}g</td>
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
              <SelectItem key={c} value={c}>{CATEGORY_LABELS[c]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Tabela jedi */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr className="border-b">
                <th className="px-3 py-3 text-left font-semibold">Jed</th>
                <th className="px-3 py-3 text-right font-semibold">Kalorije</th>
                <th className="px-3 py-3 text-right font-semibold">Belj.</th>
                <th className="px-3 py-3 text-right font-semibold">Oglj.</th>
                <th className="px-3 py-3 text-right font-semibold">Mašč.</th>
                <th className="px-3 py-3 text-left font-semibold">Makro razmerje</th>
                <th className="px-3 py-3 text-center font-semibold">Ocena</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                    Ni jedi, ki ustrezajo filtrom
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => (
                  <tr key={item.id} className="border-b">
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{item.name}</span>
                        {!item.hasNutritionData && (
                          <Badge variant="outline" className="text-xs text-amber-600">
                            brez podatkov
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {categoryLabel(item.category)} · {formatEUR(item.price)}
                      </p>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <span className="font-bold text-amber-700 dark:text-amber-400">
                        {item.calories > 0 ? item.calories : "—"}
                      </span>
                      {item.calories > 0 && (
                        <span className="block text-[10px] text-muted-foreground">
                          kcal
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-right text-rose-600">
                      {item.protein > 0 ? `${item.protein.toFixed(1)}g` : "—"}
                    </td>
                    <td className="px-3 py-3 text-right text-amber-600">
                      {item.carbs > 0 ? `${item.carbs.toFixed(1)}g` : "—"}
                    </td>
                    <td className="px-3 py-3 text-right text-yellow-600">
                      {item.fat > 0 ? `${item.fat.toFixed(1)}g` : "—"}
                    </td>
                    <td className="px-3 py-3">
                      {item.hasNutritionData && item.calories > 0 ? (
                        <div className="flex h-2 w-24 overflow-hidden rounded-full">
                          <div
                            className="bg-rose-500"
                            style={{ width: `${item.proteinPercent}%` }}
                            title={`Beljakovine: ${item.proteinPercent.toFixed(0)}%`}
                          />
                          <div
                            className="bg-amber-500"
                            style={{ width: `${item.carbsPercent}%` }}
                            title={`Ogljikovi: ${item.carbsPercent.toFixed(0)}%`}
                          />
                          <div
                            className="bg-yellow-500"
                            style={{ width: `${item.fatPercent}%` }}
                            title={`Maščobe: ${item.fatPercent.toFixed(0)}%`}
                          />
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-center">
                      <Badge variant="outline" className={HEALTH_CONFIG[item.healthScore].className}>
                        {HEALTH_CONFIG[item.healthScore].label}
                      </Badge>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {data.items.length === 0 && (
        <EmptyState
          icon={Apple}
          title="Ni jedi"
          description="Dodaj meni postavke s prehranskimi podatki za analizo"
        />
      )}

      {/* Legenda */}
      <Card className="p-4">
        <h3 className="mb-2 text-sm font-semibold">Legenda makro razmerja</h3>
        <div className="flex flex-wrap gap-3 text-xs">
          <div className="flex items-center gap-1">
            <div className="h-3 w-3 rounded bg-rose-500" />
            <span>Beljakovine</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="h-3 w-3 rounded bg-amber-500" />
            <span>Ogljikovi hidrati</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="h-3 w-3 rounded bg-yellow-500" />
            <span>Maščobe</span>
          </div>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Dnevne referenčne vrednosti (EU): {dr.calories} kcal, {dr.protein}g beljakovin, {dr.carbs}g ogljikovih hidratov, {dr.fat}g maščob
        </p>
      </Card>
    </div>
  );
}
