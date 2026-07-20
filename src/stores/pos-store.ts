import { create } from "zustand";
import type { CartItem, MenuItem, Modifier } from "@/lib/types";

// Helper: generira unikaten lineId za cart postavko
function genLineId(): string {
  return `line_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// Helper: ključ za grupiranje (isti menuItem + isti modifierji + isti note = ista postavka)
function cartItemKey(
  item: MenuItem,
  modifiers: Modifier[],
  note: string
): string {
  const modIds = modifiers.map((m) => m.id).sort().join(",");
  return `${item.id}|${modIds}|${note}`;
}

interface PosState {
  // Navigation
  activeView:
    | "tables"
    | "order"
    | "receipts"
    | "kitchen"
    | "menu"
    | "reservations"
    | "shift"
    | "dashboard"
    | "monthly"
    | "weekly"
    | "zreport"
    | "settings"
    | "operators"
    | "tables-admin"
    | "inventory"
    | "customers"
    | "gift-cards"
    | "scheduling"
    | "menu-engineering"
    | "benchmark"
    | "waste"
    | "happy-hour"
    | "wolt"
    | "forecast"
    | "combos"
    | "accounting"
    | "deliverect"
    | "opentable"
    | "images"
    | "performance"
    | "customer-analytics"
    | "feedback"
    | "waitlist"
    | "suppliers"
    | "cash-drawer"
    | "purchase-orders"
    | "cost-analysis"
    | "allergen-matrix"
    | "daily-specials"
    | "ddv-report"
    | "furs-audit"
    | "equipment"
    | "recipe-scaling"
    | "tax-free"
    | "staff-meals"
    | "stock-transfers"
    | "loyalty-tiers"
    | "mobile-orders"
    | "energy"
    | "gift-card-analytics"
    | "feedback-dashboard";
  setActiveView: (
    v:
      | "tables"
      | "order"
      | "receipts"
      | "kitchen"
      | "menu"
      | "reservations"
      | "shift"
      | "dashboard"
      | "monthly"
      | "weekly"
      | "zreport"
      | "settings"
      | "operators"
      | "tables-admin"
      | "inventory"
      | "customers"
      | "gift-cards"
      | "scheduling"
      | "menu-engineering"
      | "benchmark"
      | "waste"
      | "happy-hour"
      | "wolt"
      | "forecast"
      | "combos"
      | "accounting"
      | "deliverect"
      | "opentable"
      | "images"
      | "performance"
      | "customer-analytics"
      | "feedback"
      | "waitlist"
      | "suppliers"
      | "cash-drawer"
      | "purchase-orders"
      | "cost-analysis"
      | "allergen-matrix"
      | "daily-specials"
      | "ddv-report"
      | "furs-audit"
      | "equipment"
      | "recipe-scaling"
      | "tax-free"
      | "staff-meals"
      | "stock-transfers"
      | "loyalty-tiers"
      | "mobile-orders"
      | "energy"
      | "gift-card-analytics"
      | "feedback-dashboard"
  ) => void;

  // Selected table
  selectedTableId: string | null;
  selectTable: (id: string | null) => void;

  // Menu filter
  activeCategory: string;
  searchQuery: string;
  setCategory: (c: string) => void;
  setSearch: (q: string) => void;

  // Cart (draft order for selected table) — vsaka postavka ima lineId za pravilno delo z modifierji
  cart: (CartItem & { lineId: string })[];
  addCartItem: (
    item: MenuItem,
    quantity?: number,
    modifiers?: Modifier[],
    note?: string
  ) => void;
  updateLineQty: (lineId: string, delta: number) => void;
  removeLine: (lineId: string) => void;
  clearCart: () => void;
  loadCartFromOrder: (items: CartItem[]) => void;

  // Payment dialog
  paymentOpen: boolean;
  setPaymentOpen: (open: boolean) => void;

  // Discount
  discountPercent: number;
  setDiscountPercent: (p: number) => void;

  // Sidebar collapsed (desktop)
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;

  // Multi-currency display (turisti)
  displayCurrency: "EUR" | "HRK" | "USD";
  setDisplayCurrency: (c: "EUR" | "HRK" | "USD") => void;
}

export const usePosStore = create<PosState>((set) => ({
  activeView: "tables",
  setActiveView: (v) => set({ activeView: v }),

  selectedTableId: null,
  selectTable: (id) =>
    set({
      selectedTableId: id,
      cart: [],
      activeView: id ? "order" : "tables",
    }),

  activeCategory: "glavne_jedi",
  searchQuery: "",
  setCategory: (c) => set({ activeCategory: c, searchQuery: "" }),
  setSearch: (q) => set({ searchQuery: q }),

  cart: [],

  addCartItem: (item, quantity = 1, modifiers = [], note = "") =>
    set((s) => {
      const key = cartItemKey(item, modifiers, note);
      const existing = s.cart.find(
        (c) =>
          cartItemKey(c.menuItem, c.modifiers || [], c.note || "") === key
      );
      if (existing) {
        return {
          cart: s.cart.map((c) =>
            c.lineId === existing.lineId
              ? { ...c, quantity: c.quantity + quantity }
              : c
          ),
        };
      }
      return {
        cart: [
          ...s.cart,
          {
            lineId: genLineId(),
            menuItem: item,
            quantity,
            modifiers: modifiers.length > 0 ? modifiers : undefined,
            note: note || undefined,
          },
        ],
      };
    }),

  updateLineQty: (lineId, delta) =>
    set((s) => ({
      cart: s.cart
        .map((c) =>
          c.lineId === lineId ? { ...c, quantity: c.quantity + delta } : c
        )
        .filter((c) => c.quantity > 0),
    })),

  removeLine: (lineId) =>
    set((s) => ({ cart: s.cart.filter((c) => c.lineId !== lineId) })),

  clearCart: () => set({ cart: [] }),

  loadCartFromOrder: (items) =>
    set({
      cart: items.map((item) => ({
        lineId: genLineId(),
        menuItem: item.menuItem,
        quantity: item.quantity,
        note: item.note,
        modifiers: item.modifiers,
      })),
    }),

  paymentOpen: false,
  setPaymentOpen: (open) => set({ paymentOpen: open }),

  discountPercent: 0,
  setDiscountPercent: (p) => set({ discountPercent: Math.min(100, Math.max(0, p)) }),

  sidebarCollapsed: false,
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),

  displayCurrency: "EUR",
  setDisplayCurrency: (c) => set({ displayCurrency: c }),
}));
