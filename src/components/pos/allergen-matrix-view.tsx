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
  Shield,
  ShieldCheck,
  AlertTriangle,
  Search,
  Filter,
  Download,
} from "lucide-react";
import { authHeaders } from "@/components/pos/pin-login";
import { formatEUR } from "@/lib/types";
import { LoadingSpinner, EmptyState } from "@/components/pos/loading-states";
import { ALLERGEN_INFO, ALLERGEN_KEYS } from "@/lib/allergens";

interface AllergenItem {
  id: string;
  name: string;
  nameEn: string | null;
  category: string;
  price: number;
  available: boolean;
  allergens: string[];
  allergenCount: number;
  allergenLabels: string[];
  allergenFlags: Record<string, boolean>;
}

interface AllergenSummaryItem {
  key: string;
  label: string;
  icon: string;
  count: number;
  percentage: number;
}

interface CategorySummary {
  category: string;
  total: number;
  withAllergens: number;
  allergenFree: number;
}

interface AllergenMatrixData {
  items: AllergenItem[];
  allergenSummary: AllergenSummaryItem[];
  allergenFree: AllergenItem[];
  mostAllergens: AllergenItem[];
  categorySummary: CategorySummary[];
  summary: {
    totalItems: number;
    itemsWithAllergens: number;
    itemsAllergenFree: number;
    uniqueAllergensUsed: number;
    topAllergen: AllergenSummaryItem | null;
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

export function AllergenMatrixView() {
  const [data, setData] = useState<AllergenMatrixData | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [allergenFilter, setAllergenFilter] = useState("all"); // "all" | "free" | alergen key

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/allergen-matrix", { headers: authHeaders() });
      if (!res.ok) throw new Error("Napaka");
      const json = await res.json();
      setData(json);
    } catch {
      toast.error("Napaka pri nalaganju matrike alergenov");
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
    if (allergenFilter === "free" && item.allergenCount > 0) return false;
    if (allergenFilter !== "all" && allergenFilter !== "free" && !item.allergens.includes(allergenFilter))
      return false;
    return true;
  });

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold">Matrika alergenov</h2>
          <p className="text-sm text-muted-foreground">HACCP skladnost — pregled alergenov v meniju</p>
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
            <Shield className="h-6 w-6 text-emerald-600" />
            Matrika alergenov
          </h2>
          <p className="text-sm text-muted-foreground">
            HACCP skladnost — pregled alergenov v celotnem meniju (EU 1169/2011)
          </p>
        </div>
      </div>

