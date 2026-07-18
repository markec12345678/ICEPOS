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
  UtensilsCrossed,
  Plus,
  Minus,
  Trash2,
  Users,
  Euro,
  Percent,
  Calendar,
  Coffee,
  Sun,
  Moon,
  Utensils,
} from "lucide-react";
import { authHeaders } from "@/components/pos/pin-login";
import { formatEUR } from "@/lib/types";
import { LoadingSpinner, EmptyState } from "@/components/pos/loading-states";

interface StaffMealItem {
  id: string;
  invoiceNumber: string | null;
  receiptNo: string | null;
  operator: string;
  createdAt: string;
  total: number;
  originalTotal: number;
  discount: number;
  discountPercent: number;
  mealType: string;
  itemCount: number;
  items: Array<{ name: string; quantity: number; unitPrice: number }>;
}

interface OperatorAgg {
  operator: string;
  count: number;
  totalDiscount: number;
  totalOriginal: number;
  totalPaid: number;
}

interface DateAgg {
  date: string;
  count: number;
  totalDiscount: number;
  totalPaid: number;
}

interface Operator {
  id: string;
  name: string;
  role: string;
}

interface StaffMealData {
  period: { from: string; to: string };
  items: StaffMealItem[];
  byOperator: OperatorAgg[];
  byDate: DateAgg[];
  operators: Operator[];
  summary: {
    total: number;
    totalDiscount: number;
    totalOriginal: number;
    totalPaid: number;
    avgDiscount: number;
    uniqueOperators: number;
  };
}

interface MenuItem {
  id: string;
  name: string;
  category: string;
  price: number;
  available: boolean;
}

const MEAL_TYPE_CONFIG: Record<string, { label: string; icon: typeof Coffee }> = {
  breakfast: { label: "Zajtrk", icon: Coffee },
  lunch: { label: "Kosilo", icon: Sun },
  dinner: { label: "Večerja", icon: Moon },
  snack: { label: "Malica", icon: Utensils },
};

