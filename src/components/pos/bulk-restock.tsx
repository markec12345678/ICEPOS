"use client";

import { useState, useCallback, useEffect } from "react";
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
  Search,
  Save,
  Loader2,
  AlertTriangle,
  Package,
  CheckCircle2,
  Filter,
} from "lucide-react";
import { authHeaders } from "@/components/pos/pin-login";
import { formatEUR } from "@/lib/types";

interface InventoryItem {
  id: string;
  name: string;
  unit: string;
  quantity: number;
  minQuantity: number;
  costPerUnit: number;
  supplier: string | null;
  category: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  meso: "🥩 Meso",
  ribe: "🐟 Ribe",
  zelenjava: "🥕 Zelenjava",
  sadje: "🍎 Sadje",
  mlecni: "🥛 Mlečni",
  zita: "🌾 Žita",
  olja: "🫒 Olja",
  zacimbe: "🧂 Začimbe",
  sladkor: "🍯 Sladkor",
  kava: "☕ Kava",
  pijaca: "🥤 Pijače",
  alkohol: "🍷 Alkohol",
  omake: "🥫 Omake",
  konzerve: "🥫 Konzerve",
  osnove: "📦 Osnove",
  embalaza: "📦 Embalaža",
  splosno: "📦 Splošno",
};

