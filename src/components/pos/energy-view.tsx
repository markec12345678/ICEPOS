"use client";

import { useEffect, useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  Zap,
  Flame,
  Droplets,
  Thermometer,
  Plus,
  Trash2,
  Edit,
  Euro,
  TrendingUp,
  Calendar,
} from "lucide-react";
import { authHeaders } from "@/components/pos/pin-login";
import { formatEUR } from "@/lib/types";
import { LoadingSpinner, EmptyState } from "@/components/pos/loading-states";

interface EnergyReading {
  id: string;
  type: string;
  readingDate: string;
  value: number;
  unit: string;
  cost: number;
  costPerUnit: number;
  meterNumber: string | null;
  note: string | null;
}

interface ByTypeAgg {
  type: string;
  totalValue: number;
  totalCost: number;
  count: number;
  avgCostPerUnit: number;
}

interface MonthlyAgg {
  month: string;
  electricity: number;
  gas: number;
  water: number;
  heating: number;
  totalCost: number;
}

interface EnergyData {
  readings: EnergyReading[];
  summary: {
    totalReadings: number;
    totalCost: number;
    totalValue: number;
    byType: ByTypeAgg[];
    monthly: MonthlyAgg[];
    types: string[];
  };
}

const TYPE_CONFIG: Record<
  string,
  { label: string; icon: typeof Zap; color: string; unit: string }
> = {
  electricity: { label: "Elektrika", icon: Zap, color: "amber", unit: "kWh" },
  gas: { label: "Plin", icon: Flame, color: "rose", unit: "m³" },
  water: { label: "Voda", icon: Droplets, color: "blue", unit: "m³" },
  heating: { label: "Ogrevanje", icon: Thermometer, color: "orange", unit: "kWh" },
};

function typeLabel(t: string): string {
  return TYPE_CONFIG[t]?.label || t;
}

function typeIcon(t: string) {
  return TYPE_CONFIG[t]?.icon || Zap;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("sl-SI");
}

function formatMonth(monthStr: string): string {
  const [year, month] = monthStr.split("-");
  const date = new Date(parseInt(year), parseInt(month) - 1);
  return date.toLocaleDateString("sl-SI", { month: "short", year: "numeric" });
}

