"use client";

import { useEffect, useRef } from "react";
import { usePosStore } from "@/stores/pos-store";
import { toast } from "sonner";
import { playFeedbackSound } from "@/hooks/use-sound-feedback";

/**
 * Tipkovne bližnjice za POS — hitro delo brez miške.
 *
 * NAVIGACIJA:
 * - 1-5: Mize / Naročilo / Računi / Meni / Pregled
 * - 6: Kuhinja
 * - 7: Smena
 * - 8: Zaloga
 * - 9: Stranke
 * - 0: Nastavitve
 * - Esc: Nazaj na mize / zapri dialog
 * - Tab: Naslednja miza (v TablesView)
 *
 * AKCIJE:
 * - F1: Pomoč (keyboard shortcuts)
 * - F2: Fokus na iskanje jedi (v OrderView)
 * - F9 ali P: Plačaj (odpri Payment dialog)
 * - N: Novo naročilo (najdi prosto mizo)
 * - +: Povečaj količino zadnje postavke v košarici
 * - -: Zmanjšaj količino zadnje postavke v košarici
 * - Ctrl+Enter: Shrani naročilo
 * - Ctrl+S: Pošlji v kuhinjo
 * - Ctrl+D: Dodaj popust
 * - Ctrl+Z: Počisti košarico
 * - Ctrl+K: Globalno iskanje (že implementirano v global-search.tsx)
 * - ?: Prikaži pomoč (že implementirano v keyboard-shortcuts-help.tsx)
 */
