"use client";

import { useEffect, useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Coins,
  Plus,
  Trash2,
  Edit,
  ArrowLeftRight,
  Euro,
  TrendingUp,
  RefreshCw,
} from "lucide-react";
import { authHeaders } from "@/components/pos/pin-login";
import { formatEUR } from "@/lib/types";
import { LoadingSpinner, EmptyState } from "@/components/pos/loading-states";

interface CurrencyRate {
  id: string;
  currency: string;
  symbol: string;
  rate: number;
  buyRate: number | null;
  sellRate: number | null;
  lastUpdated: string;
  active: boolean;
  note: string | null;
}

interface DefaultCurrency {
  currency: string;
  symbol: string;
  rate: number;
}

interface CurrencyData {
  rates: CurrencyRate[];
  defaultCurrencies: DefaultCurrency[];
  baseCurrency: string;
}

export function CurrencyRatesView() {
  const [data, setData] = useState<CurrencyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<CurrencyRate | null>(null);
  const [convertAmount, setConvertAmount] = useState(100);
  const [convertFrom, setConvertFrom] = useState("EUR");
  const [convertTo, setConvertTo] = useState("USD");

  const [form, setForm] = useState({
    currency: "USD",
    symbol: "$",
    rate: 1.08,
    buyRate: "",
    sellRate: "",
    note: "",
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/currency-rates", { headers: authHeaders() });
      if (!res.ok) throw new Error("Napaka");
      const json = await res.json();
      setData(json);
      if (json.rates.length > 0) {
        setConvertTo(json.rates[0].currency);
      }
    } catch {
      toast.error("Napaka pri nalaganju tečajev");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  function openEdit(item: CurrencyRate) {
    setEditItem(item);
    setForm({
      currency: item.currency,
      symbol: item.symbol,
      rate: item.rate,
      buyRate: item.buyRate?.toString() || "",
      sellRate: item.sellRate?.toString() || "",
      note: item.note || "",
    });
    setAddDialogOpen(true);
  }

  function resetForm() {
    setForm({
      currency: "USD",
      symbol: "$",
      rate: 1.08,
      buyRate: "",
      sellRate: "",
      note: "",
    });
    setEditItem(null);
  }

  async function saveRate() {
    try {
      const payload = {
        ...form,
        buyRate: form.buyRate ? Number(form.buyRate) : null,
        sellRate: form.sellRate ? Number(form.sellRate) : null,
      };
      const url = editItem ? `/api/currency-rates/${editItem.id}` : "/api/currency-rates";
      const method = editItem ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: authHeaders(),
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Napaka");
      }
      toast.success(editItem ? "✓ Tečaj posodobljen" : "✓ Tečaj dodan");
      setAddDialogOpen(false);
      resetForm();
      await loadData();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Napaka pri shranjevanju");
    }
  }

  async function deleteRate(id: string) {
    if (!confirm("Ali res želiš izbrisati ta tečaj?")) return;
    try {
      const res = await fetch(`/api/currency-rates/${id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Napaka");
      }
      toast.success("✓ Tečaj izbrisan");
      await loadData();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Napaka pri brisanju");
    }
  }

  async function toggleActive(item: CurrencyRate) {
    try {
      const res = await fetch(`/api/currency-rates/${item.id}`, {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify({ active: !item.active }),
      });
      if (!res.ok) throw new Error("Napaka");
      toast.success(item.active ? "✓ Tečaj deaktiviran" : "✓ Tečaj aktiviran");
      await loadData();
    } catch {
      toast.error("Napaka pri posodabljanju");
    }
  }

  function calculateConversion(): number {
    if (!data) return 0;
    // EUR → X: amount * rate
    // X → EUR: amount / rate
    // X → Y: (amount / rateX) * rateY
    let amountInEUR = convertAmount;
    if (convertFrom !== "EUR") {
      const fromRate = data.rates.find((r) => r.currency === convertFrom);
      if (fromRate) amountInEUR = convertAmount / fromRate.rate;
    }
    if (convertTo === "EUR") return amountInEUR;
    const toRate = data.rates.find((r) => r.currency === convertTo);
    if (toRate) return amountInEUR * toRate.rate;
    return 0;
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold">Tečaji valut</h2>
          <p className="text-sm text-muted-foreground">Multi-currency podpora</p>
        </div>
        <LoadingSpinner />
      </div>
    );
  }

  if (!data) return null;

  const convertedAmount = calculateConversion();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-2xl font-bold">
            <Coins className="h-6 w-6 text-amber-600" />
            Tečaji valut
          </h2>
          <p className="text-sm text-muted-foreground">
            Upravljanje tečajev valut za multi-currency podporo — osnovna valuta: {data.baseCurrency}
          </p>
        </div>
        <Button
          onClick={() => {
            resetForm();
            setAddDialogOpen(true);
          }}
          className="bg-amber-600 hover:bg-amber-700"
        >
          <Plus className="mr-1.5 h-4 w-4" />
          Nov tečaj
        </Button>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase text-muted-foreground">Aktivne valute</p>
              <p className="text-2xl font-bold">
                {data.rates.filter((r) => r.active).length}
              </p>
            </div>
            <Coins className="h-8 w-8 text-amber-600/40" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase text-muted-foreground">Skupaj valut</p>
              <p className="text-2xl font-bold">{data.rates.length}</p>
            </div>
            <TrendingUp className="h-8 w-8 text-muted-foreground/40" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase text-muted-foreground">Osnovna valuta</p>
              <p className="text-2xl font-bold">{data.baseCurrency}</p>
            </div>
            <Euro className="h-8 w-8 text-emerald-600/40" />
          </div>
        </Card>
      </div>

      {/* Converter */}
      {data.rates.length > 0 && (
        <Card className="border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/30">
          <h3 className="mb-3 flex items-center gap-2 font-semibold text-amber-800 dark:text-amber-200">
            <ArrowLeftRight className="h-5 w-5" />
            Pretvornik valut
          </h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-5 sm:items-end">
            <div>
              <Label className="text-xs">Znesek</Label>
              <Input
                type="number"
                value={convertAmount}
                onChange={(e) => setConvertAmount(Number(e.target.value))}
              />
            </div>
            <div>
              <Label className="text-xs">Iz</Label>
              <Select value={convertFrom} onValueChange={setConvertFrom}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EUR">EUR (osnovna)</SelectItem>
                  {data.rates.map((r) => (
                    <SelectItem key={r.id} value={r.currency}>
                      {r.currency} ({r.symbol})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-center">
              <ArrowLeftRight className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <Label className="text-xs">V</Label>
              <Select value={convertTo} onValueChange={setConvertTo}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EUR">EUR (osnovna)</SelectItem>
                  {data.rates.map((r) => (
                    <SelectItem key={r.id} value={r.currency}>
                      {r.currency} ({r.symbol})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="rounded border bg-background p-2 text-center">
              <p className="text-xs text-muted-foreground">Rezultat</p>
              <p className="text-lg font-bold text-amber-700 dark:text-amber-400">
                {convertedAmount.toFixed(2)}
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Seznam tečajev */}
      {data.rates.length === 0 ? (
        <EmptyState
          icon={Coins}
          title="Ni tečajev valut"
          description="Dodaj prvi tečaj z gumbom zgoraj"
        />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr className="border-b">
                  <th className="px-3 py-3 text-left font-semibold">Valuta</th>
                  <th className="px-3 py-3 text-left font-semibold">Simbol</th>
                  <th className="px-3 py-3 text-right font-semibold">Tečaj (1 EUR =)</th>
                  <th className="px-3 py-3 text-right font-semibold">Odkup</th>
                  <th className="px-3 py-3 text-right font-semibold">Prodaja</th>
                  <th className="px-3 py-3 text-left font-semibold">Posodobljeno</th>
                  <th className="px-3 py-3 text-center font-semibold">Status</th>
                  <th className="px-3 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {data.rates.map((r) => (
                  <tr key={r.id} className="border-b">
                    <td className="px-3 py-3 font-bold">{r.currency}</td>
                    <td className="px-3 py-3">{r.symbol}</td>
                    <td className="px-3 py-3 text-right font-mono font-medium">
                      {r.rate.toFixed(4)}
                    </td>
                    <td className="px-3 py-3 text-right text-muted-foreground">
                      {r.buyRate ? r.buyRate.toFixed(4) : "—"}
                    </td>
                    <td className="px-3 py-3 text-right text-muted-foreground">
                      {r.sellRate ? r.sellRate.toFixed(4) : "—"}
                    </td>
                    <td className="px-3 py-3 text-xs text-muted-foreground">
                      {new Date(r.lastUpdated).toLocaleDateString("sl-SI")}
                    </td>
                    <td className="px-3 py-3 text-center">
                      <button onClick={() => toggleActive(r)} className="inline-flex">
                        <Badge
                          variant="outline"
                          className={
                            r.active
                              ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300"
                              : "border-muted bg-muted/50 text-muted-foreground"
                          }
                        >
                          {r.active ? "Aktivno" : "Neaktivno"}
                        </Badge>
                      </button>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => openEdit(r)}>
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => deleteRate(r.id)}
                          className="text-rose-600"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Default valute predlog */}
      {data.rates.length === 0 && data.defaultCurrencies.length > 0 && (
        <Card className="p-4">
          <h3 className="mb-3 font-semibold">Predlagane valute</h3>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
            {data.defaultCurrencies.map((c) => (
              <Button
                key={c.currency}
                variant="outline"
                size="sm"
                onClick={() => {
                  setForm({
                    currency: c.currency,
                    symbol: c.symbol,
                    rate: c.rate,
                    buyRate: "",
                    sellRate: "",
                    note: "",
                  });
                  setAddDialogOpen(true);
                }}
              >
                {c.currency} ({c.symbol})
              </Button>
            ))}
          </div>
        </Card>
      )}

      {/* Add/Edit dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editItem ? "Uredi tečaj" : "Nov tečaj valute"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Valuta (koda) *</Label>
                <Input
                  value={form.currency}
                  onChange={(e) => setForm({ ...form, currency: e.target.value.toUpperCase() })}
                  placeholder="USD"
                  maxLength={3}
                  disabled={!!editItem}
                />
              </div>
              <div>
                <Label>Simbol *</Label>
                <Input
                  value={form.symbol}
                  onChange={(e) => setForm({ ...form, symbol: e.target.value })}
                  placeholder="$"
                />
              </div>
            </div>
            <div>
              <Label>Tečaj (1 EUR = ?) *</Label>
              <Input
                type="number"
                step="0.0001"
                value={form.rate}
                onChange={(e) => setForm({ ...form, rate: Number(e.target.value) })}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Koliko {form.currency} je 1 {data.baseCurrency}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Odkupni tečaj</Label>
                <Input
                  type="number"
                  step="0.0001"
                  value={form.buyRate}
                  onChange={(e) => setForm({ ...form, buyRate: e.target.value })}
                  placeholder="nižji od prodajnega"
                />
              </div>
              <div>
                <Label>Prodajni tečaj</Label>
                <Input
                  type="number"
                  step="0.0001"
                  value={form.sellRate}
                  onChange={(e) => setForm({ ...form, sellRate: e.target.value })}
                  placeholder="višji od odkupnega"
                />
              </div>
            </div>
            <div>
              <Label>Opomba</Label>
              <Input
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>Prekliči</Button>
            <Button onClick={saveRate} className="bg-amber-600 hover:bg-amber-700">
              {editItem ? "Shrani" : "Dodaj"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
