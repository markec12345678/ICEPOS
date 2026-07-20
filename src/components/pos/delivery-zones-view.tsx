"use client";

import { useEffect, useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  MapPin,
  Plus,
  Trash2,
  Edit,
  Clock,
  Euro,
  Truck,
  CheckCircle2,
  X,
} from "lucide-react";
import { authHeaders } from "@/components/pos/pin-login";
import { formatEUR } from "@/lib/types";
import { LoadingSpinner, EmptyState } from "@/components/pos/loading-states";

interface DeliveryZone {
  id: string;
  name: string;
  postalCodes: string[];
  minOrderValue: number;
  deliveryFee: number;
  freeDeliveryThreshold: number | null;
  estimatedTime: number;
  active: boolean;
  note: string | null;
}

interface Summary {
  total: number;
  active: number;
  avgDeliveryFee: number;
  avgMinOrder: number;
  avgTime: number;
  totalPostalCodes: number;
}

interface ZonesData {
  zones: DeliveryZone[];
  summary: Summary;
}

function formatTime(min: number): string {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

export function DeliveryZonesView() {
  const [data, setData] = useState<ZonesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<DeliveryZone | null>(null);

  const [form, setForm] = useState({
    name: "",
    postalCodes: "",
    minOrderValue: 0,
    deliveryFee: 0,
    freeDeliveryThreshold: "",
    estimatedTime: 30,
    note: "",
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/delivery-zones", { headers: authHeaders() });
      if (!res.ok) throw new Error("Napaka");
      const json = await res.json();
      setData(json);
    } catch {
      toast.error("Napaka pri nalaganju con dostave");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  function openEdit(item: DeliveryZone) {
    setEditItem(item);
    setForm({
      name: item.name,
      postalCodes: item.postalCodes.join(", "),
      minOrderValue: item.minOrderValue,
      deliveryFee: item.deliveryFee,
      freeDeliveryThreshold: item.freeDeliveryThreshold?.toString() || "",
      estimatedTime: item.estimatedTime,
      note: item.note || "",
    });
    setAddDialogOpen(true);
  }

  function resetForm() {
    setForm({
      name: "",
      postalCodes: "",
      minOrderValue: 0,
      deliveryFee: 0,
      freeDeliveryThreshold: "",
      estimatedTime: 30,
      note: "",
    });
    setEditItem(null);
  }

  async function saveZone() {
    const codes = form.postalCodes
      .split(",")
      .map((c) => c.trim())
      .filter((c) => c.length > 0);

    if (!form.name || codes.length === 0) {
      toast.error("Ime in poštne številke so obvezne");
      return;
    }

    try {
      const payload = {
        name: form.name,
        postalCodes: codes,
        minOrderValue: form.minOrderValue,
        deliveryFee: form.deliveryFee,
        freeDeliveryThreshold: form.freeDeliveryThreshold ? Number(form.freeDeliveryThreshold) : null,
        estimatedTime: form.estimatedTime,
        note: form.note,
      };
      const url = editItem ? `/api/delivery-zones/${editItem.id}` : "/api/delivery-zones";
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
      toast.success(editItem ? "✓ Cona posodobljena" : "✓ Cona ustvarjena");
      setAddDialogOpen(false);
      resetForm();
      await loadData();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Napaka pri shranjevanju");
    }
  }

  async function deleteZone(id: string) {
    if (!confirm("Ali res želiš izbrisati to cono?")) return;
    try {
      const res = await fetch(`/api/delivery-zones/${id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Napaka");
      }
      toast.success("✓ Cona izbrisana");
      await loadData();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Napaka pri brisanju");
    }
  }

  async function toggleActive(item: DeliveryZone) {
    try {
      const res = await fetch(`/api/delivery-zones/${item.id}`, {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify({ active: !item.active }),
      });
      if (!res.ok) throw new Error("Napaka");
      toast.success(item.active ? "✓ Cona deaktivirana" : "✓ Cona aktivirana");
      await loadData();
    } catch {
      toast.error("Napaka pri posodabljanju");
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold">Cone dostave</h2>
          <p className="text-sm text-muted-foreground">Upravljanje območij dostave</p>
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
            <MapPin className="h-6 w-6 text-emerald-600" />
            Cone dostave
          </h2>
          <p className="text-sm text-muted-foreground">
            Upravljanje območij dostave, cen in pogojev
          </p>
        </div>
        <Button
          onClick={() => {
            resetForm();
            setAddDialogOpen(true);
          }}
          className="bg-emerald-600 hover:bg-emerald-700"
        >
          <Plus className="mr-1.5 h-4 w-4" />
          Nova cona
        </Button>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase text-muted-foreground">Skupaj con</p>
              <p className="text-2xl font-bold">{s.total}</p>
            </div>
            <MapPin className="h-8 w-8 text-emerald-600/40" />
          </div>
        </Card>
        <Card className="border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900 dark:bg-emerald-950/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase text-emerald-700 dark:text-emerald-300">Aktivne</p>
              <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">{s.active}</p>
            </div>
            <CheckCircle2 className="h-8 w-8 text-emerald-600/60" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase text-muted-foreground">Pov. cena dostave</p>
              <p className="text-2xl font-bold">{formatEUR(s.avgDeliveryFee)}</p>
              <p className="text-xs text-muted-foreground">min. {formatEUR(s.avgMinOrder)}</p>
            </div>
            <Euro className="h-8 w-8 text-muted-foreground/40" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase text-muted-foreground">Pov. čas</p>
              <p className="text-2xl font-bold">{formatTime(s.avgTime)}</p>
            </div>
            <Clock className="h-8 w-8 text-muted-foreground/40" />
          </div>
        </Card>
      </div>

      {/* Seznam con */}
      {data.zones.length === 0 ? (
        <EmptyState
          icon={MapPin}
          title="Ni con dostave"
          description="Dodaj prvo cono z gumbom zgoraj"
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.zones.map((zone) => (
            <Card key={zone.id} className="flex flex-col p-4">
              <div className="mb-2 flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-950/30">
                    <Truck className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold">{zone.name}</h4>
                    <p className="text-xs text-muted-foreground">
                      {zone.postalCodes.length} poštnih št.
                    </p>
                  </div>
                </div>
                <button onClick={() => toggleActive(zone)}>
                  <Badge
                    variant="outline"
                    className={
                      zone.active
                        ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300"
                        : "border-muted bg-muted/50 text-muted-foreground"
                    }
                  >
                    {zone.active ? "Aktivno" : "Neaktivno"}
                  </Badge>
                </button>
              </div>

              {/* Poštne številke */}
              <div className="mb-3 flex flex-wrap gap-1">
                {zone.postalCodes.map((code) => (
                  <Badge key={code} variant="secondary" className="text-xs">
                    {code}
                  </Badge>
                ))}
              </div>

              {/* Pogoji */}
              <div className="mb-3 space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Cena dostave:</span>
                  <span className="font-medium">
                    {zone.deliveryFee === 0 ? (
                      <span className="text-emerald-600">Brezplačno</span>
                    ) : (
                      formatEUR(zone.deliveryFee)
                    )}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Min. naročilo:</span>
                  <span className="font-medium">{formatEUR(zone.minOrderValue)}</span>
                </div>
                {zone.freeDeliveryThreshold && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Brezpl. nad:</span>
                    <span className="font-medium text-emerald-600">
                      {formatEUR(zone.freeDeliveryThreshold)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Čas dostave:</span>
                  <span className="font-medium">{formatTime(zone.estimatedTime)}</span>
                </div>
              </div>

              {zone.note && (
                <p className="mb-3 rounded bg-muted/20 p-2 text-xs italic text-muted-foreground">
                  {zone.note}
                </p>
              )}

              {/* Akcije */}
              <div className="mt-auto flex gap-1">
                <Button size="sm" variant="ghost" onClick={() => openEdit(zone)}>
                  <Edit className="h-3 w-3" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => deleteZone(zone.id)}
                  className="text-rose-600"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editItem ? "Uredi cono" : "Nova cona dostave"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Ime cone *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="npr. Center, Šiška"
              />
            </div>
            <div>
              <Label>Poštne številke *</Label>
              <Textarea
                value={form.postalCodes}
                onChange={(e) => setForm({ ...form, postalCodes: e.target.value })}
                rows={2}
                placeholder="1000, 1001, 1002"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Loči z vejicami
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Min. naročilo (€)</Label>
                <Input
                  type="number"
                  value={form.minOrderValue}
                  onChange={(e) => setForm({ ...form, minOrderValue: Number(e.target.value) })}
                />
              </div>
              <div>
                <Label>Cena dostave (€)</Label>
                <Input
                  type="number"
                  step="0.50"
                  value={form.deliveryFee}
                  onChange={(e) => setForm({ ...form, deliveryFee: Number(e.target.value) })}
                />
              </div>
              <div>
                <Label>Brezpl. nad (€)</Label>
                <Input
                  type="number"
                  value={form.freeDeliveryThreshold}
                  onChange={(e) => setForm({ ...form, freeDeliveryThreshold: e.target.value })}
                  placeholder="30"
                />
              </div>
              <div>
                <Label>Čas dostave (min)</Label>
                <Input
                  type="number"
                  value={form.estimatedTime}
                  onChange={(e) => setForm({ ...form, estimatedTime: Number(e.target.value) })}
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
            <Button onClick={saveZone} className="bg-emerald-600 hover:bg-emerald-700">
              {editItem ? "Shrani" : "Ustvari"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
