"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Lock } from "lucide-react";

const STORAGE_KEY = "icepos-si-operator";
const PIN_KEY = "icepos-si-pin";

export interface Operator {
  id: string;
  name: string;
  taxNumber: string;
  role: string;
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

export function getStoredPin(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(PIN_KEY);
}

export function clearStoredOperator() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(PIN_KEY);
}

// Helper: pošlji PIN v header za avtorizirane API klice
export function authHeaders(extra?: Record<string, string>): Record<string, string> {
  const pin = getStoredPin();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...extra,
  };
  if (pin) {
    headers["x-operator-pin"] = pin;
  }
  return headers;
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
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    if (open) {
      setPin("");
      setError(false);
      setVerifying(false);
    }
  }, [open]);

  function handlePinDigit(d: string) {
    if (pin.length >= 4 || verifying) return;
    const newPin = pin + d;
    setPin(newPin);
    setError(false);

    if (newPin.length === 4) {
      // Samodejno preveri po 4. številki
      setTimeout(() => verifyPin(newPin), 150);
    }
  }

  async function verifyPin(p: string) {
    setVerifying(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: p }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Napačen PIN");
      }
      // Uspeh — shrani PIN + operator v localStorage
      const operator: Operator = {
        id: data.id,
        name: data.name,
        taxNumber: data.taxNumber,
        role: data.role,
        loginAt: data.loginAt,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(operator));
      localStorage.setItem(PIN_KEY, p);
      onLogin(operator);
      onOpenChange(false);
      toast.success(`Dobrodošli, ${data.name}`);
    } catch (e) {
      setError(true);
      setPin("");
      toast.error((e as Error).message || "Napaka pri prijavi");
    } finally {
      setVerifying(false);
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
                    : verifying
                    ? "border-amber-400 bg-amber-50 text-amber-600 animate-pulse"
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
          {verifying && (
            <p className="text-center text-sm text-amber-600">
              Preverjam PIN...
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
                    disabled={verifying}
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
                  disabled={verifying}
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
