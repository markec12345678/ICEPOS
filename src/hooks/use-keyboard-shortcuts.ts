"use client";

import { useEffect } from "react";
import { usePosStore } from "@/stores/pos-store";

/**
 * Tipkovnične bližnjice za POS:
 * - 1: Mize
 * - 2: Naročilo
 * - 3: Računi
 * - 4: Meni
 * - 5: Pregled
 * - Esc: Nazaj na mize / zapri dialog
 */
export function useKeyboardShortcuts() {
  const { activeView, setActiveView, selectTable, setPaymentOpen, paymentOpen } =
    usePosStore();

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      // Ne reagiraj ko uporabnik tipka v input/textarea
      const target = e.target as HTMLElement;
      const tag = target?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea" || target?.isContentEditable) {
        // Dovoli Esc za blur
        if (e.key === "Escape") {
          (target as HTMLElement).blur();
        }
        return;
      }

      // Esc: zapri payment dialog ali nazaj na mize
      if (e.key === "Escape") {
        if (paymentOpen) {
          setPaymentOpen(false);
          return;
        }
        if (activeView !== "tables") {
          selectTable(null);
          setActiveView("tables");
        }
        return;
      }

      // Števke 1-5 za navigacijo
      const num = parseInt(e.key, 10);
      if (num >= 1 && num <= 5) {
        const views = ["tables", "order", "receipts", "menu", "dashboard"] as const;
        setActiveView(views[num - 1]);
        return;
      }
    }

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [activeView, paymentOpen, setActiveView, selectTable, setPaymentOpen]);
}
