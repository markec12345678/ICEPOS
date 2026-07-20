"use client";

import { useEffect, useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Package,
  Euro,
  AlertTriangle,
  XCircle,
  Clock,
  TrendingUp,
  Award,
} from "lucide-react";
import { authHeaders } from "@/components/pos/pin-login";
import { formatEUR } from "@/lib/types";
import { LoadingSpinner, EmptyState } from "@/components/pos/loading-states";

interface ValuedItem {
  id: string;
  name: string;
  category: string;
  unit: string;
  quantity: number;
  minQuantity: number;
  costPerUnit: number;
  totalValue: number;
  supplier: string | null;
  expiryDate: string | null;
  batchNumber: string | null;
  isLowStock: boolean;
  isOutOfStock: boolean;
  daysToExpiry: number | null;
}

interface CategoryAgg {
  category: string;
  itemCount: number;
  totalQuantity: number;
  totalValue: number;
  avgCost: number;
  lowStock: number;
}

interface SupplierAgg {
  supplier: string;
  itemCount: number;
  totalValue: number;
  avgCost: number;
}

interface Summary {
  totalValue: number;
  totalItems: number;
  avgValuePerItem: number;
  lowStockCount: number;
  outOfStockCount: number;
  expiringSoonCount: number;
  expiredCount: number;
  totalQuantity: number;
  categories: number;
  suppliers: number;
}

interface ValuationData {
  items: ValuedItem[];
  categorySummary: CategoryAgg[];
  supplierSummary: SupplierAgg[];
  topValueItems: ValuedItem[];
  summary: Summary;
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("sl-SI");
}