export function useKeyboardShortcuts() {
  const {
    activeView,
    setActiveView,
    selectTable,
    setPaymentOpen,
    paymentOpen,
    cart,
    updateLineQty,
    removeLine,
    clearCart,
    discountPercent,
    setDiscountPercent,
  } = usePosStore();

  const lastCartLineRef = useRef<string | null>(null);

  // Spremljaj zadnjo postavko v košarici
  useEffect(() => {
    if (cart.length > 0) {
      lastCartLineRef.current = cart[cart.length - 1].lineId;
    } else {
      lastCartLineRef.current = null;
    }
  }, [cart]);

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      // Ne reagiraj ko uporabnik tipka v input/textarea
      const target = e.target as HTMLElement;
      const tag = target?.tagName?.toLowerCase();
      const isInput = tag === "input" || tag === "textarea" || target?.isContentEditable;

      // Esc vedno deluje (tudi v inputih)
      if (e.key === "Escape") {
        if (isInput) {
          (target as HTMLElement).blur();
          return;
        }
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

      // Ctrl/Cmd kombinacije delujejo povsod
      if (e.ctrlKey || e.metaKey) {
        switch (e.key.toLowerCase()) {
          case "enter":
            // Ctrl+Enter: Shrani naročilo (simuliraj klik na shrani gumb)
            if (activeView === "order" && cart.length > 0) {
              e.preventDefault();
              const saveBtn = document.querySelector('[data-shortcut="save-order"]') as HTMLButtonElement;
              if (saveBtn) {
                saveBtn.click();
                playFeedbackSound("info");
              }
            }
            return;

          case "s":
            // Ctrl+S: Pošlji v kuhinjo
            if (activeView === "order" && cart.length > 0) {
              e.preventDefault();
              const kitchenBtn = document.querySelector('[data-shortcut="send-kitchen"]') as HTMLButtonElement;
              if (kitchenBtn) {
                kitchenBtn.click();
              }
            }
            return;

          case "d":
            // Ctrl+D: Dodaj popust (ciklus 0→5→10→15→20→0)
            if (activeView === "order") {
              e.preventDefault();
              const cycle = [0, 5, 10, 15, 20];
              const next = cycle[(cycle.indexOf(discountPercent) + 1) % cycle.length];
              setDiscountPercent(next);
              toast.info(`Popust: ${next}%`, { duration: 1500 });
            }
            return;

          case "z":
            // Ctrl+Z: Počisti košarico
            if (activeView === "order" && cart.length > 0) {
              e.preventDefault();
              clearCart();
              playFeedbackSound("warning");
              toast.info("Košarica počiščena", { duration: 1500 });
            }
            return;
        }
      }

      // Ne nadaljuj če smo v inputu
      if (isInput) return;

      // F-tipke
      switch (e.key) {
        case "F1":
          e.preventDefault();
          // Sproži ? za pomoč
          window.dispatchEvent(new KeyboardEvent("keydown", { key: "?", bubbles: true }));
          return;

        case "F2":
          // Fokus na iskanje jedi
          if (activeView === "order") {
            e.preventDefault();
            const searchInput = document.querySelector('input[placeholder*="Išči jed"]') as HTMLInputElement;
            if (searchInput) {
              searchInput.focus();
              toast.info("Iskanje jedi", { duration: 1000 });
            }
          }
          return;

        case "F9":
          // Plačaj
          if (activeView === "order" && cart.length > 0 && !paymentOpen) {
            e.preventDefault();
            setPaymentOpen(true);
            playFeedbackSound("info");
          }
          return;
      }

      // P = Plačaj (alternativa F9)
      if (e.key.toLowerCase() === "p" && !e.ctrlKey && !e.metaKey && !e.altKey) {
        if (activeView === "order" && cart.length > 0 && !paymentOpen) {
          e.preventDefault();
          setPaymentOpen(true);
          playFeedbackSound("info");
          return;
        }
      }

      // N = Novo naročilo (najdi prosto mizo)
      if (e.key.toLowerCase() === "n" && !e.ctrlKey && !e.metaKey && !e.altKey) {
        if (activeView === "tables") {
          e.preventDefault();
          const newOrderBtn = document.querySelector('[data-shortcut="new-order"]') as HTMLButtonElement;
          if (newOrderBtn) {
            newOrderBtn.click();
          }
          return;
        }
      }

      // + in - za količino zadnje postavke
      if ((e.key === "+" || e.key === "=") && activeView === "order" && lastCartLineRef.current) {
        e.preventDefault();
        updateLineQty(lastCartLineRef.current, 1);
        playFeedbackSound("info");
        return;
      }

      if ((e.key === "-" || e.key === "_") && activeView === "order" && lastCartLineRef.current) {
        e.preventDefault();
        const lineId = lastCartLineRef.current;
        const lineItem = cart.find((c) => c.lineId === lineId);
        if (lineItem && lineItem.quantity <= 1) {
          removeLine(lineId);
          toast.info("Postavka odstranjena", { duration: 1000 });
        } else {
          updateLineQty(lineId, -1);
        }
        return;
      }

      // Števke 0-9 za navigacijo
      const num = parseInt(e.key, 10);
      if (!isNaN(num)) {
        const views: Array<Parameters<typeof setActiveView>[0]> = [
          "settings", // 0
          "tables",   // 1
          "order",    // 2
          "receipts", // 3
          "menu",     // 4
          "dashboard",// 5
          "kitchen",  // 6
          "shift",    // 7
          "inventory",// 8
          "customers",// 9
        ];
        if (num < views.length) {
          setActiveView(views[num]);
          playFeedbackSound("info");
          return;
        }
      }

      // Tab v TablesView — naslednja zasedena miza
      if (e.key === "Tab" && activeView === "tables" && !e.shiftKey) {
        const tableCards = document.querySelectorAll('[data-table-card]');
        if (tableCards.length > 0) {
          e.preventDefault();
          const focused = document.activeElement;
          let nextIndex = 0;
          tableCards.forEach((card, i) => {
            if (card === focused) nextIndex = (i + 1) % tableCards.length;
          });
          (tableCards[nextIndex] as HTMLElement).focus();
          return;
        }
      }
    }

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [
    activeView,
    paymentOpen,
    cart,
    discountPercent,
    setActiveView,
    selectTable,
    setPaymentOpen,
    updateLineQty,
    removeLine,
    clearCart,
    setDiscountPercent,
  ]);
}
