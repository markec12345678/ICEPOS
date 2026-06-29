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
  Trash2,
  Plus,
  TrendingDown,
  AlertTriangle,
  DollarSign,
  Package,
  Flame,
  Utensils,
  Clock,
} from "lucide-react";
import { formatEUR, formatDateTime } from "@/lib/types";
import { authHeaders } from "@/components/pos/pin-login";

// ============================================================
// Tipi
// ============================================================

interface InventoryItem {
  id: string;
  name: string;
  unit: string;
  quantity: number;
  costPerUnit: number;
}

interface WasteLog {
  id: string;
  inventoryItemId: string | null;
  inventoryItem: { name: string; unit: string } | null;
  menuItemId: string | null;
  name: string;
  quantity: number;
  unit: string;
  cost: number;
  reason: string;
  note: string | null;
  operator: string | null;
  createdAt: string;
}

interface WasteStats {
  days: number;
  totalCost: number;
  totalEntries: number;
  wastePct: number;
  revenue: number;
  byReason: { reason: string; count: number; cost: number }[];
  topItems: { name: string; count: number; cost: number; quantity: number }[];
  dailyTrend: { date: string; cost: number; count: number }[];
}

const REASONS = [
  { id: "expired", label: "Pretečeno", icon: Clock, color: "text-rose-600" },
  { id: "burnt", label: "Pregorelo", icon: Flame, color: "text-amber-600" },
  { id: "dropped", label: "Padlo na tla", icon: AlertTriangle, color: "text-purple-600" },
  { id: "returned", label: "Vrnjeno od gosta", icon: Utensils, color: "text-blue-600" },
  { id: "spoilage", label: "Pokvarjeno", icon: Trash2, color: "text-rose-600" },
  { id: "other", label: "Drugo", icon: Package, color: "text-muted-foreground" },
];

function reasonLabel(id: string): string {
  return REASONS.find((r) => r.id === id)?.label || id;
}

function reasonIcon(id: string) {
  return REASONS.find((r) => r.id === id)?.icon || Package;
}

// ============================================================
// Glavna komponenta
// ============================================================

