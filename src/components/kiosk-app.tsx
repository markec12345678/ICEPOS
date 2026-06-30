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
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  CreditCard,
  Banknote,
  CheckCircle2,
  Search,
  ArrowLeft,
  X,
  Loader2,
  Clock,
  Receipt,
  Store,
} from "lucide-react";
import { CATEGORIES, formatEUR, type MenuItem } from "@/lib/types";

// ============================================================
// Tipi
// ============================================================

interface KioskCartLine {
  lineId: string;
  menuItem: MenuItem;
  quantity: number;
  unitPrice: number;
}

// ============================================================
// Glavna komponenta
// ============================================================

export function KioskApp() {
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [category, setCategory] = useState<string>("glavne_jedi");
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<KioskCartLine[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/menu")
      .then((r) => r.json())
      .then((items: MenuItem[]) => setMenu(items.filter((i) => i.available)))
      .catch(() => toast.error("Napaka pri nalaganju menija"));
  }, []);

  const filtered = menu.filter((m) => {
    if (search) {
      return m.name.toLowerCase().includes(search.toLowerCase());
    }
    return m.category === category;
  });

  const cartTotal = cart.reduce((s, l) => s + l.unitPrice * l.quantity, 0);
  const cartCount = cart.reduce((s, l) => s + l.quantity, 0);

  const addToCart = (item: MenuItem) => {
    const lineId = `line_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    setCart((prev) => {
      const existing = prev.find((l) => l.menuItem.id === item.id);
      if (existing) {
        return prev.map((l) =>
          l.lineId === existing.lineId
            ? { ...l, quantity: l.quantity + 1 }
            : l
        );
      }
      return [...prev, { lineId, menuItem: item, quantity: 1, unitPrice: item.price }];
    });
    toast.success(`${item.name} dodan`, { duration: 1500 });
  };

  const updateQty = (lineId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((l) =>
          l.lineId === lineId ? { ...l, quantity: l.quantity + delta } : l
        )
        .filter((l) => l.quantity > 0)
    );
  };

  const removeLine = (lineId: string) => {
    setCart((prev) => prev.filter((l) => l.lineId !== lineId));
  };

  const clearCart = () => setCart([]);

  const checkout = async (paymentMethod: "cash" | "card") => {
    if (cart.length === 0) return;
    setProcessing(true);
    try {
      // 1. Ustvari naročilo (virtualna KIOSK miza)
      const orderRes = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tableNumber: "999", // KIOSK virtualna miza
          items: cart.map((l) => ({
            menuItemId: l.menuItem.id,
            quantity: l.quantity,
            unitPrice: l.unitPrice,
            note: "[KIOSK]",
          })),
        }),
      });
      if (!orderRes.ok) {
        const data = await orderRes.json();
        // Če miza 999 ne obstaja, poskusi z guest endpoint
        if (data.error?.includes("Miza")) {
          const guestRes = await fetch("/api/orders/guest", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              items: cart.map((l) => ({
                menuItemId: l.menuItem.id,
                quantity: l.quantity,
                note: "[KIOSK]",
              })),
              customerName: "Kiosk gost",
            }),
          });
          if (!guestRes.ok) throw new Error("Napaka pri naročilu");
          const guestData = await guestRes.json();
          setOrderId(guestData.orderId);
        } else {
          throw new Error(data.error || "Napaka");
        }
      } else {
        const order = await orderRes.json();
        // 2. Plačaj
        const payRes = await fetch(`/api/orders/${order.id}/pay`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ paymentMethod }),
        });
        if (!payRes.ok) throw new Error("Napaka pri plačilu");
        setOrderId(order.id);
      }

      toast.success("Naročilo uspešno!");
      clearCart();
      setCheckoutOpen(false);
    } catch (e) {
      toast.error((e as Error).message || "Napaka");
    } finally {
      setProcessing(false);
    }
  };

  // Success screen
  if (orderId) {
    return (
      <>
        <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-emerald-50 to-background p-6">
          <div className="w-full max-w-md text-center">
            <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950">
              <CheckCircle2 className="h-14 w-14 text-emerald-600" />
            </div>
            <h1 className="text-3xl font-bold text-emerald-700 dark:text-emerald-400">
              Hvala za naročilo!
            </h1>
            <p className="mt-3 text-lg text-muted-foreground">
              Vaše naročilo je bilo uspešno oddano.
            </p>
            <div className="mt-6 rounded-xl border bg-card p-4">
              <p className="text-xs text-muted-foreground">ID naročila</p>
              <p className="font-mono text-lg font-bold">
                #{orderId.slice(-6).toUpperCase()}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                Sledite statusu na: /sledi/{orderId}
              </p>
            </div>
            <Button
              className="mt-6 w-full"
              size="lg"
              onClick={() => {
                setOrderId(null);
                setCategory("glavne_jedi");
              }}
            >
              Novo naročilo
            </Button>
          </div>
        </div>
        <Toaster richColors position="top-center" />
      </>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b bg-card shadow-sm">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 text-white">
              <Store className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold">Samopostrežni kiosk</h1>
              <p className="text-xs text-muted-foreground">Gostilna Pri Marku</p>
            </div>
          </div>
          <Button
            size="lg"
            className="gap-2 px-6"
            disabled={cart.length === 0}
            onClick={() => setCheckoutOpen(true)}
          >
            <ShoppingCart className="h-5 w-5" />
            {cartCount} · {formatEUR(cartTotal)}
          </Button>
        </div>

        {/* Iskanje */}
        <div className="px-4 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Išči jed..."
              className="h-12 pl-11 text-base"
            />
          </div>
        </div>

        {/* Kategorije */}
        {!search && (
          <div className="flex gap-2 overflow-x-auto px-4 pb-3">
            {CATEGORIES.map((c) => (
              <button
                key={c.id}
                onClick={() => setCategory(c.id)}
                className={`flex shrink-0 items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium transition-all ${
                  category === c.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                <span className="text-lg">{c.icon}</span>
                {c.label}
              </button>
            ))}
          </div>
        )}
      </header>

      {/* Menu grid — touch friendly */}
      <main className="flex-1 overflow-y-auto p-4 pb-24">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((item) => (
            <button
              key={item.id}
              onClick={() => addToCart(item)}
              className="flex items-center justify-between rounded-2xl border-2 bg-card p-4 text-left transition-all active:scale-98 hover:border-primary"
            >
              <div className="flex-1 pr-3">
                <p className="text-base font-semibold leading-tight">{item.name}</p>
                {item.desc && (
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                    {item.desc}
                  </p>
                )}
                <p className="mt-2 text-lg font-bold text-primary">
                  {formatEUR(item.price)}
                </p>
              </div>
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Plus className="h-6 w-6" />
              </div>
            </button>
          ))}
        </div>
      </main>

      {/* Floating cart button (mobile) */}
      {cart.length > 0 && (
        <div className="fixed bottom-4 left-4 right-4 z-20">
          <Button
            size="lg"
            className="w-full gap-2 py-6 text-base shadow-lg"
            onClick={() => setCartOpen(true)}
          >
            <ShoppingCart className="h-5 w-5" />
            {cartCount} postavk · {formatEUR(cartTotal)}
            <span className="ml-2">→</span>
          </Button>
        </div>
      )}

      {/* Cart drawer */}
      {cartOpen && (
        <CartDrawer
          cart={cart}
          onClose={() => setCartOpen(false)}
          onUpdateQty={updateQty}
          onRemove={removeLine}
          onClear={clearCart}
          onCheckout={() => {
            setCartOpen(false);
            setCheckoutOpen(true);
          }}
        />
      )}

      {/* Checkout dialog */}
      <CheckoutDialog
        open={checkoutOpen}
        onOpenChange={setCheckoutOpen}
        cart={cart}
        total={cartTotal}
        onPay={checkout}
        processing={processing}
      />

      <Toaster richColors position="top-center" />
    </div>
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
  onClear,
  onCheckout,
}: {
  cart: KioskCartLine[];
  onClose: () => void;
  onUpdateQty: (lineId: string, delta: number) => void;
  onRemove: (lineId: string) => void;
  onClear: () => void;
  onCheckout: () => void;
}) {
  const total = cart.reduce((s, l) => s + l.unitPrice * l.quantity, 0);

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="mx-4 max-h-[85vh] max-w-md overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Vaše naročilo</span>
            <Button variant="ghost" size="sm" onClick={onClear}>
              <Trash2 className="mr-1 h-3 w-3" />
              Počisti
            </Button>
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          {cart.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">
              Voziček je prazen
            </p>
          ) : (
            cart.map((line) => (
              <div
                key={line.lineId}
                className="flex items-start gap-2 rounded-xl border p-3"
              >
                <div className="flex-1">
                  <p className="font-medium">{line.menuItem.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatEUR(line.unitPrice)} × {line.quantity} ={" "}
                    <span className="font-bold text-foreground">
                      {formatEUR(line.unitPrice * line.quantity)}
                    </span>
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-9 w-9"
                    onClick={() => onUpdateQty(line.lineId, -1)}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="min-w-8 text-center font-bold">
                    {line.quantity}
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-9 w-9"
                    onClick={() => onUpdateQty(line.lineId, 1)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 text-destructive"
                    onClick={() => onRemove(line.lineId)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
        {cart.length > 0 && (
          <div className="border-t pt-3">
            <div className="flex justify-between text-lg font-bold">
              <span>Skupaj</span>
              <span className="text-primary">{formatEUR(total)}</span>
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Nadaljuj nakup
          </Button>
          {cart.length > 0 && (
            <Button size="lg" onClick={onCheckout} className="gap-2">
              <Receipt className="h-4 w-4" />
              Plačaj {formatEUR(total)}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================
// Checkout Dialog
// ============================================================

function CheckoutDialog({
  open,
  onOpenChange,
  cart,
  total,
  onPay,
  processing,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  cart: KioskCartLine[];
  total: number;
  onPay: (method: "cash" | "card") => void;
  processing: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="mx-4 max-w-md">
        <DialogHeader>
          <DialogTitle>Zaključi naročilo</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="rounded-xl bg-muted p-4 text-center">
            <p className="text-sm text-muted-foreground">Skupaj za plačilo</p>
            <p className="text-4xl font-bold text-primary">{formatEUR(total)}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {cart.reduce((s, l) => s + l.quantity, 0)} postavk
            </p>
          </div>

          <div>
            <p className="mb-3 text-sm font-medium">Izberi način plačila:</p>
            <div className="grid grid-cols-2 gap-3">
              <Button
                size="lg"
                variant="outline"
                className="h-24 flex-col gap-2"
                onClick={() => onPay("cash")}
                disabled={processing}
              >
                {processing ? (
                  <Loader2 className="h-8 w-8 animate-spin" />
                ) : (
                  <Banknote className="h-8 w-8" />
                )}
                <span className="text-base font-medium">Gotovina</span>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="h-24 flex-col gap-2"
                onClick={() => onPay("card")}
                disabled={processing}
              >
                {processing ? (
                  <Loader2 className="h-8 w-8 animate-spin" />
                ) : (
                  <CreditCard className="h-8 w-8" />
                )}
                <span className="text-base font-medium">Kartica</span>
              </Button>
            </div>
          </div>

          {processing && (
            <div className="rounded-lg bg-amber-50 p-3 text-center text-sm text-amber-700 dark:bg-amber-950/30 dark:text-amber-400">
              <Clock className="mr-1.5 inline h-4 w-4" />
              Obdelujem plačilo...
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={processing}>
            Nazaj
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
