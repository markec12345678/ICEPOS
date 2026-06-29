"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Toaster, toast } from "sonner";
import {
  ArrowLeft,
  Search,
  ShoppingCart,
  Utensils,
  ClipboardList,
  LogOut,
  Plus,
  Minus,
  Trash2,
  Send,
  Check,
  Clock,
  ChefHat,
  Bell,
} from "lucide-react";
import { CATEGORIES, formatEUR, type MenuItem, type Table, type Order } from "@/lib/types";

// ============================================================
// Tipi
// ============================================================

interface Operator {
  id: string;
  name: string;
  role: string;
}

interface WaiterCartLine {
  lineId: string;
  menuItem: MenuItem;
  quantity: number;
  note: string;
  modifiers: { id: string; label: string; priceDelta: number }[];
  unitPrice: number;
}

// ============================================================
// Glavna komponenta
// ============================================================

export function WaiterApp() {
  const [operator, setOperator] = useState<Operator | null>(null);
  const [view, setView] = useState<"tables" | "menu" | "orders">("tables");
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [cart, setCart] = useState<WaiterCartLine[]>([]);

  // Naloži operator iz localStorage (lazy initial — brez setState v effect)
  useEffect(() => {
    const stored = localStorage.getItem("waiter-operator");
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as Operator;
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setOperator(parsed);
      } catch {
        localStorage.removeItem("waiter-operator");
      }
    }
  }, []);

  const logout = () => {
    localStorage.removeItem("waiter-operator");
    setOperator(null);
    setView("tables");
    setSelectedTable(null);
    setCart([]);
  };

  if (!operator) {
    return (
      <>
        <WaiterLogin onLogin={(op) => setOperator(op)} />
        <Toaster richColors position="top-center" />
      </>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b bg-card px-4 py-3 shadow-sm">
        <div>
          <p className="text-xs text-muted-foreground">Natakar</p>
          <p className="font-bold leading-tight">{operator.name}</p>
        </div>
        <Button variant="ghost" size="sm" onClick={logout}>
          <LogOut className="h-4 w-4" />
          <span className="ml-1.5">Odjava</span>
        </Button>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto pb-20">
        {view === "tables" && (
          <WaiterTables
            operator={operator}
            onSelectTable={(t) => {
              setSelectedTable(t);
              setView("menu");
            }}
          />
        )}
        {view === "menu" && selectedTable && (
          <WaiterMenu
            table={selectedTable}
            cart={cart}
            setCart={setCart}
            operator={operator}
            onBack={() => {
              setView("tables");
              setSelectedTable(null);
            }}
            onSent={() => {
              setCart([]);
              setView("orders");
            }}
          />
        )}
        {view === "orders" && <WaiterOrders operator={operator} />}
      </main>

      {/* Bottom navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 flex border-t bg-card shadow-lg">
        <BottomNav
          active={view}
          onChange={(v) => {
            setView(v);
            if (v !== "menu") setSelectedTable(null);
          }}
          cartCount={cart.length}
        />
      </nav>

      <Toaster richColors position="top-center" />
    </div>
  );
}

// ============================================================
// PIN Login
// ============================================================

function WaiterLogin({ onLogin }: { onLogin: (op: Operator) => void }) {
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (pin.length !== 4) return;
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Napačen PIN");
        setPin("");
        return;
      }
      const op = await res.json();
      localStorage.setItem("waiter-operator", JSON.stringify(op));
      onLogin(op);
      toast.success(`Dobrodošli, ${op.name}!`);
    } catch {
      toast.error("Napaka pri prijavi");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-primary/5 to-background p-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <Utensils className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-bold">Natakar</h1>
          <p className="text-sm text-muted-foreground">
            Gostilna Pri Marku — Tableside Ordering
          </p>
        </div>

        <div className="rounded-2xl border bg-card p-6 shadow-sm">
          <label className="mb-2 block text-sm font-medium">
            Vnesi svoj PIN
          </label>
          <Input
            type="tel"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={4}
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder="••••"
            className="text-center text-2xl tracking-[0.5em]"
            autoFocus
          />
          <Button
            onClick={submit}
            disabled={pin.length !== 4 || loading}
            className="mt-4 w-full"
            size="lg"
          >
            {loading ? "Prijava..." : "Prijava"}
          </Button>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Demo PIN: 1234 (admin), 5678 (blagajnik), 9999 (natakar)
        </p>
      </div>
      <Toaster richColors position="top-center" />
    </div>
  );
}

// ============================================================
// Bottom Navigation
// ============================================================

function BottomNav({
  active,
  onChange,
  cartCount,
}: {
  active: "tables" | "menu" | "orders";
  onChange: (v: "tables" | "menu" | "orders") => void;
  cartCount: number;
}) {
  return (
    <>
      <NavButton
        active={active === "tables"}
        onClick={() => onChange("tables")}
        icon={<Utensils className="h-5 w-5" />}
        label="Mize"
      />
      <NavButton
        active={active === "menu"}
        onClick={() => onChange("menu")}
        icon={<Search className="h-5 w-5" />}
        label="Meni"
      />
      <NavButton
        active={active === "orders"}
        onClick={() => onChange("orders")}
        icon={<ClipboardList className="h-5 w-5" />}
        label="Naročila"
        badge={cartCount}
      />
    </>
  );
}

function NavButton({
  active,
  onClick,
  icon,
  label,
  badge,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  badge?: number;
}) {
  return (
    <button
      onClick={onClick}
      className={`relative flex flex-1 flex-col items-center gap-1 py-2 text-xs transition-colors ${
        active
          ? "text-primary"
          : "text-muted-foreground hover:text-foreground"
      }`}
    >
      <div className="relative">
        {icon}
        {badge && badge > 0 && (
          <span className="absolute -right-2 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
            {badge}
          </span>
        )}
      </div>
      <span className="font-medium">{label}</span>
    </button>
  );
}

// ============================================================
// Waiter Tables View
// ============================================================

function WaiterTables({
  operator,
  onSelectTable,
}: {
  operator: Operator;
  onSelectTable: (t: Table) => void;
}) {
  const [tables, setTables] = useState<Table[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [tablesRes, ordersRes] = await Promise.all([
        fetch("/api/tables"),
        fetch("/api/orders?status=open"),
      ]);
      const t = await tablesRes.json();
      const o = await ordersRes.json();
      setTables(t);
      setOrders(o);
    } catch {
      toast.error("Napaka pri nalaganju miz");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 10000); // avto-osvežitev vsakih 10s
    return () => clearInterval(interval);
  }, [load]);

  const orderForTable = (tableId: string) =>
    orders.find((o) => o.tableId === tableId);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-muted-foreground">Nalagam mize...</div>
      </div>
    );
  }

  const sections = ["Dvorana", "Terasa", "Zasebna"];

  return (
    <div className="p-4">
      <h2 className="mb-4 text-lg font-bold">Izberi mizo</h2>
      {sections.map((section) => {
        const sectionTables = tables.filter((t) => t.section === section);
        if (sectionTables.length === 0) return null;
        return (
          <div key={section} className="mb-6">
            <h3 className="mb-2 text-sm font-semibold text-muted-foreground">
              {section === "Dvorana" && "🏛️ "}
              {section === "Terasa" && "🌿 "}
              {section === "Zasebna" && "🔒 "}
              {section}
            </h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {sectionTables.map((t) => {
                const order = orderForTable(t.id);
                const hasItems = order && order.items.length > 0;
                return (
                  <button
                    key={t.id}
                    onClick={() => onSelectTable(t)}
                    className={`relative rounded-2xl border-2 p-4 text-left transition-all active:scale-95 ${
                      hasItems
                        ? "border-primary bg-primary/5"
                        : "border-border bg-card hover:border-primary/50"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-xs text-muted-foreground">#{t.number}</p>
                        <p className="font-bold">{t.name}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {t.seats} oseb
                        </p>
                      </div>
                      {hasItems && (
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                          {order.items.length}
                        </span>
                      )}
                    </div>
                    {hasItems && (
                      <p className="mt-2 text-sm font-semibold text-primary">
                        {formatEUR(order.total)}
                      </p>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ============================================================
// Waiter Menu View
// ============================================================

function WaiterMenu({
  table,
  cart,
  setCart,
  operator,
  onBack,
  onSent,
}: {
  table: Table;
  cart: WaiterCartLine[];
  setCart: (c: WaiterCartLine[]) => void;
  operator: Operator;
  onBack: () => void;
  onSent: () => void;
}) {
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [category, setCategory] = useState<string>("glavne_jedi");
  const [search, setSearch] = useState("");
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    fetch("/api/menu")
      .then((r) => r.json())
      .then((items: MenuItem[]) => setMenu(items.filter((i) => i.available)))
      .catch(() => toast.error("Napaka pri nalaganju menija"));
  }, []);

  // Naloži obstoječe odprto naročilo za mizo v voziček
  useEffect(() => {
    fetch(`/api/orders?status=open`)
      .then((r) => r.json())
      .then((orders: Order[]) => {
        const existing = orders.find((o) => o.tableId === table.id);
        if (existing && existing.items.length > 0) {
          setCart(
            existing.items.map((it) => ({
              lineId: `line_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
              menuItem: it.menuItem,
              quantity: it.quantity,
              note: it.note || "",
              modifiers: [],
              unitPrice: it.unitPrice,
            }))
          );
        }
      })
      .catch(() => {});
  }, [table.id, setCart]);

  const filtered = menu.filter((m) => {
    if (search) {
      return m.name.toLowerCase().includes(search.toLowerCase());
    }
    return m.category === category;
  });

  const cartTotal = cart.reduce((s, l) => s + l.unitPrice * l.quantity, 0);
  const cartCount = cart.reduce((s, l) => s + l.quantity, 0);

  const addLine = (item: MenuItem, quantity: number, note: string) => {
    const lineId = `line_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    setCart([...cart, { lineId, menuItem: item, quantity, note, modifiers: [], unitPrice: item.price }]);
  };

  const updateQty = (lineId: string, delta: number) => {
    setCart(
      cart
        .map((l) => (l.lineId === lineId ? { ...l, quantity: l.quantity + delta } : l))
        .filter((l) => l.quantity > 0)
    );
  };

  const removeLine = (lineId: string) => {
    setCart(cart.filter((l) => l.lineId !== lineId));
  };

  const sendToKitchen = async () => {
    if (cart.length === 0) return;
    setSending(true);
    try {
      // 1. Shrani naročilo
      const orderRes = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-operator-pin": localStorage.getItem("waiter-pin") || "",
        },
        body: JSON.stringify({
          tableId: table.id,
          items: cart.map((l) => ({
            menuItemId: l.menuItem.id,
            quantity: l.quantity,
            note: l.note || undefined,
            unitPrice: l.unitPrice,
          })),
        }),
      });
      if (!orderRes.ok) throw new Error("Napaka pri shranjevanju");
      const order: Order = await orderRes.json();

      // 2. Pošlji v kuhinjo
      await fetch(`/api/orders/${order.id}/send-to-kitchen`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-operator-pin": localStorage.getItem("waiter-pin") || "",
        },
      });

      toast.success(`Naročilo poslano v kuhinjo (miza ${table.name})`, {
        description: `${cartCount} postavk · ${formatEUR(cartTotal)}`,
      });
      onSent();
    } catch (e) {
      console.error(e);
      toast.error("Napaka pri pošiljanju v kuhinjo");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col">
      {/* Header s povzetkom mize */}
      <div className="sticky top-[60px] z-20 border-b bg-card px-4 py-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <p className="text-xs text-muted-foreground">Miza</p>
            <p className="font-bold leading-tight">
              {table.name} <span className="text-muted-foreground">#{table.number}</span>
            </p>
          </div>
          {cart.length > 0 && (
            <Button onClick={() => setCartOpen(true)} variant="outline" size="sm">
              <ShoppingCart className="mr-1.5 h-4 w-4" />
              {cartCount}
            </Button>
          )}
        </div>
      </div>

      {/* Iskanje */}
      <div className="px-4 pt-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Išči jed..."
            className="pl-9"
          />
        </div>
      </div>

      {/* Kategorije (horizontal scroll) */}
      {!search && (
        <div className="flex gap-2 overflow-x-auto px-4 py-3">
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              onClick={() => setCategory(c.id)}
              className={`flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                category === c.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              <span>{c.icon}</span>
              {c.label}
            </button>
          ))}
        </div>
      )}

      {/* Lista menija */}
      <div className="grid grid-cols-1 gap-2 p-4 sm:grid-cols-2">
        {filtered.map((item) => (
          <button
            key={item.id}
            onClick={() => setSelectedItem(item)}
            className="flex items-center justify-between rounded-xl border bg-card p-3 text-left transition-all active:scale-98 hover:border-primary/50"
          >
            <div className="flex-1 pr-2">
              <p className="font-medium leading-tight">{item.name}</p>
              {item.desc && (
                <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                  {item.desc}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-primary">{formatEUR(item.price)}</span>
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Plus className="h-4 w-4" />
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Floating "Pošlji v kuhinjo" gumb */}
      {cart.length > 0 && (
        <div className="sticky bottom-16 z-20 mx-4 mb-4">
          <Button
            onClick={sendToKitchen}
            disabled={sending}
            className="w-full"
            size="lg"
          >
            <Send className="mr-2 h-4 w-4" />
            {sending ? "Pošiljam..." : `Pošlji v kuhinjo · ${formatEUR(cartTotal)}`}
          </Button>
        </div>
      )}

      {/* Modal za izbiro item-a */}
      {selectedItem && (
        <ItemModal
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
          onAdd={(quantity, note) => {
            addLine(selectedItem, quantity, note);
            toast.success(`${selectedItem.name} dodan`);
            setSelectedItem(null);
          }}
        />
      )}

      {/* Cart drawer */}
      {cartOpen && (
        <CartDrawer
          cart={cart}
          onClose={() => setCartOpen(false)}
          onUpdateQty={updateQty}
          onRemove={removeLine}
          onSend={sendToKitchen}
          sending={sending}
          table={table}
        />
      )}
    </div>
  );
}

// ============================================================
// Item Modal (quantity + note)
// ============================================================

function ItemModal({
  item,
  onClose,
  onAdd,
}: {
  item: MenuItem;
  onClose: () => void;
  onAdd: (quantity: number, note: string) => void;
}) {
  const [quantity, setQuantity] = useState(1);
  const [note, setNote] = useState("");

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="mx-4 max-w-md">
        <DialogHeader>
          <DialogTitle>{item.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="rounded-lg bg-muted p-3 text-sm">
            <p className="font-semibold text-primary">{formatEUR(item.price)}</p>
            {item.desc && <p className="mt-1 text-muted-foreground">{item.desc}</p>}
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">Količina</label>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <span className="min-w-12 text-center text-xl font-bold">{quantity}</span>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setQuantity(quantity + 1)}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">Opomba (opcijsko)</label>
            <Input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="npr. brez čebule, dobro pečena..."
            />
          </div>

          <p className="text-sm text-muted-foreground">
            Skupaj: <span className="font-bold text-foreground">{formatEUR(item.price * quantity)}</span>
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Prekliči
          </Button>
          <Button onClick={() => onAdd(quantity, note)}>
            <Plus className="mr-1.5 h-4 w-4" />
            Dodaj v naročilo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================
// Cart Drawer
// ============================================================

function CartDrawer({
  cart,
  onClose,
  onUpdateQty,
  onRemove,
  onSend,
  sending,
  table,
}: {
  cart: WaiterCartLine[];
  onClose: () => void;
  onUpdateQty: (lineId: string, delta: number) => void;
  onRemove: (lineId: string) => void;
  onSend: () => void;
  sending: boolean;
  table: Table;
}) {
  const total = cart.reduce((s, l) => s + l.unitPrice * l.quantity, 0);

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="mx-4 max-h-[85vh] max-w-md overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Naročilo — {table.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          {cart.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">Voziček je prazen</p>
          ) : (
            cart.map((line) => (
              <div
                key={line.lineId}
                className="flex items-start gap-2 rounded-lg border p-2"
              >
                <div className="flex-1">
                  <p className="font-medium">{line.menuItem.name}</p>
                  {line.note && (
                    <p className="text-xs italic text-muted-foreground">📝 {line.note}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {formatEUR(line.unitPrice)} × {line.quantity} ={" "}
                    <span className="font-semibold text-foreground">
                      {formatEUR(line.unitPrice * line.quantity)}
                    </span>
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => onUpdateQty(line.lineId, -1)}
                  >
                    <Minus className="h-3 w-3" />
                  </Button>
                  <span className="min-w-6 text-center text-sm font-bold">
                    {line.quantity}
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => onUpdateQty(line.lineId, 1)}
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive"
                    onClick={() => onRemove(line.lineId)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
        {cart.length > 0 && (
          <div className="border-t pt-3">
            <div className="flex justify-between font-bold">
              <span>Skupaj</span>
              <span className="text-primary">{formatEUR(total)}</span>
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Zapri
          </Button>
          {cart.length > 0 && (
            <Button onClick={onSend} disabled={sending}>
              <Send className="mr-1.5 h-4 w-4" />
              {sending ? "Pošiljam..." : "Pošlji v kuhinjo"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================
// Waiter Orders View
// ============================================================

function WaiterOrders({ operator }: { operator: Operator }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/orders?status=open");
      const data: Order[] = await res.json();
      // Filtriraj: samo naročila od tega operaterja (po imenu)
      setOrders(data.filter((o) => o.operator === operator.name));
    } catch {
      toast.error("Napaka pri nalaganju naročil");
    } finally {
      setLoading(false);
    }
  }, [operator.name]);

  useEffect(() => {
    load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, [load]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-muted-foreground">Nalagam naročila...</div>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="flex h-64 flex-col items-center justify-center p-6 text-center">
        <ClipboardList className="mb-3 h-12 w-12 text-muted-foreground" />
        <p className="font-medium">Ni aktivnih naročil</p>
        <p className="text-sm text-muted-foreground">
          Izberi mizo in ustvari novo naročilo
        </p>
      </div>
    );
  }

  return (
    <div className="p-4">
      <h2 className="mb-4 text-lg font-bold">Moja naročila</h2>
      <div className="space-y-3">
        {orders.map((order) => {
          const minutesAgo = Math.floor(
            (Date.now() - new Date(order.createdAt).getTime()) / 60000
          );
          return (
            <div key={order.id} className="rounded-2xl border bg-card p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-bold">{order.table.name}</p>
                  <p className="text-xs text-muted-foreground">
                    #{order.table.number} · pred {minutesAgo} min
                  </p>
                </div>
                <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                  {order.items.length} postavk
                </span>
              </div>

              <div className="mt-3 space-y-1 border-t pt-3">
                {order.items.slice(0, 4).map((it) => (
                  <div key={it.id} className="flex justify-between text-sm">
                    <span>
                      <span className="font-medium">{it.quantity}×</span> {it.menuItem.name}
                      {it.note && (
                        <span className="ml-1 text-xs italic text-muted-foreground">
                          ({it.note})
                        </span>
                      )}
                    </span>
                  </div>
                ))}
                {order.items.length > 4 && (
                  <p className="text-xs text-muted-foreground">
                    +{order.items.length - 4} več...
                  </p>
                )}
              </div>

              <div className="mt-3 flex items-center justify-between border-t pt-3">
                <span className="font-bold text-primary">{formatEUR(order.total)}</span>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  V pripravi
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