export function BulkRestock({ onUpdated }: { onUpdated: () => void }) {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [stockFilter, setStockFilter] = useState<"all" | "low" | "zero">("zero");
  const [quantities, setQuantities] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/inventory");
      if (!res.ok) throw new Error("Napaka");
      const data: InventoryItem[] = await res.json();
      setItems(data);

      // Inicializiraj quantities z obstoječimi vrednostmi
      const initialQuantities: Record<string, string> = {};
      for (const item of data) {
        initialQuantities[item.id] = String(item.quantity);
      }
      setQuantities(initialQuantities);
    } catch {
      toast.error("Napaka pri nalaganju zaloge");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = items.filter((item) => {
    // Search
    if (search && !item.name.toLowerCase().includes(search.toLowerCase())) {
      return false;
    }
    // Category
    if (categoryFilter !== "all" && item.category !== categoryFilter) {
      return false;
    }
    // Stock filter
    if (stockFilter === "low" && item.quantity > item.minQuantity) {
      return false;
    }
    if (stockFilter === "zero" && item.quantity !== 0) {
      return false;
    }
    return true;
  });

  // Preštej spremembe
  const changedItems = items.filter((item) => {
    const newQty = parseFloat(quantities[item.id] || "0");
    return newQty !== item.quantity;
  });

  function updateQuantity(id: string, value: string) {
    setQuantities((prev) => ({ ...prev, [id]: value }));
  }

  function setAllFiltered(value: string) {
    const newQuantities = { ...quantities };
    for (const item of filtered) {
      newQuantities[item.id] = value;
    }
    setQuantities(newQuantities);
    toast.success(`Nastavljeno ${filtered.length} artiklov na ${value}`);
  }

  async function saveAll() {
    if (changedItems.length === 0) {
      toast.info("Ni sprememb za shranjevanje");
      return;
    }
    setSaving(true);
    try {
      const updates = changedItems.map((item) => ({
        id: item.id,
        quantity: parseFloat(quantities[item.id] || "0"),
      }));

      const res = await fetch("/api/inventory/bulk-update", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ updates }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Napaka");
        return;
      }
      toast.success(data.message);
      load();
      onUpdated();
    } catch {
      toast.error("Napaka pri shranjevanju");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-32 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const lowStockCount = items.filter((i) => i.quantity <= i.minQuantity).length;
  const zeroStockCount = items.filter((i) => i.quantity === 0).length;

  return (
    <Card className="p-4">
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="flex items-center gap-2 text-lg font-semibold">
              <Package className="h-5 w-5 text-primary" />
              Hitra nastavitev zalog
            </h3>
            <p className="text-sm text-muted-foreground">
              {items.length} artiklov · {zeroStockCount} z 0 stanjem · {lowStockCount} z nizko zalogo
            </p>
          </div>
          <Button onClick={saveAll} disabled={saving || changedItems.length === 0}>
            {saving ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-1.5 h-4 w-4" />
            )}
            {saving ? "Shranjujem..." : `Shrani (${changedItems.length})`}
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Išči artikel..."
              className="pl-9"
            />
          </div>
          {/* Category filter */}
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-44">
              <Filter className="mr-1.5 h-3 w-3" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Vse kategorije</SelectItem>
              {Object.entries(CATEGORY_LABELS).map(([id, label]) => (
                <SelectItem key={id} value={id}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {/* Stock filter */}
          <Select
            value={stockFilter}
            onValueChange={(v) => setStockFilter(v as "all" | "low" | "zero")}
          >
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Vsi artikli</SelectItem>
              <SelectItem value="low">Nizka zaloga</SelectItem>
              <SelectItem value="zero">Stanje 0</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Quick set buttons */}
        <div className="flex flex-wrap gap-2 rounded-lg bg-muted/30 p-2">
          <span className="self-center text-xs font-medium text-muted-foreground">
            Hitro nastavi vse ({filtered.length}):
          </span>
          {[0, 1, 5, 10, 20, 50].map((val) => (
            <button
              key={val}
              onClick={() => setAllFiltered(String(val))}
              className="rounded border border-border px-2 py-0.5 text-xs font-medium hover:bg-muted"
            >
              {val}
            </button>
          ))}
        </div>

        {/* Items table */}
        <div className="max-h-96 overflow-y-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-muted/50 backdrop-blur">
              <tr>
                <th className="p-2 text-left font-medium">Artikel</th>
                <th className="p-2 text-left font-medium">Kategorija</th>
                <th className="p-2 text-right font-medium">Trenutno</th>
                <th className="p-2 text-right font-medium">Min</th>
                <th className="p-2 text-right font-medium">Cena</th>
                <th className="p-2 text-center font-medium">Novo stanje</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-muted-foreground">
                    Ni artiklov ki ustrezajo filtru
                  </td>
                </tr>
              ) : (
                filtered.map((item) => {
                  const newQty = parseFloat(quantities[item.id] || "0");
                  const isChanged = newQty !== item.quantity;
                  const isLow = item.quantity <= item.minQuantity;
                  return (
                    <tr
                      key={item.id}
                      className={`border-b last:border-0 ${
                        isChanged ? "bg-primary/5" : ""
                      } ${isLow && !isChanged ? "bg-rose-50/30 dark:bg-rose-950/10" : ""}`}
                    >
                      <td className="p-2">
                        <div className="font-medium">{item.name}</div>
                        <div className="text-xs text-muted-foreground">{item.supplier}</div>
                      </td>
                      <td className="p-2">
                        <Badge variant="outline" className="text-xs">
                          {CATEGORY_LABELS[item.category]?.split(" ")[0] || "📦"} {item.category}
                        </Badge>
                      </td>
                      <td className="p-2 text-right font-mono">
                        {item.quantity} {item.unit}
                        {item.quantity === 0 && (
                          <AlertTriangle className="ml-1 inline h-3 w-3 text-rose-500" />
                        )}
                      </td>
                      <td className="p-2 text-right font-mono text-muted-foreground">
                        {item.minQuantity}
                      </td>
                      <td className="p-2 text-right font-mono text-muted-foreground">
                        {formatEUR(item.costPerUnit)}
                      </td>
                      <td className="p-2 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Input
                            type="number"
                            step="0.01"
                            value={quantities[item.id] ?? ""}
                            onChange={(e) => updateQuantity(item.id, e.target.value)}
                            className={`h-8 w-20 text-center font-mono ${
                              isChanged ? "border-primary" : ""
                            }`}
                          />
                          <span className="text-xs text-muted-foreground">{item.unit}</span>
                          {isChanged && (
                            <CheckCircle2 className="h-3 w-3 text-primary" />
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Summary */}
        <div className="flex items-center justify-between rounded-lg bg-muted/30 p-3 text-sm">
          <span className="text-muted-foreground">
            Prikazano: {filtered.length} od {items.length} artiklov
          </span>
          <span className="font-medium">
            {changedItems.length > 0 ? (
              <span className="text-primary">
                {changedItems.length} sprememb za shranjevanje
              </span>
            ) : (
              <span className="text-emerald-600">✓ Vse sinhronizirano</span>
            )}
          </span>
        </div>

        <p className="text-xs text-muted-foreground">
          💡 Uporabi "Hitro nastavi vse" za hiter vnos (npr. 10 = vse artikle na 10 enot).
          Spremembe so označene z ✓ in poudarjene. Klikni "Shrani" za potrditev.
        </p>
      </div>
    </Card>
  );
}