export function EnergyView() {
  const [data, setData] = useState<EnergyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState("all");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<EnergyReading | null>(null);

  const [form, setForm] = useState({
    type: "electricity",
    readingDate: new Date().toISOString().slice(0, 10),
    value: 0,
    unit: "kWh",
    cost: 0,
    meterNumber: "",
    note: "",
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (typeFilter !== "all") params.set("type", typeFilter);
      const url = `/api/energy${params.toString() ? `?${params}` : ""}`;
      const res = await fetch(url, { headers: authHeaders() });
      if (!res.ok) throw new Error("Napaka");
      const json = await res.json();
      setData(json);
    } catch {
      toast.error("Napaka pri nalaganju obrisov porabe");
    } finally {
      setLoading(false);
    }
  }, [typeFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  function openEdit(item: EnergyReading) {
    setEditItem(item);
    setForm({
      type: item.type,
      readingDate: item.readingDate.slice(0, 10),
      value: item.value,
      unit: item.unit,
      cost: item.cost,
      meterNumber: item.meterNumber || "",
      note: item.note || "",
    });
    setAddDialogOpen(true);
  }

  function resetForm() {
    setForm({
      type: "electricity",
      readingDate: new Date().toISOString().slice(0, 10),
      value: 0,
      unit: "kWh",
      cost: 0,
      meterNumber: "",
      note: "",
    });
    setEditItem(null);
  }

  async function saveReading() {
    if (form.value <= 0) {
      toast.error("Vrednost mora biti pozitivna");
      return;
    }
    try {
      const url = editItem ? `/api/energy/${editItem.id}` : "/api/energy";
      const method = editItem ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: authHeaders(),
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Napaka");
      }
      toast.success(editItem ? "✓ Obris posodobljen" : "✓ Obris dodan");
      setAddDialogOpen(false);
      resetForm();
      await loadData();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Napaka pri shranjevanju");
    }
  }

  async function deleteReading(id: string) {
    if (!confirm("Ali res želiš izbrisati ta obris?")) return;
    try {
      const res = await fetch(`/api/energy/${id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Napaka");
      }
      toast.success("✓ Obris izbrisan");
      await loadData();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Napaka pri brisanju");
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold">Poraba energije</h2>
          <p className="text-sm text-muted-foreground">Sledenje porabe električne energije, plina, vode</p>
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
            <Zap className="h-6 w-6 text-amber-600" />
            Poraba energije
          </h2>
          <p className="text-sm text-muted-foreground">
            Sledenje porabe električne energije, plina, vode in ogrevanja
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
          Nov obris
        </Button>
      </div>

      {/* KPI kartice */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase text-muted-foreground">Skupaj obrisov</p>
              <p className="text-2xl font-bold">{s.totalReadings}</p>
            </div>
            <Calendar className="h-8 w-8 text-muted-foreground/40" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase text-muted-foreground">Skupni strošek</p>
              <p className="text-2xl font-bold text-amber-700 dark:text-amber-400">
                {formatEUR(s.totalCost)}
              </p>
            </div>
            <Euro className="h-8 w-8 text-amber-600/40" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase text-muted-foreground">Skupna poraba</p>
              <p className="text-2xl font-bold">{s.totalValue.toFixed(0)} kWh</p>
            </div>
            <TrendingUp className="h-8 w-8 text-muted-foreground/40" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase text-muted-foreground">Pov. cena/kWh</p>
              <p className="text-2xl font-bold">
                {s.totalValue > 0 ? formatEUR(s.totalCost / s.totalValue) : "—"}
              </p>
            </div>
            <Zap className="h-8 w-8 text-muted-foreground/40" />
          </div>
        </Card>
      </div>

      {/* Po tipih */}
      {s.byType.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {s.byType.map((agg) => {
            const cfg = TYPE_CONFIG[agg.type];
            const Icon = cfg?.icon || Zap;
            return (
              <Card key={agg.type} className="p-4">
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className={`h-5 w-5 text-${cfg?.color || "amber"}-600`} />
                    <span className="font-medium">{cfg?.label || agg.type}</span>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {agg.count} obrisov
                  </Badge>
                </div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Skupna poraba:</span>
                    <span className="font-medium">
                      {agg.totalValue.toFixed(1)} {cfg?.unit || "kWh"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Skupni strošek:</span>
                    <span className="font-bold text-amber-700 dark:text-amber-400">
                      {formatEUR(agg.totalCost)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Cena/enoto:</span>
                    <span className="text-muted-foreground">
                      {agg.avgCostPerUnit > 0 ? formatEUR(agg.avgCostPerUnit) : "—"}
                    </span>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Mesečni pregled */}
      {s.monthly.length > 0 && (
        <Card className="p-4">
          <h3 className="mb-3 font-semibold">Mesečni pregled</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/30">
                <tr className="border-b">
                  <th className="px-3 py-2 text-left font-semibold">Mesec</th>
                  <th className="px-3 py-2 text-right font-semibold">Elektrika</th>
                  <th className="px-3 py-2 text-right font-semibold">Plin</th>
                  <th className="px-3 py-2 text-right font-semibold">Voda</th>
                  <th className="px-3 py-2 text-right font-semibold">Ogrevanje</th>
                  <th className="px-3 py-2 text-right font-semibold">Strošek</th>
                </tr>
              </thead>
              <tbody>
                {s.monthly.slice(-12).map((m) => (
                  <tr key={m.month} className="border-b">
                    <td className="px-3 py-2 font-medium">{formatMonth(m.month)}</td>
                    <td className="px-3 py-2 text-right text-amber-600">
                      {m.electricity > 0 ? `${m.electricity.toFixed(0)} kWh` : "—"}
                    </td>
                    <td className="px-3 py-2 text-right text-rose-600">
                      {m.gas > 0 ? `${m.gas.toFixed(1)} m³` : "—"}
                    </td>
                    <td className="px-3 py-2 text-right text-blue-600">
                      {m.water > 0 ? `${m.water.toFixed(1)} m³` : "—"}
                    </td>
                    <td className="px-3 py-2 text-right text-orange-600">
                      {m.heating > 0 ? `${m.heating.toFixed(0)} kWh` : "—"}
                    </td>
                    <td className="px-3 py-2 text-right font-bold">
                      {formatEUR(m.totalCost)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Filter */}
      <Select value={typeFilter} onValueChange={setTypeFilter}>
        <SelectTrigger className="w-full sm:w-56">
          <SelectValue placeholder="Tip energije" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Vsi tipi</SelectItem>
          <SelectItem value="electricity">Elektrika</SelectItem>
          <SelectItem value="gas">Plin</SelectItem>
          <SelectItem value="water">Voda</SelectItem>
          <SelectItem value="heating">Ogrevanje</SelectItem>
        </SelectContent>
      </Select>

      {/* Seznam obrisov */}
      {data.readings.length === 0 ? (
        <EmptyState
          icon={Zap}
          title="Ni obrisov porabe"
          description="Dodaj prvi obris z gumbom zgoraj"
        />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr className="border-b">
                  <th className="px-3 py-3 text-left font-semibold">Datum</th>
                  <th className="px-3 py-3 text-left font-semibold">Tip</th>
                  <th className="px-3 py-3 text-right font-semibold">Poraba</th>
                  <th className="px-3 py-3 text-right font-semibold">Cena/enoto</th>
                  <th className="px-3 py-3 text-right font-semibold">Strošek</th>
                  <th className="px-3 py-3 text-left font-semibold">Števec</th>
                  <th className="px-3 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {data.readings.slice(0, 50).map((r) => {
                  const Icon = typeIcon(r.type);
                  return (
                    <tr key={r.id} className="border-b">
                      <td className="px-3 py-3 text-xs text-muted-foreground">
                        {formatDate(r.readingDate)}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{typeLabel(r.type)}</span>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-right">
                        {r.value.toFixed(1)} {r.unit}
                      </td>
                      <td className="px-3 py-3 text-right text-muted-foreground">
                        {r.costPerUnit > 0 ? formatEUR(r.costPerUnit) : "—"}
                      </td>
                      <td className="px-3 py-3 text-right font-bold text-amber-700 dark:text-amber-400">
                        {formatEUR(r.cost)}
                      </td>
                      <td className="px-3 py-3 text-xs text-muted-foreground">
                        {r.meterNumber || "—"}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" onClick={() => openEdit(r)}>
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => deleteReading(r.id)}
                            className="text-rose-600"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {data.readings.length > 50 && (
            <div className="border-t bg-muted/30 p-3 text-center text-xs text-muted-foreground">
              Prikazujem prvih 50 od {data.readings.length} obrisov
            </div>
          )}
        </Card>
      )}

      {/* Add/Edit dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editItem ? "Uredi obris" : "Nov obris porabe"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Tip energije *</Label>
              <Select
                value={form.type}
                onValueChange={(v) => {
                  const cfg = TYPE_CONFIG[v];
                  setForm({ ...form, type: v, unit: cfg?.unit || "kWh" });
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(TYPE_CONFIG).map(([k, v]) => (
                    <SelectItem key={k} value={k}>
                      {v.label} ({v.unit})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Datum odčitka</Label>
              <Input
                type="date"
                value={form.readingDate}
                onChange={(e) => setForm({ ...form, readingDate: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Poraba *</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={form.value}
                  onChange={(e) => setForm({ ...form, value: Number(e.target.value) })}
                />
              </div>
              <div>
                <Label>Enota</Label>
                <Input
                  value={form.unit}
                  onChange={(e) => setForm({ ...form, unit: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label>Skupni strošek (€)</Label>
              <Input
                type="number"
                step="0.01"
                value={form.cost}
                onChange={(e) => setForm({ ...form, cost: Number(e.target.value) })}
              />
              {form.value > 0 && form.cost > 0 && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Cena na enoto: {formatEUR(form.cost / form.value)}
                </p>
              )}
            </div>
            <div>
              <Label>Številka števca</Label>
              <Input
                value={form.meterNumber}
                onChange={(e) => setForm({ ...form, meterNumber: e.target.value })}
                placeholder="npr. EL-001"
              />
            </div>
            <div>
              <Label>Opomba</Label>
              <Textarea
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
              Prekliči
            </Button>
            <Button onClick={saveReading} className="bg-amber-600 hover:bg-amber-700">
              {editItem ? "Shrani" : "Dodaj"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
