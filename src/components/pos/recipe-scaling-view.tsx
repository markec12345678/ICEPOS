"use client";

import { useEffect, useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Scale,
  Plus,
  Minus,
  ShoppingCart,
  Download,
  Package,
  Euro,
  UtensilsCrossed,
  AlertCircle,
} from "lucide-react";
import { authHeaders } from "@/components/pos/pin-login";
import { formatEUR } from "@/lib/types";
import { LoadingSpinner, EmptyState } from "@/components/pos/loading-states";

interface ScaledIngredient {
  inventoryItemId: string;
  name: string;
  unit: string;
  baseQuantity: number;
  scaledQuantity: number;
  costPerUnit: number;
  baseCost: number;
  scaledCost: number;
  supplier: string | null;
  currentStock: number;
}

interface ScaledRecipe {
  id: string;
  name: string;
  category: string;
  price: number;
  portions: number;
  baseFoodCost: number;
  scaledFoodCost: number;
  ingredients: ScaledIngredient[];
}

interface ShoppingItem {
  name: string;
  unit: string;
  totalQuantity: number;
  costPerUnit: number;
  totalCost: number;
  supplier: string | null;
  currentStock: number;
  needed: number;
}

interface ScalingData {
  portions: number;
  items: ScaledRecipe[];
  shoppingList: ShoppingItem[];
  summary: {
    totalItems: number;
    totalPortions: number;
    totalFoodCost: number;
    costPerPortion: number;
    shoppingItems: number;
    itemsToBuy: number;
    totalShoppingCost: number;
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

export function RecipeScalingView() {
  const [data, setData] = useState<ScalingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [portions, setPortions] = useState(10);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/recipe-scaling?all=true&portions=${portions}`, {
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error("Napaka");
      const json = await res.json();
      setData(json);
    } catch {
      toast.error("Napaka pri nalaganju preračuna receptov");
    } finally {
      setLoading(false);
    }
  }, [portions]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  function exportShoppingList() {
    if (!data || data.shoppingList.length === 0) return;
    const lines: string[] = [];
    lines.push(`Nakupni seznam za ${portions} porcij`);
    lines.push(`Skupni strošek: ${data.summary.totalShoppingCost.toFixed(2)}€`);
    lines.push("");
    lines.push("SESTAVINA;KOLIČINA;ENOTA;CENA/ENOTO;SKUPAJ;NA ZALOGI;MANJKA;DOBAVITELJ");
    for (const item of data.shoppingList) {
      lines.push(
        `${item.name};${item.totalQuantity.toFixed(2)};${item.unit};${item.costPerUnit.toFixed(2)};${item.totalCost.toFixed(2)};${item.currentStock.toFixed(2)};${item.needed.toFixed(2)};${item.supplier || ""}`
      );
    }
    const csv = lines.join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `nakupni-seznam-${portions}-porcij.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("✓ Nakupni seznam izvožen");
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold">Preračun receptov</h2>
          <p className="text-sm text-muted-foreground">Skaliranje receptov za X porcij</p>
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
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-2xl font-bold">
            <Scale className="h-6 w-6 text-amber-600" />
            Preračun receptov
          </h2>
          <p className="text-sm text-muted-foreground">
            Skaliranje receptov za pripravo večje količine — z nakupnim seznamom
          </p>
        </div>
        <Button onClick={exportShoppingList} variant="outline">
          <Download className="mr-1.5 h-4 w-4" />
          Izvozi nakupni seznam
        </Button>
      </div>

      {/* Portions control */}
      <Card className="p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Label className="text-sm font-medium">Število porcij:</Label>
            <div className="flex items-center gap-2">
              <Button
                size="icon"
                variant="outline"
                onClick={() => setPortions(Math.max(1, portions - 1))}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <Input
                type="number"
                value={portions}
                onChange={(e) => setPortions(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-20 text-center"
              />
              <Button
                size="icon"
                variant="outline"
                onClick={() => setPortions(portions + 1)}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex gap-1">
              {[10, 25, 50, 100].map((p) => (
                <Button
                  key={p}
                  size="sm"
                  variant={portions === p ? "default" : "outline"}
                  onClick={() => setPortions(p)}
                  className={portions === p ? "bg-amber-600 hover:bg-amber-700" : ""}
                >
                  {p}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* KPI kartice */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase text-muted-foreground">
                Jedi z recepti
              </p>
              <p className="text-2xl font-bold">{s.totalItems}</p>
            </div>
            <UtensilsCrossed className="h-8 w-8 text-amber-600/40" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase text-muted-foreground">
                Skupni food cost
              </p>
              <p className="text-2xl font-bold text-amber-700 dark:text-amber-400">
                {formatEUR(s.totalFoodCost)}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatEUR(s.costPerPortion)} / porcija
              </p>
            </div>
            <Euro className="h-8 w-8 text-amber-600/40" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase text-muted-foreground">
                Sestavine v nakupu
              </p>
              <p className="text-2xl font-bold">{s.shoppingItems}</p>
            </div>
            <Package className="h-8 w-8 text-muted-foreground/40" />
          </div>
        </Card>
        <Card className="border-rose-200 bg-rose-50 p-4 dark:border-rose-900 dark:bg-rose-950/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase text-rose-700 dark:text-rose-300">
                Za nakup (manjka)
              </p>
              <p className="text-2xl font-bold text-rose-700 dark:text-rose-300">
                {s.itemsToBuy}
              </p>
              <p className="text-xs text-rose-700 dark:text-rose-300">
                {formatEUR(s.totalShoppingCost)}
              </p>
            </div>
            <AlertCircle className="h-8 w-8 text-rose-600/60" />
          </div>
        </Card>
      </div>

      {/* Seznam receptov */}
      {data.items.length === 0 ? (
        <EmptyState
          icon={Scale}
          title="Ni receptov"
          description="Dodaj recepte v Inventory za preračun skaliranja"
        />
      ) : (
        <Card className="overflow-hidden">
          <div className="border-b bg-muted/50 p-4">
            <h3 className="font-semibold">Recepti za {portions} porcij</h3>
          </div>
          <div className="divide-y">
            {data.items.map((item) => (
              <div key={item.id}>
                <button
                  className="flex w-full items-center justify-between p-4 text-left transition-colors hover:bg-muted/30"
                  onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                >
                  <div>
                    <p className="font-medium">{item.name}</p>
                    <p className="text-xs text-muted-foreground">{categoryLabel(item.category)}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-amber-700 dark:text-amber-400">
                      {formatEUR(item.scaledFoodCost)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatEUR(item.baseFoodCost)} / porcija · {item.ingredients.length} sestavin
                    </p>
                  </div>
                </button>
                {expandedId === item.id && (
                  <div className="bg-muted/20 p-4">
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      {item.ingredients.map((ing) => (
                        <div
                          key={ing.inventoryItemId}
                          className="rounded border bg-background p-2 text-xs"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{ing.name}</span>
                            {ing.scaledQuantity > ing.currentStock && (
                              <Badge variant="outline" className="text-rose-600">
                                Manjka
                              </Badge>
                            )}
                          </div>
                          <p className="mt-1 text-muted-foreground">
                            {ing.scaledQuantity.toFixed(2)} {ing.unit} · {formatEUR(ing.scaledCost)}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            Na zalogi: {ing.currentStock.toFixed(2)} {ing.unit}
                            {ing.supplier && ` · ${ing.supplier}`}
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

      {/* Nakupni seznam */}
      {data.shoppingList.length > 0 && (
        <Card className="overflow-hidden">
          <div className="border-b bg-muted/50 p-4">
            <h3 className="flex items-center gap-2 font-semibold">
              <ShoppingCart className="h-5 w-5" />
              Nakupni seznam
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/30">
                <tr className="border-b">
                  <th className="px-4 py-3 text-left font-semibold">Sestavina</th>
                  <th className="px-4 py-3 text-right font-semibold">Potrebno</th>
                  <th className="px-4 py-3 text-right font-semibold">Na zalogi</th>
                  <th className="px-4 py-3 text-right font-semibold">Manjka</th>
                  <th className="px-4 py-3 text-right font-semibold">Cena/kos</th>
                  <th className="px-4 py-3 text-right font-semibold">Skupaj</th>
                  <th className="px-4 py-3 text-left font-semibold">Dobavitelj</th>
                </tr>
              </thead>
              <tbody>
                {data.shoppingList.map((item, idx) => (
                  <tr key={idx} className="border-b">
                    <td className="px-4 py-3 font-medium">{item.name}</td>
                    <td className="px-4 py-3 text-right">
                      {item.totalQuantity.toFixed(2)} {item.unit}
                    </td>
                    <td className="px-4 py-3 text-right text-muted-foreground">
                      {item.currentStock.toFixed(2)} {item.unit}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {item.needed > 0 ? (
                        <span className="font-bold text-rose-600">
                          {item.needed.toFixed(2)} {item.unit}
                        </span>
                      ) : (
                        <span className="text-emerald-600">✓</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">{formatEUR(item.costPerUnit)}</td>
                    <td className="px-4 py-3 text-right font-medium">
                      {formatEUR(item.needed * item.costPerUnit)}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {item.supplier || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-muted/20">
                <tr className="border-t-2 font-semibold">
                  <td className="px-4 py-3" colSpan={5}>
                    Skupni strošek nakupa (samo manjkajoče)
                  </td>
                  <td className="px-4 py-3 text-right text-rose-700 dark:text-rose-300">
                    {formatEUR(s.totalShoppingCost)}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