export function WasteView() {
  const [stats, setStats] = useState<WasteStats | null>(null);
  const [logs, setLogs] = useState<WasteLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState("30");
  const [addOpen, setAddOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, logsRes] = await Promise.all([
        fetch(`/api/waste/stats?days=${days}`),
        fetch(`/api/waste?days=${days}`),
      ]);
      if (!statsRes.ok || !logsRes.ok) throw new Error("Napaka");
      setStats(await statsRes.json());
      setLogs(await logsRes.json());
    } catch {
      toast.error("Napaka pri nalaganju odpadkov");
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading || !stats) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-muted-foreground">Nalagam odpadke...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Food Waste Tracking</h2>
          <p className="text-sm text-muted-foreground">
            Sledenje odpadkov — {stats.days} dni
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={days} onValueChange={setDays}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">7 dni</SelectItem>
              <SelectItem value="30">30 dni</SelectItem>
              <SelectItem value="90">90 dni</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={() => setAddOpen(true)}>
            <Plus className="mr-1.5 h-4 w-4" />
            Zabeleži odpadek
          </Button>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Skupaj strošek</p>
              <p className="text-2xl font-bold text-rose-600">{formatEUR(stats.totalCost)}</p>
            </div>
            <TrendingDown className="h-5 w-5 text-rose-500" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Št. odpadkov</p>
              <p className="text-2xl font-bold">{stats.totalEntries}</p>
            </div>
            <Trash2 className="h-5 w-5 text-muted-foreground" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Waste % prometa</p>
              <p className={`text-2xl font-bold ${stats.wastePct > 3 ? "text-rose-600" : "text-emerald-600"}`}>
                {stats.wastePct}%
              </p>
              <p className="text-xs text-muted-foreground">promet: {formatEUR(stats.revenue)}</p>
            </div>
            <AlertTriangle className="h-5 w-5 text-muted-foreground" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Povp. na odpadek</p>
              <p className="text-2xl font-bold">
                {formatEUR(stats.totalEntries > 0 ? stats.totalCost / stats.totalEntries : 0)}
              </p>
            </div>
            <DollarSign className="h-5 w-5 text-muted-foreground" />
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* By reason */}
        <Card className="p-4">
          <h3 className="mb-3 text-sm font-semibold">Po razlogu</h3>
          <div className="space-y-2">
            {stats.byReason.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                Ni podatkov
              </p>
            ) : (
              stats.byReason.map((r) => {
                const Icon = reasonIcon(r.reason);
                return (
                  <div
                    key={r.reason}
                    className="flex items-center justify-between rounded-lg border p-2"
                  >
                    <div className="flex items-center gap-2">
                      <Icon className={`h-4 w-4 ${REASONS.find((x) => x.id === r.reason)?.color}`} />
                      <div>
                        <p className="text-sm font-medium">{reasonLabel(r.reason)}</p>
                        <p className="text-xs text-muted-foreground">{r.count} primerov</p>
                      </div>
                    </div>
                    <span className="font-bold text-rose-600">{formatEUR(r.cost)}</span>
                  </div>
                );
              })
            )}
          </div>
        </Card>

        {/* Top items */}
        <Card className="p-4">
          <h3 className="mb-3 text-sm font-semibold">Top odpadki (po strošku)</h3>
          <div className="space-y-2">
            {stats.topItems.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                Ni podatkov
              </p>
            ) : (
              stats.topItems.slice(0, 8).map((item, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-lg border p-2"
                >
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs font-bold">
                      {i + 1}
                    </span>
                    <div>
                      <p className="text-sm font-medium">{item.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.count}× · {item.quantity} enot
                      </p>
                    </div>
                  </div>
                  <span className="font-bold text-rose-600">{formatEUR(item.cost)}</span>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      {/* Daily trend (mini chart) */}
      {stats.dailyTrend.length > 0 && (
        <Card className="p-4">
          <h3 className="mb-3 text-sm font-semibold">Dnevni trend stroška odpadkov</h3>
          <div className="flex h-32 items-end gap-1 overflow-x-auto">
            {stats.dailyTrend.map((d) => {
              const maxCost = Math.max(...stats.dailyTrend.map((x) => x.cost), 1);
              const height = (d.cost / maxCost) * 100;
              return (
                <div
                  key={d.date}
                  className="group relative flex shrink-0 flex-col items-center"
                  style={{ width: 24 }}
                >
                  <div
                    className="w-full rounded-t bg-rose-500 transition-all hover:bg-rose-600"
                    style={{ height: `${Math.max(height, 2)}%` }}
                    title={`${d.date}: ${formatEUR(d.cost)}`}
                  />
                  <span className="mt-1 text-[9px] text-muted-foreground">
                    {d.date.slice(8)}
                  </span>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Recent waste logs */}
      <Card className="overflow-hidden">
        <div className="border-b bg-muted/50 p-3">
          <h3 className="text-sm font-semibold">Zadnji odpadki</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/30">
              <tr>
                <th className="p-3 text-left font-medium">Datum</th>
                <th className="p-3 text-left font-medium">Izdelek</th>
                <th className="p-3 text-right font-medium">Količina</th>
                <th className="p-3 text-left font-medium">Razlog</th>
                <th className="p-3 text-right font-medium">Strošek</th>
                <th className="p-3 text-left font-medium">Opomba</th>
                <th className="p-3 text-left font-medium">Operater</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-muted-foreground">
                    Ni zabeleženih odpadkov. Klikni "Zabeleži odpadek" za dodajanje.
                  </td>
                </tr>
              ) : (
                logs.slice(0, 50).map((w) => {
                  const Icon = reasonIcon(w.reason);
                  return (
                    <tr key={w.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="p-3 text-xs text-muted-foreground">
                        {formatDateTime(w.createdAt)}
                      </td>
                      <td className="p-3 font-medium">{w.name}</td>
                      <td className="p-3 text-right font-mono">
                        {w.quantity} {w.unit}
                      </td>
                      <td className="p-3">
                        <Badge variant="outline" className="gap-1">
                          <Icon className="h-3 w-3" />
                          {reasonLabel(w.reason)}
                        </Badge>
                      </td>
                      <td className="p-3 text-right font-bold text-rose-600">
                        {formatEUR(w.cost)}
                      </td>
                      <td className="p-3 text-xs text-muted-foreground max-w-xs truncate">
                        {w.note || "—"}
                      </td>
                      <td className="p-3 text-xs text-muted-foreground">
                        {w.operator || "—"}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Info card */}
      <Card className="p-4 bg-muted/30">
        <h3 className="mb-2 text-sm font-semibold">💡 Zakaj slediti odpadke?</h3>
        <div className="space-y-1 text-xs text-muted-foreground">
          <p>• <strong>4-10% prometa</strong> odpade kot odpadek v povprečni restavraciji.</p>
          <p>• Sledenje razkrije <strong>vzroke</strong> (pregorelo, pretečeno, padlo) in <strong>top item-e</strong>.</p>
          <p>• <strong>Waste %</strong> nad 3% je rdeča zastava — potrebna optimizacija.</p>
          <p>• Opcija "odštej iz zaloge" samodejno posodobi inventory.</p>
        </div>
      </Card>

      {/* Add waste dialog */}
      <AddWasteDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        onSaved={load}
      />
    </div>
  );
}

// ============================================================
// Add Waste Dialog
// ============================================================

function AddWasteDialog({
  open,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSaved: () => void;
}) {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<string>("");
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("kos");
  const [cost, setCost] = useState("");
  const [reason, setReason] = useState("expired");
  const [note, setNote] = useState("");
  const [deduct, setDeduct] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      fetch("/api/inventory")
        .then((r) => r.json())
        .then((items: InventoryItem[]) => setInventory(items))
        .catch(() => toast.error("Napaka pri nalaganju inventory-ja"));
      // Reset
      setSelectedItemId("");
      setName("");
      setQuantity("");
      setUnit("kos");
      setCost("");
      setReason("expired");
      setNote("");
      setDeduct(true);
    }
  }, [open]);

  function selectItem(id: string) {
    setSelectedItemId(id);
    if (id) {
      const item = inventory.find((i) => i.id === id);
      if (item) {
        setName(item.name);
        setUnit(item.unit);
      }
    }
  }

  async function save() {
    if (!name || !quantity || !reason) {
      toast.error("Manjkajoči podatki");
      return;
    }
    setSaving(true);
    try {
      const payload: {
        inventoryItemId?: string;
        name: string;
        quantity: number;
        unit: string;
        cost?: number;
        reason: string;
        note?: string;
        deductFromInventory?: boolean;
      } = {
        inventoryItemId: selectedItemId || undefined,
        name,
        quantity: parseFloat(quantity),
        unit,
        reason,
        note: note || undefined,
        deductFromInventory: deduct && !!selectedItemId,
      };
      if (cost) payload.cost = parseFloat(cost);

      const res = await fetch("/api/waste", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Napaka");
        return;
      }
      toast.success("Odpadek zabeležen");
      onOpenChange(false);
      onSaved();
    } catch {
      toast.error("Napaka pri shranjevanju");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Zabeleži odpadek</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="mb-1.5 block text-sm">Izberi iz inventory-ja (opcijsko)</Label>
            <Select value={selectedItemId} onValueChange={selectItem}>
              <SelectTrigger>
                <SelectValue placeholder="— ročni vnos —" />
              </SelectTrigger>
              <SelectContent>
                {inventory.map((i) => (
                  <SelectItem key={i.id} value={i.id}>
                    {i.name} ({i.quantity} {i.unit} · {formatEUR(i.costPerUnit)}/{i.unit})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="mb-1.5 block text-sm">Ime izdelka</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="npr. Moka, Biftek, Pivo..."
            />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <Label className="mb-1.5 block text-sm">Količina</Label>
              <Input
                type="number"
                step="0.01"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="0.5"
              />
            </div>
            <div>
              <Label className="mb-1.5 block text-sm">Enota</Label>
              <Select value={unit} onValueChange={setUnit}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="kos">kos</SelectItem>
                  <SelectItem value="kg">kg</SelectItem>
                  <SelectItem value="g">g</SelectItem>
                  <SelectItem value="l">l</SelectItem>
                  <SelectItem value="ml">ml</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-1.5 block text-sm">Strošek (EUR)</Label>
              <Input
                type="number"
                step="0.01"
                value={cost}
                onChange={(e) => setCost(e.target.value)}
                placeholder="auto"
              />
            </div>
          </div>

          <div>
            <Label className="mb-1.5 block text-sm">Razlog</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {REASONS.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="mb-1.5 block text-sm">Opomba (opcijsko)</Label>
            <Input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="npr. kuhar pozabil v pečici..."
            />
          </div>

          {selectedItemId && (
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={deduct}
                onChange={(e) => setDeduct(e.target.checked)}
                className="h-4 w-4"
              />
              Odštej iz inventory-ja ({quantity || 0} {unit})
            </label>
          )}

          {!cost && selectedItemId && (
            <p className="text-xs text-muted-foreground">
              Strošek se samodejno izračuna iz nabavne cene.
            </p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Prekliči
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving ? "Shranjujem..." : "Zabeleži odpadek"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
