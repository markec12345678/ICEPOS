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
  ArrowLeftRight,
  Plus,
  Trash2,
  Send,
  CheckCircle2,
  XCircle,
  Package,
  Euro,
  Building2,
  Minus,
} from "lucide-react";
import { authHeaders } from "@/components/pos/pin-login";
import { formatEUR } from "@/lib/types";
import { LoadingSpinner, EmptyState } from "@/components/pos/loading-states";

interface StockTransferItem {
  id: string;
  inventoryItemId: string | null;
  name: string;
  quantity: number;
  unit: string;
  unitCost: number;
  lineTotal: number;
}

interface StockTransfer {
  id: string;
  transferNumber: string;
  toRestaurantId: string;
  toRestaurantName: string;
  status: string;
  transferDate: string;
  receivedDate: string | null;
  totalItems: number;
  totalValue: number;
  note: string | null;
  operator: string | null;
  items: StockTransferItem[];
}

interface Restaurant {
  id: string;
  name: string;
  slug: string;
}

interface InventoryItem {
  id: string;
  name: string;
  unit: string;
  quantity: number;
  costPerUnit: number;
  category: string;
}

interface TransferData {
  items: StockTransfer[];
  restaurants: Restaurant[];
  summary: {
    total: number;
    draft: number;
    sent: number;
    received: number;
    cancelled: number;
    totalValue: number;
  };
}

const STATUS_CONFIG: Record<string, { label: string; className: string; icon: typeof Package }> = {
  draft: {
    label: "Osnutek",
    className: "border-muted bg-muted/50 text-muted-foreground",
    icon: Package,
  },
  sent: {
    label: "Poslano",
    className:
      "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300",
    icon: Send,
  },
  received: {
    label: "Prejeto",
    className:
      "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300",
    icon: CheckCircle2,
  },
  cancelled: {
    label: "Preklicano",
    className:
      "border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950/30 dark:text-rose-300",
    icon: XCircle,
  },
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("sl-SI");
}

