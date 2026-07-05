"use client";

import { useState, useEffect, useMemo } from "react";
import { formatEUR } from "@/lib/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Users, Copy, Check, UtensilsCrossed, Plus, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface CartItemDisplay {
  lineId: string;
  menuItem: { id: string; name: string; price: number };
  quantity: number;
  unitPrice: number;
}

interface ItemSplitDialogProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  items: CartItemDisplay[];
  total: number;
}

/**
 * Delitev računa po postavkah — vsaka oseba izbere katere postavke plača.
 * Uporabno ko vsak gost plača svoje naročilo.
 */
export function ItemSplitDialog({
  open,
  onOpenChange,
  items,
  total,
}: ItemSplitDialogProps) {
  const [people, setPeople] = useState(2);
  const [assignments, setAssignments] = useState<Record<string, number>>({});
  const [copied, setCopied] = useState(false);

  // Reset ob odpiranju
  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAssignments({});
    }
  }, [open]);

  // Izračunaj total per oseba
  const personTotals = useMemo(() => {
    const totals = Array.from({ length: people }, () => 0);
    for (const item of items) {
      const personIdx = assignments[item.lineId];
      if (personIdx !== undefined && personIdx >= 0 && personIdx < people) {
        totals[personIdx] += item.unitPrice * item.quantity;
      }
    }
    return totals.map((t) => Math.round(t * 100) / 100);
  }, [assignments, items, people]);

  const assignedCount = Object.keys(assignments).length;
  const unassignedItems = items.filter((i) => assignments[i.lineId] === undefined);
  const unassignedTotal = unassignedItems.reduce((s, i) => s + i.unitPrice * i.quantity, 0);

  function assignItem(lineId: string, personIdx: number) {
    setAssignments((prev) => ({ ...prev, [lineId]: personIdx }));
  }

  function unassignItem(lineId: string) {
    setAssignments((prev) => {
      const next = { ...prev };
      delete next[lineId];
      return next;
    });
  }

  function autoSplit() {
    // Samodejno razdeli: vsako postavko dodeli osebi z najmanjšim trenutnim zneskom
    const newAssignments: Record<string, number> = {};
    const totals = Array.from({ length: people }, () => 0);
    const sortedItems = [...items].sort((a, b) => b.unitPrice * b.quantity - a.unitPrice * a.quantity);

    for (const item of sortedItems) {
      const minIdx = totals.indexOf(Math.min(...totals));
      newAssignments[item.lineId] = minIdx;
      totals[minIdx] += item.unitPrice * item.quantity;
    }
    setAssignments(newAssignments);
    toast.success("Postavke samodejno razdeljene");
  }

  async function copyToClipboard() {
    const text = `Račun ${formatEUR(total)} razdeljen po postavkah:\n${personTotals
      .map((t, i) => `  Oseba ${i + 1}: ${formatEUR(t)}`)
      .join("\n")}${unassignedTotal > 0 ? `\n  Nedodeljeno: ${formatEUR(unassignedTotal)}` : ""}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success("Delitev kopirana v odložišče");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Kopiranje ni uspelo");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UtensilsCrossed className="h-5 w-5 text-amber-600" />
            Delitev po postavkah
          </DialogTitle>
          <DialogDescription>
            Dodeli vsako postavko osebi, ki jo plača. Skupaj: <strong>{formatEUR(total)}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          {/* Število oseb */}
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Število oseb</label>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon" aria-label="Akcija"
                className="h-8 w-8"
                onClick={() => setPeople((p) => Math.max(2, p - 1))}
                disabled={people <= 2}
              >
                <Minus className="h-3 w-3" />
              </Button>
              <span className="w-8 text-center font-bold">{people}</span>
              <Button
                variant="outline"
                size="icon" aria-label="Akcija"
                className="h-8 w-8"
                onClick={() => setPeople((p) => Math.min(8, p + 1))}
                disabled={people >= 8}
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          </div>

          {/* Akcije */}
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={autoSplit} className="flex-1">
              <Users className="mr-1.5 h-3.5 w-3.5" />
              Samodejno razdeli
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAssignments({})}
              disabled={assignedCount === 0}
            >
              Počisti
            </Button>
          </div>

          {/* Seznam postavk */}
          <div className="space-y-1.5">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Postavke ({items.length})
            </p>
            {items.map((item) => {
              const assigned = assignments[item.lineId];
              return (
                <div
                  key={item.lineId}
                  className={cn(
                    "rounded-lg border p-2 transition-colors",
                    assigned !== undefined
                      ? "border-emerald-300 bg-emerald-50/30 dark:border-emerald-800 dark:bg-emerald-950/10"
                      : "border-amber-300 bg-amber-50/30 dark:border-amber-800 dark:bg-amber-950/10"
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {item.quantity}× {item.menuItem.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatEUR(item.unitPrice)} / kos · skupaj {formatEUR(item.unitPrice * item.quantity)}
                      </p>
                    </div>
                    {assigned !== undefined && (
                      <Badge variant="outline" className="border-emerald-300 bg-emerald-100 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-400 text-xs">
                        Oseba {assigned + 1}
                      </Badge>
                    )}
                  </div>
                  {/* Gumbi za dodelitev */}
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {Array.from({ length: people }, (_, i) => (
                      <button
                        key={i}
                        onClick={() => assignItem(item.lineId, i)}
                        className={cn(
                          "h-6 rounded px-2 text-[10px] font-medium transition-colors",
                          assigned === i
                            ? "bg-emerald-500 text-white"
                            : "bg-muted/50 text-muted-foreground hover:bg-muted"
                        )}
                      >
                        {i + 1}
                      </button>
                    ))}
                    {assigned !== undefined && (
                      <button
                        onClick={() => unassignItem(item.lineId)}
                        className="h-6 rounded bg-rose-100 px-2 text-[10px] font-medium text-rose-700 hover:bg-rose-200 dark:bg-rose-950/50 dark:text-rose-400"
                      >
                        ✕ Odstrani
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Povzetek per oseba */}
          <Separator className="my-3" />
          <div className="space-y-1.5">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Povzetek
            </p>
            {personTotals.map((t, i) => (
              <div key={i} className="flex items-center justify-between rounded-md bg-muted/30 p-2">
                <span className="flex items-center gap-2 text-sm">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-100 text-xs font-bold text-amber-700 dark:bg-amber-950/50 dark:text-amber-400">
                    {i + 1}
                  </span>
                  Oseba {i + 1}
                </span>
                <span className={cn(
                  "font-bold tabular-nums",
                  t === 0 ? "text-muted-foreground" : "text-foreground"
                )}>
                  {formatEUR(t)}
                </span>
              </div>
            ))}
            {unassignedTotal > 0 && (
              <div className="flex items-center justify-between rounded-md bg-amber-50 p-2 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400">
                <span className="text-sm">⚠️ Nedodeljene postavke</span>
                <span className="font-bold tabular-nums">{formatEUR(unassignedTotal)}</span>
              </div>
            )}
          </div>

          {/* Skupaj + kopiraj */}
          <div className="flex items-center justify-between border-t pt-3">
            <div>
              <p className="text-xs text-muted-foreground">Dodeljeno / Skupaj</p>
              <p className="text-sm font-bold">
                {formatEUR(total - unassignedTotal)} / {formatEUR(total)}
              </p>
            </div>
            <Button onClick={copyToClipboard} variant="outline" size="sm">
              {copied ? <Check className="mr-1.5 h-3.5 w-3.5 text-emerald-500" /> : <Copy className="mr-1.5 h-3.5 w-3.5" />}
              Kopiraj
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
