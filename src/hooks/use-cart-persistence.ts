"use client";

import { useEffect, useRef } from "react";

const CART_STORAGE_KEY = "icepos_cart_draft";

/**
 * Hook za persistanco košarice (cart draft) v localStorage.
 * Ko uporabnik doda postavke v košarico, se avtomatsko shranijo.
 * Ko se stran ponovno naloži, se košarica obnovi.
 *
 * To je še posebej uporabno ko:
 * - Browser crashne
 * - Stran se po nepotrebnem reload-a
 * - Uporabnik izgubi povezavo in ponovno odpre aplikacijo
 */
export function useCartPersistence(
  cart: unknown[],
  tableId: string | null,
  onRestore: (cart: unknown[]) => void
) {
  const hasRestored = useRef(false);

  // Restore ob mount
  useEffect(() => {
    if (hasRestored.current) return;
    hasRestored.current = true;

    try {
      const raw = localStorage.getItem(CART_STORAGE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw) as { cart: unknown[]; tableId: string | null; timestamp: number };
      const ageMinutes = (Date.now() - saved.timestamp) / 60000;

      // Samo če je mlajši od 2 uri
      if (ageMinutes > 120) {
        localStorage.removeItem(CART_STORAGE_KEY);
        return;
      }

      // Samo če je za isto mizo (ali če ni izbrana miza)
      if (saved.tableId === tableId && saved.cart.length > 0) {
        onRestore(saved.cart);
      }
    } catch {
      // ignore
    }
  }, [tableId, onRestore]);

  // Save kadar se cart spremeni
  useEffect(() => {
    if (!hasRestored.current) return;
    if (cart.length === 0) {
      localStorage.removeItem(CART_STORAGE_KEY);
      return;
    }
    try {
      const entry = {
        cart,
        tableId,
        timestamp: Date.now(),
      };
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(entry));
    } catch {
      // ignore
    }
  }, [cart, tableId]);

  // Clear ko se miza spremeni na null
  useEffect(() => {
    if (tableId === null) {
      localStorage.removeItem(CART_STORAGE_KEY);
    }
  }, [tableId]);
}

/**
 * Preveri ali obstaja shranjen osnutek košarice.
 */
export function hasCartDraft(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return false;
    const saved = JSON.parse(raw) as { cart: unknown[]; timestamp: number };
    const ageMinutes = (Date.now() - saved.timestamp) / 60000;
    return saved.cart.length > 0 && ageMinutes <= 120;
  } catch {
    return false;
  }
}

/**
 * Počisti osnutek košarice.
 */
export function clearCartDraft(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(CART_STORAGE_KEY);
}
