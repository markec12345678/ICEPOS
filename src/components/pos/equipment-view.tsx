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
  Wrench,
  Plus,
  Trash2,
  Edit,
  Snowflake,
  Flame,
  UtensilsCrossed,
  ChefHat,
  Package,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Calendar,
  History,
} from "lucide-react";
import { authHeaders } from "@/components/pos/pin-login";
import { formatEUR } from "@/lib/types";
import { LoadingSpinner, EmptyState } from "@/components/pos/loading-states";

interface MaintenanceLog {
  id: string;
  type: string;
  description: string;
  cost: number;
  technician: string | null;
  serviceDate: string;
  nextServiceDate: string | null;
  status: string;
  note: string | null;
}

interface Equipment {
  id: string;
  name: string;
  category: string;
  serialNumber: string | null;
  manufacturer: string | null;
  model: string | null;
  location: string | null;
  purchaseDate: string | null;
  purchaseCost: number;
  warrantyExpiry: string | null;
  lastServiceDate: string | null;
  nextServiceDate: string | null;
  serviceIntervalDays: number;
  status: string;
  note: string | null;
  maintenanceLogs: MaintenanceLog[];
}

interface EquipmentSummary {
  total: number;
  operational: number;
  maintenance: number;
  broken: number;
  retired: number;
  serviceOverdue: number;
  serviceSoon: number;
  totalValue: number;
  totalMaintenanceCost: number;
}

interface EquipmentData {
  equipment: Equipment[];
  summary: EquipmentSummary;
}

const CATEGORY_CONFIG: Record<string, { label: string; icon: typeof Snowflake }> = {
  cooling: { label: "Hlajenje", icon: Snowflake },
  cooking: { label: "Kuhanje/pečenje", icon: Flame },
  dishwashing: { label: "Pomivanje", icon: UtensilsCrossed },
  preparation: { label: "Priprava", icon: ChefHat },
  other: { label: "Drugo", icon: Package },
};

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  operational: {
    label: "Deluje",
    className:
      "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300",
  },
  maintenance: {
    label: "V vzdrževanju",
    className:
      "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300",
  },
  broken: {
    label: "Pokvarjeno",
    className:
      "border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950/30 dark:text-rose-300",
  },
  retired: {
    label: "Umaknjeno",
    className: "border-muted bg-muted/50 text-muted-foreground",
  },
};

const MAINTENANCE_TYPE_LABELS: Record<string, string> = {
  routine: "Redno vzdrževanje",
  repair: "Popravilo",
  inspection: "Pregled",
  cleaning: "Čiščenje",
  replacement: "Zamenjava",
};

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("sl-SI");
}