function mealTypeLabel(t: string): string {
  return MEAL_TYPE_CONFIG[t]?.label || t;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("sl-SI");
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("sl-SI", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function StaffMealView() {
  const [data, setData] = useState<StaffMealData | null>(null);
  const [loading, setLoading] = useState(true);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [operatorFilter, setOperatorFilter] = useState("all");

  // Add form state
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [selectedOperator, setSelectedOperator] = useState("");
  const [discountPercent, setDiscountPercent] = useState(50);
  const [mealType, setMealType] = useState("lunch");
  const [cart, setCart] = useState<Array<{ menuItemId: string; quantity: number }>>([]);
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      if (operatorFilter !== "all") params.set("operatorId", operatorFilter);
      const url = `/api/staff-meals${params.toString() ? `?${params}` : ""}`;
      const res = await fetch(url, { headers: authHeaders() });
      if (!res.ok) throw new Error("Napaka");
      const json = await res.json();
      setData(json);
    } catch {
      toast.error("Napaka pri nalaganju obrokov zaposlenih");
    } finally {
      setLoading(false);
    }
  }, [from, to, operatorFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function loadMenuItems() {
    try {
      const res = await fetch("/api/menu", { headers: authHeaders() });
      if (!res.ok) throw new Error("Napaka");
      const json = await res.json();
      setMenuItems(json.filter((m: MenuItem) => m.available));
    } catch {
      toast.error("Napaka pri nalaganju menija");
    }
  }

  useEffect(() => {
    if (addDialogOpen) {
      loadMenuItems();
      if (data && data.operators.length > 0) {
        setSelectedOperator(data.operators[0].id);
      }
    }
  }, [addDialogOpen, data]);

  function addToCart(menuItemId: string) {
    const existing = cart.find((c) => c.menuItemId === menuItemId);
    if (existing) {
      setCart(cart.map((c) =>
        c.menuItemId === menuItemId ? { ...c, quantity: c.quantity + 1 } : c
      ));
    } else {
      setCart([...cart, { menuItemId, quantity: 1 }]);
    }
  }

  function updateQty(menuItemId: string, delta: number) {
    setCart(
      cart
        .map((c) =>
          c.menuItemId === menuItemId
            ? { ...c, quantity: Math.max(0, c.quantity + delta) }
            : c
        )
        .filter((c) => c.quantity > 0)
    );
  }

  function getCartItem(menuItemId: string) {
    return cart.find((c) => c.menuItemId === menuItemId);
  }

  function getCartTotal() {
    return cart.reduce((s, c) => {
      const item = menuItems.find((m) => m.id === c.menuItemId);
      if (!item) return s;
      return s + item.price * c.quantity * (1 - discountPercent / 100);
    }, 0);
  }

  function getCartOriginal() {
    return cart.reduce((s, c) => {
      const item = menuItems.find((m) => m.id === c.menuItemId);
      if (!item) return s;
      return s + item.price * c.quantity;
    }, 0);
  }

  async function saveMeal() {
    if (!selectedOperator || cart.length === 0) {
      toast.error("Izberi operaterja in vsaj eno postavko");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/staff-meals", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          items: cart,
          operatorId: selectedOperator,
          discountPercent,
          mealType,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Napaka");
      }
      toast.success("✓ Obrok zapisan");
      setAddDialogOpen(false);
      setCart([]);
      setDiscountPercent(50);
      setMealType("lunch");
      await loadData();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Napaka pri shranjevanju");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold">Obroki zaposlenih</h2>
          <p className="text-sm text-muted-foreground">Sledenje obrokov in popustov za osebje</p>
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
            <UtensilsCrossed className="h-6 w-6 text-amber-600" />
            Obroki zaposlenih
          </h2>
          <p className="text-sm text-muted-foreground">
            Sledenje obrokov in popustov za osebje — avtorizirano
          </p>
        </div>
        <Button
          onClick={() => setAddDialogOpen(true)}
          className="bg-amber-600 hover:bg-amber-700"
        >
          <Plus className="mr-1.5 h-4 w-4" />
          Nov obrok
        </Button>
      </div>

      {/* KPI kartice */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase text-muted-foreground">Skupaj obrokov</p>
              <p className="text-2xl font-bold">{s.total}</p>
            </div>
            <UtensilsCrossed className="h-8 w-8 text-amber-600/40" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase text-muted-foreground">
                Skupni popust
              </p>
              <p className="text-2xl font-bold text-rose-600">{formatEUR(s.totalDiscount)}</p>
              <p className="text-xs text-muted-foreground">
                pov. {s.avgDiscount.toFixed(2)}€ / obrok
              </p>
            </div>
            <Percent className="h-8 w-8 text-rose-600/40" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase text-muted-foreground">Plačano</p>
              <p className="text-2xl font-bold">{formatEUR(s.totalPaid)}</p>
              <p className="text-xs text-muted-foreground">
                od {formatEUR(s.totalOriginal)}
              </p>
            </div>
            <Euro className="h-8 w-8 text-emerald-600/40" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase text-muted-foreground">
                Aktivni zaposleni
              </p>
              <p className="text-2xl font-bold">{s.uniqueOperators}</p>
            </div>
            <Users className="h-8 w-8 text-muted-foreground/40" />
          </div>
        </Card>
      </div>

      {/* Filtri */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Select value={operatorFilter} onValueChange={setOperatorFilter}>
          <SelectTrigger className="w-full sm:w-56">
            <SelectValue placeholder="Vsi zaposleni" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Vsi zaposleni</SelectItem>
            {data.operators.map((op) => (
              <SelectItem key={op.id} value={op.id}>
                {op.name} ({op.role})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          className="w-full sm:w-40"
        />
        <Input
          type="date"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          className="w-full sm:w-40"
        />
      </div>

      {/* Po operaterjih */}
      {data.byOperator.length > 0 && (
        <Card className="p-4">
          <h3 className="mb-3 flex items-center gap-2 font-semibold">
            <Users className="h-5 w-5" />
            Po zaposlenih
          </h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {data.byOperator.map((op) => (
              <div key={op.operator} className="rounded border p-3">
                <div className="flex items-center justify-between">
                  <p className="font-medium">{op.operator}</p>
                  <Badge variant="outline">{op.count} obrokov</Badge>
                </div>
                <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <p className="text-muted-foreground">Vrednost</p>
                    <p className="font-medium">{formatEUR(op.totalOriginal)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Popust</p>
                    <p className="font-medium text-rose-600">{formatEUR(op.totalDiscount)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Plačano</p>
                    <p className="font-medium text-emerald-600">{formatEUR(op.totalPaid)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Po datumih */}
      {data.byDate.length > 0 && (
        <Card className="p-4">
          <h3 className="mb-3 flex items-center gap-2 font-semibold">
            <Calendar className="h-5 w-5" />
            Po datumih
          </h3>
          <div className="max-h-64 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-background">
                <tr className="border-b">
                  <th className="px-3 py-2 text-left font-semibold">Datum</th>
                  <th className="px-3 py-2 text-right font-semibold">Obrokov</th>
                  <th className="px-3 py-2 text-right font-semibold">Popust</th>
                  <th className="px-3 py-2 text-right font-semibold">Plačano</th>
                </tr>
              </thead>
              <tbody>
                {data.byDate.map((d) => (
                  <tr key={d.date} className="border-b">
                    <td className="px-3 py-2">{formatDate(d.date)}</td>
                    <td className="px-3 py-2 text-right">{d.count}</td>
                    <td className="px-3 py-2 text-right text-rose-600">
                      {formatEUR(d.totalDiscount)}
                    </td>
                    <td className="px-3 py-2 text-right text-emerald-600">
                      {formatEUR(d.totalPaid)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Zgodovina obrokov */}
      {data.items.length === 0 ? (
        <EmptyState
          icon={UtensilsCrossed}
          title="Ni obrokov zaposlenih"
          description="Zabeleži prvi obrok z gumbom zgoraj"
        />
      ) : (
        <Card className="overflow-hidden">
          <div className="border-b bg-muted/50 p-4">
            <h3 className="font-semibold">Zgodovina obrokov</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/30">
                <tr className="border-b">
                  <th className="px-3 py-3 text-left font-semibold">Datum/čas</th>
                  <th className="px-3 py-3 text-left font-semibold">Operater</th>
                  <th className="px-3 py-3 text-left font-semibold">Tip</th>
                  <th className="px-3 py-3 text-right font-semibold">Vrednost</th>
                  <th className="px-3 py-3 text-right font-semibold">Popust</th>
                  <th className="px-3 py-3 text-right font-semibold">Plačano</th>
                  <th className="px-3 py-3 text-center font-semibold">Postavk</th>
                </tr>
              </thead>
              <tbody>
                {data.items.slice(0, 50).map((item) => {
                  const MealIcon = MEAL_TYPE_CONFIG[item.mealType]?.icon || Utensils;
                  return (
                    <tr key={item.id} className="border-b">
                      <td className="px-3 py-3 text-xs text-muted-foreground">
                        {formatDateTime(item.createdAt)}
                      </td>
                      <td className="px-3 py-3 font-medium">{item.operator}</td>
                      <td className="px-3 py-3">
                        <Badge variant="outline" className="text-xs">
                          <MealIcon className="mr-1 h-3 w-3" />
                          {mealTypeLabel(item.mealType)}
                        </Badge>
                      </td>
                      <td className="px-3 py-3 text-right">{formatEUR(item.originalTotal)}</td>
                      <td className="px-3 py-3 text-right text-rose-600">
                        -{formatEUR(item.discount)}
                        <span className="ml-1 text-[10px] text-muted-foreground">
                          ({item.discountPercent}%)
                        </span>
                      </td>
                      <td className="px-3 py-3 text-right font-bold text-emerald-600">
                        {formatEUR(item.total)}
                      </td>
                      <td className="px-3 py-3 text-center text-muted-foreground">
                        {item.itemCount}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {data.items.length > 50 && (
            <div className="border-t bg-muted/30 p-3 text-center text-xs text-muted-foreground">
              Prikazujem prvih 50 od {data.items.length} obrokov
            </div>
          )}
        </Card>
      )}

      {/* Add meal dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nov obrok zaposlenega</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Operater in nastavitve */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <Label>Zaposleni *</Label>
                <Select value={selectedOperator} onValueChange={setSelectedOperator}>
                  <SelectTrigger>
                    <SelectValue placeholder="Izberi" />
                  </SelectTrigger>
                  <SelectContent>
                    {data.operators.map((op) => (
                      <SelectItem key={op.id} value={op.id}>
                        {op.name} ({op.role})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Tip obroka</Label>
                <Select value={mealType} onValueChange={setMealType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(MEAL_TYPE_CONFIG).map(([k, v]) => (
                      <SelectItem key={k} value={k}>
                        {v.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Popust (%)</Label>
                <Input
                  type="number"
                  value={discountPercent}
                  onChange={(e) => setDiscountPercent(Math.max(0, Math.min(100, Number(e.target.value))))}
                  min={0}
                  max={100}
                />
              </div>
            </div>

            {/* Meni izbira */}
            <div>
              <Label>Meni postavke</Label>
              <div className="max-h-64 overflow-y-auto rounded border">
                {menuItems.length === 0 ? (
                  <p className="p-4 text-center text-sm text-muted-foreground">Nalagam meni...</p>
                ) : (
                  <div className="grid grid-cols-2 gap-1 p-2">
                    {menuItems.slice(0, 30).map((m) => {
                      const cartItem = getCartItem(m.id);
                      return (
                        <div
                          key={m.id}
                          className="flex items-center justify-between rounded border p-2 text-xs"
                        >
                          <div className="flex-1">
                            <p className="font-medium">{m.name}</p>
                            <p className="text-muted-foreground">
                              {formatEUR(m.price)} → {formatEUR(m.price * (1 - discountPercent / 100))}
                            </p>
                          </div>
                          {cartItem ? (
                            <div className="flex items-center gap-1">
                              <Button size="icon" variant="outline" className="h-6 w-6" onClick={() => updateQty(m.id, -1)}>
                                <Minus className="h-3 w-3" />
                              </Button>
                              <span className="w-6 text-center font-bold">{cartItem.quantity}</span>
                              <Button size="icon" variant="outline" className="h-6 w-6" onClick={() => updateQty(m.id, 1)}>
                                <Plus className="h-3 w-3" />
                              </Button>
                            </div>
                          ) : (
                            <Button size="sm" variant="outline" onClick={() => addToCart(m.id)}>
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

            {/* Povzetek */}
            {cart.length > 0 && (
              <div className="rounded border bg-muted/20 p-3">
                <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
                  Povzetek ({cart.length} postavk)
                </p>
                <div className="space-y-1 text-sm">
                  {cart.map((c) => {
                    const item = menuItems.find((m) => m.id === c.menuItemId);
                    if (!item) return null;
                    return (
                      <div key={c.menuItemId} className="flex justify-between">
                        <span>
                          {item.name} × {c.quantity}
                        </span>
                        <span className="text-muted-foreground">
                          {formatEUR(item.price * c.quantity)}
                        </span>
                      </div>
                    );
                  })}
                  <div className="border-t pt-1">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Vrednost:</span>
                      <span>{formatEUR(getCartOriginal())}</span>
                    </div>
                    <div className="flex justify-between text-rose-600">
                      <span>Popust ({discountPercent}%):</span>
                      <span>-{formatEUR(getCartOriginal() - getCartTotal())}</span>
                    </div>
                    <div className="flex justify-between font-bold text-emerald-600">
                      <span>Za plačilo:</span>
                      <span>{formatEUR(getCartTotal())}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
              Prekliči
            </Button>
            <Button
              onClick={saveMeal}
              disabled={saving || !selectedOperator || cart.length === 0}
              className="bg-amber-600 hover:bg-amber-700"
            >
              {saving ? "Shranjujem..." : "Zapiši obrok"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
