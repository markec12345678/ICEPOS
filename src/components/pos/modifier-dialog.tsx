"use client";

import { useEffect, useState } from "react";
import { useFetch } from "@/hooks/use-fetch";
import { formatEUR, type MenuItem } from "@/lib/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Plus, Minus, Check, StickyNote } from "lucide-react";
import { cn } from "@/lib/utils";

interface Modifier {
  id: string;
  label: string;
  priceDelta: number;
}

interface ModifierDialogProps {
  item: MenuItem | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onConfirm: (item: MenuItem, quantity: number, selectedModifiers: Modifier[], note: string) => void;
}

export function ModifierDialog({
  item,
  open,
  onOpenChange,
  onConfirm,
}: ModifierDialogProps) {
  const { data: modifiers } = useFetch<Modifier[]>(
    item ? `/api/menu/${item.id}/modifiers` : "/api/menu/_/_/modifiers"
  );
  const [quantity, setQuantity] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [note, setNote] = useState("");

  // Reset ob odpiranju — setState v effect je tu nujen za reset ob odpiranju dialoga
  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setQuantity(1);
      setSelected(new Set());
      setNote("");
    }
  }, [open, item?.id]);

  if (!item) return null;

  const allModifiers = modifiers || [];
  const selectedModifiers = allModifiers.filter((m) => selected.has(m.id));
  const modifierDelta = selectedModifiers.reduce((s, m) => s + m.priceDelta, 0);
  const unitPrice = item.price + modifierDelta;
  const total = unitPrice * quantity;

  function toggleModifier(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function confirm() {
    onConfirm(item, quantity, selectedModifiers, note.trim());
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {item.name}
          </DialogTitle>
          <DialogDescription>
            Osnovna cena: {formatEUR(item.price)} &middot; DDV{" "}
            {(item.vatRate * 100).toFixed(1)}%
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Modifierji */}
          {allModifiers.length > 0 && (
            <div>
              <Label className="mb-2 block">Dodatki / opcije</Label>
              <div className="space-y-1.5">
                {allModifiers.map((m) => {
                  const isSelected = selected.has(m.id);
                  return (
                    <button
                      key={m.id}
                      onClick={() => toggleModifier(m.id)}
                      className={cn(
                        "flex w-full items-center justify-between rounded-lg border-2 p-2.5 text-left transition-all",
                        isSelected
                          ? "border-amber-500 bg-amber-50 dark:bg-amber-950/30"
                          : "border-border hover:bg-muted"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className={cn(
                            "flex h-5 w-5 items-center justify-center rounded border-2",
                            isSelected
                              ? "border-amber-500 bg-amber-500 text-white"
                              : "border-border"
                          )}
                        >
                          {isSelected && <Check className="h-3 w-3" />}
                        </div>
                        <span className="text-sm font-medium">{m.label}</span>
                      </div>
                      {m.priceDelta !== 0 && (
                        <Badge variant="outline" className="font-mono text-xs">
                          {m.priceDelta > 0 ? "+" : ""}
                          {formatEUR(m.priceDelta)}
                        </Badge>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Note */}
          <div>
            <Label htmlFor="note" className="mb-1.5 flex items-center gap-1.5">
              <StickyNote className="h-3.5 w-3.5" />
              Opomba za kuhinjo
            </Label>
            <Input
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="npr. brez čebule, dobra pečena, alergija na gluten"
              maxLength={200}
            />
          </div>

          {/* Količina */}
          <div>
            <Label className="mb-1.5 block">Količina</Label>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                disabled={quantity <= 1}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <div className="flex h-12 flex-1 items-center justify-center rounded-lg bg-muted text-2xl font-bold">
                {quantity}
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setQuantity((q) => Math.min(99, q + 1))}
                disabled={quantity >= 99}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <Separator />

          {/* Povzetek cene */}
          <div className="space-y-1 rounded-lg bg-muted/50 p-3 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>Osnovna cena</span>
              <span>{formatEUR(item.price)}</span>
            </div>
            {modifierDelta !== 0 && (
              <div className="flex justify-between text-muted-foreground">
                <span>Dodatki ({selectedModifiers.length})</span>
                <span>
                  {modifierDelta > 0 ? "+" : ""}
                  {formatEUR(modifierDelta)}
                </span>
              </div>
            )}
            <div className="flex justify-between text-muted-foreground">
              <span>Količina</span>
              <span>× {quantity}</span>
            </div>
            <Separator className="my-1" />
            <div className="flex justify-between text-base font-bold">
              <span>Skupaj</span>
              <span className="text-amber-700 dark:text-amber-400">
                {formatEUR(total)}
              </span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Prekliči
          </Button>
          <Button
            onClick={confirm}
            className="bg-amber-600 hover:bg-amber-700"
          >
            <Plus className="mr-1.5 h-4 w-4" />
            Dodaj v voziček ({formatEUR(total)})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