export function StockTransferView() {
  const [data, setData] = useState<TransferData | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [detailItem, setDetailItem] = useState<StockTransfer | null>(null);

  // Add form
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [toRestaurantId, setToRestaurantId] = useState("");
  const [cart, setCart] = useState<
    Array<{ inventoryItemId: string; name: string; quantity: number; unit: string; unitCost: number }>
  >([]);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      const url = `/api/stock-transfers${params.toString() ? `?${params}` : ""}`;
      const res = await fetch(url, { headers: authHeaders() });
      if (!res.ok) throw new Error("Napaka");
      const json = await res.json();
      setData(json);
    } catch {
      toast.error("Napaka pri nalaganju prenosov");
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function loadInventory() {
    try {
      const res = await fetch("/api/inventory", { headers: authHeaders() });
      if (!res.ok) throw new Error("Napaka");
      const json = await res.json();
      setInventory(json);
    } catch {
      toast.error("Napaka pri nalaganju zaloge");
    }
  }

  useEffect(() => {
    if (addDialogOpen) {
      loadInventory();
      setCart([]);
      setNote("");
      if (data && data.restaurants.length > 0) {
        setToRestaurantId(data.restaurants[0].id);
      }
    }
  }, [addDialogOpen, data]);

  function addToCart(item: InventoryItem) {
    const existing = cart.find((c) => c.inventoryItemId === item.id);
    if (existing) {
      setCart(cart.map((c) =>
        c.inventoryItemId === item.id ? { ...c, quantity: c.quantity + 1 } : c
      ));
    } else {
      setCart([
        ...cart,
        {
          inventoryItemId: item.id,
          name: item.name,
          quantity: 1,
          unit: item.unit,
          unitCost: item.costPerUnit,
        },
      ]);
    }
  }

  function updateQty(id: string, delta: number) {
    setCart(
      cart
        .map((c) =>
          c.inventoryItemId === id ? { ...c, quantity: Math.max(0, c.quantity + delta) } : c
        )
        .filter((c) => c.quantity > 0)
    );
  }

  function removeFromCart(id: string) {
    setCart(cart.filter((c) => c.inventoryItemId !== id));
  }

  function getCartTotal() {
    return cart.reduce((s, c) => s + c.quantity * c.unitCost, 0);
  }

  async function saveTransfer() {
    if (!toRestaurantId || cart.length === 0) {
      toast.error("Izberi ciljno restavracijo in vsaj eno postavko");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/stock-transfers", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          toRestaurantId,
          items: cart.map((c) => ({
            inventoryItemId: c.inventoryItemId,
            name: c.name,
            quantity: c.quantity,
            unit: c.unit,
            unitCost: c.unitCost,
          })),
          note,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Napaka");
      }
      toast.success("✓ Prenos ustvarjen");
      setAddDialogOpen(false);
      await loadData();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Napaka pri shranjevanju");
    } finally {
      setSaving(false);
    }
  }

  async function updateStatus(id: string, newStatus: string) {
    setUpdatingId(id);
    try {
      const res = await fetch(`/api/stock-transfers/${id}`, {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Napaka");
      }
      toast.success(`✓ Status posodobljen na "${STATUS_CONFIG[newStatus]?.label || newStatus}"`);
      setDetailItem(null);
      await loadData();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Napaka pri posodabljanju");
    } finally {
      setUpdatingId(null);
    }
  }

  async function deleteTransfer(id: string) {
    if (!confirm("Ali res želiš izbrisati ta prenos?")) return;
    try {
      const res = await fetch(`/api/stock-transfers/${id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Napaka");
      }
      toast.success("✓ Prenos izbrisan");
      setDetailItem(null);
      await loadData();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Napaka pri brisanju");
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold">Medlokalni prenosi</h2>
          <p className="text-sm text-muted-foreground">Prenosi zalog med restavracijami</p>
        </div>
        <LoadingSpinner />
      </div>
    );
  }

  if (!data) return null;

  const s = data.summary;
  const filteredItems = statusFilter === "all" ? data.items : data.items.filter((i) => i.status === statusFilter);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-2xl font-bold">
            <ArrowLeftRight className="h-6 w-6 text-amber-600" />
            Medlokalni prenosi
          </h2>
          <p className="text-sm text-muted-foreground">
            Prenosi zalog med restavracijami z avtomatskim posodabljanjem inventarja
          </p>
        </div>
        <Button onClick={() => setAddDialogOpen(true)} className="bg-amber-600 hover:bg-amber-700">
          <Plus className="mr-1.5 h-4 w-4" />
          Nov prenos
        </Button>
      </div>

      {/* KPI kartice */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase text-muted-foreground">Skupaj prenosov</p>
              <p className="text-2xl font-bold">{s.total}</p>
            </div>
            <ArrowLeftRight className="h-8 w-8 text-muted-foreground/40" />
          </div>
        </Card>
        <Card className="border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase text-amber-700 dark:text-amber-300">Poslano</p>
              <p className="text-2xl font-bold text-amber-700 dark:text-amber-300">{s.sent}</p>
            </div>
            <Send className="h-8 w-8 text-amber-600/60" />
          </div>
        </Card>
        <Card className="border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900 dark:bg-emerald-950/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase text-emerald-700 dark:text-emerald-300">Prejeto</p>
              <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">{s.received}</p>
            </div>
            <CheckCircle2 className="h-8 w-8 text-emerald-600/60" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase text-muted-foreground">Vrednost prenosov</p>
              <p className="text-2xl font-bold">{formatEUR(s.totalValue)}</p>
            </div>
            <Euro className="h-8 w-8 text-muted-foreground/40" />
          </div>
        </Card>
      </div>

      {/* Filter */}
      <Select value={statusFilter} onValueChange={setStatusFilter}>
        <SelectTrigger className="w-full sm:w-56">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Vsi statusi</SelectItem>
          <SelectItem value="draft">Osnutki</SelectItem>
          <SelectItem value="sent">Poslani</SelectItem>
          <SelectItem value="received">Prejeti</SelectItem>
          <SelectItem value="cancelled">Preklicani</SelectItem>
        </SelectContent>
      </Select>

      {/* Seznam prenosov */}
      {filteredItems.length === 0 ? (
        <EmptyState
          icon={ArrowLeftRight}
          title="Ni prenosov"
          description="Ustvari prvi prenos z gumbom zgoraj"
        />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr className="border-b">
                  <th className="px-3 py-3 text-left font-semibold">Št. prenosa</th>
                  <th className="px-3 py-3 text-left font-semibold">Cilj</th>
                  <th className="px-3 py-3 text-left font-semibold">Datum</th>
                  <th className="px-3 py-3 text-right font-semibold">Postavk</th>
                  <th className="px-3 py-3 text-right font-semibold">Vrednost</th>
                  <th className="px-3 py-3 text-center font-semibold">Status</th>
                  <th className="px-3 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item) => {
                  const cfg = STATUS_CONFIG[item.status] || STATUS_CONFIG.draft;
                  const StatusIcon = cfg.icon;
                  return (
                    <tr
                      key={item.id}
                      className="cursor-pointer border-b transition-colors hover:bg-muted/30"
                      onClick={() => setDetailItem(item)}
                    >
                      <td className="px-3 py-3 font-medium">{item.transferNumber}</td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-1">
                          <Building2 className="h-3 w-3 text-muted-foreground" />
                          {item.toRestaurantName}
                        </div>
                      </td>
                      <td className="px-3 py-3 text-xs text-muted-foreground">
                        {formatDate(item.transferDate)}
                      </td>
                      <td className="px-3 py-3 text-right">{item.totalItems}</td>
                      <td className="px-3 py-3 text-right font-medium">{formatEUR(item.totalValue)}</td>
                      <td className="px-3 py-3 text-center">
                        <Badge variant="outline" className={cfg.className}>
                          <StatusIcon className="mr-1 h-3 w-3" />
                          {cfg.label}
                        </Badge>
                      </td>
                      <td className="px-3 py-3">
                        <Button size="sm" variant="ghost">
                          Podrobnosti
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Add dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nov prenos zalog</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Ciljna restavracija *</Label>
              <Select value={toRestaurantId} onValueChange={setToRestaurantId}>
                <SelectTrigger>
                  <SelectValue placeholder="Izberi ciljno restavracijo" />
                </SelectTrigger>
                <SelectContent>
                  {data.restaurants.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Postavke za prenos</Label>
              <div className="max-h-64 overflow-y-auto rounded border">
                {inventory.length === 0 ? (
                  <p className="p-4 text-center text-sm text-muted-foreground">Nalagam zalogo...</p>
                ) : (
                  <div className="grid grid-cols-1 gap-1 p-2 sm:grid-cols-2">
                    {inventory.slice(0, 30).map((inv) => {
                      const cartItem = cart.find((c) => c.inventoryItemId === inv.id);
                      return (
                        <div key={inv.id} className="flex items-center justify-between rounded border p-2 text-xs">
                          <div className="flex-1">
                            <p className="font-medium">{inv.name}</p>
                            <p className="text-muted-foreground">
                              Na zalogi: {inv.quantity} {inv.unit} · {formatEUR(inv.costPerUnit)}/{inv.unit}
                            </p>
                          </div>
                          {cartItem ? (
                            <div className="flex items-center gap-1">
                              <Button size="icon" variant="outline" className="h-6 w-6" onClick={() => updateQty(inv.id, -1)}>
                                <Minus className="h-3 w-3" />
                              </Button>
                              <span className="w-8 text-center font-bold">{cartItem.quantity}</span>
                              <Button size="icon" variant="outline" className="h-6 w-6" onClick={() => updateQty(inv.id, 1)}>
                                <Plus className="h-3 w-3" />
                              </Button>
                            </div>
                          ) : (
                            <Button size="sm" variant="outline" onClick={() => addToCart(inv)}>
                              <Plus className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Cart */}
            {cart.length > 0 && (
              <div className="rounded border bg-muted/20 p-3">
                <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
                  Povzetek ({cart.length} postavk)
                </p>
                <div className="space-y-1 text-sm">
                  {cart.map((c) => (
                    <div key={c.inventoryItemId} className="flex items-center justify-between">
                      <span>
                        {c.name} × {c.quantity} {c.unit}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">{formatEUR(c.quantity * c.unitCost)}</span>
                        <Button size="icon" variant="ghost" className="h-5 w-5 text-rose-600" onClick={() => removeFromCart(c.inventoryItemId)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  <div className="border-t pt-1">
                    <div className="flex justify-between font-bold">
                      <span>Skupna vrednost:</span>
                      <span>{formatEUR(getCartTotal())}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div>
              <Label>Opomba</Label>
              <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                placeholder="Opomba za prenos..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
              Prekliči
            </Button>
            <Button onClick={saveTransfer} disabled={saving || !toRestaurantId || cart.length === 0} className="bg-amber-600 hover:bg-amber-700">
              {saving ? "Shranjujem..." : "Ustvari prenos"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail dialog */}
      <Dialog open={!!detailItem} onOpenChange={(open) => !open && setDetailItem(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowLeftRight className="h-5 w-5" />
              Prenos {detailItem?.transferNumber}
            </DialogTitle>
          </DialogHeader>
          {detailItem && (
            <div className="space-y-4">
              {/* Info */}
              <div className="grid grid-cols-2 gap-3 rounded border p-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Ciljna restavracija</p>
                  <p className="font-medium">{detailItem.toRestaurantName}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Datum prenosa</p>
                  <p className="font-medium">{formatDate(detailItem.transferDate)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Postavk</p>
                  <p className="font-medium">{detailItem.totalItems}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Vrednost</p>
                  <p className="font-medium">{formatEUR(detailItem.totalValue)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Operater</p>
                  <p className="font-medium">{detailItem.operator || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Status</p>
                  <Badge variant="outline" className={STATUS_CONFIG[detailItem.status]?.className}>
                    {STATUS_CONFIG[detailItem.status]?.label}
                  </Badge>
                </div>
              </div>

              {/* Items */}
              <div>
                <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
                  Postavke ({detailItem.items.length})
                </p>
                <div className="max-h-48 overflow-y-auto rounded border">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-muted/30">
                      <tr className="border-b">
                        <th className="px-3 py-2 text-left font-semibold">Artikel</th>
                        <th className="px-3 py-2 text-right font-semibold">Količina</th>
                        <th className="px-3 py-2 text-right font-semibold">Cena</th>
                        <th className="px-3 py-2 text-right font-semibold">Skupaj</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detailItem.items.map((item) => (
                        <tr key={item.id} className="border-b">
                          <td className="px-3 py-2">{item.name}</td>
                          <td className="px-3 py-2 text-right">{item.quantity} {item.unit}</td>
                          <td className="px-3 py-2 text-right">{formatEUR(item.unitCost)}</td>
                          <td className="px-3 py-2 text-right font-medium">{formatEUR(item.lineTotal)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {detailItem.note && (
                <div className="rounded border bg-muted/20 p-3 text-sm">
                  <p className="text-xs font-semibold uppercase text-muted-foreground">Opomba</p>
                  <p className="mt-1">{detailItem.note}</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-wrap gap-2">
                {detailItem.status === "draft" && (
                  <>
                    <Button
                      onClick={() => updateStatus(detailItem.id, "sent")}
                      disabled={updatingId === detailItem.id}
                      className="bg-amber-600 hover:bg-amber-700"
                    >
                      <Send className="mr-1.5 h-4 w-4" />
                      Pošlji (zmanjšaj zalogo)
                    </Button>
                    <Button
                      onClick={() => deleteTransfer(detailItem.id)}
                      variant="outline"
                      className="text-rose-600"
                    >
                      <Trash2 className="mr-1.5 h-4 w-4" />
                      Izbriši
                    </Button>
                  </>
                )}
                {detailItem.status === "sent" && (
                  <>
                    <Button
                      onClick={() => updateStatus(detailItem.id, "received")}
                      disabled={updatingId === detailItem.id}
                      className="bg-emerald-600 hover:bg-emerald-700"
                    >
                      <CheckCircle2 className="mr-1.5 h-4 w-4" />
                      Označi kot prejeto
                    </Button>
                    <Button
                      onClick={() => updateStatus(detailItem.id, "cancelled")}
                      variant="outline"
                      className="text-rose-600"
                    >
                      <XCircle className="mr-1.5 h-4 w-4" />
                      Prekliči
                    </Button>
                  </>
                )}
                {(detailItem.status === "received" || detailItem.status === "cancelled") && (
                  <p className="text-xs text-muted-foreground">
                    {detailItem.status === "received"
                      ? `Prejeto ${detailItem.receivedDate ? formatDate(detailItem.receivedDate) : ""}`
                      : "Prenos je preklican"}
                  </p>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
