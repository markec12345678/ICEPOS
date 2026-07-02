"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Search,
  UtensilsCrossed,
  Receipt,
  ChefHat,
  BarChart3,
  Package,
  Users,
  Gift,
  CalendarDays,
  UserCircle,
  FileBarChart,
  Settings,
  CalendarCheck,
  Trash2,
  Clock3,
  Bike,
  Brain,
  Layers,
  Calculator,
  Truck,
  CalendarCheck2,
  ImagePlus,
  Building2,
  ArrowRight,
} from "lucide-react";
import { usePosStore } from "@/stores/pos-store";

interface SearchItem {
  id: string;
  label: string;
  desc: string;
  icon: React.ComponentType<{ className?: string }>;
  action: () => void;
  category: string;
}

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const setActiveView = usePosStore((s) => s.setActiveView);

  // Ctrl+K / Cmd+K za odprtje
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      if (e.key === "Escape" && open) {
        setOpen(false);
      }
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open]);

  const items: SearchItem[] = [
    { id: "tables", label: "Mize", desc: "Tloris lokala", icon: UtensilsCrossed, action: () => setActiveView("tables"), category: "Blagajna" },
    { id: "order", label: "Naročilo", desc: "Aktivni račun", icon: Receipt, action: () => setActiveView("order"), category: "Blagajna" },
    { id: "receipts", label: "Računi", desc: "Dnevnik izdanih", icon: Receipt, action: () => setActiveView("receipts"), category: "Blagajna" },
    { id: "kitchen", label: "Kuhinja", desc: "Real-time naročila", icon: ChefHat, action: () => setActiveView("kitchen"), category: "Blagajna" },
    { id: "dashboard", label: "Pregled", desc: "Statistika dneva", icon: BarChart3, action: () => setActiveView("dashboard"), category: "Blagajna" },
    { id: "menu", label: "Meni", desc: "Urejanje postavk", icon: UtensilsCrossed, action: () => setActiveView("menu"), category: "Upravljanje" },
    { id: "inventory", label: "Zaloga", desc: "Inventory management", icon: Package, action: () => setActiveView("inventory"), category: "Upravljanje" },
    { id: "customers", label: "Stranke", desc: "CRM in zvestoba", icon: Users, action: () => setActiveView("customers"), category: "Upravljanje" },
    { id: "gift-cards", label: "Darilne kartice", desc: "Gift cards", icon: Gift, action: () => setActiveView("gift-cards"), category: "Upravljanje" },
    { id: "reservations", label: "Rezervacije", desc: "Koledar miz", icon: CalendarDays, action: () => setActiveView("reservations"), category: "Upravljanje" },
    { id: "shift", label: "Smena", desc: "Blagajnikova smena", icon: UserCircle, action: () => setActiveView("shift"), category: "Upravljanje" },
    { id: "scheduling", label: "Razpored", desc: "Scheduling + Labor cost", icon: CalendarCheck, action: () => setActiveView("scheduling"), category: "Upravljanje" },
    { id: "menu-engineering", label: "Menu Engineering", desc: "Profitabilnost menija", icon: BarChart3, action: () => setActiveView("menu-engineering"), category: "Analitika" },
    { id: "benchmark", label: "Benchmark lokacij", desc: "Primerjava restavracij", icon: Building2, action: () => setActiveView("benchmark"), category: "Analitika" },
    { id: "waste", label: "Odpadki", desc: "Food waste tracking", icon: Trash2, action: () => setActiveView("waste"), category: "Analitika" },
    { id: "forecast", label: "AI napoved", desc: "Demand forecasting", icon: Brain, action: () => setActiveView("forecast"), category: "Analitika" },
    { id: "happy-hour", label: "Happy Hour", desc: "Časovno odvisne cene", icon: Clock3, action: () => setActiveView("happy-hour"), category: "Napredno" },
    { id: "combos", label: "Combo meniji", desc: "Set meniji z izbiro", icon: Layers, action: () => setActiveView("combos"), category: "Napredno" },
    { id: "wolt", label: "Wolt dostava", desc: "Integracija z Wolt", icon: Bike, action: () => setActiveView("wolt"), category: "Integracije" },
    { id: "deliverect", label: "Deliverect", desc: "Agregator dostave", icon: Truck, action: () => setActiveView("deliverect"), category: "Integracije" },
    { id: "opentable", label: "OpenTable/Resy", desc: "Sinhronizacija rezervacij", icon: CalendarCheck2, action: () => setActiveView("opentable"), category: "Integracije" },
    { id: "accounting", label: "Računovodstvo", desc: "Export za Pantheon/QuickBooks", icon: Calculator, action: () => setActiveView("accounting"), category: "Sistem" },
    { id: "images", label: "Slike jedi", desc: "AI generator slik", icon: ImagePlus, action: () => setActiveView("images"), category: "Sistem" },
    { id: "zreport", label: "Z-report", desc: "Dnevni zaključek", icon: FileBarChart, action: () => setActiveView("zreport"), category: "Sistem" },
    { id: "settings", label: "Nastavitve", desc: "Podjetje in FURS", icon: Settings, action: () => setActiveView("settings"), category: "Sistem" },
    { id: "operators", label: "Operaterji", desc: "Blagajniki (FURS)", icon: Users, action: () => setActiveView("operators"), category: "Sistem" },
  ];

  const filtered = items.filter((item) => {
    if (!query) return true;
    const q = query.toLowerCase();
    return (
      item.label.toLowerCase().includes(q) ||
      item.desc.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q)
    );
  });

  // Ragrupiraj po kategoriji
  const grouped = filtered.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, SearchItem[]>);

  const flatFiltered = Object.values(grouped).flat();

  function selectItem(idx: number) {
    const item = flatFiltered[idx];
    if (item) {
      item.action();
      setOpen(false);
      setQuery("");
      setSelectedIndex(0);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, flatFiltered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      selectItem(selectedIndex);
    }
  }

  let runningIndex = -1;

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setQuery(""); setSelectedIndex(0); } }}>
      <DialogContent className="max-w-lg gap-0 p-0">
        <div className="flex items-center border-b px-3">
          <Search className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
          <Input
            autoFocus
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSelectedIndex(0); }}
            onKeyDown={handleKeyDown}
            placeholder="Išči funkcije, pogled, akcije... (↑↓ za navigacijo)"
            className="border-0 focus-visible:ring-0"
          />
          <kbd className="ml-2 shrink-0 rounded border bg-muted px-1.5 py-0.5 text-[10px] font-mono">
            Esc
          </kbd>
        </div>

        <div className="max-h-80 overflow-y-auto p-2">
          {flatFiltered.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Ni rezultatov za "{query}"
            </p>
          ) : (
            Object.entries(grouped).map(([category, items]) => (
              <div key={category} className="mb-2">
                <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {category}
                </p>
                {items.map((item) => {
                  runningIndex++;
                  const isSelected = runningIndex === selectedIndex;
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => selectItem(runningIndex)}
                      onMouseEnter={() => setSelectedIndex(runningIndex)}
                      className={`flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors ${
                        isSelected ? "bg-primary/10" : "hover:bg-muted/50"
                      }`}
                    >
                      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                        isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                      }`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{item.label}</p>
                        <p className="text-xs text-muted-foreground">{item.desc}</p>
                      </div>
                      {isSelected && (
                        <ArrowRight className="h-3 w-3 text-primary" />
                      )}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        <div className="border-t px-3 py-1.5 text-[10px] text-muted-foreground">
          <kbd className="rounded border bg-muted px-1 font-mono">↑↓</kbd> navigacija ·{" "}
          <kbd className="rounded border bg-muted px-1 font-mono">Enter</kbd> izberi ·{" "}
          <kbd className="rounded border bg-muted px-1 font-mono">Ctrl+K</kbd> odpri/zapri
        </div>
      </DialogContent>
    </Dialog>
  );
}
