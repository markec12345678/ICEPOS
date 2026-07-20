"use client";

import { useEffect, useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  History,
  Clock,
  Euro,
  Percent,
  Package,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { authHeaders } from "@/components/pos/pin-login";
import { formatEUR } from "@/lib/types";
import { LoadingSpinner, EmptyState } from "@/components/pos/loading-states";

interface Ingredient {
  recipeId: string;
  inventoryItemId: string;
  ingredientName: string;
  quantity: number;
  unit: string;
  costPerUnit: number;
  lineCost: number;
  createdAt: string;
}

interface RecipeItem {
  menuItemId: string;
  menuItemName: string;
  category: string;
  price: number;
  ingredients: Ingredient[];
  totalCost: number;
  foodCostPct: number;
  versionCount: number;
  lastModified: string;
}

interface VersionEntry {
  date: string;
  changes: number;
  ingredients: string[];
}

interface Summary {
  totalRecipes: number;
  totalIngredients: number;
  avgFoodCostPct: number;
  totalFoodCost: number;
  avgIngredientsPerRecipe: number;
  recentlyModified: number;
  highFoodCost: number;
  criticalFoodCost: number;
}

interface VersioningData {
  items: RecipeItem[];
  summary: Summary;
  versionHistory: VersionEntry[];
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

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("sl-SI");
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("sl-SI", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function foodCostColor(pct: number): string {
  if (pct > 60) return "text-rose-600";
  if (pct > 40) return "text-amber-600";
  return "text-emerald-600";
}

export function RecipeVersioningView() {
  const [data, setData] = useState<VersioningData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const url = selectedItemId
        ? `/api/recipe-versioning?menuItemId=${selectedItemId}`
        : "/api/recipe-versioning";
      const res = await fetch(url, { headers: authHeaders() });
      if (!res.ok) throw new Error("Napaka");
      const json = await res.json();
      setData(json);
    } catch {
      toast.error("Napaka pri nalaganju verzij receptov");
    } finally {
      setLoading(false);
    }
  }, [selectedItemId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold">Verzije receptov</h2>
          <p className="text-sm text-muted-foreground">Zgodovina sprememb receptov</p>
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
          <History className="h-6 w-6 text-amber-600" />
          Verzije receptov
        </h2>
        <p className="text-sm text-muted-foreground">
          Sledenje spremembam receptov, food cost analiza in zgodovina sestavin
        </p>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase text-muted-foreground">Recepti</p>
              <p className="text-2xl font-bold">{s.totalRecipes}</p>
              <p className="text-xs text-muted-foreground">{s.totalIngredients} sestavin</p>
            </div>
            <Package className="h-8 w-8 text-amber-600/40" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase text-muted-foreground">Pov. food cost</p>
              <p className={`text-2xl font-bold ${foodCostColor(s.avgFoodCostPct)}`}>
                {s.avgFoodCostPct.toFixed(1)}%
              </p>
            </div>
            <Percent className="h-8 w-8 text-amber-600/40" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase text-muted-foreground">Skupni food cost</p>
              <p className="text-2xl font-bold">{formatEUR(s.totalFoodCost)}</p>
            </div>
            <Euro className="h-8 w-8 text-muted-foreground/40" />
          </div>
        </Card>
        <Card className="border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase text-amber-700 dark:text-amber-300">
                Nedavno spremenjeno
              </p>
              <p className="text-2xl font-bold text-amber-700 dark:text-amber-300">
                {s.recentlyModified}
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-300">v zadnjih 7 dneh</p>
            </div>
            <Clock className="h-8 w-8 text-amber-600/60" />
          </div>
        </Card>
      </div>

      {/* Food cost opozorila */}
      {(s.highFoodCost > 0 || s.criticalFoodCost > 0) && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {s.highFoodCost > 0 && (
            <Card className="border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/30">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-8 w-8 text-amber-600" />
                <div>
                  <p className="text-xs font-medium uppercase text-amber-700 dark:text-amber-300">
                    Visok food cost (40-60%)
                  </p>
                  <p className="text-2xl font-bold text-amber-700 dark:text-amber-300">
                    {s.highFoodCost}
                  </p>
                </div>
              </div>
            </Card>
          )}
          {s.criticalFoodCost > 0 && (
            <Card className="border-rose-200 bg-rose-50 p-4 dark:border-rose-900 dark:bg-rose-950/30">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-8 w-8 text-rose-600" />
                <div>
                  <p className="text-xs font-medium uppercase text-rose-700 dark:text-rose-300">
                    Kritičen food cost (&gt;60%)
                  </p>
                  <p className="text-2xl font-bold text-rose-700 dark:text-rose-300">
                    {s.criticalFoodCost}
                  </p>
                </div>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Verzije za izbran recept */}
      {selectedItemId && data.versionHistory.length > 0 && (
        <Card className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-semibold">Zgodovina sprememb</h3>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setSelectedItemId(null)}
            >
              Prikaži vse
            </Button>
          </div>
          <div className="max-h-64 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-background">
                <tr className="border-b">
                  <th className="px-3 py-2 text-left font-semibold">Datum</th>
                  <th className="px-3 py-2 text-right font-semibold">Spremembe</th>
                  <th className="px-3 py-2 text-left font-semibold">Sestavine</th>
                </tr>
              </thead>
              <tbody>
                {data.versionHistory.map((v) => (
                  <tr key={v.date} className="border-b">
                    <td className="px-3 py-2 font-medium">{formatDate(v.date)}</td>
                    <td className="px-3 py-2 text-right">{v.changes}</td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">
                      {v.ingredients.join(", ")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Seznam receptov */}
      {data.items.length === 0 ? (
        <EmptyState
          icon={History}
          title="Ni receptov"
          description="Dodaj recepte v Inventory za prikaz verzij"
        />
      ) : (
        <Card className="overflow-hidden">
          <div className="divide-y">
            {data.items.map((item) => (
              <div key={item.menuItemId}>
                <button
                  className="flex w-full items-center justify-between p-4 text-left transition-colors hover:bg-muted/30"
                  onClick={() => setExpandedId(expandedId === item.menuItemId ? null : item.menuItemId)}
                >
                  <div className="flex items-center gap-3">
                    {expandedId === item.menuItemId ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                    <div>
                      <p className="font-medium">{item.menuItemName}</p>
                      <p className="text-xs text-muted-foreground">
                        {categoryLabel(item.category)} · {item.ingredients.length} sestavin ·{" "}
                        {formatDateTime(item.lastModified)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-bold ${foodCostColor(item.foodCostPct)}`}>
                      {item.foodCostPct.toFixed(1)}%
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatEUR(item.totalCost)} / {formatEUR(item.price)}
                    </p>
                  </div>
                </button>
                {expandedId === item.menuItemId && (
                  <div className="bg-muted/20 p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <p className="text-xs font-semibold uppercase text-muted-foreground">
                        Sestavine ({item.ingredients.length})
                      </p>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedItemId(item.menuItemId)}
                      >
                        <History className="mr-1 h-3 w-3" />
                        Zgodovina
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      {item.ingredients.map((ing) => (
                        <div
                          key={ing.recipeId}
                          className="rounded border bg-background p-2 text-xs"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{ing.ingredientName}</span>
                            <span className="text-muted-foreground">
                              {formatDateTime(ing.createdAt)}
                            </span>
                          </div>
                          <p className="mt-1 text-muted-foreground">
                            {ing.quantity} {ing.unit} × {formatEUR(ing.costPerUnit)} ={" "}
                            <span className="font-medium">{formatEUR(ing.lineCost)}</span>
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
