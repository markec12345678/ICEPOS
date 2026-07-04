"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface TenantInfo {
  id: string;
  name: string;
  slug: string;
  subdomain: string | null;
  address: string | null;
  city: string | null;
  phone: string | null;
  taxNumber: string;
  businessUnit: string;
  cashRegister: string;
}

interface TenantState {
  current: TenantInfo | null;
  list: TenantInfo[];
  setCurrent: (t: TenantInfo) => void;
  setList: (list: TenantInfo[]) => void;
  loadList: () => Promise<void>;
  headers: () => Record<string, string>;
}

export const useTenantStore = create<TenantState>()(
  persist(
    (set, get) => ({
      current: null,
      list: [],

      setCurrent: (t) => set({ current: t }),

      setList: (list) => {
        // Če ni izbranega trenutnega, izberi prvega
        const current = get().current;
        if (!current && list.length > 0) {
          set({ list, current: list[0] });
        } else {
          set({ list });
        }
      },

      loadList: async () => {
        try {
          const res = await fetch("/api/restaurants");
          const data: TenantInfo[] = await res.json();
          get().setList(data);
        } catch (e) {
          console.error("loadList error:", e);
        }
      },

      // Vrne header-je za fetch klic-e
      headers: (): Record<string, string> => {
        const current = get().current;
        if (!current) return {};
        return {
          "x-restaurant-id": current.id,
          "x-restaurant-slug": current.slug,
        };
      },
    }),
    {
      name: "tenant-storage",
      partialize: (state) => ({ current: state.current }),
    }
  )
);