export function InventoryValuationView() {
  const [data, setData] = useState<ValuationData | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/inventory-valuation", { headers: authHeaders() });
      if (!res.ok) throw new Error("Napaka");
      const json = await res.json();
      setData(json);
    } catch {
      toast.error("Napaka pri nalaganju vrednosti zaloge");
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
          <h2 className="text-2xl font-bold">Vrednost zaloge</h2>
          <p className="text-sm text-muted-foreground">Poročilo vrednosti inventarja</p>
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
          <Package className="h-6 w-6 text-amber-600" />
          Vrednost zaloge
        </h2>
        <p className="text-sm text-muted-foreground">
          Celovito poročilo vrednosti inventarja po kategorijah in dobaviteljih
        </p>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase text-amber-700 dark:text-amber-300">Skupna vrednost</p>
              <p className="text-2xl font-bold text-amber-700 dark:text-amber-400">{formatEUR(s.totalValue)}</p>
              <p className="text-xs text-amber-700 dark:text-amber-300">
                pov. {formatEUR(s.avgValuePerItem)} / artikel
              </p>
            </div>
            <Euro className="h-8 w-8 text-amber-600/60" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase text-muted-foreground">Artikli</p>
              <p className="text-2xl font-bold">{s.totalItems}</p>
              <p className="text-xs text-muted-foreground">{s.categories} kategorij · {s.suppliers} dobaviteljev</p>
            </div>
            <Package className="h-8 w-8 text-muted-foreground/40" />
          </div>
        </Card>
        <Card className="border-rose-200 bg-rose-50 p-4 dark:border-rose-900 dark:bg-rose-950/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase text-rose-700 dark:text-rose-300">Nizka zaloga</p>
              <p className="text-2xl font-bold text-rose-700 dark:text-rose-300">{s.lowStockCount}</p>
              <p className="text-xs text-rose-700 dark:text-rose-300">{s.outOfStockCount} brez zaloge</p>
            </div>
            <AlertTriangle className="h-8 w-8 text-rose-600/60" />
          </div>
        </Card>
        <Card className="border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase text-amber-700 dark:text-amber-300">Kmalu poteče</p>
              <p className="text-2xl font-bold text-amber-700 dark:text-amber-300">{s.expiringSoonCount}</p>
              <p className="text-xs text-rose-600">{s.expiredCount} že poteklo</p>
            </div>
            <Clock className="h-8 w-8 text-amber-600/60" />
          </div>
        </Card>
      </div>

      {/* Po kategorijah */}
      {data.categorySummary.length > 0 && (
        <Card className="overflow-hidden">
          <div className="border-b bg-muted/50 p-4">
            <h3 className="font-semibold">Vrednost po kategorijah</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/30">
                <tr className="border-b">
                  <th className="px-3 py-2 text-left font-semibold">Kategorija</th>
                  <th className="px-3 py-2 text-right font-semibold">Artikli</th>
                  <th className="px-3 py-2 text-right font-semibold">Količina</th>
                  <th className="px-3 py-2 text-right font-semibold">Vrednost</th>
                  <th className="px-3 py-2 text-right font-semibold">Pov. cena</th>
                  <th className="px-3 py-2 text-right font-semibold">Nizka zaloga</th>
                </tr>
              </thead>
              <tbody>
                {data.categorySummary.map((c) => (
                  <tr key={c.category} className="border-b">
                    <td className="px-3 py-2 font-medium">{c.category}</td>
                    <td className="px-3 py-2 text-right">{c.itemCount}</td>
                    <td className="px-3 py-2 text-right">{c.totalQuantity.toFixed(1)}</td>
                    <td className="px-3 py-2 text-right font-bold text-amber-700 dark:text-amber-400">
                      {formatEUR(c.totalValue)}
                    </td>
                    <td className="px-3 py-2 text-right text-muted-foreground">{formatEUR(c.avgCost)}</td>
                    <td className="px-3 py-2 text-right">
                      {c.lowStock > 0 ? (
                        <Badge variant="outline" className="text-rose-600">{c.lowStock}</Badge>
                      ) : (
                        <span className="text-emerald-600">✓</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Po dobaviteljih */}
      {data.supplierSummary.length > 0 && (
        <Card className="overflow-hidden">
          <div className="border-b bg-muted/50 p-4">
            <h3 className="font-semibold">Vrednost po dobaviteljih</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/30">
                <tr className="border-b">
                  <th className="px-3 py-2 text-left font-semibold">Dobavitelj</th>
                  <th className="px-3 py-2 text-right font-semibold">Artikli</th>
                  <th className="px-3 py-2 text-right font-semibold">Vrednost</th>
                  <th className="px-3 py-2 text-right font-semibold">Pov. cena</th>
                </tr>
              </thead>
              <tbody>
                {data.supplierSummary.map((s) => (
                  <tr key={s.supplier} className="border-b">
                    <td className="px-3 py-2 font-medium">{s.supplier}</td>
                    <td className="px-3 py-2 text-right">{s.itemCount}</td>
                    <td className="px-3 py-2 text-right font-bold">{formatEUR(s.totalValue)}</td>
                    <td className="px-3 py-2 text-right text-muted-foreground">{formatEUR(s.avgCost)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Top vrednosti */}
      {data.topValueItems.length > 0 && (
        <Card className="p-4">
          <h3 className="mb-3 flex items-center gap-2 font-semibold">
            <Award className="h-5 w-5" />
            Top 10 po vrednosti
          </h3>
          <div className="space-y-2">
            {data.topValueItems.map((item, idx) => (
              <div key={item.id} className="flex items-center justify-between rounded border p-2 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-sm">{idx < 3 ? ["🥇", "🥈", "🥉"][idx] : `${idx + 1}.`}</span>
                  <div>
                    <p className="font-medium">{item.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.category} · {item.quantity} {item.unit} × {formatEUR(item.costPerUnit)}
                    </p>
                  </div>
                </div>
                <span className="font-bold text-amber-700 dark:text-amber-400">{formatEUR(item.totalValue)}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Celotna tabela */}
      {data.items.length === 0 ? (
        <EmptyState
          icon={Package}
          title="Ni zaloge"
          description="Dodaj inventory iteme za prikaz vrednosti"
        />
      ) : (
        <Card className="overflow-hidden">
          <div className="border-b bg-muted/50 p-4">
            <h3 className="font-semibold">Vsi artikli</h3>
          </div>
          <div className="max-h-96 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-background">
                <tr className="border-b">
                  <th className="px-3 py-2 text-left font-semibold">Artikel</th>
                  <th className="px-3 py-2 text-left font-semibold">Kategorija</th>
                  <th className="px-3 py-2 text-right font-semibold">Količina</th>
                  <th className="px-3 py-2 text-right font-semibold">Cena/kos</th>
                  <th className="px-3 py-2 text-right font-semibold">Vrednost</th>
                  <th className="px-3 py-2 text-center font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((item) => (
                  <tr key={item.id} className="border-b">
                    <td className="px-3 py-2 font-medium">{item.name}</td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">{item.category}</td>
                    <td className="px-3 py-2 text-right">
                      {item.quantity} {item.unit}
                    </td>
                    <td className="px-3 py-2 text-right">{formatEUR(item.costPerUnit)}</td>
                    <td className="px-3 py-2 text-right font-bold">{formatEUR(item.totalValue)}</td>
                    <td className="px-3 py-2 text-center">
                      {item.isOutOfStock ? (
                        <Badge variant="outline" className="text-rose-600">Brez zaloge</Badge>
                      ) : item.isLowStock ? (
                        <Badge variant="outline" className="text-amber-600">Nizko</Badge>
                      ) : item.daysToExpiry !== null && item.daysToExpiry < 0 ? (
                        <Badge variant="outline" className="text-rose-600">Poteklo</Badge>
                      ) : item.daysToExpiry !== null && item.daysToExpiry <= 7 ? (
                        <Badge variant="outline" className="text-amber-600">Kmalu poteče</Badge>
                      ) : (
                        <Badge variant="outline" className="text-emerald-600">✓</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
