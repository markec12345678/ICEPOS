"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFetch } from "@/hooks/use-fetch";
import { usePosStore } from "@/stores/pos-store";
import {
  CATEGORIES,
  formatEUR,
  formatTime,
  type MenuItem,
  type Order,
  type Table,
} from "@/lib/types";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  ArrowLeft,
  Search,
  Plus,
  Minus,
  Trash2,
  Receipt,
  Users,
  Save,
  Printer,
  ShoppingCart,
} from "lucide-react";

type TableWithOrders = Table & {
  orders: (Order & { items: { id: string; menuItem: MenuItem; quantity: number; unitPrice: number; vatRate: number; note?: string | null }[] })[];
};

export function OrderView() {
  const {
    selectedTableId,
    selectTable,
    activeCategory,
    setCategory,
    searchQuery,
    setSearch,
    cart,
    addToCart,
    incrementQty,
    decrementQty,
    removeFromCart,
    clearCart,
    loadCartFromOrder,
    setPaymentOpen,
  } = usePosStore();

  const { data: tables, refetch: refetchTables } = useFetch<TableWithOrders[]>("/api/tables");
  const { data: menu, loading: menuLoading } = useFetch<MenuItem[]>("/api/menu");

  const selectedTable = tables?.find((t) => t.id === selectedTableId);
  const openOrder = selectedTable?.orders.find((o) => o.status === "open");

  // Ko izberemo mizo z odprtim naročilom, enkrat naložimo postavke v voziček
  const loadedOrderId = useRef<string | null>(null);
  useEffect(() => {
    if (openOrder && loadedOrderId.current !== openOrder.id) {
      loadedOrderId.current = openOrder.id;
      loadCartFromOrder(
        openOrder.items.map((it) => ({
          menuItem: it.menuItem,
          quantity: it.quantity,
          note: it.note || undefined,
        }))
      );
    }
    if (!openOrder && selectedTableId) {
      loadedOrderId.current = null;
    }
  }, [selectedTableId, openOrder, loadCartFromOrder]);

  const [saving, setSaving] = useState(false);

  const filteredMenu = useMemo(() => {
    if (!menu) return [];
    let items = menu.filter((m) => m.available);
    if (activeCategory !== "vse") {
      items = items.filter((m) => m.category === activeCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      items = items.filter(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          (m.desc || "").toLowerCase().includes(q)
      );
    }
    return items;
  }, [menu, activeCategory, searchQuery]);

  const cartTotals = useMemo(() => {
    const subtotal = cart.reduce(
      (s, c) => s + c.menuItem.price * c.quantity,
      0
    );
    const vat = cart.reduce(
      (s, c) => s + c.menuItem.price * c.quantity * c.menuItem.vatRate,
      0
    );
    const total = subtotal;
    return { subtotal, vat, total };
  }, [cart]);

  const cartCount = cart.reduce((s, c) => s + c.quantity, 0);

  async function handleSave() {
    if (!selectedTableId || cart.length === 0) {
      toast.error("Voziček je prazen");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tableId: selectedTableId,
          items: cart.map((c) => ({
            menuItemId: c.menuItem.id,
            quantity: c.quantity,
            note: c.note,
          })),
        }),
      });
      if (!res.ok) throw new Error("Napaka");
      const saved = (await res.json()) as Order;
      toast.success(`Naročilo shranjeno za ${selectedTable?.name}`, {
        description: `${cartCount} postavk &middot; ${formatEUR(cartTotals.total)}`,
      });
      refetchTables();
      return saved;
    } catch {
      toast.error("Napaka pri shranjevanju naročila");
      return null;
    } finally {
      setSaving(false);
    }
  }

  async function handlePay() {
    const saved = await handleSave();
    if (saved) {
      setPaymentOpen(true);
    }
  }

  if (!selectedTableId || !selectedTable) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
        <ShoppingCart className="h-12 w-12 text-muted-foreground/50" />
        <p className="text-sm text-muted-foreground">
          Najprej izberite mizo na zavihku &laquo;Mize&raquo;.
        </p>
        <Button variant="outline" onClick={() => selectTable(null)}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Nazaj na mize
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 lg:flex-row">
      {/* LEVO: Meni */}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="mb-3 flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => selectTable(null)}
            className="shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Mize</span>
          </Button>
          <Separator orientation="vertical" className="h-6" />
          <div className="min-w-0">
            <h2 className="truncate text-lg font-bold">{selectedTable.name}</h2>
            <p className="flex items-center gap-2 text-xs text-muted-foreground">
              <Users className="h-3 w-3" />
              {selectedTable.seats} oseb
              {openOrder && (
                <>
                  <span>&middot;</span>
                  <Receipt className="h-3 w-3" />
                  Od {formatTime(openOrder.createdAt)}
                </>
              )}
            </p>
          </div>
        </div>

        {/* Iskalnik */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Išči jed ali pijačo..."
            value={searchQuery}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Kategorije */}
        <div className="mb-3 flex flex-wrap gap-2">
          <button
            onClick={() => setCategory("vse")}
            className={cn(
              "rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors",
              activeCategory === "vse"
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/70"
            )}
          >
            Vse
          </button>
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              onClick={() => setCategory(c.id)}
              className={cn(
                "flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors",
                activeCategory === c.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/70"
              )}
            >
              <span>{c.icon}</span>
              {c.label}
            </button>
          ))}
        </div>

        {/* Mreža izdelkov */}
        {menuLoading ? (
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-xl" />
            ))}
          </div>
        ) : filteredMenu.length === 0 ? (
          <div className="py-16 text-center text-sm text-muted-foreground">
            Ni najdenih postavk.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-4">
            {filteredMenu.map((m) => (
              <Card
                key={m.id}
                onClick={() => addToCart(m)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    addToCart(m);
                  }
                }}
                className="group cursor-pointer p-3 transition-all hover:-translate-y-0.5 hover:border-amber-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-amber-100 to-orange-100 text-lg dark:from-amber-950/40 dark:to-orange-950/40">
                  {CATEGORIES.find((c) => c.id === m.category)?.icon || "🍽️"}
                </div>
                <h4 className="line-clamp-2 text-sm font-semibold leading-tight">
                  {m.name}
                </h4>
                {m.desc && (
                  <p className="mt-0.5 line-clamp-1 text-[11px] text-muted-foreground">
                    {m.desc}
                  </p>
                )}
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-sm font-bold text-amber-700 dark:text-amber-400">
                    {formatEUR(m.price)}
                  </span>
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-500 text-white opacity-0 transition-opacity group-hover:opacity-100">
                    <Plus className="h-3.5 w-3.5" />
                  </span>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* DESNO: Voziček */}
      <Card className="flex h-[calc(100vh-13rem)] w-full shrink-0 flex-col lg:w-96">
        <div className="flex items-center justify-between border-b border-border p-4">
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-amber-600" />
            <h3 className="font-bold">Račun</h3>
          </div>
          <Badge variant="secondary">{cartCount} postavk</Badge>
        </div>

        {cart.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center">
            <Receipt className="h-10 w-10 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              Voziček je prazen.
            </p>
            <p className="text-xs text-muted-foreground/70">
              Kliknite jedi na levi za dodajanje.
            </p>
          </div>
        ) : (
          <ScrollArea className="flex-1">
            <div className="space-y-2 p-3">
              {cart.map((c) => (
                <div
                  key={c.menuItem.id}
                  className="rounded-lg border border-border bg-background p-2.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {c.menuItem.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatEUR(c.menuItem.price)} &middot; DDV{" "}
                        {(c.menuItem.vatRate * 100).toFixed(1)}%
                      </p>
                    </div>
                    <button
                      onClick={() => removeFromCart(c.menuItem.id)}
                      className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      aria-label="Odstrani"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => decrementQty(c.menuItem.id)}
                        className="flex h-7 w-7 items-center justify-center rounded-md border border-border hover:bg-muted"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span className="w-8 text-center text-sm font-semibold">
                        {c.quantity}
                      </span>
                      <button
                        onClick={() => incrementQty(c.menuItem.id)}
                        className="flex h-7 w-7 items-center justify-center rounded-md border border-border hover:bg-muted"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <span className="text-sm font-bold">
                      {formatEUR(c.menuItem.price * c.quantity)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}

        {/* Skupaj + akcije */}
        <div className="border-t border-border p-4">
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>Vrednost (brez DDV)</span>
              <span>{formatEUR(cartTotals.subtotal - cartTotals.vat)}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>DDV</span>
              <span>{formatEUR(cartTotals.vat)}</span>
            </div>
            <Separator className="my-2" />
            <div className="flex justify-between text-base font-bold">
              <span>Za plačilo</span>
              <span className="text-amber-700 dark:text-amber-400">
                {formatEUR(cartTotals.total)}
              </span>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              onClick={handleSave}
              disabled={saving || cart.length === 0}
            >
              <Save className="mr-1.5 h-4 w-4" />
              Shrani
            </Button>
            <Button
              onClick={handlePay}
              disabled={saving || cart.length === 0}
              className="bg-amber-600 text-white hover:bg-amber-700"
            >
              <Printer className="mr-1.5 h-4 w-4" />
              Plačaj
            </Button>
          </div>
          {cart.length > 0 && (
            <button
              onClick={() => {
                clearCart();
                toast.info("Voziček počiščen");
              }}
              className="mt-2 w-full text-center text-xs text-muted-foreground hover:text-destructive"
            >
              Počisti voziček
            </button>
          )}
        </div>
      </Card>
    </div>
  );
}
