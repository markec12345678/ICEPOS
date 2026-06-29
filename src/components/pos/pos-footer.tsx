"use client";

import { usePosStore } from "@/stores/pos-store";
import { cn } from "@/lib/utils";
import {
  LayoutGrid,
  ClipboardList,
  Receipt,
  UtensilsCrossed,
  BarChart3,
  BookOpen,
  FileBarChart,
  Settings,
  MoreHorizontal,
  ChefHat,
  CalendarDays,
  UserCircle,
  CalendarRange,
  Users,
  CalendarClock,
  Package,
  Gift,
  CalendarCheck,
  Building2,
  Trash2,
  Clock3,
  Bike,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

export function PosFooter() {
  const { activeView, setActiveView, cart } = usePosStore();
  const cartCount = cart.reduce((s, c) => s + c.quantity, 0);

  const mainNav = [
    { id: "tables" as const, label: "Mize", icon: LayoutGrid },
    { id: "order" as const, label: "Naroči", icon: UtensilsCrossed, badge: cartCount },
    { id: "receipts" as const, label: "Računi", icon: Receipt },
    { id: "dashboard" as const, label: "Pregled", icon: BarChart3 },
  ];

  const moreNav = [
    { id: "kitchen" as const, label: "Kuhinja", desc: "Real-time naročila", icon: ChefHat },
    { id: "reservations" as const, label: "Rezervacije", desc: "Koledar miz", icon: CalendarDays },
    { id: "shift" as const, label: "Smena", desc: "Blagajnikova smena", icon: UserCircle },
    { id: "menu" as const, label: "Meni", desc: "Urejanje postavk", icon: BookOpen },
    { id: "inventory" as const, label: "Zaloga", desc: "Inventory management", icon: Package },
    { id: "customers" as const, label: "Stranke", desc: "CRM in zvestoba", icon: Users },
    { id: "gift-cards" as const, label: "Darilne kartice", desc: "Gift cards", icon: Gift },
    { id: "tables-admin" as const, label: "Mize admin", desc: "Urejanje miz", icon: LayoutGrid },
    { id: "operators" as const, label: "Operaterji", desc: "Blagajniki (FURS)", icon: Users },
    { id: "scheduling" as const, label: "Razpored", desc: "Scheduling + Labor cost", icon: CalendarCheck },
    { id: "menu-engineering" as const, label: "Menu Engineering", desc: "Profitabilnost menija", icon: BarChart3 },
    { id: "benchmark" as const, label: "Benchmark lokacij", desc: "Primerjava restavracij", icon: Building2 },
    { id: "waste" as const, label: "Odpadki", desc: "Food waste tracking", icon: Trash2 },
    { id: "happy-hour" as const, label: "Happy Hour", desc: "Časovno odvisne cene", icon: Clock3 },
    { id: "wolt" as const, label: "Wolt dostava", desc: "Integracija z Wolt", icon: Bike },
    { id: "weekly" as const, label: "Tedenska statistika", desc: "Po dnevih v tednu", icon: CalendarClock },
    { id: "monthly" as const, label: "Mesečno poročilo", desc: "Statistika meseca", icon: CalendarRange },
    { id: "zreport" as const, label: "Z-report", desc: "Dnevni zaključek", icon: FileBarChart },
    { id: "settings" as const, label: "Nastavitve", desc: "Podjetje in FURS", icon: Settings },
  ];

  const isMoreActive = ["menu", "zreport", "settings", "kitchen", "reservations", "shift", "monthly", "weekly", "operators", "tables-admin", "inventory", "customers", "gift-cards", "scheduling", "menu-engineering", "benchmark", "waste", "happy-hour", "wolt"].includes(activeView);

  return (
    <footer className="sticky bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80 md:hidden print:hidden">
      <nav className="grid grid-cols-5">
        {mainNav.map((item) => {
          const Icon = item.icon;
          const active = activeView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveView(item.id)}
              className={cn(
                "flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-all active:scale-95",
                active
                  ? "text-amber-600 dark:text-amber-400"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {active && (
                <span className="absolute top-0 h-0.5 w-8 rounded-full bg-amber-500" />
              )}
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

        <Sheet>
          <SheetTrigger asChild>
            <button
              className={cn(
                "flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-all active:scale-95",
                isMoreActive
                  ? "text-amber-600 dark:text-amber-400"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {isMoreActive && (
                <span className="absolute top-0 h-0.5 w-8 rounded-full bg-amber-500" />
              )}
              <MoreHorizontal className="h-5 w-5" />
              Več
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="rounded-t-2xl">
            <SheetHeader>
              <SheetTitle>Dodatno</SheetTitle>
            </SheetHeader>
            <div className="mt-4 space-y-1">
              {moreNav.map((item) => {
                const Icon = item.icon;
                const active = activeView === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveView(item.id)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left transition-colors",
                      active
                        ? "bg-amber-50 text-amber-900 dark:bg-amber-950/50 dark:text-amber-200"
                        : "hover:bg-muted"
                    )}
                  >
                    <Icon
                      className={cn(
                        "h-5 w-5",
                        active
                          ? "text-amber-600 dark:text-amber-400"
                          : "text-muted-foreground"
                      )}
                    />
                    <div>
                      <p className="text-sm font-medium">{item.label}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.desc}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </SheetContent>
        </Sheet>
      </nav>
    </footer>
  );
}

export function PosSidebar() {
  const { activeView, setActiveView, cart } = usePosStore();
  const cartCount = cart.reduce((s, c) => s + c.quantity, 0);

  const navItems = [
    { id: "tables" as const, label: "Mize", desc: "Tloris lokala", icon: LayoutGrid },
    {
      id: "order" as const,
      label: "Naročilo",
      desc: "Aktivni račun",
      icon: UtensilsCrossed,
      badge: cartCount,
    },
    { id: "receipts" as const, label: "Računi", desc: "Dnevnik izdanih", icon: Receipt },
    {
      id: "kitchen" as const,
      label: "Kuhinja",
      desc: "Real-time naročila",
      icon: ChefHat,
    },
    { id: "menu" as const, label: "Meni", desc: "Urejanje postavk", icon: BookOpen },
    {
      id: "inventory" as const,
      label: "Zaloga",
      desc: "Inventory management",
      icon: Package,
    },
    {
      id: "customers" as const,
      label: "Stranke",
      desc: "CRM in zvestoba",
      icon: Users,
    },
    {
      id: "gift-cards" as const,
      label: "Darilne kartice",
      desc: "Gift cards",
      icon: Gift,
    },
    {
      id: "reservations" as const,
      label: "Rezervacije",
      desc: "Koledar miz",
      icon: CalendarDays,
    },
    {
      id: "shift" as const,
      label: "Smena",
      desc: "Blagajnikova smena",
      icon: UserCircle,
    },
    {
      id: "dashboard" as const,
      label: "Pregled",
      desc: "Statistika dneva",
      icon: BarChart3,
    },
    {
      id: "monthly" as const,
      label: "Mesečno poročilo",
      desc: "Statistika meseca",
      icon: CalendarRange,
    },
    {
      id: "weekly" as const,
      label: "Tedenska statistika",
      desc: "Po dnevih v tednu",
      icon: CalendarClock,
    },
    {
      id: "zreport" as const,
      label: "Z-report",
      desc: "Dnevni zaključek",
      icon: FileBarChart,
    },
    {
      id: "settings" as const,
      label: "Nastavitve",
      desc: "Podjetje in FURS",
      icon: Settings,
    },
    {
      id: "operators" as const,
      label: "Operaterji",
      desc: "Blagajniki (FURS)",
      icon: Users,
    },
    {
      id: "tables-admin" as const,
      label: "Mize admin",
      desc: "Urejanje miz",
      icon: LayoutGrid,
    },
    {
      id: "scheduling" as const,
      label: "Razpored",
      desc: "Scheduling + Labor cost",
      icon: CalendarCheck,
    },
    {
      id: "menu-engineering" as const,
      label: "Menu Engineering",
      desc: "Profitabilnost menija",
      icon: BarChart3,
    },
    {
      id: "benchmark" as const,
      label: "Benchmark lokacij",
      desc: "Primerjava restavracij",
      icon: Building2,
    },
    {
      id: "waste" as const,
      label: "Odpadki",
      desc: "Food waste tracking",
      icon: Trash2,
    },
    {
      id: "happy-hour" as const,
      label: "Happy Hour",
      desc: "Časovno odvisne cene",
      icon: Clock3,
    },
    {
      id: "wolt" as const,
      label: "Wolt dostava",
      desc: "Integracija z Wolt",
      icon: Bike,
    },
  ];

  return (
    <aside className="hidden w-60 shrink-0 border-r border-border bg-card md:flex md:flex-col print:hidden">
      <div className="flex-1 space-y-1 overflow-y-auto p-3">
        <p className="px-3 pb-2 pt-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Blagajna
        </p>
        {navItems.slice(0, 6).map((item) => {
          const Icon = item.icon;
          const active = activeView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveView(item.id)}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-all hover:translate-x-0.5",
                active
                  ? "bg-amber-50 text-amber-900 dark:bg-amber-950/50 dark:text-amber-200"
                  : "text-foreground hover:bg-muted"
              )}
            >
              <Icon
                className={cn(
                  "h-5 w-5 shrink-0",
                  active
                    ? "text-amber-600 dark:text-amber-400"
                    : "text-muted-foreground"
                )}
              />
              <div className="min-w-0 flex-1">
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

        <p className="px-3 pb-2 pt-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Sistem
        </p>
        {navItems.slice(6).map((item) => {
          const Icon = item.icon;
          const active = activeView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveView(item.id)}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-all hover:translate-x-0.5",
                active
                  ? "bg-amber-50 text-amber-900 dark:bg-amber-950/50 dark:text-amber-200"
                  : "text-foreground hover:bg-muted"
              )}
            >
              <Icon
                className={cn(
                  "h-5 w-5 shrink-0",
                  active
                    ? "text-amber-600 dark:text-amber-400"
                    : "text-muted-foreground"
                )}
              />
              <div className="min-w-0 flex-1">
                <span className="text-sm font-medium">{item.label}</span>
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
            ICEPOS SI — FURS POC
          </p>
          <p className="mt-1 text-[11px] text-amber-700/80 dark:text-amber-400/70">
            ZOI, EOR, XML, QR, storno, Z-report
          </p>
          <p className="mt-1 text-[10px] text-amber-600/60 dark:text-amber-500/50">
            Bližnjice: 1-5 pogledi, Esc nazaj
          </p>
        </div>
      </div>
    </aside>
  );
}