function daysUntil(iso: string | null): number | null {
  if (!iso) return null;
  const diff = new Date(iso).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export function EquipmentView() {
  const [data, setData] = useState<EquipmentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<Equipment | null>(null);
  const [detailItem, setDetailItem] = useState<Equipment | null>(null);
  const [maintenanceDialog, setMaintenanceDialog] = useState<Equipment | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/equipment", { headers: authHeaders() });
      if (!res.ok) throw new Error("Napaka");
      const json = await res.json();
      setData(json);
    } catch {
      toast.error("Napaka pri nalaganju opreme");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Add/Edit form state
  const [form, setForm] = useState({
    name: "",
    category: "cooling",
    serialNumber: "",
    manufacturer: "",
    model: "",
    location: "",
    purchaseDate: "",
    purchaseCost: 0,
    warrantyExpiry: "",
    serviceIntervalDays: 90,
    note: "",
  });

  // Maintenance form state
  const [maintForm, setMaintForm] = useState({
    type: "routine",
    description: "",
    cost: 0,
    technician: "",
    serviceDate: new Date().toISOString().slice(0, 10),
    nextServiceDate: "",
    note: "",
    status: "completed",
  });

  function resetForm() {
    setForm({
      name: "",
      category: "cooling",
      serialNumber: "",
      manufacturer: "",
      model: "",
      location: "",
      purchaseDate: "",
      purchaseCost: 0,
      warrantyExpiry: "",
      serviceIntervalDays: 90,
      note: "",
    });
  }

  function openEdit(item: Equipment) {
    setEditItem(item);
    setForm({
      name: item.name,
      category: item.category,
      serialNumber: item.serialNumber || "",
      manufacturer: item.manufacturer || "",
      model: item.model || "",
      location: item.location || "",
      purchaseDate: item.purchaseDate ? item.purchaseDate.slice(0, 10) : "",
      purchaseCost: item.purchaseCost,
      warrantyExpiry: item.warrantyExpiry ? item.warrantyExpiry.slice(0, 10) : "",
      serviceIntervalDays: item.serviceIntervalDays,
      note: item.note || "",
    });
    setAddDialogOpen(true);
  }

  async function saveEquipment() {
    if (!form.name) {
      toast.error("Ime je obvezno");
      return;
    }
    try {
      const url = editItem ? `/api/equipment/${editItem.id}` : "/api/equipment";
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
      toast.success(editItem ? "✓ Oprema posodobljena" : "✓ Oprema dodana");
      setAddDialogOpen(false);
      setEditItem(null);
      resetForm();
      await loadData();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Napaka pri shranjevanju");
    }
  }

  async function deleteEquipment(id: string) {
    if (!confirm("Ali res želiš izbrisati to opremo? Vsi logi vzdrževanja bodo izgubljeni.")) return;
    try {
      const res = await fetch(`/api/equipment/${id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Napaka");
      }
      toast.success("✓ Oprema izbrisana");
      await loadData();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Napaka pri brisanju");
    }
  }

  async function saveMaintenance() {
    if (!maintenanceDialog || !maintForm.description) {
      toast.error("Opis je obvezen");
      return;
    }
    try {
      const res = await fetch(`/api/equipment/${maintenanceDialog.id}/maintenance`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify(maintForm),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Napaka");
      }
      toast.success("✓ Vzdrževanje zabeleženo");
      setMaintenanceDialog(null);
      setMaintForm({
        type: "routine",
        description: "",
        cost: 0,
        technician: "",
        serviceDate: new Date().toISOString().slice(0, 10),
        nextServiceDate: "",
        note: "",
        status: "completed",
      });
      await loadData();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Napaka pri shranjevanju");
    }
  }

  async function updateStatus(item: Equipment, newStatus: string) {
    try {
      const res = await fetch(`/api/equipment/${item.id}`, {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error("Napaka");
      toast.success("✓ Status posodobljen");
      await loadData();
    } catch {
      toast.error("Napaka pri posodabljanju statusa");
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold">Oprema in vzdrževanje</h2>
          <p className="text-sm text-muted-foreground">Sledenje opreme in vzdrževalnih del</p>
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
            <Wrench className="h-6 w-6 text-amber-600" />
            Oprema in vzdrževanje
          </h2>
          <p className="text-sm text-muted-foreground">
            Sledenje restavratorske opreme in vzdrževalnih del
          </p>
        </div>
        <Button
          onClick={() => {
            resetForm();
            setEditItem(null);
            setAddDialogOpen(true);
          }}
          className="bg-amber-600 hover:bg-amber-700"
        >
          <Plus className="mr-1.5 h-4 w-4" />
          Nova oprema
        </Button>
      </div>

      {/* KPI kartice */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase text-muted-foreground">Skupaj opreme</p>
              <p className="text-2xl font-bold">{s.total}</p>
            </div>
            <Package className="h-8 w-8 text-muted-foreground/40" />
          </div>
        </Card>
        <Card className="border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900 dark:bg-emerald-950/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase text-emerald-700 dark:text-emerald-300">
                Deluje
              </p>
              <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">
                {s.operational}
              </p>
            </div>
            <CheckCircle2 className="h-8 w-8 text-emerald-600/60" />
          </div>
        </Card>
        <Card className="border-rose-200 bg-rose-50 p-4 dark:border-rose-900 dark:bg-rose-950/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase text-rose-700 dark:text-rose-300">
                Zapadlo vzdrževanje
              </p>
              <p className="text-2xl font-bold text-rose-700 dark:text-rose-300">
                {s.serviceOverdue}
              </p>
            </div>
            <AlertTriangle className="h-8 w-8 text-rose-600/60" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase text-muted-foreground">
                Vrednost opreme
              </p>
              <p className="text-2xl font-bold">{formatEUR(s.totalValue)}</p>
              <p className="text-xs text-muted-foreground">
                + {formatEUR(s.totalMaintenanceCost)} vzdrževanja
              </p>
            </div>
            <Wrench className="h-8 w-8 text-muted-foreground/40" />
          </div>
        </Card>
      </div>

      {/* Oprema grid */}
      {data.equipment.length === 0 ? (
        <EmptyState
          icon={Wrench}
          title="Ni opreme"
          description="Dodaj prvo opremo z gumbom zgoraj"
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.equipment.map((item) => {
            const catCfg = CATEGORY_CONFIG[item.category] || CATEGORY_CONFIG.other;
            const CatIcon = catCfg.icon;
            const statusCfg = STATUS_CONFIG[item.status] || STATUS_CONFIG.operational;
            const daysToService = daysUntil(item.nextServiceDate);
            const isOverdue = daysToService !== null && daysToService < 0;
            const isSoon = daysToService !== null && daysToService >= 0 && daysToService <= 14;

            return (
              <Card key={item.id} className="flex flex-col p-4">
                <div className="mb-2 flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 dark:bg-amber-950/30">
                      <CatIcon className="h-5 w-5 text-amber-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold">{item.name}</h4>
                      <p className="text-xs text-muted-foreground">{catCfg.label}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className={statusCfg.className}>
                    {statusCfg.label}
                  </Badge>
                </div>

                <div className="mb-3 space-y-1 text-xs text-muted-foreground">
                  {item.manufacturer && (
                    <p>
                      <span className="font-medium">Proizvajalec:</span> {item.manufacturer}
                      {item.model && ` · ${item.model}`}
                    </p>
                  )}
                  {item.location && (
                    <p>
                      <span className="font-medium">Lokacija:</span> {item.location}
                    </p>
                  )}
                  {item.serialNumber && (
                    <p>
                      <span className="font-medium">Serijska št.:</span> {item.serialNumber}
                    </p>
                  )}
                  {item.purchaseCost > 0 && (
                    <p>
                      <span className="font-medium">Nabavna vrednost:</span>{" "}
                      {formatEUR(item.purchaseCost)}
                    </p>
                  )}
                </div>

                {/* Vzdrževanje info */}
                <div className="mb-3 space-y-1 border-t pt-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Zadnji servis:</span>
                    <span className="font-medium">{formatDate(item.lastServiceDate)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Naslednji servis:</span>
                    {item.nextServiceDate ? (
                      <span
                        className={`font-medium ${
                          isOverdue
                            ? "text-rose-600"
                            : isSoon
                            ? "text-amber-600"
                            : "text-emerald-600"
                        }`}
                      >
                        {formatDate(item.nextServiceDate)}
                        {daysToService !== null && (
                          <span className="ml-1 text-[10px]">
                            ({isOverdue ? `${Math.abs(daysToService)} dni zapadlo` : `čez ${daysToService} dni`})
                          </span>
                        )}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Interval:</span>
                    <span className="font-medium">{item.serviceIntervalDays} dni</span>
                  </div>
                </div>

                {/* Garancija */}
                {item.warrantyExpiry && (
                  <div className="mb-3 text-xs">
                    {new Date(item.warrantyExpiry) > new Date() ? (
                      <Badge variant="outline" className="text-emerald-600">
                        Garancija velja do {formatDate(item.warrantyExpiry)}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-rose-600">
                        Garancija potekla {formatDate(item.warrantyExpiry)}
                      </Badge>
                    )}
                  </div>
                )}

                {/* Zadnji log */}
                {item.maintenanceLogs.length > 0 && (
                  <div className="mb-3 rounded bg-muted/30 p-2 text-xs">
                    <p className="flex items-center gap-1 font-medium">
                      <History className="h-3 w-3" />
                      Zadnje vzdrževanje
                    </p>
                    <p className="mt-1 truncate text-muted-foreground">
                      {MAINTENANCE_TYPE_LABELS[item.maintenanceLogs[0].type] || item.maintenanceLogs[0].type}
                      : {item.maintenanceLogs[0].description}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {formatDate(item.maintenanceLogs[0].serviceDate)}
                      {item.maintenanceLogs[0].cost > 0 &&
                        ` · ${formatEUR(item.maintenanceLogs[0].cost)}`}
                    </p>
                  </div>
                )}

                {/* Akcije */}
                <div className="mt-auto flex flex-wrap gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setMaintenanceDialog(item)}
                  >
                    <Wrench className="mr-1 h-3 w-3" />
                    Vzdrževanje
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setDetailItem(item)}
                  >
                    <History className="h-3 w-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => openEdit(item)}
                  >
                    <Edit className="h-3 w-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => deleteEquipment(item.id)}
                    className="text-rose-600 hover:text-rose-700"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>

                {/* Hitri status update */}
                {item.status !== "operational" && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-1 text-xs"
                    onClick={() => updateStatus(item, "operational")}
                  >
                    <CheckCircle2 className="mr-1 h-3 w-3" />
                    Označi kot delujoče
                  </Button>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Add/Edit dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editItem ? "Uredi opremo" : "Nova oprema"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label>Ime *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="npr. Hladilnik Bosch"
              />
            </div>
            <div>
              <Label>Kategorija</Label>
              <Select
                value={form.category}
                onValueChange={(v) => setForm({ ...form, category: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CATEGORY_CONFIG).map(([k, v]) => (
                    <SelectItem key={k} value={k}>
                      {v.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Lokacija</Label>
              <Input
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                placeholder="npr. Kuhinja"
              />
            </div>
            <div>
              <Label>Proizvajalec</Label>
              <Input
                value={form.manufacturer}
                onChange={(e) => setForm({ ...form, manufacturer: e.target.value })}
              />
            </div>
            <div>
              <Label>Model</Label>
              <Input
                value={form.model}
                onChange={(e) => setForm({ ...form, model: e.target.value })}
              />
            </div>
            <div>
              <Label>Serijska št.</Label>
              <Input
                value={form.serialNumber}
                onChange={(e) => setForm({ ...form, serialNumber: e.target.value })}
              />
            </div>
            <div>
              <Label>Datum nakupa</Label>
              <Input
                type="date"
                value={form.purchaseDate}
                onChange={(e) => setForm({ ...form, purchaseDate: e.target.value })}
              />
            </div>
            <div>
              <Label>Nabavna cena (€)</Label>
              <Input
                type="number"
                value={form.purchaseCost}
                onChange={(e) => setForm({ ...form, purchaseCost: Number(e.target.value) })}
              />
            </div>
            <div>
              <Label>Potek garancije</Label>
              <Input
                type="date"
                value={form.warrantyExpiry}
                onChange={(e) => setForm({ ...form, warrantyExpiry: e.target.value })}
              />
            </div>
            <div>
              <Label>Interval vzdrževanja (dni)</Label>
              <Input
                type="number"
                value={form.serviceIntervalDays}
                onChange={(e) =>
                  setForm({ ...form, serviceIntervalDays: Number(e.target.value) })
                }
              />
            </div>
            <div className="sm:col-span-2">
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
            <Button onClick={saveEquipment} className="bg-amber-600 hover:bg-amber-700">
              {editItem ? "Shrani" : "Dodaj"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Maintenance log dialog */}
      <Dialog
        open={!!maintenanceDialog}
        onOpenChange={(open) => !open && setMaintenanceDialog(null)}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              Novo vzdrževanje — {maintenanceDialog?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Tip vzdrževanja</Label>
              <Select
                value={maintForm.type}
                onValueChange={(v) => setMaintForm({ ...maintForm, type: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(MAINTENANCE_TYPE_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Opis *</Label>
              <Textarea
                value={maintForm.description}
                onChange={(e) =>
                  setMaintForm({ ...maintForm, description: e.target.value })
                }
                placeholder="npr. Čiščenje kondenzatorja, zamenjava filtra..."
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Strošek (€)</Label>
                <Input
                  type="number"
                  value={maintForm.cost}
                  onChange={(e) =>
                    setMaintForm({ ...maintForm, cost: Number(e.target.value) })
                  }
                />
              </div>
              <div>
                <Label>Tehnik</Label>
                <Input
                  value={maintForm.technician}
                  onChange={(e) =>
                    setMaintForm({ ...maintForm, technician: e.target.value })
                  }
                  placeholder="npr. Servis Gorenje"
                />
              </div>
              <div>
                <Label>Datum servisa</Label>
                <Input
                  type="date"
                  value={maintForm.serviceDate}
                  onChange={(e) =>
                    setMaintForm({ ...maintForm, serviceDate: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>Naslednji servis</Label>
                <Input
                  type="date"
                  value={maintForm.nextServiceDate}
                  onChange={(e) =>
                    setMaintForm({ ...maintForm, nextServiceDate: e.target.value })
                  }
                  placeholder="samodejno"
                />
              </div>
            </div>
            <div>
              <Label>Opomba</Label>
              <Input
                value={maintForm.note}
                onChange={(e) => setMaintForm({ ...maintForm, note: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMaintenanceDialog(null)}>
              Prekliči
            </Button>
            <Button onClick={saveMaintenance} className="bg-amber-600 hover:bg-amber-700">
              Zabeleži
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail / history dialog */}
      <Dialog open={!!detailItem} onOpenChange={(open) => !open && setDetailItem(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Zgodovina vzdrževanja — {detailItem?.name}
            </DialogTitle>
          </DialogHeader>
          {detailItem && (
            <div className="space-y-3">
              {detailItem.maintenanceLogs.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  Ni zabeleženih vzdrževanj
                </p>
              ) : (
                detailItem.maintenanceLogs.map((log) => (
                  <div key={log.id} className="rounded border p-3">
                    <div className="mb-1 flex items-start justify-between">
                      <div>
                        <Badge variant="outline" className="text-xs">
                          {MAINTENANCE_TYPE_LABELS[log.type] || log.type}
                        </Badge>
                        {log.status !== "completed" && (
                          <Badge variant="secondary" className="ml-1 text-xs">
                            {log.status}
                          </Badge>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(log.serviceDate)}
                      </span>
                    </div>
                    <p className="text-sm font-medium">{log.description}</p>
                    <div className="mt-1 flex flex-wrap gap-3 text-xs text-muted-foreground">
                      {log.cost > 0 && <span>Strošek: {formatEUR(log.cost)}</span>}
                      {log.technician && <span>Tehnik: {log.technician}</span>}
                      {log.nextServiceDate && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Naslednji: {formatDate(log.nextServiceDate)}
                        </span>
                      )}
                    </div>
                    {log.note && (
                      <p className="mt-1 text-xs italic text-muted-foreground">{log.note}</p>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
