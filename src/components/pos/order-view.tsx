"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFetch } from "@/hooks/use-fetch";
import { usePosStore } from "@/stores/pos-store";
import { updateCDU, clearCDU } from "@/lib/cdu-sync";
import {
  CATEGORIES,
  formatEUR,
  formatTime,
  type MenuItem,
  type Order,
  type Table,
} from "@/lib/types";
import { cn } from "@/lib/utils";
import { formatSecondaryCurrency } from "@/lib/multi-currency";
import { ALLERGEN_INFO, ALLERGEN_KEYS, parseAllergens } from "@/lib/allergens";
import { CustomerLookup } from "@/components/pos/customer-lookup";
import { OrderFlagsManager } from "@/components/pos/order-flags";
import { useCartPersistence } from "@/hooks/use-cart-persistence";
import { toUserFriendlyError } from "@/lib/errors";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
  Star,
  RotateCcw,
  Ban,
  Clock3,
  ShieldAlert,
  X,
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
    discountPercent,
    setDiscountPercent,
    displayCurrency,
  } = usePosStore();

  // Modifier dialog state
  const [modifierItem, setModifierItem] = useState<MenuItem | null>(null);
  const [modifierOpen, setModifierOpen] = useState(false);

  const { data: tables, refetch: refetchTables } = useFetch<TableWithOrders[]>("/api/tables");
  const { data: menu, loading: menuLoading } = useFetch<MenuItem[]>("/api/menu");
  const { data: happyHourPrices } = useFetch<{
    active: boolean;
    items: { id: string; originalPrice: number; discountedPrice: number; discountAmount: number; hasDiscount: boolean; happyHourName?: string }[];
    happyHours: { name: string; startTime: string; endTime: string; discountType: string; discountValue: number }[];
  }>("/api/happy-hours/active-prices");

  // Happy Hour price map
  const happyHourMap = useMemo(() => {
    const map = new Map<string, { discountedPrice: number; discountAmount: number; hasDiscount: boolean }>();
    if (happyHourPrices?.items) {
      for (const item of happyHourPrices.items) {
        if (item.hasDiscount) {
          map.set(item.id, {
            discountedPrice: item.discountedPrice,
            discountAmount: item.discountAmount,
            hasDiscount: true,
          });
        }
      }
    }
    return map;
  }, [happyHourPrices]);

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

  // Offline cart persistence — osnutek košarice preživi reload
  useCartPersistence(cart, selectedTableId, (restoredCart) => {
    if (restoredCart.length > 0 && cart.length === 0 && !openOrder) {
      toast.info("Osnutek košarice obnovljen", {
        description: `${restoredCart.length} postavk najdenih iz prejšnje seje`,
        duration: 3000,
      });
    }
  });

  const [saving, setSaving] = useState(false);
  const [sendingKitchen, setSendingKitchen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [transferTarget, setTransferTarget] = useState<string>("");
  const [transferring, setTransferring] = useState(false);
  const [specialFilter, setSpecialFilter] = useState<"none" | "favorite" | "daily">("none");
  const [excludedAllergens, setExcludedAllergens] = useState<string[]>([]);
  const [allergenFilterOpen, setAllergenFilterOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<{ id: string; name: string; points: number; totalSpent: number; visitCount: number } | null>(null);

  // Cena postavke z modifierji (za prikaz v vozičku)
  function lineUnitPrice(c: (CartItem & { lineId: string })): number {
    const modDelta = (c.modifiers || []).reduce((s, m) => s + m.priceDelta, 0);
    return c.menuItem.price + modDelta;
  }

  const filteredMenu = useMemo(() => {
    if (!menu) return [];
    let items = menu.filter((m) => m.available);
    // Filter priljubljene/dnevno
    if (specialFilter === "favorite") {
      items = items.filter((m) => m.isFavorite);
    } else if (specialFilter === "daily") {
      items = items.filter((m) => m.isDailySpecial);
    } else if (activeCategory !== "vse") {
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
    // Allergen filter — izključi jedi, ki vsebujejo izbrane alergene
    if (excludedAllergens.length > 0) {
      items = items.filter((m) => {
        const itemAllergens = parseAllergens(m.allergens);
        return !excludedAllergens.some((a) => itemAllergens.includes(a));
      });
    }
    return items;
  }, [menu, activeCategory, searchQuery, specialFilter, excludedAllergens]);

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

  // Popust in končna cena
  const discountAmount = (cartTotals.total * discountPercent) / 100;
  const finalTotal = cartTotals.total - discountAmount;

  // Sinhroniziraj voziček z Customer Display Unit (CDU)
  useEffect(() => {
    if (cart.length === 0) {
      clearCDU();
      return;
    }
    updateCDU({
      items: cart.map((c) => ({
        name: c.menuItem.name,
        quantity: c.quantity,
        unitPrice: c.menuItem.price,
        note: c.note,
      })),
      total: Math.round(finalTotal * 100) / 100,
      tableName: tables?.find((t) => t.id === selectedTableId)?.name,
      operator: undefined, // TODO: pridobi iz PIN login-a
    });
  }, [cart, finalTotal, selectedTableId, tables]);

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
      toast.error("Napaka pri shranjevanju", {
        description: "Preverite povezavo in poskusite znova.",
      });
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
      const friendly = toUserFriendlyError(e);
      toast.error(friendly.title, {
        description: `Pošiljanje v kuhinjo: ${friendly.description}`,
      });
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
      const friendly = toUserFriendlyError(e);
      toast.error(friendly.title, {
        description: `Preselitev mize: ${friendly.description}`,
      });
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
          {/* Quick customer lookup */}
          <div className="ml-auto hidden sm:block">
            <CustomerLookup
              selectedCustomerId={selectedCustomer?.id || null}
              onSelect={(c) => setSelectedCustomer(c)}
            />
          </div>
        </div>

        {/* Order priority flags */}
        {openOrder && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Oznake:</span>
            <OrderFlagsManager orderId={openOrder.id} />
          </div>
        )}

        {/* Happy Hour banner */}
        {happyHourPrices?.active && happyHourPrices.happyHours.length > 0 && (
          <div className="mb-3 flex items-center gap-2 rounded-lg border-2 border-amber-300 bg-amber-50 p-2 dark:border-amber-800 dark:bg-amber-950/20">
            <Clock3 className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <div className="flex-1 text-xs">
              <span className="font-bold text-amber-700 dark:text-amber-400">
                {happyHourPrices.happyHours[0].name}
              </span>
              <span className="text-amber-600 dark:text-amber-500">
                {" "}{happyHourPrices.happyHours[0].startTime}–{happyHourPrices.happyHours[0].endTime}
                {" "}−{happyHourPrices.happyHours[0].discountValue}{happyHourPrices.happyHours[0].discountType === "percent" ? "%" : "€"} popust
              </span>
            </div>
            <span className="rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold text-white">
              {happyHourPrices.discountedCount} postavk
            </span>
          </div>
        )}

        {/* Iskalnik + allergen filter */}
        <div className="relative mb-3 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Išči jed ali pijačo..."
              value={searchQuery}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Popover open={allergenFilterOpen} onOpenChange={setAllergenFilterOpen}>
            <PopoverTrigger asChild>
              <Button
                variant={excludedAllergens.length > 0 ? "default" : "outline"}
                size="icon"
                className={cn(
                  "shrink-0",
                  excludedAllergens.length > 0 && "bg-rose-600 hover:bg-rose-700"
                )}
                title="Filtriraj po alergenih"
              >
                <ShieldAlert className="h-4 w-4" />
                {excludedAllergens.length > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-bold text-white">
                    {excludedAllergens.length}
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72" align="end">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="h-4 w-4 text-rose-600" />
                    <p className="text-sm font-semibold">Alergeni</p>
                  </div>
                  {excludedAllergens.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => setExcludedAllergens([])}
                    >
                      Počisti
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Klikni alergene, ki jih gost ne sme jesti. Jedi, ki jih vsebujejo, bodo skrite.
                </p>
                <div className="grid grid-cols-2 gap-1.5">
                  {ALLERGEN_KEYS.map((key) => {
                    const info = ALLERGEN_INFO[key];
                    if (!info) return null;
                    const active = excludedAllergens.includes(key);
                    return (
                      <button
                        key={key}
                        onClick={() => {
                          setExcludedAllergens((prev) =>
                            active ? prev.filter((a) => a !== key) : [...prev, key]
                          );
                        }}
                        className={cn(
                          "flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs transition-colors",
                          active
                            ? "bg-rose-100 text-rose-700 ring-1 ring-rose-300 dark:bg-rose-950/50 dark:text-rose-400 dark:ring-rose-800"
                            : "bg-muted/50 hover:bg-muted text-muted-foreground"
                        )}
                      >
                        <span>{info.icon}</span>
                        <span className="truncate">{info.sl}</span>
                        {active && <X className="ml-auto h-3 w-3" />}
                      </button>
                    );
                  })}
                </div>
                {excludedAllergens.length > 0 && (
                  <div className="rounded-md bg-rose-50 p-2 text-xs text-rose-700 dark:bg-rose-950/30 dark:text-rose-400">
                    ⚠️ Skrite jedi, ki vsebujejo: {excludedAllergens.map((a) => ALLERGEN_INFO[a]?.sl).join(", ")}
                  </div>
                )}
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* Kategorije + priljubljene/dnevno */}
        <div className="mb-3 flex flex-wrap gap-2">
          <button
            onClick={() => {
              setCategory("vse");
              setSpecialFilter("none");
            }}
            className={cn(
              "rounded-full px-3.5 py-1.5 text-sm font-medium transition-all hover:-translate-y-0.5",
              activeCategory === "vse" && specialFilter === "none"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-muted text-muted-foreground hover:bg-muted/70 hover:text-foreground"
            )}
          >
            Vse
          </button>
          {/* Priljubljene */}
          <button
            onClick={() => setSpecialFilter("favorite")}
            className={cn(
              "flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition-all hover:-translate-y-0.5",
              specialFilter === "favorite"
                ? "bg-amber-500 text-white shadow-sm"
                : "bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-950/30 dark:text-amber-400"
            )}
          >
            <Star className="h-3.5 w-3.5" />
            Priljubljene
          </button>
          {/* Dnevna ponudba */}
          <button
            onClick={() => setSpecialFilter("daily")}
            className={cn(
              "flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition-all hover:-translate-y-0.5",
              specialFilter === "daily"
                ? "bg-rose-500 text-white shadow-sm"
                : "bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-rose-950/30 dark:text-rose-400"
            )}
          >
            <UtensilsCrossed className="h-3.5 w-3.5" />
            Dnevno
          </button>
          <div className="mx-1 my-auto h-5 w-px bg-border" />
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              onClick={() => {
                setCategory(c.id);
                setSpecialFilter("none");
              }}
              className={cn(
                "flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition-all hover:-translate-y-0.5",
                activeCategory === c.id && specialFilter === "none"
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
                <div className="mb-2 flex items-start justify-between">
                  <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-lg">
                    {m.imageUrl ? (
                      <img
                        src={m.imageUrl}
                        alt={m.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-amber-100 to-orange-100 text-lg dark:from-amber-950/40 dark:to-orange-950/40">
                        {CATEGORIES.find((c) => c.id === m.category)?.icon || "🍽️"}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-0.5">
                    {m.isFavorite && (
                      <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                    )}
                    {m.isDailySpecial && (
                      <span className="rounded bg-rose-100 px-1 text-[8px] font-bold uppercase text-rose-700 dark:bg-rose-950/50 dark:text-rose-400">
                        Dana
                      </span>
                    )}
                  </div>
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
                  <div className="flex items-center gap-1.5">
                    {happyHourMap.has(m.id) ? (
                      <>
                        <span className="text-sm font-bold text-amber-700 dark:text-amber-400">
                          {formatEUR(happyHourMap.get(m.id)!.discountedPrice)}
                        </span>
                        <span className="text-xs text-muted-foreground line-through">
                          {formatEUR(m.price)}
                        </span>
                        <span className="rounded bg-amber-100 px-1 text-[9px] font-bold text-amber-700 dark:bg-amber-950/40 dark:text-amber-400">
                          -{Math.round((happyHourMap.get(m.id)!.discountAmount / m.price) * 100)}%
                        </span>
                      </>
                    ) : (
                      <span className="text-sm font-bold text-amber-700 dark:text-amber-400">
                        {formatEUR(m.price)}
                      </span>
                    )}
                  </div>
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
                        {/* Void (hrabti) — samo ko je odprto naročilo shranjeno */}
                        {openOrder && (
                          <button
                            onClick={async () => {
                              if (!openOrder) return;
                              // Najdi OrderItem ID v bazi za to postavko
                              const orderId = openOrder.id;
                              const res = await fetch(`/api/orders/${orderId}`);
                              if (!res.ok) return;
                              const fullOrder = await res.json();
                              const dbItem = fullOrder.items.find(
                                (it: { menuItemId: string; quantity: number; note?: string | null }) =>
                                  it.menuItemId === c.menuItem.id &&
                                  it.quantity >= c.quantity
                              );
                              if (!dbItem) {
                                toast.error("Postavka ni najdena v naročilu");
                                return;
                              }
                              const voidRes = await fetch(
                                `/api/orders/${orderId}/void-item`,
                                {
                                  method: "POST",
                                  headers: authHeaders(),
                                  body: JSON.stringify({ itemId: dbItem.id }),
                                }
                              );
                              const voidData = await voidRes.json();
                              if (!voidRes.ok) {
                                toast.error(voidData.error || "Napaka");
                                return;
                              }
                              // Posodobi voziček
                              if (voidData.action === "removed") {
                                removeLine(c.lineId);
                              } else {
                                updateLineQty(c.lineId, -1);
                              }
                              toast.success(
                                voidData.action === "removed"
                                  ? "Postavka hrabtena (odstranjena)"
                                  : `Količina zmanjšana na ${voidData.newQuantity}`
                              );
                              refetchTables();
                            }}
                            className="ml-1 flex h-7 items-center justify-center gap-1 rounded-md border border-rose-200 px-2 text-[10px] font-medium text-rose-600 transition-colors hover:bg-rose-50 dark:border-rose-800 dark:text-rose-400 dark:hover:bg-rose-950/30"
                            title="Hrabti (void) — odstrani iz naročila"
                          >
                            <Ban className="h-3 w-3" />
                            Void
                          </button>
                        )}
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
            {/* Popust */}
            {discountPercent > 0 && (
              <div className="flex justify-between text-rose-600 dark:text-rose-400">
                <span>Popust ({discountPercent}%)</span>
                <span>-{formatEUR(discountAmount)}</span>
              </div>
            )}
            <Separator className="my-2" />
            <div className="flex justify-between text-base font-bold">
              <span>Za plačilo</span>
              <span className="text-amber-700 dark:text-amber-400">
                {formatEUR(finalTotal)}
              </span>
            </div>
            {displayCurrency !== "EUR" && finalTotal > 0 && (
              <div className="flex justify-end text-xs text-muted-foreground">
                {formatSecondaryCurrency(finalTotal, displayCurrency)}
              </div>
            )}
          </div>

          {/* Popust gumb */}
          <div className="mt-2 flex items-center gap-2">
            <Input
              type="number"
              min={0}
              max={100}
              value={discountPercent || ""}
              onChange={(e) => setDiscountPercent(Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))}
              placeholder="0"
              className="h-8 w-16 text-center"
            />
            <span className="text-xs text-muted-foreground">%</span>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs"
              onClick={() => setDiscountPercent(0)}
              disabled={discountPercent === 0}
            >
              Ponastovi
            </Button>
            <div className="ml-auto flex gap-1">
              {[5, 10, 15, 20].map((p) => (
                <Button
                  key={p}
                  variant={discountPercent === p ? "default" : "outline"}
                  size="sm"
                  className="h-8 px-2 text-xs"
                  onClick={() => setDiscountPercent(p)}
                >
                  {p}%
                </Button>
              ))}
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

          {/* Ponovi zadnje naročilo */}
          {cart.length === 0 && (
            <button
              onClick={async () => {
                try {
                  const res = await fetch("/api/orders/last");
                  const data = await res.json();
                  if (!data.order) {
                    toast.info("Ni prejšnjih naročil");
                    return;
                  }
                  // Dodaj vse postavke v voziček
                  for (const it of data.order.items) {
                    if (it.available) {
                      addCartItem(
                        {
                          id: it.menuItemId,
                          name: it.name,
                          category: "glavne_jedi", // fallback
                          price: it.unitPrice,
                          vatRate: 0.095, // fallback
                          available: true,
                          createdAt: "",
                        } as MenuItem,
                        it.quantity
                      );
                    }
                  }
                  toast.success(`Ponovljeno: ${data.order.tableName} (${data.order.items.length} postavk)`);
                } catch {
                  toast.error("Napaka pri ponavljanju naročila");
                }
              }}
              className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-md border border-sky-200 bg-sky-50 py-1.5 text-xs font-medium text-sky-700 transition-colors hover:bg-sky-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:border-sky-800 dark:bg-sky-950/30 dark:text-sky-400 dark:hover:bg-sky-900/30"
            >
              <RotateCcw className="h-3 w-3" />
              Ponovi zadnje naročilo
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
