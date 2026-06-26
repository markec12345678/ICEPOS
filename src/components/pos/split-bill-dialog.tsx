"use client";

import { useState } from "react";
import { formatEUR } from "@/lib/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Users, Plus, Minus, Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface SplitBillDialogProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  total: number;
}

/**
 * Kalkulator za delitev računa med več oseb.
 * Prikazuje koliko vsak plača (enaki deli) in omogoča ročno prilagoditev.
 */
export function SplitBillDialog({
  open,
  onOpenChange,
  total,
}: SplitBillDialogProps) {
  const [people, setPeople] = useState(2);
  const [customShares, setCustomShares] = useState<number[]>([]);
  const [copied, setCopied] = useState(false);

  // Enaki deli (zaokroženo na 2 decimalki)
  const equalShare = total / people;
  const roundedShare = Math.round(equalShare * 100) / 100;
  const remainder = Math.round((total - roundedShare * people) * 100) / 100;

  // Prikaži enake dele (zadnji oseba dobi ostanek)
  const shares = Array.from({ length: people }, (_, i) =>
    i === people - 1 ? roundedShare + remainder : roundedShare
  );

  function changePeople(delta: number) {
    const next = Math.max(2, Math.min(20, people + delta));
    setPeople(next);
    setCustomShares([]);
  }

  async function copyToClipboard() {
    const text = `Račun ${formatEUR(total)} razdeljen na ${people} oseb:\n${shares
      .map((s, i) => `  Oseba ${i + 1}: ${formatEUR(s)}`)
      .join("\n")}`;
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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-amber-600" />
            Delitev računa
          </DialogTitle>
          <DialogDescription>
            Razdeli skupni račun <strong>{formatEUR(total)}</strong> med več
            oseb.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Število oseb */}
          <div>
            <label className="mb-2 block text-sm font-medium">
              Število oseb
            </label>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="icon"
                onClick={() => changePeople(-1)}
                disabled={people <= 2}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <div className="flex h-12 flex-1 items-center justify-center rounded-lg bg-muted text-2xl font-bold">
                {people}
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={() => changePeople(1)}
                disabled={people >= 20}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <Separator />

          {/* Delitev */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Skupaj</span>
              <span className="font-bold">{formatEUR(total)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Na osebo</span>
              <span className="font-semibold text-amber-700 dark:text-amber-400">
                {formatEUR(roundedShare)}
              </span>
            </div>
            {remainder !== 0 && (
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Zadnja oseba dobi razliko</span>
                <span>
                  {formatEUR(roundedShare + remainder)} ({" "}
                  {remainder > 0 ? "+" : ""}
                  {formatEUR(remainder)})
                </span>
              </div>
            )}
          </div>

          <Separator />

          {/* Seznam oseb */}
          <div className="max-h-48 space-y-1.5 overflow-y-auto">
            {shares.map((share, i) => (
              <div
                key={i}
                className="flex items-center justify-between rounded-lg border border-border p-2.5"
              >
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 text-xs font-bold text-amber-700 dark:bg-amber-950/40 dark:text-amber-400">
                    {i + 1}
                  </div>
                  <span className="text-sm font-medium">
                    Oseba {i + 1}
                    {i === people - 1 && remainder !== 0 && (
                      <span className="ml-1 text-xs text-muted-foreground">
                        (+razlika)
                      </span>
                    )}
                  </span>
                </div>
                <span className="font-bold">{formatEUR(share)}</span>
              </div>
            ))}
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={copyToClipboard}
            >
              {copied ? (
                <Check className="mr-2 h-4 w-4" />
              ) : (
                <Copy className="mr-2 h-4 w-4" />
              )}
              {copied ? "Kopirano" : "Kopiraj"}
            </Button>
            <Button
              className="flex-1 bg-amber-600 hover:bg-amber-700"
              onClick={() => onOpenChange(false)}
            >
              Zapri
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
