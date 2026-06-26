"use client";

import { usePosStore } from "@/stores/pos-store";
import { cn } from "@/lib/utils";
import { LayoutGrid, ClipboardList, BarChart3, UtensilsCrossed } from "lucide-react";

export function PosFooter() {
  const { activeView, setActiveView, cart } = usePosStore();
  const cartCount = cart.reduce((s, c) => s + c.quantity, 0);

  const navItems = [
    { id: "tables" as const, label: "Mize", icon: LayoutGrid },
    { id: "order" as const, label: "Naročilo", icon: UtensilsCrossed, badge: cartCount },
    { id: "dashboard" as const, label: "Pregled", icon: BarChart3 },
  ];

  return (
    <footer className="sticky bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80 md:hidden">
      <nav className="grid grid-cols-3">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = activeView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveView(item.id)}
              className={cn(
                "flex flex-col items-center gap-1 py-2.5 text-xs font-medium transition-colors",
                active
                  ? "text-amber-600 dark:text-amber-400"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <span className="relative">
                <Icon className="h-5 w-5" />
                {item.badge ? (
                  <span className="absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-bold text-white">
                    {item.badge}
                  </span>
                ) : null}
              </span>
              {item.label}
            </button>
          );
        })}
      </nav>
    </footer>
  );
}

export function PosSidebar() {
  const { activeView, setActiveView, cart } = usePosStore();
  const cartCount = cart.reduce((s, c) => s + c.quantity, 0);

  const navItems = [
    { id: "tables" as const, label: "Mize", desc: "Tloris lokala", icon: LayoutGrid },
    { id: "order" as const, label: "Naročilo", desc: "Aktivni račun", icon: UtensilsCrossed, badge: cartCount },
    { id: "dashboard" as const, label: "Pregled", desc: "Statistika dneva", icon: BarChart3 },
  ];

  return (
    <aside className="hidden w-60 shrink-0 border-r border-border bg-card md:flex md:flex-col">
      <div className="flex-1 space-y-1 p-3">
        <p className="px-3 pb-2 pt-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Blagajna
        </p>
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = activeView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveView(item.id)}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors",
                active
                  ? "bg-amber-50 text-amber-900 dark:bg-amber-950/50 dark:text-amber-200"
                  : "text-foreground hover:bg-muted"
              )}
            >
              <Icon
                className={cn(
                  "h-5 w-5 shrink-0",
                  active ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"
                )}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{item.label}</span>
                  {item.badge ? (
                    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1.5 text-[11px] font-bold text-white">
                      {item.badge}
                    </span>
                  ) : null}
                </div>
                <p className="truncate text-xs text-muted-foreground">
                  {item.desc}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      <div className="border-t border-border p-3">
        <div className="rounded-lg bg-gradient-to-br from-amber-50 to-orange-50 p-3 dark:from-amber-950/30 dark:to-orange-950/30">
          <p className="text-xs font-semibold text-amber-900 dark:text-amber-200">
            ICEPOS — SI Demo
          </p>
          <p className="mt-1 text-[11px] text-amber-700/80 dark:text-amber-400/70">
            Odprtokodna blagajna za restavracije. Pripravljeno za slovenski trg
            (EUR, DDV, SRS).
          </p>
        </div>
      </div>
    </aside>
  );
}
