"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, X, Package, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePosStore } from "@/stores/pos-store";
import { playFeedbackSound } from "@/hooks/use-sound-feedback";

interface OutOfStockItem {
  id: string;
  name: string;
  unit: string;
  quantity: number;
  minQuantity: number;
  costPerUnit: number;
  supplier: string | null;
  category: string;
}

export function OutOfStockBanner() {
  const [items, setItems] = useState<OutOfStockItem[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [prevCount, setPrevCount] = useState(0);
  const setActiveView = usePosStore((s) => s.setActiveView);

  async function load() {
    try {
      const res = await fetch("/api/inventory/out-of-stock");
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data)) {
        setItems(data);
        // Predvajaj warning zvok, če se je število povečalo
        if (data.length > prevCount && prevCount > 0) {
          playFeedbackSound("warning");
        }
        setPrevCount(data.length);
        // Reset dismissed ko se spremeni
        if (data.length === 0) {
          setDismissed(false);
        }
      }
    } catch {
      // tiha napaka
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    const interval = setInterval(load, 60000); // vsako minuto
    return () => clearInterval(interval);
  }, []);

  if (items.length === 0 || dismissed) {
    return null;
  }

  const critical = items.filter((i) => i.minQuantity > 0).length;
  const lowOnly = items.length - critical;

  return (
    <div className="border-b border-rose-300 bg-gradient-to-r from-rose-50 to-red-50 dark:border-rose-900 dark:from-rose-950/30 dark:to-red-950/30">
      <div className="mx-auto max-w-7xl px-4 py-2 md:px-6">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-rose-100 dark:bg-rose-950">
            <AlertTriangle className="h-4 w-4 text-rose-600 dark:text-rose-400" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-rose-900 dark:text-rose-200">
              {items.length} artiklov je brez zaloge!
            </p>
            <p className="text-xs text-rose-700 dark:text-rose-400">
              {critical > 0 && `${critical} kritičnih`}
              {critical > 0 && lowOnly > 0 && " · "}
              {lowOnly > 0 && `${lowOnly} z min. zalogo 0`}
              {" · "}
              {items.slice(0, 3).map((i) => i.name).join(", ")}
              {items.length > 3 && ` +${items.length - 3} več`}
            </p>
          </div>

          <Button
            size="sm"
            variant="outline"
            className="border-rose-300 bg-white/50 text-rose-700 hover:bg-rose-100 dark:border-rose-800 dark:bg-rose-950/50 dark:text-rose-400"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            {expanded ? "Skrij" : "Prikaži"}
          </Button>

          <Button
            size="sm"
            className="bg-rose-600 hover:bg-rose-700"
            onClick={() => setActiveView("inventory")}
          >
            <Package className="h-3.5 w-3.5" />
            Uredi zalogo
          </Button>

          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0 text-rose-600 dark:text-rose-400"
            onClick={() => setDismissed(true)}
            title="Skrij opozorilo"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>

        {expanded && (
          <div className="mt-2 grid grid-cols-2 gap-1.5 sm:grid-cols-3 lg:grid-cols-4">
            {items.map((item) => (
              <div
                key={item.id}
                className={cn(
                  "flex items-center justify-between gap-2 rounded-md border px-2 py-1 text-xs",
                  item.minQuantity > 0
                    ? "border-rose-300 bg-rose-50 dark:border-rose-800 dark:bg-rose-950/30"
                    : "border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/20"
                )}
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{item.name}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {item.category} · {item.supplier || "brez dobavitelja"}
                  </p>
                </div>
                <Badge
                  variant="outline"
                  className="shrink-0 text-[10px] text-rose-600 dark:text-rose-400"
                >
                  0 {item.unit}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