      {/* KPI kartice */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase text-muted-foreground">
                Skupaj jedi
              </p>
              <p className="text-2xl font-bold">{s.totalItems}</p>
            </div>
            <Filter className="h-8 w-8 text-muted-foreground/40" />
          </div>
        </Card>
        <Card className="border-rose-200 bg-rose-50 p-4 dark:border-rose-900 dark:bg-rose-950/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase text-rose-700 dark:text-rose-300">
                Z alergeni
              </p>
              <p className="text-2xl font-bold text-rose-700 dark:text-rose-300">
                {s.itemsWithAllergens}
              </p>
            </div>
            <AlertTriangle className="h-8 w-8 text-rose-600/60" />
          </div>
        </Card>
        <Card className="border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900 dark:bg-emerald-950/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase text-emerald-700 dark:text-emerald-300">
                Brez alergenov
              </p>
              <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">
                {s.itemsAllergenFree}
              </p>
            </div>
            <ShieldCheck className="h-8 w-8 text-emerald-600/60" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase text-muted-foreground">
                Različni alergeni
              </p>
              <p className="text-2xl font-bold">{s.uniqueAllergensUsed}</p>
              <p className="text-xs text-muted-foreground">od {ALLERGEN_KEYS.length} možnih</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Top alergeni */}
      {data.allergenSummary.filter((a) => a.count > 0).length > 0 && (
        <Card className="p-4">
          <h3 className="mb-3 text-lg font-semibold">Najpogostejši alergeni</h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-7">
            {data.allergenSummary
              .filter((a) => a.count > 0)
              .map((a) => (
                <div
                  key={a.key}
                  className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-center dark:border-amber-900 dark:bg-amber-950/30"
                >
                  <div className="text-2xl">{a.icon}</div>
                  <p className="mt-1 text-xs font-medium">{a.label}</p>
                  <p className="text-lg font-bold text-amber-700 dark:text-amber-300">
                    {a.count}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {a.percentage.toFixed(0)}% menija
                  </p>
                </div>
              ))}
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
              <SelectItem key={c} value={c}>
                {CATEGORY_LABELS[c]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={allergenFilter} onValueChange={setAllergenFilter}>
          <SelectTrigger className="w-full sm:w-56">
            <SelectValue placeholder="Alergen" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Vsi alergeni</SelectItem>
            <SelectItem value="free">Brez alergenov</SelectItem>
            {ALLERGEN_KEYS.map((key) => (
              <SelectItem key={key} value={key}>
                {ALLERGEN_INFO[key].icon} {ALLERGEN_INFO[key].sl}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Matrika alergenov */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr className="border-b">
                <th className="sticky left-0 z-10 bg-muted/50 px-4 py-3 text-left font-semibold">
                  Jed
                </th>
                {ALLERGEN_KEYS.map((key) => (
                  <th
                    key={key}
                    className="px-2 py-3 text-center font-semibold"
                    title={ALLERGEN_INFO[key].sl}
                  >
                    <span className="text-lg">{ALLERGEN_INFO[key].icon}</span>
                  </th>
                ))}
                <th className="px-3 py-3 text-center font-semibold">Št.</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.length === 0 ? (
                <tr>
                  <td
                    colSpan={ALLERGEN_KEYS.length + 2}
                    className="px-4 py-12 text-center text-muted-foreground"
                  >
                    Ni jedi, ki ustrezajo filtrom
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => (
                  <tr key={item.id} className="border-b transition-colors hover:bg-muted/30">
                    <td className="sticky left-0 z-10 bg-background px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{item.name}</span>
                        {!item.available && (
                          <Badge variant="secondary" className="text-xs">
                            nedosegljivo
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {categoryLabel(item.category)} · {formatEUR(item.price)}
                      </p>
                    </td>
                    {ALLERGEN_KEYS.map((key) => (
                      <td key={key} className="px-2 py-3 text-center">
                        {item.allergenFlags[key] ? (
                          <span className="inline-flex h-5 w-5 items-center justify-center rounded bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300">
                            ✓
                          </span>
                        ) : (
                          <span className="text-muted-foreground/30">·</span>
                        )}
                      </td>
                    ))}
                    <td className="px-3 py-3 text-center">
                      <Badge
                        variant="outline"
                        className={
                          item.allergenCount === 0
                            ? "border-emerald-300 text-emerald-600"
                            : item.allergenCount <= 2
                            ? "border-amber-300 text-amber-600"
                            : "border-rose-300 text-rose-600"
                        }
                      >
                        {item.allergenCount}
                      </Badge>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Jedi z največ alergeni */}
      {data.mostAllergens.length > 0 && (
        <Card className="p-4">
          <h3 className="mb-3 flex items-center gap-2 text-lg font-semibold">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            Jedi z največ alergeni
          </h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {data.mostAllergens.slice(0, 6).map((item) => (
              <div key={item.id} className="rounded border p-3">
                <div className="flex items-center justify-between">
                  <p className="font-medium">{item.name}</p>
                  <Badge variant="outline" className="text-rose-600">
                    {item.allergenCount} alergenov
                  </Badge>
                </div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {item.allergens.map((a) => (
                    <span
                      key={a}
                      className="inline-flex items-center gap-1 rounded bg-amber-50 px-1.5 py-0.5 text-xs text-amber-800 dark:bg-amber-950/30 dark:text-amber-300"
                    >
                      {ALLERGEN_INFO[a]?.icon} {ALLERGEN_INFO[a]?.sl}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Varno za alergike */}
      {data.allergenFree.length > 0 && (
        <Card className="p-4">
          <h3 className="mb-3 flex items-center gap-2 text-lg font-semibold">
            <ShieldCheck className="h-5 w-5 text-emerald-600" />
            Varno za alergike ({data.allergenFree.length} jedi)
          </h3>
          <div className="flex flex-wrap gap-2">
            {data.allergenFree.map((item) => (
              <Badge
                key={item.id}
                variant="outline"
                className="border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300"
              >
                {item.name}
              </Badge>
            ))}
          </div>
        </Card>
      )}

      {/* Povzetek po kategorijah */}
      {data.categorySummary.length > 0 && (
        <Card className="p-4">
          <h3 className="mb-3 text-lg font-semibold">Povzetek po kategorijah</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr className="border-b">
                  <th className="px-3 py-2 text-left font-semibold">Kategorija</th>
                  <th className="px-3 py-2 text-right font-semibold">Skupaj</th>
                  <th className="px-3 py-2 text-right font-semibold">Z alergeni</th>
                  <th className="px-3 py-2 text-right font-semibold">Brez alergenov</th>
                </tr>
              </thead>
              <tbody>
                {data.categorySummary.map((cat) => (
                  <tr key={cat.category} className="border-b">
                    <td className="px-3 py-2 font-medium">{categoryLabel(cat.category)}</td>
                    <td className="px-3 py-2 text-right">{cat.total}</td>
                    <td className="px-3 py-2 text-right text-rose-600">{cat.withAllergens}</td>
                    <td className="px-3 py-2 text-right text-emerald-600">{cat.allergenFree}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {data.items.length === 0 && (
        <EmptyState
          icon={Shield}
          title="Ni podatkov"
          description="Dodaj meni postavke z alergeni za prikaz matrike"
        />
      )}
    </div>
  );
}
