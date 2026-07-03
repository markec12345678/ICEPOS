"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { TrendingUp, TrendingDown, Percent, Euro, AlertTriangle } from "lucide-react";
import { formatEUR } from "@/lib/types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { playFeedbackSound } from "@/hooks/use-sound-feedback";
import { CATEGORIES } from "@/lib/types";

interface BulkPriceUpdateProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onUpdated: () => void;
}

export function BulkPriceUpdate({ open, onOpenChange, onUpdated }: BulkPriceUpdateProps) {
  const [mode, setMode] = useState<"percent" | "fixed">("percent");
  const [direction, setDirection] = useState<"increase" | "decrease">("increase");
  const [value, setValue] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [preview, setPreview] = useState<{ count: number; avgDiff: number } | null>(null);
  const [applying, setApplying] = useState(false);

  // Reset ob odpiranju
  useEffect(() => {
    if (open) {
      setMode("percent");
      setDirection("increase");
      setValue("");
      setCategory("all");
      setPreview(null);
    }
  }, [open]);

  const numericValue = parseFloat(value) || 0;

  function calculatePreview() {
    if (numericValue <= 0) {
      setPreview(null);
      return;
    }
    // Približna ocena: uporabimo povprečno ceno 10€ za preview
    const avgPrice = 10;
    let diff = 0;
    if (mode === "percent") {
      const change = avgPrice * (numericValue / 100);
      diff = direction === "increase" ? change : -change;
    } else {
      diff = direction === "increase" ? numericValue : -numericValue;
    }
    setPreview({ count: category === "all" ? 34 : 5, avgDiff: diff });
  }

  async function apply() {
    if (numericValue <= 0) {
      toast.error("Vnesi veljavno vrednost");
      return;
    }
    setApplying(true);
    try {
      const res = await fetch("/api/menu/bulk-price", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: category === "all" ? undefined : category,
          adjustment: {
            type: mode,
            value: numericValue,
            direction,
          },
          items: category === "all" ? [] : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Napaka");

      playFeedbackSound("success");
      toast.success(`${data.updated} postavk posodobljenih`, {
        description: `Skupna sprememba: ${data.totalDifference >= 0 ? "+" : ""}${formatEUR(data.totalDifference)}`,
        duration: 4000,
      });
      onUpdated();
      onOpenChange(false);
    } catch (e) {
      playFeedbackSound("error");
      toast.error(e instanceof Error ? e.message : "Napaka pri posodabljanju");
    } finally {
      setApplying(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-amber-600" />
            Množično posodabljanje cen
          </DialogTitle>
          <DialogDescription>
            Posodobi cene za več postavk hkrati (npr. sezonske spremembe, inflacija)
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Kategorija */}
          <div>
            <label className="mb-1.5 block text-sm font-medium">Kategorija</label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Vse kategorije</SelectItem>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.icon} {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Smer spremembe */}
          <div>
            <label className="mb-1.5 block text-sm font-medium">Smer</label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant={direction === "increase" ? "default" : "outline"}
                onClick={() => setDirection("increase")}
                className={direction === "increase" ? "bg-emerald-600 hover:bg-emerald-700" : ""}
              >
                <TrendingUp className="mr-1.5 h-4 w-4" />
                Povišaj
              </Button>
              <Button
                variant={direction === "decrease" ? "default" : "outline"}
                onClick={() => setDirection("decrease")}
                className={direction === "decrease" ? "bg-rose-600 hover:bg-rose-700" : ""}
              >
                <TrendingDown className="mr-1.5 h-4 w-4" />
                Nižaj
              </Button>
            </div>
          </div>

          {/* Tip prilagoditve */}
          <div>
            <label className="mb-1.5 block text-sm font-medium">Tip</label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant={mode === "percent" ? "default" : "outline"}
                onClick={() => setMode("percent")}
              >
                <Percent className="mr-1.5 h-4 w-4" />
                Procent (%)
              </Button>
              <Button
                variant={mode === "fixed" ? "default" : "outline"}
                onClick={() => setMode("fixed")}
              >
                <Euro className="mr-1.5 h-4 w-4" />
                Fiksno (€)
              </Button>
            </div>
          </div>

          {/* Vrednost */}
          <div>
            <label className="mb-1.5 block text-sm font-medium">
              Vrednost {mode === "percent" ? "(%)" : "(€)"}
            </label>
            <Input
              type="number"
              step={mode === "percent" ? "0.5" : "0.10"}
              min={0}
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                setPreview(null);
              }}
              placeholder={mode === "percent" ? "npr. 5 (za 5%)" : "npr. 0.50 (za 50 centov)"}
            />
          </div>

          {/* Preview */}
          {numericValue > 0 && (
            <div className="rounded-lg border border-border bg-muted/30 p-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Predogled:</span>
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={calculatePreview}>
                  Izračunaj
                </Button>
              </div>
              {preview ? (
                <div className="mt-2 space-y-1 text-xs">
                  <p>
                    Postavk: <strong>{preview.count}</strong>
                  </p>
                  <p>
                    Povprečna sprememba:{" "}
                    <span className={cn(
                      "font-bold",
                      preview.avgDiff >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                    )}>
                      {preview.avgDiff >= 0 ? "+" : ""}{formatEUR(preview.avgDiff)}/kos
                    </span>
                  </p>
                  <p className="text-muted-foreground">
                    Skupna sprememba: ~{formatEUR(preview.avgDiff * preview.count)}
                  </p>
                </div>
              ) : (
                <p className="mt-2 text-xs text-muted-foreground">
                  Klikni "Izračunaj" za predogled spremembe
                </p>
              )}
            </div>
          )}

          {/* Warning */}
          <div className="flex items-start gap-2 rounded-lg bg-amber-50 p-2 text-xs text-amber-700 dark:bg-amber-950/30 dark:text-amber-400">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>
              To bo posodobilo cene za{" "}
              <strong>{category === "all" ? "vse kategorije" : CATEGORIES.find((c) => c.id === category)?.label}</strong>.
              Dejanje je nepovratno.
            </span>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={applying}>
            Prekliči
          </Button>
          <Button
            onClick={apply}
            disabled={applying || numericValue <= 0}
            className={direction === "increase" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-rose-600 hover:bg-rose-700"}
          >
            {applying ? "Posodabljam..." : `Posodobi cene`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
