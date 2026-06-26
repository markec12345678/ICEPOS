import { create } from "zustand";
import type { CartItem, MenuItem } from "@/lib/types";

interface PosState {
  // Navigation
  activeView:
    | "tables"
    | "order"
    | "receipts"
    | "menu"
    | "dashboard"
    | "zreport"
    | "settings";
  setActiveView: (
    v:
      | "tables"
      | "order"
      | "receipts"
      | "menu"
      | "dashboard"
      | "zreport"
      | "settings"
  ) => void;

  // Selected table
  selectedTableId: string | null;
  selectTable: (id: string | null) => void;

  // Menu filter
  activeCategory: string;
  searchQuery: string;
  setCategory: (c: string) => void;
  setSearch: (q: string) => void;

  // Cart (draft order for selected table)
  cart: CartItem[];
  addToCart: (item: MenuItem) => void;
  removeFromCart: (menuItemId: string) => void;
  incrementQty: (menuItemId: string) => void;
  decrementQty: (menuItemId: string) => void;
  updateNote: (menuItemId: string, note: string) => void;
  clearCart: () => void;
  loadCartFromOrder: (items: CartItem[]) => void;

  // Payment dialog
  paymentOpen: boolean;
  setPaymentOpen: (open: boolean) => void;
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
  addToCart: (item) =>
    set((s) => {
      const existing = s.cart.find((c) => c.menuItem.id === item.id);
      if (existing) {
        return {
          cart: s.cart.map((c) =>
            c.menuItem.id === item.id ? { ...c, quantity: c.quantity + 1 } : c
          ),
        };
      }
      return { cart: [...s.cart, { menuItem: item, quantity: 1 }] };
    }),
  removeFromCart: (menuItemId) =>
    set((s) => ({ cart: s.cart.filter((c) => c.menuItem.id !== menuItemId) })),
  incrementQty: (menuItemId) =>
    set((s) => ({
      cart: s.cart.map((c) =>
        c.menuItem.id === menuItemId ? { ...c, quantity: c.quantity + 1 } : c
      ),
    })),
  decrementQty: (menuItemId) =>
    set((s) => ({
      cart: s.cart
        .map((c) =>
          c.menuItem.id === menuItemId ? { ...c, quantity: c.quantity - 1 } : c
        )
        .filter((c) => c.quantity > 0),
    })),
  updateNote: (menuItemId, note) =>
    set((s) => ({
      cart: s.cart.map((c) =>
        c.menuItem.id === menuItemId ? { ...c, note } : c
      ),
    })),
  clearCart: () => set({ cart: [] }),
  loadCartFromOrder: (items) => set({ cart: items }),

  paymentOpen: false,
  setPaymentOpen: (open) => set({ paymentOpen: open }),
}));
