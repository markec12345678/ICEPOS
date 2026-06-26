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
  UtensilsCrossed,
  ChefHat,
  ArrowRightLeft,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ModifierDialog } from "@/components/pos/modifier-dialog";
import { authHeaders } from "@/components/pos/pin-login";

type TableWithOrders = Table & {
  orders: (Order & { items: { id: string; menuItem: MenuItem; quantity: number; unitPrice: number; vatRate: number; note?: string | null; modifiers?: string | null }[] })[];
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
    addCartItem,
    updateLineQty,
    removeLine,
    clearCart,
    loadCartFromOrder,
    setPaymentOpen,
  } = usePosStore();

  // Modifier dialog state
  const [modifierItem, setModifierItem] = useState<MenuItem | null>(null);
  const [modifierOpen, setModifierOpen] = useState(false);

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
        openOrder.items.map((it) => {
          // Parsaj modifierje iz JSON stringa (shranjeni v bazi)
          let modifiers: { id: string; label: string; priceDelta: number }[] | undefined;
          if (it.modifiers) {
            try {
              const parsed = JSON.parse(it.modifiers) as { label: string; priceDelta: number }[];
              modifiers = parsed.map((m, i) => ({
                id: `loaded_${i}`,
                label: m.label,
                priceDelta: m.priceDelta,
              }));
            } catch {
              // ignore parse error
            }
          }
          return {
            menuItem: it.menuItem,
            quantity: it.quantity,
            note: it.note || undefined,
            modifiers,
          };
        })
      );
    }
    if (!openOrder && selectedTableId) {
      loadedOrderId.current = null;
    }
  }, [selectedTableId, openOrder, loadCartFromOrder]);

  const [saving, setSaving] = useState(false);
  const [sendingKitchen, setSendingKitchen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [transferTarget, setTransferTarget] = useState<string>("");
  const [transferring, setTransferring] = useState(false);

  // Cena postavke z modifierji (za prikaz v vozičku)
  function lineUnitPrice(c: (CartItem & { lineId: string })): number {
    const modDelta = (c.modifiers || []).reduce((s, m) => s + m.priceDelta, 0);
    return c.menuItem.price + modDelta;
  }

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
      (s, c) => s + lineUnitPrice(c) * c.quantity,
      0
    );
    const vat = cart.reduce(
      (s, c) => s + lineUnitPrice(c) * c.quantity * c.menuItem.vatRate,
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
        headers: authHeaders(),
        body: JSON.stringify({
          tableId: selectedTableId,
          items: cart.map((c) => ({
            menuItemId: c.menuItem.id,
            quantity: c.quantity,
            note: c.note,
            modifiers: c.modifiers
              ? JSON.stringify(
                  c.modifiers.map((m) => ({
                    label: m.label,
                    priceDelta: m.priceDelta,
                  }))
                )
              : null,
            // unitPrice vključuje modifierje
            unitPrice: lineUnitPrice(c),
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

  async function handleSendToKitchen() {
    // Najprej shrani naročilo
    const saved = await handleSave();
    if (!saved) return;

    setSendingKitchen(true);
    try {
      const res = await fetch(`/api/orders/${saved.id}/send-to-kitchen`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Napaka");
      toast.success("Naročilo poslano v kuhinjo", {
        description: `${data.itemCount} postavk → Miza ${selectedTable?.name}`,
      });
    } catch (e) {
      toast.error((e as Error).message || "Napaka pri pošiljanju v kuhinjo");
    } finally {
      setSendingKitchen(false);
    }
  }

  async function handleTransfer() {
    if (!openOrder || !transferTarget) {
      toast.error("Izberi ciljno mizo");
      return;
    }
    setTransferring(true);
    try {
      const res = await fetch(`/api/orders/${openOrder.id}/transfer-table`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ targetTableId: transferTarget }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Napaka");
      toast.success(data.message);
      setTransferOpen(false);
      setTransferTarget("");
      refetchTables();
      selectTable(transferTarget);
    } catch (e) {
      toast.error((e as Error).message || "Napaka pri preselitvi");
    } finally {
      setTransferring(false);
    }
  }

  if (!selectedTableId || !selectedTable) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-20 text-center animate-fade-in">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <ShoppingCart className="h-8 w-8" />
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">
            Ni izbrane mize
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Najprej izberite mizo na zavihku &laquo;Mize&raquo;.
          </p>
        </div>
        <Button variant="outline" onClick={() => selectTable(null)}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Nazaj na mize
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 lg:flex-row animate-fade-in">
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
            <h2 className="truncate text-xl font-bold tracking-tight">{selectedTable.name}</h2>
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
              "rounded-full px-3.5 py-1.5 text-sm font-medium transition-all hover:-translate-y-0.5",
              activeCategory === "vse"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-muted text-muted-foreground hover:bg-muted/70 hover:text-foreground"
            )}
          >
            Vse
          </button>
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              onClick={() => setCategory(c.id)}
              className={cn(
                "flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition-all hover:-translate-y-0.5",
                activeCategory === c.id
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted text-muted-foreground hover:bg-muted/70 hover:text-foreground"
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
          <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-muted/20 py-16 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <UtensilsCrossed className="h-6 w-6" />
            </div>
            <p className="text-sm font-medium text-foreground">
              Ni najdenih postavk
            </p>
            <p className="text-xs text-muted-foreground">
              Poskusite spremeniti iskalni niz ali kategorijo.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-4">
            {filteredMenu.map((m) => (
              <Card
                key={m.id}
                onClick={() => {
                  setModifierItem(m);
                  setModifierOpen(true);
                }}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setModifierItem(m);
                    setModifierOpen(true);
                  }
                }}
                className="group cursor-pointer p-3 transition-all duration-200 hover:-translate-y-1 hover:border-amber-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 active:scale-[0.98] dark:hover:border-amber-700"
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
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-500 text-white opacity-0 shadow-sm transition-all duration-200 group-hover:scale-110 group-hover:opacity-100 group-focus-visible:opacity-100">
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
            <h3>Račun</h3>
          </div>
          <Badge variant="secondary">{cartCount} postavk</Badge>
        </div>

        {cart.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground/60">
              <Receipt className="h-6 w-6" />
            </div>
            <p className="text-sm font-medium text-foreground">
              Voziček je prazen
            </p>
            <p className="text-xs text-muted-foreground/70">
              Kliknite jedi na levi za dodajanje.
            </p>
          </div>
        ) : (
          <ScrollArea className="flex-1">
            <div className="space-y-2 p-3">
              {cart.map((c) => {
                const unitPrice = lineUnitPrice(c);
                const hasMods =
                  c.modifiers && c.modifiers.length > 0;
                return (
                  <div
                    key={c.lineId}
                    className="rounded-lg border border-border bg-background p-2.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {c.menuItem.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatEUR(unitPrice)}
                          {hasMods && (
                            <span className="ml-1 text-amber-600 dark:text-amber-400">
                              +dodatki
                            </span>
                          )}{" "}
                          &middot; DDV{" "}
                          {(c.menuItem.vatRate * 100).toFixed(1)}%
                        </p>
                        {/* Modifierji */}
                        {hasMods && (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {c.modifiers!.map((mod) => (
                              <Badge
                                key={mod.id}
                                variant="outline"
                                className="bg-amber-50 px-1.5 py-0 text-[10px] text-amber-700 dark:bg-amber-950/30 dark:text-amber-400"
                              >
                                {mod.label}
                                {mod.priceDelta !== 0 && (
                                  <span className="ml-0.5 font-mono">
                                    {mod.priceDelta > 0 ? "+" : ""}
                                    {mod.priceDelta.toFixed(2)}
                                  </span>
                                )}
                              </Badge>
                            ))}
                          </div>
                        )}
                        {/* Note */}
                        {c.note && (
                          <p className="mt-1 text-xs italic text-amber-700 dark:text-amber-400">
                            📝 {c.note}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => removeLine(c.lineId)}
                        className="rounded p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        aria-label="Odstrani"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => updateLineQty(c.lineId, -1)}
                          className="flex h-7 w-7 items-center justify-center rounded-md border border-border transition-colors hover:bg-muted hover:text-amber-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          aria-label="Zmanjšaj"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="w-8 text-center text-sm font-semibold">
                          {c.quantity}
                        </span>
                        <button
                          onClick={() => updateLineQty(c.lineId, 1)}
                          className="flex h-7 w-7 items-center justify-center rounded-md border border-border transition-colors hover:bg-amber-50 hover:border-amber-300 hover:text-amber-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:hover:bg-amber-950/30"
                          aria-label="Povečaj"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <span className="text-sm font-bold">
                        {formatEUR(unitPrice * c.quantity)}
                      </span>
                    </div>
                  </div>
                );
              })}
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

          {/* Kuhinja + Preseli mizo */}
          <div className="mt-2 grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSendToKitchen}
              disabled={sendingKitchen || cart.length === 0}
              className="border-sky-300 text-sky-700 hover:bg-sky-50 hover:text-sky-800 dark:border-sky-800 dark:text-sky-400 dark:hover:bg-sky-950/30"
            >
              <ChefHat className="mr-1.5 h-4 w-4" />
              {sendingKitchen ? "Pošiljam..." : "Kuhinja"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setTransferOpen(true)}
              disabled={!openOrder}
            >
              <ArrowRightLeft className="mr-1.5 h-4 w-4" />
              Preseli
            </Button>
          </div>

          {cart.length > 0 && (
            <button
              onClick={() => {
                clearCart();
                toast.info("Voziček počiščen");
              }}
              className="mt-2 w-full rounded py-1 text-center text-xs text-muted-foreground transition-colors hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Počisti voziček
            </button>
          )}
        </div>
      </Card>

      {/* Modifier dialog (odpre se ob kliku na jed) */}
      <ModifierDialog
        item={modifierItem}
        open={modifierOpen}
        onOpenChange={setModifierOpen}
        onConfirm={(item, quantity, modifiers, note) => {
          addCartItem(item, quantity, modifiers, note);
        }}
      />

      {/* Transfer mize dialog */}
      <Dialog open={transferOpen} onOpenChange={setTransferOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowRightLeft className="h-5 w-5 text-amber-600" />
              Preseli naročilo
            </DialogTitle>
            <DialogDescription>
              Preseli odprto naročilo z mize{" "}
              <strong>{selectedTable?.name}</strong> na drugo mizo.
              Ciljna miza mora biti prosta.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <label className="text-sm font-medium">Ciljna miza</label>
            <Select value={transferTarget} onValueChange={setTransferTarget}>
              <SelectTrigger>
                <SelectValue placeholder="Izberi prosto mizo..." />
              </SelectTrigger>
              <SelectContent>
                {tables
                  ?.filter(
                    (t) =>
                      t.id !== selectedTableId &&
                      !t.orders.some((o) => o.status === "open")
                  )
                  .map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name} ({t.seats} oseb)
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                setTransferOpen(false);
                setTransferTarget("");
              }}
              disabled={transferring}
            >
              Prekliči
            </Button>
            <Button
              className="flex-1 bg-amber-600 hover:bg-amber-700"
              onClick={handleTransfer}
              disabled={transferring || !transferTarget}
            >
              {transferring ? "Prešeljam..." : "Preseli"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
