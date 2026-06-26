"use client";

import { useEffect, useState } from "react";
import { usePosStore } from "@/stores/pos-store";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Lock, UserCircle } from "lucide-react";

const STORAGE_KEY = "icepos-si-operator";

// Demo operaterji (v produkciji: backend z pravo avtentikacijo)
const OPERATORS = [
  { pin: "1234", name: "Ana", taxNo: "SI12345678" },
  { pin: "5678", name: "Marko", taxNo: "SI87654321" },
  { pin: "9999", name: "Admin", taxNo: "SI11111111" },
];

export interface Operator {
  name: string;
  taxNo: string;
  loginAt: string;
}

export function getStoredOperator(): Operator | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Operator;
  } catch {
    return null;
  }
}

export function clearStoredOperator() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}

export function PinLoginDialog({
  open,
  onOpenChange,
  onLogin,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onLogin: (op: Operator) => void;
}) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);

  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPin("");
      setError(false);
    }
  }, [open]);

  function handlePinDigit(d: string) {
    if (pin.length >= 4) return;
    const newPin = pin + d;
    setPin(newPin);
    setError(false);

    if (newPin.length === 4) {
      // Samodejno preveri po 4. števki
      setTimeout(() => verifyPin(newPin), 150);
    }
  }

  function verifyPin(p: string) {
    const op = OPERATORS.find((o) => o.pin === p);
    if (op) {
      const operator: Operator = {
        name: op.name,
        taxNo: op.taxNo,
        loginAt: new Date().toISOString(),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(operator));
      onLogin(operator);
      onOpenChange(false);
      toast.success(`Dobrodošli, ${op.name}`);
    } else {
      setError(true);
      setPin("");
    }
  }

  const keypad = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "⌫"];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xs">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-amber-600" />
            Prijava blagajnika
          </DialogTitle>
          <DialogDescription>
            Vnesite 4-mesten PIN za dostop do blagajne
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* PIN display */}
          <div className="flex justify-center gap-2">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className={`flex h-12 w-12 items-center justify-center rounded-lg border-2 text-2xl font-bold transition-colors ${
                  error
                    ? "border-rose-400 bg-rose-50 text-rose-600"
                    : pin.length > i
                    ? "border-amber-500 bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400"
                    : "border-border bg-muted/30"
                }`}
              >
                {pin.length > i ? "●" : ""}
              </div>
            ))}
          </div>

          {error && (
            <p className="text-center text-sm text-rose-600">
              Napačen PIN. Poskusite znova.
            </p>
          )}

          {/* Numpad */}
          <div className="grid grid-cols-3 gap-2">
            {keypad.map((key, i) => {
              if (key === "") return <div key={i} />;
              if (key === "⌫") {
                return (
                  <Button
                    key={i}
                    variant="outline"
                    className="h-14 text-lg"
                    onClick={() => {
                      setPin((p) => p.slice(0, -1));
                      setError(false);
                    }}
                  >
                    ⌫
                  </Button>
                );
              }
              return (
                <Button
                  key={i}
                  variant="outline"
                  className="h-14 text-lg font-semibold hover:bg-amber-50 hover:text-amber-700 dark:hover:bg-amber-950/30"
                  onClick={() => handlePinDigit(key)}
                >
                  {key}
                </Button>
              );
            })}
          </div>

          {/* Demo PINs hint */}
          <div className="rounded-lg bg-muted/50 p-2 text-center text-[10px] text-muted-foreground">
            Demo PIN-i: 1234 (Ana), 5678 (Marko), 9999 (Admin)
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
